'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to mark a wizard as completed.
 * This will add an entry to the user_wizard_completions table.
 */
export function useMarkWizardCompleted() {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (wizardId: string) => {
      await authFetch(`/api/user/wizards/${wizardId}/complete`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['userWizards'] });
    },
    onError: (error) => {
      console.error('Failed to mark wizard as completed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update wizard completion status',
        variant: 'destructive',
      });
    },
  });
} 