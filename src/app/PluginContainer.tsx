'use client';
import React, { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCgLib } from '../context/CgLibContext';
import { useAuth } from '../context/AuthContext';
import { useCgQuery } from '../hooks/useCgQuery';
import { useCgMutation } from '../hooks/useCgMutation';
import { useAuthFetch } from '@/lib/authFetch';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { AdminView } from '../components/AdminView';
import { UserView } from '../components/UserView';
import { HelpView } from '../components/HelpView';
import { WizardView } from '../components/WizardView';
import { LayoutDashboard, Settings, Plug, User, Wand2, Building, Loader2 } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";
import { useWizardSlideshow } from '../context/WizardSlideshowContext';
import { WizardSlideshowModal } from '../components/onboarding/WizardSlideshowModal';
import { useToast } from "@/hooks/use-toast";
import { useUserWizardCompletionsQuery } from '@/hooks/useUserWizardCompletionsQuery';
import { useUserWizardsQuery } from '@/hooks/useUserWizardsQuery';

// Removed targetRoleIdFromEnv constant
// const targetRoleIdFromEnv = process.env.NEXT_PUBLIC_TARGET_ROLE_ID;

// Define link structures with optional icons
const adminLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'config', label: 'Wizard Config', icon: Settings },
  { id: 'connections', label: 'Connections', icon: Plug },
  { id: 'account', label: 'Account', icon: Building },
];
const userLinks = [
  { id: 'wizards', label: 'Wizards', icon: Wand2 },
  { id: 'profile', label: 'Profile', icon: User },
];

// Define the expected shape of the settings API response
interface CommunityLogoResponse {
  logo_url: string | null;
}

const PluginContainer = () => {
  const { isInitializing, initError, iframeUid } = useCgLib();
  const { isAdmin, isLoading: isLoadingAdminStatus, error: adminStatusError } = useAdminStatus();
  const { jwt, login, isAuthenticating, authError } = useAuth();
  const { authFetch } = useAuthFetch();
  const { activeSlideshowWizardId, setActiveSlideshowWizardId } = useWizardSlideshow();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State for current active section
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [previousSection, setPreviousSection] = useState<string | null>(null);
  // Add state for preview mode
  const [isPreviewingAsUser, setIsPreviewingAsUser] = useState<boolean>(false);
  const [hasCheckedHero, setHasCheckedHero] = useState(false); // State to prevent re-checking

  // Custom section setter with transition
  const handleSetActiveSection = (section: string) => {
    if (section !== activeSection) {
      setPreviousSection(activeSection);
      startTransition(() => {
        setActiveSection(section);
      });
    }
  };

  // Determine sidebar links based on admin status AND preview mode
  const linksToShow = !isLoadingAdminStatus ? ((isAdmin && !isPreviewingAsUser) ? adminLinks : userLinks) : [];

  // Effect to set initial active section once admin status is known
  React.useEffect(() => {
    // Only set initial section if one isn't already active
    if (!isLoadingAdminStatus && !activeSection) {
      startTransition(() => {
        // Default to user view if previewing, otherwise normal logic
        const defaultView = isPreviewingAsUser ? 'wizards' : (isAdmin ? 'dashboard' : 'wizards');
        setActiveSection(defaultView);
      });
    }
    // Reset to default admin/user view if preview mode changes
    // Or handle navigation more explicitly if needed
    if (!isLoadingAdminStatus && activeSection) {
       const currentViewIsAdminOnly = adminLinks.some(link => link.id === activeSection);
       const currentViewIsUserOnly = userLinks.some(link => link.id === activeSection);

       if (isPreviewingAsUser && currentViewIsAdminOnly) {
           startTransition(() => setActiveSection('wizards')); // Go to user default
       } else if (!isPreviewingAsUser && isAdmin && currentViewIsUserOnly) {
           startTransition(() => setActiveSection('dashboard')); // Go to admin default
       }
    }
  }, [isAdmin, isLoadingAdminStatus, activeSection, isPreviewingAsUser]); // Add isPreviewingAsUser dependency

  const { data: userInfoResponse, isLoading: isLoadingUserInfo, error: userInfoError } = useCgQuery<
    UserInfoResponsePayload,
    Error
  >(
    ['userInfo', iframeUid],
    async (instance) => (await instance.getUserInfo()).data,
    { enabled: !!iframeUid }
  );
  const userInfo = userInfoResponse;

  const { data: communityInfoResponse, isLoading: isLoadingCommunityInfo, error: communityInfoError } = useCgQuery<
    CommunityInfoResponsePayload,
    Error
  >(
    ['communityInfo', iframeUid],
    async (instance) => (await instance.getCommunityInfo()).data,
    { enabled: !!iframeUid }
  );
  const communityInfo = communityInfoResponse;
  const communityId = communityInfo?.id;
  const communityTitle = communityInfo?.title;

  // Fetch Community Logo URL
  const { data: logoData, isLoading: isLoadingLogo, error: logoError } = useQuery<CommunityLogoResponse, Error>({
    queryKey: ['communityLogo', communityId],
    queryFn: async () => {
      const res = await fetch(`/api/community/settings?communityId=${communityId}`);
      if (!res.ok) {
        // Handle 404 or other errors gracefully, maybe community has no logo set yet
        if (res.status === 404) return { logo_url: null }; 
        throw new Error('Failed to fetch community logo');
      }
      return res.json();
    },
    enabled: !!communityId,
    staleTime: 15 * 60 * 1000,
    retry: 1
  });

  // Sync Community Data Mutation
  const { mutate: syncCommunity } = useMutation<unknown, Error, { communityTitle: string }>({
    mutationFn: async (payload) => {
      return await authFetch('/api/community/sync', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onError: (error) => {
      console.error('Failed to sync community data:', error);
    },
  });

  // --- Effect to Trigger Community Sync --- 
  useEffect(() => {
      // Check if we have the necessary data and are authenticated
      if (communityId && communityTitle && jwt && !isAuthenticating) {
          // console.log('Triggering community sync...');
          syncCommunity({ communityTitle });
      }
      // Depend on the specific pieces of data needed to trigger the sync.
  }, [communityId, communityTitle, jwt, isAuthenticating, syncCommunity]);

  // Effect to trigger JWT login once CG Lib and user/community/admin status are ready
  useEffect(() => {
    // Only attempt login if CG is initialized, basic info is loaded, and not already authenticated/authenticating
    if (!isInitializing && !isLoadingUserInfo && !isLoadingCommunityInfo && !isLoadingAdminStatus && userInfo && communityInfo && !jwt && !isAuthenticating) {
        console.log('Attempting JWT login for user:', userInfo.id);
        login(); // login function already uses the correct isAdmin status internally
    }
    // Add dependencies including userInfo and communityInfo now
  }, [isInitializing, isLoadingUserInfo, isLoadingCommunityInfo, isLoadingAdminStatus, userInfo, communityInfo, jwt, isAuthenticating, login]);

  const { data: friendsResponse, isLoading: isLoadingFriends, error: friendsError } = useCgQuery<
    UserFriendsResponsePayload,
    Error
  >(
    ['userFriends', iframeUid, 10, 0],
    async (instance) => (await instance.getUserFriends(10, 0)).data,
    { enabled: !!iframeUid }
  );
  const friends = friendsResponse;

  const { mutate: assignRole, isPending: isAssigningRole, error: assignRoleError } = useCgMutation<
    unknown,
    Error,
    { roleId: string; userId: string }
  >(
    async (instance, { roleId, userId }) => {
      if (!roleId) throw new Error("Role ID is missing or invalid.");
      await instance.giveRole(roleId, userId);
    },
    {
      invalidateQueryKeys: [['userInfo', iframeUid], ['communityInfo', iframeUid]]
    }
  );

  const assignableRoles = React.useMemo(() => {
    return communityInfo?.roles?.filter((role) => role.assignmentRules?.type === 'free' || role.assignmentRules === null);
  }, [communityInfo]);

  // --- Fetch Data needed for Hero Logic ---
  // Fetch USER wizards and completions (require JWT)
  const { data: userWizardsData, isLoading: isLoadingUserWizards, error: userWizardsError } = useUserWizardsQuery(
      { enabled: !!jwt } // Enable once JWT is available
  );
  const { data: completionsData, isLoading: isLoadingCompletions } = useUserWizardCompletionsQuery(
      { enabled: !!jwt } // Enable once JWT is available
  );
  
  // --- Effect for Hero Wizard Auto-Launch --- 
  useEffect(() => {
    // Conditions to run:
    // - Not loading essential data (admin status, *user* wizards, completions)
    // - User is definitively NOT an admin
    // - We haven't already checked/launched the hero wizard
    // - Slideshow isn't already open
    // - User wizards data is loaded
    if (
      !isLoadingAdminStatus && 
      !isLoadingUserWizards && 
      !isLoadingCompletions && 
      (!isAdmin || isPreviewingAsUser) && // MODIFIED: Allow if !isAdmin OR isPreviewingAsUser
      !hasCheckedHero && 
      !activeSlideshowWizardId &&
      userWizardsData // Ensure user wizard data is present
    ) {
      console.log("Checking for Hero Wizard...");
      setHasCheckedHero(true); // Mark as checked

      // Get hero ID directly from user wizard data
      const heroWizardId = userWizardsData.heroWizardId;
      const completedIds = completionsData?.completed_wizard_ids ?? [];

      if (heroWizardId) {
          console.log(`Found active Hero Wizard ID: ${heroWizardId}`);
          if (!completedIds.includes(heroWizardId)) {
              console.log(`User has not completed Hero Wizard. Auto-launching...`);
              // Need a slight delay to ensure initial render completes before modal opens
              setTimeout(() => {
                 setActiveSlideshowWizardId(heroWizardId);
              }, 100); 
          } else {
              console.log('User has already completed Hero Wizard.');
          }
      } else {
          console.log('No active Hero Wizard found for this community.');
      }
    }
  }, [
    isAdmin, isLoadingAdminStatus, 
    userWizardsData, isLoadingUserWizards, 
    completionsData, isLoadingCompletions, 
    hasCheckedHero, activeSlideshowWizardId,
    setActiveSlideshowWizardId,
    isPreviewingAsUser // Add isPreviewingAsUser to dependency array
  ]);

  // Effect to reset hero check when exiting preview mode
  useEffect(() => {
    if (!isPreviewingAsUser) {
      setHasCheckedHero(false);
    }
  }, [isPreviewingAsUser]);

  // Display loading indicator
  // Update core loading check to use userWizards loading state
  const isCoreLoading = isInitializing || isLoadingAdminStatus || !activeSection || (isAuthenticating && !jwt) || isLoadingUserWizards || isLoadingCompletions;
  const coreError = initError || adminStatusError || authError || userInfoError || communityInfoError || userWizardsError; // Include userWizardsError

  // --- Effect for Stripe Callback Listener ---
  useEffect(() => {
    // ========================== STRIPE CALLBACK LISTENER ===========================
    // PURPOSE:
    // This listener is designed to receive messages from the parent application
    // (`app.cg`) after the user is redirected back from Stripe Checkout or the
    // Stripe Billing Portal. The parent application is expected to detect the
    // `?stripe_status=` query parameter in its URL, identify this plugin iframe,
    // and use `postMessage` to send the status back to this listener.
    //
    // INTENDED EFFECT:
    // Upon receiving a `stripeCallback` message, this listener should:
    // 1. Invalidate the `communityBillingInfo` query. This triggers a refetch of
    //    the user's current plan status from the backend (which should have
    //    already been updated by Stripe webhooks).
    // 2. Show a relevant toast notification (Success, Cancelled, Portal Closed).
    // 3. This provides *immediate UI feedback* to the user reflecting the outcome
    //    of their Stripe interaction, without requiring a manual page refresh.
    //
    // *** CURRENT STATUS (IMPORTANT!) ***
    // As of the current implementation date, the corresponding logic in the parent
    // application (`app.cg`) to *send* this `postMessage` callback after a Stripe
    // redirect is NOT YET IMPLEMENTED.
    //
    // REASON:
    // The parent page (`app.cg/c/{communityId}/`) needs to be updated to:
    //   a) Reliably detect the `?stripe_status=` parameter upon load.
    //   b) Reliably identify *this specific* plugin iframe instance among potentially others.
    //   c) Dispatch the `postMessage` call to this iframe's origin.
    //
    // CONSEQUENCE:
    // This listener code is **currently INACTIVE** in practice. It will not receive
    // any messages, and UI updates after returning from Stripe will only occur
    // when the user manually navigates back to this plugin view, causing the
    // `useCommunityBillingInfo` hook to refetch data naturally.
    //
    // FUTURE ACTIVATION:
    // This listener will start working as intended once the necessary callback logic
    // is implemented in the `app.cg` parent application.
    // ============================================================================

    const parentAppOrigin = process.env.NEXT_PUBLIC_PARENT_APP_URL;
    if (!parentAppOrigin) {
        console.warn("NEXT_PUBLIC_PARENT_APP_URL is not set. Cannot verify messages from parent.");
        // Decide if you want to proceed without origin check or stop here
        // return;
    }

    const handleMessage = (event: MessageEvent) => {
      // 1. Verify origin (important for security)
      if (parentAppOrigin && event.origin !== parentAppOrigin) {
        // console.log('Message ignored from origin:', event.origin); // Optional: debug logging
        return;
      }

      // 2. Check message structure
      if (event.data && event.data.type === 'stripeCallback') {
        console.log('Received Stripe callback message:', event.data);
        const { status } = event.data; // sessionId might also be present

        // 3. Invalidate query to refresh billing status
        // We invalidate regardless of status to fetch the latest state
        queryClient.invalidateQueries({ queryKey: ['communityBillingInfo', communityId] });

        // 4. Show appropriate toast message
        if (status === 'success') {
          toast({
            title: "Payment Successful!",
            description: "Your plan has been upgraded.",
          });
        } else if (status === 'portal_return') {
           toast({
             title: "Billing Portal Closed",
             description: "Your billing information may have been updated.",
           });
        } else if (status === 'cancel') {
          toast({
            title: "Checkout Cancelled",
            description: "Your checkout process was cancelled.",
            variant: "default", // Use default variant for cancellation
          });
        }
        // TODO: Potentially navigate the user within the iframe if needed?
        // For example, if they were viewing a specific billing error modal.
      }
    };

    console.log('Setting up Stripe callback listener for origin:', parentAppOrigin);
    window.addEventListener('message', handleMessage);

    // Cleanup function to remove listener when component unmounts
    return () => {
      console.log('Removing Stripe callback listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [queryClient, communityId, toast]); // Dependencies: re-run if these change

  // Display loading indicator
  if (isCoreLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        {isLoadingLogo ? (
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        ) : logoData?.logo_url ? (
          <Image 
            src={logoData.logo_url} 
            alt={`${communityInfo?.title || 'Community'} Logo`}
            width={80}
            height={80}
            className="w-auto h-20 mb-4 object-contain animate-pulse"
          />
        ) : (
           <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        )}
        <p className="text-lg font-medium">Loading Plugin...</p>
        {logoError && <p className="text-xs text-muted-foreground mt-1">Could not load community logo.</p>}
      </div>
    );
  }

  // Display error messages
  if (coreError) {
    return <div className='text-red-500 p-4'>Error loading plugin: {coreError.message}</div>;
  }

  // This check might be redundant now given the combined loading state, but keep for safety
  if (!iframeUid || !activeSection) {
    return <div className='text-yellow-500 p-4'>Initializing...</div>;
  }

  // Check if JWT is missing after attempting login (could indicate login failure)
  // Only gate essential functionality if JWT is strictly required for *all* backend calls
  // If only needed for admin actions, this check might be too strict here.
  // Let's comment out for now, admin checks can happen within AdminView.
  // if (!jwt) {
  //   return <div className='text-red-500 p-4'>Error: Could not establish secure session.</div>;
  // }

  const handleAssignRoleClick = (roleId: string | undefined) => {
    if (!roleId) {
      console.error("Role ID is missing.");
      return;
    }
    if (userInfo?.id) {
      assignRole({ roleId: roleId, userId: userInfo.id });
    } else {
      console.error("User ID is missing, cannot assign role.");
    }
  };

  const viewProps = {
    userInfo,
    isLoadingUserInfo,
    userInfoError,
    communityInfo,
    isLoadingCommunityInfo,
    communityInfoError,
    friends,
    isLoadingFriends,
    friendsError,
    assignableRoles,
    handleAssignRoleClick,
    isAssigningRole,
    assignRoleError,
    activeSection,
    authError
  };

  // Render appropriate view based on active section AND preview mode
  const renderView = () => {
    if (isPending && previousSection === activeSection) {
      return null;
    }
    
    let view;
    if (activeSection === 'help') {
      view = <HelpView isAdmin={isAdmin && !isPreviewingAsUser} />; // Pass effective admin status
    } else if (isAdmin && !isPreviewingAsUser) { // Render AdminView only if admin and NOT previewing
      view = <AdminView {...viewProps} activeSection={activeSection} />; // Pass activeSection
    } else { // Render User views if non-admin OR if admin IS previewing
      switch (activeSection) {
        case 'wizards':
          view = <WizardView />; // Pass only necessary props if any
          break;
        case 'profile':
          view = <UserView {...viewProps} />; 
          break;
        default:
          // Default to wizards view for users/preview
          view = <WizardView />; 
      }
    }

    return (
      <div className="view-transition">
        {view}
      </div>
    );
  };

  return (
    <div className="plugin-root relative h-screen w-screen overflow-hidden">
      <AppLayout
        sidebar={(
          <Sidebar 
            links={linksToShow} // Use dynamically determined links
            activeSection={activeSection ?? ''}
            setActiveSection={handleSetActiveSection} 
            communityId={communityId}
            // Pass down preview state and admin status
            isAdmin={isAdmin ?? false}
            isPreviewingAsUser={isPreviewingAsUser}
            setIsPreviewingAsUser={setIsPreviewingAsUser}
          />
        )}
      >
        {activeSection && renderView()}
        <Toaster />
      </AppLayout>

      {/* Conditionally render the modal outside the layout but within the plugin root */}
      {activeSlideshowWizardId && (
        <WizardSlideshowModal
          wizardId={activeSlideshowWizardId}
          open={!!activeSlideshowWizardId} 
          onClose={() => setActiveSlideshowWizardId(null)} 
        />
      )}
    </div>
  );
}

export default PluginContainer; 