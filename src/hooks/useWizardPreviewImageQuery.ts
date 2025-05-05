'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Define the expected response structure from the API
interface WizardPreviewImageResponse {
  previewImageUrl: string | null;
}

/**
 * React Query hook to fetch the preview image URL for a specific wizard.
 *
 * @param {string | undefined} wizardId - The ID of the wizard. Query is disabled if undefined.
 * @returns {UseQueryResult<WizardPreviewImageResponse, Error>} - The result object from React Query.
 */
export function useWizardPreviewImageQuery(
  wizardId: string | undefined
): UseQueryResult<WizardPreviewImageResponse, Error> {
  const { authFetch } = useAuthFetch();

  const queryKey = ['wizardPreviewImage', wizardId];

  const queryFn = async (): Promise<WizardPreviewImageResponse> => {
    if (!wizardId) {
      // This should not be called if wizardId is undefined due to the 'enabled' option,
      // but returning a default state defensively.
      return { previewImageUrl: null };
    }

    const url = `/api/wizards/${wizardId}/preview-image`;
    const data = await authFetch<WizardPreviewImageResponse>(url, { method: 'GET' });
    
    // Basic validation or transformation if needed
    if (typeof data?.previewImageUrl === 'string' || data?.previewImageUrl === null) {
        return data;
    } else {
        // Handle unexpected response structure
        console.warn('Unexpected response structure for preview image:', data);
        return { previewImageUrl: null }; 
    }
  };

  return useQuery<WizardPreviewImageResponse, Error>({
    queryKey: queryKey,
    queryFn: queryFn,
    enabled: !!wizardId, // Only run the query if wizardId is provided
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data for 10 minutes
    retry: 1, // Retry once on failure
    // Consider refetchOnWindowFocus: false if frequent refetches aren't desired
  });
} 