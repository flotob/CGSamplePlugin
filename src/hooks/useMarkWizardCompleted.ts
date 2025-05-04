'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';

// Remove interfaces related to custom mutate

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

  // Internal mutation setup - variables type is string (wizardId)
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
    onSuccess: async (data, /* wizardId */) => {
      // Set earned roles regardless of the flag, if roles exist
      if (data.roles && data.roles.length > 0) {
        const uniqueRoles = Array.from(new Set(data.roles));
        setEarnedRoles(uniqueRoles);
      }
      
      // How to get the flag here? We need it for conditional logic.
      // >>> This logic needs to be moved or flag passed differently <<<
      // if (!assignPerStepFlag && data.roles && data.roles.length > 0) { ... }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['userCredentials'] }); 
      queryClient.invalidateQueries({ queryKey: ['userWizardCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['userWizards'] });
    },
    onError: (/* error */) => {
      console.error('Failed to mark wizard as completed:'); // Keep log general
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

  // Return the standard mutation object
  return {
    ...completeMutation,
    earnedRoles,
  };
} 