import React from 'react';
import { StepSidebar } from './steps/StepSidebar';
import { StepEditor } from './steps/StepEditor';
import { useStepsQuery, useCreateStep, Step } from '@/hooks/useStepsQuery';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UseMutationResult } from '@tanstack/react-query';

// Define CommunityRole based on assignableRoles prop structure
// Ensure this matches the actual structure from CommunityInfoResponsePayload
interface CommunityRole {
  id: string;
  title: string;
  // Add other relevant fields from CommunityInfoResponsePayload['roles'][number] if needed
}

interface WizardStepEditorPageProps {
  wizardId: string;
  assignableRoles: CommunityRole[] | undefined; // Use defined CommunityRole
}

export interface CreateStepPayload {
  step_type_id: string;
  config: Record<string, unknown>;
  target_role_id: string | null;
  is_mandatory: boolean;
  is_active: boolean;
}

// Define SummaryData structure using the defined CommunityRole type
interface SummaryData {
  includedStepTypes: StepType[];
  potentialRoles: CommunityRole[];
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

  const handleCancelCreate = React.useCallback(() => {
    setStepTypeToCreate(null);
    if (data && data.steps.length > 0) {
      setActiveStepId(data.steps[0].id);
    }
  }, [data, setActiveStepId]);

  const activeStep: Step | null = !stepTypeToCreate && data?.steps.find(s => s.id === activeStepId) || null;
  const isCreating = !!stepTypeToCreate;
  const isSummaryPreviewActive = activeStepId === 'summary-preview';

  // --- Calculate Summary Data --- 
  const summaryData = React.useMemo((): SummaryData | null => {
    if (!isSummaryPreviewActive || !data?.steps || !stepTypesData?.step_types) {
      return null; 
    }
    // ... includedStepTypes calculation ...
    const uniqueTypeIds = [...new Set(data.steps.map(step => step.step_type_id))];
    const includedStepTypes = uniqueTypeIds
      .map(id => stepTypesData.step_types.find(type => type.id === id))
      .filter((type): type is StepType => !!type);

    // 2. Potential Roles Granted (using CommunityRole type)
    const uniqueRoleIds = [...new Set(data.steps.map(step => step.target_role_id).filter((id): id is string => !!id))];
    const potentialRoles = uniqueRoleIds
      .map(id => assignableRoles?.find(role => role.id === id))
      .filter((role): role is CommunityRole => !!role)
      .sort((a, b) => a.title.localeCompare(b.title));

    return {
      includedStepTypes,
      potentialRoles,
    };
  }, [isSummaryPreviewActive, data?.steps, stepTypesData?.step_types, assignableRoles]);
  // --- End Calculate Summary Data --- 

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
          setActiveStepId={setActiveStepId}
          steps={data?.steps}
          isLoading={isLoading}
          isCreating={isCreating}
          stepTypeToCreate={stepTypeToCreate}
        />
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">
        <StepEditor
          key={isSummaryPreviewActive ? 'summary-preview' : (isCreating ? 'creating' : activeStep?.id || 'no-selection')}
          wizardId={wizardId}
          step={isSummaryPreviewActive ? null : activeStep}
          roles={assignableRoles}
          isCreating={!isSummaryPreviewActive && isCreating}
          stepTypeForCreate={isSummaryPreviewActive ? null : stepTypeToCreate}
          onCreate={handleSaveNewStep}
          onCancelCreate={handleCancelCreate}
          createStepMutation={createStep}
          isSummaryPreview={isSummaryPreviewActive}
          summaryData={summaryData ?? undefined}
          onDelete={() => {
            setActiveStepId(null);
            refetchSteps();
          }}
        />
      </div>
    </div>
  );
}; 