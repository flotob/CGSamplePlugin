'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Define the structure for a single plan in the comparison
export interface PlanQuotaInfo {
  id: number;
  name: string;
  wizardLimit: number;
}

// Define the expected shape of the API response data
export interface QuotaComparisonData {
  currentPlanId: number | null; // ID of the community's current plan (or null)
  currentWizardUsage: number;
  plans: PlanQuotaInfo[]; // Array of all available plans
}

// Define potential error structure from the API
interface ApiError {
    error: string;
    details?: string;
}

/**
 * React Query hook to fetch the community's current quota usage for active wizards.
 * This is intended for use in admin-only contexts.
 */
export const useQuotaUsageQuery = () => {
  const { authFetch } = useAuthFetch();

  return useQuery<QuotaComparisonData, Error>({ // Update Data type here
    queryKey: ['quotaUsageComparison'], // Changed queryKey to reflect new data
    queryFn: async () => {
      const response = await authFetch<QuotaComparisonData>('/api/community/quota-usage'); // Update type here
      
      // authFetch already handles non-OK responses by throwing an error
      // Just need to return the data if successful
      return response;
    },
    // Optional: Configure caching behavior, e.g., refetch interval or stale time
    staleTime: 5 * 60 * 1000, // Refetch data if older than 5 minutes
    refetchOnWindowFocus: true, // Refetch when the browser window regains focus
  });
}; 