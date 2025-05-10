import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import type { AttachedSidequest, AttachSidequestToStepPayload, AttachSidequestResponse, ReorderAttachedSidequestsPayload } from '@/types/sidequests'; 
import { stepAttachedSidequestQueryKeys } from './useStepAttachedSidequestQueries'; 

// --- Attach Sidequest to Step ---
// (Formerly useCreateSidequestMutation)
export interface UseAttachSidequestToStepMutationProps {
  stepId: string;
}

export function useAttachSidequestToStepMutation(
  { stepId }: UseAttachSidequestToStepMutationProps
): UseMutationResult<AttachSidequestResponse, Error, AttachSidequestToStepPayload> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<AttachSidequestResponse, Error, AttachSidequestToStepPayload>({
    mutationFn: async (payload: AttachSidequestToStepPayload) => {
      if (!stepId) {
        throw new Error('Step ID is required to attach a sidequest.');
      }
      // API endpoint to attach an existing global sidequest to a step
      return await authFetch<AttachSidequestResponse>(`/api/admin/steps/${stepId}/sidequests`, {
        method: 'POST',
        body: JSON.stringify(payload), // Payload: { sidequest_id: string, display_order?: number }
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stepAttachedSidequestQueryKeys.all(stepId) });
    },
    onError: (error) => {
      console.error('Error attaching sidequest to step:', error);
    },
  });
}

// UpdateSidequestMutation is removed as global sidequests are updated via library APIs.

// --- Detach Sidequest from Step ---
// (Formerly useDeleteSidequestMutation)
interface DetachResponseSimple { // API returns { message, id (attachmentId) }
    message: string;
    id: string; 
}

export function useDetachSidequestFromStepMutation(
  // Props (stepId, attachmentId) are passed directly to mutate function for flexibility
): UseMutationResult<DetachResponseSimple, Error, { stepId: string; attachmentId: string; }> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<DetachResponseSimple, Error, { stepId: string; attachmentId: string; }>({
    mutationFn: async ({ stepId, attachmentId }) => { 
      if (!stepId || !attachmentId) {
        throw new Error('Step ID and Attachment ID are required to detach a sidequest.');
      }
      // API endpoint to detach a sidequest using its attachment_id (PK of junction table)
      return await authFetch<DetachResponseSimple>(`/api/admin/steps/${stepId}/sidequests/${attachmentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: stepAttachedSidequestQueryKeys.all(variables.stepId) });
    },
    onError: (error) => {
      console.error('Error detaching sidequest from step:', error);
    },
  });
}

// --- Reorder Attached Sidequests ---
// (Formerly useReorderSidequestsMutation)
interface ReorderAttachedSidequestsResponse {
    message: string;
    sidequests: AttachedSidequest[]; // API returns the reordered list of AttachedSidequest
}

export function useReorderStepSidequestsMutation(
  { stepId }: UseAttachSidequestToStepMutationProps // Reusing props type as it only needs stepId
): UseMutationResult<ReorderAttachedSidequestsResponse, Error, ReorderAttachedSidequestsPayload> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<ReorderAttachedSidequestsResponse, Error, ReorderAttachedSidequestsPayload>({
    mutationFn: async (payload: ReorderAttachedSidequestsPayload) => {
      if (!stepId) {
        throw new Error('Step ID is required to reorder attached sidequests.');
      }
      if (payload.length === 0) {
        throw new Error('At least one item must be provided for reordering.');
      }
      // API endpoint to reorder sidequests attached to a step
      return await authFetch<ReorderAttachedSidequestsResponse>(`/api/admin/steps/${stepId}/sidequests/reorder`, {
        method: 'POST',
        body: JSON.stringify(payload), // Payload: Array<{ attachment_id: string, display_order: number }>
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(stepAttachedSidequestQueryKeys.all(stepId), data.sidequests);
    },
    onError: (error) => {
      console.error('Error reordering attached sidequests:', error);
    },
  });
}

// --- Reorder Sidequests (Placeholder for now, will add next) ---
// export interface ReorderSidequestsPayloadItem { sidequestId: string; display_order: number; }
// export function useReorderSidequestsMutation(...) { ... } 