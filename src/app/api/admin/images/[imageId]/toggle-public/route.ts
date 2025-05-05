import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define the structure of the route parameters
interface TogglePublicParams {
   imageId: string; // UUID of the image
}

// PATCH: Toggles the is_public status of a generated image owned by the admin
export const PATCH = withAuth<TogglePublicParams>(async (req: AuthenticatedRequest, context: { params: TogglePublicParams }) => {
    const user = req.user as JwtPayload | undefined;
    if (!user || !user.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = user.sub; // Use userId to verify ownership
    const { imageId } = context.params;

    if (!imageId) {
      return NextResponse.json({ error: 'Missing image ID' }, { status: 400 });
    }

    try {
        // Update the is_public flag, ensuring the user owns the image
        const updateResult = await query(
            `UPDATE generated_images 
             SET is_public = NOT is_public 
             WHERE id = $1 AND user_id = $2 
             RETURNING id, is_public`, // Return updated status
            [imageId, userId]
        );

        if (updateResult.rows.length === 0) {
            // Image not found OR user doesn't own it
            return NextResponse.json({ error: 'Image not found or permission denied' }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            imageId: updateResult.rows[0].id,
            isPublic: updateResult.rows[0].is_public
        });

    } catch (error) {
        console.error(`Error toggling public status for image ${imageId}:`, error);
        return NextResponse.json({ error: 'Internal server error updating image status' }, { status: 500 });
    }
}, true); // true = admin only 