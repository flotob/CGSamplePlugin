'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Define the structure for a single plan in the comparison
export interface PlanQuotaInfo {
  id: number;
  name: string;
  planCode: string;
  wizardLimit: number;
  imageGenerationLimit: number;
  imageGenerationTimeWindow: string | null;
  aiChatMessageLimit: number;
  aiChatMessageTimeWindow: string | null;
}

// Define the expected shape of the API response data
export interface QuotaComparisonData {
  currentPlanId: number | null;
  currentWizardUsage: number;
  currentImageGenerationUsage: number;
  currentAiChatMessageUsage: number;
  plans: PlanQuotaInfo[];
}

/**
 * React Query hook to fetch the community's current quota usage and plan comparisons.
 * This is intended for use in admin-only contexts.
 */
export const useQuotaUsageQuery = () => {
  const { authFetch } = useAuthFetch();

  return useQuery<QuotaComparisonData, Error>({
    queryKey: ['quotaUsageComparison'], 
    queryFn: async () => {
      // The API endpoint now returns the extended QuotaComparisonData structure
      const response = await authFetch<QuotaComparisonData>('/api/community/quota-usage');
      return response;
    },
    // Optional: Configure caching behavior, e.g., refetch interval or stale time
    staleTime: 5 * 60 * 1000, // Refetch data if older than 5 minutes
    refetchOnWindowFocus: true, // Refetch when the browser window regains focus
  });
}; 