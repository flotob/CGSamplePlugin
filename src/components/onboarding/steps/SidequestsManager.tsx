import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings2, Loader2, AlertCircle, PlusCircle } from 'lucide-react';
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
    <div className="py-3 space-y-4">
      {/* Header with count and manage button */}
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-sm font-medium text-foreground">
          {isLoadingAttached ? "Loading sidequests..." : `Sidequests (${currentAttachedSidequests.length})`}
        </h4>
        {currentAttachedSidequests.length > 0 && (
          <Button 
            onClick={handleOpenModal} 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            Manage Library
          </Button>
        )}
      </div>
      
      {/* Loading and error states with improved styling */}
      {isLoadingAttached && (
        <div className="flex items-center justify-center h-24 bg-muted/30 rounded-md border border-dashed">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" /> 
            <span className="text-sm text-muted-foreground">Loading sidequests...</span>
        </div>
      )}
      
      {isErrorAttached && (
        <div className="flex items-center justify-center h-24 bg-destructive/10 rounded-md border border-destructive/30 text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" /> 
            <span className="text-sm">Error: {errorAttached?.message || "Could not load sidequests"}</span>
        </div>
      )}

      {/* Scrollable sidequest cards with improved styling */}
      {!isLoadingAttached && !isErrorAttached && (
        <ScrollArea className="w-full pb-4"> 
          <div className="flex space-x-4 py-2">
            <AddSidequestCard 
              onClick={handleOpenModal} 
              disabled={detachMutation.isPending || isLoadingAttached}
              className="hover:border-primary hover:bg-primary/5" 
            />
            {currentAttachedSidequests.map((sq) => (
              <SidequestInlineDisplayCard 
                key={sq.attachment_id} 
                sidequest={sq} 
                onDetach={handleQuickDetach}
                disabled={detachMutation.isPending || isLoadingAttached}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-2" />
        </ScrollArea>
      )}

      {/* Call to action button - more prominent for empty state */}
      {!isLoadingAttached && !isErrorAttached && currentAttachedSidequests.length === 0 && (
        <Button onClick={handleOpenModal} variant="outline" size="sm" className="w-full mt-2 border-dashed border-muted-foreground/50 hover:border-primary hover:bg-primary/5">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Sidequests
        </Button>
      )}
      
      {/* "Manage All" button shown only when there are many sidequests */}
      {currentAttachedSidequests.length > 3 && (
        <Button 
          onClick={handleOpenModal} 
          variant="outline" 
          size="sm" 
          className="w-full border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30"
        >
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