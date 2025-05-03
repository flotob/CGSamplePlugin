'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useUserWizardStepsQuery } from '@/hooks/useUserWizardStepsQuery';
import { useStepTypesQuery } from '@/hooks/useStepTypesQuery';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import { StepDisplay } from './steps/display/StepDisplay';
import { useCompleteStepMutation } from '@/hooks/useCompleteStepMutation';
import { WizardSummaryScreen } from './WizardSummaryScreen';
import { useUserCredentialsQuery } from '@/hooks/useUserCredentialsQuery';
import { useMarkWizardCompleted } from '@/hooks/useMarkWizardCompleted';
import { useCommunityInfoQuery } from '@/hooks/useCommunityInfoQuery';
import { useUserWizardSessionQuery, useUpdateUserWizardSessionMutation } from '@/hooks/useUserWizardStepsQuery';

// Define some type interfaces for better TypeScript support
interface Role {
  id: string;
  title: string;
}

interface WizardSlideshowModalProps {
  wizardId: string;
  open: boolean;
  onClose: () => void;
}

export const WizardSlideshowModal: React.FC<WizardSlideshowModalProps> = ({
  wizardId,
  open,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [hasTriedCompletion, setHasTriedCompletion] = useState<boolean>(false);
  const [isInitialIndexSet, setIsInitialIndexSet] = useState<boolean>(false);
  const { 
    data: stepsData,
    isLoading: isLoadingSteps,
    error: stepsError,
  } = useUserWizardStepsQuery(wizardId);
  const { data: stepTypesData, isLoading: isLoadingTypes } = useStepTypesQuery();
  const credentialsQuery = useUserCredentialsQuery();
  const { data: credentialsData } = credentialsQuery;
  const { data: communityInfoResponse } = useCommunityInfoQuery();

  const { data: sessionData, isSuccess: isSessionLoaded } = useUserWizardSessionQuery(wizardId);
  const updateSessionMutation = useUpdateUserWizardSessionMutation(wizardId);

  const steps = stepsData?.steps;
  const currentStep: UserStepProgress | undefined = steps?.[currentStepIndex];
  const totalSteps = steps?.length ?? 0;
  const allStepsCompleted = steps?.every(step => step.completed_at) || false;

  // Mutation hook for completing a step
  const completeStepMutation = useCompleteStepMutation(wizardId, currentStep?.id);

  // Add the completion mutation hook
  const markCompleted = useMarkWizardCompleted();

  // Find the StepType object for the current step
  const currentStepType = currentStep && stepTypesData
    ? stepTypesData.step_types.find(t => t.id === currentStep.step_type_id)
    : undefined;

  // Effect to determine the starting step index based on session or defaults
  useEffect(() => {
    // Ensure steps are loaded, session state is fetched, and we haven't set the index yet
    if (steps && steps.length > 0 && isSessionLoaded && !isInitialIndexSet) {
      let initialIndex = 0; // Default to first step

      // Try to use session state
      if (sessionData?.last_viewed_step_id) {
        const lastViewedIndex = steps.findIndex(step => step.id === sessionData.last_viewed_step_id);
        if (lastViewedIndex !== -1) {
          initialIndex = lastViewedIndex; // Use the index from session
        } else {
          console.warn('Last viewed step ID from session not found in current steps. Defaulting to first step.');
          // Keep initialIndex = 0
        }
      } else {
        // No session state, determine starting point (e.g., first incomplete or just first)
        // For simplicity now, just default to 0 if no session. Can add first incomplete logic back if needed.
        initialIndex = 0; 
      }

      // Handle the edge case where all steps are completed - go to last step
      if (allStepsCompleted) {
         initialIndex = steps.length - 1;
         // If we want to auto-show summary when resuming on a fully completed wizard:
         // setShowSummary(true); 
      }

      setCurrentStepIndex(initialIndex);
      setIsInitialIndexSet(true); // Mark initial index as set
    }
  }, [steps, isSessionLoaded, sessionData, allStepsCompleted, isInitialIndexSet]); // Dependencies

  // Effect to mark the wizard as completed when all steps are completed
  useEffect(() => {
    if (allStepsCompleted && 
        steps && 
        steps.length > 0 && 
        !markCompleted.isPending && 
        !hasTriedCompletion) {
      
      // Set the flag to prevent infinite loop BEFORE making the API call
      setHasTriedCompletion(true);
      
      // Mark the wizard as completed in the database
      console.log('All steps completed, marking wizard as completed:', wizardId);
      
      markCompleted.mutate(wizardId, {
        onError: (error: Error) => {
          // Keep the hasTriedCompletion flag true even on error to prevent infinite retries
          console.error('Failed to mark wizard as completed:', error);
          // Error toast is handled in the mutation hook
        }
      });
    }
  }, [allStepsCompleted, steps, wizardId, markCompleted, hasTriedCompletion]);

  // --- Add Effect to handle Escape key --- 
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose(); // Call the onClose prop when Escape is pressed
      }
    };

    if (open) { // Only add listener if modal is open
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup function to remove listener when modal closes or component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]); // Dependencies: re-run if open status or onClose function changes
  // --- End Effect --- 

  const goToStep = useCallback((index: number) => {
    if (steps && index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
      
      // --- Trigger session update directly after setting index ---
      const newStepId = steps[index]?.id;
      if (newStepId && !updateSessionMutation.isPending) {
        // console.log('Updating session via goToStep:', newStepId);
        updateSessionMutation.mutate({ stepId: newStepId }, {
          onError: (error) => {
            console.error('Failed to update wizard session state (from goToStep):', error);
            // Session saving is best-effort, no UI blocking needed.
          }
        });
      }
      // --- End session update trigger ---
    }
  }, [steps, updateSessionMutation]); // Add updateSessionMutation to dependencies

  const handlePrevious = useCallback(() => {
    goToStep(currentStepIndex - 1);
  }, [currentStepIndex, goToStep]);

  const handleNext = useCallback(() => {
    // Basic next for now - completion logic will trigger advance via handleCompleteStep
    goToStep(currentStepIndex + 1);
  }, [currentStepIndex, goToStep]);

  // Callback for step components to signal completion
  const handleCompleteStep = useCallback((completionData?: Record<string, unknown>) => {
    if (!currentStep || currentStep.completed_at || completeStepMutation.isPending) return;

    console.log(`Completing step ${currentStep.id} for wizard ${wizardId}`);
    completeStepMutation.mutate(completionData ? { verified_data: completionData } : undefined, {
      onSuccess: () => {
        console.log(`Step ${currentStep.id} completed successfully.`);
        // No longer automatically advancing to next step or closing
        // Instead, we show a success state and let the user control navigation
      },
      onError: (error) => {
        console.error("Mutation error completing step:", error);
        // Error toast is handled within the hook, but could add specific UI feedback here too
      }
    });
  }, [currentStep, completeStepMutation, wizardId]);

  // Determine if Next button should be disabled 
  const isCompleted = !!currentStep?.completed_at;
  const canProceed = isCompleted || !currentStep?.is_mandatory; // Can always proceed if completed or optional
  const isPrevDisabled = currentStepIndex <= 0 || completeStepMutation.isPending;

  // Determine if we should show the summary screen
  const isLastStep = currentStepIndex === totalSteps - 1;

  // New function to handle the view summary button click
  const handleViewSummary = useCallback(() => {
    // Refetch credentials to ensure we have the latest data
    credentialsQuery.refetch();
    setShowSummary(true);
  }, [credentialsQuery]);

  // --- Render Logic --- 

  const renderContent = () => {
    // If we're in summary mode, show the summary screen
    if (showSummary) {
      // Prepare the data for the summary screen
      const completedSteps = steps?.filter(step => step.completed_at) || [];
      
      // Match step types to steps
      const stepsWithTypes = completedSteps.map(step => ({
        ...step,
        stepType: stepTypesData?.step_types.find(t => t.id === step.step_type_id)
      }));
      
      // Get credentials just from this wizard
      const wizardCredentials = credentialsData?.credentials
        .filter(cred => {
          // Match credentials to steps in this wizard that have verified data
          return completedSteps.some(step => {
            const verifiedData = step.verified_data;
            if (!verifiedData) return false;
            
            switch (cred.platform.toUpperCase()) {
              case 'ENS':
                return verifiedData.ensName === cred.external_id;
              case 'DISCORD':
                return verifiedData.discordId === cred.external_id;
              case 'TELEGRAM':
                return verifiedData.telegramId === cred.external_id;
              default:
                return false;
            }
          });
        }) || [];
      
      return (
        <WizardSummaryScreen
          wizardId={wizardId}
          completedSteps={stepsWithTypes}
          credentials={wizardCredentials}
          allCredentials={credentialsData?.credentials || []}
          rolesGranted={markCompleted.earnedRoles.map((roleId: string) => {
            // Try to find role details from communityInfo
            const role = communityInfoResponse?.roles?.find((r: Role) => r.id === roleId);
            return { 
              id: roleId, 
              name: role?.title || 'Community Role'
            };
          })}
          onClose={onClose}
        />
      );
    }
    
    if (isLoadingSteps || isLoadingTypes) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span>Loading Step Details...</span>
        </div>
      );
    }

    if (stepsError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="font-medium">Error loading wizard steps</p>
          <p className="text-sm">{stepsError.message}</p>
        </div>
      );
    }

    if (!steps || steps.length === 0) {
        return <div className="flex-1 p-6">No steps found for this wizard.</div>;
    }

    if (!currentStep) {
        return <div className="flex-1 p-6">Invalid step index.</div>;
    }

    // Render StepDisplay component, passing the completion handler
    return (
        <div className="flex-1 p-6 overflow-y-auto">
           <StepDisplay 
              step={currentStep} 
              stepType={currentStepType} 
              onComplete={handleCompleteStep} 
           />
        </div>
    );
  };

  // Custom modal implementation that works in iframe
  if (!open) return null;
  
  return (
    <div className="wizard-slideshow-modal">
      {/* Custom overlay */}
      <div 
        className="absolute inset-0 bg-black/60 z-50" 
        onClick={(e) => e.preventDefault()}
      />
      
      {/* Custom modal content */}
      <div 
        className="absolute inset-0 z-50 flex flex-col w-full h-full bg-background text-foreground overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Area */}
        <div className="flex items-center justify-between p-4 border-b min-h-[60px]">
          <div>
            {(() => { 
              let stepTitle: string;
              let stepSubtitle: string;

              if (showSummary) {
                stepTitle = "Wizard Completed";
                stepSubtitle = "Summary of your progress";
              } else {
                // Logic for regular step titles (existing logic)
                const presentationConfig = currentStep?.config?.presentation as { headline?: string | null, subtitle?: string | null } | undefined;
                const headline = presentationConfig?.headline;
                const subtitle = presentationConfig?.subtitle;
                const fallbackTitle = currentStepType ? currentStepType.name.replace(/_/g, ' ') : `Step ${currentStepIndex + 1}`;
                stepTitle = headline || fallbackTitle;
                stepSubtitle = subtitle || (totalSteps > 0 ? `Step ${currentStepIndex + 1} of ${totalSteps}` : 'Loading steps...');
              }

              return (
                <>
                  <h2 className="text-lg font-semibold">
                    {stepTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {stepSubtitle}
                  </p>
                </>
              );
            })()}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close wizard">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Step Content Area */}
        {renderContent()}

        {/* Footer Area (Navigation) - Only show if steps are loaded and not in summary mode */}
        {!isLoadingSteps && !isLoadingTypes && !stepsError && totalSteps > 0 && !showSummary && (
          <div className="flex items-center justify-between p-4 border-t min-h-[60px]">
             <Button variant="outline" onClick={handlePrevious} disabled={isPrevDisabled}>Previous</Button>
             <Button 
                onClick={isLastStep && isCompleted ? handleViewSummary : handleNext}
                disabled={!canProceed || completeStepMutation.isPending} 
                className={isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
             >
                {isLastStep && isCompleted ? 'View Summary' : 'Next'}
                {completeStepMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}; 