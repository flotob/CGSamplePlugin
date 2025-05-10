import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db'; // Assuming db utility, adjust if necessary
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JwtPayload } from '@/app/api/auth/session/route'; // Assuming this path is correct for JwtPayload

// Zod schema for validating the request body when creating/updating a sidequest
const sidequestSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  image_url: z.string().url({ message: "Invalid URL format" }).optional().or(z.literal('')), // Allows empty string to clear
  sidequest_type: z.enum(['youtube', 'link', 'markdown'], { message: "Invalid sidequest type" }),
  content_payload: z.string().min(1, { message: "Content payload is required" }),
  display_order: z.number().int().min(0).optional().default(0),
});

// Helper function to verify step ownership
async function verifyStepOwnership(stepId: string, adminCommunityId: string): Promise<boolean> {
  try {
    const stepQuery = await query(
      `SELECT os.id, ow.community_id
       FROM onboarding_steps os
       JOIN onboarding_wizards ow ON os.wizard_id = ow.id
       WHERE os.id = $1 AND ow.community_id = $2`,
      [stepId, adminCommunityId]
    );
    return stepQuery.rows.length > 0;
  } catch (error) {
    console.error("Error verifying step ownership:", error);
    return false;
  }
}

// POST Handler: Create a new sidequest for a step
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: { stepId: string } }) => {
  const { stepId } = params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing user or community ID.' }, { status: 401 });
  }
  const adminCommunityId = user.cid;

  try {
    // Verify ownership
    const isOwner = await verifyStepOwnership(stepId, adminCommunityId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify this step.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = sidequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const { title, description, image_url, sidequest_type, content_payload, display_order } = validation.data;

    const result = await query(
      `INSERT INTO sidequests (onboarding_step_id, title, description, image_url, sidequest_type, content_payload, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [stepId, title, description || null, image_url || null, sidequest_type, content_payload, display_order]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to create sidequest' }, { status: 500 });
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('[API] Error creating sidequest:', error);
    if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint "sidequests_onboarding_step_id_display_order_unique_index"')) {
        return NextResponse.json({ error: 'A sidequest with this display order already exists for this step.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // true for adminOnly

// GET Handler: List all sidequests for a step
export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: { stepId: string } }) => {
  const { stepId } = params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing user or community ID.' }, { status: 401 });
  }
  const adminCommunityId = user.cid;

  try {
    // Verify ownership
    const isOwner = await verifyStepOwnership(stepId, adminCommunityId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view sidequests for this step.' }, { status: 403 });
    }

    const result = await query(
      `SELECT * FROM sidequests
       WHERE onboarding_step_id = $1
       ORDER BY display_order ASC`,
      [stepId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('[API] Error fetching sidequests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); // true for adminOnly 