import React from 'react';
import { StepSidebar } from './steps/StepSidebar';
import { StepEditor } from './steps/StepEditor';
import { useStepsQuery, useCreateStep, Step } from '@/hooks/useStepsQuery';
import { MinimalCreateStepPayload } from '@/hooks/useStepsQuery';
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
import { Menu, X, ArrowLeft } from 'lucide-react'; // Import menu and close icons

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
  onClose?: () => void; // Optional callback for closing
}

// Define SummaryData structure using the defined CommunityRole type
interface SummaryData {
  includedStepTypes: StepType[];
  potentialRoles: CommunityRole[];
}

export const WizardStepEditorPage: React.FC<WizardStepEditorPageProps> = ({ 
  wizardId, 
  assignableRoles,
  onClose 
}) => {
  const { data, isLoading, refetch: refetchSteps } = useStepsQuery(wizardId);
  const [activeStepId, setActiveStepId] = React.useState<string | null>(null);
  const createStep: UseMutationResult<{ step: Step }, Error, MinimalCreateStepPayload, unknown> = useCreateStep(wizardId);
  const { data: stepTypesData, isLoading: isLoadingStepTypes } = useStepTypesQuery();
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (data && data.steps.length > 0 && !activeStepId) {
      setActiveStepId(data.steps[0].id);
    }
  }, [data, activeStepId]);

  const handleDirectCreateStep = (type: StepType) => {
    const payload: MinimalCreateStepPayload = { step_type_id: type.id };
    createStep.mutate(payload, {
      onSuccess: (res) => {
        refetchSteps();
        setActiveStepId(res.step.id);
        setSidebarOpen(false);
      },
      onError: (error) => {
        console.error("Failed to create step:", error);
      }
    });
  };

  const handleStepSelect = (id: string | null) => {
    setActiveStepId(id);
    if (window.innerWidth < 640) { 
      setTimeout(() => {
        setSidebarOpen(false);
      }, 100); 
    }
  };

  const activeStep: Step | null = data?.steps.find(s => s.id === activeStepId) || null;
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
    <div className="flex relative h-[80vh] border rounded-lg overflow-hidden bg-background">
      {/* Mobile sidebar toggle button */}
      <div className="absolute top-0 left-0 z-40 sm:hidden">
        <Button 
          variant="ghost" 
          className="h-10 w-10 p-0 m-1" 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile close button - for easy access on mobile */}
      <div className="absolute top-0 right-0 z-40 sm:hidden">
        <Button 
          variant="ghost" 
          className="h-10 w-10 p-0 m-1" 
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar overlay backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/20 z-30 sm:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with responsive classes */}
      <div 
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          transition-transform duration-200 ease-in-out
          absolute top-0 bottom-0 left-0 z-[35] w-[270px] h-full
          sm:static sm:translate-x-0 sm:w-60 sm:z-auto
          flex flex-col border-r bg-background shadow-lg sm:shadow-none
          overflow-x-hidden
        `}
      >
        <div className="p-2 border-b flex items-center justify-between relative bg-background">
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
                              const isEnabled = ['ens', 'content', 'quizmaster_basic', 'quizmaster_ai'].includes(type.name);

                              return (
                                <button
                                  key={type.id}
                                  className={`w-full text-left pl-8 pr-4 py-2 text-sm ${
                                    isEnabled ? 'hover:bg-accent' : 'opacity-50 cursor-not-allowed'
                                  }`}
                                  onClick={() => isEnabled && handleDirectCreateStep(type)}
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
          setActiveStepId={handleStepSelect}
          steps={data?.steps}
          isLoading={isLoading}
        />
      </div>

      {/* Main content area - adjust padding on mobile to account for toggle button */}
      <div className="flex-1 min-w-0 overflow-y-auto pt-12 sm:pt-0 pb-16">
        <StepEditor
          key={isSummaryPreviewActive ? 'summary-preview' : (activeStep?.id || 'no-selection')}
          wizardId={wizardId}
          step={isSummaryPreviewActive ? null : activeStep}
          roles={assignableRoles}
          isSummaryPreview={isSummaryPreviewActive}
          summaryData={summaryData ?? undefined}
          onSave={() => {
            refetchSteps();
          }}
          onDelete={() => {
            setActiveStepId(null);
            refetchSteps();
          }}
        />
      </div>

      {/* Bottom fixed Done button - visible on all screen sizes */}
      {onClose && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-background border-t flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="ml-auto"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Done
          </Button>
        </div>
      )}
    </div>
  );
}; 