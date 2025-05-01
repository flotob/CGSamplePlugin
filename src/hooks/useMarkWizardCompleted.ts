'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useCgLib } from '@/context/CgLibContext';
import { useCgMutation } from '@/hooks/useCgMutation';
import type { UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

interface WizardCompletionResponse {
  success: boolean;
  roles: string[];
}

interface MutateOptions {
  onSuccess?: (data: WizardCompletionResponse) => void;
  onError?: (error: Error) => void;
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

  // Role assignment mutation
  const { mutate: assignRole } = useCgMutation<
    unknown, 
    Error,
    { roleId: string; userId: string }
  >(
    async (instance, { roleId, userId }) => {
      if (!roleId) throw new Error("Role ID is missing or invalid.");
      await instance.giveRole(roleId, userId);
    },
    {
      invalidateQueryKeys: [['userInfo', iframeUid], ['communityInfo', iframeUid]]
    }
  );

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
    onSuccess: (data, wizardId) => {
      // Store the earned roles
      if (data.roles && data.roles.length > 0) {
        setEarnedRoles(data.roles);
        
        // Get user info from query cache
        const userInfo = queryClient.getQueryData(['userInfo', iframeUid]) as UserInfoResponsePayload | undefined;
        const userId = userInfo?.id;
        
        if (userId) {
          // Assign all roles
          data.roles.forEach(roleId => {
            assignRole({ roleId, userId });
          });
        }
      }
      
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['userWizards'] });
      
      // Also invalidate user credentials to ensure the summary screen has the latest data
      queryClient.invalidateQueries({ queryKey: ['userCredentials'] });
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
    mutate: (wizardId: string, options?: MutateOptions) => {
      return completeMutation.mutate(wizardId, {
        onSuccess: (data) => {
          if (options?.onSuccess) options.onSuccess(data);
        },
        onError: (error) => {
          if (options?.onError) options.onError(error as Error);
        }
      });
    }
  };
} 