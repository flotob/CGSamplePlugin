import React from 'react';
import { Step, useUpdateStep, useDeleteStep } from '@/hooks/useStepsQuery';
import { Button } from '@/components/ui/button';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { UseMutationResult } from '@tanstack/react-query';
import { CreateStepPayload } from '../WizardStepEditorPage';
import { CommonStepPresentationSettings, PresentationConfig } from './CommonStepPresentationSettings';
import { EnsStepConfig, EnsSpecificConfig } from './EnsStepConfig';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from 'lucide-react';

interface CommunityRole {
  id: string;
  title: string;
}

interface StepFullData {
  target_role_id: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  config: {
    presentation: PresentationConfig;
    specific: Record<string, unknown>;
  };
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
}

const INITIAL_PRESENTATION_CONFIG: PresentationConfig = {
  headline: null,
  subtitle: null,
};

const INITIAL_SPECIFIC_CONFIG: Record<string, unknown> = {};

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
}) => {
  const { data: stepTypesData } = useStepTypesQuery();
  
  const [targetRoleId, setTargetRoleId] = React.useState<string>('');
  const [isMandatory, setIsMandatory] = React.useState<boolean>(true);
  const [isActive, setIsActive] = React.useState<boolean>(true);

  const [presentationConfig, setPresentationConfig] = React.useState<PresentationConfig>(INITIAL_PRESENTATION_CONFIG);
  const [specificConfig, setSpecificConfig] = React.useState<Record<string, unknown>>(INITIAL_SPECIFIC_CONFIG);

  const updateStep = useUpdateStep(wizardId, step?.id);
  const deleteStep = useDeleteStep(wizardId, step?.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const parseConfig = (config: Record<string, unknown> | undefined | null): { presentation: PresentationConfig, specific: Record<string, unknown> } => {
    const parsedPresentation = config?.presentation as PresentationConfig || INITIAL_PRESENTATION_CONFIG;
    const parsedSpecific = config?.specific as Record<string, unknown> || INITIAL_SPECIFIC_CONFIG;
    return { presentation: parsedPresentation, specific: parsedSpecific };
  };

  React.useEffect(() => {
    if (isCreating) {
      setTargetRoleId('');
      setIsMandatory(true);
      setIsActive(true);
      setPresentationConfig(INITIAL_PRESENTATION_CONFIG);
      setSpecificConfig(INITIAL_SPECIFIC_CONFIG);
    } else if (step) {
      setTargetRoleId(step.target_role_id ?? '');
      setIsMandatory(step.is_mandatory);
      setIsActive(step.is_active);
      const { presentation, specific } = parseConfig(step.config);
      setPresentationConfig(presentation);
      setSpecificConfig(specific);
    } else {
      setTargetRoleId('');
      setIsMandatory(true);
      setIsActive(true);
      setPresentationConfig(INITIAL_PRESENTATION_CONFIG);
      setSpecificConfig(INITIAL_SPECIFIC_CONFIG);
    }
    setShowDeleteConfirm(false);
  }, [step, isCreating]);

  const currentMutation = isCreating ? createStepMutation : updateStep;

  if (!isCreating && !step) {
    return <div className="p-8 text-muted-foreground">Select a step to edit or add a new one.</div>;
  }

  const stepTypeInfo = isCreating ? stepTypeForCreate : stepTypesData?.step_types.find(t => t.id === step?.step_type_id);
  const roleOptions = roles;

  const handlePresentationChange = React.useCallback((newConfig: PresentationConfig) => {
    setPresentationConfig(newConfig);
  }, []);

  const handleSpecificConfigChange = React.useCallback((newConfig: Record<string, unknown>) => {
    setSpecificConfig(newConfig);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalConfig = {
      presentation: presentationConfig,
      specific: specificConfig,
    };
    
    const finalTargetRoleId = targetRoleId === '' ? null : targetRoleId;

    if (isCreating) {
      if (!stepTypeInfo) return;
      const payload: CreateStepPayload = {
        step_type_id: stepTypeInfo.id,
        target_role_id: finalTargetRoleId,
        is_mandatory: isMandatory,
        is_active: isActive,
        config: finalConfig,
      };
      onCreate(payload);
    } else {
      const updatePayload: Partial<Step> = {
        target_role_id: finalTargetRoleId,
        is_mandatory: isMandatory,
        is_active: isActive,
        config: finalConfig,
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
          <span className="inline-block px-2 py-1 rounded bg-primary/10 text-primary font-medium text-sm">
            {stepTypeInfo ? stepTypeInfo.name.replace(/_/g, ' ') : 'Unknown'}
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
              initialData={presentationConfig}
              onChange={handlePresentationChange}
              disabled={currentMutation.isPending}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="target-role">
          <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
             Target Role
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Select a role to assign to the user if they successfully complete this step.
                Leave as '-- No Target Role --' if no role should be assigned here.
              </p>
              <select
                name="target_role_id"
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(e.target.value)}
                className="w-full border border-input bg-background rounded-md text-sm p-2 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none h-9"
                disabled={currentMutation.isPending}
              >
                <option value="">-- No Target Role --</option>
                {roleOptions.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.title}
                  </option>
                ))}
              </select>
            </div>
          </AccordionContent>
        </AccordionItem>

        {stepTypeInfo?.name === 'ens' && (
          <AccordionItem value="specific-config">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
               ENS Configuration
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <EnsStepConfig 
                initialData={specificConfig as EnsSpecificConfig}
                onChange={handleSpecificConfigChange}
                disabled={currentMutation.isPending}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="space-y-3 border-t border-border/30 pt-4 mt-4">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="step-active" className="flex flex-col space-y-1">
            <span>Include Step</span>
            <span className="font-normal leading-snug text-muted-foreground text-xs">
              If disabled, this step will be hidden from users in the wizard.
            </span>
          </Label>
          <Switch
            id="step-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={currentMutation.isPending}
          />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="step-mandatory" className="flex flex-col space-y-1">
            <span>Mandatory Step</span>
            <span className="font-normal leading-snug text-muted-foreground text-xs">
              If enabled, users must complete this step to finish the wizard.
            </span>
          </Label>
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