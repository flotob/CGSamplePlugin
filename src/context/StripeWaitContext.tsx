'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, ReactNode } from 'react';

// Define the shape of the context data
interface StripeWaitContextType {
  isWaitingModalOpen: boolean;
  isExpectingFocusLoss: boolean; // Flag to know if blur should trigger modal
  showWaitingModal: () => void;
  hideWaitingModal: () => void;
  setExpectingFocusLoss: (expecting: boolean) => void;
}

// Create the context
const StripeWaitContext = createContext<StripeWaitContextType | undefined>(undefined);

// Provider component
export function StripeWaitProvider({ children }: { children: ReactNode }) {
  const [isWaitingModalOpen, setIsWaitingModalOpen] = useState<boolean>(false);
  const [isExpectingFocusLoss, setIsExpectingFocusLoss] = useState<boolean>(false);

  const showWaitingModal = useCallback(() => {
    console.log('[StripeWaitContext] Showing modal.');
    setIsWaitingModalOpen(true);
  }, []);

  const hideWaitingModal = useCallback(() => {
    console.log('[StripeWaitContext] Hiding modal.');
    setIsWaitingModalOpen(false);
  }, []);

  const setExpectingFocusLossCallback = useCallback((expecting: boolean) => {
    console.log(`[StripeWaitContext] Setting expecting focus loss: ${expecting}`);
    setIsExpectingFocusLoss(expecting);
  }, []);

  // Effect to handle the blur event
  useEffect(() => {
    const handleBlur = () => {
      // If we were expecting focus loss (because Stripe nav was just initiated)
      // then show the modal and reset the expectation flag.
      if (isExpectingFocusLoss) {
        console.log('[StripeWaitContext] Window blurred while expecting focus loss. Showing modal.');
        showWaitingModal();
        setExpectingFocusLossCallback(false); // Reset immediately after triggering
      }
      // else {
      //   console.log('[StripeWaitContext] Window blurred, but not expecting focus loss.');
      // }
    };

    // console.log('[StripeWaitContext] Adding blur listener.');
    window.addEventListener('blur', handleBlur);

    // Cleanup
    return () => {
      // console.log('[StripeWaitContext] Removing blur listener.');
      window.removeEventListener('blur', handleBlur);
    };
    // Dependency: Re-run if the expectation flag changes (though handleBlur reads state directly)
    // Also include the callbacks to ensure they are stable refs if used directly.
  }, [isExpectingFocusLoss, showWaitingModal, setExpectingFocusLossCallback]);

  // Memoize the context value
  const value = useMemo(() => ({
    isWaitingModalOpen,
    isExpectingFocusLoss, // Expose this mostly for debugging, hooks won't need it
    showWaitingModal,
    hideWaitingModal,
    setExpectingFocusLoss: setExpectingFocusLossCallback, // Use the memoized callback
  }), [isWaitingModalOpen, isExpectingFocusLoss, showWaitingModal, hideWaitingModal, setExpectingFocusLossCallback]);

  return (
    <StripeWaitContext.Provider value={value}>
      {children}
    </StripeWaitContext.Provider>
  );
}

// Hook to consume the context
export function useStripeWaitContext(): StripeWaitContextType {
  const context = useContext(StripeWaitContext);
  if (context === undefined) {
    throw new Error('useStripeWaitContext must be used within a StripeWaitProvider');
  }
  return context;
} 