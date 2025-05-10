import React from 'react';
import type { Sidequest, AttachedSidequest } from '@/types/sidequests';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react'; // Assuming these icons are needed from original
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidequestCardGrid } from './SidequestCardGrid';

// Forward declare render functions that would be passed from parent or defined in a common util
// For now, these are placeholders. In the full refactor, these would be imported or passed as props.
const PlaceholderRenderLoadingState = (view: 'mine' | 'community') => (
  <div className="flex flex-col items-center justify-center h-40">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4"/>
    <p className="text-muted-foreground">Loading {view} library...</p>
  </div>
);
const PlaceholderRenderErrorState = (error: Error | null, view: 'mine' | 'community') => (
  <div className="flex flex-col items-center justify-center h-40 text-destructive">
    <AlertCircle className="h-8 w-8 mb-3" /> 
    <p>Error loading {view} library: {error?.message}</p>
  </div>
);
const PlaceholderRenderEmptyState = (message: string, view: 'mine' | 'community', onCreate?: () => void) => (
  <div className="flex flex-col items-center justify-center h-60 text-center p-6">
    <p className="text-muted-foreground mb-4">{message}</p>
    {view === 'mine' && (
        <Button variant="outline" className="mt-2" onClick={onCreate}>
          <PlusCircle className="mr-2 h-4 w-4"/> Create New Sidequest (from Empty State)
        </Button>
      )}
  </div>
);


interface LibraryTabViewProps {
  myLibraryData: Sidequest[] | undefined;
  isLoadingMyLibrary: boolean;
  isErrorMyLibrary: boolean;
  errorMyLibrary: Error | null;
  communityId: string | undefined;
  currentUserId: string | undefined;
  onAttach: (id: string) => void;
  onEditGlobal: (sidequest: Sidequest) => void;
  onDeleteGlobal: (id: string, title: string) => void;
  onTogglePublic: (id: string, currentState: boolean) => void;
  onOpenCreateGlobalForm: () => void;
  // Functions to render various states - these would be passed from the main modal or a shared util
  renderLoadingState: (view: 'mine' | 'community') => React.ReactNode;
  renderErrorState: (error: Error | null, view: 'mine' | 'community') => React.ReactNode;
  renderEmptyState: (message: string, view: 'mine' | 'community', onCreate?: () => void) => React.ReactNode;
  attachedSidequestsData?: AttachedSidequest[];
}

export const LibraryTabView: React.FC<LibraryTabViewProps> = ({
  myLibraryData,
  isLoadingMyLibrary,
  isErrorMyLibrary,
  errorMyLibrary,
  communityId,
  currentUserId,
  onAttach,
  onEditGlobal,
  onDeleteGlobal,
  onTogglePublic,
  onOpenCreateGlobalForm,
  // Use placeholders for now, these will be passed from parent later
  renderLoadingState = PlaceholderRenderLoadingState,
  renderErrorState = PlaceholderRenderErrorState,
  renderEmptyState = (msg, view, onCreate) => PlaceholderRenderEmptyState(msg, view, onCreate),
  attachedSidequestsData = [],
}) => {
  const attachedIds = attachedSidequestsData.map(sq => sq.id);
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between mb-6 flex-shrink-0">
        <h3 className="text-lg font-medium">
          My Sidequest Library
        </h3>
        <Button 
          onClick={onOpenCreateGlobalForm} 
          variant="outline" 
          size="sm" 
          disabled={!communityId || !currentUserId} // This logic remains
          className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40"
        >
          <PlusCircle className="mr-2 h-4 w-4"/> Create New
        </Button>
      </div>
      
      {(!communityId || !currentUserId) && !isLoadingMyLibrary && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground">User or community context not available.</p>
        </div>
      )}
      
      {isLoadingMyLibrary && communityId && currentUserId && renderLoadingState('mine')}
      
      {isErrorMyLibrary && communityId && currentUserId && renderErrorState(errorMyLibrary, 'mine')}
      
      {!isLoadingMyLibrary && !isErrorMyLibrary && communityId && currentUserId && (
        <ScrollArea className="flex-grow -mr-6 pr-6"> {/* ScrollArea wraps the grid */}
          <SidequestCardGrid 
            sidequests={myLibraryData}
            isMyLibrary={true}
            onAttach={onAttach}
            onEdit={onEditGlobal}
            onDelete={onDeleteGlobal}
            onTogglePublic={onTogglePublic}
            onCreateNew={onOpenCreateGlobalForm} // Pass the callback for the "Create New" card
            renderEmptyState={(message, view) => renderEmptyState(message, view, onOpenCreateGlobalForm)} // Pass onCreate to empty state
            attachedSidequestIds={attachedIds}
          />
        </ScrollArea>
      )}
    </div>
  );
}; 