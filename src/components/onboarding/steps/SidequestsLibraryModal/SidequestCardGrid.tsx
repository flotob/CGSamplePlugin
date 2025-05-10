import React from 'react';
import type { Sidequest } from '@/types/sidequests';
import { Card } from "@/components/ui/card";
import { PlusCircle } from 'lucide-react';
import { SidequestCard } from '../SidequestCard'; // Adjusted path from previous refactor

// Props definition for SidequestCardGrid
interface SidequestCardGridProps {
  sidequests: Sidequest[] | undefined;
  isMyLibrary: boolean;
  onAttach: (id: string) => void;
  onEdit?: (sidequest: Sidequest) => void;
  onDelete?: (id: string, title: string) => void; // title was added
  onTogglePublic?: (id: string, currentState: boolean) => void;
  onCreateNew: () => void; // Callback for the "Create New" card
  renderEmptyState: (message: string, view: 'mine' | 'community', onCreate?: () => void) => React.ReactNode; // onCreate was added
  attachedSidequestIds?: string[]; // New prop: IDs of currently attached sidequests
}

export const SidequestCardGrid: React.FC<SidequestCardGridProps> = ({
  sidequests,
  isMyLibrary,
  onAttach,
  onEdit,
  onDelete,
  onTogglePublic,
  onCreateNew,
  renderEmptyState,
  attachedSidequestIds = [], // Default to empty array
}) => {
  // Create a Set for efficient lookup of attached IDs
  const attachedIdsSet = new Set(attachedSidequestIds);

  if (!sidequests || sidequests.length === 0) {
    if (isMyLibrary) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
          <Card 
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 border-2 border-dashed bg-muted/10
                      hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
            onClick={onCreateNew}
          >
            <div className="flex flex-col items-center justify-center text-center h-full gap-3">
              <div className="rounded-full bg-background p-3 shadow-sm">
                <PlusCircle className="h-8 w-8 text-muted-foreground/70" />
              </div>
              <p className="font-medium text-sm text-muted-foreground">Create New Sidequest</p>
            </div>
          </Card>
          {/* The empty state itself is rendered by the TabView if it needs a button */}
        </div>
      );
    }
    // For community library, if it's empty, the TabView's logic will handle renderEmptyState which doesn't have a create new button within the grid itself.
    // So this component just renders the grid content or nothing if sidequests is empty AND not isMyLibrary.
    // The parent TabView component is responsible for the overall empty state text.
    return renderEmptyState(
      isMyLibrary 
        ? 'Your library is empty. Create new content to get started.' 
        : 'No public sidequests available in the community library yet.',
      isMyLibrary ? 'mine' : 'community',
      isMyLibrary ? onCreateNew : undefined
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
      {isMyLibrary && (
        <Card 
          className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 border-2 border-dashed bg-muted/10
                    hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
          onClick={onCreateNew}
        >
          <div className="flex flex-col items-center justify-center text-center h-full gap-3">
            <div className="rounded-full bg-background p-3 shadow-sm">
              <PlusCircle className="h-8 w-8 text-muted-foreground/70" />
            </div>
            <p className="font-medium text-sm text-muted-foreground">Create New Sidequest</p>
          </div>
        </Card>
      )}
      
      {sidequests.map(sidequest => {
        const isAttached = attachedIdsSet.has(sidequest.id);
        return (
          <SidequestCard
            key={sidequest.id}
            sidequest={sidequest}
            onAttach={onAttach}
            onEdit={isMyLibrary ? onEdit : undefined}
            onDelete={isMyLibrary ? onDelete : undefined}
            onTogglePublic={isMyLibrary ? onTogglePublic : undefined}
            isAlreadyAttached={isAttached} // Pass the new prop
          />
        );
      })}
    </div>
  );
}; 