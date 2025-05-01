import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import type { JwtPayload } from '@/app/api/auth/session/route';

// POST handler - Authenticated users
// Ensures the community exists in the DB and updates its title if changed.
export const POST = withAuth(async (req) => {
  // Type guard: ensure req.user exists and has the expected shape
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const communityId = user.cid;

  let body: { communityTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { communityTitle } = body;

  if (!communityTitle || typeof communityTitle !== 'string' || communityTitle.trim() === '') {
    return NextResponse.json({ error: 'Missing or invalid communityTitle in request body' }, { status: 400 });
  }

  try {
    await query(
      `INSERT INTO communities (id, title, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         updated_at = NOW()
       WHERE communities.title IS DISTINCT FROM EXCLUDED.title;`,
      [communityId, communityTitle.trim()]
    );

    // result.rowCount will be 1 for an insert OR an update that actually changed the row.
    // It will be 0 if the ON CONFLICT happened but the WHERE clause prevented the update (title was the same).
    // console.log('Community sync result rowCount:', result.rowCount); 

    return new NextResponse(null, { status: 204 }); // Success, No Content

  } catch (error) {
    console.error('Error syncing community data:', error);
    return NextResponse.json({ error: 'Internal server error during community sync' }, { status: 500 });
  }
}, false); // false: requires authentication, but not admin 