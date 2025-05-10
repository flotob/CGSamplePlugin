import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import type { AttachedSidequest } from '@/types/sidequests';

export const stepAttachedSidequestQueryKeys = {
  all: (stepId: string) => ['admin', 'stepAttachedSidequests', stepId] as const,
  // Potentially add more specific keys if needed, e.g., for a single sidequest by id
};

interface FetchStepAttachedSidequestsParams {
  stepId: string;
}

/**
 * Fetches all sidequests ATTACHED to a given step for admin purposes.
 */
export function useGetStepAttachedSidequests(
  stepId: string | undefined,
  options?: {
    enabled?: boolean;
  }
): UseQueryResult<AttachedSidequest[], Error> {
  const { authFetch } = useAuthFetch();

  const fetchStepAttachedSidequests = async ({ stepId: currentStepId }: FetchStepAttachedSidequestsParams): Promise<AttachedSidequest[]> => {
    if (!currentStepId) {
      // This case should ideally be handled by the `enabled` option, but as a safeguard:
      return Promise.resolve([]); // Or throw new Error('stepId is required');
    }
    // API endpoint to list sidequests attached to a step
    return await authFetch<AttachedSidequest[]>(`/api/admin/steps/${currentStepId}/sidequests`);
  };

  return useQuery<AttachedSidequest[], Error, AttachedSidequest[], readonly ['admin', 'stepAttachedSidequests', string]>({
    queryKey: stepAttachedSidequestQueryKeys.all(stepId || ''), // Ensure queryKey is always defined
    queryFn: () => fetchStepAttachedSidequests({ stepId: stepId! }), // Use non-null assertion as enabled handles undefined stepId
    enabled: !!stepId && (options?.enabled !== undefined ? options.enabled : true),
    // staleTime: 1000 * 60 * 5, // Optional: 5 minutes
    // ...other options as needed based on project patterns
  });
} 