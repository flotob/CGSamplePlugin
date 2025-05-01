import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@/app/api/auth/session/route'; // Corrected import path using alias

const JWT_SECRET = process.env.JWT_SECRET;

// Define an interface for the request object after authentication
export interface AuthenticatedRequest extends NextRequest {
    user?: JwtPayload & { iat: number; exp: number }; // Add the decoded user payload
}

// Define the type for the handler function that receives the authenticated request with awaited params
export function withAuth<Params = Record<string, string>>(
    handler: (req: AuthenticatedRequest, context: { params: Params }) => Promise<NextResponse> | NextResponse,
    adminOnly: boolean = false
) {
    // Return the route handler that will handle authentication before calling the provided handler
    return async (req: NextRequest, context: { params: Promise<Params> }): Promise<NextResponse> => {
        if (!JWT_SECRET) {
            console.error('JWT_SECRET is not configured for verification.');
            return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
        }

        const authHeader = req.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authorization header missing or invalid' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return NextResponse.json({ error: 'Token missing' }, { status: 401 });
        }

        try {
            // Verify the token
            const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { iat: number; exp: number };

            // Attach decoded payload to an extended request object
            const authReq = req as AuthenticatedRequest;
            authReq.user = decoded;

            // Check for admin role if required
            if (adminOnly && !decoded.adm) {
                console.warn(`Non-admin user (sub: ${decoded.sub}) attempted admin-only route.`);
                return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
            }

            // Await the params before passing to handler
            const resolvedParams = await context.params;

            // Call the original handler with the authenticated request and resolved params
            return await handler(authReq, { params: resolvedParams });

        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return NextResponse.json({ error: 'Token expired' }, { status: 401 });
            } else if (error instanceof jwt.JsonWebTokenError) {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
            } else {
                console.error('Error verifying JWT:', error);
                return NextResponse.json({ error: 'Internal server error during authentication' }, { status: 500 });
            }
        }
    };
} 