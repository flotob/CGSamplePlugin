'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Onboard from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import luksoModule from '@lukso/web3-onboard-config'; // Confirmed package name
import { Button } from '@/components/ui/button';
import { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
import { LuksoConnectProfileSpecificConfig, LuksoConnectProfileVerifiedData } from '@/types/onboarding-steps'; // Assuming types will be here
import { Loader2, CheckCircle } from 'lucide-react';

interface LuksoConnectProfileDisplayProps {
  step: UserStepProgress;
  onComplete: (verifiedData?: LuksoConnectProfileVerifiedData) => void;
}

// Initialize Onboard outside the component to avoid re-initialization on re-renders
// Consider moving this to a shared utility or React Context if used elsewhere
const lukso = luksoModule();
const injected = injectedModule({ custom: [lukso] });

const chains = [
  {
    id: process.env.NEXT_PUBLIC_LUKSO_MAINNET_CHAIN_ID!,
    token: 'LYX',
    label: 'LUKSO Mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL!,
  },
  {
    id: process.env.NEXT_PUBLIC_LUKSO_TESTNET_CHAIN_ID!,
    token: 'LYXt',
    label: 'LUKSO Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_LUKSO_TESTNET_RPC_URL!,
  },
];

const onboard = Onboard({
  wallets: [injected],
  chains,
  appMetadata: {
    name: 'Your App Name', // TODO: Replace with your actual app name from a constant or env var
    description: 'Connect your Universal Profile to proceed.',
    // TODO: Add other app metadata like icons, logo, etc.
  },
  accountCenter: {
    desktop: { enabled: false }, // Keeping it simple for now
    mobile: { enabled: false },
  }
});

const LuksoConnectProfileDisplay: React.FC<LuksoConnectProfileDisplayProps> = ({ step, onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedUPAddress, setConnectedUPAddress] = useState<string | null>(
    (step.verified_data as LuksoConnectProfileVerifiedData)?.upAddress || null
  );

  const specificConfig = step.config?.specific as LuksoConnectProfileSpecificConfig | undefined;
  const promptText = specificConfig?.customPrompt || 'Please connect your LUKSO Universal Profile to continue.';

  useEffect(() => {
    // If step is already completed and we have the address, reflect it.
    if (step.completed_at && (step.verified_data as LuksoConnectProfileVerifiedData)?.upAddress) {
      setConnectedUPAddress((step.verified_data as LuksoConnectProfileVerifiedData).upAddress);
    }
  }, [step.completed_at, step.verified_data]);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const wallets = await onboard.connectWallet();
      if (wallets[0] && wallets[0].accounts[0]) {
        const upAddress = wallets[0].accounts[0].address;
        setConnectedUPAddress(upAddress);
        onComplete({ upAddress });
      } else {
        setError('Connection cancelled or no Universal Profile selected.');
      }
    } catch (e) {
      console.error("Error connecting LUKSO UP:", e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during connection.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step.completed_at && connectedUPAddress) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center shadow-sm">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-green-700">Profile Connected!</h3>
        <p className="text-sm text-green-600 mt-1">
          Universal Profile: <span className="font-mono bg-green-100 px-1 py-0.5 rounded">{connectedUPAddress}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          You can proceed to the next step.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-card border rounded-lg shadow-sm text-center max-w-md mx-auto">
      <div className="mb-4">
        {/* You might want to add a LUKSO logo or an icon here */}
        <h3 className="text-xl font-semibold text-foreground">Connect your Universal Profile</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {promptText}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
          <p>Connection Error: {error}</p>
        </div>
      )}

      <Button onClick={handleConnect} disabled={isLoading} className="w-full">
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
        ) : (
          'Connect with LUKSO UP'
        )}
      </Button>

      <p className="text-xs text-muted-foreground mt-4">
        You will be prompted to connect via the LUKSO Universal Profile browser extension.
      </p>
    </div>
  );
};

export default LuksoConnectProfileDisplay; 