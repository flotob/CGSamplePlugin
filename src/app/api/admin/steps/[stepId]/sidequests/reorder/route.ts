import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { JwtPayload } from '@/app/api/auth/session/route';
import type { AttachedSidequest, ReorderAttachedSidequestsPayload } from '@/types/sidequests';

// Zod schema for an individual item in the reorder list (using attachment_id)
const reorderItemSchema = z.object({
  attachment_id: z.string().uuid({ message: "Invalid Attachment ID format" }), // ID from onboarding_step_sidequests table
  display_order: z.number().int().min(0, { message: "Display order must be a non-negative integer" }),
});

// Zod schema for the entire request body
const reorderAttachedSidequestsSchema = z.array(reorderItemSchema)
  .min(1, { message: "At least one item must be provided for reordering" });

// Helper function to verify step ownership (can be imported if centralized)
async function verifyStepOwnership(stepId: string, adminCommunityId: string): Promise<boolean> {
  try {
    const stepQuery = await query(
      `SELECT os.id
       FROM onboarding_steps os
       JOIN onboarding_wizards ow ON os.wizard_id = ow.id
       WHERE os.id = $1 AND ow.community_id = $2`,
      [stepId, adminCommunityId]
    );
    return stepQuery.rows.length > 0;
  } catch (error) {
    console.error("Error verifying step ownership:", error);
    return false;
  }
}

// POST Handler: Reorder sidequests attached to a step
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: { stepId: string } }) => {
  const { stepId } = params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing community ID.' }, { status: 401 });
  }
  const adminCommunityId = user.cid;

  try {
    const isOwner = await verifyStepOwnership(stepId, adminCommunityId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify this step.' }, { status: 403 });
    }

    const body = await req.json();
    const validationResult = reorderAttachedSidequestsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.format() }, { status: 400 });
    }

    const reorderItems: ReorderAttachedSidequestsPayload = validationResult.data;

    if (reorderItems.length === 0) {
      return NextResponse.json({ message: 'No items to reorder.', sidequests: [] }, { status: 200 });
    }
    
    await query('BEGIN');
    try {
      // Step 1: Update to temporary, unique negative display_order values
      // Using -(index + 1) ensures uniqueness and negativity if original orders were >= 0
      // More robustly, using a large offset (e.g., + reorderItems.length + 100) from current order
      // or simply using a large negative offset, but negative indices are simple if we ensure all items are processed.
      for (let i = 0; i < reorderItems.length; i++) {
        const item = reorderItems[i];
        const tempDisplayOrder = -(i + 1); // Assign a unique temporary negative value
        const updateToTempResult = await query(
          `UPDATE onboarding_step_sidequests
           SET display_order = $1
           WHERE id = $2 AND onboarding_step_id = $3 RETURNING id`,
          [tempDisplayOrder, item.attachment_id, stepId]
        );
        if (updateToTempResult.rowCount === 0) {
          throw new Error(`Failed to set temporary order for attachment ${item.attachment_id}. Item might not exist or belong to the step.`);
        }
      }

      // Step 2: Update to final display_order values
      for (const item of reorderItems) {
        const updateToFinalResult = await query(
          `UPDATE onboarding_step_sidequests
           SET display_order = $1
           WHERE id = $2 AND onboarding_step_id = $3 RETURNING id`,
          [item.display_order, item.attachment_id, stepId]
        );
        if (updateToFinalResult.rowCount === 0) {
          // This should ideally not happen if the first step succeeded for all items
          throw new Error(`Failed to set final order for attachment ${item.attachment_id}.`); 
        }
      }

      await query('COMMIT');

      const updatedAttachedSidequestsResult = await query<AttachedSidequest>(
        `SELECT s.*, oss.id AS attachment_id, oss.onboarding_step_id, oss.display_order, oss.attached_at
         FROM sidequests s
         JOIN onboarding_step_sidequests oss ON s.id = oss.sidequest_id
         WHERE oss.onboarding_step_id = $1
         ORDER BY oss.display_order ASC`,
        [stepId]
      );
      return NextResponse.json({ 
        message: 'Attached sidequests reordered successfully', 
        sidequests: updatedAttachedSidequestsResult.rows 
      }, { status: 200 });

    } catch (transactionError) {
      await query('ROLLBACK'); 
      throw transactionError;
    }

  } catch (error) {
    console.error('[API /admin/steps/{stepId}/sidequests/reorder POST] Error reordering attached sidequests:', error);
    if (error instanceof Error && (error.message.includes('uniq_step_sidequest_order') || error.message.includes('violates unique constraint'))) {
        return NextResponse.json({ error: 'Display order conflict. Ensure all display orders are unique for this step.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error during reorder' }, { status: 500 });
  }
}, true); 