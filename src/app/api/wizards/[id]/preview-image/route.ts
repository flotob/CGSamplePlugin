import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Define the structure of the route parameters
interface PreviewImageParams {
   id: string; // This is the wizardId
}

// GET: Fetch the preview image URL for a specific wizard
export const GET = withAuth<PreviewImageParams>(async (req: AuthenticatedRequest, context: { params: PreviewImageParams }) => {
    const user = req.user;
    // We need communityId to ensure the admin has access to this wizard
    if (!user || !user.cid) { 
      return NextResponse.json({ error: 'Authentication required or missing community ID' }, { status: 401 });
    }
    const communityId = user.cid;
    const { id: wizardId } = context.params;

    if (!wizardId) {
      return NextResponse.json({ error: 'Missing wizard ID' }, { status: 400 });
    }

    try {
        // Optimized query to get the backgroundValue from the first step
        // ordered by step_order, where the type is 'image' and value is not null,
        // also ensuring the wizard belongs to the correct community.
        const sql = `
            SELECT s.config -> 'presentation' ->> 'backgroundValue' AS "previewImageUrl"
            FROM onboarding_steps s
            JOIN onboarding_wizards w ON s.wizard_id = w.id
            WHERE s.wizard_id = $1
              AND w.community_id = $2
              AND s.config -> 'presentation' ->> 'backgroundType' = 'image'
              AND s.config -> 'presentation' ->> 'backgroundValue' IS NOT NULL
              AND s.config -> 'presentation' ->> 'backgroundValue' <> ''
            ORDER BY s.step_order ASC
            LIMIT 1;
        `;

        const { rows } = await query<{ previewImageUrl: string }>(sql, [wizardId, communityId]);

        let previewImageUrl: string | null = null;
        if (rows.length > 0 && rows[0].previewImageUrl) {
            previewImageUrl = rows[0].previewImageUrl;
        }

        // Return the URL (or null if not found)
        return NextResponse.json({ previewImageUrl });

    } catch (error) {
        console.error(`Failed to fetch preview image for wizard ${wizardId}:`, error);
        // Return null in case of error as well, or a specific error response
        // Returning null simplifies frontend handling potentially
        return NextResponse.json({ previewImageUrl: null, error: 'Failed to fetch preview image' }, { status: 500 });
    }
}, true); // true = admin only 