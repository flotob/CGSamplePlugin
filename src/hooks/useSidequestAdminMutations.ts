import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import type { Sidequest } from '@/types/sidequests';
import { sidequestAdminQueryKeys } from './useSidequestAdminQueries'; // For invalidation

// --- Create Sidequest ---
export interface CreateSidequestPayload {
  // Matches the Zod schema in the POST API route, excluding onboarding_step_id which comes from URL
  title: string;
  description?: string | null;
  image_url?: string | null;
  sidequest_type: 'youtube' | 'link' | 'markdown';
  content_payload: string;
  display_order?: number;
}

interface UseCreateSidequestMutationProps {
  stepId: string;
}

export function useCreateSidequestMutation(
  { stepId }: UseCreateSidequestMutationProps
): UseMutationResult<Sidequest, Error, CreateSidequestPayload> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<Sidequest, Error, CreateSidequestPayload>({
    mutationFn: async (payload: CreateSidequestPayload) => {
      if (!stepId) {
        throw new Error('Step ID is required to create a sidequest.');
      }
      return await authFetch<Sidequest>(`/api/admin/steps/${stepId}/sidequests`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      // Invalidate the list of sidequests for this step to refetch updated data
      queryClient.invalidateQueries({ queryKey: sidequestAdminQueryKeys.all(stepId) });
    },
    onError: (error) => {
      console.error('Error creating sidequest:', error);
      // Optionally, add toast notifications or more specific error handling here
    },
  });
}

// --- Update Sidequest ---
export interface UpdateSidequestPayload {
  // All fields are optional for an update, matching the PUT API route's Zod schema
  title?: string;
  description?: string | null;
  image_url?: string | null;
  sidequest_type?: 'youtube' | 'link' | 'markdown';
  content_payload?: string;
  display_order?: number;
}

interface UseUpdateSidequestMutationProps {
  stepId: string;
  sidequestId: string;
}

export function useUpdateSidequestMutation(
  { stepId, sidequestId }: UseUpdateSidequestMutationProps
): UseMutationResult<Sidequest, Error, UpdateSidequestPayload> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<Sidequest, Error, UpdateSidequestPayload>({
    mutationFn: async (payload: UpdateSidequestPayload) => {
      if (!stepId || !sidequestId) {
        throw new Error('Step ID and Sidequest ID are required to update a sidequest.');
      }
      if (Object.keys(payload).length === 0) {
        // Though zod on backend catches this, good to prevent empty API call
        throw new Error('At least one field must be provided for update.');
      }
      return await authFetch<Sidequest>(`/api/admin/steps/${stepId}/sidequests/${sidequestId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (updatedSidequest) => {
      // Invalidate the list of sidequests for this step
      queryClient.invalidateQueries({ queryKey: sidequestAdminQueryKeys.all(stepId) });
      
      // Optionally, update the specific sidequest in the cache if your query structure supports it
      // This provides an optimistic-like update to the UI if the query for individual sidequests exists
      // queryClient.setQueryData(sidequestAdminQueryKeys.detail(stepId, updatedSidequest.id), updatedSidequest);
    },
    onError: (error) => {
      console.error('Error updating sidequest:', error);
    },
  });
}

// --- Delete Sidequest ---
interface UseDeleteSidequestMutationProps {
  stepId: string; // Needed for query invalidation
  sidequestId: string;
}

interface DeleteSidequestResponse {
    message: string;
    id: string; // ID of the deleted sidequest
}

export function useDeleteSidequestMutation(
  // Props are destructured directly in parameters for conciseness
): UseMutationResult<DeleteSidequestResponse, Error, { stepId: string; sidequestId: string; }> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<DeleteSidequestResponse, Error, { stepId: string; sidequestId: string; }>({
    mutationFn: async ({ stepId, sidequestId }) => { // stepId now passed in variables for onSuccess
      if (!stepId || !sidequestId) {
        throw new Error('Step ID and Sidequest ID are required to delete a sidequest.');
      }
      return await authFetch<DeleteSidequestResponse>(`/api/admin/steps/${stepId}/sidequests/${sidequestId}`, {
        method: 'DELETE',
      });
    },
    // Use onMutate or onSuccess to get stepId if not passed directly in variables for mutationFn
    // However, it's cleaner to have it in variables if needed for onSuccess invalidation scope.
    onSuccess: (data, variables) => {
      // Invalidate the list of sidequests for the specific step
      queryClient.invalidateQueries({ queryKey: sidequestAdminQueryKeys.all(variables.stepId) });
    },
    onError: (error) => {
      console.error('Error deleting sidequest:', error);
    },
  });
}

// --- Reorder Sidequests ---
export interface ReorderSidequestsPayloadItem {
  sidequestId: string;
  display_order: number;
}

export interface ReorderSidequestsPayload extends Array<ReorderSidequestsPayloadItem> {}

interface UseReorderSidequestsMutationProps {
  stepId: string;
}

interface ReorderSidequestsResponse {
    message: string;
    sidequests: Sidequest[]; // The API returns the reordered list
}

export function useReorderSidequestsMutation(
  { stepId }: UseReorderSidequestsMutationProps
): UseMutationResult<ReorderSidequestsResponse, Error, ReorderSidequestsPayload> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<ReorderSidequestsResponse, Error, ReorderSidequestsPayload>({
    mutationFn: async (payload: ReorderSidequestsPayload) => {
      if (!stepId) {
        throw new Error('Step ID is required to reorder sidequests.');
      }
      if (payload.length === 0) {
        // Although API zod schema also catches this
        throw new Error('At least one item must be provided for reordering.');
      }
      return await authFetch<ReorderSidequestsResponse>(`/api/admin/steps/${stepId}/sidequests/reorder`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data) => {
      // The API returns the full reordered list of sidequests.
      // We can use this to update the cache directly for a smoother experience.
      queryClient.setQueryData(sidequestAdminQueryKeys.all(stepId), data.sidequests);
      // Optionally, still invalidate if there are other dependent queries or for absolute freshness guarantee
      // queryClient.invalidateQueries({ queryKey: sidequestAdminQueryKeys.all(stepId) });
    },
    onError: (error) => {
      console.error('Error reordering sidequests:', error);
    },
  });
}

// --- Reorder Sidequests (Placeholder for now, will add next) ---
// export interface ReorderSidequestsPayloadItem { sidequestId: string; display_order: number; }
// export function useReorderSidequestsMutation(...) { ... } 