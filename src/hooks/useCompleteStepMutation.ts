'use client';

import { useMutation, UseMutationResult, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useAssignRoleAndRefresh } from './useAssignRoleAndRefresh';
import { useAuth } from '@/context/AuthContext';

// Define the type for the variables the mutation function will receive
interface CompleteStepVariables {
  verified_data?: Record<string, unknown>;
}

// Define the NEW expected response structure from the API
export interface StepCompletionResponse {
  success: boolean;
  shouldAssignRole: boolean;
  roleIdToAssign: string | null;
}

/**
 * Hook to mark a wizard step as complete for the current user.
 *
 * @param wizardId The ID of the wizard containing the step.
 * @param stepId The ID of the step to mark as complete.
 * @param options Optional TanStack Query mutation options.
 * @returns React Query mutation result object.
 */
export function useCompleteStepMutation(
  wizardId: string | null | undefined,
  stepId: string | null | undefined,
  options?: UseMutationOptions<StepCompletionResponse, Error, CompleteStepVariables | undefined, unknown>
): UseMutationResult<StepCompletionResponse, Error, CompleteStepVariables | undefined, unknown> {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { jwt } = useAuth();
  const assignRoleAndRefresh = useAssignRoleAndRefresh();

  // Extract callbacks to call them later
  const { onSuccess: originalOnSuccess, onError: originalOnError, ...restOptions } = options || {};

  return useMutation<StepCompletionResponse, Error, CompleteStepVariables | undefined> ({
    // Spread the remaining options
    ...restOptions,

    mutationFn: async (variables) => {
      if (!wizardId || !stepId) {
        throw new Error('Wizard ID and Step ID are required to complete step.');
      }
      
      // Use authFetch, expecting the new response structure
      const response = await authFetch<StepCompletionResponse>(`/api/user/wizards/${wizardId}/steps/${stepId}/complete`, {
        method: 'POST',
        body: variables ? JSON.stringify(variables) : undefined, 
        headers: variables ? { 'Content-Type': 'application/json' } : undefined, 
      });
      // Return the response object from the API
      return response;
    },
    // Combine provided onSuccess with our own
    onSuccess: (data, variables, context) => {
      // Invalidate queries related to user progress for this wizard upon successful completion
      queryClient.invalidateQueries({ queryKey: ['userWizardSteps', wizardId] });
      // Potentially invalidate the user wizard list as well if progressStatus changes
      queryClient.invalidateQueries({ queryKey: ['userWizards'] });
      
      // Invalidate user credentials if we have verified data (credential was likely added)
      if (variables?.verified_data) {
        queryClient.invalidateQueries({ queryKey: ['userCredentials'] });
      }

      // --- Conditionally assign role --- 
      if (data.shouldAssignRole && data.roleIdToAssign) {
        // Need user ID - extract from JWT (simple approach, consider a dedicated context/hook if complex)
        let userId: string | undefined;
        if (jwt) {
           try {
             // Basic decoding - assumes JWT structure without verification (verification happened in withAuth)
             const payload = JSON.parse(atob(jwt.split('.')[1]));
             userId = payload.sub;
           } catch (e) {
             console.error("Failed to decode JWT for userId in step completion hook", e);
           }
        }

        if (userId) {
          console.log(`Step completion triggered role assignment for role: ${data.roleIdToAssign}`);
          assignRoleAndRefresh.mutate({ roleId: data.roleIdToAssign, userId });
          // Note: Session refresh happens inside useAssignRoleAndRefresh
        } else {
           console.error('Could not determine userId to assign role after step completion.');
           toast({ title: "Role Assignment Skipped", description: "Could not verify user ID.", variant: "destructive" });
        }
      }
      // --- End Conditional Role Assignment --- 

      // Call the original onSuccess if it was provided
      originalOnSuccess?.(data, variables, context);
    },
    // Combine provided onError with our own
    onError: (error, variables, context) => {
      // Handle error, e.g., show error toast
      console.error("Error completing step:", error);
      toast({ 
        title: "Error Completing Step", 
        description: error.message || 'An unexpected error occurred.',
        variant: "destructive" 
      });

      // Call the original onError if it was provided
      originalOnError?.(error, variables, context);
    },
  });
} 