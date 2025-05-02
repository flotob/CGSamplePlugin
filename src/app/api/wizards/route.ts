import { withAuth } from '@/lib/withAuth';
import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define an extended request type including the user payload
interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
}

// Define the structure for the response item
// Match the Wizard type used in admin hooks for consistency if possible
// Assuming a structure like this:
export interface WizardSummary {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Add step_count or progressStatus if needed later
}

// GET: List wizards for the user's community, optionally filtering by active status
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user; // Access user directly from the typed request
  // Community ID is required context from the token
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Community context required' }, { status: 401 });
  }
  const communityId = user.cid;

  const { searchParams } = new URL(req.url);
  const isActiveParam = searchParams.get('isActive');

  // Default to fetching only active wizards unless isActive=false or isActive=all
  let filterActive: boolean | null = null; 
  if (isActiveParam === 'true') {
    filterActive = true;
  } else if (isActiveParam === 'false') {
    filterActive = false;
  } else if (isActiveParam === 'all') {
    filterActive = null; // null means don't filter by is_active
  }

  try {
    let queryString = `SELECT id, community_id, name, description, is_active, created_at, updated_at 
                       FROM onboarding_wizards 
                       WHERE community_id = $1`;
    const queryParams: (string | boolean)[] = [communityId];

    if (filterActive !== null) {
      queryString += ` AND is_active = $2`;
      queryParams.push(filterActive);
    }

    queryString += ` ORDER BY updated_at DESC`; // Example ordering

    const wizardsRes = await query(queryString, queryParams);
    const wizards: WizardSummary[] = wizardsRes.rows;

    return NextResponse.json({ wizards });

  } catch (error) {
    console.error('Error fetching wizards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin

export const POST = withAuth(async (req) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }

  let body: { name?: string; description?: string; is_active?: boolean; communityTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description, is_active } = body;
  if (!name) {
    return NextResponse.json({ error: 'Wizard name is required' }, { status: 400 });
  }

  // // Ensure community exists - This is now handled by /api/community/sync
  // await query(
  //   `INSERT INTO communities (id, title)
  //    VALUES ($1, $2)
  //    ON CONFLICT (id) DO NOTHING`,
  //   [user.cid, communityTitle || 'Untitled Community']
  // );

  // Insert new wizard
  const result = await query(
    `INSERT INTO onboarding_wizards (community_id, name, description, is_active) VALUES ($1, $2, $3, $4) RETURNING *`,
    [user.cid, name, description || null, is_active !== undefined ? is_active.toString() : 'true']
  );

  return NextResponse.json({ wizard: result.rows[0] }, { status: 201 });
}, true); // true = adminOnly 