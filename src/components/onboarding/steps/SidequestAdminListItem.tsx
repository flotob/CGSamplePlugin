import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Sidequest } from '@/types/sidequests';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit3, Trash2, Loader2 } from 'lucide-react'; 
import { useDeleteSidequestMutation } from '@/hooks/useSidequestAdminMutations';
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

interface SidequestAdminListItemProps {
  sidequest: Sidequest;
  stepId: string; // For delete mutation context
  onEdit: (sidequest: Sidequest) => void;
}

export const SidequestAdminListItem: React.FC<SidequestAdminListItemProps> = ({ sidequest, stepId, onEdit }) => {
  // const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // For AlertDialog
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sidequest.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1, // Slightly more pronounced drag opacity
    zIndex: isDragging ? 10 : 'auto', // Ensure dragging item is above others
  };

  const deleteMutation = useDeleteSidequestMutation();

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(
      { stepId, sidequestId: sidequest.id },
      {
        onSuccess: () => {
          // setIsDeleteDialogOpen(false); // For AlertDialog
          // Query invalidation is handled in the hook's onSuccess
          // console.log('Sidequest deleted successfully');
        },
        onError: (error) => {
          // console.error('Failed to delete sidequest:', error.message);
          // Handle with toast or other user feedback
        }
      }
    );
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="p-3 border rounded-md bg-card shadow-sm flex items-center gap-3 transition-shadow duration-150 ease-in-out hover:shadow-md"
    >
      <button {...listeners} {...attributes} className="cursor-grab p-1.5 text-muted-foreground hover:bg-muted rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
        <GripVertical className="h-5 w-5" />
      </button>

      {sidequest.image_url && (
        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0 border">
          <Image src={sidequest.image_url} alt={sidequest.title} layout="fill" objectFit="cover" unoptimized />
        </div>
      )}
      
      <div className="flex-grow min-w-0"> {/* Added min-w-0 for better truncation if needed */}
        <p className="font-medium leading-tight truncate" title={sidequest.title}>{sidequest.title}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {sidequest.sidequest_type} - Order: {sidequest.display_order}
        </p>
      </div>

      <div className="flex-shrink-0 flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="icon" onClick={() => onEdit(sidequest)} title="Edit Sidequest">
          <Edit3 className="h-4 w-4" />
        </Button>

        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { 
                if (confirm(`Are you sure you want to delete the sidequest "${sidequest.title}"? This action cannot be undone.`)) {
                    handleDeleteConfirm();
                }
            }}
            disabled={deleteMutation.isPending}
            className="text-destructive hover:text-destructive hover:bg-destructive/10" 
            title="Delete Sidequest"
        >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}; 