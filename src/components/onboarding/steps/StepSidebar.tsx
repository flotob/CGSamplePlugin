import React from 'react';
import { Step, useStepsQuery, useDeleteStep } from '@/hooks/useStepsQuery';
import { Button } from '@/components/ui/button';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';

interface StepSidebarProps {
  wizardId: string;
  activeStepId: string | null;
  setActiveStepId: (id: string | null) => void;
  steps: Step[] | undefined;
  isLoading: boolean;
  isCreating: boolean;
  stepTypeToCreate: StepType | null;
}

export const StepSidebar: React.FC<StepSidebarProps> = ({
  wizardId,
  activeStepId,
  setActiveStepId,
  steps,
  isLoading,
  isCreating,
  stepTypeToCreate
}) => {
  const { data: stepTypesData } = useStepTypesQuery();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  if (isLoading) return <div className="p-4">Loading steps...</div>;

  const combinedSteps = steps ? [...steps] : [];

  const getStepType = (step: Step) => stepTypesData?.step_types.find(t => t.id === step.step_type_id);

  if (!isLoading && combinedSteps.length === 0 && !isCreating) {
    return <div className="p-4 text-muted-foreground">No steps yet.</div>;
  }

  return (
    <div className="flex flex-col gap-3 p-2 w-full border-r bg-muted/30 h-full overflow-y-auto">
      {combinedSteps.map((step, idx) => {
        const stepType = getStepType(step);
        const isActive = step.id === activeStepId && !isCreating;
        return (
          <div
            key={step.id}
            className={`relative group flex flex-col items-center rounded-lg shadow-sm px-2 py-3 cursor-pointer transition-colors border ${isActive ? 'bg-white border-primary ring-2 ring-primary/30' : 'bg-white hover:bg-accent border-border'}`}
            onClick={() => setActiveStepId(step.id)}
            style={{ minHeight: 64 }}
          >
            <button
              className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-destructive bg-white rounded-full p-1 hover:bg-destructive/10"
              onClick={e => { e.stopPropagation(); setDeletingId(step.id); useDeleteStep(wizardId, step.id).mutateAsync(undefined, { onSettled: () => setDeletingId(null) }); }}
              disabled={deletingId === step.id}
              aria-label="Remove step"
              tabIndex={-1}
            >
              {deletingId === step.id ? <span className="animate-spin">⏳</span> : <span className="text-lg">–</span>}
            </button>
            <div className="w-40 h-10 flex flex-col items-center justify-center bg-white rounded border border-dashed border-border mb-1">
              <span className="font-semibold text-sm text-primary">
                {stepType ? stepType.name.replace(/_/g, ' ') : 'Step'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground text-center truncate w-full">
              {stepType?.description || 'No description'}
            </div>
          </div>
        );
      })}

      {isCreating && stepTypeToCreate && (
        <div
          key="creating-step"
          className={`relative group flex flex-col items-center rounded-lg shadow-sm px-2 py-3 cursor-default transition-colors border bg-white border-primary ring-2 ring-primary/30`
          }
          style={{ minHeight: 64 }}
        >
          <div className="w-40 h-10 flex flex-col items-center justify-center bg-white rounded border border-dashed border-border mb-1">
            <span className="font-semibold text-sm text-primary">
              {stepTypeToCreate.name.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="text-xs text-muted-foreground text-center truncate w-full">
            {stepTypeToCreate.description || 'New Step'}
          </div>
          <div className="absolute inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center">
             <span className="text-xs font-medium text-primary animate-pulse">Editing...</span>
          </div>
        </div>
      )}
    </div>
  );
}; 