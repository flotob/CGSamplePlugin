import React from 'react';
import { StepSidebar } from './steps/StepSidebar';
import { StepEditor } from './steps/StepEditor';
import { useStepsQuery, useCreateStep, Step } from '@/hooks/useStepsQuery';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { Button } from '@/components/ui/button';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { UseMutationResult } from '@tanstack/react-query';

interface WizardStepEditorPageProps {
  wizardId: string;
  assignableRoles: CommunityInfoResponsePayload['roles'] | undefined;
}

export interface CreateStepPayload {
  step_type_id: string;
  config: Record<string, unknown>;
  target_role_id: string;
  is_mandatory: boolean;
  is_active: boolean;
}

interface StepFormData {
  target_role_id: string;
  is_mandatory: boolean;
  is_active: boolean;
}

export const WizardStepEditorPage: React.FC<WizardStepEditorPageProps> = ({ wizardId, assignableRoles }) => {
  const { data, isLoading, refetch: refetchSteps } = useStepsQuery(wizardId);
  const [activeStepId, setActiveStepId] = React.useState<string | null>(null);
  const createStep: UseMutationResult<{ step: Step }, Error, CreateStepPayload, unknown> = useCreateStep(wizardId);
  const { data: stepTypesData, isLoading: isLoadingStepTypes } = useStepTypesQuery();
  const [showTypeMenu, setShowTypeMenu] = React.useState(false);
  const [stepTypeToCreate, setStepTypeToCreate] = React.useState<StepType | null>(null);

  React.useEffect(() => {
    if (data && data.steps.length > 0 && !activeStepId && !stepTypeToCreate) {
      setActiveStepId(data.steps[0].id);
    }
    if (stepTypeToCreate && activeStepId) {
      setActiveStepId(null);
    }
  }, [data, activeStepId, stepTypeToCreate]);

  const handleAddStepClick = (type: StepType) => {
    setShowTypeMenu(false);
    setStepTypeToCreate(type);
    setActiveStepId(null);
  };

  const handleSaveNewStep = (formData: StepFormData) => {
    if (!stepTypeToCreate) return;

    const payload: CreateStepPayload = {
      ...formData,
      step_type_id: stepTypeToCreate.id,
      config: {},
    };

    createStep.mutate(payload, {
      onSuccess: (res) => {
        setStepTypeToCreate(null);
        refetchSteps();
        setActiveStepId(res.step.id);
      }
    });
  };

  const handleCancelCreate = () => {
    setStepTypeToCreate(null);
    if (data && data.steps.length > 0) {
      setActiveStepId(data.steps[0].id);
    }
  };

  const activeStep: Step | null = !stepTypeToCreate && data?.steps.find(s => s.id === activeStepId) || null;
  const isCreating = !!stepTypeToCreate;

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
                      onClick={() => handleAddStepClick(type)}
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
        <StepSidebar
          wizardId={wizardId}
          activeStepId={activeStepId}
          setActiveStepId={(id) => {
              setActiveStepId(id);
              setStepTypeToCreate(null);
          }}
          steps={data?.steps}
          isLoading={isLoading}
          isCreating={isCreating}
          stepTypeToCreate={stepTypeToCreate}
        />
      </div>
      <div className="flex-1 min-w-0">
        <StepEditor
          wizardId={wizardId}
          step={activeStep}
          roles={assignableRoles}
          isCreating={isCreating}
          stepTypeForCreate={stepTypeToCreate}
          onCreate={handleSaveNewStep}
          onCancelCreate={handleCancelCreate}
          createStepMutation={createStep}
          onDelete={() => {
            setActiveStepId(null);
            refetchSteps();
          }}
        />
      </div>
    </div>
  );
}; 