import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  // DialogFooter, // Keep if needed
  // DialogClose, // Keep if needed
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, PlusCircle, XIcon } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useGetStepAttachedSidequests } from '@/hooks/useStepAttachedSidequestQueries';
import { useReorderStepSidequestsMutation } from '@/hooks/useStepAttachedSidequestMutations';
import type { Sidequest } from '@/types/sidequests';
import { SidequestAdminListItem } from './SidequestAdminListItem';
import { SidequestForm } from './SidequestForm';

interface SidequestsLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepId: string;
  wizardId: string;
}

export const SidequestsLibraryModal: React.FC<SidequestsLibraryModalProps> = ({
  isOpen,
  onClose,
  stepId,
  wizardId,
}) => {
  const [formMode, setFormMode] = useState<'hidden' | 'create' | 'edit'>('hidden');
  const [editingSidequestData, setEditingSidequestData] = useState<Sidequest | null>(null);

  const {
    data: sidequestsData,
    isLoading,
    isError,
    error,
  } = useGetStepAttachedSidequests(stepId, { enabled: isOpen && !!stepId });

  const reorderMutation = useReorderStepSidequestsMutation({ stepId });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed externally or by its own close button
      setTimeout(() => { // Allow modal close animation to finish before resetting state
        setFormMode('hidden');
        setEditingSidequestData(null);
      }, 300); 
    }
  }, [isOpen]);

  const handleOpenCreateForm = () => {
    setEditingSidequestData(null);
    setFormMode('create');
  };

  const handleOpenEditForm = (sidequest: Sidequest) => {
    setEditingSidequestData(sidequest);
    setFormMode('edit');
  };

  const handleCloseForm = () => {
    setFormMode('hidden');
    setEditingSidequestData(null);
  };

  const handleSaveSuccess = (savedSidequest?: Sidequest) => {
    // Mutations hooks should invalidate the query, so list will refresh.
    handleCloseForm();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldSidequests = sidequestsData || [];
      const oldIndex = oldSidequests.findIndex(sq => sq.id === active.id as string);
      const newIndex = oldSidequests.findIndex(sq => sq.id === over.id as string);
      
      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedList = arrayMove(oldSidequests, oldIndex, newIndex);
      const payloadForApi = reorderedList.map((sq, index) => ({
        attachment_id: (sq as any).attachment_id,
        display_order: index,
      }));
      if (payloadForApi.some(p => !p.attachment_id)) {
        console.error("Cannot reorder: one or more items missing attachment_id", payloadForApi);
        return;
      }
      reorderMutation.mutate(payloadForApi as any);
    }
  };

  const currentSidequests = sidequestsData || [];

  const renderListView = () => (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-1 flex-shrink-0">
        <DialogTitle className="text-xl">Sidequest Library</DialogTitle>
        <Button onClick={handleOpenCreateForm} size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Sidequest
        </Button>
      </div>
      {isLoading && (
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {isError && (
         <div className="flex-grow flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-8 w-8 mb-2" /> 
            <p>Error loading sidequests: {error?.message}</p>
        </div>
      )}
      {!isLoading && !isError && currentSidequests.length === 0 && (
        <div className="flex-grow flex items-center justify-center">
            <p className="text-muted-foreground text-center py-4">No sidequests yet. Click 'Add New' to create one.</p>
        </div>
      )}
      {!isLoading && !isError && currentSidequests.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={currentSidequests.map(sq => sq.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 flex-grow overflow-y-auto pr-1 pb-2"> 
              {currentSidequests.map(sq => (
                <SidequestAdminListItem key={sq.id} sidequest={sq} stepId={stepId} onEdit={handleOpenEditForm} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
       {reorderMutation.isPending && <p className="text-xs text-muted-foreground mt-2 text-center flex-shrink-0">Saving new order...</p>}
       {reorderMutation.isError && <p className="text-xs text-destructive mt-2 text-center flex-shrink-0">Error saving order: {reorderMutation.error?.message}</p>}
    </div>
  );

  const renderFormView = () => (
    <SidequestForm
      stepId={stepId}
      wizardId={wizardId}
      existingSidequest={editingSidequestData}
      onCloseForm={handleCloseForm} 
      onSaveSuccess={handleSaveSuccess}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-[85vh] max-h-[800px] flex flex-col p-0">
        {/* Custom Close Button for better positioning control within the modal content padding */} 
        <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3 right-3 z-50 h-7 w-7 p-0">
            <XIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
        </Button>

        <div className="flex-grow overflow-y-auto p-6 pt-4"> 
          {formMode === 'hidden' ? renderListView() : renderFormView()}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 