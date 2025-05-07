'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const BROADCAST_CHANNEL_NAME = 'stripe_payment_results';

function StripeCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Extract relevant parameters
    const status = searchParams.get('stripe_status'); // e.g., 'success', 'cancel', 'portal_return'
    const sessionId = searchParams.get('session_id'); // Only present on success

    console.log('Stripe Callback Page Loaded - Status:', status, 'Session ID:', sessionId);

    let messagePayload: Record<string, any> | null = null;

    if (status === 'success' && sessionId) {
      messagePayload = { type: 'stripeCallback', status: 'success', data: { sessionId: sessionId } };
    } else if (status === 'cancel') {
      messagePayload = { type: 'stripeCallback', status: 'cancel' };
    } else if (status === 'portal_return') {
      messagePayload = { type: 'stripeCallback', status: 'portal_return' };
    } else {
      console.error('Stripe callback page received unknown or missing status:', status);
      // Decide if you want to send an error message back or just close
      messagePayload = { type: 'stripeCallback', status: 'error', error: 'Unknown callback status' };
    }

    // Use BroadcastChannel to send message back to the original tab
    try {
      console.log(`Broadcasting message on channel '${BROADCAST_CHANNEL_NAME}':`, messagePayload);
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage(messagePayload);
      bc.close(); 
    } catch (error) {
      console.error('Failed to broadcast message:', error);
      // Fallback or alternative messaging could be attempted here if needed
    }

    // Attempt to close the tab
    // Note: This might not always work depending on browser security settings,
    // but should work if the tab was opened via script (window.open or similar).
    // The user message below provides a fallback.
    try {
       window.close();
    } catch (error) {
       console.error('Failed to automatically close the window:', error);
    }

    // Empty dependency array ensures this runs only once on mount
  }, [searchParams]); 

  // Display a message to the user while processing/closing
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">Processing...</p>
      <p className="text-sm text-muted-foreground mt-2">
        Communicating back to the application. This window should close automatically.
      </p>
      <p className="text-xs text-muted-foreground mt-1">
         If it doesn't close, you can manually close this tab.
      </p>
    </div>
  );
}

export default function StripeCallbackPage() {
  // useSearchParams needs to be wrapped in a Suspense boundary
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">Loading Callback...</p>
      </div>
    }>
      <StripeCallbackContent />
    </Suspense>
  );
} 