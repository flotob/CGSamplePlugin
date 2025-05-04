'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useCgLib } from '@/context/CgLibContext';
import type { UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { useAssignRoleAndRefresh } from './useAssignRoleAndRefresh';

// Define the variables expected by the INTERNAL mutation
interface InternalMarkCompletedVariables {
  wizardId: string;
}

// Define the variables expected by the EXPOSED mutate function
interface ExposedMarkCompletedVariables {
  wizardId: string;
  assignRolesPerStep: boolean;
}

interface WizardCompletionResponse {
  success: boolean;
  roles: string[];
}

/**
 * Hook to mark a wizard as completed and handle role assignments.
 * This will add an entry to the user_wizard_completions table.
 */
export function useMarkWizardCompleted() {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [earnedRoles, setEarnedRoles] = useState<string[]>([]);
  const [assignPerStepFlag, setAssignPerStepFlag] = useState<boolean>(false);
  const { iframeUid, cgInstance } = useCgLib();
  const assignRoleAndRefresh = useAssignRoleAndRefresh();

  // Internal mutation setup - expects only wizardId
  const completeMutation = useMutation<WizardCompletionResponse, Error, string>({
    mutationFn: async (wizardId) => {
      try {
        // Add a timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await authFetch<WizardCompletionResponse>(`/api/user/wizards/${wizardId}/complete`, {
          method: 'POST',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        // Convert DOMExceptions (like aborts) to regular errors
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new Error('Request timed out when marking wizard as complete');
        }
        throw err;
      }
    },
    onSuccess: async (data, wizardId) => {
      // Set earned roles regardless of the flag, if roles exist
      if (data.roles && data.roles.length > 0) {
        // De-duplicate roles before setting state
        const uniqueRoles = Array.from(new Set(data.roles));
        setEarnedRoles(uniqueRoles);
        console.log('Wizard completed, unique roles identified:', uniqueRoles);
      }

      // Check the state flag here for conditional logic
      // Only attempt fetch/assignment if flag is FALSE (assign at end)
      if (!assignPerStepFlag && data.roles && data.roles.length > 0) {
        // This block should only run for wizards NOT assigning per step
        try {
          // Fetch user info and trigger assignment (claim happens on summary screen)
          // ---- THIS ENTIRE BLOCK NEEDS TO BE REMOVED ----
          // We decided the user claims roles on the summary screen if assignPerStepFlag is false.
          // This block should *not* run automatically.
          console.log('Assigning roles automatically at end - THIS SHOULD BE REMOVED per user-claim plan.'); 
        } catch (error) {
          // ... error handling ...
        }
      } else if (assignPerStepFlag) {
        console.log('Wizard completion successful, roles assigned per step. Skipping final assignment loop.');
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['userCredentials'] }); 
      queryClient.invalidateQueries({ queryKey: ['userWizardCompletions'] });
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
    // Add retry configuration with exponential backoff
    retry: 2, // Retry up to 2 times (3 attempts total)
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000), // Exponential backoff
  });

  // Expose a custom mutate function that accepts the object, stores the flag, 
  // and calls the internal mutate with only the wizardId.
  const customMutate = (
    variables: ExposedMarkCompletedVariables, 
    options?: {
      onSuccess?: (data: WizardCompletionResponse, variables: ExposedMarkCompletedVariables) => void;
      onError?: (error: Error, variables: ExposedMarkCompletedVariables) => void;
    }
  ) => {
    setAssignPerStepFlag(variables.assignRolesPerStep); // Store flag
    // Call internal mutate with only wizardId, passing original callbacks
    completeMutation.mutate(variables.wizardId, { 
      onSuccess: (data) => options?.onSuccess?.(data, variables), // Pass original variables to callback
      onError: (error) => options?.onError?.(error, variables), // Pass original variables to callback
    }); 
  };

  // Return a structure matching UseMutationResult, but with the custom mutate
  return {
    mutate: customMutate, 
    mutateAsync: (variables: ExposedMarkCompletedVariables) => {
       setAssignPerStepFlag(variables.assignRolesPerStep); // Store flag
       return completeMutation.mutateAsync(variables.wizardId);
    },
    isPending: completeMutation.isPending,
    isSuccess: completeMutation.isSuccess,
    isError: completeMutation.isError,
    error: completeMutation.error,
    status: completeMutation.status,
    data: completeMutation.data,
    reset: completeMutation.reset,
    // Keep exposing earned roles
    earnedRoles,
  };
} 