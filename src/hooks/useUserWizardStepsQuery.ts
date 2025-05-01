'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';

// Define the expected API response structure
interface UserWizardStepsResponse {
  steps: UserStepProgress[];
}

/**
 * Hook to fetch the ordered steps and user progress for a specific wizard.
 *
 * @param wizardId The ID of the wizard whose steps are to be fetched.
 * @returns React Query result object containing the wizard steps with progress.
 */
export function useUserWizardStepsQuery(wizardId: string | null | undefined): UseQueryResult<UserWizardStepsResponse, Error> {
  const { authFetch } = useAuthFetch();

  return useQuery<UserWizardStepsResponse, Error>({
    queryKey: ['userWizardSteps', wizardId],
    queryFn: async () => {
      if (!wizardId) {
        throw new Error('Wizard ID is required to fetch steps.');
      }
      // Use authFetch to make the authenticated GET request
      return authFetch<UserWizardStepsResponse>(`/api/user/wizards/${wizardId}/steps`);
    },
    // Only enable the query if wizardId is provided
    enabled: !!wizardId,
    // Optional: Configure staleTime, cacheTime, etc. as needed
    // staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 