'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';

// Define the expected response from the backend API
interface CreatePortalSessionResponse {
  portalUrl: string;
}

export function useCreatePortalSession() {
  const { authFetch } = useAuthFetch();
  const { toast } = useToast();

  const mutationFn = async (): Promise<CreatePortalSessionResponse> => {
    // No variables needed as communityId is derived from JWT in the backend
    return await authFetch<CreatePortalSessionResponse>('/api/stripe/create-portal-session', {
      method: 'POST',
    });
  };

  return useMutation<CreatePortalSessionResponse, Error, void>({ // void means no variables passed to mutate()
    mutationFn,
    onSuccess: (data) => {
      const { portalUrl } = data;
      if (portalUrl) {
        // Redirect the user to the Stripe Billing Portal
        window.location.href = portalUrl;
      } else {
        console.error('Portal URL not found in response:', data);
        toast({
          title: "Portal Error",
          description: "Could not retrieve the customer portal URL.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Create Portal Session Error:', error);
      toast({
        title: "Portal Access Failed",
        description: error.message || "An error occurred while trying to access the billing portal.",
        variant: "destructive",
      });
    },
  });
} 