'use client';

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useProfileDetails } from 'ethereum-identity-kit';
import { Loader2, CheckCircle, Search } from 'lucide-react';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEnsAddress } from 'wagmi';
import { normalize } from 'viem/ens';

interface EnsVerificationStepDisplayProps {
  step: UserStepProgress;
  stepType: StepType;
  onComplete: () => void;
}

export const EnsVerificationStepDisplay: React.FC<EnsVerificationStepDisplayProps> = ({ 
  step, 
  onComplete 
}) => {
  const { address, isConnected } = useAccount();
  
  // Already completed state - show success message
  if (step.completed_at) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 bg-green-100/20 blur-2xl rounded-full w-32 h-32 mx-auto" />
          <CheckCircle className="h-16 w-16 text-green-500/90" />
        </div>
        <h2 className="text-2xl font-medium mt-8 tracking-tight">Verification Complete</h2>
        {step.verified_data && typeof step.verified_data.ensName === 'string' && (
          <p className="text-muted-foreground mt-2 text-sm">
            {step.verified_data.ensName}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {isConnected ? (
        <EnsDashboard 
          address={address} 
          step={step} 
          onComplete={onComplete} 
        />
      ) : (
        <ConnectView />
      )}
    </div>
  );
};

// Minimalist connect view
const ConnectView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] px-8">
      <div className="text-center space-y-6 mb-10">
        <h1 className="text-2xl font-medium tracking-tight">Connect Wallet</h1>
        <p className="text-muted-foreground/80 text-sm max-w-xs mx-auto">
          Connect your wallet with an ENS name to continue
        </p>
      </div>
      
      <div className="relative">
        <div className="absolute -inset-4 bg-blue-100/20 blur-xl rounded-2xl -z-10" />
        <ConnectButton />
      </div>
    </div>
  );
};

// Dashboard view (post-connection)
const EnsDashboard: React.FC<{ 
  address: `0x${string}` | undefined; 
  step: UserStepProgress;
  onComplete: () => void; 
}> = ({ address, step, onComplete }) => {
  if (!address) return null;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with wallet */}
      <div className="flex justify-end p-6">
        <div className="relative">
          <div className="absolute -inset-3 bg-blue-50/20 blur-lg rounded-2xl -z-10" />
          <ConnectButton />
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <EnsStatusView address={address} step={step} onComplete={onComplete} />
      </div>
    </div>
  );
};

// ENS Lookup component
const EnsLookup: React.FC = () => {
  const [ensName, setEnsName] = useState<string>('');
  const [normalizedEnsName, setNormalizedEnsName] = useState<string>('');
  const [isValidName, setIsValidName] = useState<boolean>(true);
  
  // ENS address resolution - only run query when we have a normalized name
  const { data: resolvedAddress, isLoading } = useEnsAddress({
    name: normalizedEnsName || undefined, // Only pass name when it exists
    chainId: 1,
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnsName(e.target.value);
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (ensName) {
        const normalized = normalize(ensName);
        setNormalizedEnsName(normalized);
        setIsValidName(true);
      } else {
        setNormalizedEnsName('');
      }
    } catch (error) {
      console.error('Invalid ENS name:', error);
      setIsValidName(false);
      setNormalizedEnsName('');
    }
  };
  
  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 w-full max-w-md mx-auto border border-slate-100 shadow-sm">
      <h3 className="text-lg font-medium mb-4">Find Address by ENS Name</h3>
      
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="vitalik.eth"
              value={ensName}
              onChange={handleInputChange}
              className={`w-full p-2 pl-3 pr-10 border ${!isValidName ? 'border-red-300' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50`}
            />
            {!isValidName && (
              <p className="text-xs text-red-500 mt-1">Invalid ENS name format</p>
            )}
          </div>
          <button 
            type="submit" 
            className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </form>
      
      {isLoading && (
        <div className="flex items-center justify-center mt-6 py-4">
          <Loader2 className="h-5 w-5 text-primary animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Looking up address...</span>
        </div>
      )}
      
      {!isLoading && normalizedEnsName && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-sm font-medium mb-1">{normalizedEnsName}</p>
          {resolvedAddress ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Connect this wallet to verify:</p>
              <div className="bg-white p-2 rounded border border-slate-100 font-mono text-xs break-all">
                {resolvedAddress}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No address found for this ENS name</p>
          )}
        </div>
      )}
    </div>
  );
};

// ENS Status View
const EnsStatusView: React.FC<{ 
  address: `0x${string}`; 
  step: UserStepProgress;
  onComplete: () => void;
}> = ({ address, step, onComplete }) => {
  const {
    ens: ensDetails,
    detailsLoading,
  } = useProfileDetails({ addressOrName: address });

  const hasPrimaryEns = !!ensDetails?.name;

  useEffect(() => {
    if (!detailsLoading && hasPrimaryEns && !step.completed_at) {
      console.log('ENS Verification Successful, calling onComplete for step:', step.id);
      onComplete();
    }
  }, [detailsLoading, hasPrimaryEns, onComplete, step.id, step.completed_at]);

  if (detailsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-50/20 blur-2xl rounded-full w-24 h-24 -z-10" />
          <Loader2 className="h-14 w-14 text-primary/70 animate-spin" />
        </div>
        <h2 className="text-xl font-medium mt-8 tracking-tight">Checking ENS Records</h2>
        <p className="text-muted-foreground/80 text-sm mt-2">This will just take a moment</p>
      </div>
    );
  }

  if (hasPrimaryEns) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm">
        <div className="relative">
          <div className="absolute inset-0 bg-green-100/30 blur-2xl rounded-full w-28 h-28 -z-10" />
          <CheckCircle className="h-16 w-16 text-green-500/90" />
        </div>
        <h2 className="text-2xl font-medium mt-8 tracking-tight">ENS Name Verified</h2>
        <div className="mt-6 bg-white/40 backdrop-blur-sm border border-green-100/80 px-8 py-3 rounded-full shadow-sm">
          <span className="text-lg font-medium text-green-800">{ensDetails.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl px-6">
      <div className="text-center mb-12">
        <div className="relative mb-6 inline-block">
          <div className="absolute inset-0 bg-amber-100/20 blur-2xl rounded-full w-24 h-24 -z-10" />
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber-500/80">
            <path d="M12 16H12.01M12 8V12M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-2xl font-medium tracking-tight">No ENS Name Found</h2>
        <p className="text-muted-foreground/80 text-sm mt-3 mb-10 max-w-sm mx-auto">
          This wallet doesn&apos;t have a primary ENS name
        </p>
      </div>
      
      {/* ENS Lookup feature */}
      <div className="mt-8">
        <EnsLookup />
      </div>
    </div>
  );
};