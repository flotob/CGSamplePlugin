import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

export interface Step {
  id: string;
  wizard_id: string;
  step_type_id: string;
  step_order: number;
  config: Record<string, unknown>;
  target_role_id: string;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all steps for a wizard
export function useStepsQuery(wizardId: string | undefined) {
  const { authFetch } = useAuthFetch();
  return useQuery<{ steps: Step[] }, Error>({
    queryKey: ['steps', wizardId],
    queryFn: async () => {
      if (!wizardId) throw new Error('No wizardId');
      return await authFetch<{ steps: Step[] }>(`/api/wizards/${wizardId}/steps`);
    },
    enabled: !!wizardId,
  });
}

// Create a new step
export function useCreateStep(wizardId: string | undefined) {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Step, 'id' | 'wizard_id' | 'step_order' | 'created_at' | 'updated_at'>) => {
      if (!wizardId) throw new Error('No wizardId');
      return await authFetch<{ step: Step }>(`/api/wizards/${wizardId}/steps`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steps', wizardId] });
    },
  });
}

// Update a step
export function useUpdateStep(wizardId: string | undefined, stepId: string | undefined) {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Step>) => {
      if (!wizardId || !stepId) throw new Error('Missing wizardId or stepId');
      return await authFetch<{ step: Step }>(`/api/wizards/${wizardId}/steps/${stepId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steps', wizardId] });
    },
  });
}

// Delete a step
export function useDeleteStep(wizardId: string | undefined, stepId: string | undefined) {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!wizardId || !stepId) throw new Error('Missing wizardId or stepId');
      return await authFetch<{ step: Step }>(`/api/wizards/${wizardId}/steps/${stepId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steps', wizardId] });
    },
  });
} 