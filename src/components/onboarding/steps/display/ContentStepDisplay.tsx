'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
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
    // Full-height container with scrolling content - improved styles
    <div className={`${styles.markdownContainer} w-full max-w-3xl mx-auto flex-1 flex flex-col text-foreground px-3 sm:px-6 md:px-8 py-4`} style={{minHeight: "100%"}}>
      {/* Ensure markdown content can grow but also overflow with scroll */}
      <div className="prose-sm sm:prose lg:prose-lg dark:prose-invert w-full flex-1 overflow-visible">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownContent}
        </ReactMarkdown>
      </div>
      
      {/* Since this step auto-completes, we don't need user interaction buttons */}
      {/* A message indicating completion might be nice, handled by parent modal state */}
    </div>
  );
}; 