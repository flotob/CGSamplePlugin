import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/withAuth';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Params type for this dynamic route
interface SocialProofParams {
  id: string; // wizardId (matching folder structure)
  stepId: string;
}

// Response type
interface SocialProofUser {
  user_id: string;
  username: string | null;
  profile_picture_url: string | null;
}

interface SocialProofResponse {
  users: SocialProofUser[];
  totalRelevantUsers: number;
}

const WIDGET_USER_LIMIT = 8; // Max users to show in the widget

// --- GET Handler: Fetch users for social proof --- 
export const GET = withAuth<SocialProofParams>(async (req, { params }) => {
  const currentUser = req.user as JwtPayload | undefined;
  const currentUserId = currentUser?.sub;
  if (!currentUserId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: wizardId, stepId } = params;
  if (!wizardId || !stepId) {
    return NextResponse.json({ error: 'Missing wizardId or stepId' }, { status: 400 });
  }

  try {
    // 1. Get the current step's order
    const stepOrderRes = await query(
      `SELECT step_order FROM onboarding_steps WHERE id = $1 AND wizard_id = $2`,
      [stepId, wizardId]
    );
    if (stepOrderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Step not found for this wizard' }, { status: 404 });
    }
    const currentStepOrder = stepOrderRes.rows[0].step_order;

    // Updated query to get total count BEFORE limiting
    const combinedQuery = `
      WITH completed_users AS (
        SELECT user_id FROM user_wizard_completions WHERE wizard_id = $1
      ), 
      in_progress_users AS (
        SELECT DISTINCT ses.user_id
        FROM user_wizard_sessions ses
        JOIN onboarding_steps st ON ses.last_viewed_step_id = st.id
        WHERE ses.wizard_id = $1 AND st.wizard_id = $1 AND st.step_order >= $2
      ), 
      all_relevant_users AS (
        SELECT user_id FROM completed_users
        UNION
        SELECT user_id FROM in_progress_users
      ), 
      counted_filtered_users AS (
         -- Exclude the current user and count total relevant before limiting
         SELECT 
           user_id,
           COUNT(*) OVER() as total_count
         FROM all_relevant_users 
         WHERE user_id != $3 
      )
      -- Final join with profiles, apply limit here
      SELECT 
        cfu.user_id,
        cfu.total_count, -- Select the total count
        up.username,
        up.profile_picture_url
      FROM counted_filtered_users cfu
      JOIN user_profiles up ON cfu.user_id = up.user_id
      -- Add ordering if desired
      LIMIT $4; 
    `;

    const finalUsersRes = await query(combinedQuery, [
      wizardId,          // $1
      currentStepOrder,  // $2
      currentUserId,     // $3
      WIDGET_USER_LIMIT  // $4
    ]);

    // Extract users and total count (handle case where rows might be empty)
    const users: SocialProofUser[] = finalUsersRes.rows.map(row => ({ 
      user_id: row.user_id, 
      username: row.username,
      profile_picture_url: row.profile_picture_url
    }));
    const totalRelevantUsers = finalUsersRes.rows.length > 0 
      ? parseInt(finalUsersRes.rows[0].total_count, 10) 
      : 0;

    const responseBody: SocialProofResponse = { users, totalRelevantUsers };
    return NextResponse.json(responseBody, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch social proof data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, false); // Assuming this endpoint doesn't require admin privileges 