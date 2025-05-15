import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import type { JwtPayload } from '@/app/api/auth/session/route';

// Define the feature enum values explicitly based on schema for iteration
const ALL_TRACKED_FEATURES = [
  'ai_chat_message',
  'wizard_step_completion',
  'api_call_generic',
  'active_wizard',
  'image_generation'
] as const;

type FeatureEnum = typeof ALL_TRACKED_FEATURES[number];

interface FeatureUsageDetails {
  usage: number;
  limit: number | null;
  utilizationPercentage: number | null;
  timeWindowDisplay: string;
}

interface CommunityFeatureUtilization {
  communityId: string;
  communityTitle: string;
  planName: string | null;
  features: {
    [key in FeatureEnum]?: FeatureUsageDetails | null; // Optional because a feature might not be set up for a plan
  };
}

interface RawPlanLimit {
  plan_id: number;
  feature: FeatureEnum;
  hard_limit: number;
  // time_window is not strictly needed for this simplified leaderboard logic
}

interface RawCommunityPlanInfo {
  community_id: string;
  community_title: string;
  plan_id: number | null;
  plan_name: string | null;
}

interface RawResourceUsage {
  community_id: string;
  feature: FeatureEnum; // To make it generic if more resources are added
  current_usage: number;
}

interface RawEventUsage {
  community_id: string;
  feature: FeatureEnum;
  current_usage: number;
}

export const GET = withAuth(async (req: AuthenticatedRequest): Promise<NextResponse<CommunityFeatureUtilization[] | { error: string }>> => {
  const user = req.user as JwtPayload | undefined;

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  const superAdminId = process.env.NEXT_PUBLIC_SUPERADMIN_ID;
  if (!superAdminId) {
    console.error('[SuperAdmin Quota Leaderboard] NEXT_PUBLIC_SUPERADMIN_ID is not set.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }
  if (user.sub !== superAdminId) {
    return NextResponse.json({ error: 'Forbidden: Access denied.' }, { status: 403 });
  }

  try {
    // 1. Fetch all core data
    const communitiesQuery = query<RawCommunityPlanInfo>(
      `SELECT c.id as community_id, c.title as community_title, p.id as plan_id, p.name as plan_name
       FROM communities c
       LEFT JOIN plans p ON c.current_plan_id = p.id;`
    );
    const planLimitsQuery = query<RawPlanLimit>(
      `SELECT plan_id, feature, hard_limit FROM plan_limits WHERE hard_limit > 0;`
    );
    const activeWizardsQuery = query<{ community_id: string; current_usage: string | number; }>(
      `SELECT community_id, COUNT(*) as current_usage 
       FROM onboarding_wizards WHERE is_active = true GROUP BY community_id;`
    );
    // Add other resource queries here if they become trackable by plan_limits

    const eventUsageQuery = query<{ community_id: string; feature: FeatureEnum; current_usage: string | number; }>(
      `SELECT community_id, feature, COUNT(*) as current_usage
       FROM usage_events
       WHERE occurred_at >= NOW() - INTERVAL '30 days'
       GROUP BY community_id, feature;`
    );

    const [
      communitiesResult,
      planLimitsResult,
      activeWizardsResult,
      eventUsageResult
    ]: [
      { rows: RawCommunityPlanInfo[] },
      { rows: RawPlanLimit[] },
      { rows: { community_id: string; current_usage: string | number; }[] },
      { rows: { community_id: string; feature: FeatureEnum; current_usage: string | number; }[] }
    ] = await Promise.all([
      communitiesQuery,
      planLimitsQuery,
      activeWizardsQuery,
      eventUsageQuery
    ]);

    // 2. Structure data for processing
    const planLimitsMap = new Map<number, Map<FeatureEnum, { limit: number }>>();
    planLimitsResult.rows.forEach(limit => {
      if (!planLimitsMap.has(limit.plan_id)) {
        planLimitsMap.set(limit.plan_id, new Map());
      }
      planLimitsMap.get(limit.plan_id)!.set(limit.feature, { limit: limit.hard_limit });
    });

    const usageMap = new Map<string, Map<FeatureEnum, number>>(); // community_id -> feature -> usage

    activeWizardsResult.rows.forEach((row: { community_id: string; current_usage: string | number; }) => {
      if (!usageMap.has(row.community_id)) {
        usageMap.set(row.community_id, new Map());
      }
      usageMap.get(row.community_id)!.set('active_wizard', Number(row.current_usage));
    });

    eventUsageResult.rows.forEach((row: { community_id: string; feature: FeatureEnum; current_usage: string | number; }) => {
      if (!usageMap.has(row.community_id)) {
        usageMap.set(row.community_id, new Map());
      }
      usageMap.get(row.community_id)!.set(row.feature, Number(row.current_usage));
    });

    // 3. Calculate utilization for each community
    const leaderboardData: CommunityFeatureUtilization[] = communitiesResult.rows.map(community => {
      const communityPlanLimits = community.plan_id ? planLimitsMap.get(community.plan_id) : undefined;
      const communityUsage = usageMap.get(community.community_id);

      const features: { [key in FeatureEnum]?: FeatureUsageDetails | null } = {};

      for (const featureName of ALL_TRACKED_FEATURES) {
        const usage = communityUsage?.get(featureName) ?? 0;
        const limitInfo = communityPlanLimits?.get(featureName);
        const limit = limitInfo?.limit ?? null;
        
        let utilizationPercentage: number | null = null;
        if (limit !== null && limit > 0) {
          utilizationPercentage = (usage / limit) * 100;
        } else if (limit === 0 && usage > 0) {
            utilizationPercentage = Infinity; // Or some other indicator for exceeding a zero limit
        }

        const timeWindowDisplay = featureName === 'active_wizard' ? "Total" : "Last 30 Days";

        features[featureName] = {
          usage,
          limit,
          utilizationPercentage,
          timeWindowDisplay
        };
      }

      return {
        communityId: community.community_id,
        communityTitle: community.community_title,
        planName: community.plan_name,
        features
      };
    });

    return NextResponse.json(leaderboardData);

  } catch (error: unknown) {
    console.error('[SuperAdmin Quota Leaderboard] Error:', error);
    // Basic error logging, can be enhanced
    return NextResponse.json({ error: 'Internal server error fetching quota leaderboard data' }, { status: 500 });
  }
}, true); 