import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Sidequest, AttachedSidequest } from '@/types/sidequests';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit3, Trash2, Loader2, Globe, Lock, LinkIcon } from 'lucide-react'; 
import { useDetachSidequestFromStepMutation } from '@/hooks/useStepAttachedSidequestMutations';
import { useDeleteGlobalSidequestMutation, useToggleSidequestPublicMutation } from '@/hooks/useSidequestLibraryHooks';
import Image from 'next/image';

// Assuming AlertDialog components from shadcn/ui might be used later
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";

export type SidequestAdminListItemViewMode = 'attached' | 'myLibrary' | 'communityLibrary';

interface SidequestAdminListItemProps {
  sidequest: Sidequest | AttachedSidequest; // Can be global or attached
  stepId: string; // Context for some operations like detaching or attaching
  viewMode: SidequestAdminListItemViewMode;
  communityId?: string; // Required for global delete and toggle public
  onEditGlobal?: (sidequest: Sidequest) => void; // To edit the global sidequest entity
  // onDetach?: (attachmentId: string) => void; // Detach action is handled internally now
  isAttaching?: boolean; // True if the library view is in "select to attach" mode
  onAttach?: (globalSidequestId: string) => void;
}

export const SidequestAdminListItem: React.FC<SidequestAdminListItemProps> = ({
  sidequest,
  stepId,
  viewMode,
  communityId,
  onEditGlobal,
  isAttaching,
  onAttach,
}) => {
  // const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // For AlertDialog
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: viewMode === 'attached' ? (sidequest as AttachedSidequest).attachment_id : sidequest.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1, // Slightly more pronounced drag opacity
    zIndex: isDragging ? 10 : 'auto', // Ensure dragging item is above others
  };

  const detachMutation = useDetachSidequestFromStepMutation();
  const deleteGlobalMutation = useDeleteGlobalSidequestMutation();
  const togglePublicMutation = useToggleSidequestPublicMutation();

  const handleDetach = () => {
    if (viewMode === 'attached' && (sidequest as AttachedSidequest).attachment_id) {
      if (confirm(`Are you sure you want to detach "${sidequest.title}" from this step?`)) {
        detachMutation.mutate({ stepId, attachmentId: (sidequest as AttachedSidequest).attachment_id });
      }
    }
  };

  const handleDeleteGlobal = () => {
    if (viewMode === 'myLibrary' && communityId) {
      if (confirm(`Are you sure you want to permanently delete "${sidequest.title}" from the library? This cannot be undone.`)) {
        deleteGlobalMutation.mutate({ sidequestId: sidequest.id, communityIdIfKnown: communityId });
      }
    }
  };

  const handleTogglePublic = () => {
    if ((viewMode === 'myLibrary') && communityId) {
        togglePublicMutation.mutate({ sidequestId: sidequest.id, is_public: !sidequest.is_public });
    }
  };
  
  const currentSidequest = sidequest as Sidequest; // Base for common properties
  const attachedInfo = viewMode === 'attached' ? sidequest as AttachedSidequest : null;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="p-3 border rounded-md bg-card shadow-sm flex items-center gap-3 transition-shadow duration-150 ease-in-out hover:shadow-md"
    >
      {viewMode === 'attached' && (
        <button {...listeners} {...attributes} className="cursor-grab p-1.5 text-muted-foreground hover:bg-muted rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      {currentSidequest.image_url && (
        <div className="relative w-10 h-10 md:w-12 md:h-12 rounded overflow-hidden bg-muted flex-shrink-0 border">
          <Image src={currentSidequest.image_url} alt={currentSidequest.title} layout="fill" objectFit="cover" unoptimized />
        </div>
      )}
      
      <div className="flex-grow min-w-0"> {/* Added min-w-0 for better truncation if needed */}
        <p className="font-medium leading-tight truncate" title={currentSidequest.title}>{currentSidequest.title}</p>
        <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground capitalize">{currentSidequest.sidequest_type}</p>
            {viewMode === 'attached' && attachedInfo && (
                <p className="text-xs text-muted-foreground">Order: {attachedInfo.display_order}</p>
            )}
            {viewMode !== 'attached' && (
                <Button variant="link" size="icon" className={`h-5 w-5 p-0 ${currentSidequest.is_public ? 'text-blue-500' : 'text-muted-foreground'}`} title={currentSidequest.is_public ? "Public in community library" : "Private to you"}>
                    {currentSidequest.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                </Button>
            )}
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-0.5 ml-auto">
        {viewMode === 'myLibrary' && onEditGlobal && (
          <Button variant="ghost" size="icon" onClick={() => onEditGlobal(currentSidequest)} title="Edit Global Sidequest">
            <Edit3 className="h-4 w-4" />
          </Button>
        )}

        {viewMode === 'attached' && onEditGlobal && (
            // Option to edit the global source of an attached item
            <Button variant="ghost" size="icon" onClick={() => onEditGlobal(currentSidequest)} title="Edit Source Sidequest">
                <Edit3 className="h-4 w-4" />
            </Button>
        )}

        {isAttaching && (viewMode === 'myLibrary' || viewMode === 'communityLibrary') && onAttach && (
          <Button variant="outline" size="sm" onClick={() => onAttach(currentSidequest.id)} title="Attach this sidequest to the current step">
            <LinkIcon className="mr-1.5 h-3.5 w-3.5"/> Attach
          </Button>
        )}

        {viewMode === 'attached' && attachedInfo && (
          <Button 
              variant="ghost" size="icon" 
              onClick={handleDetach}
              disabled={detachMutation.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10" 
              title="Detach Sidequest from Step"
          >
              {detachMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        )}

        {viewMode === 'myLibrary' && (
            <>
                <Button 
                    variant="ghost" size="icon" 
                    onClick={handleTogglePublic}
                    disabled={togglePublicMutation.isPending}
                    title={currentSidequest.is_public ? "Make Private" : "Make Public"}
                    className="text-muted-foreground hover:text-foreground"
                >
                    {togglePublicMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (currentSidequest.is_public ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />) }
                </Button>
                <Button 
                    variant="ghost" size="icon" 
                    onClick={handleDeleteGlobal}
                    disabled={deleteGlobalMutation.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                    title="Delete Sidequest from Library"
                >
                    {deleteGlobalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
            </>
        )}
      </div>
    </div>
  );
}; 