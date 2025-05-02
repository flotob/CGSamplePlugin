'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Mirror the types from the API route
interface RelevantStepInfo {
  wizard_id: string;
  target_role_id: string;
}

interface RelevantStepsResponse {
  steps: RelevantStepInfo[];
}

/**
 * Hook to fetch relevant steps (wizard_id, target_role_id) from active wizards in the community.
 *
 * @returns React Query result object containing the relevant steps list.
 */
export function useRelevantStepsQuery(): UseQueryResult<RelevantStepsResponse, Error> {
  const { authFetch } = useAuthFetch();

  return useQuery<RelevantStepsResponse, Error>({
    queryKey: ['relevantSteps'], 
    queryFn: async () => {
      // Use authFetch to make the authenticated GET request
      return authFetch<RelevantStepsResponse>('/api/user/steps');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, 
  });
} 