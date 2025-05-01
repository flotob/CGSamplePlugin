import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

export const GET = withAuth(async (req) => {
  // Type guard: ensure req.user exists
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  const userId = user.sub;
  
  try {
    // Fetch all user credentials from the database
    const result = await query(
      `SELECT *
       FROM user_linked_credentials
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
    
    return NextResponse.json({
      credentials: result.rows,
    });
  } catch (error) {
    console.error('Error fetching user credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}, false); // false = requires authentication, but not admin 