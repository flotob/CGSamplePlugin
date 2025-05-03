'use client';

import React from 'react';
import { Step, useDeleteStep } from '@/hooks/useStepsQuery';
import { StepType } from '@/hooks/useStepTypesQuery';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical } from 'lucide-react';

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
  const deleteStep = useDeleteStep(wizardId, step.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteStep.mutate(undefined, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onDeleted();
      },
    });
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  // Use label for display, fallback to formatted name
  const stepTypeDisplay = stepType ? (stepType.label || stepType.name.replace(/_/g, ' ')) : 'Loading type...';

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group relative border rounded-md p-3 transition-colors duration-150 ease-in-out cursor-pointer ${
        isActive ? 'bg-primary/10 border-primary/30' : 'bg-card hover:bg-muted/50'
      } ${
        deleteStep.isPending ? 'opacity-70 pointer-events-none' : ''
      }`}
      onClick={() => !showDeleteConfirm && setActiveStepId(step.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 overflow-hidden pr-2">
          <p className="text-sm font-medium capitalize truncate">{stepTypeDisplay}</p>
          <p className="text-xs text-muted-foreground truncate">
            {(step.config?.presentation as { headline?: string | null })?.headline || `Step ${step.step_order + 1}`}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out">
          <Button 
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDeleteClick}
            disabled={deleteStep.isPending}
            aria-label="Delete step"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <div 
            {...attributes} 
            {...listeners} 
            className="p-1 cursor-grab touch-none text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </div>
      </div>

      {showDeleteConfirm ? (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-2 rounded-md border border-destructive/50">
          <p className="text-xs text-center mb-2 font-medium">Delete this step?</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleConfirmDelete} disabled={deleteStep.isPending}>
              {deleteStep.isPending ? 'Deleting...' : 'Confirm'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelDelete} disabled={deleteStep.isPending}>
              Cancel
            </Button>
          </div>
          {deleteStep.isError && (
            <p className="text-xs text-destructive mt-1">Error deleting</p>
          )}
        </div>
      ) : null}
    </div>
  );
}; 