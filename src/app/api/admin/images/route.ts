import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { GeneratedImage } from '@/types/images';

// GET: List generated images based on scope ('mine' or 'public')
export const GET = withAuth(async (req: AuthenticatedRequest) => {
    const user = req.user;
    if (!user) {
        return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const url = new URL(req.url);
    const scope = url.searchParams.get('scope'); // 'mine' or 'public'

    if (scope !== 'mine' && scope !== 'public') {
        return NextResponse.json({ error: 'Invalid scope parameter. Use \'mine\' or \'public\'.' }, { status: 400 });
    }

    try {
        let images: GeneratedImage[] = [];
        if (scope === 'mine') {
            const { rows } = await query<GeneratedImage>(
                'SELECT * FROM generated_images WHERE user_id = $1 ORDER BY created_at DESC',
                [user.sub] // Use user ID from authenticated token
            );
            images = rows;
        } else { // scope === 'public'
            const { rows } = await query<GeneratedImage>(
                'SELECT * FROM generated_images WHERE community_id = $1 AND is_public = true ORDER BY created_at DESC',
                [user.cid] // Use community ID from authenticated token
            );
            images = rows;
        }
        return NextResponse.json({ images });
    } catch (error) {
        console.error('Error fetching generated images:', error);
        return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }
}, true); // true = Admin only 