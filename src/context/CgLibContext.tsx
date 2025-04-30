'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CgPluginLib } from '@common-ground-dao/cg-plugin-lib';

// Define the shape of the context data
interface CgLibContextType {
  cgInstance: CgPluginLib | null;
  isInitializing: boolean;
  initError: Error | null;
  iframeUid: string | null;
}

// Create the context with a default value
const CgLibContext = createContext<CgLibContextType | undefined>(undefined);

// Get the public key from environment variables
const publicKey = process.env.NEXT_PUBLIC_PUBKEY as string;

// Provider component
export function CgLibProvider({ children }: { children: React.ReactNode }) {
  const [cgInstance, setCgInstance] = useState<CgPluginLib | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [initError, setInitError] = useState<Error | null>(null);

  const searchParams = useSearchParams();
  const iframeUid = useMemo(() => searchParams.get('iframeUid'), [searchParams]);

  useEffect(() => {
    if (!publicKey) {
      setInitError(new Error("Public key is not set in the .env file."));
      setIsInitializing(false);
      return;
    }

    if (!iframeUid) {
      // Still waiting for iframeUid from search params, not necessarily an error yet
      // Or, if it consistently stays null, it might indicate the plugin isn't loaded correctly in CG.
      // We could add a timeout or specific handling if needed.
      console.log("Waiting for iframeUid...");
      // Keep isInitializing true until iframeUid is found or determined missing
      return;
    }

    let isMounted = true;
    setIsInitializing(true);
    setInitError(null);

    console.log(`Initializing CgPluginLib with iframeUid: ${iframeUid}`);

    CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)
      .then(instance => {
        if (isMounted) {
          console.log("CgPluginLib initialized successfully.");
          setCgInstance(instance);
          setIsInitializing(false);
        }
      })
      .catch(error => {
        if (isMounted) {
          console.error("CgPluginLib initialization failed:", error);
          setInitError(error);
          setIsInitializing(false);
        }
      });

    return () => {
      isMounted = false;
      // Potential cleanup if CgPluginLib offers a destroy/disconnect method
      // instance?.destroy(); 
    };
  }, [iframeUid]); // Re-run effect if iframeUid changes

  const value = useMemo(() => ({
    cgInstance,
    isInitializing,
    initError,
    iframeUid,
  }), [cgInstance, isInitializing, initError, iframeUid]);

  return (
    <CgLibContext.Provider value={value}>
      {children}
    </CgLibContext.Provider>
  );
}

// Custom hook to use the CgLib context
export function useCgLib(): CgLibContextType {
  const context = useContext(CgLibContext);
  if (context === undefined) {
    throw new Error('useCgLib must be used within a CgLibProvider');
  }
  return context;
} 