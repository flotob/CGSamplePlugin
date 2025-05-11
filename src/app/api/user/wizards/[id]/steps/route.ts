// 'use client'; // Removed directive

import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Step } from '@/hooks/useStepsQuery';
import type { Sidequest } from '@/types/sidequests'; // Import the new Sidequest type

// Define the structure for the joined step and progress data
export interface UserStepProgress extends Step { 
  verified_data: Record<string, unknown> | null; 
  completed_at: string | null;
  sidequests: Sidequest[] | null; // Use the imported Sidequest type
}

// Define the expected API response structure for steps query
// ADD wizard flag here
interface UserWizardStepsResponse {
  steps: UserStepProgress[];
  assignRolesPerStep: boolean;
}

// Define the params type for this route
interface WizardStepsParams {
  id: string; // Renamed from wizardId
}

export const GET = withAuth<WizardStepsParams>(async (req: AuthenticatedRequest, context: { params: WizardStepsParams }) => {
  const user = req.user;
  if (!user?.sub || !user.cid) { // Added cid check for consistency, though not directly used in this query for ownership of steps yet
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.sub;
  const communityId = user.cid; // Get communityId for wizard ownership check

  // Correctly destructure 'id' and rename to 'wizardId'
  const { id: wizardId } = context.params;
  if (!wizardId) {
    return NextResponse.json({ error: 'Missing wizard ID' }, { status: 400 });
  }

  try {
    // First, verify the wizard belongs to the user's community AND fetch its flag
    const wizardRes = await query(
      `SELECT id, assign_roles_per_step FROM onboarding_wizards WHERE id = $1 AND community_id = $2`,
      [wizardId, communityId] // Use communityId from token
    );
    if (wizardRes.rows.length === 0) {
      return NextResponse.json({ error: 'Wizard not found or access denied' }, { status: 404 });
    }
    const assignRolesPerStep = wizardRes.rows[0].assign_roles_per_step;

    const stepsQuery = `
      SELECT 
        s.*, 
        p.verified_data, 
        p.completed_at,
        (
          SELECT json_agg(sq_details.* ORDER BY osq.display_order ASC)
          FROM onboarding_step_sidequests osq
          JOIN sidequests sq_details ON osq.sidequest_id = sq_details.id
          WHERE osq.onboarding_step_id = s.id
        ) as sidequests
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
        sidequests: Sidequest[] | null; // Use the imported Sidequest type
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
      sidequests: row.sidequests || [], // Default to empty array if null
    }));

    // Include the flag in the response
    const responsePayload: UserWizardStepsResponse = {
      steps: stepsWithProgress,
      assignRolesPerStep: assignRolesPerStep,
    };
    return NextResponse.json(responsePayload);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching user wizard steps:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 