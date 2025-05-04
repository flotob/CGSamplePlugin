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
    // Query to get wizards and determine user progress status
    const wizardQuery = `
      SELECT 
        w.id, 
        w.name, 
        w.description,
        CASE
          WHEN uwc.user_id IS NOT NULL THEN 'completed'
          WHEN uws.user_id IS NOT NULL THEN 'in-progress'
          ELSE 'not-started'
        END AS "progressStatus"
      FROM onboarding_wizards w
      LEFT JOIN user_wizard_sessions uws ON w.id = uws.wizard_id AND uws.user_id = $1
      LEFT JOIN user_wizard_completions uwc ON w.id = uwc.wizard_id AND uwc.user_id = $1
      WHERE w.community_id = $2 AND w.is_active = true
      ORDER BY w.created_at DESC; -- Or some other meaningful order
    `;

    // Specify the expected row type <UserWizard> in the query call
    const result = await query<UserWizard>(wizardQuery, [userId, communityId]);

    // No need for explicit typing here anymore
    const wizards = result.rows;

    return NextResponse.json({ wizards });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching user wizards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 