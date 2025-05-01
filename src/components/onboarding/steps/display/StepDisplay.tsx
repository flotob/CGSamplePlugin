'use client';

import React from 'react';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery'; // Assuming StepType definition

// Import specific step display components (examples - create these later)
// import { EnsVerificationStepDisplay } from './display/EnsVerificationStepDisplay';
// import { InfoStepDisplay } from './display/InfoStepDisplay';
// import { MultipleChoiceStepDisplay } from './display/MultipleChoiceStepDisplay';

interface StepDisplayProps {
  step: UserStepProgress;
  stepType: StepType | undefined; // Pass the resolved step type object
  // Add callbacks for completion/error handling later
  // onComplete: (completionData?: Record<string, unknown>) => void;
  // onError: (errorMessage: string) => void;
}

export const StepDisplay: React.FC<StepDisplayProps> = ({
  step,
  stepType,
  // onComplete,
  // onError,
}) => {

  if (!stepType) {
    return <div className="text-destructive p-4">Error: Unknown step type ID: {step.step_type_id}</div>;
  }

  // Dynamically render the correct component based on the step type name
  switch (stepType.name) {
    // case 'ens_verification':
    //   return <EnsVerificationStepDisplay step={step} stepType={stepType} />;
    // case 'info_display':
    //   return <InfoStepDisplay step={step} stepType={stepType} />;
    // case 'multiple_choice':
    //  return <MultipleChoiceStepDisplay step={step} stepType={stepType} />;
    
    // Add cases for other step types here

    default:
      // Placeholder for unhandled step types
      return (
        <div>
          <h3 className="text-lg font-semibold">Unhandled Step Type: {stepType.name}</h3>
          <p>Step ID: {step.id}</p>
          <p>Configuration:</p>
          <pre className="mt-2 p-2 bg-muted/50 rounded text-xs overflow-x-auto">
            {JSON.stringify(step.config, null, 2)}
          </pre>
        </div>
      );
  }
}; 