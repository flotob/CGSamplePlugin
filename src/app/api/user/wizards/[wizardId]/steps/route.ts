// 'use client'; // Removed directive

import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';
import type { Step } from '@/hooks/useStepsQuery'; // Assuming Step type is defined here or centrally

// Define and Export the expected shape of the response items
export interface UserStepProgress extends Step {
  completed_at: string | null;
  verified_data: Record<string, unknown> | null; // Assuming verified_data is JSON
}

export const GET = withAuth(async (req, context) => {
  // Get the properly awaited params
  const { params } = context;
  
  // Type guard: ensure req.user exists and has the expected shape
  const user = req.user as JwtPayload | undefined;
  // Need both user ID (sub) and community ID (cid) to verify context
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Missing user or community ID in token' }, { status: 400 });
  }
  const userId = user.sub;
  const communityId = user.cid; // Use communityId to ensure wizard belongs to the correct community

  // Access wizardId only after params is awaited
  const wizardId = params.wizardId;
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard id' }, { status: 400 });
  }

  try {
    // First, verify the wizard belongs to the user's community
    const wizardRes = await query(
      `SELECT id FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
      [wizardId, communityId]
    );
    if (wizardRes.rows.length === 0) {
      return NextResponse.json({ error: 'Wizard not found or access denied' }, { status: 404 });
    }

    // Fetch steps for the wizard, joining with user progress
    const stepsResult = await query(
      `SELECT
         s.*, -- Select all columns from onboarding_steps
         uwp.completed_at,
         uwp.verified_data
       FROM onboarding_steps s
       LEFT JOIN user_wizard_progress uwp ON s.id = uwp.step_id AND uwp.user_id = $2 AND uwp.wizard_id = s.wizard_id
       WHERE s.wizard_id = $1 AND s.is_active = true -- Only fetch active steps for users
       ORDER BY s.step_order ASC;`,
      [wizardId, userId]
    );

    // Type assertion for the rows
    const stepsWithProgress: UserStepProgress[] = stepsResult.rows.map(row => ({
        ...row,
        config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config, // Ensure config is object
        verified_data: typeof row.verified_data === 'string' ? JSON.parse(row.verified_data) : row.verified_data, // Ensure verified_data is object
    }));

    return NextResponse.json({ steps: stepsWithProgress });

  } catch (error) {
    console.error('Error fetching user wizard steps:', error);
    return NextResponse.json({ error: 'Internal server error fetching wizard steps' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 