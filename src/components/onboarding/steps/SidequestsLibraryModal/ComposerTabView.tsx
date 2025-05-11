import React, { /*useState, useEffect, useCallback*/ } from 'react';
import type { Sidequest, AttachedSidequest } from '@/types/sidequests'; // Assuming AttachedSidequest might be needed
import { cn } from '@/lib/utils';
import { SidequestAdminListItem } from '../SidequestAdminListItem';
import { LibraryContentRenderer } from './LibraryContentRenderer';
import {
  DndContext,
  closestCenter,
  // KeyboardSensor, // Removed unused
  // PointerSensor,  // Removed unused
  // useSensor,      // Removed unused
  useSensors,
  DragEndEvent, // Re-added DragEndEvent
} from '@dnd-kit/core';
import {
  // arrayMove,      // Removed unused
  SortableContext,
  // sortableKeyboardCoordinates, // Removed unused
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Loader2, AlertCircle, ListIcon, PlusCircle, BookIcon, Globe2Icon, ArrowLeftIcon } from 'lucide-react'; // Added icons that might be used by placeholder states
import { Button } from '@/components/ui/button'; // Added Button import

// Placeholder render functions (can be replaced by props or a shared util)
const PlaceholderRenderLoadingState = (view: 'attached' | 'mine' | 'community') => (
  <div className="flex flex-col items-center justify-center h-40">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4"/>
    <p className="text-muted-foreground">Loading {view} items...</p>
  </div>
);
const PlaceholderRenderErrorState = (error: Error | null, view: 'attached' | 'mine' | 'community', onRetry: () => void) => (
  <div className="flex flex-col items-center justify-center h-40 text-destructive text-center p-4">
    <AlertCircle className="h-8 w-8 mb-3" /> 
    <p className="font-medium mb-1">Error loading items</p>
    <p className="text-xs">{error?.message || "An unexpected error occurred."}</p>
    <Button variant="outline" size="sm" className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={onRetry}>
      <ArrowLeftIcon className="mr-2 h-3.5 w-3.5" /> Retry
    </Button>
  </div>
);
const PlaceholderRenderEmptyState = (message: string, view: 'attached' | 'mine' | 'community', onCreate?: () => void) => (
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

interface ComposerTabViewProps {
  // For Attached Sidequests List (Left Pane)
  attachedSidequestsData: AttachedSidequest[] | undefined;
  isLoadingAttached: boolean;
  isErrorAttached: boolean;
  errorAttached: Error | null;
  stepId: string;
  communityIdForAttachedItems: string | undefined; // Renamed to avoid clash with sidebar communityId
  onOpenEditGlobalFormForAttached: (sidequest: Sidequest) => void; // Renamed for clarity
  handleDragEndAttached: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>; // Type for DND sensors
  reorderAttachedMutationIsPending: boolean;
  refetchAttachedSidequests: () => void;

  // For Library Sidebar (Right Pane) - Props for LibraryContentRenderer
  activeLibraryView: 'mine' | 'community';
  setActiveLibraryView: (view: 'mine' | 'community') => void;
  myLibraryData: Sidequest[] | undefined;
  communityLibraryData: Sidequest[] | undefined;
  isLoadingMyLibrary: boolean;
  isLoadingCommunityLibrary: boolean;
  isErrorMyLibrary: boolean;
  isErrorCommunityLibrary: boolean;
  errorMyLibrary: Error | null;
  errorCommunityLibrary: Error | null;
  communityIdForSidebar: string | undefined; // Renamed to avoid clash
  onOpenCreateGlobalFormForSidebar: () => void; // Renamed
  onOpenEditGlobalFormForSidebar: (sidequest: Sidequest) => void; // Renamed
  onAttachForSidebar: (globalSidequestId: string) => void; // Renamed
  refetchMyLibrary: () => void;
  refetchCommunityLibrary: () => void;

  // Placeholder render functions - to be passed from parent
  renderLoadingState?: (view: 'attached' | 'mine' | 'community') => React.ReactNode;
  renderErrorState?: (error: Error | null, view: 'attached' | 'mine' | 'community', onRetry: () => void) => React.ReactNode;
  renderEmptyState?: (message: string, view: 'attached' | 'mine' | 'community', onCreate?: () => void) => React.ReactNode;
}

export const ComposerTabView: React.FC<ComposerTabViewProps> = ({
  // Attached List Props
  attachedSidequestsData,
  isLoadingAttached,
  isErrorAttached,
  errorAttached,
  stepId,
  communityIdForAttachedItems,
  onOpenEditGlobalFormForAttached,
  handleDragEndAttached,
  sensors,
  reorderAttachedMutationIsPending,
  refetchAttachedSidequests,
  // Library Sidebar Props
  activeLibraryView,
  setActiveLibraryView,
  myLibraryData,
  communityLibraryData,
  isLoadingMyLibrary,
  isLoadingCommunityLibrary,
  isErrorMyLibrary,
  isErrorCommunityLibrary,
  errorMyLibrary,
  errorCommunityLibrary,
  communityIdForSidebar,
  onOpenCreateGlobalFormForSidebar,
  onOpenEditGlobalFormForSidebar,
  onAttachForSidebar,
  refetchMyLibrary,
  refetchCommunityLibrary,
  // Placeholder renderers
  renderLoadingState = PlaceholderRenderLoadingState,
  renderErrorState = PlaceholderRenderErrorState,
  renderEmptyState = PlaceholderRenderEmptyState,
}) => {
  return (
    <div className="flex-grow flex flex-col sm:flex-row gap-6 overflow-hidden h-full">
      {/* Left side - Attached sidequests list */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="text-base font-medium mb-4">Step Content</h3>
        
        {isLoadingAttached && renderLoadingState('attached')}
        
        {isErrorAttached && renderErrorState(errorAttached, 'attached', refetchAttachedSidequests)}
        
        {!isLoadingAttached && !isErrorAttached && (
          <div className="flex-grow overflow-hidden flex flex-col">
            {(attachedSidequestsData && attachedSidequestsData.length > 0) ? (
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEndAttached}
              >
                <SortableContext 
                  items={attachedSidequestsData.map(sq => sq.attachment_id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3 overflow-y-auto flex-grow pr-2">
                    {attachedSidequestsData.map(sq => (
                      <SidequestAdminListItem 
                        key={sq.attachment_id} 
                        sidequest={sq} 
                        stepId={stepId} 
                        viewMode="attached" 
                        onEditGlobal={() => onOpenEditGlobalFormForAttached(sq)} // Ensure sq is the full Sidequest object if needed by form
                        communityId={communityIdForAttachedItems} 
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : renderEmptyState('No sidequests attached to this step yet', 'attached')}
            
            {reorderAttachedMutationIsPending && (
              <div className="flex items-center justify-center bg-muted/20 text-xs text-muted-foreground py-2 mt-3 rounded">
                <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Saving order...
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Right side - Library sidebar */}
      <div className={cn(
        "w-full sm:w-96 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 mt-4 sm:mt-0 sm:pl-6 flex-shrink-0",
        "flex flex-col"
      )}>
        <h3 className="text-base font-medium mb-4">Add From Library</h3>
        <LibraryContentRenderer 
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
          stepId={stepId} // stepId is needed by SidequestAdminListItem within LibraryContentRenderer for attach context
          communityId={communityIdForSidebar}
          onOpenCreateGlobalForm={onOpenCreateGlobalFormForSidebar}
          onOpenEditGlobalForm={onOpenEditGlobalFormForSidebar} // This was onEditGlobal in original renderLibraryContent
          onAttach={onAttachForSidebar}
          refetchMyLibrary={refetchMyLibrary}
          refetchCommunityLibrary={refetchCommunityLibrary}
          // Pass down the state renderers if LibraryContentRenderer is to use them
          // renderLoadingState={renderLoadingState} 
          // renderErrorState={renderErrorState}
          // renderEmptyState={renderEmptyState}
        />
      </div>
    </div>
  );
}; 