'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useCgLib } from '@/context/CgLibContext';
import type { UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { useAssignRoleAndRefresh } from './useAssignRoleAndRefresh';
import { useAuth } from '@/context/AuthContext';

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
  const { iframeUid, cgInstance } = useCgLib();
  const { login, logout } = useAuth();

  const assignRoleAndRefresh = useAssignRoleAndRefresh();

  // Main completion mutation
  const completeMutation = useMutation({
    mutationFn: async (wizardId: string) => {
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
    // Make onSuccess async and fetch userId reliably
    onSuccess: async (data) => {
      if (data.roles && data.roles.length > 0) {
        setEarnedRoles(data.roles);
        try {
          // Check if cgInstance is available before fetching
          if (!cgInstance) {
            throw new Error('CgPluginLib instance not available for fetching user info.');
          }
          
          // Reliably fetch user info before assigning roles, providing the queryFn
          const userInfo = await queryClient.fetchQuery<UserInfoResponsePayload>({
            queryKey: ['userInfo', iframeUid],
            // Define the query function inline
            queryFn: async () => {
               // Re-check instance just in case, though outer check should suffice
               if (!cgInstance) throw new Error('CgPluginLib instance lost during queryFn execution.');
               // Fetch the data using the instance
               const response = await cgInstance.getUserInfo();
               return response.data; // Assuming response structure based on useCgQuery
            },
            staleTime: 0 // Re-fetch if needed
          });
          const userId = userInfo?.id;

          if (userId) {
            console.log(`User ID ${userId} found. Attempting to assign ${data.roles.length} roles.`);
            // Call the centralized hook's mutate function for each role
            const assignmentPromises = data.roles.map(roleId => 
              assignRoleAndRefresh.mutate({ roleId, userId })
            );
            // Wait for all assignment attempts (including session refresh within each)
            // Note: This might trigger multiple session refreshes if multiple roles are granted.
            // Consider if this is acceptable or if refresh should only happen once after all assignments.
            // For now, letting each assignment trigger its own refresh cycle.
            await Promise.allSettled(assignmentPromises);
            console.log('Finished attempting role assignments and session refreshes.');

            // --- Perform SINGLE session refresh AFTER all assignments attempted ---
            console.log('All role assignments attempted. Performing final session refresh.');
            logout();
            await new Promise(resolve => setTimeout(resolve, 50)); // Short delay
            await login();
            console.log('Session refreshed. Invalidating user wizards list.');
            queryClient.invalidateQueries({ queryKey: ['userWizards'] }); // Invalidate list *after* login
            // --- End single session refresh ---

          } else {
            console.warn('Could not find user ID after wizard completion. Skipping role assignments.');
          }
        } catch (error) {
          console.error('Error fetching user info or assigning roles during wizard completion success:', error);
          toast({ 
            title: 'Role Assignment Issue', 
            description: 'Could not retrieve user information or assign roles.',
            variant: 'destructive' // Use 'destructive' for errors
          });
        }
      }
      
      // Invalidate queries (moved outside the role check)
      queryClient.invalidateQueries({ queryKey: ['userCredentials'] });
      // Invalidate completion status itself
      queryClient.invalidateQueries({ queryKey: ['userWizardCompletions'] });
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

  return {
    ...completeMutation,
    earnedRoles,
  };
} 