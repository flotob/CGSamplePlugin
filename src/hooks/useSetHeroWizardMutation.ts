'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import type { Wizard } from './useWizardsQuery'; // Assuming Wizard type includes is_hero now

/**
 * React Query mutation hook to set a specific wizard as the hero wizard.
 */
export const useSetHeroWizardMutation = () => {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    { wizard: Wizard }, // Type of data returned on success (the updated hero wizard)
    Error,              // Type of error
    { wizardId: string }, // Type of variables passed to mutationFn
    unknown             // Type of context (optional)
  >(
    {
      mutationFn: async ({ wizardId }) => {
        if (!wizardId) {
          throw new Error('Wizard ID is required to set as hero.');
        }
        // Use PATCH request to the specific set-hero endpoint
        const response = await authFetch<{ wizard: Wizard }>(
          `/api/wizards/${wizardId}/set-hero`,
          {
            method: 'PATCH',
            // No body needed, the wizard ID is in the URL
          }
        );
        return response;
      },
      onSuccess: (data) => {
        // Invalidate the wizards query to refetch the list with updated hero status
        queryClient.invalidateQueries({ queryKey: ['wizards'] });
        toast({ title: `Wizard "${data.wizard.name}" set as hero!` });
      },
      onError: (error) => {
        console.error("Error setting hero wizard:", error);
        toast({
          title: "Error Setting Hero",
          description: error.message || "An unknown error occurred.",
          variant: "destructive",
        });
      },
    }
  );
}; 