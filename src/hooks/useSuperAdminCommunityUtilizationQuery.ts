import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useAuth } from '@/context/AuthContext';
import type { HttpError } from '@/lib/authFetch';

// Define the feature enum values explicitly based on schema for iteration
const ALL_POSSIBLE_FEATURES = [
  'ai_chat_message',
  'wizard_step_completion',
  'api_call_generic',
  'active_wizard',
  'image_generation'
] as const;

// Features to ignore in the utilization leaderboard display
const IGNORED_LEADERBOARD_FEATURES = [
  'wizard_step_completion',
  'api_call_generic'
] as const;

type IgnoredFeatureLiterals = typeof IGNORED_LEADERBOARD_FEATURES[number];

// Filtered list of features to actually display columns for
export const ALL_TRACKED_FEATURES_FRONTEND = ALL_POSSIBLE_FEATURES.filter(
  (feature): feature is Exclude<typeof ALL_POSSIBLE_FEATURES[number], IgnoredFeatureLiterals> => 
    !(IGNORED_LEADERBOARD_FEATURES as readonly string[]).includes(feature)
);

export type FeatureEnumFrontend = typeof ALL_TRACKED_FEATURES_FRONTEND[number];

export interface FeatureUsageDetails {
  usage: number;
  limit: number | null;
  utilizationPercentage: number | null;
  timeWindowDisplay: string;
}

export interface CommunityFeatureUtilization {
  communityId: string;
  communityTitle: string;
  planName: string | null;
  features: {
    // Features object will still contain all data from backend, but frontend will only pick columns from ALL_TRACKED_FEATURES_FRONTEND
    [key in typeof ALL_POSSIBLE_FEATURES[number]]?: FeatureUsageDetails | null;
  };
}

const COMMUNITY_UTILIZATION_QUERY_KEY = ['superAdminCommunityUtilization'];

/**
 * Hook to fetch per-feature quota utilization for all communities.
 * Enabled only for the Super Admin.
 */
export function useSuperAdminCommunityUtilizationQuery(): UseQueryResult<CommunityFeatureUtilization[], Error> {
  const { authFetch } = useAuthFetch();
  const { decodedPayload } = useAuth();

  const superAdminId = process.env.NEXT_PUBLIC_SUPERADMIN_ID;
  const currentUserId = decodedPayload?.sub;
  const isSuperAdmin = !!currentUserId && !!superAdminId && currentUserId === superAdminId;

  return useQuery<CommunityFeatureUtilization[], Error, CommunityFeatureUtilization[], string[]> ({
    queryKey: COMMUNITY_UTILIZATION_QUERY_KEY,
    queryFn: async () => {
      if (!isSuperAdmin) {
        throw new Error('User is not authorized to fetch community utilization data.');
      }
      return authFetch<CommunityFeatureUtilization[]>('/api/super-admin/community-utilization');
    },
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount: number, error: Error) => {
      if (error && typeof (error as HttpError).status === 'number') {
        const httpError = error as HttpError;
        if (httpError.status === 403 || httpError.status === 401) {
          return false;
        }
      }
      return failureCount < 3;
    },
  });
} 