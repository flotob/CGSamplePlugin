import React from 'react';
import { Step, useStepsQuery, useDeleteStep } from '@/hooks/useStepsQuery';
import { Button } from '@/components/ui/button';

interface StepSidebarProps {
  wizardId: string;
  activeStepId: string | null;
  setActiveStepId: (id: string) => void;
}

export const StepSidebar: React.FC<StepSidebarProps> = ({ wizardId, activeStepId, setActiveStepId }) => {
  const { data, isLoading, error } = useStepsQuery(wizardId);
  const deleteStep = useDeleteStep(wizardId, undefined);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  if (isLoading) return <div className="p-4">Loading steps...</div>;
  if (error) return <div className="text-destructive p-4">Error loading steps: {error.message}</div>;
  if (!data || data.steps.length === 0) return <div className="p-4 text-muted-foreground">No steps yet.</div>;

  const handleDelete = (stepId: string) => {
    setDeletingId(stepId);
    deleteStep.mutateAsync(undefined, {
      onSuccess: () => {
        setDeletingId(null);
        // Optionally, select another step if the active one was deleted
        if (activeStepId === stepId && data.steps.length > 1) {
          const next = data.steps.find(s => s.id !== stepId);
          if (next) setActiveStepId(next.id);
        }
      },
      onError: () => setDeletingId(null),
    });
  };

  return (
    <div className="flex flex-col gap-2 p-2 w-56 border-r bg-muted/30 h-full overflow-y-auto">
      {data.steps.map((step, idx) => (
        <div
          key={step.id}
          className={`flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition-colors ${
            step.id === activeStepId ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-accent'
          }`}
          onClick={() => setActiveStepId(step.id)}
        >
          <div className="flex-1">
            <div className="font-medium text-sm">Step {step.step_order}</div>
            <div className="text-xs text-muted-foreground truncate">{step.step_type_id}</div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive"
            onClick={e => { e.stopPropagation(); handleDelete(step.id); }}
            disabled={deletingId === step.id || deleteStep.isPending}
            aria-label="Delete step"
          >
            {deletingId === step.id ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>🗑️</span>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}; 