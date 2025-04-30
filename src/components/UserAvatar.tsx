'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  userId?: string | null; // Seed for the gradient
  size?: number; // Size in pixels
  className?: string; // Additional classes
}

// Simple hash function to get a number from a string
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Generate HSL colors based on a seed
const generateGradientColors = (seed: string): [string, string, string] => {
  const hash = simpleHash(seed);
  const h1 = hash % 360;
  const h2 = (hash * 7) % 360;
  const h3 = (hash * 13) % 360;
  
  // Neon-like colors: High saturation, high lightness
  const s = 80 + (hash % 21); // Saturation 80-100%
  const l = 60 + (hash % 11); // Lightness 60-70%
  
  return [
    `hsl(${h1}, ${s}%, ${l}%)`,
    `hsl(${h2}, ${s}%, ${l}%)`,
    `hsl(${h3}, ${s}%, ${l}%)`,
  ];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  imageUrl,
  name = 'User',
  userId = 'defaultSeed',
  size = 36,
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  const showFallback = !imageUrl || imageError;

  const gradientColors = useMemo(() => 
    generateGradientColors(userId || name || 'fallback'), 
    [userId, name]
  );

  const gradientStyle = {
    backgroundImage: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]}, ${gradientColors[2]})`,
  };

  const initials = useMemo(() => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (name.length > 1) {
      return name.substring(0, 2).toUpperCase();
    } else {
      return name.toUpperCase();
    }
  }, [name]);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center",
        "ring-1 ring-border ring-offset-1 ring-offset-background", // Subtle ring
        className
      )}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        <div 
          className="w-full h-full flex items-center justify-center text-white font-medium text-xs select-none"
          style={{ ...gradientStyle, fontSize: `${Math.max(10, size / 3)}px` }}
          aria-label={`Placeholder avatar for ${name}`}
          title={name || 'User Avatar'}
        >
          {initials}
        </div>
      ) : (
        <Image
          src={imageUrl!}
          alt={name || 'User Avatar'}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          onError={() => setImageError(true)}
          unoptimized // If images are external and not optimized by Next.js
        />
      )}
    </div>
  );
}; 