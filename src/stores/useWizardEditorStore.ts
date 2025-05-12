import { create } from 'zustand';

interface WizardEditorState {
  editingWizardId: string | null;
  initialStepId: string | null;
  openEditor: (wizardId: string, initialStepId?: string | null) => void;
  closeEditor: () => void;
}

export const useWizardEditorStore = create<WizardEditorState>((set) => ({
  editingWizardId: null,
  initialStepId: null,
  openEditor: (wizardId, initialStepId = null) => set({
    editingWizardId: wizardId,
    initialStepId: initialStepId
  }),
  closeEditor: () => set({
    editingWizardId: null,
    initialStepId: null
  })
})); 