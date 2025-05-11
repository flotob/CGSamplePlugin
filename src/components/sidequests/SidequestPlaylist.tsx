'use client';

import React from 'react';
import type { Sidequest } from '@/types/sidequests';
import { SidequestPlaylistItemCard } from './SidequestPlaylistItemCard';

interface SidequestPlaylistProps {
  sidequests: Sidequest[] | null;
  onOpenSidequest: (sidequest: Sidequest) => void;
}

export const SidequestPlaylist: React.FC<SidequestPlaylistProps> = ({
  sidequests,
  onOpenSidequest,
}) => {
  if (!sidequests || sidequests.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No sidequests for this step.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-1">
      {sidequests.map((sidequest) => (
        <SidequestPlaylistItemCard
          key={sidequest.id}
          sidequest={sidequest}
          onOpenSidequest={onOpenSidequest}
        />
      ))}
    </div>
  );
}; 