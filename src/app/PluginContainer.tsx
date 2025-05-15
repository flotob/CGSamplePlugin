'use client';
import React, { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
import { useMutation } from '@tanstack/react-query';
import { useCgLib } from '../context/CgLibContext';
import { useAuth } from '../context/AuthContext';
import { StripeWaitProvider, useStripeWaitContext } from '../context/StripeWaitContext';
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
import { ContactView } from '../components/ContactView';
import { DebugSettingsView } from '../components/DebugSettingsView';
import { SuperAdminDashboardView } from '../components/super-admin/SuperAdminDashboardView';
import { LayoutDashboard, Settings, Plug, User, Wand2, Loader2, Terminal, ShieldAlert } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";
import { useWizardSlideshow } from '../context/WizardSlideshowContext';
import { WizardSlideshowModal } from '../components/onboarding/WizardSlideshowModal';
import { StripeWaitingModal } from '../components/billing/StripeWaitingModal';
import { WizardEditorModal } from '../components/admin/WizardEditorModal';
import { useUserWizardCompletionsQuery } from '@/hooks/useUserWizardCompletionsQuery';
import { useUserWizardsQuery } from '@/hooks/useUserWizardsQuery';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { useSearchParams } from 'next/navigation';
import WelcomeAnimation from '@/components/WelcomeAnimation';
import { useAtom } from 'jotai';
import { hasSeenWelcomeAnimationAtom } from '@/stores/welcomeAnimationStore';

// Removed targetRoleIdFromEnv constant
// const targetRoleIdFromEnv = process.env.NEXT_PUBLIC_TARGET_ROLE_ID;

// Define link structures with optional icons
const adminLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'config', label: 'Wizard Config', icon: Settings },
  { id: 'connections', label: 'Connections', icon: Plug },
  // { id: 'account', label: 'Account', icon: Building }, // Removed Account link
  // { id: 'debug', label: 'Debug Settings', icon: Terminal }, // Already removed and handled separately
];
const userLinks = [
  { id: 'wizards', label: 'Wizards', icon: Wand2 },
  { id: 'profile', label: 'Profile', icon: User },
];

const superAdminLinks = [
  { id: 'super-admin', label: 'Super Admin', icon: ShieldAlert },
];

const debugLink = { id: 'debug', label: 'Debug Settings', icon: Terminal };

// Define the expected shape of the settings API response -- THIS CAN BE REMOVED
// interface CommunityLogoResponse {
//   logo_url: string | null;
// }

// Define props for AppCore
interface AppCoreProps {
  isUidCheckLogicComplete: boolean;
  uidFromParams: string | null;
  isCgLibInitializing: boolean;
  cgLibError: Error | null;
  cgLibIframeUid: string | null;
  isAdmin: boolean | null;
  isLoadingAdminStatus: boolean;
  adminStatusError: Error | null;
  jwt: string | null;
  login: () => Promise<void>;
  isAuthenticating: boolean;
  authError: Error | null;
  pluginContextAssignableRoleIds: string[] | undefined;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  activeSlideshowWizardId: string | null;
  setActiveSlideshowWizardId: (id: string | null) => void;
  isWaitingModalOpen: boolean;
  activeSection: string | null;
  setActiveSectionState: (section: string | null) => void;
  previousSection: string | null;
  setPreviousSectionState: (section: string | null) => void;
  isPreviewingAsUser: boolean;
  setIsPreviewingAsUserState: (value: boolean) => void;
  userInfo: UserInfoResponsePayload | undefined;
  isLoadingUserInfo: boolean;
  userInfoError: Error | null;
  communityInfo: CommunityInfoResponsePayload | undefined;
  isLoadingCommunityInfo: boolean;
  communityInfoError: Error | null;
  friends: UserFriendsResponsePayload | undefined;
  isLoadingFriends: boolean;
  friendsError: Error | null;
  pluginControlledDisplayRoles: DisplayRole[];
  otherDisplayRoles: DisplayRole[];
  selectableRolesForWizardConfig: DisplayRole[];
  assignRole: (variables: { roleId: string; userId: string }) => void;
  isAssigningRole: boolean;
  assignRoleError: Error | null;
  userWizardsData: WizardData | undefined;
  isLoadingUserWizards: boolean;
  userWizardsError: Error | null;
  completionsData: CompletionData | undefined;
  isLoadingCompletions: boolean;
  hasCheckedHero: boolean;
  isSuperAdmin: boolean;
  showWelcomeAnimation: boolean | null;
  setShowWelcomeAnimation: (show: boolean) => void;
}

// Define the interface for DisplayRole
interface DisplayRole {
  id: string;
  title: string;
  type: string;
  permissions: string[];
  assignmentRules: { 
    type: "free"; 
  } | { 
    type: "token"; 
    rules: object; 
  } | null;
}

// Define the interfaces for WizardData and CompletionData
interface WizardData {
  heroWizardId?: string | null;
  // Add other properties as needed
}

interface CompletionData {
  completed_wizard_ids?: string[];
  // Add other properties as needed
}

const AppCore: React.FC<AppCoreProps> = (props) => {
  const {
    isUidCheckLogicComplete,
    uidFromParams,
    isCgLibInitializing,
    cgLibError,
    cgLibIframeUid,
    isAdmin,
    isLoadingAdminStatus,
    adminStatusError,
    jwt,
    login,
    isAuthenticating,
    authError,
    pluginContextAssignableRoleIds,
    authFetch,
    activeSlideshowWizardId,
    setActiveSlideshowWizardId,
    isWaitingModalOpen,
    activeSection,
    setActiveSectionState,
    previousSection,
    setPreviousSectionState,
    isPreviewingAsUser,
    setIsPreviewingAsUserState,
    userInfo,
    isLoadingUserInfo,
    userInfoError,
    communityInfo,
    isLoadingCommunityInfo,
    communityInfoError,
    friends,
    isLoadingFriends,
    friendsError,
    pluginControlledDisplayRoles,
    otherDisplayRoles,
    selectableRolesForWizardConfig,
    assignRole,
    isAssigningRole,
    assignRoleError,
    userWizardsData,
    completionsData,
    isLoadingUserWizards,
    userWizardsError,
    isLoadingCompletions,
    hasCheckedHero,
    isSuperAdmin,
    showWelcomeAnimation,
    setShowWelcomeAnimation,
  } = props;

  // === ALL HOOKS IN AppCore MUST BE AT THE TOP ===
  // Hook 1: For redirect logic
  useEffect(() => {
    if (isUidCheckLogicComplete && !uidFromParams) {
      const homeUrl = process.env.NEXT_PUBLIC_HOME_URL;
      if (homeUrl) {
        console.log(`AppCore: uidFromParams not found. Redirecting to NEXT_PUBLIC_HOME_URL: ${homeUrl}`);
        window.location.href = homeUrl;
      } else {
        console.warn('AppCore: uidFromParams not found, and NEXT_PUBLIC_HOME_URL is not set. Cannot redirect.');
      }
    }
  }, [isUidCheckLogicComplete, uidFromParams]);

  // Hook 2: Memoizing linksToShow
  const linksToShow = React.useMemo(() => {
    let links = userLinks; // Default to user links
    if (isAdmin && !isPreviewingAsUser) {
      links = adminLinks;
    }
    if (isSuperAdmin) {
      // If super admin, prepend the super admin link to the current set of links (which would be adminLinks if also an admin)
      // If for some reason a super admin isn't a regular admin (which shouldn't be the case based on current roles), 
      // this would still add the super admin link.
      links = [...superAdminLinks, ...links.filter(link => !superAdminLinks.find(saLink => saLink.id === link.id))];
    }
    return links;
  }, [isSuperAdmin, isAdmin, isPreviewingAsUser]);
  
  // Hook 3: Effect to set initial active section
  // AppCore needs its own useTransition if startTransition is to be used within its effects directly
  const [isAppCoreTransitionPending, startAppCoreTransition] = React.useTransition();

  React.useEffect(() => {
    if (!isLoadingAdminStatus && !activeSection) {
      startAppCoreTransition(() => {
        let defaultView = 'wizards'; // Default for normal users
        if (isSuperAdmin) {
          defaultView = 'super-admin'; // Super admin defaults to their dashboard
        } else if (isAdmin && !isPreviewingAsUser) {
          defaultView = 'dashboard';
        }
        setActiveSectionState(defaultView);
      });
    }
    if (!isLoadingAdminStatus && activeSection) {
      const currentViewIsAdminOnly = adminLinks.some(link => link.id === activeSection);
      const currentViewIsUserOnly = userLinks.some(link => link.id === activeSection);
      const currentViewIsSuperAdminOnly = superAdminLinks.some(link => link.id === activeSection);

      // This condition specifically handles non-superadmins landing on the super-admin page.
      if (!isSuperAdmin && currentViewIsSuperAdminOnly) {
        const fallbackView = isAdmin && !isPreviewingAsUser ? 'dashboard' : 'wizards';
        startAppCoreTransition(() => setActiveSectionState(fallbackView));
      } 
      // These conditions handle admin/user view mismatches when not dealing with super-admin specific views.
      // And also ensure that if a super-admin is previewing as user, they are treated as user.
      else if (isPreviewingAsUser && currentViewIsAdminOnly && !currentViewIsSuperAdminOnly) { // Ensure not to redirect if it IS a super_admin page
        startAppCoreTransition(() => setActiveSectionState('wizards'));
      } else if (!isPreviewingAsUser && isAdmin && currentViewIsUserOnly && !currentViewIsSuperAdminOnly) { // Ensure not to redirect if it IS a super_admin page
        startAppCoreTransition(() => setActiveSectionState('dashboard'));
      }
    }
  }, [isSuperAdmin, isAdmin, isLoadingAdminStatus, activeSection, isPreviewingAsUser, setActiveSectionState, startAppCoreTransition]);

  // === Conditional Rendering Logic (now checks happen AFTER all AppCore hooks) ===
  if (!isUidCheckLogicComplete || (isUidCheckLogicComplete && !uidFromParams && process.env.NEXT_PUBLIC_HOME_URL)) {
    // Show loading if UID check isn't complete OR if we are about to redirect (and homeUrl is set)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-2">Verifying plugin session...</p>
      </div>
    );
  }

  // === APP-SPECIFIC LOADING AND ERROR STATES (using props from PluginContent) ===
  const isAppLoading = 
    isLoadingAdminStatus || 
    !activeSection || 
    (isAuthenticating && !jwt) || 
    isLoadingUserInfo || 
    isLoadingCommunityInfo || 
    pluginContextAssignableRoleIds === undefined ||
    isLoadingUserWizards || // Now included in app loading check
    isLoadingCompletions ||   // Now included in app loading check
    // Keep in loading state until we've decided whether to show welcome animation
    showWelcomeAnimation === null;

  const appSpecificError = 
    adminStatusError || 
    authError || 
    userInfoError || 
    communityInfoError ||
    userWizardsError; // Now included in app error check

  if (isAppLoading) {
    const displayLogoUrl = communityInfo?.smallLogoUrl;
    // This is the original "Loading Plugin..." screen
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        {isLoadingCommunityInfo && !displayLogoUrl ? (
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        ) : displayLogoUrl ? (
          <Image 
            src={displayLogoUrl} 
            alt={`${communityInfo?.title || 'Community'} Logo`}
            width={80}
            height={80}
            className="w-auto h-20 mb-4 object-contain animate-pulse"
          />
        ) : (
           <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> 
        )}
        <p className="text-lg font-medium">Loading Plugin...</p>
      </div>
    );
  }

  if (appSpecificError) {
    return <div className='text-red-500 p-4'>Error loading plugin data: {appSpecificError.message}</div>;
  }
  
  // Check CgLib initialization status (using props from PluginContent)
  if (isCgLibInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p>Initializing Common Ground Library...</p>
      </div>
    );
  }
  if (cgLibError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-500 p-4">
        <p>Error initializing Common Ground Library: {cgLibError.message}</p>
      </div>
    );
  }
  if (!cgLibIframeUid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-yellow-500 p-4">
        <p>Common Ground context not available (missing iframeUid after init attempt).</p>
      </div>
    );
  }

  // Show the welcome animation after all loading states are cleared
  if (showWelcomeAnimation) {
    return (
      <WelcomeAnimation 
        onComplete={() => setShowWelcomeAnimation(false)} 
        duration={3}
      />
    );
  }

  // Custom section setter using the passed-down state setter
  const handleSetActiveSection = (section: string) => {
    if (section !== activeSection) {
      setPreviousSectionState(activeSection);
      startAppCoreTransition(() => { 
        setActiveSectionState(section);
      });
    }
  };
  
  // Define handleAssignRoleClick within AppCore, using the passed assignRole mutate function
  const handleAssignRoleClick = (roleId: string | undefined) => {
    if (!roleId) {
      console.error("AppCore: Role ID is missing for assignRole.");
      return;
    }
    // userInfo is from props, make sure it's available and has an id
    if (props.userInfo?.id) {
      assignRole({ roleId: roleId, userId: props.userInfo.id });
    } else {
      console.error("AppCore: User ID is missing, cannot assign role.");
    }
  };
  
  // Construct viewProps for the actual view components
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
    pluginControlledDisplayRoles,
    otherDisplayRoles,
    selectableRolesForWizardConfig,
    handleAssignRoleClick,
    isAssigningRole,
    assignRoleError,
    activeSection: activeSection ?? '', 
    authError, 
    setActiveSection: handleSetActiveSection,
    authFetch,
    userWizardsData,
    isLoadingUserWizards,
    userWizardsError,
    completionsData,
    isLoadingCompletions,
    hasCheckedHero,
    login,
  };

  const renderView = () => {
    if (isAppCoreTransitionPending && previousSection === activeSection && activeSection !== null) return null;
    if (!activeSection) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Determining view...</p>
        </div>
      );
    }
    // Instantiate actual view components
    switch (activeSection) {
      case 'super-admin':
        return isSuperAdmin ? <SuperAdminDashboardView /> : (<div>Access Denied</div>);
      case 'dashboard': 
      case 'config': 
      case 'connections':
        // AdminView might need more specific props or logic to differentiate dashboard/config/connections
        // For now, passing the generic viewProps and activeSection for it to handle.
        // Ensure isAdmin is treated as boolean for this condition
        return (isAdmin === true) && !isPreviewingAsUser ? <AdminView {...viewProps} activeSection={activeSection} /> : <WizardView />; // Fallback to WizardView if not admin
      case 'wizards': 
        return <WizardView /* {...viewProps} if WizardView needs them */ />;
      case 'profile': 
        // Ensure isAdmin is treated as boolean for this condition
        return !(isAdmin === true) || isPreviewingAsUser ? <UserView {...viewProps} /> : <AdminView {...viewProps} activeSection={'dashboard'} />; // Fallback to Admin dashboard if admin not previewing
      case 'debug': 
        return <DebugSettingsView />;
      case 'help': 
        // Pass isAdmin as a strict boolean
        return <HelpView isAdmin={isAdmin === true && !isPreviewingAsUser} />;
      case 'contact': 
        return <ContactView />;
      default: 
        return <div className="p-4">Unknown Section: {activeSection}</div>;
    }
  };

  // Use live data for Sidebar, with fallbacks
  // const mockUserInfo = { name: (jwt ? 'Logged In User' : 'Guest User'), imageUrl: undefined, id: 'mock-user-id' }; // DELETE THIS LINE
  // const mockCommunityInfo = { smallLogoUrl: undefined, title: 'Community' }; // DELETE THIS LINE

  // Use live data if available, otherwise fall back to simple mocks or loading text
  const sidebarUserName = isLoadingUserInfo ? 'Loading user...' : (userInfo?.name ?? 'User');
  const sidebarUserImageUrl = userInfo?.imageUrl;
  const sidebarUserId = isLoadingUserInfo ? '' : (userInfo?.id ?? 'user-id');
  const sidebarLogoUrl = isLoadingCommunityInfo ? undefined : communityInfo?.smallLogoUrl;

  // NOTE: The full AppLayout with data fetching, modals, etc., would be restored here.
  // For now, a minimal representation based on the diagnostic step:
  return (
    <>
      <AppLayout
        sidebar={(
          <Sidebar 
            links={linksToShow} 
            debugLink={debugLink} 
            activeSection={activeSection ?? ''} 
            setActiveSection={handleSetActiveSection} 
            isAdmin={isAdmin ?? false}
            isPreviewingAsUser={isPreviewingAsUser}
            setIsPreviewingAsUser={setIsPreviewingAsUserState}
            userName={sidebarUserName}       
            userImageUrl={sidebarUserImageUrl} 
            userId={sidebarUserId}           
            logoUrl={sidebarLogoUrl} 
            onProfileClick={() => {
              const targetSection = (isAdmin && !isPreviewingAsUser) ? 'dashboard' : 'profile';
              handleSetActiveSection(targetSection);
            }}
          />
        )}
      >
        {renderView()} 
        <Toaster />
      </AppLayout>
      
      {/* --- UNCOMMENTING MODALS --- */}
      {/* Global modals */}
      {activeSlideshowWizardId && (
        <WizardSlideshowModal
          wizardId={activeSlideshowWizardId} // from props
          open={!!activeSlideshowWizardId} // from props
          onClose={() => setActiveSlideshowWizardId(null)} // setActiveSlideshowWizardId from props
        />
      )}

      {/* Wizard Editor Modal - Assuming it manages its own open state via Zustand/Jotai or context */}
      <WizardEditorModal />

      {/* Stripe Modal */}
      {isWaitingModalOpen && (
         <StripeWaitingModal communityId={communityInfo?.id} /> // communityInfo from props
      )}

      {/* Render Global Upgrade Modal - Assuming it manages its own open state */}
      <UpgradeModal />
    </>
  );
};

// Inner component to access StripeWaitContext after provider
const PluginContent = () => {
  // === ALL HOOKS ARE CALLED UNCONDITIONALLY AT THE TOP OF PluginContent ===
  const [isUidCheckLogicComplete, setIsUidCheckLogicComplete] = useState(false);
  const searchParams = useSearchParams();
  
  // Memoize uidFromParams so it's stable for AppCore's useEffect dependency array
  const uidFromParams = React.useMemo(() => searchParams.get('iframeUid'), [searchParams]);

  // State for welcome animation
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState<boolean | null>(null);
  // Get and update the persisted state of whether user has seen the animation
  const [hasSeenWelcomeAnimation, setHasSeenWelcomeAnimation] = useAtom(hasSeenWelcomeAnimationAtom);

  // Existing application hooks
  const { isInitializing: isCgLibInitializing, initError: cgLibError, iframeUid: cgLibIframeUid } = useCgLib();
  const { isAdmin, isLoading: isLoadingAdminStatus, error: adminStatusError } = useAdminStatus();
  const { jwt, login, isAuthenticating, authError, pluginContextAssignableRoleIds, decodedPayload } = useAuth();
  const { authFetch } = useAuthFetch();
  const { activeSlideshowWizardId, setActiveSlideshowWizardId } = useWizardSlideshow();
  // These transition hooks are unused in this component but may be needed later
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isTransitionPending, _startTransition] = useTransition();
  const { isWaitingModalOpen } = useStripeWaitContext();

  // Existing state declarations
  const [activeSection, setActiveSectionState] = useState<string | null>(null);
  const [previousSection, setPreviousSectionState] = useState<string | null>(null);
  const [isPreviewingAsUser, setIsPreviewingAsUserState] = useState<boolean>(false);
  const [hasCheckedHero, setHasCheckedHeroState] = useState<boolean>(false);

  // Determine if current user is Super Admin
  const superAdminIdFromEnv = process.env.NEXT_PUBLIC_SUPERADMIN_ID;
  const currentUserId = decodedPayload?.sub;
  const isSuperAdminUser = !!currentUserId && !!superAdminIdFromEnv && currentUserId === superAdminIdFromEnv;

  // --- UNCOMMENTING DATA FETCHING FOR USER AND COMMUNITY --- 
  const { data: userInfoResponse, isLoading: isLoadingUserInfo, error: userInfoError } = useCgQuery<
    UserInfoResponsePayload,
    Error
  >(
    ['userInfo', cgLibIframeUid], // Use cgLibIframeUid from useCgLib()
    async (instance) => (await instance.getUserInfo()).data,
    { enabled: !!cgLibIframeUid } // Ensure CgLib is ready
  );
  const userInfo = userInfoResponse;

  const { data: communityInfoResponse, isLoading: isLoadingCommunityInfo, error: communityInfoError } = useCgQuery<
    CommunityInfoResponsePayload,
    Error
  >(
    ['communityInfo', cgLibIframeUid], // Use cgLibIframeUid
    async (instance) => (await instance.getCommunityInfo()).data,
    { enabled: !!cgLibIframeUid } // Ensure CgLib is ready
  );
  const communityInfo = communityInfoResponse;
  // const communityId = communityInfo?.id; // Will be used later
  // const communityTitle = communityInfo?.title; // Will be used later

  // --- UNCOMMENTING FRIENDS DATA FETCHING --- 
  const { data: friendsResponse, isLoading: isLoadingFriends, error: friendsError } = useCgQuery<
    UserFriendsResponsePayload,
    Error
  >(
    ['userFriends', cgLibIframeUid, 10, 0], // Assuming default limit/offset
    async (instance) => (await instance.getUserFriends(10, 0)).data,
    { enabled: !!cgLibIframeUid }
  );
  const friends = friendsResponse;

  // --- UNCOMMENTING ROLES LOGIC --- 
  // Env var is named _IDS, but we treat its content as titles
  const ignoredRoleTitlesFromEnv = process.env.NEXT_PUBLIC_IGNORED_ROLE_IDS || '';
  // Split the string from env var (which contains titles) into an array of titles
  const titlesToIgnore = ignoredRoleTitlesFromEnv.split(',').map(title => title.trim().toLowerCase()).filter(title => title);

  const { pluginControlledDisplayRoles, otherDisplayRoles } = React.useMemo(() => {
    if (!communityInfo?.roles || pluginContextAssignableRoleIds === undefined) {
      return { pluginControlledDisplayRoles: [], otherDisplayRoles: [] };
    }
    const actualIdsToFilterOutByTitle = new Set<string>();
    if (titlesToIgnore.length > 0) {
      communityInfo.roles.forEach(role => {
        if (titlesToIgnore.includes(role.title.toLowerCase())) {
          actualIdsToFilterOutByTitle.add(role.id);
        }
      });
    }
    const allNonIgnoredRoles = communityInfo.roles.filter(role => !actualIdsToFilterOutByTitle.has(role.id));
    const group1_pluginControlledAndDisplayable = allNonIgnoredRoles.filter(role => 
      pluginContextAssignableRoleIds.includes(role.id) &&
      (
        (role.assignmentRules?.type === 'free' || role.assignmentRules === null) ||
        role.type === 'CUSTOM_AUTO_ASSIGN'
      )
    );
    const group1Ids = new Set(group1_pluginControlledAndDisplayable.map(r => r.id));
    const group2_otherCommunityRoles = allNonIgnoredRoles.filter(role => !group1Ids.has(role.id));
    return {
      pluginControlledDisplayRoles: group1_pluginControlledAndDisplayable,
      otherDisplayRoles: group2_otherCommunityRoles
    };
  }, [communityInfo, titlesToIgnore, pluginContextAssignableRoleIds]);

  const selectableRolesForWizardConfig = React.useMemo(() => {
    // Ensure pluginControlledDisplayRoles is not undefined before filtering
    return pluginControlledDisplayRoles?.filter(role => role.type === 'CUSTOM_MANUAL_ASSIGN') ?? [];
  }, [pluginControlledDisplayRoles]);

  // --- UNCOMMENTING EFFECT TO TRIGGER JWT LOGIN --- 
  useEffect(() => {
    // Only attempt login if CgLib is initialized (isCgLibInitializing is false), 
    // basic info (userInfo, communityInfo) is loaded (their isLoading flags are false),
    // admin status is known (isLoadingAdminStatus is false),
    // and not already authenticated/authenticating.
    if (!isCgLibInitializing && !isLoadingUserInfo && !isLoadingCommunityInfo && !isLoadingAdminStatus && 
        userInfo && communityInfo && !jwt && !isAuthenticating) {
        console.log('[PluginContent] Attempting JWT login for user:', userInfo.id, 'Admin status:', isAdmin);
        login(); // login function from useAuth()
    }
  }, [
    isCgLibInitializing, isLoadingUserInfo, isLoadingCommunityInfo, isLoadingAdminStatus, 
    userInfo, communityInfo, jwt, isAuthenticating, login, isAdmin
  ]);

  // Effect to determine if the initial UID check phase is logically complete
  useEffect(() => {
    // The decision to redirect or not is based on uidFromParams and HOME_URL.
    // This effect just signals that this initial check can be considered "done".
    // AppCore will handle the actual redirect if needed based on uidFromParams.
    setIsUidCheckLogicComplete(true);
  }, [uidFromParams]); // Runs when uidFromParams is resolved

  // --- UNCOMMENTING SYNC COMMUNITY MUTATION & EFFECT --- 
  const { mutate: syncCommunity } = useMutation<unknown, Error, { communityTitle: string }>({
    mutationFn: async (payload) => {
      // Ensure authFetch is available here. It's from useAuthFetch() called at the top of PluginContent.
      return await authFetch('/api/community/sync', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onError: (error) => {
      console.error('Failed to sync community data:', error);
    },
  });

  useEffect(() => {
      // communityInfo, jwt, isAuthenticating are all from hooks at the top of PluginContent
      if (communityInfo?.id && communityInfo?.title && jwt && !isAuthenticating) {
          syncCommunity({ communityTitle: communityInfo.title });
      }
  }, [communityInfo, jwt, isAuthenticating, syncCommunity]); // communityInfo itself is a dependency

  // --- UNCOMMENTING ASSIGN ROLE MUTATION --- 
  const { mutate: assignRole, isPending: isAssigningRole, error: assignRoleError } = useCgMutation<
    unknown,
    Error,
    { roleId: string; userId: string }
  >(
    async (instance, { roleId, userId }) => {
      if (!roleId) throw new Error("Role ID is missing or invalid.");
      // instance is CgPluginLib instance, managed by useCgMutation
      await instance.giveRole(roleId, userId);
    },
    {
      // Invalidate queries that might be affected by role assignment
      invalidateQueryKeys: [['userInfo', cgLibIframeUid], ['communityInfo', cgLibIframeUid], ['userWizards']]
      // Added 'userWizards' as role changes might affect wizard accessibility
    }
  );

  // --- RE-ADDING USER WIZARDS & COMPLETIONS DATA FETCHING IN PluginContent --- 
  const { data: userWizardsData, isLoading: isLoadingUserWizards, error: userWizardsError } = useUserWizardsQuery(
      { enabled: !!jwt } // Enable once JWT is available
  );
  const { data: completionsData, isLoading: isLoadingCompletions } = useUserWizardCompletionsQuery(
      { enabled: !!jwt } // Enable once JWT is available
  );

  // --- RE-ACTIVATING HERO WIZARD AUTO-LAUNCH EFFECT & RELATED LOGIC IN PluginContent --- 
  useEffect(() => {
    // Conditions to run:
    // - Not loading essential data (admin status, *user* wizards, completions)
    // - User is definitively NOT an admin (or admin is previewing as user)
    // - We haven't already checked/launched the hero wizard
    // - Slideshow isn't already open
    // - User wizards data is loaded
    if (
      !isLoadingAdminStatus && 
      !isLoadingUserWizards && 
      !isLoadingCompletions && 
      (!isAdmin || isPreviewingAsUser) && 
      !hasCheckedHero && 
      !activeSlideshowWizardId && // from useWizardSlideshow hook
      userWizardsData // Ensure user wizard data is present
    ) {
      console.log("[PluginContent] Checking for Hero Wizard...");
      setHasCheckedHeroState(true); // Mark as checked using state setter from PluginContent

      const heroWizardId = userWizardsData.heroWizardId; // Assuming this path exists on your data type
      const completedWizardIds = completionsData?.completed_wizard_ids ?? []; // Assuming this path

      if (heroWizardId) {
          console.log(`[PluginContent] Found active Hero Wizard ID: ${heroWizardId}`);
          if (!completedWizardIds.includes(heroWizardId)) {
              console.log('[PluginContent] User has not completed Hero Wizard. Auto-launching...');
              setTimeout(() => {
                 setActiveSlideshowWizardId(heroWizardId); // from useWizardSlideshow hook
              }, 100); 
          } else {
              console.log('[PluginContent] User has already completed Hero Wizard.');
          }
      } else {
          console.log('[PluginContent] No active Hero Wizard found for this community.');
      }
    }
  }, [
    isAdmin, isLoadingAdminStatus, 
    userWizardsData, isLoadingUserWizards, 
    completionsData, isLoadingCompletions, 
    hasCheckedHero, activeSlideshowWizardId,
    setActiveSlideshowWizardId, // from useWizardSlideshow hook
    setHasCheckedHeroState,     // state setter from PluginContent
    isPreviewingAsUser
  ]);

  // Effect to reset hero check when exiting preview mode
  useEffect(() => {
    if (!isPreviewingAsUser) {
      setHasCheckedHeroState(false);
    }
  }, [isPreviewingAsUser, setHasCheckedHeroState]);

  // Effect to trigger the welcome animation once loading is complete
  useEffect(() => {
    // Show the welcome animation when:
    // 1. Not loading essential data
    // 2. No errors detected
    // 3. We have the necessary initialization data
    // 4. Not currently showing any slideshow wizard
    // 5. User hasn't seen the welcome animation before
    if (
      !isCgLibInitializing &&
      !isLoadingAdminStatus &&
      !isLoadingUserInfo &&
      !isLoadingCommunityInfo &&
      !isLoadingUserWizards &&
      !isLoadingCompletions &&
      cgLibIframeUid &&
      !adminStatusError &&
      !authError &&
      !userInfoError &&
      !communityInfoError &&
      !userWizardsError &&
      !activeSlideshowWizardId &&
      !hasSeenWelcomeAnimation // Only show if user hasn't seen it before
    ) {
      // Immediately set to true when all conditions are met
      setShowWelcomeAnimation(true);
    } else {
      // If we're not showing the animation (either due to loading issues or user has seen it before)
      // make sure we exit the loading state by setting to false
      setShowWelcomeAnimation(false);
    }
  }, [
    isCgLibInitializing,
    isLoadingAdminStatus,
    isLoadingUserInfo,
    isLoadingCommunityInfo,
    isLoadingUserWizards,
    isLoadingCompletions,
    cgLibIframeUid,
    adminStatusError,
    authError,
    userInfoError,
    communityInfoError,
    userWizardsError,
    activeSlideshowWizardId,
    hasSeenWelcomeAnimation
  ]);

  return (
    <AppCore
      isUidCheckLogicComplete={isUidCheckLogicComplete}
      uidFromParams={uidFromParams} // Pass the memoized uidFromParams
      isCgLibInitializing={isCgLibInitializing}
      cgLibError={cgLibError}
      cgLibIframeUid={cgLibIframeUid}
      isAdmin={isAdmin}
      isLoadingAdminStatus={isLoadingAdminStatus}
      adminStatusError={adminStatusError}
      jwt={jwt}
      login={login}
      isAuthenticating={isAuthenticating}
      authError={authError}
      pluginContextAssignableRoleIds={pluginContextAssignableRoleIds}
      authFetch={authFetch}
      activeSlideshowWizardId={activeSlideshowWizardId}
      setActiveSlideshowWizardId={setActiveSlideshowWizardId}
      isWaitingModalOpen={isWaitingModalOpen}
      activeSection={activeSection}
      setActiveSectionState={setActiveSectionState}
      previousSection={previousSection}
      setPreviousSectionState={setPreviousSectionState}
      isPreviewingAsUser={isPreviewingAsUser}
      setIsPreviewingAsUserState={setIsPreviewingAsUserState}
      userInfo={userInfo}
      isLoadingUserInfo={isLoadingUserInfo}
      userInfoError={userInfoError}
      communityInfo={communityInfo}
      isLoadingCommunityInfo={isLoadingCommunityInfo}
      communityInfoError={communityInfoError}
      // Pass Friends data
      friends={friends}
      isLoadingFriends={isLoadingFriends}
      friendsError={friendsError}
      // Pass Roles data
      pluginControlledDisplayRoles={pluginControlledDisplayRoles}
      otherDisplayRoles={otherDisplayRoles}
      selectableRolesForWizardConfig={selectableRolesForWizardConfig}
      // Pass assignRole mutation and its states
      assignRole={assignRole}
      isAssigningRole={isAssigningRole}
      assignRoleError={assignRoleError}
      // Pass new loading/error states to AppCore
      isLoadingUserWizards={isLoadingUserWizards}
      userWizardsError={userWizardsError}
      isLoadingCompletions={isLoadingCompletions}
      // Pass actual data for wizards/completions to AppCore
      userWizardsData={userWizardsData}
      completionsData={completionsData}
      hasCheckedHero={hasCheckedHero} // Pass hasCheckedHero to AppCore
      isSuperAdmin={isSuperAdminUser} // Pass isSuperAdminUser to AppCore
      showWelcomeAnimation={showWelcomeAnimation}
      setShowWelcomeAnimation={(show) => {
        // When turning off the animation, also mark as seen
        if (show === false) {
          setHasSeenWelcomeAnimation(true);
        }
        setShowWelcomeAnimation(show);
      }}
    />
  );
};

// Main export wraps the content in the provider
export default function PluginContainer() {
  return (
    <StripeWaitProvider>
       <PluginContent />
    </StripeWaitProvider>
  );
} 