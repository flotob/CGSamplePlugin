'use client';
import React, { useState, useTransition } from 'react';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
import { useCgLib } from '../context/CgLibContext';
import { useCgQuery } from '../hooks/useCgQuery';
import { useCgMutation } from '../hooks/useCgMutation';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { AdminView } from '../components/AdminView';
import { UserView } from '../components/UserView';
import { HelpView } from '../components/HelpView';
import { WizardView } from '../components/WizardView';
import { LayoutDashboard, Settings, Plug, User, ListChecks, Wand2 } from 'lucide-react';

// Removed targetRoleIdFromEnv constant
// const targetRoleIdFromEnv = process.env.NEXT_PUBLIC_TARGET_ROLE_ID;

// Define link structures with optional icons
const adminLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'config', label: 'Wizard Config', icon: Settings },
  { id: 'connections', label: 'Connections', icon: Plug },
];
const userLinks = [
  { id: 'wizards', label: 'Wizards', icon: Wand2 },
  { id: 'profile', label: 'Profile', icon: User },
];

const PluginContainer = () => {
  const { isInitializing, initError, iframeUid } = useCgLib();
  const { isAdmin, isLoading: isLoadingAdminStatus, error: adminStatusError } = useAdminStatus();
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

  // Wait for iframeUid AND admin status before proceeding
  const isLoading = isInitializing || isLoadingAdminStatus || !activeSection;
  const error = initError || adminStatusError;

  if (isLoading) {
    return <div>Loading Plugin...</div>;
  }

  if (error) {
    return <div className='text-red-500 p-4'>Error loading plugin base: {error.message}</div>;
  }

  if (!iframeUid || !activeSection) {
    return <div className='text-yellow-500 p-4'>Initializing...</div>;
  }

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
    activeSection
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
    <AppLayout
      sidebar={(
        <Sidebar 
          links={sidebarLinks} 
          activeSection={activeSection ?? ''}
          setActiveSection={handleSetActiveSection} 
        />
      )}
    >
      {activeSection && renderView()}
    </AppLayout>
  );
}

export default PluginContainer; 