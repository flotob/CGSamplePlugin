'use client';

import { useQuery, UseQueryResult, useMutation, UseMutationResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';

// Define the expected API response structure for steps query
interface UserWizardStepsResponse {
  steps: UserStepProgress[];
  assignRolesPerStep: boolean;
}

// Define the expected API response structure for session query
interface UserWizardSessionResponse {
  last_viewed_step_id: string | null;
}

// Define the expected payload structure for session update
interface UpdateSessionPayload {
  stepId: string;
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

// --- New Hook: Fetch User Wizard Session State ---
export function useUserWizardSessionQuery(wizardId: string | null | undefined): UseQueryResult<UserWizardSessionResponse, Error> {
  const { authFetch } = useAuthFetch();

  return useQuery<UserWizardSessionResponse, Error>({
    queryKey: ['userWizardSession', wizardId], 
    queryFn: async () => {
      if (!wizardId) {
        throw new Error('Wizard ID is required to fetch session state.');
      }
      // Call the new GET endpoint
      return authFetch<UserWizardSessionResponse>(`/api/user/wizards/${wizardId}/session`);
    },
    enabled: !!wizardId, // Only run if wizardId is available
    staleTime: 1000 * 60, // Example: 1 minute stale time, adjust as needed
    refetchOnWindowFocus: false, // Session state might not need frequent refetching on focus
  });
}

// --- New Hook: Update User Wizard Session State ---
export function useUpdateUserWizardSessionMutation(wizardId: string | null | undefined): UseMutationResult<{ message: string }, Error, UpdateSessionPayload> {
  const { authFetch } = useAuthFetch();
  // No queryClient needed here unless we want to manually update the session query cache

  return useMutation<
    { message: string }, // Expected success response
    Error, // Error type
    UpdateSessionPayload // Variables type
  >({
    mutationFn: async (data: UpdateSessionPayload) => {
      if (!wizardId) throw new Error('Missing wizardId');
      if (!data.stepId) throw new Error('Missing stepId');
      // Call the new PUT endpoint
      return await authFetch<{ message: string }>(`/api/user/wizards/${wizardId}/session`, {
        method: 'PUT',
        body: JSON.stringify(data), // Send { stepId: "..." }
      });
    },
    // onSuccess/onError can be added here or handled at the call site
    // No automatic query invalidation needed for this specific mutation
  });
} 