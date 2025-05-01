'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useUserWizardStepsQuery } from '@/hooks/useUserWizardStepsQuery';
import { useStepTypesQuery } from '@/hooks/useStepTypesQuery';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import { StepDisplay } from './steps/display/StepDisplay';
import { useCompleteStepMutation } from '@/hooks/useCompleteStepMutation';
import { cn } from "@/lib/utils";

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
  const { 
    data: stepsData,
    isLoading: isLoadingSteps,
    error: stepsError,
    refetch: refetchSteps // Might need later
  } = useUserWizardStepsQuery(wizardId);
  const { data: stepTypesData, isLoading: isLoadingTypes } = useStepTypesQuery();

  const steps = stepsData?.steps;
  const currentStep: UserStepProgress | undefined = steps?.[currentStepIndex];
  const totalSteps = steps?.length ?? 0;

  // Mutation hook for completing a step
  const completeStepMutation = useCompleteStepMutation(wizardId, currentStep?.id);

  // Find the StepType object for the current step
  const currentStepType = currentStep && stepTypesData
    ? stepTypesData.step_types.find(t => t.id === currentStep.step_type_id)
    : undefined;

  // Effect to determine the starting step index based on progress
  useEffect(() => {
    if (steps) {
      const firstIncompleteIndex = steps.findIndex(step => step.completed_at === null);
      setCurrentStepIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0);
    }
  }, [steps]); // Run when steps array changes

  // Prevent closing modal by clicking overlay
  const handleInteractOutside = (event: Event) => {
    event.preventDefault();
  };

  const goToStep = useCallback((index: number) => {
    if (steps && index >= 0 && index < steps.length) {
        setCurrentStepIndex(index);
    }
  }, [steps]);

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
        // Advance to next step only on successful mutation
        if (currentStepIndex < totalSteps - 1) {
           goToStep(currentStepIndex + 1);
        } else {
           // Last step completed - potentially show success message and close
           console.log('Wizard finished!');
           onClose(); // Close modal for now
        }
      },
      onError: (error) => {
        console.error("Mutation error completing step:", error);
        // Error toast is handled within the hook, but could add specific UI feedback here too
      }
    });
  }, [currentStep, completeStepMutation, wizardId, currentStepIndex, totalSteps, onClose, goToStep]);

  // Determine if Next button should be disabled 
  const isCompleted = !!currentStep?.completed_at;
  const canProceed = isCompleted || !currentStep?.is_mandatory; // Can always proceed if completed or optional (simplification)
  const isNextDisabled = currentStepIndex >= totalSteps - 1 || completeStepMutation.isPending || !canProceed;
  const isPrevDisabled = currentStepIndex <= 0 || completeStepMutation.isPending;

  // --- Render Logic --- 

  const renderContent = () => {
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
            <h2 className="text-lg font-semibold">
              {currentStepType ? currentStepType.name.replace(/_/g, ' ') : `Wizard: ${wizardId}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {totalSteps > 0 ? `Step ${currentStepIndex + 1} of ${totalSteps}` : 'Loading steps...'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close wizard">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Step Content Area */}
        {renderContent()}

        {/* Footer Area (Navigation) - Only show if steps are loaded */}
        {!isLoadingSteps && !isLoadingTypes && !stepsError && totalSteps > 0 && (
          <div className="flex items-center justify-between p-4 border-t min-h-[60px]">
             <Button variant="outline" onClick={handlePrevious} disabled={isPrevDisabled}>Previous</Button>
             <Button 
                onClick={handleNext}
                disabled={isNextDisabled} 
             >
                {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                {completeStepMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}; 