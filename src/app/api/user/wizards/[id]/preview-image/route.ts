import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Define the structure of the route parameters
interface UserPreviewImageParams {
   id: string; // Parameter name MUST match directory name [id]
}

// GET: Fetch the preview image URL for a specific wizard (User access)
export const GET = withAuth<UserPreviewImageParams>(async (req: AuthenticatedRequest, context: { params: UserPreviewImageParams }) => {
    const user = req.user;
    if (!user || !user.sub || !user.cid) { 
      return NextResponse.json({ error: 'Authentication required or missing community ID' }, { status: 401 });
    }
    const communityId = user.cid; 
    // Destructure 'id' from params and rename to wizardId for clarity
    const { id: wizardId } = context.params;

    if (!wizardId) {
      return NextResponse.json({ error: 'Missing wizard ID' }, { status: 400 });
    }

    try {
        const sql = `
            SELECT s.config -> 'presentation' ->> 'backgroundValue' AS "previewImageUrl"
            FROM onboarding_steps s
            JOIN onboarding_wizards w ON s.wizard_id = w.id
            WHERE s.wizard_id = $1
              AND w.community_id = $2 -- Verify community match
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

        return NextResponse.json({ previewImageUrl });

    } catch (error) {
        console.error(`Failed to fetch user preview image for wizard ${wizardId}:`, error);
        return NextResponse.json({ previewImageUrl: null, error: 'Failed to fetch preview image' }, { status: 500 });
    }
}, false); // false = Requires authentication, but NOT admin 