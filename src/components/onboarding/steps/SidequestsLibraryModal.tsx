import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, PlusCircle, XIcon, Link2Icon, UserSquare2Icon, Globe2Icon } from 'lucide-react';
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
import { useReorderStepSidequestsMutation, useAttachSidequestToStepMutation } from '@/hooks/useStepAttachedSidequestMutations';
import { useGetSidequestLibrary, sidequestLibraryQueryKeys } from '@/hooks/useSidequestLibraryHooks';
import type { Sidequest } from '@/types/sidequests';
import { SidequestAdminListItem } from './SidequestAdminListItem';
import { SidequestForm } from './SidequestForm';
import { useAuth } from '@/context/AuthContext'; 
import { useQueryClient } from '@tanstack/react-query';

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
  type ActiveTab = 'attached' | 'myLibrary' | 'communityLibrary';
  const [activeTab, setActiveTab] = useState<ActiveTab>('attached');
  const [formMode, setFormMode] = useState<'hidden' | 'createGlobal' | 'editGlobal'>('hidden');
  const [editingSidequestData, setEditingSidequestData] = useState<Sidequest | null>(null);
  const [isAttachingMode, setIsAttachingMode] = useState(false);
  
  const { decodedPayload } = useAuth(); 
  const communityId = decodedPayload?.cid;
  const currentUserId = decodedPayload?.sub; 

  const queryClient = useQueryClient();

  // Data Fetching for "Attached to Step" Tab
  const { 
    data: attachedSidequestsData, 
    isLoading: isLoadingAttached, 
    isError: isErrorAttached, 
    error: errorAttached, 
    refetch: refetchAttachedSidequests 
  } = useGetStepAttachedSidequests(stepId, { enabled: isOpen && activeTab === 'attached' && !!stepId });
  
  // Data Fetching for "My Library" Tab
  const { 
    data: myLibraryData, 
    isLoading: isLoadingMyLibrary, 
    isError: isErrorMyLibrary, 
    error: errorMyLibrary, 
    refetch: refetchMyLibrary 
  } = useGetSidequestLibrary({ 
    communityId, 
    scope: 'mine', 
    options: { enabled: isOpen && activeTab === 'myLibrary' && !!communityId && !!currentUserId } 
  });

  // Data Fetching for "Community Library" Tab
  const { 
    data: communityLibraryData, 
    isLoading: isLoadingCommunityLibrary, 
    isError: isErrorCommunityLibrary, 
    error: errorCommunityLibrary, 
    refetch: refetchCommunityLibrary 
  } = useGetSidequestLibrary({ 
    communityId, 
    scope: 'community', 
    options: { enabled: isOpen && activeTab === 'communityLibrary' && !!communityId } 
  });

  const reorderAttachedMutation = useReorderStepSidequestsMutation({ stepId });
  const attachMutation = useAttachSidequestToStepMutation({ stepId });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFormMode('hidden');
        setEditingSidequestData(null);
        setIsAttachingMode(false);
        setActiveTab('attached');
      }, 150);
    } else {
      // Smart refetching based on active tab
      if (activeTab === 'attached' && stepId) refetchAttachedSidequests();
      else if (activeTab === 'myLibrary' && communityId && currentUserId) refetchMyLibrary();
      else if (activeTab === 'communityLibrary' && communityId) refetchCommunityLibrary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, stepId, communityId, currentUserId]);

  const handleOpenCreateGlobalForm = () => {
    setEditingSidequestData(null);
    setFormMode('createGlobal');
  };

  const handleOpenEditGlobalForm = (sidequest: Sidequest) => {
    setEditingSidequestData(sidequest);
    setFormMode('editGlobal');
  };

  const handleCloseForm = () => {
    setFormMode('hidden');
    setEditingSidequestData(null);
  };

  const handleGlobalSaveSuccess = (savedSidequest?: Sidequest) => {
    handleCloseForm();
    if (communityId) {
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(communityId, 'mine')});
      queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(communityId, 'all_in_community')});
      if (savedSidequest?.is_public) {
        queryClient.invalidateQueries({ queryKey: sidequestLibraryQueryKeys.all(communityId, 'community')});
      }
    }
    if (formMode === 'editGlobal' && attachedSidequestsData?.some(sq => sq.id === savedSidequest?.id)) {
        refetchAttachedSidequests();
    }
  };
  
  const handleStartAttaching = () => {
    setIsAttachingMode(true);
    setActiveTab('myLibrary');
  };

  const handleAttachThisSidequest = (globalSidequestId: string) => {
    if (!stepId) return;
    const currentAttachedCount = attachedSidequestsData?.length || 0;
    attachMutation.mutate({ sidequest_id: globalSidequestId, display_order: currentAttachedCount }, {
      onSuccess: () => {
        setActiveTab('attached');
        setIsAttachingMode(false);
      },
      onError: (err) => console.error("Failed to attach sidequest:", err)
    });
  };

  const handleDragEndAttached = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldList = attachedSidequestsData || [];
      const activeId = active.id as string;
      const overId = over.id as string;
      const oldIndex = oldList.findIndex(sq => sq.attachment_id === activeId);
      const newIndex = oldList.findIndex(sq => sq.attachment_id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reorderedList = arrayMove(oldList, oldIndex, newIndex);
      const payloadForApi = reorderedList.map((sq, index) => ({
        attachment_id: sq.attachment_id,
        display_order: index,
      }));
      reorderAttachedMutation.mutate(payloadForApi);
    }
  };

  const renderMainContent = () => {
    if (formMode === 'createGlobal' || formMode === 'editGlobal') {
      return (
        <SidequestForm
          stepId={stepId} 
          wizardId={wizardId}
          existingSidequest={editingSidequestData}
          onCloseForm={handleCloseForm}
          onSaveSuccess={handleGlobalSaveSuccess}
        />
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as ActiveTab);
        if (value !== 'myLibrary' && value !== 'communityLibrary') {
            setIsAttachingMode(false);
        }
      }} className="flex-grow flex flex-col pt-2">
        <TabsList className="mb-4 grid w-full grid-cols-3 sticky top-0 bg-background z-10 py-2 shadow-sm">
          <TabsTrigger value="attached" className="text-xs sm:text-sm"><Link2Icon className="mr-1.5 h-4 w-4"/>Attached ({attachedSidequestsData?.length || 0})</TabsTrigger>
          <TabsTrigger value="myLibrary" className="text-xs sm:text-sm"><UserSquare2Icon className="mr-1.5 h-4 w-4"/>My Library ({myLibraryData?.length || 0})</TabsTrigger>
          <TabsTrigger value="communityLibrary" className="text-xs sm:text-sm"><Globe2Icon className="mr-1.5 h-4 w-4"/>Community ({communityLibraryData?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="attached" className="flex-grow flex flex-col outline-none focus:outline-none ring-0 focus:ring-0 mt-0">
          <div className="flex justify-end mb-3 flex-shrink-0">
            <Button onClick={handleStartAttaching} variant="outline" size="sm" disabled={!communityId}>
              <PlusCircle className="mr-2 h-4 w-4"/> Attach from Library
            </Button>
          </div>
          {isLoadingAttached && <div className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>}
          {isErrorAttached && <div className="flex-grow flex items-center justify-center text-destructive text-center"><AlertCircle className="h-8 w-8 mx-auto mb-2"/> <p>{errorAttached?.message || "Failed to load attached sidequests."}</p></div>}
          {!isLoadingAttached && !isErrorAttached && (
            (attachedSidequestsData && attachedSidequestsData.length > 0) ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndAttached}>
                <SortableContext items={attachedSidequestsData.map(sq => sq.attachment_id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 overflow-y-auto flex-grow pr-1 pb-2">
                    {attachedSidequestsData.map(sq => (
                      <SidequestAdminListItem 
                        key={sq.attachment_id} 
                        sidequest={sq} 
                        stepId={stepId} 
                        viewMode="attached" 
                        onEditGlobal={() => handleOpenEditGlobalForm(sq)}
                        communityId={communityId} 
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : <div className="flex-grow flex items-center justify-center"><p className="text-muted-foreground text-center py-4">No sidequests attached. Click &quot;Attach from Library&quot;.</p></div>
          )}
          {reorderAttachedMutation.isPending && <p className="text-xs text-muted-foreground mt-auto text-center pb-2 flex-shrink-0">Saving order...</p>}
        </TabsContent>

        <TabsContent value="myLibrary" className="flex-grow flex flex-col outline-none focus:outline-none ring-0 focus:ring-0 mt-0">
          <div className="flex justify-end mb-3 flex-shrink-0">
            <Button onClick={handleOpenCreateGlobalForm} variant="outline" size="sm" disabled={!communityId || !currentUserId}>
              <PlusCircle className="mr-2 h-4 w-4"/> Create New Library Sidequest
            </Button>
          </div>
          {(!communityId || !currentUserId) && !isLoadingMyLibrary && <div className="flex-grow flex items-center justify-center"><p className="text-muted-foreground">User or community context not available.</p></div>}
          {isLoadingMyLibrary && communityId && currentUserId && <div className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>}
          {isErrorMyLibrary && communityId && currentUserId && <div className="flex-grow flex items-center justify-center text-destructive text-center"><AlertCircle className="h-8 w-8 mx-auto mb-2"/> <p>{errorMyLibrary?.message || "Failed to load your library."}</p></div>}
          {!isLoadingMyLibrary && !isErrorMyLibrary && communityId && currentUserId && (
            (myLibraryData && myLibraryData.length > 0) ? (
              <div className="space-y-2 overflow-y-auto flex-grow pr-1 pb-2">
                {myLibraryData.map(sq => (
                  <SidequestAdminListItem 
                    key={sq.id} 
                    sidequest={sq} 
                    stepId={stepId} 
                    viewMode="myLibrary" 
                    onEditGlobal={() => handleOpenEditGlobalForm(sq)} 
                    communityId={communityId} 
                    isAttaching={isAttachingMode} 
                    onAttach={handleAttachThisSidequest} 
                  />
                ))}
              </div>
            ) : <div className="flex-grow flex items-center justify-center"><p className="text-muted-foreground text-center py-4">Your sidequest library is empty. Create some!</p></div>
          )}
        </TabsContent>

        <TabsContent value="communityLibrary" className="flex-grow flex flex-col outline-none focus:outline-none ring-0 focus:ring-0 mt-0">
          {(!communityId) && !isLoadingCommunityLibrary && <div className="flex-grow flex items-center justify-center"><p className="text-muted-foreground">Community context not available.</p></div>}
          {isLoadingCommunityLibrary && communityId && <div className="flex-grow flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>}
          {isErrorCommunityLibrary && communityId && <div className="flex-grow flex items-center justify-center text-destructive text-center"><AlertCircle className="h-8 w-8 mx-auto mb-2"/> <p>{errorCommunityLibrary?.message || "Failed to load community library."}</p></div>}
          {!isLoadingCommunityLibrary && !isErrorCommunityLibrary && communityId && (
            (communityLibraryData && communityLibraryData.length > 0) ? (
              <div className="space-y-2 overflow-y-auto flex-grow pr-1 pb-2">
                {communityLibraryData.map(sq => (
                  <SidequestAdminListItem 
                    key={sq.id} 
                    sidequest={sq} 
                    stepId={stepId} 
                    viewMode="communityLibrary" 
                    communityId={communityId} 
                    isAttaching={isAttachingMode} 
                    onAttach={handleAttachThisSidequest} 
                  />
                ))}
              </div>
            ) : <div className="flex-grow flex items-center justify-center"><p className="text-muted-foreground text-center py-4">No public sidequests in the community library yet.</p></div>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[90vw] h-[85vh] max-h-[900px] flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Sidequest Library & Management</DialogTitle>
          <DialogDescription>
            View and manage sidequests attached to this step. You can also add new sidequests from your personal library or the community library, and manage your global sidequest creations.
          </DialogDescription>
        </DialogHeader>
        
        <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3.5 right-3.5 z-50 h-7 w-7 p-0 opacity-70 hover:opacity-100">
            <XIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
        </Button>
        <div className="flex-grow overflow-y-hidden p-6 pt-5 flex flex-col">
          {renderMainContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 