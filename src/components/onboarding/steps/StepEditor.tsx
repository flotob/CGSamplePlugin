import React from 'react';
import { Step, useUpdateStep } from '@/hooks/useStepsQuery';
import { Button } from '@/components/ui/button';

interface StepEditorProps {
  wizardId: string;
  step: Step | null;
  onSave?: () => void;
}

export const StepEditor: React.FC<StepEditorProps> = ({ wizardId, step, onSave }) => {
  const [form, setForm] = React.useState({
    step_type_id: '',
    config: {},
    target_role_id: '',
    is_mandatory: true,
    is_active: true,
  });
  const updateStep = useUpdateStep(wizardId, step?.id);

  React.useEffect(() => {
    if (step) {
      setForm({
        step_type_id: step.step_type_id,
        config: step.config,
        target_role_id: step.target_role_id,
        is_mandatory: step.is_mandatory,
        is_active: step.is_active,
      });
    }
  }, [step]);

  if (!step) {
    return <div className="p-8 text-muted-foreground">Select a step to edit.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStep.mutate(form, {
      onSuccess: () => onSave && onSave(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Step Type</label>
        <input
          name="step_type_id"
          value={form.step_type_id}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Target Role ID</label>
        <input
          name="target_role_id"
          value={form.target_role_id}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 text-sm"
          required
        />
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
      <Button type="submit" disabled={updateStep.isPending}>
        {updateStep.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
      {updateStep.isError && (
        <div className="text-destructive text-sm bg-destructive/10 rounded p-2 mt-2">
          Error: {updateStep.error instanceof Error ? updateStep.error.message : 'Failed to update step'}
        </div>
      )}
      {updateStep.isSuccess && (
        <div className="text-green-700 text-sm bg-green-100 rounded p-2 mt-2">Saved!</div>
      )}
    </form>
  );
}; 