'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Add an interface for the postMessage payload
interface StripeCallbackMessage {
  type: 'stripeCallback';
  status: 'success' | 'cancel' | 'portal_return' | 'error';
  data?: { 
    sessionId?: string;
    // Add other potential data fields if needed
  };
  error?: string;
}

function StripeCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get('stripe_status'); 
    const sessionId = searchParams.get('session_id');
    const pluginBaseUrl = process.env.NEXT_PUBLIC_PLUGIN_BASE_URL; // Get plugin origin for postMessage

    console.log('Stripe Callback Page Loaded - Status:', status, 'Session ID:', sessionId);

    let messagePayload: StripeCallbackMessage | null = null; // Use specific type

    if (status === 'success' && sessionId) {
      messagePayload = { type: 'stripeCallback', status: 'success', data: { sessionId: sessionId } };
    } else if (status === 'cancel') {
      messagePayload = { type: 'stripeCallback', status: 'cancel' };
    } else if (status === 'portal_return') {
      messagePayload = { type: 'stripeCallback', status: 'portal_return' };
    } else {
      console.error('Stripe callback page received unknown or missing status:', status);
      messagePayload = { type: 'stripeCallback', status: 'error', error: 'Unknown callback status' };
    }

    // Use window.opener.postMessage to send message back to the original tab
    if (window.opener) {
      if (!pluginBaseUrl) {
        console.error('Cannot send postMessage: NEXT_PUBLIC_PLUGIN_BASE_URL is not set.');
      } else {
          console.log(`Sending postMessage to origin '${pluginBaseUrl}':`, messagePayload);
          try {
              window.opener.postMessage(messagePayload, pluginBaseUrl); // Send to specific origin
          } catch (error) {
             console.error('Error sending postMessage:', error);
          }
      }
    } else {
      console.warn('window.opener not available, cannot send postMessage back to originating tab.');
      // This might happen if the tab wasn't opened via script or if rel=noopener was used.
    }

    // Attempt to close the tab
    try {
       window.close();
    } catch (error) {
       console.error('Failed to automatically close the window:', error);
    }

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