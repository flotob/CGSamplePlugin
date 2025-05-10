import React from 'react';
import type { Sidequest } from '@/types/sidequests';
import { Button } from '@/components/ui/button';
import { SidequestAdminListItem } from '../SidequestAdminListItem';
import { PlusCircle, BookIcon, Globe2Icon, Loader2, AlertCircle, ArrowLeftIcon } from 'lucide-react';

// Placeholder render functions (can be replaced by props or a shared util)
const PlaceholderRenderLoadingState = (view: 'mine' | 'community') => (
  <div className="flex flex-col items-center justify-center h-40">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4"/>
    <p className="text-muted-foreground">Loading {view} items...</p>
  </div>
);
const PlaceholderRenderErrorState = (error: Error | null, view: 'mine' | 'community', onRetry: () => void) => (
  <div className="flex flex-col items-center justify-center h-40 text-destructive text-center p-4">
    <AlertCircle className="h-8 w-8 mb-3" /> 
    <p className="font-medium mb-1">Error loading items</p>
    <p className="text-xs">{error?.message || "An unexpected error occurred."}</p>
    <Button variant="outline" size="sm" className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={onRetry}>
      <ArrowLeftIcon className="mr-2 h-3.5 w-3.5" /> Retry
    </Button>
  </div>
);
const PlaceholderRenderEmptyState = (message: string, view: 'mine' | 'community', onCreate?: () => void) => (
  <div className="flex flex-col items-center justify-center h-60 text-center p-6">
    <div className="bg-muted/30 rounded-full p-5 mb-4">
      {view === 'mine' && <BookIcon className="h-8 w-8 text-muted-foreground" />}
      {view === 'community' && <Globe2Icon className="h-8 w-8 text-muted-foreground" />}
    </div>
    <p className="text-muted-foreground mb-4">{message}</p>
    {view === 'mine' && onCreate && (
      <Button onClick={onCreate} variant="outline" className="mt-2">
        <PlusCircle className="mr-2 h-4 w-4"/> Create New Sidequest
      </Button>
    )}
  </div>
);

interface LibraryContentRendererProps {
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
  stepId: string; // For SidequestAdminListItem
  communityId: string | undefined; // For SidequestAdminListItem
  onOpenCreateGlobalForm: () => void;
  onOpenEditGlobalForm: (sidequest: Sidequest) => void;
  onAttach: (globalSidequestId: string) => void;
  renderLoadingState?: (view: 'mine' | 'community') => React.ReactNode;
  renderErrorState?: (error: Error | null, view: 'mine' | 'community', onRetry: () => void) => React.ReactNode;
  renderEmptyState?: (message: string, view: 'mine' | 'community', onCreate?: () => void) => React.ReactNode;
  refetchMyLibrary: () => void;
  refetchCommunityLibrary: () => void;
}

export const LibraryContentRenderer: React.FC<LibraryContentRendererProps> = ({
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
  stepId,
  communityId,
  onOpenCreateGlobalForm,
  onOpenEditGlobalForm,
  onAttach,
  renderLoadingState = PlaceholderRenderLoadingState,
  renderErrorState = PlaceholderRenderErrorState,
  renderEmptyState = PlaceholderRenderEmptyState,
  refetchMyLibrary,
  refetchCommunityLibrary,
}) => {
  const isMyLibraryViewActive = activeLibraryView === 'mine';
  const libraryData = isMyLibraryViewActive ? myLibraryData : communityLibraryData;
  const isLoading = isMyLibraryViewActive ? isLoadingMyLibrary : isLoadingCommunityLibrary;
  const isError = isMyLibraryViewActive ? isErrorMyLibrary : isErrorCommunityLibrary;
  const error = isMyLibraryViewActive ? errorMyLibrary : errorCommunityLibrary;
  const currentViewType = isMyLibraryViewActive ? 'mine' : 'community';
  const retryFetch = isMyLibraryViewActive ? refetchMyLibrary : refetchCommunityLibrary;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center border-b pb-3 mb-3">
        <div className="flex">
          <Button 
            variant={isMyLibraryViewActive ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setActiveLibraryView('mine')}
            className="rounded-r-none border-r"
          >
            <BookIcon className="h-4 w-4 mr-1.5" /> My Library
          </Button>
          <Button 
            variant={!isMyLibraryViewActive ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setActiveLibraryView('community')}
            className="rounded-l-none"
          >
            <Globe2Icon className="h-4 w-4 mr-1.5" /> Community
          </Button>
        </div>
        {isMyLibraryViewActive && (
          <Button 
            onClick={onOpenCreateGlobalForm} 
            size="sm" 
            variant="outline"
            className="bg-primary/5 border-primary/20"
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5"/> New
          </Button>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {isLoading && renderLoadingState(currentViewType)}
        
        {isError && renderErrorState(error, currentViewType, retryFetch)}
        
        {!isLoading && !isError && (
          libraryData && libraryData.length > 0 ? (
            <div className="space-y-2 pr-2">
              {libraryData.map(sq => (
                <div key={sq.id} className="relative group">
                  <SidequestAdminListItem 
                    sidequest={sq} 
                    stepId={stepId} 
                    viewMode={isMyLibraryViewActive ? 'myLibrary' : 'communityLibrary'} 
                    onEditGlobal={isMyLibraryViewActive ? () => onOpenEditGlobalForm(sq) : undefined} 
                    communityId={communityId} 
                    isAttaching={true}
                    onAttach={onAttach} 
                  />
                </div>
              ))}
            </div>
          ) : renderEmptyState(
            isMyLibraryViewActive 
              ? 'Your library is empty. Create new content to get started.' 
              : 'No public sidequests available in the community library yet.',
            currentViewType,
            isMyLibraryViewActive ? onOpenCreateGlobalForm : undefined
          )
        )}
      </div>
    </div>
  );
}; 