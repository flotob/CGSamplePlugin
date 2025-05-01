import React from 'react';
import { Step, useUpdateStep, useDeleteStep } from '@/hooks/useStepsQuery';
import { Button } from '@/components/ui/button';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { UseMutationResult } from '@tanstack/react-query';
import { CreateStepPayload } from '../WizardStepEditorPage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CommunityRole {
  id: string;
  title: string;
}

interface StepFormData {
  target_role_id: string;
  is_mandatory: boolean;
  is_active: boolean;
}

interface StepEditorProps {
  wizardId: string;
  step: Step | null;
  roles?: CommunityRole[];
  onSave?: () => void;
  onDelete?: () => void;
  isCreating: boolean;
  stepTypeForCreate: StepType | null;
  onCreate: (formData: StepFormData) => void;
  onCancelCreate: () => void;
  createStepMutation: UseMutationResult<{ step: Step }, Error, CreateStepPayload, unknown>;
}

const INITIAL_FORM_STATE: StepFormData = {
  target_role_id: '',
  is_mandatory: true,
  is_active: true,
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
}) => {
  const { data: stepTypesData } = useStepTypesQuery();
  const [form, setForm] = React.useState<StepFormData>(INITIAL_FORM_STATE);
  const updateStep = useUpdateStep(wizardId, step?.id);
  const deleteStep = useDeleteStep(wizardId, step?.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  React.useEffect(() => {
    if (isCreating) {
      setForm(INITIAL_FORM_STATE);
    } else if (step) {
      setForm({
        target_role_id: step.target_role_id,
        is_mandatory: step.is_mandatory,
        is_active: step.is_active,
      });
    } else {
      setForm(INITIAL_FORM_STATE);
    }
    setShowDeleteConfirm(false);
  }, [step, isCreating]);

  const currentMutation = isCreating ? createStepMutation : updateStep;

  if (!isCreating && !step) {
    return <div className="p-8 text-muted-foreground">Select a step to edit or add a new one.</div>;
  }

  const stepTypeInfo = isCreating ? stepTypeForCreate : stepTypesData?.step_types.find(t => t.id === step?.step_type_id);
  const roleOptions = roles;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(f => ({
        ...f,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setForm(f => ({
        ...f,
        [name]: value,
      }));
    }
  };

  const handleRoleChange = (value: string) => {
    setForm(f => ({ ...f, target_role_id: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      onCreate(form);
    } else {
      updateStep.mutate(form, {
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
      <div>
        <label className="block text-sm font-medium mb-1">Target Role</label>
        <Select
          name="target_role_id"
          value={form.target_role_id}
          onValueChange={handleRoleChange}
          required
          defaultValue={form.target_role_id}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder="Select a role...">
              {form.target_role_id ? roleOptions.find(role => role.id === form.target_role_id)?.title : "Select a role..."}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map(role => (
              <SelectItem key={role.id} value={role.id}>
                {role.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentMutation.isError && (currentMutation.error.message.includes('target_role_id') || !form.target_role_id) && (
           <p className="text-xs text-destructive mt-1">Target role is required.</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_mandatory"
            checked={form.is_mandatory}
            onChange={handleChange}
          />
          Mandatory
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
          />
          Active
        </label>
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          type="submit"
          disabled={currentMutation.isPending || !form.target_role_id}
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