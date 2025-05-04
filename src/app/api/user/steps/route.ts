import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define the expected structure of the response items
interface RelevantStep {
  wizard_id: string;
  step_id: string;
  target_role_id: string | null; // Adjusted to match potential DB null
}

// Protect the route, requires authentication but not necessarily admin
export const GET = withAuth(async (req) => {
  // Type guard: ensure req.user exists and has the expected shape
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.sub) {
    return NextResponse.json({ error: 'User ID not found in token' }, { status: 401 });
  }
  const userId = user.sub;

  try {
    // Fetch relevant steps (mandatory steps not yet completed)
    const stepsQuery = `
        SELECT 
            s.wizard_id, 
            s.id as step_id, 
            s.target_role_id
        FROM onboarding_steps s
        WHERE s.is_mandatory = true
          AND s.is_active = true
          AND NOT EXISTS (
              SELECT 1
              FROM user_wizard_progress p
              WHERE p.user_id = $1
                AND p.wizard_id = s.wizard_id
                AND p.step_id = s.id
          )
        ORDER BY s.wizard_id, s.step_order; 
    `;
    
    // Specify the expected row type <RelevantStep> in the query call
    const stepsRes = await query<RelevantStep>(stepsQuery, [userId]);
    
    // No need for explicit typing here anymore as stepsRes.rows is now RelevantStep[]
    const relevantSteps = stepsRes.rows;

    return NextResponse.json({ steps: relevantSteps });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching relevant user steps:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 