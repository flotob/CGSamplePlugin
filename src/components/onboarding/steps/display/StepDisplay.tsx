'use client';

import React from 'react';
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery'; // Assuming StepType definition
import { cn } from "@/lib/utils"; // Import cn
// Import background types and GradientValue structure
import { PresentationConfig, GradientValue } from '../CommonStepPresentationSettings'; 
// Import the YouTube background component
import { YouTubeBackground } from './YouTubeBackground';

// Import specific step display components
import { EnsVerificationStepDisplay } from './EnsVerificationStepDisplay';
// Import the new content display component
import { ContentStepDisplay } from './ContentStepDisplay';
// import { InfoStepDisplay } from './InfoStepDisplay';
// import { MultipleChoiceStepDisplay } from './MultipleChoiceStepDisplay';

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

  const backgroundStyle: React.CSSProperties = {};
  // Background container classes - remove overflow-y-auto since scrolling will be handled by parent
  let backgroundClasses = "w-full h-full flex-grow flex flex-col relative"; 
  let renderYoutubeBackground = false;
  let youtubeUrl = '';

  if (backgroundType === 'image' && typeof backgroundValue === 'string') {
    backgroundStyle.backgroundImage = `url("${backgroundValue}")`;
    backgroundClasses = cn(backgroundClasses, "bg-cover bg-center");
  } else if (backgroundType === 'color' && typeof backgroundValue === 'string') {
    backgroundStyle.backgroundColor = backgroundValue;
  } else if (backgroundType === 'gradient' && typeof backgroundValue === 'object' && backgroundValue !== null) {
    const grad = backgroundValue as GradientValue; 
    if (grad.color1 && grad.color2 && grad.direction) {
      backgroundStyle.background = `linear-gradient(${grad.direction}, ${grad.color1}, ${grad.color2})`;
    }
  } else if (backgroundType === 'youtube' && typeof backgroundValue === 'string') {
     renderYoutubeBackground = true;
     youtubeUrl = backgroundValue;
     backgroundStyle.backgroundColor = '#000000'; // Fallback color while video loads
  }

  // --- Log calculated styles --- 
  console.log('[StepDisplay] Calculated Style:', backgroundStyle);
  console.log('[StepDisplay] Calculated Classes:', backgroundClasses);

  // --- Handle case where stepType is missing --- 
  if (!stepType) {
    return (
        <div style={backgroundStyle} className={cn(backgroundClasses, "p-4 text-destructive")}>
           Error: Unknown step type ID: {step.step_type_id}
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

  // --- Render the final component --- 
  return (
    <div style={backgroundStyle} className={cn(backgroundClasses)}>
       {/* Overlay for image backgrounds */}
       {(backgroundType === 'image' || backgroundType === 'youtube') && (
          <div className="absolute inset-0 bg-black/40 z-0"></div> 
       )}
       {/* YouTube background player */}
       {renderYoutubeBackground && youtubeUrl && (
          <YouTubeBackground videoUrl={youtubeUrl} />
       )}
       {/* Content wrapper with padding */}
       <div className="relative z-10 w-full h-full flex-grow flex flex-col items-center justify-center p-6"> 
           {stepContentElement}
       </div>
    </div>
  );
}; 