import { withAuth } from '@/lib/withAuth';
import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define an extended request type including the user payload
interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
}

// Define the expected structure of the response items
interface RelevantStep {
  wizard_id: string;
  step_id: string;
  target_role_id: string;
}

// GET: List relevant steps (wizard_id, target_role_id) from active wizards in the user's community
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Community context required' }, { status: 401 });
  }
  const communityId = user.cid;

  try {
    // 1. Fetch IDs of active wizards for the community
    const activeWizardsRes = await query(
      `SELECT id FROM onboarding_wizards WHERE community_id = $1 AND is_active = true`,
      [communityId]
    );
    const activeWizardIds = activeWizardsRes.rows.map(wiz => wiz.id);

    if (activeWizardIds.length === 0) {
      return NextResponse.json({ steps: [] }); // No active wizards, so no relevant steps
    }

    // 2. Fetch steps targeting any role from these active wizards
    const stepsRes = await query(
      `SELECT wizard_id, target_role_id 
       FROM onboarding_steps 
       WHERE wizard_id = ANY($1::uuid[]) AND target_role_id IS NOT NULL`,
      [activeWizardIds]
    );
    
    const relevantSteps: RelevantStep[] = stepsRes.rows;

    return NextResponse.json({ steps: relevantSteps });

  } catch (error) {
    console.error('Error fetching relevant steps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 