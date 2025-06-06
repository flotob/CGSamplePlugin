import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { UserInfoResponsePayload, CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

const JWT_SECRET = process.env.JWT_SECRET;

// Define the expected shape of the request body
interface SessionRequestBody {
    iframeUid: string;
    userId: string; // Typically userInfo.id
    communityId: string; // Typically communityInfo.id (long ID)
    isAdmin: boolean;
    // Add optional profile fields
    username?: string | null;
    pictureUrl?: string | null;
    roles: string[]; // Add roles field
    communityShortId: string; // NEW - for communityInfo.url
    pluginId: string;         // NEW - for pluginContextData.id
}

// Define the structure of our JWT payload
export interface JwtPayload {
    sub: string; // User ID
    cid: string; // Community ID (long)
    uid: string; // iframeUid
    adm: boolean; // isAdmin flag
    // Add optional profile claims
    name?: string | null; // Using standard 'name' claim
    picture?: string | null; // Using standard 'picture' claim
    roles: string[]; // Add roles claim
    communityShortId?: string; // NEW - claim for community's short identifier
    pluginId?: string;         // NEW - claim for plugin's definition ID
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
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Destructure all expected fields, including optional profile ones and roles
    const { iframeUid, userId, communityId, isAdmin, username, pictureUrl, roles, communityShortId, pluginId } = body;

    // Updated validation to include new required fields
    if (!iframeUid || !userId || !communityId || typeof isAdmin !== 'boolean' || !Array.isArray(roles) || !communityShortId || !pluginId) {
        return NextResponse.json({ error: 'Missing required fields (including communityShortId, pluginId) or invalid roles format' }, { status: 400 });
    }

    try {
        // Construct payload including optional claims and roles
        const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
            sub: userId,
            cid: communityId,
            uid: iframeUid,
            adm: isAdmin,
            roles: roles, // Add roles to payload
            // Only include profile claims if they have a value
            ...(username && { name: username }), 
            ...(pictureUrl && { picture: pictureUrl }),
            ...(communityShortId && { communityShortId: communityShortId }),
            ...(pluginId && { pluginId: pluginId }),
        };

        // Sign the JWT
        // Set expiration (e.g., 1 hour)
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        console.log(`JWT issued for user ${userId} in community ${communityId} (short: ${communityShortId}, plugin: ${pluginId})`);

        return NextResponse.json({ token });

    } catch (error) {
        console.error('Error signing JWT:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
} 