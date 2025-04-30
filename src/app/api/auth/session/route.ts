import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { UserInfoResponsePayload, CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

const JWT_SECRET = process.env.JWT_SECRET;

// Define the expected shape of the request body
interface SessionRequestBody {
    iframeUid: string;
    userId: string; // Typically userInfo.id
    communityId: string; // Typically communityInfo.id
    isAdmin: boolean;
}

// Define the structure of our JWT payload
export interface JwtPayload {
    sub: string; // User ID
    cid: string; // Community ID
    uid: string; // iframeUid
    adm: boolean; // isAdmin flag
    // Standard JWT claims (iat, exp) will be added by the library
}

export async function POST(req: NextRequest) {
    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not configured.');
        return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    let body: SessionRequestBody;
    try {
        body = await req.json();
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { iframeUid, userId, communityId, isAdmin } = body;

    // Basic validation
    if (!iframeUid || !userId || !communityId || typeof isAdmin !== 'boolean') {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
            sub: userId,
            cid: communityId,
            uid: iframeUid,
            adm: isAdmin,
        };

        // Sign the JWT
        // Set expiration (e.g., 1 hour)
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        console.log(`JWT issued for user ${userId} in community ${communityId}`);

        return NextResponse.json({ token });

    } catch (error) {
        console.error('Error signing JWT:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
} 