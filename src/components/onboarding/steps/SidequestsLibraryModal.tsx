import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  AlertCircle, 
  PlusCircle, 
  XIcon, 
  Link2Icon, 
  UserSquare2Icon, 
  Globe2Icon, 
  ArrowLeftIcon,
  ListIcon,
  BookIcon,
  Edit3 as Edit3Icon,
  Trash as TrashIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Youtube as YoutubeIcon,
  FileText as FileTextIcon,
  ImageOff as ImageOffIcon
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
import type { Sidequest } from '@/types/sidequests';
import { SidequestAdminListItem } from './SidequestAdminListItem';
import { SidequestForm } from './SidequestForm';
import { useAuth } from '@/context/AuthContext'; 
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidequestsLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepId: string;
  wizardId: string; 
}

// Card component for Library and Community views
const SidequestCard: React.FC<{
  sidequest: Sidequest;
  onAttach: (id: string) => void;
  onEdit?: (sidequest: Sidequest) => void;
  onDelete?: (id: string) => void;
  onTogglePublic?: (id: string, currentState: boolean) => void;
  isPublic?: boolean;
}> = ({ 
  sidequest, 
  onAttach, 
  onEdit, 
  onDelete, 
  onTogglePublic, 
  isPublic 
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Icon for sidequest type
  const getSidequestTypeIcon = () => {
    switch(sidequest.sidequest_type) {
      case 'youtube': return <YoutubeIcon className="h-4 w-4 text-red-500" />;
      case 'link': return <Link2Icon className="h-4 w-4 text-blue-500" />;
      case 'markdown': return <FileTextIcon className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  return (
    <>
      <Card className="w-full h-full flex flex-col group relative cursor-pointer hover:shadow-md transition-all duration-200 border hover:border-primary/30">
        {/* Image Section */}
        <CardHeader className="p-0 aspect-[16/9] relative w-full overflow-hidden rounded-t-md">
          {sidequest.image_url ? (
            <Image
              src={sidequest.image_url}
              alt={sidequest.title}
              fill
              className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ImageOffIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Type Badge */}
          <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-full py-1 px-2 shadow-sm flex items-center gap-1.5">
            {getSidequestTypeIcon()}
            <span className="text-xs capitalize font-medium text-foreground/90">{sidequest.sidequest_type}</span>
          </div>
          
          {/* Public/Private Badge - Only for personal library */}
          {onTogglePublic && (
            <div className="absolute top-2 left-2 rounded-full p-1 shadow-sm bg-background/50 backdrop-blur-sm">
              {sidequest.is_public ? (
                <Globe2Icon className="h-4 w-4 text-blue-500" />
              ) : (
                <LockIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
          
          {/* Action Buttons Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => onAttach(sidequest.id)} 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 px-3"
                  >
                    <Link2Icon className="h-3.5 w-3.5 mr-1.5" /> Attach
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach to current step</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Edit button - only for personal library */}
            {onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(sidequest);
                      }}
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8"
                    >
                      <Edit3Icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Toggle visibility button - only for personal library */}
            {onTogglePublic && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePublic(sidequest.id, sidequest.is_public);
                      }}
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8"
                    >
                      {sidequest.is_public ? (
                        <LockIcon className="h-3.5 w-3.5" />
                      ) : (
                        <UnlockIcon className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {sidequest.is_public ? "Make private" : "Make public"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Delete button - only for personal library */}
            {onDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteDialogOpen(true);
                      }}
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        
        {/* Content Section */}
        <CardContent className="p-3 flex-grow">
          <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors duration-200 ease-in-out" title={sidequest.title}>
            {sidequest.title}
          </h4>
          {sidequest.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2" title={sidequest.description}>
              {sidequest.description}
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Sidequest?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{sidequest.title}" from your library. This action cannot be undone.
                {sidequest.is_public && (
                  <p className="mt-2 font-medium">
                    Note: This is a public sidequest visible to others in the community.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  onDelete(sidequest.id);
                  setIsDeleteDialogOpen(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export const SidequestsLibraryModal: React.FC<SidequestsLibraryModalProps> = ({
  isOpen,
  onClose,
  stepId,
  wizardId,
}) => {
  // Renamed tabs
  type ActiveTab = 'composer' | 'library' | 'community';
  const [activeTab, setActiveTab] = useState<ActiveTab>('composer');
  const [formMode, setFormMode] = useState<'hidden' | 'createGlobal' | 'editGlobal'>('hidden');
  const [editingSidequestData, setEditingSidequestData] = useState<Sidequest | null>(null);
  const [isAttachingMode, setIsAttachingMode] = useState(false);
  const [activeLibraryView, setActiveLibraryView] = useState<'mine' | 'community'>('mine');
  
  const { decodedPayload } = useAuth(); 
  const communityId = decodedPayload?.cid;
  const currentUserId = decodedPayload?.sub; 

  const queryClient = useQueryClient();

  // Data Fetching for "Composer" Tab
  const { 
    data: attachedSidequestsData, 
    isLoading: isLoadingAttached, 
    isError: isErrorAttached, 
    error: errorAttached, 
    refetch: refetchAttachedSidequests 
  } = useGetStepAttachedSidequests(stepId, { enabled: isOpen && !!stepId });
  
  // Data Fetching for "Library" Tab and sidebar in Composer
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

  // Data Fetching for "Community" Tab and sidebar in Composer when toggled
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
      // Smart refetching - load all data needed for composer view
      if (stepId) refetchAttachedSidequests();
      if (communityId && currentUserId) refetchMyLibrary();
      if (communityId) refetchCommunityLibrary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepId, communityId, currentUserId]);

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
        // Don't switch tabs in composer view
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

  const renderEmptyState = (message: string, view: 'attached' | 'mine' | 'community') => (
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
      {view === 'mine' && (
        <Button onClick={handleOpenCreateGlobalForm} variant="outline" className="mt-2">
          <PlusCircle className="mr-2 h-4 w-4"/> Create New Sidequest
        </Button>
      )}
    </div>
  );

  const renderLoadingState = (view: 'attached' | 'mine' | 'community') => (
    <div className="flex flex-col items-center justify-center h-40">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4"/>
      <p className="text-muted-foreground">
        {view === 'attached' && "Loading attached sidequests..."}
        {view === 'mine' && "Loading your library..."}
        {view === 'community' && "Loading community library..."}
      </p>
    </div>
  );

  const renderErrorState = (error: Error | null, view: 'attached' | 'mine' | 'community') => (
    <div className="flex flex-col items-center justify-center h-40 text-destructive text-center p-4">
      <AlertCircle className="h-8 w-8 mb-3" /> 
      <p className="font-medium mb-1">Error loading sidequests</p>
      <p className="text-xs">{error?.message || "An unexpected error occurred."}</p>
      <Button 
        variant="outline" 
        size="sm"
        className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10" 
        onClick={() => {
          if (view === 'attached') refetchAttachedSidequests();
          else if (view === 'mine') refetchMyLibrary();
          else refetchCommunityLibrary();
        }}
      >
        <ArrowLeftIcon className="mr-2 h-3.5 w-3.5" /> Retry
      </Button>
    </div>
  );

  // Render the sidebar library content
  const renderLibraryContent = () => {
    const isMyLibrary = activeLibraryView === 'mine';
    const libraryData = isMyLibrary ? myLibraryData : communityLibraryData;
    const isLoading = isMyLibrary ? isLoadingMyLibrary : isLoadingCommunityLibrary;
    const isError = isMyLibrary ? isErrorMyLibrary : isErrorCommunityLibrary;
    const error = isMyLibrary ? errorMyLibrary : errorCommunityLibrary;
    
    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center border-b pb-3 mb-3">
          <div className="flex">
            <Button 
              variant={isMyLibrary ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setActiveLibraryView('mine')}
              className="rounded-r-none border-r"
            >
              <BookIcon className="h-4 w-4 mr-1.5" /> My Library
            </Button>
            <Button 
              variant={!isMyLibrary ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setActiveLibraryView('community')}
              className="rounded-l-none"
            >
              <Globe2Icon className="h-4 w-4 mr-1.5" /> Community
            </Button>
          </div>
          {isMyLibrary && (
            <Button 
              onClick={handleOpenCreateGlobalForm} 
              size="sm" 
              variant="outline"
              className="bg-primary/5 border-primary/20"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5"/> New
            </Button>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-grow overflow-y-auto">
          {isLoading && renderLoadingState(isMyLibrary ? 'mine' : 'community')}
          
          {isError && renderErrorState(error, isMyLibrary ? 'mine' : 'community')}
          
          {!isLoading && !isError && (
            libraryData && libraryData.length > 0 ? (
              <div className="space-y-2 pr-2">
                {libraryData.map(sq => (
                  <div key={sq.id} className="relative group">
                    <SidequestAdminListItem 
                      sidequest={sq} 
                      stepId={stepId} 
                      viewMode={isMyLibrary ? 'myLibrary' : 'communityLibrary'} 
                      onEditGlobal={isMyLibrary ? () => handleOpenEditGlobalForm(sq) : undefined} 
                      communityId={communityId} 
                      isAttaching={true}
                      onAttach={handleAttachThisSidequest} 
                    />
                  </div>
                ))}
              </div>
            ) : renderEmptyState(
              isMyLibrary 
                ? 'Your library is empty. Create new content to get started.' 
                : 'No public sidequests available in the community library yet.',
              isMyLibrary ? 'mine' : 'community'
            )
          )}
        </div>
      </div>
    );
  };

  // Render card grid for Library or Community tab
  const renderCardGrid = (sidequests: Sidequest[] | undefined, isMyLibrary: boolean) => {
    if (!sidequests || sidequests.length === 0) {
      return renderEmptyState(
        isMyLibrary 
          ? 'Your library is empty. Create new content to get started.' 
          : 'No public sidequests available in the community library yet.',
        isMyLibrary ? 'mine' : 'community'
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
        {isMyLibrary && (
          <Card 
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 border-2 border-dashed bg-muted/10
                      hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
            onClick={handleOpenCreateGlobalForm}
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
            onAttach={handleAttachThisSidequest}
            onEdit={isMyLibrary ? handleOpenEditGlobalForm : undefined}
            onDelete={isMyLibrary ? handleDeleteGlobal : undefined}
            onTogglePublic={isMyLibrary ? handleTogglePublic : undefined}
          />
        ))}
      </div>
    );
  };

  const renderMainContent = () => {
    // Form view - slides in from the right
    if (formMode === 'createGlobal' || formMode === 'editGlobal') {
      return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-10 duration-300">
          <div className="border-b mb-4 pb-4 flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCloseForm} 
              className="mr-4"
            >
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

    // Tabs view
    return (
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => {
          setActiveTab(value as ActiveTab);
        }} 
        className="flex-grow flex flex-col"
      >
        <div className="border-b pb-4 sticky top-0 bg-background z-10 pt-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="composer" className="text-xs sm:text-sm">
              <ListIcon className="mr-1.5 h-4 w-4"/>
              <span className="sm:inline">Composer</span>
              <span className="ml-1.5">({attachedSidequestsData?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs sm:text-sm">
              <BookIcon className="mr-1.5 h-4 w-4"/>
              <span className="sm:inline">Library</span>
              <span className="ml-1.5">({myLibraryData?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="text-xs sm:text-sm">
              <Globe2Icon className="mr-1.5 h-4 w-4"/>
              <span className="sm:inline">Community</span>
              <span className="ml-1.5">({communityLibraryData?.length || 0})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Composer Tab - Split View */}
        <TabsContent value="composer" className="flex-grow flex flex-col outline-none focus:outline-none ring-0 focus:ring-0 mt-4">
          <div className="flex-grow flex flex-col sm:flex-row gap-6 overflow-hidden h-full">
            {/* Left side - Attached sidequests list */}
            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="text-base font-medium mb-4">Step Content</h3>
              
              {isLoadingAttached && renderLoadingState('attached')}
              
              {isErrorAttached && renderErrorState(errorAttached, 'attached')}
              
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
                              onEditGlobal={() => handleOpenEditGlobalForm(sq)}
                              communityId={communityId} 
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : renderEmptyState('No sidequests attached to this step yet', 'attached')}
                  
                  {reorderAttachedMutation.isPending && (
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
              {renderLibraryContent()}
            </div>
          </div>
        </TabsContent>

        {/* Library Tab - Card Grid View */}
        <TabsContent value="library" className="flex-grow flex flex-col outline-none focus:outline-none ring-0 focus:ring-0 mt-0 pt-4">
          <div className="flex justify-between mb-6 flex-shrink-0">
            <h3 className="text-lg font-medium">
              My Sidequest Library
            </h3>
            <Button 
              onClick={handleOpenCreateGlobalForm} 
              variant="outline" 
              size="sm" 
              disabled={!communityId || !currentUserId}
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
            <ScrollArea className="flex-grow -mr-6 pr-6">
              {renderCardGrid(myLibraryData, true)}
            </ScrollArea>
          )}
        </TabsContent>

        {/* Community Tab - Card Grid View */}
        <TabsContent value="community" className="flex-grow flex flex-col outline-none focus:outline-none ring-0 focus:ring-0 mt-0 pt-4">
          <div className="flex justify-between mb-6 flex-shrink-0">
            <h3 className="text-lg font-medium">
              Community Sidequest Library
              <span className="text-xs ml-2 text-muted-foreground font-normal">(Public sidequests)</span>
            </h3>
          </div>
          
          {(!communityId) && !isLoadingCommunityLibrary && (
            <div className="flex-grow flex items-center justify-center">
              <p className="text-muted-foreground">Community context not available.</p>
            </div>
          )}
          
          {isLoadingCommunityLibrary && communityId && renderLoadingState('community')}
          
          {isErrorCommunityLibrary && communityId && renderErrorState(errorCommunityLibrary, 'community')}
          
          {!isLoadingCommunityLibrary && !isErrorCommunityLibrary && communityId && (
            <ScrollArea className="flex-grow -mr-6 pr-6">
              {renderCardGrid(communityLibraryData, false)}
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  // Modal title based on current view
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