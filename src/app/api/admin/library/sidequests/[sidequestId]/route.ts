import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JwtPayload } from '@/app/api/auth/session/route';
import type { Sidequest } from '@/types/sidequests';

// Zod schema for updating a global sidequest (all fields optional)
const updateGlobalSidequestSchema = z.object({
  title: z.string().min(1, { message: "Title cannot be empty if provided" }).optional(),
  description: z.string().nullish(),
  image_url: z.string().url({ message: "Invalid URL format" }).nullish(),
  sidequest_type: z.enum(['youtube', 'link', 'markdown'], { message: "Invalid sidequest type" }).optional(),
  content_payload: z.string().min(1, { message: "Content payload cannot be empty if provided" }).optional(),
  is_public: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field must be provided for update" });

export type UpdateGlobalSidequestPayload = z.infer<typeof updateGlobalSidequestSchema>;

// Zod schema for toggling public status
const togglePublicSchema = z.object({
  is_public: z.boolean(),
});

interface RouteContext {
    params: {
        sidequestId: string;
    }
}

// PUT Handler: Update a specific global sidequest in the library
export const PUT = withAuth(async (req: AuthenticatedRequest, context: RouteContext) => {
  const { sidequestId } = context.params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing community ID.' }, { status: 401 });
  }
  const admin_community_id = user.cid;
  // const admin_user_id = user.sub; // Needed if we implement stricter creator-only update logic

  try {
    const body = await req.json();
    const validation = updateGlobalSidequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const updates = validation.data;
    
    // Dynamically build SET clause
    const setClauses: string[] = [];
    const queryParams: any[] = [sidequestId, admin_community_id]; // $1 = id, $2 = community_id (for WHERE)
    let paramIndex = 3; // Start $3 for SET clause values

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) { // Ensure we only add fields that were actually provided
        setClauses.push(`${key} = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
    });

    if (setClauses.length === 0) {
      // This should be caught by zod .refine(), but as a safeguard.
      return NextResponse.json({ error: 'No valid fields provided for update.' }, { status: 400 });
    }
    setClauses.push(`updated_at = now()`); // Always update updated_at

    const sqlQuery = `UPDATE sidequests SET ${setClauses.join(', ')} 
                      WHERE id = $1 AND community_id = $2 
                      RETURNING *`;
    
    const result = await query<Sidequest>(sqlQuery, queryParams);

    if (result.rows.length === 0) {
      // This means either the sidequestId doesn't exist OR it doesn't belong to the admin's community.
      return NextResponse.json({ error: 'Sidequest not found or permission denied.' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(`[API /admin/library/sidequests/${sidequestId} PUT] Error updating global sidequest:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // true for adminOnly

// DELETE Handler: Delete a specific global sidequest from the library
export const DELETE = withAuth(async (req: AuthenticatedRequest, context: RouteContext) => {
  const { sidequestId } = context.params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing community ID.' }, { status: 401 });
  }
  const admin_community_id = user.cid;
  // const admin_user_id = user.sub; // For creator-only delete policy

  // Policy: Prevent deletion if the sidequest is currently attached to any step.
  // This is a safer default than auto-detaching.
  try {
    const attachmentsCheck = await query(
      `SELECT COUNT(*) FROM onboarding_step_sidequests WHERE sidequest_id = $1`,
      [sidequestId]
    );
    if (attachmentsCheck.rows[0] && parseInt(attachmentsCheck.rows[0].count, 10) > 0) {
      return NextResponse.json({
        error: 'Deletion failed: This sidequest is currently attached to one or more steps. Please detach it first.',
        code: 'SIDEQUEST_IN_USE'
      }, { status: 409 }); // 409 Conflict
    }

    // Proceed with deletion if not attached
    // The WHERE clause also ensures it belongs to the admin's community.
    // Add AND creator_user_id = $3 if only creator can delete.
    const result = await query< { id: string } >(
      `DELETE FROM sidequests 
       WHERE id = $1 AND community_id = $2 
       RETURNING id`,
      [sidequestId, admin_community_id]
    );

    if (result.rows.length === 0) {
      // Sidequest not found or doesn't belong to the community
      return NextResponse.json({ error: 'Sidequest not found or permission denied.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Global sidequest deleted successfully', id: result.rows[0].id }, { status: 200 });
    // Alternatively, return 204 No Content for DELETE operations
    // return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error(`[API /admin/library/sidequests/${sidequestId} DELETE] Error deleting global sidequest:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // true for adminOnly 

// PATCH Handler: Toggle the is_public status of a global sidequest
export const PATCH = withAuth(async (req: AuthenticatedRequest, context: RouteContext) => {
  const { sidequestId } = context.params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing community ID.' }, { status: 401 });
  }
  const admin_community_id = user.cid;

  try {
    const body = await req.json();
    const validation = togglePublicSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const { is_public } = validation.data;

    const result = await query<Sidequest>(
      `UPDATE sidequests 
       SET is_public = $1, updated_at = now() 
       WHERE id = $2 AND community_id = $3
       RETURNING *`,
      [is_public, sidequestId, admin_community_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Sidequest not found or permission denied.' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(`[API /admin/library/sidequests/${sidequestId}/toggle-public PATCH] Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); 