'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { GeneratedImage } from '@/types/images';

// Define the structure for the hook's input variables
interface UseAdminImagesQueryVariables {
  scope: 'mine' | 'public';
}

// Define the expected response structure from the API
interface AdminImagesResponse {
  images: GeneratedImage[];
}

/**
 * React Query hook to fetch generated images for the admin, either their own or public ones.
 *
 * @param {UseAdminImagesQueryVariables} variables - Object containing the scope ('mine' or 'public').
 * @returns {UseQueryResult<AdminImagesResponse, Error>} - The result object from React Query.
 */
export function useAdminImagesQuery(
  { scope }: UseAdminImagesQueryVariables
): UseQueryResult<AdminImagesResponse, Error> {
  const { authFetch } = useAuthFetch();

  // The query key is crucial for caching and invalidation
  const queryKey = ['adminImages', scope];

  const queryFn = async (): Promise<AdminImagesResponse> => {
    if (!scope) {
        throw new Error('Scope is required to fetch admin images.');
    }

    // Construct the URL with the scope query parameter
    const url = `/api/admin/images?scope=${encodeURIComponent(scope)}`;

    // Use authFetch to make the authenticated GET request
    const data = await authFetch<AdminImagesResponse>(url, { method: 'GET' });

    // Ensure the response has the expected structure
    if (!data || !Array.isArray(data.images)) {
      console.error('Invalid response structure received from /api/admin/images', data);
      // Return empty array to prevent breaking UI expecting an array
      return { images: [] }; 
    }

    return data;
  };

  return useQuery<AdminImagesResponse, Error>({ 
    queryKey: queryKey, 
    queryFn: queryFn, 
    // Keep data fresh for a short period, then refetch in the background
    staleTime: 1 * 60 * 1000, // 1 minute
    // Cache data for longer to avoid unnecessary refetches on mount
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Optional: Add other configurations like enabled, refetchOnWindowFocus, etc.
    enabled: !!scope, // Only run the query if scope is provided
  });
} 