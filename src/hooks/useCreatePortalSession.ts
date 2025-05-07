'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useCgLib } from '@/context/CgLibContext';
import { useStripeWaitContext } from '@/context/StripeWaitContext';

// Define the expected response from the backend API
interface CreatePortalSessionResponse {
  portalUrl: string;
}

export function useCreatePortalSession() {
  const { authFetch } = useAuthFetch();
  const { toast } = useToast();
  const { decodedPayload } = useAuth();
  const { cgInstance } = useCgLib();
  const { setExpectingFocusLoss } = useStripeWaitContext();

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
      // Use the new environment variable for the plugin's base URL
      const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;

      // Perform checks (cgInstance, decodedPayload, portalUrl, pluginBaseUrl)
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
       if (!pluginBaseUrl) { // Check for the new base URL variable
        console.error('Cannot navigate: NEXT_PUBLIC_PLUGIN_BASE_URL environment variable is not set.');
        toast({ title: "Configuration Error", description: "Plugin base URL is not configured.", variant: "destructive" });
        return;
      }

      try {
        // Construct the interstitial URL using the plugin's base URL
        const interstitialUrl = `${pluginBaseUrl}/stripe-handler?stripeTargetUrl=${encodeURIComponent(portalUrl)}`;
        
        console.log('Navigating to portal interstitial URL:', interstitialUrl);

        await cgInstance.navigate(interstitialUrl);
        
        setExpectingFocusLoss(true);
        console.log('Set expecting focus loss flag to true after navigation attempt.');

      } catch (error) {
        console.error('Error constructing or navigating to portal interstitial URL:', error);
        toast({ title: "Navigation Failed", description: error instanceof Error ? error.message : "An unexpected error occurred.", variant: "destructive" });
        setExpectingFocusLoss(false);
      }
    },
    onError: (error) => {
      console.error('Create Portal Session Mutation Error:', error);
      toast({
        title: "Portal Access Failed",
        description: error.message || "An error occurred while trying to access the billing portal.",
        variant: "destructive",
      });
      setExpectingFocusLoss(false);
    },
  });
} 