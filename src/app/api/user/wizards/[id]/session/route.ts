import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';

// Params type for this dynamic route
interface UserWizardSessionParams {
  id: string; // Renamed from wizardId to match route segment
}

// Expected request body for PUT
interface UpdateSessionBody {
  stepId: string;
}

// --- GET Handler: Fetch last viewed step --- 
export const GET = withAuth<UserWizardSessionParams>(async (req: AuthenticatedRequest, context: { params: UserWizardSessionParams }) => {
  const user = req.user;
  if (!user?.sub) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  // Correctly destructure 'id' and rename to 'wizardId'
  const { id: wizardId } = context.params; 
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard ID parameter' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT last_viewed_step_id FROM user_wizard_sessions WHERE user_id = $1 AND wizard_id = $2`,
      [user.sub, wizardId]
    );

    if (result.rows.length > 0) {
      return NextResponse.json({ last_viewed_step_id: result.rows[0].last_viewed_step_id }, { status: 200 });
    } else {
      // No session found for this user/wizard - return null
      return NextResponse.json({ last_viewed_step_id: null }, { status: 200 }); 
    }
  } catch (error) {
    console.error('Failed to fetch user wizard session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}); // Assuming GET doesn't require special admin perms, adjust final bool if needed

// --- PUT Handler: Update/Create last viewed step --- 
export const PUT = withAuth<UserWizardSessionParams>(async (req: AuthenticatedRequest, context: { params: UserWizardSessionParams }) => {
  const user = req.user;
  if (!user?.sub) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  // Correctly destructure 'id' and rename to 'wizardId'
  const { id: wizardId } = context.params; 
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard ID parameter' }, { status: 400 });
  }

  let body: UpdateSessionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { stepId } = body;
  if (!stepId || typeof stepId !== 'string') {
    return NextResponse.json({ error: 'Invalid request body: stepId must be a non-empty string.' }, { status: 400 });
  }

  try {
    // Validate that the stepId exists for the given wizardId
    const stepCheck = await query(
      `SELECT id FROM onboarding_steps WHERE id = $1 AND wizard_id = $2`,
      [stepId, wizardId]
    );

    if (stepCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid stepId for this wizard.' }, { status: 400 });
    }

    // Perform UPSERT
    await query(
      `INSERT INTO user_wizard_sessions (user_id, wizard_id, last_viewed_step_id, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, wizard_id)
       DO UPDATE SET
         last_viewed_step_id = EXCLUDED.last_viewed_step_id,
         updated_at = NOW();`,
      [user.sub, wizardId, stepId]
    );

    return NextResponse.json({ message: 'Session updated' }, { status: 200 });

  } catch (error) {
    console.error('Failed to update user wizard session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}); // Assuming PUT doesn't require special admin perms 