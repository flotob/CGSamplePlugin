import React, { /*useState*/ } from 'react';
import type { Sidequest, AttachedSidequest } from '@/types/sidequests';
// import { Input } from '@/components/ui/input'; // Removed unused
import { SidequestCardGrid } from './SidequestCardGrid';
import { Loader2, AlertCircle } from 'lucide-react'; // Assuming these icons are needed
// import { useGetSidequestLibrary } from '@/hooks/useSidequestLibraryAdminHooks'; // Commented out potentially problematic import
// import { SidequestCard } from '../SidequestCard'; // Removed unused

// Placeholder render functions (similar to LibraryTabView)
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
const PlaceholderRenderEmptyState = (
  message: string, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _view: 'mine' | 'community'
) => {
  return (
    <div className="flex flex-col items-center justify-center h-60 text-center p-6">
      <p className="text-muted-foreground mb-4">{message}</p>
    </div>
  );
};

interface CommunityTabViewProps {
  communityLibraryData: Sidequest[] | undefined;
  isLoadingCommunityLibrary: boolean;
  isErrorCommunityLibrary: boolean;
  errorCommunityLibrary: Error | null;
  communityId: string | undefined;
  onAttach: (id: string) => void;
  onOpenCreateGlobalForm: () => void; // Added to match SidequestCardGrid's onCreateNew prop if needed by empty state
  // Functions to render various states - these would be passed from the main modal or a shared util
  renderLoadingState: (view: 'mine' | 'community') => React.ReactNode;
  renderErrorState: (error: Error | null, view: 'mine' | 'community') => React.ReactNode;
  renderEmptyState?: (message: string, view: 'mine' | 'community', onCreate?: () => void) => React.ReactNode;
  attachedSidequestsData?: AttachedSidequest[]; // New prop
}

export const CommunityTabView: React.FC<CommunityTabViewProps> = ({
  communityLibraryData,
  isLoadingCommunityLibrary,
  isErrorCommunityLibrary,
  errorCommunityLibrary,
  communityId,
  onAttach,
  onOpenCreateGlobalForm, // Destructure, even if not directly used by CommunityTab header
  // Use placeholders for now
  renderLoadingState = PlaceholderRenderLoadingState,
  renderErrorState = PlaceholderRenderErrorState,
  renderEmptyState = PlaceholderRenderEmptyState,
  attachedSidequestsData = [], // Default to empty array
}) => {
  // const [searchTerm, setSearchTerm] = useState(''); // Removed unused searchTerm and setSearchTerm

  // Commented out the local useGetSidequestLibrary call as data is passed via props
  // const { data: sidequestsResponse, isLoading, error } = useGetSidequestLibrary(
  // This useGetSidequestLibrary call seems to be a leftover or incorrect, 
  // as communityLibraryData is passed as a prop. Removing it to avoid confusion and potential errors.
  // );

  const attachedIds = attachedSidequestsData.map(sq => sq.id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between mb-6 flex-shrink-0">
        <h3 className="text-lg font-medium">
          Community Sidequest Library
          <span className="text-xs ml-2 text-muted-foreground font-normal">(Public sidequests)</span>
        </h3>
        {/* No "Create New" button directly in the Community tab header */}
      </div>
      
      {(!communityId) && !isLoadingCommunityLibrary && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground">Community context not available.</p>
        </div>
      )}
      
      {isLoadingCommunityLibrary && communityId && renderLoadingState('community')}
      
      {isErrorCommunityLibrary && communityId && renderErrorState(errorCommunityLibrary, 'community')}
      
      {!isLoadingCommunityLibrary && !isErrorCommunityLibrary && communityId && (
        <div className="flex-grow overflow-y-auto -mr-6 pr-6">
          <SidequestCardGrid 
            sidequests={communityLibraryData}
            isMyLibrary={false}
            onAttach={onAttach}
            onCreateNew={onOpenCreateGlobalForm} 
            renderEmptyState={(message, view) => renderEmptyState(message, view)} 
            attachedSidequestIds={attachedIds}
          />
        </div>
      )}
    </div>
  );
}; 