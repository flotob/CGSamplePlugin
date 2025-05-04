'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';

// Define the expected payload for the mutation
interface UpdateWizardRolePayload {
  required_role_id: string | null;
}

// Define the expected response (assuming the API returns the updated wizard)
// NOTE: Adjust this based on the actual API response if needed
interface Wizard {
  id: string;
  required_role_id: string | null;
  // ... other wizard fields returned by PATCH /api/wizards/[id]
}

/**
 * React Query mutation hook to update the required_role_id for a specific wizard.
 */
export const useUpdateWizardRoleRequirementMutation = () => {
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    Wizard,                      // Type of data returned on success
    Error,                       // Type of error
    { wizardId: string; requiredRoleId: string | null }, // Type of variables passed to mutationFn
    unknown                      // Type of context (optional)
  >(
    {
      mutationFn: async ({ wizardId, requiredRoleId }) => {
        const payload: UpdateWizardRolePayload = {
          required_role_id: requiredRoleId,
        };
        // Use PATCH request to the specific wizard endpoint
        const response = await authFetch<Wizard>(
          `/api/wizards/${wizardId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        );
        return response;
      },
      onSuccess: (data, variables) => {
        // Invalidate the wizards query to refetch the list with updated data
        queryClient.invalidateQueries({ queryKey: ['wizards'] });
        toast({ title: "Role requirement updated successfully!" });
      },
      onError: (error) => {
        console.error("Error updating wizard role requirement:", error);
        toast({
          title: "Error updating role requirement",
          description: error.message || "An unknown error occurred.",
          variant: "destructive",
        });
      },
    }
  );
}; 