'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useAuth } from '@/context/AuthContext'; // Import useAuth to get the JWT status

// Define the expected response structure from the API endpoint
export interface BillingInfoResponse {
  currentPlan: {
    id: number;
    code: string;
    name: string;
  } | null;
  stripeCustomerId: string | null;
}

// Define the hook
export function useCommunityBillingInfo(communityId: string | undefined) {
  const { authFetch } = useAuthFetch();
  const { jwt } = useAuth(); // Get JWT to ensure user is authenticated before fetching

  const fetchBillingInfo = async (): Promise<BillingInfoResponse> => {
    if (!communityId) {
        throw new Error('Community ID is required to fetch billing info.');
    }
    // The API endpoint URL
    const url = '/api/community/billing-info';
    // authFetch handles adding the Authorization header
    return await authFetch<BillingInfoResponse>(url);
  };

  // Use useQuery to fetch, cache, and manage the state
  return useQuery<BillingInfoResponse, Error>({
    // Query key: uniquely identifies this query.
    // Includes communityId to refetch if it changes.
    queryKey: ['communityBillingInfo', communityId],
    // The function that performs the data fetching
    queryFn: fetchBillingInfo,
    // Options:
    // - enabled: Only run the query if communityId is truthy and JWT is present
    enabled: !!communityId && !!jwt,
    // - staleTime: How long data is considered fresh (e.g., 5 minutes)
    staleTime: 5 * 60 * 1000, 
    // - refetchOnWindowFocus: Optionally disable refetching on window focus
    refetchOnWindowFocus: false,
  });
} 