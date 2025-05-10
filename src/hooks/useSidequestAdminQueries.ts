import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import type { Sidequest } from '@/types/sidequests';

export const sidequestAdminQueryKeys = {
  all: (stepId: string) => ['admin', 'sidequests', stepId] as const,
  // Potentially add more specific keys if needed, e.g., for a single sidequest by id
};

interface FetchStepSidequestsParams {
  stepId: string;
}

/**
 * Fetches all sidequests for a given step for admin purposes.
 */
export function useGetStepSidequests(
  stepId: string | undefined,
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<Sidequest[], Error> {
  const { authFetch } = useAuthFetch();

  const fetchStepSidequests = async ({ stepId: currentStepId }: FetchStepSidequestsParams): Promise<Sidequest[]> => {
    if (!currentStepId) {
      // This case should ideally be handled by the `enabled` option, but as a safeguard:
      return Promise.resolve([]); // Or throw new Error('stepId is required');
    }
    // The API endpoint is /api/admin/steps/{stepId}/sidequests
    return await authFetch<Sidequest[]>(`/api/admin/steps/${currentStepId}/sidequests`);
  };

  return useQuery<Sidequest[], Error, Sidequest[], readonly ['admin', 'sidequests', string]>({
    queryKey: sidequestAdminQueryKeys.all(stepId || ''), // Ensure queryKey is always defined
    queryFn: () => fetchStepSidequests({ stepId: stepId! }), // Use non-null assertion as enabled handles undefined stepId
    enabled: !!stepId && (options?.enabled !== undefined ? options.enabled : true),
    // staleTime: 1000 * 60 * 5, // Optional: 5 minutes
    // ...other options as needed based on project patterns
  });
} 