import { withAuth } from '@/lib/withAuth';
import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define an extended request type including the user payload
interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
}

// Define the structure for the response
interface UserWizardCompletionsResponse {
  completed_wizard_ids: string[];
}

// GET: List IDs of wizards completed by the current user
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user;
  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.sub;

  try {
    const completionsRes = await query(
      `SELECT wizard_id FROM user_wizard_completions WHERE user_id = $1`,
      [userId]
    );
    
    const completedWizardIds: string[] = completionsRes.rows.map(row => row.wizard_id);

    return NextResponse.json({ completed_wizard_ids: completedWizardIds });

  } catch (error) {
    console.error('Error fetching user wizard completions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 