import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Sidequest, AttachedSidequest } from '@/types/sidequests';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit3, Trash2, Loader2, Globe, Lock, LinkIcon } from 'lucide-react'; 
import { useDetachSidequestFromStepMutation } from '@/hooks/useStepAttachedSidequestMutations';
import { useDeleteGlobalSidequestMutation, useToggleSidequestPublicMutation } from '@/hooks/useSidequestLibraryHooks';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [isDetachDialogOpen, setIsDetachDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const detachMutation = useDetachSidequestFromStepMutation();
  const deleteGlobalMutation = useDeleteGlobalSidequestMutation();
  const togglePublicMutation = useToggleSidequestPublicMutation();

  const handleDetach = () => {
    if (viewMode === 'attached' && (sidequest as AttachedSidequest).attachment_id) {
      setIsDetachDialogOpen(true);
    }
  };

  const handleDetachConfirmed = () => {
    if (viewMode === 'attached' && (sidequest as AttachedSidequest).attachment_id) {
      detachMutation.mutate({ 
        stepId, 
        attachmentId: (sidequest as AttachedSidequest).attachment_id 
      });
      setIsDetachDialogOpen(false);
    }
  };

  const handleDeleteGlobal = () => {
    if (viewMode === 'myLibrary' && communityId) {
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteGlobalConfirmed = () => {
    if (viewMode === 'myLibrary' && communityId) {
      deleteGlobalMutation.mutate({ 
        sidequestId: sidequest.id, 
        communityIdIfKnown: communityId 
      });
      setIsDeleteDialogOpen(false);
    }
  };

  const handleTogglePublic = () => {
    if ((viewMode === 'myLibrary') && communityId) {
      togglePublicMutation.mutate({ 
        sidequestId: sidequest.id, 
        is_public: !sidequest.is_public 
      });
    }
  };
  
  const currentSidequest = sidequest as Sidequest; // Base for common properties
  const attachedInfo = viewMode === 'attached' ? sidequest as AttachedSidequest : null;

  return (
    <>
      <div 
        ref={setNodeRef} 
        style={style} 
        className="p-3 border rounded-md bg-card shadow-sm flex items-center gap-3 hover:shadow-md hover:border-muted-foreground/30 transition-all duration-200 ease-in-out"
      >
        {viewMode === 'attached' && (
          <button 
            {...listeners} 
            {...attributes} 
            className="cursor-grab p-1.5 text-muted-foreground hover:bg-muted rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        {currentSidequest.image_url && (
          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded overflow-hidden bg-muted flex-shrink-0 border">
            <Image src={currentSidequest.image_url} alt={currentSidequest.title} layout="fill" objectFit="cover" unoptimized />
          </div>
        )}
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium leading-tight truncate" title={currentSidequest.title}>{currentSidequest.title}</p>
            {viewMode !== 'attached' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center h-5 p-0 ${currentSidequest.is_public ? 'text-blue-500' : 'text-muted-foreground'}`}>
                      {currentSidequest.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {currentSidequest.is_public ? "Public in community library" : "Private to you"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground capitalize">{currentSidequest.sidequest_type}</p>
            {viewMode === 'attached' && attachedInfo && (
              <p className="text-xs text-muted-foreground">Order: {attachedInfo.display_order + 1}</p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1 ml-auto">
          {viewMode === 'myLibrary' && onEditGlobal && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEditGlobal(currentSidequest)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Edit sidequest</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {viewMode === 'attached' && onEditGlobal && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEditGlobal(currentSidequest)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Edit source sidequest</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {isAttaching && (viewMode === 'myLibrary' || viewMode === 'communityLibrary') && onAttach && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAttach(currentSidequest.id)} 
              className="flex items-center bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/40"
            >
              <LinkIcon className="mr-1.5 h-3.5 w-3.5"/> Attach
            </Button>
          )}

          {viewMode === 'attached' && attachedInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleDetach}
                    disabled={detachMutation.isPending}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                  >
                    {detachMutation.isPending ? 
                      <Loader2 className="h-4 w-4 animate-spin" /> : 
                      <Trash2 className="h-4 w-4" />
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Detach from step</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {viewMode === 'myLibrary' && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleTogglePublic}
                      disabled={togglePublicMutation.isPending}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      {togglePublicMutation.isPending ? 
                        <Loader2 className="h-4 w-4 animate-spin" /> : 
                        (currentSidequest.is_public ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />)
                      }
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {currentSidequest.is_public ? "Make private" : "Make public"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleDeleteGlobal}
                      disabled={deleteGlobalMutation.isPending}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                    >
                      {deleteGlobalMutation.isPending ? 
                        <Loader2 className="h-4 w-4 animate-spin" /> : 
                        <Trash2 className="h-4 w-4" />
                      }
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Delete from library</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      {/* Detach Confirmation Dialog */}
      <AlertDialog open={isDetachDialogOpen} onOpenChange={setIsDetachDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach Sidequest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{currentSidequest.title}" from this step. The sidequest will remain in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDetachConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Detach
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sidequest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{currentSidequest.title}" from your library. This action cannot be undone.
              {currentSidequest.is_public && (
                <p className="mt-2 font-medium">
                  Note: This is a public sidequest visible to others in the community.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGlobalConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 