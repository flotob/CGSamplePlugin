import React, { useState } from 'react';
import type { AttachedSidequest } from '@/types/sidequests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { XIcon, LinkIcon, YoutubeIcon, FileTextIcon, ImageOffIcon } from 'lucide-react';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';
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

interface SidequestInlineDisplayCardProps {
  sidequest: AttachedSidequest;
  onDetach: (attachmentId: string) => void;
  disabled?: boolean;
  className?: string;
}

const SidequestTypeIcon = ({ type, className }: { type: AttachedSidequest['sidequest_type'], className?: string }) => {
  const iconProps = { className: cn("h-4 w-4", className) };
  if (type === 'youtube') return <YoutubeIcon {...iconProps} className={cn("text-red-500", className)} />;
  if (type === 'link') return <LinkIcon {...iconProps} className={cn("text-blue-500", className)} />;
  if (type === 'markdown') return <FileTextIcon {...iconProps} className={cn("text-green-500", className)} />;
  return null;
};

export const SidequestInlineDisplayCard: React.FC<SidequestInlineDisplayCardProps> = ({
  sidequest,
  onDetach,
  disabled = false,
  className,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleOpenConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled) {
      setIsConfirmOpen(true);
    }
  };

  const handleDetachConfirmed = () => {
    onDetach(sidequest.attachment_id);
    setIsConfirmOpen(false);
  };

  return (
    <>
      <Card className={cn(
        "w-52 h-auto flex flex-col group relative shrink-0",
        "shadow-sm hover:shadow-md transition-all duration-200 ease-in-out",
        "border hover:border-primary/40",
        className
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 z-10 bg-card/80 hover:bg-destructive/90 hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out disabled:opacity-50 shadow-sm"
          onClick={handleOpenConfirm}
          disabled={disabled}
          title="Detach Sidequest"
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Detach</span>
        </Button>

        <CardHeader className="p-0 aspect-[16/9] relative w-full overflow-hidden rounded-t-md">
          {sidequest.image_url ? (
            <NextImage 
              src={sidequest.image_url} 
              alt={sidequest.title} 
              layout="fill" 
              objectFit="cover"
              unoptimized // Assuming external images that might not be in next/image optimizer config
              className="transition-transform duration-300 ease-in-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ImageOffIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          {/* Type badge */}
          <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-full py-1 px-2 shadow-sm flex items-center gap-1.5">
            <SidequestTypeIcon type={sidequest.sidequest_type} className="h-3.5 w-3.5" />
            <span className="text-xs capitalize font-medium text-foreground/90">{sidequest.sidequest_type}</span>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 flex-grow">
          <h4 
              className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors duration-150 ease-in-out"
              title={sidequest.title}
          >
              {sidequest.title}
          </h4>
          {sidequest.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2" title={sidequest.description}>
              {sidequest.description}
            </p>
          )}
        </CardContent>
        
        <CardFooter className="p-3 pt-0 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Order: {sidequest.display_order + 1}</span>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach Sidequest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{sidequest.title}" from this step. The sidequest will remain in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDetachConfirmed} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Detach</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 