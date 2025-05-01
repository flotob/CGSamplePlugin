'use client';

import { useState, useCallback } from 'react';
import { useCompleteStepMutation } from '@/hooks/useCompleteStepMutation';
import type { UseMutationOptions } from '@tanstack/react-query';

// Define the type for the variables the mutation function will receive
interface CompleteStepVariables {
  verified_data?: Record<string, unknown>;
}

/**
 * Hook for handling credential verification in onboarding steps.
 * Provides a consistent way to manage state and submit verified credentials.
 * 
 * @param wizardId The ID of the wizard containing the step
 * @param stepId The ID of the step being verified
 * @param options Optional TanStack Query mutation options.
 * @returns Methods and state for credential verification
 */
export function useCredentialVerification(
  wizardId: string,
  stepId: string,
  options?: UseMutationOptions<void, Error, CompleteStepVariables | undefined, unknown>
) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // Use the existing step completion mutation, passing options through
  const completeStepMutation = useCompleteStepMutation(wizardId, stepId, options);
  
  /**
   * Submit credential data for verification.
   * This will mark the step as complete and store the credential.
   * 
   * @param credentialData The credential data to be stored (e.g., ensName, discordId)
   * @returns Promise that resolves when verification is complete
   */
  const verifyCredential = useCallback(async (credentialData: Record<string, unknown>) => {
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      await completeStepMutation.mutateAsync({ 
        verified_data: credentialData 
      });
      
      console.log(`Credential verification successful:`, credentialData);
      return true;
    } catch (err) {
      console.error('Error verifying credential:', err);
      setVerificationError(err instanceof Error ? err.message : 'Verification failed');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [completeStepMutation]);
  
  return {
    isVerifying,
    isPending: completeStepMutation.isPending, // For compatibility with older code
    verificationError,
    verifyCredential
  };
} 