// 'use client'; // Removed directive

import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';
import type { Step } from '@/hooks/useStepsQuery'; // Import Step type for base structure

// Define the structure for the joined step and progress data
export interface UserStepProgress extends Step { // Extend the base Step type
  verified_data: Record<string, unknown> | null; // Already potentially object
  completed_at: string | null;
}

// Define the params type for this route
interface StepsParams {
  wizardId: string;
}

export const GET = withAuth<StepsParams>(async (req, { params }) => {
  // Type guard: ensure req.user exists and has the expected shape
  const user = req.user as JwtPayload | undefined;
  // Need both user ID (sub) and community ID (cid) to verify context
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Missing user or community ID in token' }, { status: 400 });
  }
  const userId = user.sub;
  const communityId = user.cid; // Use communityId to ensure wizard belongs to the correct community

  // Now params are already resolved, so no need to await them again
  const { wizardId } = params;
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard ID' }, { status: 400 });
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

    const stepsQuery = `
      SELECT 
        s.*, 
        p.verified_data, 
        p.completed_at
      FROM onboarding_steps s
      LEFT JOIN user_wizard_progress p ON s.id = p.step_id AND p.user_id = $1 AND p.wizard_id = s.wizard_id
      WHERE s.wizard_id = $2
      ORDER BY s.step_order;
    `;

    // Provide the raw row type expected from the DB query
    // We expect fields from 'onboarding_steps' plus 'verified_data' and 'completed_at'
    // JSON fields might come back as strings, handle in mapping.
    type RawStepProgressRow = Omit<Step, 'config'> & {
        config: string | Record<string, unknown>; // DB might return JSON as string
        verified_data: string | Record<string, unknown> | null;
        completed_at: string | null;
    };

    const stepsResult = await query<RawStepProgressRow>(stepsQuery, [userId, wizardId]);

    // Map the raw rows to the final UserStepProgress type, ensuring correct parsing
    const stepsWithProgress: UserStepProgress[] = stepsResult.rows.map(row => ({
      ...row, // Include all properties from the row
      // Parse config if it's a string, otherwise keep it (should be object or null)
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      // Parse verified_data if it's a string, otherwise keep it (could be object or null)
      verified_data: typeof row.verified_data === 'string' ? JSON.parse(row.verified_data) : row.verified_data,
      // completed_at and other fields are already correct type or null
    }));

    return NextResponse.json({ steps: stepsWithProgress });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching user wizard steps:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 