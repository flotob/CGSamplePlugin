'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery';
// Import the CSS module
import styles from './ContentStepDisplay.module.css';

// Props expected by this specific display component
interface ContentStepDisplayProps {
  step: UserStepProgress;
  stepType: StepType; // Assuming stepType is always defined here
  onComplete: () => void; // Function to call when the step is considered "complete"
}

// Define the expected structure within step.config.specific for content steps
interface ContentConfig {
  content?: string;
}

export const ContentStepDisplay: React.FC<ContentStepDisplayProps> = ({
  step,
  stepType,
  onComplete,
}) => {
  // Automatically mark this step as complete when it renders
  // Only call onComplete once by checking if it's already completed
  useEffect(() => {
    if (!step.completed_at) {
      onComplete();
    }
    // Dependency array includes onComplete and completed_at status
    // to potentially re-run if the completion status changes externally,
    // though unlikely for a static content slide.
  }, [onComplete, step.completed_at]);

  // Extract content from config
  const specificConfig = step.config?.specific as ContentConfig | undefined;
  const markdownContent = specificConfig?.content || ''; // Default to empty string now

  return (
    // Apply the container class from the CSS module
    <div className={`${styles.markdownContainer} w-full max-w-none text-foreground px-12 py-8 md:px-16 lg:px-20`}>
      {/* Render the markdown content - no components prop needed */}
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
      >
        {markdownContent}
      </ReactMarkdown>
      
      {/* Since this step auto-completes, we don't need user interaction buttons */}
      {/* A message indicating completion might be nice, handled by parent modal state */}
    </div>
  );
}; 