'use client';
import React from 'react';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
import { useCgLib } from '../context/CgLibContext';
import { useCgQuery } from '../hooks/useCgQuery';
import { useCgMutation } from '../hooks/useCgMutation';
import { useAdminStatus } from '../hooks/useAdminStatus';
import { AdminView } from '../components/AdminView';
import { UserView } from '../components/UserView';

// Removed targetRoleIdFromEnv constant
// const targetRoleIdFromEnv = process.env.NEXT_PUBLIC_TARGET_ROLE_ID;

// Renamed component from MyInfo to PluginContainer
const PluginContainer = () => {
  const { isInitializing, initError, iframeUid } = useCgLib();
  const { isAdmin, isLoading: isLoadingAdminStatus, error: adminStatusError } = useAdminStatus();

  // ... (rest of the hooks and logic remain the same)
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
      if (!roleId) throw new Error("Target Role ID is missing or invalid."); // Keep check, as roleId comes from button click
      await instance.giveRole(roleId, userId);
    },
    {
      invalidateQueryKeys: [['userInfo', iframeUid], ['communityInfo', iframeUid]]
    }
  );

  const assignableRoles = React.useMemo(() => {
    return communityInfo?.roles?.filter((role) => role.assignmentRules?.type === 'free' || role.assignmentRules === null);
  }, [communityInfo]);

  const isLoading = isInitializing || isLoadingAdminStatus || isLoadingUserInfo || isLoadingCommunityInfo || isLoadingFriends;
  const error = initError || adminStatusError || userInfoError || communityInfoError || friendsError;

  if (isLoading) {
    return <div>Loading Plugin Data...</div>;
  }

  if (error) {
    return <div className='text-red-500'>Error loading plugin: {error.message}</div>;
  }

  if (!iframeUid) {
    return <div className='text-yellow-500'>Waiting for plugin context...</div>;
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
    communityInfo,
    friends,
    assignableRoles,
    handleAssignRoleClick,
    isAssigningRole,
    assignRoleError
  };

  return (
    <div className='flex flex-col gap-6 w-full'>
      <h2 className="text-xl font-semibold">
        {isAdmin ? "Plugin Admin View" : "Plugin User View"} 
      </h2>
      {isAdmin ? (
        <AdminView {...viewProps} />
      ) : (
        <UserView {...viewProps} />
      )}
    </div>
  );
}

// Update the export name as well
export default PluginContainer; 