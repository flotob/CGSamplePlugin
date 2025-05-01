'use client';

import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useProfileDetails, ENSProfile } from 'ethereum-identity-kit';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery';

interface EnsVerificationStepDisplayProps {
  step: UserStepProgress;
  stepType: StepType; // Expect stepType to be defined here
  onComplete: () => void; // Callback to signal completion
}

// Inner component to conditionally call the hook
const EnsChecker: React.FC<{ 
  address: `0x${string}`;
  step: UserStepProgress;
  onComplete: () => void;
}> = ({ address, step, onComplete }) => {
  const {
    ens: ensDetails,
    detailsLoading,
  } = useProfileDetails({ addressOrName: address }); // Hook called only when address is defined

  const hasPrimaryEns = !!ensDetails?.name;

  useEffect(() => {
    if (!detailsLoading && hasPrimaryEns && !step.completed_at) {
      console.log('ENS Verification Successful, calling onComplete for step:', step.id);
      onComplete();
    }
  }, [detailsLoading, hasPrimaryEns, onComplete, step.id, step.completed_at]);

  if (detailsLoading) {
    return (
      <div className="flex items-center justify-center space-x-2 p-4">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Checking your ENS details for <code>{address}</code>...</span>
      </div>
    );
  }

  if (hasPrimaryEns) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md border border-green-600 bg-green-500/10 text-green-700">
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
        <p>Verified ENS primary name: <strong>{ensDetails.name}</strong></p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-orange-600 bg-orange-500/10 text-orange-700 rounded-md">
      <p className="font-medium mb-1 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> No Primary ENS Name Set</p>
      <p className="text-sm">
        No primary ENS name (reverse record) was found for address <code>{address}</code>. You may need to set one via an ENS management tool like the official ENS App.
      </p>
      <p className="text-sm mt-2">Once set, return here to complete this step.</p>
    </div>
  );
};

export const EnsVerificationStepDisplay: React.FC<EnsVerificationStepDisplayProps> = ({ 
  step, 
  stepType, 
  onComplete 
}) => {
  const { address, isConnected } = useAccount();

  // 1. Already Completed State
  if (step.completed_at) {
    const verifiedName = typeof step.verified_data?.ensName === 'string' 
                         ? step.verified_data.ensName 
                         : 'Yes';
    return (
      <div className="flex items-center gap-2 p-3 rounded-md border border-green-600 bg-green-500/10 text-green-700">
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
        <p>ENS requirement already met (Verified: {verifiedName}).</p>
      </div>
    );
  }

  // 2. Wallet Not Connected State
  if (!isConnected) {
    return (
      <div className="p-4 border border-orange-600 bg-orange-500/10 text-orange-700 rounded-md">
        <p className="font-medium mb-1 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> Wallet Not Connected</p>
        <p className="text-sm">Please connect your wallet using the button in the header to verify your ENS name.</p>
      </div>
    );
  }
  
  // 3. Wallet Connected, Address Available: Render checker
  if (isConnected && address) {
     return <EnsChecker address={address} step={step} onComplete={onComplete} />;
  }

  // 4. Wallet Connected, No Address (shouldn't usually happen with wagmi)
  return (
    <div className="p-4 border border-orange-600 bg-orange-500/10 text-orange-700 rounded-md">
       <p className="font-medium mb-1 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> Wallet Connected, Address Unavailable</p>
       <p className="text-sm">Could not retrieve your wallet address.</p>
    </div>
  );
}; 