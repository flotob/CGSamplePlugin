'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

// Define the shape of the context data
interface WizardSlideshowContextType {
  activeSlideshowWizardId: string | null;
  setActiveSlideshowWizardId: (wizardId: string | null) => void;
}

// Create the context with a default undefined value to ensure provider usage
const WizardSlideshowContext = createContext<WizardSlideshowContextType | undefined>(undefined);

// Provider component
export function WizardSlideshowProvider({ children }: { children: React.ReactNode }) {
  const [activeSlideshowWizardId, setActiveSlideshowWizardId] = useState<string | null>(null);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    activeSlideshowWizardId,
    setActiveSlideshowWizardId,
  }), [activeSlideshowWizardId]);

  return (
    <WizardSlideshowContext.Provider value={value}>
      {children}
    </WizardSlideshowContext.Provider>
  );
}

// Custom hook to use the WizardSlideshow context
export function useWizardSlideshow(): WizardSlideshowContextType {
  const context = useContext(WizardSlideshowContext);
  if (context === undefined) {
    throw new Error('useWizardSlideshow must be used within a WizardSlideshowProvider');
  }
  return context;
} 