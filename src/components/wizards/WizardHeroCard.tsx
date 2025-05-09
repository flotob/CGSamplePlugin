'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Award, Star, PlayCircle, Wand2, ListChecks } from 'lucide-react';
import { useUserWizardPreviewImageQuery } from '@/hooks/useUserWizardPreviewImageQuery';
import { Skeleton } from "@/components/ui/skeleton";

interface WizardHeroCardProps {
  heroWizard: {
    id: string;
    name: string;
    description?: string;
    stepCount?: number; // Number of steps in the wizard
  } | null;
  communityInfo: {
    headerImageUrl?: string | null;
    largeLogoUrl?: string | null;
    title?: string;
    official?: boolean;
    premium?: string;
  };
  onLaunchWizard: (wizardId: string) => void;
}

export function WizardHeroCard({ 
  heroWizard, 
  communityInfo, 
  onLaunchWizard 
}: WizardHeroCardProps) {
  // Get the preview image for the wizard
  const { data: previewData, isLoading: isLoadingPreview } = useUserWizardPreviewImageQuery(heroWizard?.id);

  // Skip rendering if no hero wizard
  if (!heroWizard) return null;

  // Premium badge styling based on tier
  const getPremiumBadge = (status: string = 'BASIC') => {
    switch (status?.toUpperCase()) {
      case 'GOLD':
        return {
          style: "bg-amber-100 text-amber-800 border-amber-200",
          icon: <Star className="h-3 w-3 mr-1" />
        };
      case 'SILVER':
        return {
          style: "bg-slate-100 text-slate-700 border-slate-200",
          icon: <Star className="h-3 w-3 mr-1" />
        };
      default: // BASIC or anything else
        return {
          style: "bg-blue-50 text-blue-700 border-blue-100",
          icon: <Award className="h-3 w-3 mr-1" />
        };
    }
  };

  const badge = getPremiumBadge(communityInfo.premium);

  return (
    // Only show on desktop (hidden on smaller screens)
    <div className="hidden md:block max-w-3xl mx-auto mb-8 rounded-xl overflow-hidden shadow-md">
      {/* Single integrated preview area with overlays - entire area clickable */}
      <div 
        className="relative aspect-video w-full cursor-pointer group"
        onClick={() => onLaunchWizard(heroWizard.id)}
        role="button"
        tabIndex={0}
        aria-label={`Launch ${heroWizard.name} wizard`}
        onKeyDown={(e) => e.key === 'Enter' && onLaunchWizard(heroWizard.id)}
      >
        {/* Background preview image or placeholder */}
        {isLoadingPreview ? (
          <Skeleton className="w-full h-full" />
        ) : previewData?.previewImageUrl ? (
          <Image 
            src={previewData.previewImageUrl}
            alt={`${heroWizard.name} preview`}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 flex items-center justify-center">
            <div className="text-muted-foreground text-sm flex flex-col items-center">
              <Wand2 className="h-10 w-10 mb-2 opacity-50" />
              <span>Wizard preview</span>
            </div>
          </div>
        )}
        
        {/* Elegant gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
        
        {/* Top community branding overlay */}
        <div className="absolute top-4 left-4 flex items-center z-10 pointer-events-none">
          {/* Logo */}
          <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-background/80 shadow-lg bg-background/60 backdrop-blur-sm">
            {communityInfo.largeLogoUrl ? (
              <Image 
                src={communityInfo.largeLogoUrl}
                alt={`${communityInfo.title || 'Community'} logo`}
                fill
                sizes="3rem"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
                <span className="text-md font-bold text-primary">
                  {communityInfo.title?.charAt(0) || 'C'}
                </span>
              </div>
            )}
          </div>
          
          {/* Community name and badges */}
          <div className="ml-3">
            <div className="flex items-center">
              <h2 className="text-base font-medium text-white drop-shadow-md">
                {communityInfo.title || 'Community'}
              </h2>
              {communityInfo.official && (
                <CheckCircle size={14} className="text-blue-400 ml-1.5 drop-shadow-md" />
              )}
              <Badge 
                variant="outline" 
                className={`ml-2 flex items-center gap-0.5 text-xs px-1.5 py-0 h-5 backdrop-blur-sm ${badge.style}`}
              >
                {badge.icon}
                <span className="text-xs">{communityInfo.premium}</span>
              </Badge>
            </div>
            <div className="text-xs text-white/90 drop-shadow-md">
              Featured Wizard
            </div>
          </div>
        </div>
        
        {/* Step Count Indicator in top right */}
        <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-white/10 shadow-md">
            <ListChecks size={14} className="text-white/90" />
            <span className="text-sm font-medium text-white">
              {heroWizard.stepCount || '?'} Steps
            </span>
          </div>
        </div>
        
        {/* Wizard info in bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/80 to-transparent z-10 pointer-events-none">
          <div className="flex items-center">
            <div className="p-1.5 bg-primary/20 rounded-full backdrop-blur-sm">
              <Wand2 className="h-4 w-4 text-primary/90" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-white drop-shadow-md">{heroWizard.name}</h3>
              {heroWizard.description && (
                <p className="text-sm text-white/80 line-clamp-1 drop-shadow-md">{heroWizard.description}</p>
              )}
            </div>
          </div>
          
          {/* Text and launch indicator */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-xs text-white/70 italic">Click anywhere to launch</p>
            <span className="text-xs text-white/90 flex items-center gap-1.5 bg-primary/80 px-3 py-1 rounded-full backdrop-blur-sm">
              <PlayCircle className="h-3.5 w-3.5" />
              <span>Launch Wizard</span>
            </span>
          </div>
        </div>
        
        {/* Central play button - now with hover animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-background/10 backdrop-blur-sm p-3 border border-white/20 shadow-2xl 
                         group-hover:bg-primary/30 group-hover:scale-110 transition-all duration-300">
            <PlayCircle className="h-12 w-12 text-white/90 group-hover:text-white" />
          </div>
        </div>
      </div>
    </div>
  );
} 