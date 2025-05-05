'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Define the expected response structure from the API
interface UserWizardPreviewImageResponse {
  previewImageUrl: string | null;
}

/**
 * React Query hook to fetch the preview image URL for a specific wizard (USER access).
 *
 * @param {string | undefined} wizardId - The ID of the wizard. Query is disabled if undefined.
 * @returns {UseQueryResult<UserWizardPreviewImageResponse, Error>} - The result object from React Query.
 */
export function useUserWizardPreviewImageQuery(
  wizardId: string | undefined
): UseQueryResult<UserWizardPreviewImageResponse, Error> {
  const { authFetch } = useAuthFetch();

  const queryKey = ['userWizardPreviewImage', wizardId];

  const queryFn = async (): Promise<UserWizardPreviewImageResponse> => {
    if (!wizardId) {
      return { previewImageUrl: null };
    }

    // Use the USER API path with [id]
    const url = `/api/user/wizards/${wizardId}/preview-image`;
    const data = await authFetch<UserWizardPreviewImageResponse>(url, { method: 'GET' });
    
    if (typeof data?.previewImageUrl === 'string' || data?.previewImageUrl === null) {
        return data;
    } else {
        console.warn('Unexpected response structure for user preview image:', data);
        return { previewImageUrl: null }; 
    }
  };

  return useQuery<UserWizardPreviewImageResponse, Error>({
    queryKey: queryKey,
    queryFn: queryFn,
    enabled: !!wizardId, 
    staleTime: 5 * 60 * 1000, 
    gcTime: 10 * 60 * 1000, 
    retry: 1,
  });
} 