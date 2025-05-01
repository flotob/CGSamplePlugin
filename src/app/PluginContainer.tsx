'use client';
import React, { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
import { useQuery, useMutation } from '@tanstack/react-query';
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

  // State for current active section
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [previousSection, setPreviousSection] = useState<string | null>(null);

  // Custom section setter with transition
  const handleSetActiveSection = (section: string) => {
    if (section !== activeSection) {
      setPreviousSection(activeSection);
      startTransition(() => {
        setActiveSection(section);
      });
    }
  };

  // Determine sidebar links based on admin status only when status is loaded
  const sidebarLinks = !isLoadingAdminStatus ? (isAdmin ? adminLinks : userLinks) : [];

  // Effect to set initial active section once admin status is known
  React.useEffect(() => {
    if (!isLoadingAdminStatus && !activeSection) {
      startTransition(() => {
        // Set default view to 'wizards' for users, 'dashboard' for admins
        setActiveSection(isAdmin ? 'dashboard' : 'wizards');
      });
    }
  }, [isAdmin, isLoadingAdminStatus, activeSection]);

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

  // Combined loading and error states
  // We also consider `isAuthenticating` as part of the loading phase now.
  // The JWT is needed for backend calls, so the app isn't fully ready until it's attempted.
  const isCoreLoading = isInitializing || isLoadingAdminStatus || !activeSection || (isAuthenticating && !jwt);
  const coreError = initError || adminStatusError || authError || userInfoError || communityInfoError;

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

  // Render appropriate view based on active section with a wrapper div for animations
  const renderView = () => {
    if (isPending && previousSection === activeSection) {
      return null;
    }
    
    let view;
    if (activeSection === 'help') {
      view = <HelpView isAdmin={isAdmin} />;
    } else if (isAdmin) {
      view = <AdminView {...viewProps} />;
    } else {
      // User views
      switch (activeSection) {
        case 'wizards':
          view = <WizardView {...viewProps} />;
          break;
        case 'profile':
          view = <UserView {...viewProps} />;
          break;
        default:
          view = <WizardView {...viewProps} />;
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
            links={sidebarLinks} 
            activeSection={activeSection ?? ''}
            setActiveSection={handleSetActiveSection} 
            communityId={communityId}
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