'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import type { Wizard } from './useWizardsQuery'; // Assuming Wizard type includes is_hero now

// Update variables type
interface SetHeroVariables {
    wizardId: string;
    targetState: boolean; // Add target state
}

/**
 * React Query mutation hook to set or unset a wizard as the hero wizard.
 */
export const useSetHeroWizardMutation = () => {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    { wizard: Wizard, message?: string }, // Update success type slightly
    Error,              
    SetHeroVariables,   // Use updated variables type
    unknown             
  >(
    {
      // Update mutationFn to accept targetState
      mutationFn: async ({ wizardId, targetState }: SetHeroVariables) => {
        if (!wizardId) {
          throw new Error('Wizard ID is required to update hero status.');
        }
        const response = await authFetch<{ wizard: Wizard, message?: string }>(
          `/api/wizards/${wizardId}/set-hero`,
          {
            method: 'PATCH',
            // Send the target state in the body
            body: JSON.stringify({ is_hero: targetState }), 
            headers: { 'Content-Type': 'application/json' },
          }
        );
        return response;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['wizards'] });
        // Use message from API if available, otherwise generic
        toast({ title: data.message || 'Hero status updated successfully!' });
      },
      onError: (error) => {
        console.error("Error updating hero wizard status:", error);
        toast({
          title: "Error Updating Hero Status",
          description: error.message || "An unknown error occurred.",
          variant: "destructive",
        });
      },
    }
  );
}; 