'use client';

import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';

// Define the structure for the structured prompt object
interface StructuredPrompt { 
    style?: string | null;
    subject?: string | null;
    mood?: string | null;
    // Add other fields corresponding to the UI
}

// Define the variables for the mutation
interface GenerateAndSaveVariables {
  wizardId: string;
  stepId: string;
  structuredPrompt: StructuredPrompt;
}

// Define the expected success response from the API
interface GenerateAndSaveResponse {
  imageUrl: string;
}

/**
 * React Query mutation hook to generate an image, upload it, save metadata, 
 * and return the persistent URL.
 */
export function useGenerateAndSaveImageMutation(): UseMutationResult<
  GenerateAndSaveResponse, 
  Error, 
  GenerateAndSaveVariables, 
  unknown
> {
  const { authFetch } = useAuthFetch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<GenerateAndSaveResponse, Error, GenerateAndSaveVariables>({
    mutationFn: async (variables: GenerateAndSaveVariables) => {
      if (!variables.structuredPrompt || Object.keys(variables.structuredPrompt).length === 0 || !variables.wizardId || !variables.stepId) {
        throw new Error('Wizard ID, Step ID, and prompt details are required.');
      }

      // Call the backend API endpoint
      const response = await authFetch<GenerateAndSaveResponse>(
        '/api/admin/steps/generate-background', 
        {
          method: 'POST',
          body: JSON.stringify(variables),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    },
    onSuccess: (data) => {
      // Invalidate the query for the admin's own images so the new one appears
      queryClient.invalidateQueries({ queryKey: ['adminImages', 'mine'] }); 
      toast({ 
          title: "Image Generated Successfully!",
          description: "Added to your image library."
      });
    },
    onError: (error) => {
      console.error("Error generating and saving image:", error);
      // Specific error handling (like for quota) can be done in the component using the error object
      toast({
        title: "Image Generation Failed",
        description: error.message || "Could not generate background image.",
        variant: "destructive",
      });
    },
    // Consider disabling retries for generation as it costs quota/money
    retry: false,
  });
} 