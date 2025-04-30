import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

export const GET = withAuth(async (req) => {
  // Type guard: ensure req.user exists and has the expected shape
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }

  // Query onboarding_wizards for this community
  const result = await query(
    `SELECT * FROM onboarding_wizards WHERE community_id = $1 ORDER BY created_at DESC`,
    [user.cid]
  );

  return NextResponse.json({ wizards: result.rows });
}, true); // true = adminOnly 

export const POST = withAuth(async (req) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description } = body;
  if (!name) {
    return NextResponse.json({ error: 'Wizard name is required' }, { status: 400 });
  }

  // Insert new wizard
  const result = await query(
    `INSERT INTO onboarding_wizards (community_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
    [user.cid, name, description || null]
  );

  return NextResponse.json({ wizard: result.rows[0] }, { status: 201 });
}, true); // true = adminOnly 