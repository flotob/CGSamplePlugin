import React from 'react';
import { StepSidebar } from './steps/StepSidebar';
import { StepEditor } from './steps/StepEditor';
import { useStepsQuery, useCreateStep, Step } from '@/hooks/useStepsQuery';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { Button } from '@/components/ui/button';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { UseMutationResult } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface WizardStepEditorPageProps {
  wizardId: string;
  assignableRoles: CommunityInfoResponsePayload['roles'] | undefined;
}

export interface CreateStepPayload {
  step_type_id: string;
  config: Record<string, unknown>;
  target_role_id: string | null;
  is_mandatory: boolean;
  is_active: boolean;
}

export const WizardStepEditorPage: React.FC<WizardStepEditorPageProps> = ({ wizardId, assignableRoles }) => {
  const { data, isLoading, refetch: refetchSteps } = useStepsQuery(wizardId);
  const [activeStepId, setActiveStepId] = React.useState<string | null>(null);
  const createStep: UseMutationResult<{ step: Step }, Error, CreateStepPayload, unknown> = useCreateStep(wizardId);
  const { data: stepTypesData, isLoading: isLoadingStepTypes } = useStepTypesQuery();
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
    setStepTypeToCreate(type);
    setActiveStepId(null);
  };

  const handleSaveNewStep = (payload: CreateStepPayload) => {
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={isLoadingStepTypes || createStep.isPending}>
                + Add Step
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Select Step Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isLoadingStepTypes ? (
                <div className="p-3 text-sm">Loading types...</div>
              ) : stepTypesData && stepTypesData.step_types.length > 0 ? (
                (() => {
                  // --- Categorization Logic ---
                  const allTypes = [...stepTypesData.step_types].sort((a, b) =>
                    a.name.localeCompare(b.name),
                  ); // Basic sort

                  const categories: { name: string; types: StepType[] }[] = [
                    {
                      name: 'With Credentials',
                      types: allTypes.filter(type => type.requires_credentials),
                    },
                    {
                      name: 'Without Credentials',
                      types: allTypes.filter(type => !type.requires_credentials),
                    },
                  ];

                  // Filter out empty categories unless you want to show them
                  const categoriesToShow = categories.filter(cat => cat.types.length > 0);

                  // --- Rendering Logic ---
                  return (
                    <Accordion type="single" collapsible className="w-full">
                      {categoriesToShow.map(category => (
                        <AccordionItem value={category.name} key={category.name} className="border-b-0">
                          <AccordionTrigger className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline justify-start [&[data-state=open]>svg]:ml-auto">
                            {category.name}
                          </AccordionTrigger>
                          <AccordionContent className="pt-0 pb-1">
                            {category.types.map(type => {
                              // Restore specific enabled logic, reverting to 'ens'
                              const isEnabled = ['ens', 'content'].includes(type.name);

                              return (
                                <button
                                  key={type.id}
                                  className={`w-full text-left pl-8 pr-4 py-2 text-sm ${
                                    isEnabled ? 'hover:bg-accent' : 'opacity-50 cursor-not-allowed'
                                  }`}
                                  onClick={() => isEnabled && handleAddStepClick(type)}
                                  disabled={!isEnabled || createStep.isPending}
                                >
                                  <span className="font-medium capitalize">
                                    {/* Use label for display, fallback to formatted name */}
                                    {type.label || type.name.replace(/_/g, ' ')}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    {type.description}
                                  </span>
                                  {!isEnabled && (
                                    <span className="text-xs text-blue-500 block mt-1">
                                      (Coming Soon)
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  );
                })() // Immediately invoke the function to return the elements
              ) : (
                <div className="p-3 text-sm text-muted-foreground">No step types available</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
      <div className="flex-1 min-w-0 overflow-y-auto">
        <StepEditor
          key={isCreating ? 'creating' : activeStep?.id || 'no-selection'}
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