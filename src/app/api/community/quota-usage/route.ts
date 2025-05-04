import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import type { JwtPayload as BaseJwtPayload } from '@/app/api/auth/session/route';
import { query } from '@/lib/db'; // Import the database query utility

// Combine base payload with properties added by withAuth
type AuthenticatedJwtPayload = BaseJwtPayload & { iat: number; exp: number };

/**
 * GET /api/community/quota-usage
 * 
 * Retrieves the current community's usage against their plan's active wizard limit.
 * Admin only.
 */
export const GET = withAuth(async (req) => {
  // Type assertion using the specific type for the authenticated request
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user as AuthenticatedJwtPayload; // Use the combined type
  const communityId = user.cid;

  if (!communityId) {
    return NextResponse.json({ error: 'Community ID not found in token' }, { status: 400 });
  }

  try {
    // 1. Fetch community's current plan ID and active wizard count concurrently
    const [communityRes, wizardCountRes] = await Promise.all([
      query('SELECT current_plan_id FROM communities WHERE id = $1', [communityId]),
      query('SELECT COUNT(*) FROM onboarding_wizards WHERE community_id = $1 AND is_active = true', [communityId])
    ]);

    if (!communityRes || communityRes.rowCount === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const currentPlanId = communityRes.rows[0].current_plan_id; // Can be null
    const currentWizardUsage = (wizardCountRes?.rowCount && wizardCountRes.rows?.[0]?.count) 
      ? parseInt(wizardCountRes.rows[0].count, 10) 
      : 0;

    // 2. Fetch all active plans and their corresponding active_wizard limit
    const allPlansRes = await query(
      `SELECT 
         p.id, 
         p.name,
         COALESCE(pl.hard_limit, 0) as wizard_limit -- Default to 0 if no limit is explicitly set
       FROM plans p
       LEFT JOIN plan_limits pl ON p.id = pl.plan_id AND pl.feature = 'active_wizard'
       WHERE p.is_active = true -- Only show active plans
       ORDER BY p.price_cents ASC -- Order plans logically (e.g., by price)
      `
    );

    const allPlans = allPlansRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      wizardLimit: parseInt(row.wizard_limit, 10)
    })); 

    // 3. Structure and return the data
    const data = { 
      currentPlanId: currentPlanId, // Send the ID of the current plan (or null)
      currentWizardUsage: currentWizardUsage,
      plans: allPlans // Send the array of all available plans with their limits
    };

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching quota usage:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch quota usage', details: errorMessage }, { status: 500 });
  }
}, true); // true = admin only 