import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db'; // Assuming query handles transactions directly or uses a per-request client
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { JwtPayload } from '@/app/api/auth/session/route'; // Adjust if necessary

// Zod schema for an individual item in the reorder list
const reorderItemSchema = z.object({
  sidequestId: z.string().uuid({ message: "Invalid Sidequest ID format" }),
  display_order: z.number().int().min(0, { message: "Display order must be a non-negative integer" }),
});

// Zod schema for the entire request body (an array of reorder items)
const reorderSidequestsSchema = z.array(reorderItemSchema)
  .min(1, { message: "At least one item must be provided for reordering" });

// Helper function to verify step ownership
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

// POST Handler: Reorder sidequests for a step
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: { stepId: string } }) => {
  const { stepId } = params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing user or community ID.' }, { status: 401 });
  }
  const adminCommunityId = user.cid;

  try {
    const isOwner = await verifyStepOwnership(stepId, adminCommunityId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify this step.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = reorderSidequestsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const reorderItems = validation.data;

    await query('BEGIN'); // Start transaction using the standard query function

    try {
      for (const item of reorderItems) {
        const updateResult = await query(
          `UPDATE sidequests
           SET display_order = $1, updated_at = now()
           WHERE id = $2 AND onboarding_step_id = $3 RETURNING id`,
          [item.display_order, item.sidequestId, stepId]
        );
        if (updateResult.rowCount === 0) {
          throw new Error(`Failed to update sidequest ${item.sidequestId}. It might not belong to step ${stepId} or does not exist.`);
        }
      }
      await query('COMMIT'); // Commit transaction using the standard query function

      // Fetch the updated list of sidequests to return
      const updatedSidequestsResult = await query(
          `SELECT * FROM sidequests WHERE onboarding_step_id = $1 ORDER BY display_order ASC`,
          [stepId]
      );
      return NextResponse.json({ message: 'Sidequests reordered successfully', sidequests: updatedSidequestsResult.rows }, { status: 200 });

    } catch (transactionError) {
      await query('ROLLBACK'); // Rollback on error within the transaction block
      // Re-throw to be caught by the outer catch block, or handle specific errors here
      throw transactionError;
    }

  } catch (error) {
    // Outer catch block handles errors from verifyStepOwnership, body parsing, or re-thrown transaction errors
    console.error('[API] Error reordering sidequests:', error);
    if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint "sidequests_onboarding_step_id_display_order_unique_index"')) {
        return NextResponse.json({ error: 'Display order conflict. Ensure all display orders are unique for this step.' }, { status: 409 });
    }
    // Check if it was a transaction error that didn't get rolled back by inner block (should not happen if inner throw is consistent)
    // else if (error.message.includes('transaction')) { /* Potentially check if rollback was missed */ }
    return NextResponse.json({ error: 'Internal Server Error during reorder' }, { status: 500 });
  }
  // No finally block needed for client.release() as we are not managing clients directly here
}, true); 