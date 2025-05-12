'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useCgLib } from '@/context/CgLibContext';
import { useCgQuery } from '@/hooks/useCgQuery';
import { useAuth } from '@/context/AuthContext';
import type { UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

// Import shared timestamp from useAssignRoleAndRefresh or redefine if used independently
// Using a module-level timestamp that all instances of the hook will share
// Use the same values as in useAssignRoleAndRefresh.ts
// For simplicity, we're duplicating these values here, but ideally they would be in a shared file
let lastRefreshTimestamp = 0;
const REFRESH_COOLDOWN_MS = 5000; // 5 second cooldown between refreshes

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
  const { iframeUid } = useCgLib();
  const { login, logout } = useAuth();

  // Get user info for the userId
  const { data: userInfo } = useCgQuery<UserInfoResponsePayload, Error>(
    ['userInfo', iframeUid],
    async (instance) => (await instance.getUserInfo()).data,
    { enabled: !!iframeUid }
  );

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
    onSuccess: async (data) => {
      // Set earned roles regardless of the flag, if roles exist
      if (data.roles && data.roles.length > 0) {
        const uniqueRoles = Array.from(new Set(data.roles));
        setEarnedRoles(uniqueRoles);
        
        // Only refresh JWT if we have roles to assign, a user ID, and not in cooldown
        if (uniqueRoles.length > 0 && userInfo?.id) {
          // Check cooldown before attempting to refresh JWT
          const now = Date.now();
          if (now - lastRefreshTimestamp > REFRESH_COOLDOWN_MS) {
            console.log(`Refreshing JWT after wizard completion with ${uniqueRoles.length} roles`);
            lastRefreshTimestamp = now; // Update timestamp
            
            // Refresh JWT to update roles
            logout();
            await new Promise(resolve => setTimeout(resolve, 50));
            await login();
          } else {
            console.log('JWT refresh after wizard completion skipped due to cooldown.');
          }
        }
      }
      
      // Invalidate queries (always do this regardless of JWT refresh)
      queryClient.invalidateQueries({ queryKey: ['userCredentials'] }); 
      queryClient.invalidateQueries({ queryKey: ['userWizardCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['userWizards'] });
      queryClient.invalidateQueries({ queryKey: ['userInfo', iframeUid] });
      queryClient.invalidateQueries({ queryKey: ['earnableRoles'] });
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

  // Return the standard mutation object
  return {
    ...completeMutation,
    earnedRoles,
  };
} 