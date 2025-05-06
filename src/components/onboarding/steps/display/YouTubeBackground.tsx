'use client';

import React, { useEffect, useState } from 'react';
import { extractYouTubeVideoId } from '@/lib/utils';

interface YouTubeBackgroundProps {
  videoUrl: string;
}

export const YouTubeBackground: React.FC<YouTubeBackgroundProps> = ({ videoUrl }) => {
  const [isMounted, setIsMounted] = useState(false);
  
  // Extract the video ID from the URL
  const videoId = extractYouTubeVideoId(videoUrl);
  
  // Handle SSR compatibility
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!videoId || !isMounted) {
    return null;
  }

  // Build the YouTube embed URL with appropriate parameters
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${videoId}&mute=1&playsinline=1&modestbranding=1&iv_load_policy=3&disablekb=1&vq=hd1080`;

  return (
    <div className="wizard-background" style={{ backgroundColor: '#000' }}>
      <div className="w-full h-full absolute inset-0">
        {/* 
          The key to making this work is using a very large iframe (300% width/height)
          and positioning it in the center with transform.
          This ensures it covers the entire container regardless of aspect ratio.
        */}
        <iframe
          src={embedUrl}
          title="Background video"
          allowFullScreen
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '300%',  // Much wider than container
            height: '300%', // Much taller than container
            transform: 'translate(-50%, -50%)', // Center it
            border: 'none',
            pointerEvents: 'none', // Prevent interaction with the video
          }}
        />
      </div>
    </div>
  );
}; 