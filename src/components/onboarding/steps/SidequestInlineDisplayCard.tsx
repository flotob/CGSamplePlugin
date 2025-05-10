import React from 'react';
import type { AttachedSidequest } from '@/types/sidequests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { XIcon, LinkIcon, YoutubeIcon, FileTextIcon, ImageOffIcon } from 'lucide-react';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';

interface SidequestInlineDisplayCardProps {
  sidequest: AttachedSidequest;
  onDetach: (attachmentId: string) => void;
  disabled?: boolean;
}

const SidequestTypeIcon = ({ type, className }: { type: AttachedSidequest['sidequest_type'], className?: string }) => {
  const iconProps = { className: cn("h-4 w-4", className) };
  if (type === 'youtube') return <YoutubeIcon {...iconProps} />;
  if (type === 'link') return <LinkIcon {...iconProps} />;
  if (type === 'markdown') return <FileTextIcon {...iconProps} />;
  return null;
};

export const SidequestInlineDisplayCard: React.FC<SidequestInlineDisplayCardProps> = ({
  sidequest,
  onDetach,
  disabled = false,
}) => {
  const handleDetachClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card click if any
    e.preventDefault();
    if (!disabled) {
      // Consider adding a confirm() dialog here for safety before detaching
      // if (confirm(`Are you sure you want to detach "${sidequest.title}"?`)) {
      //   onDetach(sidequest.attachment_id);
      // }
      // For now, direct detach as per current plan for SidequestAdminListItem internal delete
      onDetach(sidequest.attachment_id);
    }
  };

  return (
    <Card className="w-48 h-auto flex flex-col group relative shrink-0 shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 z-10 bg-card/70 hover:bg-destructive/80 hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out disabled:opacity-50"
        onClick={handleDetachClick}
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
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageOffIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        <h4 
            className="text-sm font-semibold leading-tight truncate group-hover:text-primary transition-colors duration-150 ease-in-out"
            title={sidequest.title}
        >
            {sidequest.title}
        </h4>
      </CardContent>
      <CardFooter className="p-3 pt-1 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1 capitalize">
            <SidequestTypeIcon type={sidequest.sidequest_type} />
            <span>{sidequest.sidequest_type}</span>
        </div>
        {/* Display order might be useful here if needed for admin reference */}
        {/* <span>Order: {sidequest.display_order}</span> */}
      </CardFooter>
    </Card>
  );
}; 