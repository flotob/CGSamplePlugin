'use client';

import React from 'react';
import { UserAvatar } from "@/components/UserAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BadgeCheck, ChevronRight, LogOut } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SidebarUserProfileProps {
    name?: string | null;
    imageUrl?: string | null;
    userId?: string | null;
    isAdmin: boolean;
    isPreviewingAsUser?: boolean;
    onClick?: () => void;
}

/**
 * A modern user profile component for the sidebar, inspired by top platforms.
 * Displays user avatar, name, and admin status with tooltips.
 */
export const SidebarUserProfile: React.FC<SidebarUserProfileProps> = ({ 
    name,
    imageUrl,
    userId,
    isAdmin,
    isPreviewingAsUser = false,
    onClick
}) => {
    // Display first name or username portion for compact display
    const displayName = name ? (name.split(' ')[0] || name) : 'User';
    
    // Determine if we're showing in admin mode (admin not previewing)
    const showAdminBadge = isAdmin && !isPreviewingAsUser;
    
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button 
                        onClick={onClick}
                        className={cn(
                            "w-full text-left mt-auto py-2.5 px-3 flex items-center gap-3",
                            "border-t border-border bg-background/60 backdrop-blur-sm",
                            "transition-all duration-200 hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                            "dark:hover:bg-muted"
                        )}
                    >
                        <UserAvatar 
                            imageUrl={imageUrl} 
                            name={name} 
                            userId={userId} 
                            size={32}
                            className={cn(
                                "transition-all", 
                                showAdminBadge ? "ring-primary/70" : "ring-border/70"
                            )}
                        />
                        
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium truncate">
                                    {displayName}
                                </span>
                                {showAdminBadge && (
                                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground truncate">
                                {isPreviewingAsUser 
                                    ? "Previewing as user" 
                                    : (isAdmin ? "Administrator" : "Member")}
                            </span>
                        </div>
                        
                        <ChevronRight className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="p-3 max-w-[200px]">
                    <div className="flex flex-col gap-1.5">
                        <div className="font-medium">{name || 'User'}</div>
                        {userId && (
                            <div className="text-xs text-muted-foreground overflow-hidden text-ellipsis">
                                ID: {userId.substring(0, 10)}...
                            </div>
                        )}
                        <div className="text-xs mt-1">
                            {isPreviewingAsUser 
                                ? "Currently previewing as a regular user" 
                                : (isAdmin 
                                    ? "You have administrator privileges" 
                                    : "Regular member account")}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}; 