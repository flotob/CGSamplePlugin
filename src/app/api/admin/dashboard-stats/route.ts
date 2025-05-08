import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define interfaces for the response structure
interface KpiStats {
  totalWizards: number;
  activeWizards: number;
  totalUsersCompleted: number;
  totalCredentialsLinked: number;
  totalImagesGenerated: number;
  totalStepsCompleted: number;
}

interface CompletionDataPoint {
  date: string; // YYYY-MM-DD format
  completions: number;
}

interface DashboardStatsResponse {
  kpis: KpiStats;
  completionsLast30Days: CompletionDataPoint[];
}

// Helper to extract count from query result, defaulting to 0
const getCountFromResult = (result: { rows?: { count?: string | number }[] } | null | undefined): number => {
  // pg library returns count as string, need to parse
  return parseInt(String(result?.rows?.[0]?.count ?? 0), 10);
};

export const GET = withAuth(async (req: AuthenticatedRequest): Promise<NextResponse<DashboardStatsResponse | { error: string }>> => {
  const user = req.user as JwtPayload | undefined;
  if (!user?.cid) {
    return NextResponse.json({ error: 'Missing community ID in token' }, { status: 400 });
  }
  const communityId = user.cid;

  try {
    // --- Define Queries --- 
    // Note: communityId ($1) will be passed to each query

    // Total Wizards
    const totalWizardsQuery = query<{ count: string | number }>(
      `SELECT COUNT(*) FROM onboarding_wizards WHERE community_id = $1`,
      [communityId]
    );

    // Active Wizards
    const activeWizardsQuery = query<{ count: string | number }>(
      `SELECT COUNT(*) FROM onboarding_wizards WHERE community_id = $1 AND is_active = true`,
      [communityId]
    );

    // Unique Users Completed Any Wizard
    const completedUsersQuery = query<{ count: string | number }>(
      `SELECT COUNT(DISTINCT user_id) 
       FROM user_wizard_completions 
       WHERE wizard_id IN (SELECT id FROM onboarding_wizards WHERE community_id = $1)`,
       [communityId]
    );

    // Total Linked Credentials (for users who completed any wizard in the community)
    const linkedCredentialsQuery = query<{ count: string | number }>(
      `SELECT COUNT(*) 
       FROM user_linked_credentials 
       WHERE user_id IN (
           SELECT DISTINCT user_id 
           FROM user_wizard_completions 
           WHERE wizard_id IN (SELECT id FROM onboarding_wizards WHERE community_id = $1)
       )`,
       [communityId]
    );

    // Total Generated Images
    const generatedImagesQuery = query<{ count: string | number }>(
        `SELECT COUNT(*) FROM generated_images WHERE community_id = $1`,
        [communityId]
    );

    // Completions per day for the last 30 days
    const completionsTimeSeriesQuery = query<{ completion_date: Date, completions: string | number }>(
      `SELECT DATE(completed_at) as completion_date, COUNT(*) as completions 
       FROM user_wizard_completions 
       WHERE wizard_id IN (SELECT id FROM onboarding_wizards WHERE community_id = $1) 
         AND completed_at >= NOW() - INTERVAL '30 days' 
       GROUP BY DATE(completed_at) 
       ORDER BY completion_date ASC`,
       [communityId]
    );

    // New query for total step completions
    const totalStepsCompletedQuery = query<{ count: string | number }>(
      `SELECT COUNT(*) 
       FROM user_wizard_progress 
       WHERE wizard_id IN (SELECT id FROM onboarding_wizards WHERE community_id = $1)`,
       [communityId]
    );

    // --- Execute Queries in Parallel --- 
    const [
        totalWizardsResult,
        activeWizardsResult,
        completedUsersResult,
        linkedCredentialsResult,
        generatedImagesResult,
        completionsTimeSeriesResult,
        totalStepsCompletedResult
    ] = await Promise.all([
        totalWizardsQuery,
        activeWizardsQuery,
        completedUsersQuery,
        linkedCredentialsQuery,
        generatedImagesQuery,
        completionsTimeSeriesQuery,
        totalStepsCompletedQuery
    ]);

    // --- Process Results --- 
    const kpis: KpiStats = {
        totalWizards: getCountFromResult(totalWizardsResult),
        activeWizards: getCountFromResult(activeWizardsResult),
        totalUsersCompleted: getCountFromResult(completedUsersResult),
        totalCredentialsLinked: getCountFromResult(linkedCredentialsResult),
        totalImagesGenerated: getCountFromResult(generatedImagesResult),
        totalStepsCompleted: getCountFromResult(totalStepsCompletedResult),
    };

    const completionsLast30Days: CompletionDataPoint[] = (completionsTimeSeriesResult?.rows ?? []).map(row => ({
        // Format Date object to YYYY-MM-DD string
        date: row.completion_date.toISOString().split('T')[0],
        completions: parseInt(String(row.completions), 10),
    }));

    // --- Construct Final Response --- 
    const responseData: DashboardStatsResponse = {
        kpis,
        completionsLast30Days,
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Error fetching admin dashboard stats:', error);
    // Log specific SQL errors if possible
    if (error.code) { // Check if it looks like a Postgres error object
        console.error(`Database Error Code: ${error.code}, Detail: ${error.detail}`);
    }
    return NextResponse.json({ error: 'Internal server error fetching dashboard data' }, { status: 500 });
  }
}, true); // true: requires admin privileges 