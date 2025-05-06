'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, CheckCircle, Loader2, AlertCircle, CircleCheck, Ticket, ExternalLink, ShieldCheck, ImageOff } from 'lucide-react';
import { useUserWizardsQuery } from '@/hooks/useUserWizardsQuery';
import { useWizardSlideshow } from '@/context/WizardSlideshowContext';

// --- Added hooks for earnable roles calculation ---
import { useCgLib } from '@/context/CgLibContext';
import { useCgQuery } from '@/hooks/useCgQuery';
import { useActiveWizardsQuery } from '@/hooks/useActiveWizardsQuery';
import { useRelevantStepsQuery } from '@/hooks/useRelevantStepsQuery';
import { useUserWizardCompletionsQuery } from '@/hooks/useUserWizardCompletionsQuery';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib'; // Added CG Lib Types
// --- End Added hooks ---

import { useUserWizardPreviewImageQuery } from '@/hooks/useUserWizardPreviewImageQuery';
import { Skeleton } from "@/components/ui/skeleton";
import Image from 'next/image';

// Define Role type alias using the imported payload
type Role = NonNullable<CommunityInfoResponsePayload['roles']>[number];

// Define props - currently none needed, but keep interface for consistency
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WizardViewProps {}

// --- Helper component for Wizard Preview Image --- 
const WizardPreviewImage: React.FC<{ wizardId: string, wizardName: string }> = ({ wizardId, wizardName }) => {
  const { 
    data: previewData, 
    isLoading: isLoadingPreview, 
    isError: isPreviewError 
  } = useUserWizardPreviewImageQuery(wizardId);

  if (isLoadingPreview) {
    return <Skeleton className="h-16 w-24 rounded-sm flex-shrink-0" />;
  }
  if (isPreviewError || !previewData?.previewImageUrl) {
    return (
      <div className="h-16 w-24 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
        <ImageOff className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="h-16 w-24 rounded-sm overflow-hidden border relative flex-shrink-0">
      <Image 
        src={previewData.previewImageUrl}
        alt={`${wizardName} preview`}
        fill
        sizes="6rem"
        className="object-cover"
        unoptimized
      />
    </div>
  );
};
// --------------------------------------------

export const WizardView: React.FC<WizardViewProps> = () => {
  const { data: userWizardsData, isLoading: isLoadingUserWizards, error: userWizardsError } = useUserWizardsQuery();
  const { setActiveSlideshowWizardId } = useWizardSlideshow();

  // --- Added data fetching for earnable roles --- 
  const { isInitializing, iframeUid } = useCgLib(); 
  const { data: userInfo, isLoading: isLoadingUserInfo, error: userInfoError } = useCgQuery<
    UserInfoResponsePayload,
    Error
  >(
    ['userInfo', iframeUid],
    async (instance) => (await instance.getUserInfo()).data,
    { enabled: !!iframeUid }
  );
  const { data: communityInfo, isLoading: isLoadingCommunityInfo, error: communityInfoError } = useCgQuery<
    CommunityInfoResponsePayload,
    Error
  >(
    ['communityInfo', iframeUid],
    async (instance) => (await instance.getCommunityInfo()).data,
    { enabled: !!iframeUid }
  );
  const { data: activeWizardsData, isLoading: isLoadingActiveWizards } = useActiveWizardsQuery();
  const { data: relevantStepsData, isLoading: isLoadingRelevantSteps } = useRelevantStepsQuery();
  const { data: completionsData, isLoading: isLoadingCompletions } = useUserWizardCompletionsQuery();
  // --- End added data fetching ---

  // Memoize filtered lists
  const availableWizards = React.useMemo(() => {
    return userWizardsData?.wizards.filter(w => w.progressStatus === 'not-started' || w.progressStatus === 'in-progress') ?? [];
  }, [userWizardsData]);

  const completedWizards = React.useMemo(() => {
    return userWizardsData?.wizards.filter(w => w.progressStatus === 'completed') ?? [];
  }, [userWizardsData]);

  // --- Added earnableRoles calculation --- 
  const userRoleIds = useMemo(() => userInfo?.roles || [], [userInfo?.roles]);
  const allCommunityRoles = useMemo(() => communityInfo?.roles || [], [communityInfo?.roles]);
  const earnableRoles = useMemo(() => {
    if (!userInfo || !communityInfo || !activeWizardsData || !relevantStepsData || !completionsData || !allCommunityRoles) {
      return []; 
    }

    const unearnedRoles = allCommunityRoles.filter((role: Role) => !userRoleIds.includes(role.id));
    if (unearnedRoles.length === 0) return [];

    const activeWizardsMap = new Map(activeWizardsData.wizards.map(w => [w.id, w]));
    const completedWizardIds = new Set(completionsData.completed_wizard_ids);
    
    const rolesToWizardsMap = new Map<string, { roleInfo: Role, grantingWizards: { wizard_id: string, wizard_name: string }[] }>();

    for (const step of relevantStepsData.steps) {
      const wizardInfo = activeWizardsMap.get(step.wizard_id);
      if (!wizardInfo || completedWizardIds.has(step.wizard_id)) {
        continue;
      }
      
      const targetRole = unearnedRoles.find(r => r.id === step.target_role_id);
      if (!targetRole) {
        continue;
      }

      if (!rolesToWizardsMap.has(targetRole.id)) {
        rolesToWizardsMap.set(targetRole.id, { roleInfo: targetRole, grantingWizards: [] });
      }

      const entry = rolesToWizardsMap.get(targetRole.id)!;
      if (!entry.grantingWizards.some(w => w.wizard_id === wizardInfo.id)) {
        entry.grantingWizards.push({ wizard_id: wizardInfo.id, wizard_name: wizardInfo.name });
      }
    }

    return Array.from(rolesToWizardsMap.values()).sort((a, b) => a.roleInfo.title.localeCompare(b.roleInfo.title));

  }, [userInfo, communityInfo, activeWizardsData, relevantStepsData, completionsData, allCommunityRoles, userRoleIds]);
  // --- End earnableRoles calculation ---

  // Combine loading states
  const isLoading = isInitializing || isLoadingUserWizards || isLoadingUserInfo || isLoadingCommunityInfo || isLoadingActiveWizards || isLoadingRelevantSteps || isLoadingCompletions;
  const error = userWizardsError || userInfoError || communityInfoError;

  // Helper function to get role name from ID
  const getRoleName = (roleId: string | null | undefined): string => {
      if (!roleId) return "None";
      return communityInfo?.roles?.find(r => r.id === roleId)?.title ?? "Unknown Role";
  };

  // Handle Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center pt-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading wizards...</p>
      </div>
    );
  }

  // Handle Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center pt-12 text-destructive">
        <AlertCircle className="h-8 w-8 mb-4" />
        <p className="font-medium">Error loading wizards</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <>
      {/* Section title - Updated with padding and better text wrapping */}
      <div className="mb-6 px-1 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Onboarding Wizards</h1>
        </div>
        <p className="text-muted-foreground mt-2 text-balance max-w-full">
          Complete wizards to gain roles and access within the community.
        </p>
      </div>

      {/* Main content grid - Updated with responsive padding */}
      <div className="w-full max-w-4xl mx-auto px-1 sm:px-2 space-y-8">
        {/* Available Wizards Card (Includes Not Started and Started) */}
        <div className="sm:rounded-xl sm:border sm:bg-card sm:shadow-sm sm:p-6 sm:transition-all animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150">
          <div className="px-1 sm:px-0 pb-2 sm:pb-6">
            <h2 className="text-xl font-semibold leading-none tracking-tight">Available Wizards</h2>
            <p className="text-sm text-muted-foreground mt-2">Start or continue these wizards to progress.</p>
          </div>
          <div className="space-y-3 px-1 sm:px-0 pt-2 sm:pt-0">
            {availableWizards.length > 0 ? (
              availableWizards.map((wizard, index) => (
                <div 
                  key={wizard.id} 
                  className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-md border border-border bg-card transition-all hover:bg-secondary/20 cursor-pointer'
                  style={{ animationDelay: `${150 + (index * 50)}ms` }}
                  onClick={() => setActiveSlideshowWizardId(wizard.id)}
                >
                  <div className="flex items-center gap-4 flex-grow w-full">
                    <WizardPreviewImage wizardId={wizard.id} wizardName={wizard.name} />
                    <div className="ml-1 w-full">
                      <p className="font-medium">
                        {wizard.name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 pr-2">
                        {wizard.description || 'No description available.'}
                      </p>
                      {/* Add Required Role display */} 
                      {wizard.required_role_id && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                             <ShieldCheck className="h-3 w-3 flex-shrink-0" />
                             <span>Requires: {getRoleName(wizard.required_role_id)}</span>
                          </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center mt-2 sm:mt-0"> 
                    {wizard.progressStatus === 'in-progress' ? (
                       <span className="text-xs font-medium text-blue-600">Continue</span>
                    ) : (
                       <span className="text-xs font-medium text-primary">Start</span>
                    )}
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div> 
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center">No available wizards at this time.</p>
            )}
          </div>
        </div>

        {/* --- Added Roles to Earn Card --- */}
        <div className="sm:rounded-xl sm:border sm:bg-card sm:shadow-sm sm:p-6 sm:transition-all animate-in fade-in slide-in-from-bottom-5 duration-500 delay-225">
           <div className="pb-3 px-1 sm:px-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Ticket className="h-4 w-4 text-primary" /> 
              </div>
              <h2 className="text-xl font-semibold leading-none tracking-tight">Roles to Earn</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2 pt-1 pl-10 text-balance">Complete available wizards to earn these roles.</p>
           </div>
           <div className='flex flex-col gap-4 px-1 sm:px-0'>
            {isLoading ? (
               <div className="flex items-center justify-center p-8">
                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
               </div>
            ) : earnableRoles && earnableRoles.length > 0 ? (
                earnableRoles.map(({ roleInfo, grantingWizards }) => (
                  <div key={roleInfo.id} className="p-3 border rounded-md bg-card/50">
                    <p className="font-medium mb-1">{roleInfo.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs text-muted-foreground mr-1">Earn via:</span>
                      {grantingWizards.length > 0 ? (
                         grantingWizards.map(wizard => (
                           <Button 
                             key={wizard.wizard_id} 
                             variant="link"
                             size="sm"
                             className="h-auto p-0 text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                             onClick={() => setActiveSlideshowWizardId(wizard.wizard_id)}
                           >
                             <span>{wizard.wizard_name}</span>
                             <ExternalLink className="h-3 w-3"/>
                           </Button>
                         ))
                      ) : (
                         <span className="text-xs italic text-muted-foreground">Error: No wizards found for this role.</span>
                      )}
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-foreground italic p-4 text-center">No further roles currently earnable via wizards.</p>
            )}
            {/* Display general error for hooks if needed */}
            {error && !isLoading && !(earnableRoles && earnableRoles.length > 0) && (
                 <div className="text-destructive flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
                 <AlertCircle className="h-4 w-4" />
                 <p>Error loading roles information: {(error as Error)?.message || 'An unknown error occurred'}</p>
              </div>
            )}
           </div>
        </div>
        {/* --- End Roles to Earn Card --- */}

        {/* Completed Wizards Card */}
        <div className="sm:rounded-xl sm:border sm:bg-card sm:shadow-sm sm:p-6 sm:transition-all animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300">
          <div className="px-1 sm:px-0 pb-2 sm:pb-6">
            <h2 className="text-xl font-semibold leading-none tracking-tight">Completed Wizards</h2>
            <p className="text-sm text-muted-foreground mt-2 text-balance">You have successfully completed these wizards.</p>
          </div>
          <div className="space-y-3 px-1 sm:px-0 pt-2 sm:pt-0">
            {completedWizards.length > 0 ? (
              completedWizards.map((wizard, index) => (
                <div 
                  key={wizard.id} 
                  className='flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border border-border bg-card/50 opacity-70 cursor-default'
                  style={{ animationDelay: `${300 + (index * 50)}ms` }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 flex-shrink-0">
                      <CircleCheck className="h-4 w-4" />
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium">{wizard.name}</p>
                      <p className="text-xs text-muted-foreground pr-2">{wizard.description || 'No description available.'}</p>
                    </div>
                  </div>
                  {/* Indicator for completion */}
                  <CheckCircle className="h-5 w-5 text-green-500 self-end sm:self-center mt-2 sm:mt-0" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center">You haven&apos;t completed any wizards yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}; 