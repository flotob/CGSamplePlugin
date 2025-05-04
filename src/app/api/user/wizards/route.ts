import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define the expected structure of the response items
export interface UserWizard {
  id: string;
  name: string;
  description: string | null;
  progressStatus: 'not-started' | 'in-progress' | 'completed';
  // Potentially add total step count, completed step count later if needed
}

// GET: Lists wizards relevant to the user, including their progress status
export const GET = withAuth(async (req) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Auth context required' }, { status: 401 });
  }
  const userId = user.sub;
  const communityId = user.cid;

  try {
    // Query using MAX aggregate for completion check
    const wizardQuery = `
      SELECT 
        w.id, 
        w.name, 
        w.description,
        CASE
          -- Use MAX aggregate on uwc.user_id
          WHEN MAX(uwc.user_id) IS NOT NULL THEN 'completed'
          WHEN COUNT(uwp.step_id) > 0 THEN 'in-progress' 
          ELSE 'not-started'
        END AS "progressStatus"
      FROM onboarding_wizards w
      LEFT JOIN user_wizard_completions uwc ON w.id = uwc.wizard_id AND uwc.user_id = $1
      LEFT JOIN user_wizard_progress uwp ON w.id = uwp.wizard_id AND uwp.user_id = $1
      WHERE w.community_id = $2 AND w.is_active = true
      -- Group by primary wizard columns
      GROUP BY w.id, w.name, w.description 
      ORDER BY w.created_at DESC;
    `;

    // Specify the expected row type <UserWizard> in the query call
    const result = await query<UserWizard>(wizardQuery, [userId, communityId]);

    const wizards = result.rows;

    return NextResponse.json({ wizards });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching user wizards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 