'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useUserWizardStepsQuery } from '@/hooks/useUserWizardStepsQuery';
import { useStepTypesQuery } from '@/hooks/useStepTypesQuery';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import { StepDisplay } from './steps/display/StepDisplay';

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

  // Effect to determine the starting step index based on progress
  useEffect(() => {
    if (stepsData?.steps) {
      const firstIncompleteIndex = stepsData.steps.findIndex(step => step.completed_at === null);
      // If all are complete, maybe start at the last step? Or first? For now, start at first incomplete or 0.
      setCurrentStepIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0);
    }
  }, [stepsData]); // Run when steps data changes

  // Prevent closing modal by clicking overlay
  const handleInteractOutside = (event: Event) => {
    event.preventDefault();
  };

  const handlePrevious = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (stepsData?.steps) {
      setCurrentStepIndex((prev) => Math.min(stepsData.steps.length - 1, prev + 1));
      // TODO: Add completion logic here later
    }
  };

  const steps = stepsData?.steps;
  const currentStep: UserStepProgress | undefined = steps?.[currentStepIndex];
  const totalSteps = steps?.length ?? 0;

  // Find the StepType object for the current step
  const currentStepType = currentStep && stepTypesData
    ? stepTypesData.step_types.find(t => t.id === currentStep.step_type_id)
    : undefined;

  // Determine if Next button should be disabled (basic check for now)
  const isNextDisabled = currentStepIndex >= totalSteps - 1;
  const isPrevDisabled = currentStepIndex <= 0;

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

    // Render StepDisplay component
    return (
        <div className="flex-1 p-6 overflow-y-auto">
           <StepDisplay step={currentStep} stepType={currentStepType} />
        </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="fixed inset-0 flex flex-col w-screen h-screen max-w-none sm:rounded-none p-0 gap-0 border-0 bg-background text-foreground overflow-hidden"
        onInteractOutside={handleInteractOutside}
      >
        {/* Header Area */}
        <div className="flex items-center justify-between p-4 border-b min-h-[60px]">
          <div>
            <DialogTitle className="text-lg font-semibold">
              {currentStepType ? currentStepType.name.replace(/_/g, ' ') : `Wizard: ${wizardId}`}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {totalSteps > 0 ? `Step ${currentStepIndex + 1} of ${totalSteps}` : 'Loading steps...'}
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close wizard">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Step Content Area */}
        {renderContent()}

        {/* Footer Area (Navigation) - Only show if steps are loaded */}
        {!isLoadingSteps && !stepsError && totalSteps > 0 && (
            <div className="flex items-center justify-between p-4 border-t min-h-[60px]">
               <Button variant="outline" onClick={handlePrevious} disabled={isPrevDisabled}>Previous</Button>
               <Button onClick={handleNext} disabled={isNextDisabled}>Next</Button>
               {/* TODO: Add completion logic/state to Next button */}
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 