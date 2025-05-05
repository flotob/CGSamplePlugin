import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define the structure for the returned image objects
// Mirror the database table structure
export interface GeneratedImage {
    id: string; // uuid
    user_id: string;
    community_id: string;
    storage_url: string;
    prompt_structured: Record<string, any>; // jsonb
    is_public: boolean;
    created_at: string; // timestamptz
}

// GET: List generated images based on scope ('mine' or 'public')
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    const user = req.user as JwtPayload | undefined;
    if (!user || !user.sub || !user.cid) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = user.sub;
    const communityId = user.cid;

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope'); // 'mine' or 'public'

    if (scope !== 'mine' && scope !== 'public') {
        return NextResponse.json({ error: 'Invalid scope parameter. Use \'mine\' or \'public\'.' }, { status: 400 });
    }

    try {
        let imagesResult;
        if (scope === 'mine') {
            // Fetch images created by the current user
            imagesResult = await query<GeneratedImage>(
                `SELECT * FROM generated_images 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC`,
                [userId]
            );
        } else { // scope === 'public'
            // Fetch public images within the current user's community
            imagesResult = await query<GeneratedImage>(
                `SELECT * FROM generated_images 
                 WHERE community_id = $1 AND is_public = true 
                 ORDER BY created_at DESC`,
                [communityId]
            );
        }

        return NextResponse.json({ images: imagesResult.rows });

    } catch (error) {
        console.error(`Error fetching images for scope '${scope}':`, error);
        return NextResponse.json({ error: 'Internal server error fetching images' }, { status: 500 });
    }
}, true); // true = admin only 