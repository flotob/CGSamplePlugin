'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { useProfileDetails } from 'ethereum-identity-kit';
import { Loader2, CheckCircle } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface EnsVerificationStepProps {
  // Props TBD
}

export const EnsVerificationStep: React.FC<EnsVerificationStepProps> = () => {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return (
      <p className="text-red-600 p-4 border border-destructive rounded-md bg-destructive/10">
        <span className="font-medium">Wallet Not Connected.</span> Please connect your wallet to verify your ENS name.
      </p>
    );
  }

  return <EnsVerificationCore address={address} />;
};

interface EnsVerificationCoreProps {
  address: `0x${string}`;
}

const EnsVerificationCore: React.FC<EnsVerificationCoreProps> = ({ address }) => {
  const {
    ens: ensDetails,
    detailsLoading,
  } = useProfileDetails({
    addressOrName: address,
  });

  const ensName = ensDetails?.name;

  React.useEffect(() => {
    if (!detailsLoading) {
      console.log('ENS Details:', ensDetails);
      const isVerified = !!ensName;
      console.log('ENS Verified Status (any primary name):', isVerified);
      // TODO: Verification logic & callback
    }
  }, [ensDetails, detailsLoading, ensName]);

  if (detailsLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Checking your ENS details...</span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">ENS Verification</h3>
      {ensName ? (
        <div className="flex items-center gap-2 p-3 rounded-md border border-green-600 bg-green-500/10 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p>
            Verified ENS primary name: <strong>{ensName}</strong>
          </p>
        </div>
      ) : (
        <div className="p-3 rounded-md border border-orange-600 bg-orange-500/10 text-orange-700">
          <p className="font-medium mb-1">No Primary ENS Name Set</p>
          <p className="text-sm">
            No primary ENS name (reverse record) was found for address <code>{address}</code>. You may need to set one via an ENS management tool.
          </p>
        </div>
      )}
    </div>
  );
}; 