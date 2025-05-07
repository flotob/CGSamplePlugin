'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Optional: for a loading spinner

function StripeHandlerContent() {
  const searchParams = useSearchParams();
  const stripeTargetUrl = searchParams.get('stripeTargetUrl');

  useEffect(() => {
    if (stripeTargetUrl) {
      try {
        // Attempt redirect
        window.location.href = stripeTargetUrl;
      } catch (error) {
        console.error('Failed to redirect to Stripe:', error);
        // Optionally display an error message to the user here
      }
    } else {
      // Handle the case where the URL parameter is missing
      console.error('Stripe target URL is missing in query parameters.');
      // Optionally display an error message
    }
    // Intentionally empty dependency array to run only once on mount, 
    // relying on searchParams being available via Suspense
  }, [stripeTargetUrl]); 

  // Display a loading/redirecting message
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">Redirecting to Stripe...</p>
      <p className="text-sm text-muted-foreground mt-2">
Please wait while we securely transfer you.</p>
      {!stripeTargetUrl && (
         <p className="text-sm text-red-500 mt-4">
           Error: Missing redirect information. Cannot proceed.
         </p>
      )}
    </div>
  );
}

export default function StripeHandlerPage() {
  // useSearchParams needs to be wrapped in a Suspense boundary
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">Loading...</p>
      </div>
    }>
      <StripeHandlerContent />
    </Suspense>
  );
} 