import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

export const POST = withAuth(async (req, context) => {
  // Get the properly awaited params
  const { params } = context;
  
  // Type guard: ensure req.user exists
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.sub;
  const communityId = user.cid;

  // Access wizardId after params is awaited
  const wizardId = params.wizardId;
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard ID' }, { status: 400 });
  }

  try {
    // First, verify the wizard exists and belongs to the user's community
    const wizardCheck = await query(
      `SELECT id FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
      [wizardId, communityId]
    );

    if (wizardCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Wizard not found or access denied' }, { status: 404 });
    }

    // Optionally, verify all mandatory steps are completed
    const stepsCheck = await query(
      `SELECT s.id, s.is_mandatory, s.target_role_id, uwp.completed_at
       FROM onboarding_steps s
       LEFT JOIN user_wizard_progress uwp ON s.id = uwp.step_id AND uwp.user_id = $1 AND uwp.wizard_id = $2
       WHERE s.wizard_id = $2 AND s.is_active = true`,
      [userId, wizardId]
    );

    // Check if any mandatory steps are not completed
    const incompleteSteps = stepsCheck.rows.filter(step => step.is_mandatory && !step.completed_at);
    if (incompleteSteps.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot mark wizard as complete: not all mandatory steps are completed',
        incompleteSteps: incompleteSteps.map(s => s.id)
      }, { status: 400 });
    }

    // Get all target role IDs from completed steps
    const targetRoleIds = stepsCheck.rows
      .filter(step => step.completed_at && step.target_role_id)
      .map(step => step.target_role_id);

    // Insert or update the wizard completion record
    await query(
      `INSERT INTO user_wizard_completions (user_id, wizard_id, completed_at, version)
       VALUES ($1, $2, NOW(), 1)
       ON CONFLICT (user_id, wizard_id) DO UPDATE SET
         completed_at = NOW(),
         version = user_wizard_completions.version + 1;`,
      [userId, wizardId]
    );

    // Return success response with target role IDs
    // These role IDs can be used by the frontend to display and/or assign roles
    return NextResponse.json({ 
      success: true,
      roles: targetRoleIds
    });

  } catch (error) {
    console.error('Error marking wizard as complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 