import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import type { JwtPayload } from '@/app/api/auth/session/route';

// POST handler - Authenticated users
// Ensures the community exists in the DB, sets default plan (ID=1) if new, and updates title.
export const POST = withAuth(async (req) => {
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
    // Assume 'free' plan ID is 1
    const freePlanId = 1;

    // Removed the query to fetch freePlanId from the database.

    // Perform the UPSERT, including hardcoded freePlanId for current_plan_id on INSERT
    await query(
      `INSERT INTO communities (id, title, created_at, updated_at, current_plan_id)
       VALUES ($1, $2, NOW(), NOW(), $3) -- Added current_plan_id = 1 for new records
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         updated_at = NOW()
       WHERE communities.title IS DISTINCT FROM EXCLUDED.title;`, 
      [communityId, communityTitle.trim(), freePlanId] // Pass 1 (freePlanId) as the 3rd parameter
    );

    return new NextResponse(null, { status: 204 }); // Success, No Content

  } catch (error) {
    console.error('Error syncing community data:', error);
    return NextResponse.json({ error: 'Internal server error during community sync' }, { status: 500 });
  }
}, false); // false: requires authentication, but not admin 