import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db'; // Assuming db utility, adjust if necessary
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JwtPayload } from '@/app/api/auth/session/route'; // Assuming this path is correct for JwtPayload
import type { AttachedSidequest, Sidequest } from '@/types/sidequests'; // Import AttachedSidequest
import type { AttachSidequestResponse } from '@/types/sidequests'; // For POST response

// Zod schema for creating/attaching a sidequest (POST handler will be updated for this)
const attachSidequestSchema = z.object({
  sidequest_id: z.string().uuid({ message: "Valid global Sidequest ID is required" }),
  display_order: z.number().int().min(0).optional(), // Backend can assign if not provided
});
export type AttachSidequestToStepPayload = z.infer<typeof attachSidequestSchema>;

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

// POST Handler: Attach an existing global sidequest to this step
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: { stepId: string } }) => {
  const { stepId } = params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing community ID.' }, { status: 401 });
  }
  const adminCommunityId = user.cid;

  try {
    // 1. Verify step ownership
    const isStepOwner = await verifyStepOwnership(stepId, adminCommunityId);
    if (!isStepOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify this step.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = attachSidequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const { sidequest_id: globalSidequestId, display_order: requestedDisplayOrder } = validation.data;

    // 2. Verify the global sidequest exists and belongs to the same community
    const globalSidequestQuery = await query<Sidequest>(
      `SELECT id, community_id FROM sidequests WHERE id = $1`,
      [globalSidequestId]
    );

    if (globalSidequestQuery.rows.length === 0) {
      return NextResponse.json({ error: 'Global sidequest not found.' }, { status: 404 });
    }
    if (globalSidequestQuery.rows[0].community_id !== adminCommunityId) {
      return NextResponse.json({ error: 'Forbidden: Cannot attach a sidequest from a different community.' }, { status: 403 });
    }

    // 3. Determine display_order
    let finalDisplayOrder = requestedDisplayOrder;
    if (typeof finalDisplayOrder !== 'number' || finalDisplayOrder < 0) {
      const maxOrderResult = await query(
        `SELECT COALESCE(MAX(display_order), -1) as max_order FROM onboarding_step_sidequests WHERE onboarding_step_id = $1`,
        [stepId]
      );
      finalDisplayOrder = maxOrderResult.rows[0].max_order + 1;
    }

    // 4. Insert into junction table
    const result = await query<AttachSidequestResponse>(
      `INSERT INTO onboarding_step_sidequests (onboarding_step_id, sidequest_id, display_order)
       VALUES ($1, $2, $3) 
       RETURNING id, onboarding_step_id, sidequest_id, display_order, attached_at`,
      [stepId, globalSidequestId, finalDisplayOrder]
    );

    if (result.rows.length === 0) {
      // This case should be rare if previous checks passed, but good to have.
      return NextResponse.json({ error: 'Failed to attach sidequest to step.' }, { status: 500 });
    }

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error('[API /admin/steps/{stepId}/sidequests POST] Error attaching sidequest:', error);
    if (error instanceof Error) {
      if (error.message.includes('uniq_step_sidequest_link')) {
        return NextResponse.json({ error: 'This sidequest is already attached to this step.' }, { status: 409 });
      }
      if (error.message.includes('uniq_step_sidequest_order')) {
        // This might happen if display_order was explicitly provided and conflicts.
        // If auto-calculating, it's less likely but concurrent requests could clash without proper locking.
        return NextResponse.json({ error: 'Display order conflict for this step.' }, { status: 409 });
      }
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true);

// GET Handler: List all sidequests ATTACHED to this specific step
export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: { stepId: string } }) => {
  const { stepId } = params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing community ID.' }, { status: 401 });
  }
  const adminCommunityId = user.cid;

  try {
    const isOwner = await verifyStepOwnership(stepId, adminCommunityId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view sidequests for this step.' }, { status: 403 });
    }

    const result = await query<AttachedSidequest>(
      `SELECT 
         s.*, -- All columns from the global sidequests table
         oss.id AS attachment_id, 
         oss.onboarding_step_id, 
         oss.display_order, 
         oss.attached_at
       FROM sidequests s
       JOIN onboarding_step_sidequests oss ON s.id = oss.sidequest_id
       WHERE oss.onboarding_step_id = $1
       ORDER BY oss.display_order ASC`,
      [stepId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('[API /admin/steps/{stepId}/sidequests GET] Error fetching attached sidequests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // true for adminOnly 