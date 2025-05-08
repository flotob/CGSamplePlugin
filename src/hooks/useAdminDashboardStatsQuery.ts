'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext'; 
import { useAuthFetch } from '@/lib/authFetch';

// Define the expected API response structure (mirroring the backend)
interface KpiStats {
  totalWizards: number;
  activeWizards: number;
  totalUsersCompleted: number;
  totalCredentialsLinked: number;
  totalImagesGenerated: number;
}

interface CompletionDataPoint {
  date: string; // YYYY-MM-DD format
  completions: number;
}

// Export this interface for use in components
export interface DashboardStatsData {
  kpis: KpiStats;
  completionsLast30Days: CompletionDataPoint[];
}

/**
 * Hook to fetch admin dashboard statistics for the current community.
 */
export function useAdminDashboardStatsQuery() {
  const { authFetch } = useAuthFetch();
  const { decodedPayload } = useAuth(); // Get JWT payload for communityId and admin status check
  const communityId = decodedPayload?.cid;
  const isAdmin = decodedPayload?.adm;

  const fetchStats = async (): Promise<DashboardStatsData> => {
    // The communityId check here might be redundant due to 'enabled' option,
    // but provides an extra layer of safety.
    if (!communityId) {
      throw new Error('Community ID not found, cannot fetch stats.');
    }
    // Use authFetch which includes the JWT automatically
    return await authFetch<DashboardStatsData>('/api/admin/dashboard-stats');
  };

  return useQuery<DashboardStatsData, Error>({
    // Query key includes communityId to ensure data is specific to the community
    // and refetches if the community context changes (though unlikely in this plugin context).
    queryKey: ['adminDashboardStats', communityId],
    queryFn: fetchStats,
    // Enable the query only if we have a communityId and the user is an admin.
    enabled: !!communityId && !!isAdmin,
    // Optional: Configure staleTime, cacheTime, refetch intervals etc. as needed
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
} 