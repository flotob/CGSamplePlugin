'use client';

import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Define the type for the variables the mutation function will receive
interface GenerateBackgroundVariables {
  wizardId: string;
  stepId: string;
  prompt: string;
}

// Define the expected success response structure from the API
interface GenerateBackgroundResponse {
  imageUrl: string;
}

/**
 * React Query mutation hook to generate a background image for a step.
 */
export function useGenerateBackgroundMutation(): UseMutationResult<
  GenerateBackgroundResponse, // Type of data returned on success
  Error,                      // Type of error
  GenerateBackgroundVariables,  // Type of variables passed to mutationFn
  unknown                     // Type of context (optional)
> {
  const { authFetch } = useAuthFetch();

  return useMutation<GenerateBackgroundResponse, Error, GenerateBackgroundVariables>({
    mutationFn: async (variables: GenerateBackgroundVariables) => {
      if (!variables.prompt || variables.prompt.trim() === '' || !variables.wizardId || !variables.stepId) {
        throw new Error('Wizard ID, Step ID, and a non-empty prompt are required.');
      }

      // Call the backend API endpoint using authFetch
      const response = await authFetch<GenerateBackgroundResponse>(
        '/api/admin/steps/generate-background', // Endpoint URL
        {
          method: 'POST',
          body: JSON.stringify(variables),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    },
    onSuccess: (data) => {
      // Toast is handled by the component calling this mutation usually,
      // but could add a generic success one here if desired.
      console.log('Background image generated successfully:', data.imageUrl);
      // No query invalidation needed here, as the calling component 
      // will use the result to trigger a step update.
    },
    onError: (error) => {
      // Toasting is usually handled by the component calling the mutation 
      // as it can provide more context, but logging the error here is good.
      console.error("Error generating background image:", error);
      // No toast here now
    },
    retry: false, 
  });
} 