import React from 'react';
import { StepSidebar } from './steps/StepSidebar';
import { StepEditor } from './steps/StepEditor';
import { useStepsQuery, useCreateStep, Step } from '@/hooks/useStepsQuery';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { Button } from '@/components/ui/button';

interface WizardStepEditorPageProps {
  wizardId: string;
}

export const WizardStepEditorPage: React.FC<WizardStepEditorPageProps> = ({ wizardId }) => {
  const { data, isLoading } = useStepsQuery(wizardId);
  const [activeStepId, setActiveStepId] = React.useState<string | null>(null);
  const createStep = useCreateStep(wizardId);
  const { data: stepTypesData, isLoading: isLoadingStepTypes } = useStepTypesQuery();
  const [showTypeMenu, setShowTypeMenu] = React.useState(false);

  React.useEffect(() => {
    if (data && data.steps.length > 0 && !activeStepId) {
      setActiveStepId(data.steps[0].id);
    }
  }, [data, activeStepId]);

  const handleAddStep = (type: StepType) => {
    setShowTypeMenu(false);
    createStep.mutate({
      step_type_id: type.id,
      config: {},
      target_role_id: 'default',
      is_mandatory: true,
      is_active: true,
    }, {
      onSuccess: (res) => {
        setActiveStepId(res.step.id);
      }
    });
  };

  const activeStep: Step | null = data?.steps.find(s => s.id === activeStepId) || null;

  return (
    <div className="flex h-[80vh] border rounded-lg overflow-hidden bg-background">
      <div className="flex flex-col w-60 border-r bg-muted/30">
        <div className="p-2 border-b flex items-center justify-between relative">
          <span className="font-semibold text-sm">Steps</span>
          <div className="relative">
            <Button size="sm" variant="outline" onClick={() => setShowTypeMenu(v => !v)} disabled={isLoadingStepTypes || createStep.isPending}>
              + Add Step
            </Button>
            {showTypeMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow-lg z-10">
                {isLoadingStepTypes ? (
                  <div className="p-3 text-sm">Loading types...</div>
                ) : stepTypesData && stepTypesData.step_types.length > 0 ? (
                  stepTypesData.step_types.map(type => (
                    <button
                      key={type.id}
                      className="w-full text-left px-4 py-2 hover:bg-accent text-sm"
                      onClick={() => handleAddStep(type)}
                      disabled={createStep.isPending}
                    >
                      <span className="font-medium">{type.name.replace(/_/g, ' ')}</span>
                      <span className="block text-xs text-muted-foreground">{type.description}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">No step types available</div>
                )}
              </div>
            )}
          </div>
        </div>
        <StepSidebar wizardId={wizardId} activeStepId={activeStepId} setActiveStepId={setActiveStepId} />
      </div>
      <div className="flex-1 min-w-0">
        <StepEditor wizardId={wizardId} step={activeStep} />
      </div>
    </div>
  );
}; 