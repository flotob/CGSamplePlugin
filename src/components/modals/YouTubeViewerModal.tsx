'use client';

import React from 'react';
import YouTube from 'react-youtube';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface YouTubeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

// Utility function to extract YouTube Video ID from various URL formats
const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  let videoId = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v');
    }
    // Add more sophisticated regex if needed for other URL variants
    // Basic regex fallback for some common patterns
    if (!videoId) {
        const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        if (match && match[1]) {
            videoId = match[1];
        }
    }
  } catch (error) {
    console.error('Error parsing YouTube URL:', error);
    // Fallback for non-URL strings that might just be an ID
    if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
        videoId = url;
    }
  }
  return videoId;
};

export const YouTubeViewerModal: React.FC<YouTubeViewerModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  title,
}) => {
  const videoId = extractYouTubeVideoId(videoUrl);

  const opts = {
    // height: '390', // Can be responsive via wrapper aspect ratio
    // width: '640',  // Can be responsive via wrapper aspect ratio
    playerVars: {
      autoplay: 1,
      modestbranding: 1, // Hide YouTube logo as much as possible
      rel: 0, // Do not show related videos at the end
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0">
        {title && (
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="truncate">{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="aspect-video bg-black">
          {videoId ? (
            <YouTube
              videoId={videoId}
              opts={opts}
              className="w-full h-full"
              iframeClassName="w-full h-full"
              onReady={(event) => event.target.playVideo()} 
              // onError can be handled here
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <p className="text-destructive-foreground">
                Invalid YouTube URL or Video ID.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="p-6 pt-2 sm:justify-start border-t">
            <Button type="button" variant="outline" onClick={onClose}>
                Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 