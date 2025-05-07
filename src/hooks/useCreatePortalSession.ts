'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useCgLib } from '@/context/CgLibContext';

// Define the expected response from the backend API
interface CreatePortalSessionResponse {
  portalUrl: string;
}

export function useCreatePortalSession() {
  const { authFetch } = useAuthFetch();
  const { toast } = useToast();
  const { decodedPayload } = useAuth();
  const { cgInstance } = useCgLib();

  const mutationFn = async (): Promise<CreatePortalSessionResponse> => {
    // No variables needed as primary identifiers come from JWT
    return await authFetch<CreatePortalSessionResponse>('/api/stripe/create-portal-session', {
      method: 'POST',
      // No body needed here, backend uses JWT claims
    });
  };

  return useMutation<CreatePortalSessionResponse, Error, void>({ // void means no variables passed to mutate()
    mutationFn,
    onSuccess: async (data) => {
      const { portalUrl } = data;
      const parentAppUrl = process.env.NEXT_PUBLIC_PARENT_APP_URL;

      // Ensure we have all necessary pieces before navigating
      if (!cgInstance) {
        console.error('Cannot navigate: CgPluginLib instance not available.');
        toast({ title: "Navigation Error", description: "Plugin library not ready.", variant: "destructive" });
        return;
      }
      if (!decodedPayload) {
        console.error('Cannot navigate: Decoded JWT payload not available.');
        toast({ title: "Navigation Error", description: "User session information missing.", variant: "destructive" });
        return;
      }
       if (!portalUrl) {
        console.error('Cannot navigate: Stripe portal URL missing in response.');
        toast({ title: "Portal Error", description: "Could not retrieve the customer portal URL.", variant: "destructive" });
        return;
      }
       if (!parentAppUrl) {
        console.error('Cannot navigate: PARENT_APP_URL environment variable is not set.');
        toast({ title: "Configuration Error", description: "Application base URL is not configured.", variant: "destructive" });
        return;
      }

      // Get communityShortId and pluginId from decoded JWT
      const communityShortId = decodedPayload.communityShortId;
      const pluginId = decodedPayload.pluginId;

      if (!communityShortId || !pluginId) {
          console.error('Cannot navigate: communityShortId or pluginId missing from JWT payload.', decodedPayload);
          toast({ title: "Navigation Error", description: "Essential routing information missing.", variant: "destructive" });
          return;
      }

      try {
        // Construct the interstitial URL pointing to our handler page
        const interstitialUrl = `${parentAppUrl.replace(/\/$/, '')}/c/${communityShortId}/plugin/${pluginId}/stripe-handler?stripeTargetUrl=${encodeURIComponent(portalUrl)}`;
        
        console.log('Navigating to portal interstitial URL:', interstitialUrl);

        // Use cgInstance.navigate to open the interstitial page in a new tab
        await cgInstance.navigate(interstitialUrl);

        // Old window.top.location.href logic removed

      } catch (error) {
        console.error('Error constructing or navigating to portal interstitial URL:', error);
        toast({ title: "Navigation Failed", description: error instanceof Error ? error.message : "An unexpected error occurred.", variant: "destructive" });
      }
    },
    onError: (error) => {
      console.error('Create Portal Session Mutation Error:', error);
      toast({
        title: "Portal Access Failed",
        description: error.message || "An error occurred while trying to access the billing portal.",
        variant: "destructive",
      });
    },
  });
} 