import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { JwtPayload } from '@/app/api/auth/session/route';

interface RouteContextParams {
    stepId: string;
    attachmentId: string; // This is the id from onboarding_step_sidequests table
}

// Helper function to verify step ownership (can be moved to a shared lib if used in multiple places)
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

// DELETE Handler: Detach a sidequest from a specific step
export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: RouteContextParams }) => {
  const { stepId, attachmentId } = params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing community ID.' }, { status: 401 });
  }
  const adminCommunityId = user.cid;

  try {
    // 1. Verify step ownership by the admin's community
    const isStepOwner = await verifyStepOwnership(stepId, adminCommunityId);
    if (!isStepOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify this step.' }, { status: 403 });
    }

    // 2. Delete from onboarding_step_sidequests table
    const result = await query<{ id: string } >(
      `DELETE FROM onboarding_step_sidequests 
       WHERE id = $1 AND onboarding_step_id = $2 
       RETURNING id`,
      [attachmentId, stepId]
    );

    if (result.rows.length === 0) {
      // Attachment not found or doesn't belong to the specified step
      return NextResponse.json({ error: 'Sidequest attachment not found for this step.' }, { status: 404 });
    }

    // Return 200 with a message or 204 No Content
    return NextResponse.json({ message: 'Sidequest detached successfully', attachmentId: result.rows[0].id }, { status: 200 });
    // Example for 204 No Content:
    // return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error(`[API /admin/steps/${stepId}/sidequests/${attachmentId} DELETE] Error detaching sidequest:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // true for adminOnly 