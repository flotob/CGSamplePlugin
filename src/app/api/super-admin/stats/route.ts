import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import type { JwtPayload } from '@/app/api/auth/session/route';

interface PlanStat {
  id: number;
  name: string;
  code: string;
  count: number;
}

interface FeatureStat {
  feature: string;
  count: number;
}

interface SuperAdminDashboardStatsResponse {
  totalCommunities: number;
  communitiesByPlan: PlanStat[];
  totalUsageEvents: number;
  usageEventsByFeature: FeatureStat[];
  totalWizardsAllCommunities: number;
  totalActiveWizardsAllCommunities: number;
}

// Helper to extract count, defaulting to 0
const getCount = (result: { rows?: { count?: string | number }[] } | null | undefined): number => {
  return parseInt(String(result?.rows?.[0]?.count ?? 0), 10);
};

export const GET = withAuth(async (req: AuthenticatedRequest): Promise<NextResponse<SuperAdminDashboardStatsResponse | { error: string }>> => {
  const user = req.user as JwtPayload | undefined;

  // 1. Authorization: Check if the authenticated user is the Super Admin
  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const superAdminId = process.env.NEXT_PUBLIC_SUPERADMIN_ID;
  if (!superAdminId) {
    console.error('[SuperAdmin Stats] NEXT_PUBLIC_SUPERADMIN_ID is not set in environment variables.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  if (user.sub !== superAdminId) {
    return NextResponse.json({ error: 'Forbidden: Access denied.' }, { status: 403 });
  }

  try {
    // 2. Fetch Data
    // Total Communities
    const totalCommunitiesQuery = query<{ count: string | number }>( 'SELECT COUNT(*) FROM communities;');

    // Communities by Plan
    // Handles cases where current_plan_id might be null by COALESCE and LEFT JOIN
    const communitiesByPlanQuery = query<Omit<PlanStat, 'count'> & { community_count: string | number }>(`
      SELECT 
        p.id, 
        p.name, 
        p.code, 
        COUNT(c.id) as community_count 
      FROM plans p
      LEFT JOIN communities c ON c.current_plan_id = p.id
      GROUP BY p.id, p.name, p.code
      ORDER BY p.name;
    `);
    // Query for communities explicitly without a plan (current_plan_id IS NULL)
    const communitiesWithoutPlanQuery = query<{ count: string | number }>( 'SELECT COUNT(*) as count FROM communities WHERE current_plan_id IS NULL;');


    // Total Usage Events
    const totalUsageEventsQuery = query<{ count: string | number }>( 'SELECT COUNT(*) FROM usage_events;');

    // Usage Events by Feature
    const usageEventsByFeatureQuery = query<{ feature: string; count: string | number }>(`
      SELECT feature, COUNT(*) as count 
      FROM usage_events 
      GROUP BY feature 
      ORDER BY feature;
    `);

    // New Queries for All Wizards Stats
    const totalWizardsAllCommunitiesQuery = query<{ count: string | number }>( 'SELECT COUNT(*) FROM onboarding_wizards;');
    const totalActiveWizardsAllCommunitiesQuery = query<{ count: string | number }>( 'SELECT COUNT(*) FROM onboarding_wizards WHERE is_active = true;');

    const [
      totalCommunitiesResult,
      communitiesByPlanResult,
      communitiesWithoutPlanResult,
      totalUsageEventsResult,
      usageEventsByFeatureResult,
      totalWizardsAllCommunitiesResult,
      totalActiveWizardsAllCommunitiesResult
    ]: [
      { rows: { count: string | number }[] },
      { rows: (Omit<PlanStat, 'count'> & { community_count: string | number })[] },
      { rows: { count: string | number }[] }, // Explicit type for communitiesWithoutPlanResult
      { rows: { count: string | number }[] },
      { rows: { feature: string; count: string | number }[] },
      { rows: { count: string | number }[] },
      { rows: { count: string | number }[] }
    ] = await Promise.all([
      totalCommunitiesQuery,
      communitiesByPlanQuery,
      communitiesWithoutPlanQuery,
      totalUsageEventsQuery,
      usageEventsByFeatureQuery,
      totalWizardsAllCommunitiesQuery,
      totalActiveWizardsAllCommunitiesQuery
    ]);

    // 3. Process Data
    const totalCommunities = getCount(totalCommunitiesResult);
    const totalUsageEvents = getCount(totalUsageEventsResult);
    const totalWizardsAllCommunities = getCount(totalWizardsAllCommunitiesResult);
    const totalActiveWizardsAllCommunities = getCount(totalActiveWizardsAllCommunitiesResult);

    const communitiesByPlan: PlanStat[] = communitiesByPlanResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      code: row.code,
      count: parseInt(String(row.community_count), 10)
    }));

    const unassignedPlanCount = getCount(communitiesWithoutPlanResult);
    if (unassignedPlanCount > 0) {
        communitiesByPlan.push({
            id: 0, // Or some other placeholder ID like -1 or null if preferred
            name: 'Unassigned/Free Tier', // Placeholder name
            code: 'unassigned',
            count: unassignedPlanCount
        });
    }

    const usageEventsByFeature: FeatureStat[] = usageEventsByFeatureResult.rows.map(row => ({
      feature: row.feature,
      count: parseInt(String(row.count), 10)
    }));

    const responseData: SuperAdminDashboardStatsResponse = {
      totalCommunities,
      communitiesByPlan,
      totalUsageEvents,
      usageEventsByFeature,
      totalWizardsAllCommunities,
      totalActiveWizardsAllCommunities
    };

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error('[SuperAdmin Stats] Error fetching dashboard data:', error);
    if (error && typeof error === 'object' && 'code' in error && 'detail' in error) {
      console.error(`Database Error Code: ${error.code}, Detail: ${error.detail}`);
    }
    return NextResponse.json({ error: 'Internal server error fetching super admin dashboard data' }, { status: 500 });
  }
}, true); // true for adminOnly - withAuth will ensure user is admin, then we do specific super-admin check 