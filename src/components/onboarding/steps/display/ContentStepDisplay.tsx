'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery';

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
  const markdownContent = specificConfig?.content || '_'; // Default to underscore if empty/missing?

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {/* Render the markdown content */}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdownContent}
      </ReactMarkdown>
      
      {/* Since this step auto-completes, we don't need user interaction buttons */}
      {/* A message indicating completion might be nice, handled by parent modal state */}
    </div>
  );
}; 