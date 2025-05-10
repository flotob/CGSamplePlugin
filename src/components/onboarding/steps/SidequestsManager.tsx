import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings2, Loader2, AlertCircle, XIcon, ExternalLink } from 'lucide-react';
import { useGetStepAttachedSidequests } from '@/hooks/useStepAttachedSidequestQueries';
import { useDetachSidequestFromStepMutation } from '@/hooks/useStepAttachedSidequestMutations';
import { SidequestsLibraryModal } from './SidequestsLibraryModal';
import { SidequestInlineDisplayCard } from './SidequestInlineDisplayCard';
import { AddSidequestCard } from './AddSidequestCard';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SidequestsManagerProps {
  stepId: string;
  wizardId: string; 
}

export const SidequestsManager: React.FC<SidequestsManagerProps> = ({ stepId, wizardId }) => {
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  const { 
    data: attachedSidequestsData, 
    isLoading: isLoadingAttached, 
    isError: isErrorAttached, 
    error: errorAttached 
  } = useGetStepAttachedSidequests(stepId);
  
  const detachMutation = useDetachSidequestFromStepMutation();

  const handleOpenModal = () => setIsLibraryModalOpen(true);
  const handleCloseModal = () => setIsLibraryModalOpen(false);

  const handleQuickDetach = (attachmentId: string) => {
    console.log("handleQuickDetach called with attachmentId:", attachmentId, "for stepId:", stepId);
    // Removed confirm() dialog due to sandbox restrictions
    detachMutation.mutate({ stepId, attachmentId }, {
        onSuccess: () => {
            console.log("Detach mutation successful for", attachmentId);
            // Query invalidation is handled by the hook, list should refresh.
        },
        onError: (error) => {
            console.error("Detach mutation failed for", attachmentId, ":", error);
            // TODO: Add user-facing error feedback (e.g., toast)
        }
    });
  };

  const currentAttachedSidequests = attachedSidequestsData || [];

  return (
    <div className="py-2 space-y-3">
      {/* Optional: Summary Text - can be removed if card list is enough */}
      {/* <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-muted-foreground">
          {isLoadingAttached ? "Loading..." : `${currentAttachedSidequests.length} sidequest(s) attached.`}
        </p>
        <Button onClick={handleOpenModal} variant="link" size="sm" className="text-xs">
          Manage All <ExternalLink className="ml-1 h-3 w-3"/>
        </Button>
      </div> */}
      
      {isLoadingAttached && (
        <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading attached sidequests...
        </div>
      )}
      {isErrorAttached && (
        <div className="flex items-center text-sm text-destructive">
            <AlertCircle className="mr-2 h-4 w-4" /> Error: {errorAttached?.message}
        </div>
      )}

      {!isLoadingAttached && !isErrorAttached && (
        <ScrollArea className="w-full whitespace-nowrap pb-2.5"> {/* Added pb-2.5 for scrollbar visibility */}
          <div className="flex space-x-3 py-1">
            <AddSidequestCard onClick={handleOpenModal} disabled={detachMutation.isPending || isLoadingAttached} />
            {currentAttachedSidequests.map((sq) => (
              <SidequestInlineDisplayCard 
                key={sq.attachment_id} 
                sidequest={sq} 
                onDetach={handleQuickDetach}
                disabled={detachMutation.isPending || isLoadingAttached}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
       {/* Button to open modal if list is very long or just as main CTA */}
       {currentAttachedSidequests.length > 3 && (
         <Button onClick={handleOpenModal} variant="outline" size="sm" className="mt-2 w-full sm:w-auto">
            <Settings2 className="mr-2 h-4 w-4" /> Manage All Sidequests ({currentAttachedSidequests.length})
         </Button>
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