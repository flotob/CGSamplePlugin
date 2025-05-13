import { withAuth } from '@/lib/withAuth';
import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import type { JwtPayload } from '@/app/api/auth/session/route';
// Import Quota checking utilities
import {
  enforceResourceLimit,
  Feature,
  QuotaExceededError,
} from '@/lib/quotas';

// Define an extended request type including the user payload
interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
}

// Define the structure for the response item
// Match the Wizard type used in admin hooks for consistency if possible
// Assuming a structure like this:
export interface WizardSummary {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  required_role_id: string | null;
  assign_roles_per_step: boolean;
  is_hero: boolean;
}

// GET: List wizards for the user's community, optionally filtering by active status
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user; // Access user directly from the typed request
  // Community ID is required context from the token
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Community context required' }, { status: 401 });
  }
  const communityId = user.cid;

  const { searchParams } = new URL(req.url);
  const isActiveParam = searchParams.get('isActive');

  // Default to fetching only active wizards unless isActive=false or isActive=all
  let filterActive: boolean | null = null;
  if (isActiveParam === 'true') {
    filterActive = true;
  } else if (isActiveParam === 'false') {
    filterActive = false;
  } else if (isActiveParam === 'all') {
    filterActive = null; // null means don't filter by is_active
  }

  try {
    let queryString = `SELECT id, community_id, name, description, is_active, created_at, updated_at, required_role_id, assign_roles_per_step, is_hero 
                       FROM onboarding_wizards 
                       WHERE community_id = $1`;
    const queryParams: (string | boolean)[] = [communityId];

    if (filterActive !== null) {
      queryString += ` AND is_active = $2`;
      queryParams.push(filterActive);
    }

    queryString += ` ORDER BY updated_at DESC`; // Example ordering

    // Use generic query type if db.ts supports it
    const wizardsRes = await query<WizardSummary>(queryString, queryParams);
    const wizards = wizardsRes.rows;

    return NextResponse.json({ wizards });

  } catch (error) {
    console.error('Error fetching wizards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, false); // false = requires authentication, but not admin

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const user = req.user; // Type assertion removed as AuthenticatedRequest handles it
  if (!user || !user.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const communityId = user.cid;

  let body: { 
    name?: string; 
    description?: string; 
    is_active?: boolean; 
    required_role_id?: string | null; 
    assign_roles_per_step?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description, is_active = true, required_role_id, assign_roles_per_step = false } = body;
  if (!name) {
    return NextResponse.json({ error: 'Wizard name is required' }, { status: 400 });
  }

  try {
    // --- Quota Enforcement --- //
    // Only check quota if we are creating an *active* wizard
    if (is_active) {
      await enforceResourceLimit(communityId, Feature.ActiveWizard);
    }
    // ------------------------ //

    // Insert new wizard
    const result = await query<
      WizardSummary // Use WizardSummary type for returned row
    >(
      `INSERT INTO onboarding_wizards (community_id, name, description, is_active, required_role_id, assign_roles_per_step)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [communityId, name, description || null, is_active, required_role_id || null, assign_roles_per_step]
    );

    if (result.rows.length === 0) {
       throw new Error("Wizard creation failed, no row returned.");
    }

    return NextResponse.json({ wizard: result.rows[0] }, { status: 201 });

  } catch (error) {
    if (error instanceof QuotaExceededError) {
      // Standardized Quota Exceeded Response
      return NextResponse.json({
        error: "QuotaExceeded", // Machine-readable code
        message: error.message, // User-friendly message from the error object
        details: {
          feature: error.feature,
          limit: error.limit,
          currentCount: Number(error.currentCount), // Ensure currentCount is a number
          window: error.window, // 'static' for resource limits
        }
      }, { status: 402 }); // 402 Payment Required
    } else if (error instanceof Error && error.message.includes('uniq_wizard_name_per_community')) {
      // Handle specific DB constraint errors, like unique name violation
       return NextResponse.json(
         { error: 'A wizard with this name already exists in this community.' },
         { status: 409 } // 409 Conflict
       );
    } else {
      // Handle other generic errors
      console.error('Error creating wizard:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
}, true); // true = adminOnly 