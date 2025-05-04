'use client';

import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useCgLib } from '@/context/CgLibContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Define the input variables for the mutation
interface AssignRoleVariables {
  roleId: string;
  userId: string;
}

// Define the return type of the hook
type UseAssignRoleAndRefreshResult = UseMutationResult<
  void, // Type returned by cgInstance.giveRole (likely void)
  Error, // Type of error
  AssignRoleVariables, // Type of variables passed to mutate
  unknown // Type of context (optional)
>;

/**
 * Custom hook to assign a role using cgInstance.giveRole 
 * and then refresh the user's session JWT to reflect the change.
 */
export function useAssignRoleAndRefresh(): UseAssignRoleAndRefreshResult {
  const { cgInstance, iframeUid } = useCgLib();
  const { login, logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, AssignRoleVariables>({
    mutationFn: async ({ roleId, userId }: AssignRoleVariables) => {
      if (!cgInstance) {
        throw new Error('Common Ground Library not initialized.');
      }
      if (!roleId || !userId) {
        throw new Error('Role ID and User ID are required.');
      }
      // Perform the role assignment using the library
      await cgInstance.giveRole(roleId, userId);
    },
    onSuccess: async (data, variables) => {
      // Only handle success toast and userInfo invalidation here
      console.log(`Successfully called giveRole for role ${variables.roleId}, user ${variables.userId}.`);
      toast({
        title: "Role Assignment Attempted", // Changed title slightly
        description: `Attempted to assign role: ${variables.roleId}.`,
      });

      // Invalidate user info query immediately after successful call
      // This is still useful even if login() happens later
      await queryClient.invalidateQueries({ queryKey: ['userInfo', iframeUid] });

      // REMOVED session refresh logic from here
      // logout(); 
      // await new Promise(resolve => setTimeout(resolve, 50)); 
      // await login(); 
      // REMOVED userWizards invalidation from here
      // queryClient.invalidateQueries({ queryKey: ['userWizards'] });

    },
    onError: (error, variables) => {
      console.error(`Error assigning role ${variables.roleId} to user ${variables.userId}:`, error);
      toast({
        title: "Role Assignment Failed",
        description: error.message || "An unknown error occurred while trying to assign the role.",
        variant: "destructive",
      });
    },
    // Add retry configuration if desired (optional)
    // retry: 1,
  });
} 