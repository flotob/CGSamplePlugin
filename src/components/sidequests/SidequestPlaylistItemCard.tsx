'use client';

import React from 'react';
import type { Sidequest } from '@/types/sidequests'; // As per docs/rework-sidequests.md
import { Card, CardContent } from "@/components/ui/card";
import { Youtube, Link, FileText, Image as ImageIcon } from 'lucide-react'; // Icons
import Image from 'next/image'; // Added next/image import

interface SidequestPlaylistItemCardProps {
  sidequest: Sidequest;
  onOpenSidequest: (sidequest: Sidequest) => void;
}

export const SidequestPlaylistItemCard: React.FC<SidequestPlaylistItemCardProps> = ({
  sidequest,
  onOpenSidequest,
}) => {
  const { title, image_url, sidequest_type } = sidequest;

  const TypeIcon = () => {
    switch (sidequest_type) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-500" />;
      case 'link':
        return <Link className="h-4 w-4 text-blue-500" />;
      case 'markdown':
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <Card 
      className="mb-2 cursor-pointer hover:shadow-lg transition-shadow duration-200 ease-in-out"
      onClick={() => onOpenSidequest(sidequest)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onOpenSidequest(sidequest);
        }
      }}
      aria-label={`Open sidequest: ${title}`}
    >
      <CardContent className="p-3 flex items-center space-x-3">
        <div className="flex-shrink-0 w-16 h-10 bg-muted rounded overflow-hidden flex items-center justify-center relative">
          {image_url ? (
            <Image 
              src={image_url} 
              alt={title} 
              fill 
              className="object-cover" 
              unoptimized // Assuming image_url can be any external URL
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-gray-400" /> // Placeholder if no image
          )}
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="text-sm font-medium truncate" title={title}>
            {title}
          </h3>
        </div>
        <div className="flex-shrink-0">
          <TypeIcon />
        </div>
      </CardContent>
    </Card>
  );
}; 