import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useAuth } from '@/context/AuthContext'; // To get current user ID
import type { HttpError } from '@/lib/authFetch'; // Import HttpError for status checking

// Response type from the backend API (src/app/api/super-admin/stats/route.ts)
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

export interface SuperAdminDashboardStatsResponse {
  totalCommunities: number;
  communitiesByPlan: PlanStat[];
  totalUsageEvents: number;
  usageEventsByFeature: FeatureStat[];
  totalWizardsAllCommunities: number;
  totalActiveWizardsAllCommunities: number;
}

const SUPER_ADMIN_STATS_QUERY_KEY = ['superAdminDashboardStats'];

/**
 * Hook to fetch super admin dashboard statistics.
 *
 * IMPORTANT: This hook will only attempt to fetch data if the current user
 * is identified as the Super Admin via the NEXT_PUBLIC_SUPERADMIN_ID environment variable.
 * If the user is not the super admin, the query will be disabled and will not run.
 */
export function useSuperAdminStatsQuery(): UseQueryResult<SuperAdminDashboardStatsResponse, Error> {
  const { authFetch } = useAuthFetch();
  const { decodedPayload } = useAuth(); // Get decodedPayload from AuthContext

  const superAdminId = process.env.NEXT_PUBLIC_SUPERADMIN_ID;
  // Ensure decodedPayload and its 'sub' property exist before comparison
  const currentUserId = decodedPayload?.sub;
  const isSuperAdmin = !!currentUserId && !!superAdminId && currentUserId === superAdminId;

  return useQuery<SuperAdminDashboardStatsResponse, Error, SuperAdminDashboardStatsResponse, string[]> ({
    queryKey: SUPER_ADMIN_STATS_QUERY_KEY,
    queryFn: async () => {
      // This check is largely redundant due to 'enabled' but acts as a strong safeguard.
      if (!isSuperAdmin) {
        throw new Error('User is not authorized to fetch super admin stats.');
      }
      return authFetch<SuperAdminDashboardStatsResponse>('/api/super-admin/stats');
    },
    enabled: isSuperAdmin, // Only enable if user is defined, superAdminId is set, and user is the super admin
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount: number, error: Error) => {
      // Do not retry on 403 Forbidden (not super admin) or 401 Unauthorized
      // Check if error is an instance of HttpError to safely access status
      if (error && typeof (error as HttpError).status === 'number') {
        const httpError = error as HttpError;
        if (httpError.status === 403 || httpError.status === 401) {
          return false;
        }
      }
      // Default retry behavior for other errors (e.g., network issues, 500s)
      return failureCount < 3;
    },
  });
} 