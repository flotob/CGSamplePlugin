'use client';

import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { GeneratedImage } from '@/types/images'; // Assuming API might return the updated image

// Define the variables for the mutation
interface ToggleImagePublicVariables {
  imageId: string;
}

// Define the expected success response from the API 
// (Could be just success or the updated image record)
type ToggleImagePublicResponse = { success: boolean } | GeneratedImage;

/**
 * React Query mutation hook to toggle the public visibility of a generated image.
 */
export function useToggleImagePublicMutation(): UseMutationResult<
  ToggleImagePublicResponse, 
  Error, 
  ToggleImagePublicVariables, 
  unknown
> {
  const { authFetch } = useAuthFetch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<ToggleImagePublicResponse, Error, ToggleImagePublicVariables>({
    mutationFn: async ({ imageId }: ToggleImagePublicVariables) => {
      if (!imageId) {
        throw new Error('Image ID is required to toggle public status.');
      }

      const url = `/api/admin/images/${encodeURIComponent(imageId)}/toggle-public`;

      // Call the backend API endpoint using PATCH
      const response = await authFetch<ToggleImagePublicResponse>(url, {
        method: 'PATCH',
        // No body needed for this toggle endpoint typically
      });

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate both 'mine' and 'public' image queries to ensure UI consistency
      // regardless of the direction of the toggle.
      queryClient.invalidateQueries({ queryKey: ['adminImages', 'mine'] }); 
      queryClient.invalidateQueries({ queryKey: ['adminImages', 'public'] }); 

      // Check if the response contains the updated image to determine status
      let isNowPublic = false;
      if (typeof data === 'object' && data !== null && 'is_public' in data) {
        isNowPublic = data.is_public;
      }
      // Add a simple success check if the API only returns { success: true }
      // else if (typeof data === 'object' && data !== null && 'success' in data && data.success) {
      //   // Cannot determine the new state from {success: true}
      //   // Consider fetching the image state again or adjusting the API
      // }

      toast({ 
          title: "Visibility Updated",
          description: `Image is now ${isNowPublic ? 'public' : 'private'}.`
      });
    },
    onError: (error, variables) => {
      console.error(`Error toggling public status for image ${variables.imageId}:`, error);
      toast({
        title: "Visibility Update Failed",
        description: error.message || "Could not update image visibility.",
        variant: "destructive",
      });
    },
  });
} 