import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import type { Wizard } from './useWizardsQuery'; // Assuming Wizard type is exported here

// Hook to Publish/Unpublish a wizard (updates is_active)
export function usePublishWizard() {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<
    { wizard: Wizard }, // Expected success response type
    Error, // Error type
    { wizardId: string; is_active: boolean } // Variables type
  >({
    mutationFn: async ({ wizardId, is_active }) => {
      if (!wizardId) {
        throw new Error('Wizard ID is required to publish/unpublish.');
      }
      
      return await authFetch<{ wizard: Wizard }>(`/api/wizards/${wizardId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }), // Send only is_active for patching
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      // Refetch the wizards list after successful publish/unpublish
      queryClient.invalidateQueries({ queryKey: ['wizards'] });
    },
    onError: (error) => {
      // Basic error logging, could add toast notifications here
      console.error('Error publishing/unpublishing wizard:', error);
    },
  });
}

// Hook to Duplicate a wizard
export function useDuplicateWizard() {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<
    { wizard: Wizard }, // Expected success response type
    Error, // Error type
    { wizardId: string } // Variables type (only need original ID)
  >({
    mutationFn: async ({ wizardId }) => {
      if (!wizardId) {
        throw new Error('Wizard ID is required to duplicate.');
      }
      
      // Call the new duplicate endpoint
      return await authFetch<{ wizard: Wizard }>(`/api/wizards/${wizardId}/duplicate`, {
        method: 'POST',
        // No body needed for this request
      });
    },
    onSuccess: () => {
      // Refetch the wizards list after successful duplication
      queryClient.invalidateQueries({ queryKey: ['wizards'] });
    },
    onError: (error) => {
      // Basic error logging, could add toast notifications here
      console.error('Error duplicating wizard:', error);
    },
  });
}

// Hook to Delete a wizard
export function useDeleteWizard() {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<
    { wizard: Wizard }, // Expected success response type (DELETE might return the deleted object)
    Error, // Error type
    { wizardId: string } // Variables type (only need ID to delete)
  >({
    mutationFn: async ({ wizardId }) => {
      if (!wizardId) {
        throw new Error('Wizard ID is required to delete.');
      }
      
      // Call the DELETE endpoint
      return await authFetch<{ wizard: Wizard }>(`/api/wizards/${wizardId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Refetch the wizards list after successful deletion
      queryClient.invalidateQueries({ queryKey: ['wizards'] });
    },
    onError: (error) => {
      // Basic error logging, could add toast notifications here
      console.error('Error deleting wizard:', error);
    },
  });
}

// Hook to update basic wizard details (name, description)
export function useUpdateWizardDetails() {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();

  return useMutation<
    { wizard: Wizard }, // Expected success response type
    Error, // Error type
    { wizardId: string; name?: string; description?: string | null; assign_roles_per_step?: boolean; required_role_id?: string | null; } // Variables type
  >({
    mutationFn: async ({ wizardId, ...updateData }) => {
      if (!wizardId) {
        throw new Error('Wizard ID is required to update details.');
      }
      // Ensure we don't send undefined values if only one field is updated
      const payload: { 
        name?: string; 
        description?: string | null; 
        assign_roles_per_step?: boolean;
        required_role_id?: string | null;
      } = {};
      if (updateData.name !== undefined) payload.name = updateData.name;
      if (updateData.description !== undefined) payload.description = updateData.description;
      if (updateData.assign_roles_per_step !== undefined) payload.assign_roles_per_step = updateData.assign_roles_per_step;
      if (updateData.required_role_id !== undefined) payload.required_role_id = updateData.required_role_id;

      if (Object.keys(payload).length === 0) {
         throw new Error('No details provided for update.');
      }

      return await authFetch<{ wizard: Wizard }>(`/api/wizards/${wizardId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      // Update specific wizard query data if possible?
      // Or just invalidate the list
      queryClient.invalidateQueries({ queryKey: ['wizards'] });
      // Potentially update the specific wizard cache entry if needed
      // queryClient.setQueryData(['wizard', data.wizard.id], data);
    },
    onError: (error) => {
      console.error('Error updating wizard details:', error);
    },
  });
} 