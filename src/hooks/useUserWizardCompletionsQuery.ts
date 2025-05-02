'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Mirror the type from the API route
interface UserWizardCompletionsResponse {
  completed_wizard_ids: string[];
}

/**
 * Hook to fetch the list of wizard IDs completed by the current user.
 *
 * @returns React Query result object containing the list of completed wizard IDs.
 */
export function useUserWizardCompletionsQuery(): UseQueryResult<UserWizardCompletionsResponse, Error> {
  const { authFetch } = useAuthFetch();

  return useQuery<UserWizardCompletionsResponse, Error>({
    queryKey: ['userWizardCompletions'], 
    queryFn: async () => {
      // Use authFetch to make the authenticated GET request
      return authFetch<UserWizardCompletionsResponse>('/api/user/wizard-completions');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, 
  });
} 