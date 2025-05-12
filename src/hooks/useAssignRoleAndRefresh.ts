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

// Create a shared cooldown state to prevent refresh loops
// Using a module-level timestamp that all instances of the hook will share
let lastRefreshTimestamp = 0;
const REFRESH_COOLDOWN_MS = 5000; // 5 second cooldown between refreshes

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
    onSuccess: async (_data, variables) => {
      // Only handle success toast and userInfo invalidation here
      console.log(`Successfully called giveRole for role ${variables.roleId}, user ${variables.userId}.`);
      toast({
        title: "Role Assignment Successful", 
        description: `Assigned role: ${variables.roleId}.`,
      });

      // Invalidate user info query immediately after successful call
      await queryClient.invalidateQueries({ queryKey: ['userInfo', iframeUid] });

      // Check cooldown before attempting to refresh JWT
      const now = Date.now();
      if (now - lastRefreshTimestamp > REFRESH_COOLDOWN_MS) {
        console.log('Refreshing JWT with cooldown check passed');
        lastRefreshTimestamp = now; // Update timestamp
        
        // RESTORE JWT refresh logic with cooldown protection
        logout(); 
        await new Promise(resolve => setTimeout(resolve, 50)); 
        await login();
        
        // After login refresh, invalidate userWizards to show newly accessible wizards
        queryClient.invalidateQueries({ queryKey: ['userWizards'] });
        queryClient.invalidateQueries({ queryKey: ['earnableRoles'] });
      } else {
        console.log('JWT refresh skipped due to cooldown. Just invalidating queries.');
        // Still invalidate queries to update UI
        queryClient.invalidateQueries({ queryKey: ['userWizards'] });
        queryClient.invalidateQueries({ queryKey: ['earnableRoles'] });
      }
    },
    onError: (error, variables) => {
      console.error(`Error assigning role ${variables.roleId} to user ${variables.userId}:`, error);
      toast({
        title: "Role Assignment Failed",
        description: error.message || "An unknown error occurred while trying to assign the role.",
        variant: "destructive",
      });
    },
  });
} 