import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  AlertCircle, 
  PlusCircle, 
  // XIcon, // Assuming XIcon might not be needed if form closure is handled by Back button
  // Link2Icon, // Used in SidequestCard, not directly here anymore
  // UserSquare2Icon, // Not used
  Globe2Icon, 
  ArrowLeftIcon,
  ListIcon,
  BookIcon,
} from 'lucide-react';

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
import { useGetSidequestLibrary, sidequestLibraryQueryKeys, useDeleteGlobalSidequestMutation, useToggleSidequestPublicMutation } from '@/hooks/useSidequestLibraryHooks';
import type { Sidequest, AttachedSidequest } from '@/types/sidequests';
// SidequestAdminListItem is used by ComposerTabView, not directly here after full refactor.
// import { SidequestAdminListItem } from './SidequestAdminListItem'; 
import { SidequestForm } from '../SidequestForm';
import { useAuth } from '@/context/AuthContext'; 
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// Import the new TabView components
// These paths assume this file will be moved to SidequestsLibraryModal/index.tsx
import { ComposerTabView } from './ComposerTabView';
import { LibraryTabView } from './LibraryTabView';
import { CommunityTabView } from './CommunityTabView';

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
  type ActiveTab = 'composer' | 'library' | 'community';
  const [activeTab, setActiveTab] = useState<ActiveTab>('composer');
  const [formMode, setFormMode] = useState<'hidden' | 'createGlobal' | 'editGlobal'>('hidden');
  const [editingSidequestData, setEditingSidequestData] = useState<Sidequest | null>(null);
  const [isAttachingMode, setIsAttachingMode] = useState(false); 
  const [activeLibraryView, setActiveLibraryView] = useState<'mine' | 'community'>('mine');
  const [displayedAttachedSidequests, setDisplayedAttachedSidequests] = useState<AttachedSidequest[] | undefined>(undefined);
  
  const { decodedPayload } = useAuth(); 
  const communityId = decodedPayload?.cid;
  const currentUserId = decodedPayload?.sub; 

  const queryClient = useQueryClient();

  const { 
    data: attachedSidequestsData, 
    isLoading: isLoadingAttached, 
    isError: isErrorAttached, 
    error: errorAttached, 
    refetch: refetchAttachedSidequests 
  } = useGetStepAttachedSidequests(stepId, { enabled: isOpen && !!stepId });
  
  const { 
    data: myLibraryData, 
    isLoading: isLoadingMyLibrary, 
    isError: isErrorMyLibrary, 
    error: errorMyLibrary, 
    refetch: refetchMyLibrary 
  } = useGetSidequestLibrary({ 
    communityId, 
    scope: 'mine', 
    options: { enabled: isOpen && !!communityId && !!currentUserId } 
  });

  const { 
    data: communityLibraryData, 
    isLoading: isLoadingCommunityLibrary, 
    isError: isErrorCommunityLibrary, 
    error: errorCommunityLibrary, 
    refetch: refetchCommunityLibrary 
  } = useGetSidequestLibrary({ 
    communityId, 
    scope: 'community', 
    options: { enabled: isOpen && !!communityId } 
  });

  const deleteGlobalMutation = useDeleteGlobalSidequestMutation();
  const togglePublicMutation = useToggleSidequestPublicMutation();
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
        setActiveTab('composer');
      }, 150);
    } else {
      if (stepId) refetchAttachedSidequests();
      if (communityId && currentUserId) refetchMyLibrary();
      if (communityId) refetchCommunityLibrary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepId, communityId, currentUserId]);

  useEffect(() => {
    setDisplayedAttachedSidequests(attachedSidequestsData);
  }, [attachedSidequestsData]);

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

  const handleDeleteGlobal = (sidequestId: string) => {
    if (communityId) {
      deleteGlobalMutation.mutate({ 
        sidequestId, 
        communityIdIfKnown: communityId 
      });
    }
  };

  const handleTogglePublic = (sidequestId: string, currentState: boolean) => {
    togglePublicMutation.mutate({ 
      sidequestId, 
      is_public: !currentState 
    });
  };
  
  const handleAttachThisSidequest = (globalSidequestId: string) => {
    if (!stepId) return;
    const currentAttachedCount = attachedSidequestsData?.length || 0;
    attachMutation.mutate({ sidequest_id: globalSidequestId, display_order: currentAttachedCount }, {
      onSuccess: () => {
        if (activeTab !== 'composer') {
          setActiveTab('composer');
          setIsAttachingMode(false); 
        }
      },
      onError: (err) => console.error("Failed to attach sidequest:", err)
    });
  };

  const handleDragEndAttached = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && displayedAttachedSidequests) {
      const oldList = displayedAttachedSidequests;
      const activeId = active.id as string;
      const overId = over.id as string;
      const oldIndex = oldList.findIndex(sq => sq.attachment_id === activeId);
      const newIndex = oldList.findIndex(sq => sq.attachment_id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedList = arrayMove(oldList, oldIndex, newIndex);
      setDisplayedAttachedSidequests(reorderedList);

      const payloadForApi = reorderedList.map((sq, index) => ({
        attachment_id: sq.attachment_id,
        display_order: index,
      }));

      reorderAttachedMutation.mutate(payloadForApi, {
        onError: (err) => {
          console.error("Failed to reorder sidequests on backend:", err);
          setDisplayedAttachedSidequests(attachedSidequestsData);
        },
      });
    }
  };

  const renderEmptyStateImpl = (message: string, view: 'attached' | 'mine' | 'community', onCreate?: () => void) => (
    <div className="flex flex-col items-center justify-center h-60 text-center p-6">
      <div className="bg-muted/30 rounded-full p-5 mb-4">
        {view === 'attached' && <ListIcon className="h-8 w-8 text-muted-foreground" />}
        {view === 'mine' && <BookIcon className="h-8 w-8 text-muted-foreground" />}
        {view === 'community' && <Globe2Icon className="h-8 w-8 text-muted-foreground" />}
      </div>
      <p className="text-muted-foreground mb-4">{message}</p>
      {view === 'attached' && (
        <p className="text-sm text-muted-foreground">Browse the library on the right to add content</p>
      )}
      {view === 'mine' && onCreate && (
        <Button onClick={onCreate} variant="outline" className="mt-2">
          <PlusCircle className="mr-2 h-4 w-4"/> Create New Sidequest
        </Button>
      )}
    </div>
  );

  const renderLoadingStateImpl = (view: 'attached' | 'mine' | 'community') => (
    <div className="flex flex-col items-center justify-center h-40">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4"/>
      <p className="text-muted-foreground">
        {view === 'attached' && "Loading attached sidequests..."}
        {view === 'mine' && "Loading your library..."}
        {view === 'community' && "Loading community library..."}
      </p>
    </div>
  );

  const renderErrorStateImpl = (error: Error | null, view: 'attached' | 'mine' | 'community', onRetry: () => void) => (
    <div className="flex flex-col items-center justify-center h-40 text-destructive text-center p-4">
      <AlertCircle className="h-8 w-8 mb-3" /> 
      <p className="font-medium mb-1">Error loading sidequests</p>
      <p className="text-xs">{error?.message || "An unexpected error occurred."}</p>
      <Button 
        variant="outline" 
        size="sm"
        className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10" 
        onClick={onRetry}
      >
        <ArrowLeftIcon className="mr-2 h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  );
  
  const renderMainContent = () => {
    if (formMode === 'createGlobal' || formMode === 'editGlobal') {
      return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-10 duration-300">
          <div className="border-b mb-4 pb-4 flex items-center">
            <Button variant="ghost" size="sm" onClick={handleCloseForm} className="mr-4">
              <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Library
            </Button>
            <h3 className="text-lg font-semibold">
              {formMode === 'createGlobal' ? 'Create New Sidequest' : `Edit ${editingSidequestData?.title || 'Sidequest'}`}
            </h3>
          </div>
          <div className="flex-grow overflow-y-auto pr-2">
            <SidequestForm
              stepId={stepId} 
              wizardId={wizardId}
              existingSidequest={editingSidequestData}
              onCloseForm={handleCloseForm}
              onSaveSuccess={handleGlobalSaveSuccess}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex-grow flex flex-col h-full">
        <div className="border-b pb-4 sticky top-0 bg-background z-10 pt-1 mb-4">
          <div className="grid w-full grid-cols-3 gap-2">
            <Button 
              variant={activeTab === 'composer' ? "secondary" : "ghost"} 
              onClick={() => setActiveTab('composer')} 
              className="text-xs sm:text-sm w-full justify-start px-3 py-2 h-auto"
            >
              <ListIcon className="mr-1.5 h-4 w-4"/>
              <span className="sm:inline">Composer</span>
              <span className="ml-1.5">({attachedSidequestsData?.length || 0})</span>
            </Button>
            <Button 
              variant={activeTab === 'library' ? "secondary" : "ghost"} 
              onClick={() => setActiveTab('library')} 
              className="text-xs sm:text-sm w-full justify-start px-3 py-2 h-auto"
            >
              <BookIcon className="mr-1.5 h-4 w-4"/>
              <span className="sm:inline">Library</span>
              <span className="ml-1.5">({myLibraryData?.length || 0})</span>
            </Button>
            <Button 
              variant={activeTab === 'community' ? "secondary" : "ghost"} 
              onClick={() => setActiveTab('community')} 
              className="text-xs sm:text-sm w-full justify-start px-3 py-2 h-auto"
            >
              <Globe2Icon className="mr-1.5 h-4 w-4"/>
              <span className="sm:inline">Community</span>
              <span className="ml-1.5">({communityLibraryData?.length || 0})</span>
            </Button>
          </div>
        </div>

        <div className="flex-grow flex flex-col overflow-hidden">
          {activeTab === 'composer' && (
            <ComposerTabView
              attachedSidequestsData={displayedAttachedSidequests}
              isLoadingAttached={isLoadingAttached}
              isErrorAttached={isErrorAttached}
              errorAttached={errorAttached}
              stepId={stepId}
              communityIdForAttachedItems={communityId}
              onOpenEditGlobalFormForAttached={handleOpenEditGlobalForm}
              handleDragEndAttached={handleDragEndAttached}
              sensors={sensors}
              reorderAttachedMutationIsPending={reorderAttachedMutation.isPending}
              refetchAttachedSidequests={refetchAttachedSidequests}
              activeLibraryView={activeLibraryView}
              setActiveLibraryView={setActiveLibraryView}
              myLibraryData={myLibraryData}
              communityLibraryData={communityLibraryData}
              isLoadingMyLibrary={isLoadingMyLibrary}
              isLoadingCommunityLibrary={isLoadingCommunityLibrary}
              isErrorMyLibrary={isErrorMyLibrary}
              isErrorCommunityLibrary={isErrorCommunityLibrary}
              errorMyLibrary={errorMyLibrary}
              errorCommunityLibrary={errorCommunityLibrary}
              communityIdForSidebar={communityId}
              onOpenCreateGlobalFormForSidebar={handleOpenCreateGlobalForm}
              onOpenEditGlobalFormForSidebar={handleOpenEditGlobalForm}
              onAttachForSidebar={handleAttachThisSidequest}
              refetchMyLibrary={refetchMyLibrary}
              refetchCommunityLibrary={refetchCommunityLibrary}
              renderLoadingState={renderLoadingStateImpl}
              renderErrorState={renderErrorStateImpl}
              renderEmptyState={renderEmptyStateImpl}
            />
          )}
          {activeTab === 'library' && (
            <LibraryTabView 
              myLibraryData={myLibraryData}
              isLoadingMyLibrary={isLoadingMyLibrary}
              isErrorMyLibrary={isErrorMyLibrary}
              errorMyLibrary={errorMyLibrary}
              communityId={communityId}
              currentUserId={currentUserId}
              onAttach={handleAttachThisSidequest}
              onEditGlobal={handleOpenEditGlobalForm}
              onDeleteGlobal={handleDeleteGlobal}
              onTogglePublic={handleTogglePublic}
              onOpenCreateGlobalForm={handleOpenCreateGlobalForm}
              attachedSidequestsData={attachedSidequestsData}
              renderLoadingState={renderLoadingStateImpl}
              renderErrorState={(err, view) => renderErrorStateImpl(err, view, refetchMyLibrary)}
              renderEmptyState={(msg, view) => renderEmptyStateImpl(msg, view, handleOpenCreateGlobalForm)}
            />
          )}
          {activeTab === 'community' && (
            <CommunityTabView 
              communityLibraryData={communityLibraryData}
              isLoadingCommunityLibrary={isLoadingCommunityLibrary}
              isErrorCommunityLibrary={isErrorCommunityLibrary}
              errorCommunityLibrary={errorCommunityLibrary}
              communityId={communityId}
              onAttach={handleAttachThisSidequest}
              onOpenCreateGlobalForm={handleOpenCreateGlobalForm}
              attachedSidequestsData={attachedSidequestsData}
              renderLoadingState={renderLoadingStateImpl}
              renderErrorState={(err, view) => renderErrorStateImpl(err, view, refetchCommunityLibrary)}
              renderEmptyState={renderEmptyStateImpl}
            />
          )}
        </div>
      </div>
    );
  };

  const modalTitle = formMode !== 'hidden' 
    ? (formMode === 'createGlobal' ? 'Create New Sidequest' : `Edit ${editingSidequestData?.title || 'Sidequest'}`)
    : 'Sidequest Manager';

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl w-[95vw] h-[85vh] max-h-[900px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden p-6 flex flex-col">
          {renderMainContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 