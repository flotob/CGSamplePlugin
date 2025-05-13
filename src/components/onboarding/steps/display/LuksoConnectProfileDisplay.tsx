'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
import { LuksoConnectProfileSpecificConfig, LuksoConnectProfileVerifiedData } from '@/types/onboarding-steps';
import { LSP3Profile, LSP3ProfileMetadataJSON, LSP3Image } from '@/types/lukso-types';
import { Loader2, CheckCircle, ExternalLinkIcon, UserCircle } from 'lucide-react';
// import { ethers, keccak256 } from 'ethers'; // Keep for hash verification, but comment if not strictly needed now
import { ERC725, ERC725JSONSchema } from '@erc725/erc725.js';
import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';
// import { ERC725YDataKeys } from '@lukso/lsp-smart-contracts'; // Not used if fetching by schema name 'LSP3Profile'
import NextImage from 'next/image';
import onboardInstance from '@/lib/onboard';
import { useLinkCredential, type LinkCredentialPayload } from '@/hooks/useLinkCredential';

interface LuksoConnectProfileDisplayProps {
  step: UserStepProgress;
  onComplete: (verifiedData?: LuksoConnectProfileVerifiedData) => void;
}

const resolveIpfsUrl = (url: string): string => {
  if (url.startsWith('ipfs://')) {
    return `https://api.universalprofile.cloud/ipfs/${url.substring(7)}`;
  }
  return url;
};

const LuksoConnectProfileDisplay: React.FC<LuksoConnectProfileDisplayProps> = ({ step, onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedUPAddress, setConnectedUPAddress] = useState<string | null>(
    (step.verified_data as LuksoConnectProfileVerifiedData)?.upAddress || null
  );

  const [profileData, setProfileData] = useState<LSP3Profile | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const { mutateAsync: linkCredential, isPending: isLinkingCredential } = useLinkCredential();

  const specificConfig = step.config?.specific as LuksoConnectProfileSpecificConfig | undefined;
  const promptText = specificConfig?.customPrompt || 'Please connect your LUKSO Universal Profile to continue.';
  
  const handleFinalizeConnectionAndLink = useCallback(async (upAddress: string, fetchedProfileData: LSP3Profile | null) => {
    try {
      const payload: LinkCredentialPayload = {
        platform: 'LUKSO_UP',
        external_id: upAddress,
        username: fetchedProfileData?.name || upAddress,
      };
      await linkCredential(payload);
      onComplete({ upAddress }); 
    } catch (linkingError) {
      console.error("LUKSO UP credential linking failed (toast shown by hook):", linkingError);
      onComplete({ upAddress }); 
    }
  }, [linkCredential, onComplete]);

  const fetchProfileMetadata = useCallback(async (upAddress: string, connectedChainIdHex: string) => {
    setIsLoadingMetadata(true);
    setProfileData(null);
    setMetadataError(null);
    let fetchedProfileForFinalize: LSP3Profile | null = null;

    console.log(`[LUKSO Profile Fetch] Starting for UP: ${upAddress} on Chain ID (hex): ${connectedChainIdHex}`);

    try {
      const mainnetChainIdDecimalString = process.env.NEXT_PUBLIC_LUKSO_MAINNET_CHAIN_ID!;
      let rpcUrl = "";
      const connectedChainIdDecimal = parseInt(connectedChainIdHex, 16);

      if (connectedChainIdDecimal.toString() === mainnetChainIdDecimalString) {
        rpcUrl = process.env.NEXT_PUBLIC_LUKSO_MAINNET_RPC_URL!;
        console.log("[LUKSO Profile Fetch] Using MAINNET RPC:", rpcUrl);
      } else {
        setMetadataError(`Profile data lookup is configured for LUKSO Mainnet. Your wallet is connected to chain ID ${connectedChainIdHex}.`);
        setIsLoadingMetadata(false);
        handleFinalizeConnectionAndLink(upAddress, null);
        return;
      }
      
      const erc725Instance = new ERC725(
        LSP3ProfileSchema as ERC725JSONSchema[],
        upAddress,
        rpcUrl,
        { ipfsGateway: 'https://api.universalprofile.cloud/ipfs/' }
      );
      
      const fetchedDataOutput = await erc725Instance.fetchData('LSP3Profile') as { key: string, name: string, value: LSP3ProfileMetadataJSON | null } | null;
      
      let actualMetadataValue: LSP3ProfileMetadataJSON | null = null;

      if (fetchedDataOutput && fetchedDataOutput.value) {
         actualMetadataValue = fetchedDataOutput.value;
      } else {
        console.warn('[LUKSO Profile Fetch] fetchData did not return the expected structure or value is null:', fetchedDataOutput);
      }

      if (actualMetadataValue && actualMetadataValue.LSP3Profile) {
        fetchedProfileForFinalize = actualMetadataValue.LSP3Profile;
        setProfileData(fetchedProfileForFinalize);
        
        // Optional: Hash verification (uncomment ethers and keccak256 imports if used)
        /*
        const verifiableURI = fetchedDataOutput?.value; // This would be the VerifiableURI object if getData was used.
                                                       // With fetchData, the value is the resolved JSON.
                                                       // To verify hash with fetchData, you would need to get the on-chain VerifiableURI separately with getData first.
        if (verifiableURI && (verifiableURI as any).hash && actualMetadataValue) { // Basic check
          const jsonString = JSON.stringify(actualMetadataValue); 
          const calculatedHash = keccak256(ethers.toUtf8Bytes(jsonString));
          if (calculatedHash.toLowerCase() !== (verifiableURI as any).hash.toLowerCase()) {
            console.warn(
              `LSP3Profile JSON hash mismatch. Expected: ${(verifiableURI as any).hash}, Calculated: ${calculatedHash}.`
            );
          }
        }
        */
      } else {
        setMetadataError('LSP3Profile data not found or in unexpected format after fetch.');
        console.log('[LUKSO Profile Fetch] Processed fetchedDataOutput (was null or invalid structure):', fetchedDataOutput);
      }
    } catch (e) {
      console.error("Error fetching LUKSO profile metadata:", e);
      setMetadataError(e instanceof Error ? e.message : 'Failed to load profile details.');
    } finally {
      setIsLoadingMetadata(false);
      handleFinalizeConnectionAndLink(upAddress, fetchedProfileForFinalize);
    }
  }, [handleFinalizeConnectionAndLink]);

  useEffect(() => {
    if (step.completed_at && connectedUPAddress) {
      if (!profileData && !isLoadingMetadata && !metadataError && !isLinkingCredential) {
        const [primaryWallet] = onboardInstance.state.get().wallets;
        if (primaryWallet && primaryWallet.provider && primaryWallet.accounts[0]?.address === connectedUPAddress) {
          const connectedChainIdHex = primaryWallet.chains[0].id;
          fetchProfileMetadata(connectedUPAddress, connectedChainIdHex);
        } else {
          console.warn("LuksoConnectProfileDisplay: Could not auto-trigger metadata fetch/link on load for previously completed step. Wallet provider/chain not ready or address mismatch.");
        }
      }
    }
  }, [connectedUPAddress, step.completed_at, profileData, isLoadingMetadata, metadataError, isLinkingCredential, fetchProfileMetadata]);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    setProfileData(null);
    setMetadataError(null);
    try {
      const wallets = await onboardInstance.connectWallet(); 
      if (wallets[0] && wallets[0].accounts[0] && wallets[0].provider) {
        const upAddress = wallets[0].accounts[0].address;
        const connectedChainIdHex = wallets[0].chains[0].id;
        
        setConnectedUPAddress(upAddress);
        fetchProfileMetadata(upAddress, connectedChainIdHex);
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
    const profileImg: LSP3Image | undefined = profileData?.profileImage?.find(img => img.url);
    const profileImgUrl = profileImg ? resolveIpfsUrl(profileImg.url) : null;

    return (
      <div className="p-6 bg-card border rounded-lg shadow-sm text-center max-w-md mx-auto">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-700">Profile Connected!</h3>
        
        {isLoadingMetadata && (
          <div className="my-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading profile details...</p>
          </div>
        )}

        {metadataError && !isLoadingMetadata && (
          <div className="my-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            <p>Could not load profile details: {metadataError}</p>
          </div>
        )}

        {profileData && !isLoadingMetadata && (
          <div className="my-4 space-y-3 text-left">
            {profileImgUrl ? (
              <NextImage 
                src={profileImgUrl} 
                alt={profileData.name || 'Profile Image'} 
                width={80} 
                height={80} 
                className="rounded-full mx-auto border-2 border-border shadow-md"
                unoptimized 
              />
            ) : (
              <UserCircle className="h-20 w-20 text-muted-foreground mx-auto" />
            )}
            <div className="text-center">
              <h4 className="text-lg font-semibold text-foreground">{profileData.name || 'Unnamed Profile'}</h4>
              <p className="text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded inline-block mt-1">{connectedUPAddress}</p>
            </div>
            {profileData.description && (
              <p className="text-sm text-muted-foreground text-center whitespace-pre-wrap break-words">
                {profileData.description}
              </p>
            )}
            {profileData.tags && profileData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {profileData.tags.map(tag => (
                  <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {profileData.links && profileData.links.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2 text-center">Links</h5>
                <ul className="space-y-1">
                  {profileData.links.map(link => (
                    <li key={link.url} className="text-center">
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-primary hover:underline inline-flex items-center"
                      >
                        {link.title || link.url} <ExternalLinkIcon className="ml-1 h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          You can proceed to the next step.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-card border rounded-lg shadow-sm text-center max-w-md mx-auto">
      <div className="mb-4">
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

      <Button onClick={handleConnect} disabled={isLoading || isLinkingCredential} className="w-full">
        {isLoading || isLinkingCredential ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
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