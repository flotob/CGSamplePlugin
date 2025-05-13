'use client';

import React from 'react';
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery'; // Assuming StepType definition
// import { cn } from "@/lib/utils"; // Removed unused import
// Import background types and GradientValue structure
import { PresentationConfig, GradientValue } from '../CommonStepPresentationSettings'; 
// Import the YouTube background component
import { YouTubeBackground } from './YouTubeBackground';

// Import specific step display components
import { EnsVerificationStepDisplay } from './EnsVerificationStepDisplay';
// Import the new content display component
import { ContentStepDisplay } from './ContentStepDisplay';
// Import the new basic quiz display component
import QuizmasterBasicDisplay from './QuizmasterBasicDisplay';
// Import the new AI quiz display component
import QuizmasterAiDisplay from './QuizmasterAiDisplay';
// import { InfoStepDisplay } from './InfoStepDisplay'; // Commented out potentially incorrect import
// import { MultipleChoiceStepDisplay } from './MultipleChoiceStepDisplay';
import LuksoConnectProfileDisplay from './LuksoConnectProfileDisplay'; // Added import

interface StepDisplayProps {
  step: UserStepProgress;
  stepType: StepType | undefined; // Pass the resolved step type object
  // Add callbacks for completion/error handling later
  onComplete: (completionData?: Record<string, unknown>) => void; // Added arg type based on usage
  // onError: (errorMessage: string) => void;
}

export const StepDisplay: React.FC<StepDisplayProps> = ({
  step,
  stepType,
  onComplete,
  // onError,
}) => {

  // Log received configuration
  console.log('[StepDisplay] Received step config:', step.config?.presentation);

  const presentationConfig = step.config?.presentation as PresentationConfig | undefined;
  const backgroundType = presentationConfig?.backgroundType;
  const backgroundValue = presentationConfig?.backgroundValue;

  // Determine background style based on type
  let bgStyle = {};
  let renderYoutubeBackground = false;
  let youtubeUrl = '';
  
  if (backgroundType === 'image' && typeof backgroundValue === 'string') {
    bgStyle = {
      background: `url("${backgroundValue}")`,
    };
  } else if (backgroundType === 'color' && typeof backgroundValue === 'string') {
    bgStyle = {
      backgroundColor: backgroundValue,
    };
  } else if (backgroundType === 'gradient' && typeof backgroundValue === 'object' && backgroundValue !== null) {
    const grad = backgroundValue as GradientValue; 
    if (grad.color1 && grad.color2 && grad.direction) {
      bgStyle = {
        background: `linear-gradient(${grad.direction}, ${grad.color1}, ${grad.color2})`,
      };
    }
  } else if (backgroundType === 'youtube' && typeof backgroundValue === 'string') {
     renderYoutubeBackground = true;
     youtubeUrl = backgroundValue;
     bgStyle = {
       backgroundColor: '#000000', // Fallback color while video loads
     };
  }

  // --- Handle case where stepType is missing --- 
  if (!stepType) {
    return (
      <div className="flex flex-col w-full h-full">
        <div className="wizard-background" style={{ backgroundColor: '#000' }} />
        <div className="flex-1 overflow-y-auto z-10 relative h-full flex flex-col">
          <div className="flex-1 flex flex-col items-center p-4">
            <div className="p-4 text-destructive">
              Error: Unknown step type ID: {step.step_type_id}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Determine the step content based on type --- 
  let stepContentElement: React.ReactNode;
  switch (stepType.name) {
    case 'ens':
      stepContentElement = <EnsVerificationStepDisplay step={step} stepType={stepType} onComplete={onComplete} />;
      break;
    case 'content':
      stepContentElement = <ContentStepDisplay step={step} stepType={stepType} onComplete={onComplete} />;
      break;
    case 'quizmaster_basic':
      stepContentElement = <QuizmasterBasicDisplay step={step} onComplete={onComplete} />;
      break;
    case 'quizmaster_ai':
      stepContentElement = <QuizmasterAiDisplay step={step} onComplete={onComplete} />;
      break;
    case 'lukso_connect_profile':
      stepContentElement = <LuksoConnectProfileDisplay step={step} onComplete={onComplete} />;
      break;
    default:
      stepContentElement = (
        <div className="p-4 bg-background/80 rounded m-4 max-w-prose mx-auto">
          <h3 className="text-lg font-semibold">Unhandled Step Type: {stepType.name}</h3>
          <p>Step ID: {step.id}</p>
          <p>Configuration:</p>
          <pre className="mt-2 p-2 bg-muted/50 rounded text-xs overflow-x-auto">
            {JSON.stringify(step.config, null, 2)}
          </pre>
        </div>
      );
      break;
  }

  // --- Render the final component with fixed height issues --- 
  return (
    <div className="flex flex-col w-full h-full absolute inset-0">
      {/* Background using CSS class for full coverage */}
      <div className="wizard-background" style={bgStyle} />
      
      {/* Overlay for image/video backgrounds */}
      {(backgroundType === 'image' || backgroundType === 'youtube') && (
        <div className="wizard-background bg-black/40" />
      )}
      
      {/* YouTube background if needed */}
      {renderYoutubeBackground && youtubeUrl && (
        <YouTubeBackground videoUrl={youtubeUrl} />
      )}
      
      {/* Content container - improved styles for better height and scrolling */}
      <div className="absolute inset-0 overflow-y-auto z-10 flex flex-col" style={{height: "100%"}}>
        <div className="flex-1 flex flex-col items-center justify-center py-4 px-4 md:py-6 md:px-6 min-h-[100%]">
          {stepContentElement}
        </div>
      </div>
    </div>
  );
}; 