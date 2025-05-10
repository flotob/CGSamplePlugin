import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db'; // Adjust if necessary
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { JwtPayload } from '@/app/api/auth/session/route'; // Adjust if necessary

// Zod schema for validating the request body when updating a sidequest
// All fields are optional for PUT, as it's a partial update
const updateSidequestSchema = z.object({
  title: z.string().min(1, { message: "Title cannot be empty if provided" }).optional(),
  description: z.string().optional(),
  image_url: z.string().url({ message: "Invalid URL format" }).optional().or(z.literal('')), // Allows empty string to clear
  sidequest_type: z.enum(['youtube', 'link', 'markdown'], { message: "Invalid sidequest type" }).optional(),
  content_payload: z.string().min(1, { message: "Content payload cannot be empty if provided" }).optional(),
  display_order: z.number().int().min(0).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field must be provided for update" });

// Helper function to verify sidequest ownership and association with the step
async function verifySidequestAndStepOwnership(sidequestId: string, stepId: string, adminCommunityId: string): Promise<boolean> {
  try {
    const ownershipQuery = await query(
      `SELECT sq.id
       FROM sidequests sq
       JOIN onboarding_steps os ON sq.onboarding_step_id = os.id
       JOIN onboarding_wizards ow ON os.wizard_id = ow.id
       WHERE sq.id = $1 AND sq.onboarding_step_id = $2 AND ow.community_id = $3`,
      [sidequestId, stepId, adminCommunityId]
    );
    return ownershipQuery.rows.length > 0;
  } catch (error) {
    console.error("Error verifying sidequest ownership:", error);
    return false;
  }
}

// PUT Handler: Update an existing sidequest
export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: { params: { stepId: string, sidequestId: string } }) => {
  const { stepId, sidequestId } = params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing user or community ID.' }, { status: 401 });
  }
  const adminCommunityId = user.cid;

  try {
    const isOwner = await verifySidequestAndStepOwnership(sidequestId, stepId, adminCommunityId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: Sidequest not found or you do not have permission.' }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateSidequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const updates: { [key: string]: any } = validation.data;
    const PGM_UPDATE_SET = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const PGM_UPDATE_VALUES = Object.values(updates);

    if (PGM_UPDATE_VALUES.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 }); // Should be caught by zod .refine, but good to double check
    }

    const result = await query(
      `UPDATE sidequests SET ${PGM_UPDATE_SET}, updated_at = now() WHERE id = $1 RETURNING *`,
      [sidequestId, ...PGM_UPDATE_VALUES]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update sidequest or sidequest not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('[API] Error updating sidequest:', error);
    if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint "sidequests_onboarding_step_id_display_order_unique_index"')) {
        return NextResponse.json({ error: 'A sidequest with this display order already exists for this step.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true);

// DELETE Handler: Delete a sidequest
export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: { stepId: string, sidequestId: string } }) => {
  const { stepId, sidequestId } = params;
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Authentication required: Missing user or community ID.' }, { status: 401 });
  }
  const adminCommunityId = user.cid;

  try {
    const isOwner = await verifySidequestAndStepOwnership(sidequestId, stepId, adminCommunityId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden: Sidequest not found or you do not have permission.' }, { status: 403 });
    }

    const result = await query(
      `DELETE FROM sidequests WHERE id = $1 RETURNING id`,
      [sidequestId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to delete sidequest or sidequest not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Sidequest deleted successfully', id: result.rows[0].id }, { status: 200 }); // Or 204 No Content
  } catch (error) {
    console.error('[API] Error deleting sidequest:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, true); 