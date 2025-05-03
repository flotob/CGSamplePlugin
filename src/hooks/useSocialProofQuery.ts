'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Type matching the API response user structure
export interface SocialProofUser {
  user_id: string;
  username: string | null;
  profile_picture_url: string | null;
}

// Type matching the overall API response
// Export the response type as well
export interface SocialProofResponse {
  users: SocialProofUser[];
  totalRelevantUsers: number;
}

/**
 * Hook to fetch social proof data (list of users) for a specific wizard step.
 *
 * @param wizardId The ID of the wizard.
 * @param stepId The ID of the current step being viewed.
 * @returns React Query result object containing the list of users.
 */
export function useWizardStepSocialProofQuery(
  wizardId: string | null | undefined,
  stepId: string | null | undefined
): UseQueryResult<SocialProofResponse, Error> {
  const { authFetch } = useAuthFetch();

  return useQuery<SocialProofResponse, Error>({
    // Query key includes wizardId and stepId to refetch when they change
    queryKey: ['socialProof', wizardId, stepId], 
    queryFn: async () => {
      if (!wizardId || !stepId) {
        throw new Error('Wizard ID and Step ID are required to fetch social proof.');
      }
      // Call the GET endpoint
      return authFetch<SocialProofResponse>(`/api/wizards/${wizardId}/steps/${stepId}/social-proof`);
    },
    // Only enable the query if both wizardId and stepId are provided
    enabled: !!wizardId && !!stepId,
    // Keep stale time relatively short? Users might progress frequently.
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true, // Refetch if user tabs away and back
  });
} 