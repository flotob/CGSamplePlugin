'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Eye, Undo } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from "@/lib/utils";
import { LucideProps } from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes, SVGProps, Dispatch, SetStateAction } from 'react';

// Define expected link structure
interface SidebarLink {
  id: string;
  label: string;
  icon?: React.ElementType; // Optional icon component
}

// Define expected API response structure for logo
interface CommunityLogoResponse {
  logo_url: string | null;
}

// Define props for the Sidebar component
interface SidebarProps {
  links: SidebarLink[];
  activeSection: string;
  setActiveSection: (section: string) => void;
  communityId?: string;
  isAdmin: boolean;
  isPreviewingAsUser: boolean;
  setIsPreviewingAsUser: Dispatch<SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  links,
  activeSection,
  setActiveSection,
  communityId,
  isAdmin,
  isPreviewingAsUser,
  setIsPreviewingAsUser,
}) => {

  // --- Fetch Community Logo from Cache --- 
  const { data: logoData, isLoading: isLoadingLogo } = useQuery<CommunityLogoResponse, Error>({
    queryKey: ['communityLogo', communityId],
    queryFn: async () => {
      if (!communityId) return { logo_url: null };
      const res = await fetch(`/api/community/settings?communityId=${communityId}`);
      if (!res.ok) {
        if (res.status === 404) return { logo_url: null };
        console.error('Sidebar: Failed to fetch community logo');
        return { logo_url: null }; 
      }
      return res.json();
    },
    enabled: !!communityId,
    staleTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  return (
    <div className="flex h-full max-h-screen flex-col">
      {/* Header with enhanced styling */}
      <div className="flex h-14 items-center border-b border-border px-4 lg:h-[60px] lg:px-6">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <div 
             className="relative flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold shadow-sm transition-all duration-200 overflow-hidden" 
             style={{ backgroundColor: logoData?.logo_url ? 'transparent' : undefined }}
           >
            {isLoadingLogo ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : logoData?.logo_url ? (
              <Image 
                src={logoData.logo_url} 
                alt="Logo" 
                fill={true}
                className="object-cover"
              />
            ) : (
              'OW'
            )}
          </div>
          <span className="transition-colors duration-200">Onboarding Wizard</span>
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
          </nav>
        </div>
        
        {/* Footer section with help and version */}
        <div className="mt-auto pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground px-4 pb-2">v1.0.0</p>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-secondary/40"
            onClick={() => setActiveSection('help')}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Help & Documentation
          </Button>
        </div>
      </div>
    </div>
  );
}; 