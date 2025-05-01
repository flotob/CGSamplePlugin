import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import type { JwtPayload } from '@/app/api/auth/session/route';

// GET handler - Public access
// Fetches community settings (currently just logo_url) based on communityId query param
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const communityId = searchParams.get('communityId');

  if (!communityId) {
    return NextResponse.json({ error: 'Missing communityId query parameter' }, { status: 400 });
  }

  try {
    const result = await query(
      'SELECT logo_url FROM communities WHERE id = $1',
      [communityId]
    );

    if (result.rows.length === 0) {
      // Community not found or has no settings entry yet, return null logo_url
      return NextResponse.json({ logo_url: null });
    }

    const settings = result.rows[0];
    return NextResponse.json({ logo_url: settings.logo_url }); // Will be null if not set

  } catch (error) {
    console.error('Error fetching community settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH handler - Admin only
// Updates community settings (currently just logo_url)
export const PATCH = withAuth(async (req) => {
  // Type guard: ensure req.user exists and has the expected shape
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const communityId = user.cid;

  let body: { logo_url?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { logo_url } = body;

  // Validate logo_url
  if (logo_url && typeof logo_url === 'string' && !logo_url.startsWith('https://app.cg/')) {
    // Allow null or empty string (to clear the logo), but validate format if provided
     if (logo_url.trim() !== '') { // Allow empty string to clear
        return NextResponse.json({ error: 'Invalid logo URL domain. Must start with https://app.cg/' }, { status: 400 });
     }
  }

  try {
    // Use incoming logo_url directly. Set to NULL if empty string or null is passed.
    const effectiveLogoUrl = (logo_url && logo_url.trim() !== '') ? logo_url : null;

    // Ensure the community row exists before updating (or insert if it doesn't, though less likely for PATCH)
    // This assumes the community row was created elsewhere (e.g., when a wizard was first created)
    const updateResult = await query(
      'UPDATE communities SET logo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [effectiveLogoUrl, communityId]
    );

    if (updateResult.rowCount === 0) {
        // Handle case where community might not exist in our table yet, though it should.
        // Could attempt an INSERT here if needed, but for now, we'll consider it an error.
         console.warn(`Attempted to update logo for non-existent community ID: ${communityId}`);
         return NextResponse.json({ error: 'Community not found for update.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, logo_url: effectiveLogoUrl });

  } catch (error) {
    console.error('Error updating community settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, true); // true makes this admin-only 