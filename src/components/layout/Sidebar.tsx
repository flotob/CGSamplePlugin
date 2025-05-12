'use client';

import React from 'react';
import Image from 'next/image'; // Re-add Image import
import { Button } from "@/components/ui/button";
import { BookOpen, Eye, Undo, Mail, SparklesIcon } from 'lucide-react'; // Removed Loader2 import
// import { useQuery } from '@tanstack/react-query'; // Removed
import { SidebarUserProfile } from './SidebarUserProfile';
import { useAdminAIChatModalStore } from '@/stores/useAdminAIChatModalStore'; // Added store import

// Define expected link structure
interface SidebarLink {
  id: string;
  label: string;
  icon?: React.ElementType; // Optional icon component
}

// REMOVE CommunityLogoResponse interface
// interface CommunityLogoResponse {
//   logo_url: string | null;
// }

// Define props for the Sidebar component
interface SidebarProps {
  links: SidebarLink[];
  activeSection: string;
  setActiveSection: (section: string) => void;
  // communityId?: string; // Removed communityId prop
  isAdmin: boolean;
  isPreviewingAsUser: boolean;
  setIsPreviewingAsUser: (isPreviewing: boolean) => void;
  // Add user profile data
  userName?: string | null;
  userImageUrl?: string | null;
  userId?: string | null;
  onProfileClick?: () => void;
  logoUrl?: string | null; // Added logoUrl prop
  debugLink?: SidebarLink; // Added debugLink prop
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  links,
  activeSection,
  setActiveSection,
  // communityId, // Removed from destructuring
  isAdmin,
  isPreviewingAsUser,
  setIsPreviewingAsUser,
  // User profile props
  userName,
  userImageUrl,
  userId,
  onProfileClick,
  logoUrl, // Destructure new prop
  debugLink, // Destructure debugLink
}) => {
  const { openAdminAIChatModal } = useAdminAIChatModalStore(); // Get modal opener

  // --- REMOVE Logo Fetching Logic ---
  // const { data: logoData, isLoading: isLoadingLogo } = useQuery<CommunityLogoResponse, Error>({
  //   queryKey: ['communityLogo', communityId], // communityId was also removed from props as it's not used here anymore
  //   queryFn: async () => {
  //     if (!communityId) return { logo_url: null }; 
  //     const res = await fetch(`/api/community/settings?communityId=${communityId}`);
  //     if (!res.ok) {
  //       if (res.status === 404) return { logo_url: null }; 
  //       console.error('Sidebar: Failed to fetch community logo');
  //       return { logo_url: null }; 
  //     }
  //     return res.json();
  //   },
  //   enabled: !!communityId, 
  //   staleTime: 15 * 60 * 1000, 
  //   retry: 1,
  //   refetchOnWindowFocus: false,
  // });

  return (
    <div className="flex h-full max-h-screen flex-col">
      {/* Header with enhanced styling */}
      <div className="flex h-14 items-center border-b border-border px-4 lg:h-[60px] lg:px-6">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <div 
             className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-background to-background/80 shadow-md overflow-hidden"
           >
            {/* Use logoUrl prop directly. Show loading state if logoUrl is undefined (still loading from parent) or explicitly handle. 
                For now, if logoUrl is null/undefined, it will fall back to icon.webp */}
            <Image 
                src={logoUrl || '/icon.webp'} 
                alt={logoUrl ? "Community Logo" : "App Logo"}
                fill={true}
                className="object-cover hover:scale-110 transition-transform duration-300"
                unoptimized
            />
          </div>
          <span className="transition-colors duration-200">Welcome OnBoard</span>
        </div>
      </div>

      {/* Preview Mode Button Section (Moved Up) */}
      {isAdmin && (
        <div className="px-3 py-4"> {/* Add padding for spacing */}
           {!isPreviewingAsUser ? (
              <Button 
                 className="w-full justify-center text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 transition-opacity shadow-md" 
                 onClick={() => setIsPreviewingAsUser(true)}
               >
                 <Eye className="mr-2 h-4 w-4" />
                 Preview as User
              </Button>
           ) : (
              <Button 
                 className="w-full justify-center text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 transition-opacity shadow-md" 
                 onClick={() => setIsPreviewingAsUser(false)}
               >
                 <Undo className="mr-2 h-4 w-4" />
                 Exit User Preview
              </Button>
           )}
        </div>
      )}

      {/* Navigation with improved spacing and styling */}
      <div className="flex-1 overflow-auto py-2 px-3"> {/* Adjusted padding */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-2">NAVIGATION</p>
          <nav className="space-y-1.5">
            {links.map((link) => (
              <Button
                key={link.id}
                variant={activeSection === link.id ? "secondary" : "ghost"}
                className={`justify-start w-full transition-all duration-200 ${
                  activeSection === link.id 
                    ? "bg-secondary text-secondary-foreground font-medium shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
                onClick={() => setActiveSection(link.id)}
              >
                {link.icon && <link.icon className={`h-4 w-4 mr-2 transition-transform duration-200 ${activeSection === link.id ? 'text-primary' : ''}`} />}
                {link.label}
              </Button>
            ))}
            
            {/* AI Assistant Link for Admins */}
            {isAdmin && !isPreviewingAsUser && (
              <Button
                variant={activeSection === 'admin_ai_assistant' ? "secondary" : "ghost"} // Use a unique ID for active state if needed
                className={`justify-start w-full transition-all duration-200 ${
                  activeSection === 'admin_ai_assistant' 
                    ? "bg-secondary text-secondary-foreground font-medium shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
                onClick={() => {
                  // setActiveSection('admin_ai_assistant'); // Optional: if it should also be an "active section"
                  openAdminAIChatModal();
                }}
              >
                <SparklesIcon className={`h-4 w-4 mr-2 transition-transform duration-200 ${activeSection === 'admin_ai_assistant' ? 'text-primary' : ''}`} />
                AI Assistant
              </Button>
            )}
          </nav>
        </div>
      </div>
      
      {/* Help & Documentation Section */}
      <div className="py-2 px-3 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground px-2 mb-2">SUPPORT</p>
        <div className="space-y-1.5">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-secondary/40"
            onClick={() => setActiveSection('help')}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Help & Documentation
          </Button>
          {/* Render Debug Settings Link if provided - MOVED HERE */}
          {debugLink && (
            <Button
              variant={activeSection === debugLink.id ? "secondary" : "ghost"}
              className={`justify-start w-full transition-all duration-200 ${
                activeSection === debugLink.id
                  ? "bg-secondary text-secondary-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
              onClick={() => setActiveSection(debugLink.id)}
            >
              {debugLink.icon && <debugLink.icon className={`h-4 w-4 mr-2 transition-transform duration-200 ${activeSection === debugLink.id ? 'text-primary' : ''}`} />}
              {debugLink.label}
            </Button>
          )}
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-secondary/40"
            onClick={() => setActiveSection('contact')}
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </div>
      </div>

      {/* User Profile Section at the bottom */}
      <div className="border-t border-border mt-auto">
        <SidebarUserProfile
          name={userName}
          imageUrl={userImageUrl}
          userId={userId}
          isAdmin={isAdmin}
          isPreviewingAsUser={isPreviewingAsUser}
          onClick={onProfileClick}
        />
      </div>
    </div>
  );
}; 