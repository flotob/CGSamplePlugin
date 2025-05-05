'use client';

import React, { useEffect, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { extractYouTubeVideoId } from '@/lib/utils';

interface YouTubeBackgroundProps {
  videoUrl: string;
}

export const YouTubeBackground: React.FC<YouTubeBackgroundProps> = ({ videoUrl }) => {
  const [isMounted, setIsMounted] = useState(false);
  
  // Extract the video ID from the URL
  const videoId = extractYouTubeVideoId(videoUrl);
  
  // Set up the player options for a background video
  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      // Autoplay the video silently in the background
      autoplay: 1,
      mute: 1,
      // Hide controls and related videos
      controls: 0,
      disablekb: 1,
      rel: 0,
      // Enable looping
      loop: 1,
      // If videoId is a single video, we need to specify a playlist to loop
      // Setting it to the same videoId creates a single-video loop
      playlist: videoId,
      // UI customization
      modestbranding: 1,
      showinfo: 0,
      // Mobile optimization
      playsinline: 1,
    },
  };

  // Handle SSR compatibility
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!videoId || !isMounted) {
    return null;
  }

  // Add event handlers for player errors
  const onError: YouTubeProps['onError'] = (event) => {
    console.error('YouTube player error:', event.data);
  };

  // Configure player once it's ready
  const onReady: YouTubeProps['onReady'] = (event) => {
    // Make sure video is muted (sometimes the mute playerVar doesn't work reliably)
    event.target.mute();
    
    // Calculate the ideal scaling to fill the container while preserving aspect ratio
    try {
      const playerElement = event.target.getIframe();
      if (playerElement) {
        const containerWidth = playerElement.parentElement?.clientWidth || window.innerWidth;
        const containerHeight = playerElement.parentElement?.clientHeight || window.innerHeight;
        const videoRatio = 16/9; // Standard YouTube aspect ratio
        
        // Scale the video to cover the container
        const scale = Math.max(
          containerWidth / (containerHeight * videoRatio),
          containerHeight / (containerWidth / videoRatio)
        ) * 1.05; // Add 5% to prevent edge gaps
        
        playerElement.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }
    } catch (error) {
      console.warn('Failed to calculate optimal video scaling:', error);
    }
  };

  // Apply styling to make the video fill the container while maintaining aspect ratio
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 w-full h-full">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onError={onError}
          className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2"
          iframeClassName="w-full h-full absolute inset-0 pointer-events-none"
        />
      </div>
    </div>
  );
}; 