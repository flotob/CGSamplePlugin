'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useAuth } from '@/context/AuthContext'; // Import useAuth to get the JWT status

// Define structure for Invoice History items from the API
interface InvoiceHistoryItem {
    id: string;
    created: number; // Unix timestamp
    amountPaid: number; // Smallest currency unit (e.g., cents)
    currency: string;
    status: string | null;
    pdfUrl?: string | null;
}

// Define the expected response structure from the API endpoint
export interface BillingInfoResponse {
  currentPlan: {
    id: number;
    code: string;
    name: string;
  } | null;
  stripeCustomerId: string | null;
  // Add optional Stripe subscription/payment details from the enhanced API
  subscriptionStatus?: string | null;
  trialEndDate?: number | null; // Unix timestamp
  periodEndDate?: number | null; // Unix timestamp
  cancelAtPeriodEnd?: boolean | null; // Add cancellation flag
  cardBrand?: string | null;
  cardLast4?: string | null;
  invoiceHistory?: InvoiceHistoryItem[] | null; // Add invoice history array
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