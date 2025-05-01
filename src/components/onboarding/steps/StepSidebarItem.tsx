'use client';

import React from 'react';
import { Step, useDeleteStep } from '@/hooks/useStepsQuery';
import { StepType } from '@/hooks/useStepTypesQuery';

interface StepSidebarItemProps {
  wizardId: string;
  step: Step;
  stepType: StepType | undefined;
  isActive: boolean;
  setActiveStepId: (id: string) => void;
  onDeleted: () => void; // Callback after successful deletion
}

export const StepSidebarItem: React.FC<StepSidebarItemProps> = ({
  wizardId,
  step,
  stepType,
  isActive,
  setActiveStepId,
  onDeleted
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { mutateAsync: deleteStep } = useDeleteStep(wizardId, step.id);

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteStep();
      onDeleted(); // Notify parent
    } catch (error) {
      console.error('Failed to delete step:', error);
      // Handle error display if needed
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      key={step.id}
      className={`relative group flex flex-col items-center rounded-lg shadow-sm px-2 py-3 cursor-pointer transition-colors border ${isActive ? 'bg-card border-primary ring-2 ring-primary/30' : 'bg-card hover:bg-accent border-border'}`}
      onClick={() => setActiveStepId(step.id)}
      style={{ minHeight: 64 }}
    >
      <button
        className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-destructive bg-card rounded-full p-1 hover:bg-destructive/10"
        onClick={handleDeleteClick}
        disabled={isDeleting}
        aria-label="Remove step"
        tabIndex={-1}
      >
        {isDeleting ? <span className="animate-spin">⏳</span> : <span className="text-lg">–</span>}
      </button>
      <div className="w-40 h-10 flex flex-col items-center justify-center bg-background rounded border border-dashed border-border mb-1">
        <span className="font-semibold text-sm text-primary">
          {stepType ? stepType.name.replace(/_/g, ' ') : 'Step'}
        </span>
      </div>
      <div className="text-xs text-muted-foreground text-center truncate w-full">
        {stepType?.description || 'No description'}
      </div>
    </div>
  );
}; 