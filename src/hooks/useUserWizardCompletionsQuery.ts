'use client';

import { useQuery, UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useAuth } from '@/context/AuthContext';

// Mirror the type from the API route
interface UserWizardCompletionsResponse {
  completed_wizard_ids: string[];
}

/**
 * Hook to fetch the list of wizard IDs completed by the current user.
 *
 * @returns React Query result object containing the list of completed wizard IDs.
 */
export function useUserWizardCompletionsQuery(options?: Omit<UseQueryOptions<UserWizardCompletionsResponse, Error>, 'queryKey' | 'queryFn'>): UseQueryResult<UserWizardCompletionsResponse, Error> {
  const { authFetch } = useAuthFetch();
  const { jwt } = useAuth();

  // Merge passed options with default queryKey and queryFn
  return useQuery<UserWizardCompletionsResponse, Error>({
    queryKey: ['userWizardCompletions'], 
    queryFn: async () => {
      // Safeguard: Throw error if JWT is missing when function executes
      if (!jwt) {
        console.warn('useUserWizardCompletionsQuery: Query function running but JWT is missing. Throwing error.');
        throw new Error('Attempted fetch without JWT'); 
      }
      // Use authFetch to make the authenticated GET request
      return authFetch<UserWizardCompletionsResponse>('/api/user/wizard-completions');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    // enabled: true, // Let caller override if needed
    ...options, // Spread additional options
  });
} 