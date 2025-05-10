import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import type { Sidequest, CreateGlobalSidequestPayload, UpdateGlobalSidequestPayload } from '@/types/sidequests';

// Query Keys for Global Sidequest Library
export const sidequestLibraryQueryKeys = {
  all: (communityId: string | undefined, scope: string) => ['admin', 'sidequestLibrary', communityId, scope] as const,
  // Potentially add detail keys if needed: detail: (sidequestId: string) => ['admin', 'sidequestLibrary', 'detail', sidequestId] as const,
};

// --- Query Hook for fetching global sidequests --- 
type LibraryScope = 'mine' | 'community' | 'all_in_community';

interface UseGetSidequestLibraryProps {
  scope: LibraryScope;
  communityId: string | undefined; // From user context, needed for query key and if API requires it explicitly
  options?: {
    enabled?: boolean;
  };
}

export function useGetSidequestLibrary(
  { communityId, scope, options }: UseGetSidequestLibraryProps
): UseQueryResult<Sidequest[], Error> {
  const { authFetch } = useAuthFetch();

  const fetchGlobalSidequests = async (): Promise<Sidequest[]> => {
    // The API GET /api/admin/library/sidequests uses communityId from JWT, but scope is a query param.
    return await authFetch<Sidequest[]>(`/api/admin/library/sidequests?scope=${scope}`);
  };

  return useQuery<Sidequest[], Error, Sidequest[], readonly ['admin', 'sidequestLibrary', string | undefined, string]>({
    queryKey: sidequestLibraryQueryKeys.all(communityId, scope),
    queryFn: fetchGlobalSidequests,
    enabled: !!communityId && (options?.enabled !== undefined ? options.enabled : true),
  });
}

// --- Mutation Hook for creating a global sidequest ---
export function useCreateGlobalSidequestMutation(
  // communityId will be derived from the JWT on the backend
  // No specific props needed for the hook itself, communityId needed for query invalidation scope though.
): UseMutationResult<Sidequest, Error, CreateGlobalSidequestPayload> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<Sidequest, Error, CreateGlobalSidequestPayload>({
    mutationFn: async (payload: CreateGlobalSidequestPayload) => {
      return await authFetch<Sidequest>(`/api/admin/library/sidequests`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (newSidequest) => {
      // Invalidate all relevant library scopes for the community this sidequest belongs to.
      // newSidequest.community_id is reliable here.
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(newSidequest.community_id, 'mine') });
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(newSidequest.community_id, 'all_in_community') });
      if (newSidequest.is_public) {
        queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(newSidequest.community_id, 'community') });
      }
    },
    onError: (error) => {
      console.error('Error creating global sidequest:', error);
    },
  });
}

// --- Mutation Hook for updating a global sidequest ---
export function useUpdateGlobalSidequestMutation(): UseMutationResult<Sidequest, Error, { sidequestId: string; payload: UpdateGlobalSidequestPayload }> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<Sidequest, Error, { sidequestId: string; payload: UpdateGlobalSidequestPayload }>({
    mutationFn: async ({ sidequestId, payload }) => {
      if (!sidequestId) {
        throw new Error('Sidequest ID is required for update.');
      }
      if (Object.keys(payload).length === 0) {
        throw new Error('At least one field must be provided for update.');
      }
      return await authFetch<Sidequest>(`/api/admin/library/sidequests/${sidequestId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (updatedSidequest) => {
      // Invalidate all scopes for this community as public status or content might change which lists it appears in.
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(updatedSidequest.community_id, 'mine') });
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(updatedSidequest.community_id, 'all_in_community') });
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(updatedSidequest.community_id, 'community') });
      
      // Also, if this sidequest is attached to any steps, those views might need an update if they cache sidequest details.
      // This is more complex as it requires knowing which steps it's attached to.
      // For now, focusing on library view invalidation.
      // A more robust solution might involve normalized caching if granular updates of attached items are needed.
    },
    onError: (error) => {
      console.error('Error updating global sidequest:', error);
    },
  });
}

// --- Mutation Hook for deleting a global sidequest ---
interface DeleteGlobalSidequestResponse {
    message: string;
    id: string; // ID of the deleted sidequest
}
export function useDeleteGlobalSidequestMutation(): UseMutationResult<DeleteGlobalSidequestResponse, Error, { sidequestId: string, communityIdIfKnown?: string }> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<DeleteGlobalSidequestResponse, Error, { sidequestId: string, communityIdIfKnown?: string }>({
    mutationFn: async ({ sidequestId }) => {
      if (!sidequestId) {
        throw new Error('Sidequest ID is required for deletion.');
      }
      return await authFetch<DeleteGlobalSidequestResponse>(`/api/admin/library/sidequests/${sidequestId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (response, variables) => {
      // We need communityId to invalidate correctly. If not passed, we might have to invalidate more broadly or skip.
      // The API for delete doesn't return community_id, so it must be passed or inferred if possible.
      // For a robust invalidation, it's best if the calling component knows the communityId.
      // Assuming variables.communityIdIfKnown is passed from the component using the hook.
      if (variables.communityIdIfKnown) {
        queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(variables.communityIdIfKnown, 'mine') });
        queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(variables.communityIdIfKnown, 'all_in_community') });
        queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(variables.communityIdIfKnown, 'community') });
      } else {
        // Fallback: Invalidate all admin sidequest library queries if communityId isn't known at this point.
        // This is less targeted but ensures eventual consistency.
        queryClient.invalidateQueries({ queryKey: ['admin', 'sidequestLibrary'] });
      }
      // Important: Deleting a global sidequest also means it's detached from all steps.
      // Invalidate queries for attached sidequests for ALL steps. This is broad.
      // A more targeted approach would require backend to return affected stepIds or a different eventing system.
      queryClient.invalidateQueries({ queryKey: ['admin', 'stepAttachedSidequests'] });
    },
    onError: (error) => {
      console.error('Error deleting global sidequest:', error);
    },
  });
}

// --- Mutation Hook for toggling public status of a global sidequest ---
export function useToggleSidequestPublicMutation(): UseMutationResult<Sidequest, Error, { sidequestId: string; is_public: boolean }> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<Sidequest, Error, { sidequestId: string; is_public: boolean }>({
    mutationFn: async ({ sidequestId, is_public }) => {
      if (!sidequestId) {
        throw new Error('Sidequest ID is required to toggle public status.');
      }
      return await authFetch<Sidequest>(`/api/admin/library/sidequests/${sidequestId}/toggle-public`, { // Assuming route.ts for [sidequestId] also handles /toggle-public path if structured that way, or this needs to be a separate endpoint file.
        method: 'PATCH',
        body: JSON.stringify({ is_public }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (updatedSidequest) => {
      // Invalidate all library views for this community as public status change affects all scopes.
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(updatedSidequest.community_id, 'mine') });
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(updatedSidequest.community_id, 'all_in_community') });
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(updatedSidequest.community_id, 'community') });

      // If the sidequest is attached, this change doesn't alter its attachment or content, 
      // but if a view of attached sidequests also shows its public status, that might need updating.
      // For now, library invalidation is the primary concern.
    },
    onError: (error) => {
      console.error('Error toggling sidequest public status:', error);
    },
  });
} 