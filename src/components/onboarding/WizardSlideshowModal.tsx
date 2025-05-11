'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { X, Loader2, AlertCircle, ExternalLink, PanelRightIcon, XIcon } from 'lucide-react';
import { useUserWizardStepsQuery } from '@/hooks/useUserWizardStepsQuery';
import { useStepTypesQuery } from '@/hooks/useStepTypesQuery';
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
import type { Sidequest } from '@/types/sidequests';
import { StepDisplay } from './steps/display/StepDisplay';
import { useCompleteStepMutation } from '@/hooks/useCompleteStepMutation';
import { WizardSummaryScreen } from './WizardSummaryScreen';
import { useUserCredentialsQuery } from '@/hooks/useUserCredentialsQuery';
import { useMarkWizardCompleted } from '@/hooks/useMarkWizardCompleted';
import { useCommunityInfoQuery } from '@/hooks/useCommunityInfoQuery';
import { useUserWizardSessionQuery, useUpdateUserWizardSessionMutation } from '@/hooks/useUserWizardStepsQuery';
import { useWizardStepSocialProofQuery } from '@/hooks/useSocialProofQuery';
import { SocialProofWidget } from '@/components/SocialProofWidget';
import { useCgQuery } from '@/hooks/useCgQuery';
import { useCgLib } from '@/context/CgLibContext';
import type { UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { useAssignRoleAndRefresh } from '@/hooks/useAssignRoleAndRefresh';
import { getStepPassStatus } from './wizardStepUtils';
import { SidequestPlaylist } from '@/components/sidequests/SidequestPlaylist';
import { YouTubeViewerModal } from '@/components/modals/YouTubeViewerModal';
import { MarkdownViewerModal } from '@/components/modals/MarkdownViewerModal';
import { StepInfoDisplay } from '@/components/onboarding/StepInfoDisplay';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Image from 'next/image';

// Define some type interfaces for better TypeScript support
interface Role {
  id: string;
  title: string;
}

interface WizardSlideshowModalProps {
  wizardId: string;
  open: boolean;
  onClose: () => void;
}

export const WizardSlideshowModal: React.FC<WizardSlideshowModalProps> = ({
  wizardId,
  open,
  onClose,
}) => {
  // Add state for sidebar visibility on mobile
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  
  // Function to toggle sidebar visibility
  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible(prev => !prev);
  }, []);
  
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [hasTriedCompletion, setHasTriedCompletion] = useState<boolean>(false);
  const [isInitialIndexSet, setIsInitialIndexSet] = useState<boolean>(false);
  const [activeSidequest, setActiveSidequest] = useState<Sidequest | null>(null);
  const { 
    data: stepsData,
    isLoading: isLoadingSteps,
    error: stepsError,
  } = useUserWizardStepsQuery(wizardId);
  const { data: stepTypesData, isLoading: isLoadingTypes } = useStepTypesQuery();
  const credentialsQuery = useUserCredentialsQuery();
  const { data: credentialsData } = credentialsQuery;
  const { data: communityInfoResponse } = useCommunityInfoQuery();

  // Fetch UserInfo needed for the summary screen & role assignment
  const { iframeUid, cgInstance } = useCgLib();
  const { data: userInfo, isLoading: isLoadingUserInfo } = useCgQuery<UserInfoResponsePayload, Error>(
    ['userInfo', iframeUid],
    async (instance) => (await instance.getUserInfo()).data,
    { enabled: !!iframeUid }
  );

  const { data: sessionData, isSuccess: isSessionLoaded } = useUserWizardSessionQuery(wizardId);
  const updateSessionMutation = useUpdateUserWizardSessionMutation(wizardId);

  const steps = stepsData?.steps;
  const currentStep: UserStepProgress | undefined = steps?.[currentStepIndex];
  const totalSteps = steps?.length ?? 0;
  const allStepsCompleted = steps?.every(step => step.completed_at) || false;

  // Mutation hook for completing a step
  const completeStepMutation = useCompleteStepMutation(wizardId, currentStep?.id);

  // Add the completion mutation hook
  const markCompleted = useMarkWizardCompleted();

  // Instantiate role assignment hook here
  const assignRoleAndRefresh = useAssignRoleAndRefresh();

  // Callback to close any active sidequest view
  const handleCloseSidequestView = useCallback(() => {
    setActiveSidequest(null);
  }, []);

  // Find the StepType object for the current step
  const currentStepType = currentStep && stepTypesData
    ? stepTypesData.step_types.find(t => t.id === currentStep.step_type_id)
    : undefined;

  // --- Fetch social proof data --- 
  const {
     data: socialProofData, 
     isLoading: isLoadingSocialProof 
  } = useWizardStepSocialProofQuery(wizardId, currentStep?.id);
  // --- End fetch --- 

  // Reset sidebar visibility when modal closes
  useEffect(() => {
    if (!open) {
      setIsSidebarVisible(false);
    }
  }, [open]);

  // Effect to determine the starting step index based on session or defaults
  useEffect(() => {
    // Ensure steps are loaded, session state is fetched, and we haven't set the index yet
    if (steps && steps.length > 0 && isSessionLoaded && !isInitialIndexSet) {
      let initialIndex = 0; // Default to first step

      // Try to use session state
      if (sessionData?.last_viewed_step_id) {
        const lastViewedIndex = steps.findIndex(step => step.id === sessionData.last_viewed_step_id);
        if (lastViewedIndex !== -1) {
          initialIndex = lastViewedIndex; // Use the index from session
        } else {
          console.warn('Last viewed step ID from session not found in current steps. Defaulting to first step.');
          // Keep initialIndex = 0
        }
      } else {
        // No session state, determine starting point (e.g., first incomplete or just first)
        // For simplicity now, just default to 0 if no session. Can add first incomplete logic back if needed.
        initialIndex = 0; 
      }

      // Handle the edge case where all steps are completed - go to last step
      if (allStepsCompleted) {
         initialIndex = steps.length - 1;
         // If we want to auto-show summary when resuming on a fully completed wizard:
         // setShowSummary(true); 
      }

      setCurrentStepIndex(initialIndex);
      setIsInitialIndexSet(true); // Mark initial index as set
    }
  }, [steps, isSessionLoaded, sessionData, allStepsCompleted, isInitialIndexSet]); // Dependencies

  // Effect to mark the wizard as completed when all steps are completed
  useEffect(() => {
    if (allStepsCompleted && 
        steps && 
        steps.length > 0 && 
        !markCompleted.isPending && 
        !hasTriedCompletion &&
        stepsData?.assignRolesPerStep !== undefined) {
      
      const assignPerStep = stepsData.assignRolesPerStep; // Use definite value
      setHasTriedCompletion(true); 
      console.log('All steps completed, marking wizard as completed:', wizardId);
      
      // Call mutate with only wizardId. Handle roles in onSuccess callback below.
      markCompleted.mutate(wizardId, {
        onSuccess: (data) => { // data = { success, roles } from API
           console.log('markCompleted mutation succeeded.');
           // Now handle role assignment based on the flag
           if (!assignPerStep && data.roles && data.roles.length > 0) {
              const userId = userInfo?.id;
              if (userId) {
                 console.log(`Assigning ${data.roles.length} roles at end of wizard.`);
                 // De-duplicate roles before assigning
                 const uniqueRoles = Array.from(new Set(data.roles));
                 // Use the hook instantiated outside the effect
                 uniqueRoles.forEach(roleId => {
                    assignRoleAndRefresh.mutate({ roleId, userId });
                 });
              } else {
                 console.error('Cannot assign roles at end of wizard: User ID not found.');
                 // Consider showing a toast error here
              }
           } else if (assignPerStep) {
              console.log('Roles were assigned per step. Skipping final assignment.');
           }
        },
        onError: (error: Error) => {
          console.error('Failed to mark wizard as completed:', error);
        }
      });
    }
    // Update dependencies: Add userInfo?.id and assignRoleAndRefresh
  }, [allStepsCompleted, steps, wizardId, markCompleted, hasTriedCompletion, stepsData?.assignRolesPerStep, userInfo?.id, assignRoleAndRefresh]); 

  // --- Add Effect to handle Escape key --- 
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose(); // Call the onClose prop when Escape is pressed
      }
    };

    if (open) { // Only add listener if modal is open
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup function to remove listener when modal closes or component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]); // Dependencies: re-run if open status or onClose function changes
  // --- End Effect --- 

  const goToStep = useCallback((index: number) => {
    if (steps && index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
      
      // --- Trigger session update directly after setting index ---
      const newStepId = steps[index]?.id;
      if (newStepId && !updateSessionMutation.isPending) {
        // console.log('Updating session via goToStep:', newStepId);
        updateSessionMutation.mutate({ stepId: newStepId }, {
          onError: (error) => {
            console.error('Failed to update wizard session state (from goToStep):', error);
            // Session saving is best-effort, no UI blocking needed.
          }
        });
      }
      // --- End session update trigger ---
    }
  }, [steps, updateSessionMutation]); // Add updateSessionMutation to dependencies

  const handlePrevious = useCallback(() => {
    goToStep(currentStepIndex - 1);
  }, [currentStepIndex, goToStep]);

  const handleNext = useCallback(() => {
    // Basic next for now - completion logic will trigger advance via handleCompleteStep
    goToStep(currentStepIndex + 1);
  }, [currentStepIndex, goToStep]);

  // Callback for step components to signal completion
  const handleCompleteStep = useCallback((completionData?: Record<string, unknown>) => {
    if (!currentStep || currentStep.completed_at || completeStepMutation.isPending) return;

    console.log(`Completing step ${currentStep.id} for wizard ${wizardId}`);
    completeStepMutation.mutate(completionData ? { verified_data: completionData } : undefined, {
      onSuccess: () => {
        console.log(`Step ${currentStep.id} completed successfully.`);
        // No longer automatically advancing to next step or closing
        // Instead, we show a success state and let the user control navigation
      },
      onError: (error) => {
        console.error("Mutation error completing step:", error);
        // Error toast is handled within the hook, but could add specific UI feedback here too
      }
    });
  }, [currentStep, completeStepMutation, wizardId]);

  // New logic using the helper function
  const allStepTypes = stepTypesData?.step_types;
  const canProceed = getStepPassStatus(currentStep, allStepTypes);

  // Determine if Next button should be disabled
  const isCompleted = !!currentStep?.completed_at;
  const isPrevDisabled = currentStepIndex <= 0 || completeStepMutation.isPending;

  // Determine if we should show the summary screen
  const isLastStep = currentStepIndex === totalSteps - 1;

  // New function to handle the view summary button click
  const handleViewSummary = useCallback(() => {
    // Refetch credentials to ensure we have the latest data
    credentialsQuery.refetch();
    setShowSummary(true);
  }, [credentialsQuery]);

  // Callback to open a sidequest
  const handleOpenSidequest = useCallback((sidequest: Sidequest) => {
    setActiveSidequest(sidequest);
    // TODO: Placeholder - Log the active sidequest for now
    // console.log('Opening sidequest:', sidequest);
  }, []);

  // --- Render Logic --- 

  const renderContent = () => {
    // If we're in summary mode, show the summary screen
    if (showSummary) {
      // Prepare the data for the summary screen
      const completedSteps = steps?.filter(step => step.completed_at) || [];
      
      // Match step types to steps
      const stepsWithTypes = completedSteps.map(step => ({
        ...step,
        stepType: stepTypesData?.step_types.find(t => t.id === step.step_type_id)
      }));
      
      // Get credentials just from this wizard
      const wizardCredentials = credentialsData?.credentials
        .filter(cred => {
          // Match credentials to steps in this wizard that have verified data
          return completedSteps.some(step => {
            const verifiedData = step.verified_data;
            if (!verifiedData) return false;
            
            switch (cred.platform.toUpperCase()) {
              case 'ENS':
                return verifiedData.ensName === cred.external_id;
              case 'DISCORD':
                return verifiedData.discordId === cred.external_id;
              case 'TELEGRAM':
                return verifiedData.telegramId === cred.external_id;
              default:
                return false;
            }
          });
        }) || [];
      
      return (
        <WizardSummaryScreen
          completedSteps={stepsWithTypes}
          credentials={wizardCredentials}
          allCredentials={credentialsData?.credentials || []}
          rolesGranted={markCompleted.earnedRoles.map((roleId: string) => {
            // Try to find role details from communityInfo
            const role = communityInfoResponse?.roles?.find((r: Role) => r.id === roleId);
            return { 
              id: roleId, 
              name: role?.title || 'Community Role'
            };
          })}
          userInfo={userInfo}
          isLoadingRoles={markCompleted.isPending}
          onClose={onClose}
        />
      );
    }
    
    if (isLoadingSteps || isLoadingTypes || isLoadingUserInfo) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span>Loading Step Details...</span>
        </div>
      );
    }

    if (stepsError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="font-medium">Error loading wizard steps</p>
          <p className="text-sm">{stepsError.message}</p>
        </div>
      );
    }

    if (!steps || steps.length === 0) {
        return <div className="flex-1 p-6">No steps found for this wizard.</div>;
    }

    if (!currentStep) {
        // console.log('[WizardSlideshowModal] Render: currentStep is undefined/null'); // Keep this one as it's part of an error path
        return <div className="flex-1 p-6">Invalid step index.</div>;
    }
    // --- End of Initial Loading and Error Checks ---

    // Render StepDisplay component and SidequestPlaylist
    return (
      <div className="flex-1 flex h-full overflow-hidden relative">
        {/* StepDisplay takes up the main space */}
        <div className="flex-grow overflow-y-auto h-full">
           <StepDisplay 
              step={currentStep} 
              stepType={currentStepType} 
              onComplete={handleCompleteStep} 
           />
        </div>
        
        {/* Mobile sidebar toggle button - Only visible on small screens */}
        <Button
          onClick={toggleSidebar}
          variant="secondary"
          size="icon"
          className="md:hidden absolute bottom-4 right-4 z-50 rounded-full w-12 h-12 shadow-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <PanelRightIcon className="h-5 w-5" />
        </Button>
        
        {/* Backdrop for mobile - only visible when sidebar is open */}
        {isSidebarVisible && (
          <div 
            className="md:hidden absolute inset-0 bg-black/20 z-40 animate-in fade-in duration-200" 
            onClick={toggleSidebar}
          />
        )}
        
        {/* Right Sidebar: Always visible on large screens, toggleable on mobile */}
        <div className={cn(
          "w-64 lg:w-72 xl:w-80 flex-shrink-0 border-l border-border/30 bg-gradient-to-t from-slate-50/90 via-slate-50/50 to-slate-50/10 dark:from-slate-900/90 dark:via-slate-900/50 dark:to-slate-900/10 h-full z-[60] flex flex-col overflow-hidden",
          "md:relative", // Always relative positioning on desktop
          "md:translate-x-0 transition-transform duration-300 ease-in-out", // Smooth transition
          // Mobile styles - use absolute positioning within the content area
          "md:h-full absolute inset-y-0 right-0",
          !isSidebarVisible && "translate-x-full md:translate-x-0" // Hide off-screen when not visible on mobile only
        )}>
          {/* Mobile close button - only shown on mobile */}
          <div className="md:hidden flex justify-between items-center px-4 py-3">
            <h3 className="font-medium text-sm text-muted-foreground">Sidequests</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSidebar}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Sidequest Playlist Area (Scrollable, takes most space) */}
          <div className="flex-grow overflow-y-auto p-1 min-h-[100px]">
            <SidequestPlaylist
              sidequests={currentStep.sidequests}
              onOpenSidequest={handleOpenSidequest}
            />
          </div>

          {/* Step Info Display Area (Fixed at bottom) */}
          <div className="flex-shrink-0">
            <StepInfoDisplay 
              currentStep={currentStep}
              currentStepType={currentStepType}
              communityRoles={communityInfoResponse?.roles}
              assignRolesPerStep={stepsData?.assignRolesPerStep}
            />
          </div>
        </div>
      </div>
    );
  };

  // Custom modal implementation that works in iframe
  if (!open) return null;
  
  return (
    <div className="wizard-slideshow-modal">
      {/* Custom overlay */}
      <div 
        className="absolute inset-0 bg-black/60 z-50" 
        onClick={(e) => e.preventDefault()}
      />
      
      {/* Custom modal content */}
      <div 
        className="absolute inset-0 z-50 flex flex-col w-full h-full bg-background text-foreground overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Area - Optimize for mobile */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b min-h-[56px] sm:min-h-[60px]">
          <div className="pr-2">
            {(() => { 
              let stepTitle: string;
              let stepSubtitle: string;

              if (showSummary) {
                stepTitle = "Wizard Completed";
                stepSubtitle = "Summary of your progress";
              } else {
                // Logic for regular step titles (existing logic)
                const presentationConfig = currentStep?.config?.presentation as { headline?: string | null, subtitle?: string | null } | undefined;
                const headline = presentationConfig?.headline;
                const subtitle = presentationConfig?.subtitle;
                const fallbackTitle = currentStepType ? currentStepType.name.replace(/_/g, ' ') : `Step ${currentStepIndex + 1}`;
                stepTitle = headline || fallbackTitle;
                stepSubtitle = subtitle || (totalSteps > 0 ? `Step ${currentStepIndex + 1} of ${totalSteps}` : 'Loading steps...');
              }

              return (
                <>
                  <h2 className="text-base sm:text-lg font-semibold truncate">
                    {stepTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {stepSubtitle}
                  </p>
                </>
              );
            })()}
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-9" onClick={onClose} aria-label="Close wizard">
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Main Step Content Area - Fixed background */}
        <div className="flex-grow flex flex-col overflow-hidden relative h-full" style={{flex: '1 1 auto', minHeight: 0}}>
          {renderContent()}
        </div>

        {/* Footer Area (Navigation & Social Proof) - Optimize for mobile */}
        {!isLoadingSteps && !isLoadingTypes && !stepsError && totalSteps > 0 && !showSummary && (
          <div className="flex items-center justify-between p-3 sm:p-4 border-t min-h-[56px] sm:min-h-[60px]">
             {/* Left Side: Previous Button */}
             <div className="flex-1 flex justify-start"> 
                 <Button 
                   variant="outline" 
                   onClick={handlePrevious} 
                   disabled={isPrevDisabled}
                   size="sm"
                   className="h-8 px-3 sm:h-10 sm:px-4 text-xs sm:text-sm"
                 >
                   Previous
                 </Button>
             </div>
             
             {/* Center: Social Proof Widget - Hide on extra small screens */}
             <div className="hidden xs:flex flex-shrink-0 mx-2 sm:mx-4"> 
                  <SocialProofWidget 
                    data={socialProofData}
                    isLoading={isLoadingSocialProof}
                  />
             </div>

             {/* Right Side: Next/Summary Button */}
             <div className="flex-1 flex justify-end"> 
                 <Button 
                    onClick={isLastStep && isCompleted ? handleViewSummary : handleNext}
                    disabled={!canProceed || completeStepMutation.isPending} 
                    className={`h-8 px-3 sm:h-10 sm:px-4 text-xs sm:text-sm ${isCompleted ? "bg-green-600 hover:bg-green-700" : ""}`}
                    size="sm"
                 >
                    {isLastStep && isCompleted ? 'View Summary' : 'Next'}
                    {completeStepMutation.isPending && <Loader2 className="ml-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
                 </Button>
             </div>
          </div>
        )}

        {/* Render YouTubeViewerModal if a YouTube sidequest is active */}
        {activeSidequest && activeSidequest.sidequest_type === 'youtube' && (
          <YouTubeViewerModal
            isOpen={true} // Controlled by the conditional render
            onClose={handleCloseSidequestView}
            videoUrl={activeSidequest.content_payload}
            title={activeSidequest.title}
          />
        )}

        {/* Render MarkdownViewerModal if a Markdown sidequest is active */}
        {activeSidequest && activeSidequest.sidequest_type === 'markdown' && (
          <MarkdownViewerModal
            isOpen={true} // Controlled by the conditional render
            onClose={handleCloseSidequestView}
            markdownContent={activeSidequest.content_payload}
            title={activeSidequest.title}
          />
        )}

        {/* Render Link Preview if a Link sidequest is active */}
        {activeSidequest && activeSidequest.sidequest_type === 'link' && cgInstance && (
          <Dialog open={true} onOpenChange={(open) => !open && handleCloseSidequestView()}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="truncate">{activeSidequest.title}</DialogTitle>
                {activeSidequest.description && (
                  <DialogDescription className="mt-1 text-sm text-muted-foreground max-h-20 overflow-y-auto">
                    {activeSidequest.description}
                  </DialogDescription>
                )}
              </DialogHeader>
              <div className="py-4">
                {activeSidequest.image_url && (
                  <div className="mb-4 aspect-video bg-muted rounded overflow-hidden relative">
                    <Image 
                      src={activeSidequest.image_url} 
                      alt={activeSidequest.title} 
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground break-all">
                  Link: {activeSidequest.content_payload}
                </p>
              </div>
              <DialogFooter className="sm:justify-start">
                <Button 
                  type="button" 
                  onClick={() => {
                    if (cgInstance && activeSidequest) {
                      cgInstance.navigate(activeSidequest.content_payload);
                    }
                    handleCloseSidequestView();
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Open Link
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseSidequestView}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </div>
  );
}; 