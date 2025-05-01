import React from 'react';
import { Step } from '@/hooks/useStepsQuery';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { StepSidebarItem } from './StepSidebarItem';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  if (isLoading) return <div className="p-4">Loading steps...</div>;

  const combinedSteps = steps ? [...steps] : [];

  const getStepType = (step: Step) => stepTypesData?.step_types.find(t => t.id === step.step_type_id);

  if (!isLoading && combinedSteps.length === 0 && !isCreating) {
    return <div className="p-4 text-muted-foreground">No steps yet.</div>;
  }

  const handleStepDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ['steps', wizardId] });
    setActiveStepId(null);
  };

  return (
    <div className="flex flex-col gap-3 p-2 w-full border-r bg-muted/30 h-full overflow-y-auto">
      {combinedSteps.map((step) => {
        const stepType = getStepType(step);
        const isActive = step.id === activeStepId && !isCreating;
        return (
          <StepSidebarItem
            key={step.id}
            wizardId={wizardId}
            step={step}
            stepType={stepType}
            isActive={isActive}
            setActiveStepId={setActiveStepId}
            onDeleted={handleStepDeleted}
          />
        );
      })}

      {isCreating && stepTypeToCreate && (
        <div
          key="creating-step"
          className={`relative group flex flex-col items-center rounded-lg shadow-sm px-2 py-3 cursor-default transition-colors border bg-card border-primary ring-2 ring-primary/30`
          }
          style={{ minHeight: 64 }}
        >
          <div className="w-40 h-10 flex flex-col items-center justify-center bg-card rounded border border-dashed border-border mb-1">
            <span className="font-semibold text-sm text-primary">
              {stepTypeToCreate.name.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="text-xs text-muted-foreground text-center truncate w-full">
            {stepTypeToCreate.description || 'New Step'}
          </div>
          <div className="absolute inset-0 bg-background/30 backdrop-blur-sm flex items-center justify-center">
             <span className="text-xs font-medium text-primary animate-pulse">Editing...</span>
          </div>
        </div>
      )}
    </div>
  );
}; 