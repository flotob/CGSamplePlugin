'use client';

import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';

// Define the type for the variables the mutation function will receive
interface CompleteStepVariables {
  verified_data?: Record<string, unknown>;
}

/**
 * Hook to mark a wizard step as complete for the current user.
 *
 * @param wizardId The ID of the wizard containing the step.
 * @param stepId The ID of the step to mark as complete.
 * @returns React Query mutation result object.
 */
export function useCompleteStepMutation(
  wizardId: string | null | undefined,
  stepId: string | null | undefined
): UseMutationResult<void, Error, CompleteStepVariables | undefined, unknown> { // Returns void on success (204)
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, CompleteStepVariables | undefined> ({
    mutationFn: async (variables) => {
      if (!wizardId || !stepId) {
        throw new Error('Wizard ID and Step ID are required to complete step.');
      }
      
      // Use authFetch to make the authenticated POST request
      // The API expects status 204 No Content on success, so response body is typically null/void
      await authFetch<void>(`/api/user/wizards/${wizardId}/steps/${stepId}/complete`, {
        method: 'POST',
        body: variables ? JSON.stringify(variables) : undefined, // Only send body if variables exist
        headers: variables ? { 'Content-Type': 'application/json' } : undefined, // Set content type only if body exists
      });
      // Return void explicitly if needed, though await on a void fetch usually resolves to undefined
      return;
    },
    onSuccess: () => {
      // Invalidate queries related to user progress for this wizard upon successful completion
      queryClient.invalidateQueries({ queryKey: ['userWizardSteps', wizardId] });
      // Potentially invalidate the user wizard list as well if progressStatus changes
      queryClient.invalidateQueries({ queryKey: ['userWizards'] });
      
      // Optional: Show success toast
      // toast({ title: "Step Completed!" });
    },
    onError: (error) => {
      // Handle error, e.g., show error toast
      console.error("Error completing step:", error);
      toast({ 
        title: "Error Completing Step", 
        description: error.message || 'An unexpected error occurred.',
        variant: "destructive" 
      });
    },
  });
} 