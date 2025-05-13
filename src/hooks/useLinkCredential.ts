'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch'; // Assuming your authenticated fetch wrapper
import { useToast } from '@/hooks/use-toast';

// Define the expected payload for linking a credential
export interface LinkCredentialPayload {
  platform: string;      // E.g., "ENS", "LUKSO_UP". Must match a value in platform_enum.
  external_id: string; // The unique identifier (e.g., ENS name, UP address).
  username?: string | null; // A display name (e.g., ENS name, UP profile name).
}

// Define the expected structure of a linked credential record from the backend
export interface LinkedCredential {
  id: string; // Typically a UUID
  user_id: string;
  platform: string; // Should match one of the platform_enum values
  external_id: string;
  username: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

// Async function that performs the API call
async function postLinkCredential(payload: LinkCredentialPayload, authFetchInstance: ReturnType<typeof useAuthFetch>['authFetch']): Promise<LinkedCredential> {
  // Expect the backend to return an object like { credential: LinkedCredential }
  const responseData = await authFetchInstance<{ credential: LinkedCredential }>('/api/user/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Assuming authFetch throws for non-ok HTTP responses.
  // Now, check if the expected data structure is present.
  if (responseData && responseData.credential) {
    return responseData.credential;
  } else {
    // This case means the HTTP request was successful (e.g., 200/201) 
    // but the JSON body didn't match { credential: ... }.
    console.error('Invalid response structure from /api/user/credentials:', responseData);
    throw new Error('Received an invalid response from the server when linking credential.');
  }
}

/**
 * Custom React Query hook to link a new credential for the current user.
 */
export function useLinkCredential(): UseMutationResult<LinkedCredential, Error, LinkCredentialPayload, unknown> {
  const queryClient = useQueryClient();
  const { authFetch } = useAuthFetch(); // Get the authFetch instance from its hook
  const { toast } = useToast();

  return useMutation<LinkedCredential, Error, LinkCredentialPayload, unknown>({
    mutationFn: (payload: LinkCredentialPayload) => postLinkCredential(payload, authFetch),
    onSuccess: (data) => {
      // Invalidate queries that depend on user_linked_credentials to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['userCredentials'] });
      
      toast({
        title: 'Credential Linked',
        description: `Your ${data.platform} account (${data.username || data.external_id}) has been successfully linked.`,
        variant: 'default',
      });
      console.log('Credential linked successfully:', data);
    },
    onError: (error: Error) => {
      toast({
        title: 'Linking Failed',
        description: error.message || 'An unexpected error occurred while linking the credential.',
        variant: 'destructive',
      });
      console.error('Error linking credential:', error.message);
    },
  });
} 