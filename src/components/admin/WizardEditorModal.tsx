import React from 'react';
import { WizardStepEditorPage } from '@/components/onboarding/WizardStepEditorPage';
import { useWizardEditorStore } from '@/stores/useWizardEditorStore';
import { useCgQuery } from '@/hooks/useCgQuery';
import type { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

export const WizardEditorModal: React.FC = () => {
  const { editingWizardId, closeEditor } = useWizardEditorStore();
  
  // Fetch community info to get assignable roles for the wizard editor
  const { data: communityInfo } = useCgQuery<CommunityInfoResponsePayload, Error>(
    ['communityInfo'],
    async (instance) => (await instance.getCommunityInfo()).data,
    {
      // Only fetch when we need to open the editor
      enabled: !!editingWizardId,
    }
  );
  
  // Get assignable roles from community info
  const assignableRoles = communityInfo?.roles || [];
  
  if (!editingWizardId) return null;
  
  return (
    <div className="fixed inset-0 z-100 bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-5xl w-full relative">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 z-50 text-lg p-2.5 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-muted text-foreground flex items-center justify-center"
          onClick={closeEditor}
          aria-label="Close step editor"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
        <WizardStepEditorPage 
          wizardId={editingWizardId} 
          assignableRoles={assignableRoles}
          onClose={closeEditor}
        />
      </div>
    </div>
  );
}; 