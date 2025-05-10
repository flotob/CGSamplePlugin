import React from 'react';
import type { Sidequest } from '@/types/sidequests';
import { Card } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { SidequestCard } from '../SidequestCard.tsx'; // Explicitly add .tsx extension
import { ScrollArea } from '@/components/ui/scroll-area'; // Keep ScrollArea here for now

// Props definition for SidequestCardGrid
interface SidequestCardGridProps {
  sidequests: Sidequest[] | undefined;
  isMyLibrary: boolean;
  onAttach: (id: string) => void;
  onEdit?: (sidequest: Sidequest) => void;
  onDelete?: (id: string) => void;
  onTogglePublic?: (id: string, currentState: boolean) => void;
  onCreateNew: () => void; // Callback for the "Create New" card
  renderEmptyState: (message: string, view: 'mine' | 'community') => React.ReactNode;
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
}) => {
  if (!sidequests || sidequests.length === 0) {
    // If it's "My Library" and it's empty, we show the "Create New" card *before* the empty state.
    // Or, we can make the empty state for "My Library" include the "Create New" button as it did.
    // For now, let's align with the original: the empty state for 'mine' has a button.
    // The "Create New" card is part of the grid itself.
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
          {/* Optionally, if you still want an "empty state" message after the create card: */}
          {/* {renderEmptyState(
            'Your library is empty. Create new content to get started.',
            'mine'
          )} */}
        </div>
      );
    }
    return renderEmptyState(
      'No public sidequests available in the community library yet.',
      'community'
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
      
      {sidequests.map(sidequest => (
        <SidequestCard
          key={sidequest.id}
          sidequest={sidequest}
          onAttach={onAttach}
          onEdit={isMyLibrary ? onEdit : undefined}
          onDelete={isMyLibrary ? onDelete : undefined}
          onTogglePublic={isMyLibrary ? onTogglePublic : undefined}
        />
      ))}
    </div>
  );
}; 