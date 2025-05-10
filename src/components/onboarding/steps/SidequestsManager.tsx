import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings2, Loader2, AlertCircle } from 'lucide-react';
import { useGetStepSidequests } from '@/hooks/useSidequestAdminQueries';
import { SidequestsLibraryModal } from './SidequestsLibraryModal';

interface SidequestsManagerProps {
  stepId: string;
  wizardId: string; 
}

export const SidequestsManager: React.FC<SidequestsManagerProps> = ({ stepId, wizardId }) => {
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  const { data: sidequestsData, isLoading, isError, error } = useGetStepSidequests(stepId);

  const handleOpenModal = () => setIsLibraryModalOpen(true);
  const handleCloseModal = () => setIsLibraryModalOpen(false);

  let summaryText = "Manage Sidequests";
  if (isLoading) {
    summaryText = "Loading sidequest info...";
  } else if (isError) {
    summaryText = "Error loading sidequest info";
  } else if (sidequestsData) {
    if (sidequestsData.length === 0) {
      summaryText = "No sidequests (Manage)";
    } else if (sidequestsData.length === 1) {
      summaryText = "1 sidequest (Manage)";
    } else {
      summaryText = `${sidequestsData.length} sidequests (Manage)`;
    }
  }

  return (
    <div className="py-3">
      <Button onClick={handleOpenModal} variant="outline" size="sm" className="w-full justify-start text-left">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings2 className="mr-2 h-4 w-4" />}
        {summaryText}
      </Button>
      
      {isError && !isLoading && (
        <p className="text-xs text-destructive mt-1 ml-1 flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" /> {error?.message || 'Failed to load summary'}
        </p>
      )}

      <SidequestsLibraryModal 
        isOpen={isLibraryModalOpen} 
        onClose={handleCloseModal} 
        stepId={stepId} 
        wizardId={wizardId} 
      />
    </div>
  );
}; 