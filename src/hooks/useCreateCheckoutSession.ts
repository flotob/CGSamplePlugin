'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useState, useEffect } from 'react';

// Define the expected response from the backend API
interface CreateCheckoutSessionResponse {
  sessionId: string;
}

// Memoize the Stripe promise
const getStripe = () => {
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripePublishableKey) {
    console.error('Stripe publishable key is not set in environment variables.');
    return Promise.resolve(null); // Return null promise if key is missing
  }
  return loadStripe(stripePublishableKey);
};

export function useCreateCheckoutSession() {
  const { authFetch } = useAuthFetch();
  const { toast } = useToast();
  const [stripe, setStripe] = useState<Stripe | null>(null);

  // Load Stripe instance on mount
  useEffect(() => {
    getStripe().then(setStripe).catch((err: Error) => {
      console.error("Failed to load Stripe:", err);
      toast({ title: "Error initializing payment", description: "Could not connect to Stripe.", variant: "destructive" });
    });
  }, [toast]); // Add toast as dependency

  const mutationFn = async (): Promise<CreateCheckoutSessionResponse> => {
    // No variables needed as communityId is derived from JWT in the backend
    return await authFetch<CreateCheckoutSessionResponse>('/api/stripe/create-checkout-session', {
      method: 'POST',
    });
  };

  return useMutation<CreateCheckoutSessionResponse, Error, void>({ // void means no variables passed to mutate()
    mutationFn,
    onSuccess: async (data) => {
      if (!stripe) {
        toast({ title: "Payment Initialization Error", description: "Stripe is not ready. Please try again.", variant: "destructive" });
        return;
      }
      const { sessionId } = data;
      if (!sessionId) {
        toast({ title: "Checkout Error", description: "Could not retrieve a checkout session ID.", variant: "destructive" });
        return;
      }

      // When the customer clicks on the button, redirect them to Checkout.
      const { error } = await stripe.redirectToCheckout({ sessionId });

      // If `redirectToCheckout` fails due to a browser or network
      // error, display the localized error message to your customer
      // using `error.message`.
      if (error) {
        console.error('Stripe redirectToCheckout error:', error);
        toast({ title: "Checkout Redirect Failed", description: error.message, variant: "destructive" });
      }
      // Optionally invalidate queries related to billing info if checkout starts successfully
      // queryClient.invalidateQueries({ queryKey: ['communityBillingInfo'] });
    },
    onError: (error) => {
      console.error('Create Checkout Session Error:', error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "An error occurred while trying to initiate the upgrade process.",
        variant: "destructive",
      });
    },
  });
} 