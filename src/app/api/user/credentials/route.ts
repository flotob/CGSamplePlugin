import { withAuth } from '@/lib/withAuth';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';

export const GET = withAuth(async (req) => {
  // Type guard: ensure req.user exists
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  const userId = user.sub;
  
  try {
    // Fetch all user credentials from the database
    const result = await query(
      `SELECT *
       FROM user_linked_credentials
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
    
    return NextResponse.json({
      credentials: result.rows,
    });
  } catch (error) {
    console.error('Error fetching user credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}, false); // false = requires authentication, but not admin 

// Define the expected request body for linking a new credential
interface LinkCredentialPayload {
  platform: string;      // E.g., "ENS", "LUKSO_UP". Must match a value in platform_enum.
  external_id: string; // The unique identifier (e.g., ENS name, UP address).
  username?: string | null; // A display name (e.g., ENS name, UP profile name).
}

export const POST = withAuth(async (req) => {
  const user = req.user as JwtPayload | undefined;
  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = user.sub;

  let payload: LinkCredentialPayload;
  try {
    payload = await req.json();
  } catch (jsonParseError) {
    console.error("Failed to parse JSON body for POST /api/user/credentials:", jsonParseError);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { platform, external_id, username } = payload;

  // Basic validation
  if (!platform || typeof platform !== 'string' || platform.trim() === '') {
    return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
  }
  if (!external_id || typeof external_id !== 'string' || external_id.trim() === '') {
    return NextResponse.json({ error: 'External ID is required' }, { status: 400 });
  }
  // Username is optional, but if provided, it should be a string or null
  if (username !== undefined && username !== null && typeof username !== 'string') {
    return NextResponse.json({ error: 'Invalid username format' }, { status: 400 });
  }

  try {
    // TODO: Add validation here to check if `platform` is a valid value in `platform_enum`
    // This might involve querying pg_enum or having a predefined list/type for platform_enum values.
    // For now, we rely on the database constraint to reject invalid enum values.

    const result = await query(
      `INSERT INTO user_linked_credentials (user_id, platform, external_id, username, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (user_id, platform) DO UPDATE SET
         external_id = EXCLUDED.external_id,
         username = EXCLUDED.username,
         updated_at = NOW()
       RETURNING *;`,
      [userId, platform.trim(), external_id.trim(), username ? username.trim() : null]
    );

    if (result.rows.length > 0) {
      return NextResponse.json({ credential: result.rows[0] }, { status: 201 }); // 201 Created (or 200 OK if updated)
    } else {
      // This case should ideally not be reached if RETURNING * is used and insert/update is successful.
      return NextResponse.json({ error: 'Failed to save credential, no record returned.' }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Error saving user credential:', error);
    // Check for unique constraint violation on (platform, external_id) if that's a global constraint you have
    // The current ON CONFLICT handles (user_id, platform)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') { // Type guard for error object
        // Check if the constraint name indicates the (platform, external_id) conflict
        if (error && typeof error === 'object' && 'constraint' in error && error.constraint === 'uniq_platform_id') { 
             return NextResponse.json({ error: `This ${platform} account is already linked by another user.` }, { status: 409 }); // 409 Conflict
        }
    }
    const errorMessage = error instanceof Error ? error.message : 'An unknown database error occurred.';
    return NextResponse.json({ error: 'Failed to save credential', details: errorMessage }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin 