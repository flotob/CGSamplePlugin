import React, { useState } from 'react';
import type { Sidequest } from '@/types/sidequests';
import { Button } from '@/components/ui/button';
import { Link2Icon, Edit3 as Edit3Icon, Trash as TrashIcon, Lock as LockIcon, Unlock as UnlockIcon, Youtube as YoutubeIcon, FileText as FileTextIcon, ImageOff as ImageOffIcon, Globe2Icon } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

// Card component for Library and Community views
export const SidequestCard: React.FC<{
  sidequest: Sidequest;
  onAttach: (id: string) => void;
  onEdit?: (sidequest: Sidequest) => void;
  onDelete?: (id: string) => void;
  onTogglePublic?: (id: string, currentState: boolean) => void;
  isPublic?: boolean; // This prop seems unused based on original code, consider removing if not needed
}> = ({ 
  sidequest, 
  onAttach, 
  onEdit, 
  onDelete, 
  onTogglePublic, 
  // isPublic // Prop was destructured but not used
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