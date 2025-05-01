import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define the expected structure of the response items
interface UserWizard {
  id: string;
  name: string;
  description: string | null;
  progressStatus: 'not_started' | 'started' | 'completed'; // Expand later if needed
}

export const GET = withAuth(async (req) => {
  // Type guard: ensure req.user exists and has the expected shape
  const user = req.user as JwtPayload | undefined;
  // Need both user ID (sub) and community ID (cid)
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Missing user or community ID in token' }, { status: 400 });
  }
  const userId = user.sub;
  const communityId = user.cid;

  try {
    // Query active wizards for the community, joining with user progress
    const result = await query(
      `SELECT
         w.id, w.name, w.description,
         -- Determine status based on progress existence for this user
         -- Using COUNT(uwp.step_id) > 0 effectively checks if there's at least one entry for this wizard/user
         CASE WHEN COUNT(uwp.step_id) > 0 THEN 'started' ELSE 'not_started' END as "progressStatus"
       FROM onboarding_wizards w
       LEFT JOIN user_wizard_progress uwp ON w.id = uwp.wizard_id AND uwp.user_id = $2
       WHERE w.community_id = $1 AND w.is_active = true
       GROUP BY w.id, w.name, w.description -- Group to allow aggregation (COUNT)
       ORDER BY w.created_at DESC;`,
      [communityId, userId]
    );

    // Type assertion for the rows, aligning with UserWizard interface
    const wizards: UserWizard[] = result.rows;

    return NextResponse.json({ wizards });

  } catch (error) {
    console.error('Error fetching user wizards:', error);
    return NextResponse.json({ error: 'Internal server error fetching wizards' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 