import React from 'react';
import { Step, useUpdateStep, useDeleteStep } from '@/hooks/useStepsQuery';
import { Button } from '@/components/ui/button';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { UseMutationResult } from '@tanstack/react-query';
import { CreateStepPayload } from '../WizardStepEditorPage';
import { CommonStepPresentationSettings, PresentationConfig } from './CommonStepPresentationSettings';
import { EnsStepConfig, EnsSpecificConfig } from './EnsStepConfig';
import { ContentStepConfig, ContentSpecificConfigType } from './ContentStepConfig';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminWizardSummaryPreview } from './AdminWizardSummaryPreview';

interface CommunityRole {
  id: string;
  title: string;
}

interface StepEditorProps {
  wizardId: string;
  step: Step | null;
  roles?: CommunityRole[];
  onSave?: () => void;
  onDelete?: () => void;
  isCreating: boolean;
  stepTypeForCreate: StepType | null;
  onCreate: (formData: CreateStepPayload) => void;
  onCancelCreate: () => void;
  createStepMutation: UseMutationResult<{ step: Step }, Error, CreateStepPayload, unknown>;
  isSummaryPreview?: boolean;
  summaryData?: { includedStepTypes: StepType[]; potentialRoles: CommunityRole[] } | undefined;
}

const INITIAL_PRESENTATION_CONFIG: PresentationConfig = {
  headline: null,
  subtitle: null,
};

const INITIAL_SPECIFIC_CONFIG: Record<string, unknown> = {};

// Combined initial state for the entire config
const INITIAL_STEP_CONFIG = {
  presentation: INITIAL_PRESENTATION_CONFIG,
  specific: INITIAL_SPECIFIC_CONFIG,
};

export const StepEditor: React.FC<StepEditorProps> = ({
  wizardId,
  step,
  roles = [],
  onSave,
  onDelete,
  isCreating,
  stepTypeForCreate,
  onCreate,
  onCancelCreate,
  createStepMutation,
  isSummaryPreview = false,
  summaryData,
}) => {
  const { data: stepTypesData } = useStepTypesQuery();
  
  const [targetRoleId, setTargetRoleId] = React.useState<string>('');
  const [isMandatory, setIsMandatory] = React.useState<boolean>(true);
  const [isActive, setIsActive] = React.useState<boolean>(true);

  // Unified state for the entire config object
  const [stepConfig, setStepConfig] = React.useState(INITIAL_STEP_CONFIG);

  // State for enabling/disabling role assignment
  const [isRoleAssignmentEnabled, setIsRoleAssignmentEnabled] = React.useState<boolean>(false);

  // ADD BACK the change handlers, modified for unified state
  const handlePresentationChange = React.useCallback((newPresentationConfig: PresentationConfig) => {
    setStepConfig(prev => ({ ...prev, presentation: newPresentationConfig }));
  }, []);

  const handleSpecificConfigChange = React.useCallback((newSpecificConfig: Record<string, unknown> | ContentSpecificConfigType) => {
    setStepConfig(prev => ({ ...prev, specific: newSpecificConfig as Record<string, unknown> }));
  }, []);

  const updateStep = useUpdateStep(wizardId, step?.id);
  const deleteStep = useDeleteStep(wizardId, step?.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const parseConfig = (config: Record<string, unknown> | undefined | null): { presentation: PresentationConfig, specific: Record<string, unknown> } => {
    const parsedPresentation = config?.presentation as PresentationConfig || INITIAL_PRESENTATION_CONFIG;
    const parsedSpecific = config?.specific as Record<string, unknown> || INITIAL_SPECIFIC_CONFIG;
    return { presentation: parsedPresentation, specific: parsedSpecific };
  };

  React.useEffect(() => {
    // Reset mutation status when step/mode changes
    updateStep.reset();
    createStepMutation.reset(); // Also reset create mutation

    if (isCreating) {
      setTargetRoleId('');
      setIsMandatory(true);
      setIsActive(true);
      setStepConfig(INITIAL_STEP_CONFIG); // Reset unified config
      setIsRoleAssignmentEnabled(false); 
    } else if (step) {
      const shouldEnableRole = !!step.target_role_id;
      setTargetRoleId(step.target_role_id ?? '');
      setIsMandatory(step.is_mandatory);
      setIsActive(step.is_active);
      setStepConfig(parseConfig(step.config)); // Set unified config
      setIsRoleAssignmentEnabled(shouldEnableRole);
    } else {
      // Reset case (e.g., if step becomes null)
      setTargetRoleId('');
      setIsMandatory(true);
      setIsActive(true);
      setStepConfig(INITIAL_STEP_CONFIG); // Reset unified config
      setIsRoleAssignmentEnabled(false);
    }
    setShowDeleteConfirm(false);
  }, [step, isCreating, createStepMutation, updateStep]);

  const currentMutation = isCreating ? createStepMutation : updateStep;

  // Conditional rendering for summary preview
  if (isSummaryPreview) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Wizard Summary Preview</h2>
        {/* Render actual component if data exists, else show loading/empty state */}
        {summaryData ? (
           <AdminWizardSummaryPreview 
             includedStepTypes={summaryData.includedStepTypes}
             potentialRoles={summaryData.potentialRoles}
           />
        ) : (
           <div className="p-4 border rounded bg-muted/30">
             <p className="text-muted-foreground">Loading summary data...</p>
           </div>
        )}
      </div>
    );
  }

  // Original return logic if not in summary mode
  if (!isCreating && !step) {
    return <div className="p-8 text-muted-foreground">Select a step to edit or add a new one.</div>;
  }

  const stepTypeInfo = isCreating ? stepTypeForCreate : stepTypesData?.step_types.find(t => t.id === step?.step_type_id);
  const roleOptions = roles;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalTargetRoleId = targetRoleId === '' ? null : targetRoleId;

    if (isCreating) {
      if (!stepTypeInfo) return;
      const payload: CreateStepPayload = {
        step_type_id: stepTypeInfo.id,
        target_role_id: finalTargetRoleId,
        is_mandatory: isMandatory,
        is_active: isActive,
        config: stepConfig, // Use unified config state
      };
      onCreate(payload);
    } else {
      const updatePayload: Partial<Step> = {
        target_role_id: finalTargetRoleId,
        is_mandatory: isMandatory,
        is_active: isActive,
        config: stepConfig, // Use unified config state
      }
      updateStep.mutate(updatePayload, {
        onSuccess: () => onSave && onSave(),
      });
    }
  };

  const handleDelete = () => {
    if (isCreating) return;
    setShowDeleteConfirm(false);
    deleteStep.mutate(undefined, {
      onSuccess: () => onDelete && onDelete(),
    });
  };

  const isSaveDisabled = currentMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 flex flex-col gap-4">
      <div>
        <span className="text-xs font-semibold uppercase text-muted-foreground">Step Type</span>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block px-2 py-1 rounded bg-primary/10 text-primary font-medium text-sm capitalize">
            {/* Use label for display, fallback to formatted name */}
            {stepTypeInfo ? (stepTypeInfo.label || stepTypeInfo.name.replace(/_/g, ' ')) : 'Unknown'}
          </span>
          {stepTypeInfo?.description && (
            <span className="text-xs text-muted-foreground ml-2">{stepTypeInfo.description}</span>
          )}
        </div>
      </div>
      
      <Accordion type="single" collapsible defaultValue="presentation-settings" className="w-full space-y-3 border-t border-border/30 pt-4 mt-4">
        <AccordionItem value="presentation-settings">
          <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
            Presentation
          </AccordionTrigger>
          <AccordionContent className="pt-1">
            <CommonStepPresentationSettings 
              initialData={stepConfig.presentation} // Pass presentation part
              onChange={handlePresentationChange}
              disabled={currentMutation.isPending}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="target-role">
          <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
             Target Role Assignment
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-4">
            {/* Checkbox to enable/disable role assignment */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="enable-role-assignment"
                checked={isRoleAssignmentEnabled}
                onCheckedChange={(checked) => {
                  const isEnabled = Boolean(checked);
                  setIsRoleAssignmentEnabled(isEnabled);
                  if (!isEnabled) {
                    setTargetRoleId(''); // Clear role ID if disabled
                  }
                }}
                disabled={currentMutation.isPending}
              />
              <Label 
                htmlFor="enable-role-assignment" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Assign a role upon step completion
              </Label>
            </div>

            {/* Conditionally render the dropdown only if enabled */}
            {isRoleAssignmentEnabled && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Select the role to assign to the user.
                </p>
                <Select
                  onValueChange={(value) => setTargetRoleId(value)}
                  value={targetRoleId} // This will be '' if just enabled, prompting selection
                  disabled={currentMutation.isPending}
                >
                  <SelectTrigger id="target_role_id">
                    <SelectValue placeholder="Select a role to grant" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Removed the '-- No Target Role --' option */}
                    {roleOptions.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {stepTypeInfo?.name === 'ens' && (
          <AccordionItem value="specific-config">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
               ENS Configuration
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <EnsStepConfig 
                initialData={stepConfig.specific as EnsSpecificConfig} 
                onChange={handleSpecificConfigChange} 
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {stepTypeInfo?.name === 'content' && (
          <AccordionItem value="specific-config">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
               Content Configuration
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <ContentStepConfig 
                value={stepConfig.specific as ContentSpecificConfigType}
                onChange={handleSpecificConfigChange}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="space-y-3 border-t border-border/30 pt-4 mt-4">
        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-card/60">
          <div className="space-y-0.5">
            <Label htmlFor="is_active">Step Status</Label>
            <p className="text-xs text-muted-foreground">
              Inactive steps won&apos;t be shown to users. 
            </p>
          </div>
          <Switch
            id="step-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={currentMutation.isPending}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-card/60">
          <div className="space-y-0.5">
            <Label htmlFor="is_mandatory">Mandatory Step</Label>
            <p className="text-xs text-muted-foreground">
              Users must complete mandatory steps to finish the wizard.
            </p>
          </div>
          <Switch
            id="step-mandatory"
            checked={isMandatory}
            onCheckedChange={setIsMandatory}
            disabled={currentMutation.isPending}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          type="submit"
          disabled={isSaveDisabled}
        >
          {currentMutation.isPending ? (isCreating ? 'Creating...' : 'Saving...') : (isCreating ? 'Create Step' : 'Save Changes')}
        </Button>
        {isCreating && (
          <Button type="button" variant="outline" onClick={onCancelCreate} disabled={currentMutation.isPending}>
            Cancel
          </Button>
        )}
        {!isCreating && (
          <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={deleteStep.isPending}>
            Delete Step
          </Button>
        )}
      </div>
      {!isCreating && showDeleteConfirm && (
        <div className="bg-destructive/10 border border-destructive rounded p-3 mt-2 flex flex-col gap-2">
          <span className="text-destructive font-medium">Are you sure you want to delete this step?</span>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteStep.isPending}>Yes, Delete</Button>
            <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {currentMutation.isError && (
        <div className="text-destructive text-sm bg-destructive/10 rounded p-2 mt-2">
          Error: {currentMutation.error instanceof Error ? currentMutation.error.message : (isCreating ? 'Failed to create step' : 'Failed to update step')}
        </div>
      )}
      {updateStep.isSuccess && !isCreating && (
        <div className="text-green-700 text-sm bg-green-100 rounded p-2 mt-2">Saved!</div>
      )}
      {deleteStep.isError && !isCreating && (
        <div className="text-destructive text-sm bg-destructive/10 rounded p-2 mt-2">
          Error: {deleteStep.error instanceof Error ? deleteStep.error.message : 'Failed to delete step'}
        </div>
      )}
    </form>
  );
}; 