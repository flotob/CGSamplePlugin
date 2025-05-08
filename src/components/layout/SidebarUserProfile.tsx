'use client';

import React from 'react';
import { UserAvatar } from "@/components/UserAvatar";
import { BadgeCheck, ChevronRight } from 'lucide-react';
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
 * Displays user avatar, name, and admin status.
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
        <button 
            onClick={onClick}
            className={cn(
                "w-full text-left py-3.5 px-3 flex items-center gap-3",
                "bg-transparent hover:bg-accent/50",
                "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                "dark:hover:bg-muted"
            )}
        >
            <UserAvatar 
                imageUrl={imageUrl} 
                name={name} 
                userId={userId} 
                size={36}
                noRing={true}
                className={cn(
                    "transition-all duration-300", 
                    showAdminBadge 
                        ? "shadow-[0_0_14px_rgba(124,58,237,0.6)] hover:shadow-[0_0_16px_rgba(124,58,237,0.7)] hover:scale-105" // Enhanced purple glow for admin
                        : "shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_12px_rgba(255,255,255,0.3)] hover:scale-105" // Enhanced white glow for users
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
    );
}; 