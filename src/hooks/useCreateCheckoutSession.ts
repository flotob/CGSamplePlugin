'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useCgLib } from '@/context/CgLibContext';
import { useStripeWaitContext } from '@/context/StripeWaitContext';

// Define the expected response from the backend API
interface CreateCheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
}

export function useCreateCheckoutSession() {
  const { authFetch } = useAuthFetch();
  const { toast } = useToast();
  const { decodedPayload } = useAuth();
  const { cgInstance } = useCgLib();
  const { setExpectingFocusLoss } = useStripeWaitContext();

  const mutationFn = async (): Promise<CreateCheckoutSessionResponse> => {
    return await authFetch<CreateCheckoutSessionResponse>('/api/stripe/create-checkout-session', {
      method: 'POST',
    });
  };

  return useMutation<CreateCheckoutSessionResponse, Error, void>({
    mutationFn,
    onSuccess: async (data) => {
      const { sessionUrl } = data;
      const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;

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
      if (!sessionUrl) {
        console.error('Cannot navigate: Stripe session URL missing in response.');
        toast({ title: "Checkout Error", description: "Could not retrieve checkout URL.", variant: "destructive" });
        return;
      }
      if (!pluginBaseUrl) {
        console.error('Cannot navigate: NEXT_PUBLIC_PLUGIN_BASE_URL environment variable is not set.');
        toast({ title: "Configuration Error", description: "Plugin base URL is not configured.", variant: "destructive" });
        return;
      }

      try {
        const interstitialUrl = `${pluginBaseUrl}/stripe-handler?stripeTargetUrl=${encodeURIComponent(sessionUrl)}`;
        
        console.log('Navigating to interstitial URL:', interstitialUrl);
        
        await cgInstance.navigate(interstitialUrl);

        setExpectingFocusLoss(true);
        console.log('Set expecting focus loss flag to true after navigation attempt.');

      } catch (error) {
        console.error('Error constructing or navigating to interstitial URL:', error);
        toast({ title: "Navigation Failed", description: error instanceof Error ? error.message : "An unexpected error occurred.", variant: "destructive" });
        setExpectingFocusLoss(false);
      }
    },
    onError: (error) => {
      console.error('Create Checkout Session Mutation Error:', error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "An error occurred while trying to initiate the upgrade process.",
        variant: "destructive",
      });
      setExpectingFocusLoss(false);
    },
  });
} 