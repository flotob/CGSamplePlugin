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
      const response = await authFetch<WizardCompletionResponse>(`/api/user/wizards/${wizardId}/complete`, {
        method: 'POST',
      });
      
      return response;
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

  return {
    ...completeMutation,
    earnedRoles,
    mutate: completeMutation.mutate
  };
} 