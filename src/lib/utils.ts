import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts the YouTube video ID from various URL formats.
 * @param url - The YouTube URL string.
 * @returns The video ID string or null if not found.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  let videoId: string | null = null;
  try {
    const urlObj = new URL(url);
    // Standard youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      videoId = urlObj.searchParams.get('v');
    }
    // Shortened youtu.be/VIDEO_ID
    else if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.substring(1); // Remove leading slash
    }
    // Embedded youtube.com/embed/VIDEO_ID
    else if (urlObj.hostname === 'www.youtube.com' && urlObj.pathname.startsWith('/embed/')) {
        videoId = urlObj.pathname.split('/')[2];
    }

    // Basic check for valid ID format (11 chars, alphanumeric + -_)
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
    }

  } catch (e) {
    // If URL parsing fails, try regex as fallback for simple cases
    console.warn("URL parsing failed, trying regex:", e);
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|\w*?[?&]v=)|youtu\.be\/)([\w-]{11})/;    
    const match = url.match(regex);
    if (match && match[1]) {
        return match[1];
    }
  }

  return null; // Return null if no valid ID found
}

/**
 * Performs a basic check if a string looks like a valid YouTube URL 
 * from which an ID can likely be extracted.
 * @param url - The URL string.
 * @returns True if it seems like a valid YouTube URL, false otherwise.
 */
export function isValidYouTubeUrl(url: string): boolean {
    if (!url) return false;
    // Simple check for common YouTube hostnames
    return url.includes('youtube.com/') || url.includes('youtu.be/');
} 