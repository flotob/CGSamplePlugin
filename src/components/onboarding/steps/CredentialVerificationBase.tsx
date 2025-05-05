'use client';

import React from 'react';
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery';
import { LoadingState, ErrorState, SuccessState } from '@/components/ui/verification-states';

export interface CredentialVerificationBaseProps {
  /**
   * Current step data from API
   */
  step: UserStepProgress;

  /**
   * Step type data from API
   */
  stepType?: StepType;

  /**
   * Whether verification is in progress
   */
  isVerifying: boolean;

  /**
   * Error message if verification submission failed (e.g., API error)
   */
  verificationError: string | null;

  /**
   * Error message if initial policy validation failed (e.g., ENS name doesn't match pattern)
   */
  policyValidationError: string | null;

  /**
   * The specific requirement string (e.g., domain pattern) that caused the policy validation error.
   */
  policyRequirement?: string | null;

  /**
   * Function to render custom UI when waiting for user to initiate verification
   */
  renderVerificationUI: () => React.ReactNode;

  /**
   * Function to render custom success UI (optional - will use default if not provided)
   */
  renderSuccessUI?: () => React.ReactNode;

  /**
   * Custom message for success state
   */
  successMessage?: string;

  /**
   * The verified credential to display (e.g., ENS name, Discord username)
   */
  credential?: string;
}

/**
 * Base component for credential verification steps.
 * Handles common states (loading, error, success) consistently.
 */
export const CredentialVerificationBase: React.FC<CredentialVerificationBaseProps> = ({
  step,
  isVerifying,
  verificationError,
  policyValidationError,
  policyRequirement,
  renderVerificationUI,
  renderSuccessUI,
  successMessage = 'Verification Complete',
  credential
}) => {
  // If already completed (from API), show success state
  if (step.completed_at) {
    // Use custom success UI if provided
    if (renderSuccessUI) {
      return <>{renderSuccessUI()}</>;
    }
    
    // Use default success state
    return (
      <SuccessState 
        message={successMessage}
        credential={credential || (step.verified_data?.credential as string)}
      />
    );
  }

  // If policy validation error, show that first
  if (policyValidationError) {
    return (
      <ErrorState 
        message="Requirement Not Met" 
        details={policyValidationError}
        requirement={policyRequirement}
      />
    );
  }

  // If verifying, show loading state
  if (isVerifying) {
    return <LoadingState message="Verifying..." details="This will just take a moment" />;
  }

  // If verification error, show error state
  if (verificationError) {
    return <ErrorState message="Verification Failed" details={verificationError} requirement={policyRequirement} />;
  }

  // Otherwise, render the custom verification UI
  return <>{renderVerificationUI()}</>;
}; 