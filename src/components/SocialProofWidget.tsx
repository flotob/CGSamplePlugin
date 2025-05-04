'use client';

import React from 'react';
import { SocialProofUser, SocialProofResponse } from '@/hooks/useSocialProofQuery'; // Import the user type and response type
import { UserAvatar } from './UserAvatar'; // Import your existing Avatar component
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Import cn for conditional classes

interface SocialProofWidgetProps {
  // Expect the full response object or undefined
  data?: SocialProofResponse;
  isLoading: boolean;
  className?: string; // Allow passing additional classes
}

// Number formatting utility function
function formatNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }
  if (num < 1000000) {
    // Format as 1.2k, 10k, 100k
    return (num / 1000).toFixed(num < 10000 ? 1 : 0).replace('.0', '') + 'k';
  }
  // Format as 1.2M, 10M, 100M
  return (num / 1000000).toFixed(num < 10000000 ? 1 : 0).replace('.0', '') + 'M';
  // Add billions (B) if needed
}

const MAX_AVATARS_SHOWN = 10;

export const SocialProofWidget: React.FC<SocialProofWidgetProps> = ({
  data,
  isLoading,
  className = '',
}) => {

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading progress...</span>
      </div>
    );
  }

  // Get users and total count from data
  const users = data?.users;
  const totalRelevantUsers = data?.totalRelevantUsers ?? 0;

  // If not loading and total count is 0, show the specific message
  if (!isLoading && totalRelevantUsers === 0) {
    return (
      <div className={`flex items-center ${className}`}>
         <span className="text-xs text-muted-foreground hidden sm:inline-block">
           You are the first person to attempt this step of the wizard!
         </span>
      </div>
    );
  }

  const displayedUsers = users?.slice(0, MAX_AVATARS_SHOWN) ?? [];
  const remainder = totalRelevantUsers - displayedUsers.length;

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-xs text-muted-foreground mr-1 hidden sm:inline-block">People who also did this step:</span>
        <div className="flex -space-x-3 overflow-hidden pr-1">
          {displayedUsers.map((user: SocialProofUser, index: number) => (
            <Tooltip key={user.user_id}>
              <TooltipTrigger asChild>
                <div className={cn(
                  "ring-2 ring-background rounded-full hover:z-10 transition-transform hover:scale-110",
                  index >= 3 ? "hidden sm:block" : "block"
                )}>
                  <UserAvatar 
                    userId={user.user_id}
                    name={user.username}
                    imageUrl={user.profile_picture_url}
                    size={24}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.username || `User ${user.user_id.substring(0, 6)}`}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {remainder > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="hidden sm:flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-gradient-to-br from-primary/70 to-primary/40 text-[10px] font-medium text-primary-foreground ring-2 ring-background shadow-sm cursor-default"
              >
                +{formatNumber(remainder)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>+{remainder.toLocaleString()} more</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}; 