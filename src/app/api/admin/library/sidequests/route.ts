import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JwtPayload } from '@/app/api/auth/session/route';
import type { Sidequest } from '@/types/sidequests'; // Assuming Sidequest type is defined here

// Zod schema for creating a global sidequest
const createGlobalSidequestSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().nullish(), // Optional, allow null
  image_url: z.string().url({ message: "Invalid URL format" }).nullish(), // Optional, allow null
  sidequest_type: z.enum(['youtube', 'link', 'markdown'], { message: "Invalid sidequest type" }),
  content_payload: z.string().min(1, { message: "Content payload is required" }),
  is_public: z.boolean().optional().default(false),
});

export type CreateGlobalSidequestPayload = z.infer<typeof createGlobalSidequestSchema>;

// POST Handler: Create a new global sidequest in the library
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.sub || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing user, creator, or community ID.' }, { status: 401 });
  }
  const creator_user_id = user.sub;
  const community_id = user.cid;

  try {
    const body = await req.json();
    const validation = createGlobalSidequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const { title, description, image_url, sidequest_type, content_payload, is_public } = validation.data;

    const result = await query<Sidequest>(
      `INSERT INTO sidequests 
        (title, description, image_url, sidequest_type, content_payload, creator_user_id, community_id, is_public)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title, description, image_url, sidequest_type, content_payload,
        creator_user_id, community_id, is_public,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to create global sidequest' }, { status: 500 });
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('[API /admin/library/sidequests POST] Error creating global sidequest:', error);
    // Add more specific error handling if needed (e.g., unique constraint violations if any)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // true for adminOnly

// GET Handler: List global sidequests from the library
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid || !user.sub) { // user.sub needed for 'mine' scope
    return NextResponse.json({ error: 'Authentication required: Missing user or community ID.' }, { status: 401 });
  }
  const community_id = user.cid;
  const current_user_id = user.sub;

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope') || 'mine'; // Default to 'mine' if no scope is provided

  let sqlQuery = '';
  const queryParams: (string | boolean)[] = [community_id];

  try {
    switch (scope) {
      case 'mine':
        sqlQuery = `SELECT * FROM sidequests WHERE community_id = $1 AND creator_user_id = $2 ORDER BY updated_at DESC`;
        queryParams.push(current_user_id);
        break;
      case 'community': // 'community' scope typically means public items within that community
        sqlQuery = `SELECT * FROM sidequests WHERE community_id = $1 AND is_public = true ORDER BY updated_at DESC`;
        // queryParams already has community_id
        break;
      case 'all_in_community': // New scope: all within community regardless of public status or creator
        sqlQuery = `SELECT * FROM sidequests WHERE community_id = $1 ORDER BY updated_at DESC`;
        // queryParams already has community_id
        break;
      default:
        return NextResponse.json({ error: "Invalid scope parameter. Use 'mine', 'community', or 'all_in_community'." }, { status: 400 });
    }

    const result = await query<Sidequest>(sqlQuery, queryParams);
    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('[API /admin/library/sidequests GET] Error listing global sidequests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // true for adminOnly 