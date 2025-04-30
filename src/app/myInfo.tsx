'use client';
import Image from 'next/image';
import React from 'react';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
import { useCgLib } from '../context/CgLibContext';
import { useCgQuery } from '../hooks/useCgQuery';
import { useCgMutation } from '../hooks/useCgMutation';
import { useAdminStatus } from '../hooks/useAdminStatus';

// Removed targetRoleIdFromEnv constant
// const targetRoleIdFromEnv = process.env.NEXT_PUBLIC_TARGET_ROLE_ID;

const MyInfo = () => {
  const { isInitializing, initError, iframeUid } = useCgLib();
  const { isAdmin, isLoading: isLoadingAdminStatus, error: adminStatusError } = useAdminStatus();

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

  return (<div className='flex flex-col gap-6'>
    <h2 className="text-xl font-semibold">
      {/* Title can still reflect admin status if desired, or be generic */} 
      {isAdmin ? "Plugin Admin View" : "Plugin User View"} 
    </h2>

    {/* User Info Display */}
    <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
      <p className='font-bold'>Your username is: {userInfo?.name}</p>
      {!!userInfo?.twitter && <p className='font-bold'>Your twitter account is: {userInfo?.twitter?.username || 'Not connected'}</p>}
      {!!userInfo?.lukso && <p className='font-bold'>Your lukso account is: {userInfo?.lukso?.username || 'Not connected'}</p>}
      {!!userInfo?.farcaster && <p className='font-bold'>Your farcaster account is: {userInfo?.farcaster?.username || 'Not connected'}</p>}
      {!!userInfo?.email && <p className='font-bold'>Your email is: {userInfo?.email || 'Not connected'}</p>}
      <p className='font-bold'>Your community is: {communityInfo?.title}</p>
      <p className='font-bold text-purple-600'>Admin Status Check: {isAdmin ? 'Yes' : 'No'}</p>
    </div>

    {/* Friends list */} 
    {friends && friends.friends.length > 0 && <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
      <p className='font-bold'>Some of your friends:</p>
      {friends.friends.map((friend) => (
        <div key={friend.id} className='flex items-center gap-2'>
          {friend.imageUrl && <Image src={friend.imageUrl} alt={friend.name} width={40} height={40} className='rounded-full' />}
          <span>{friend.name}</span>
        </div>
      ))}
    </div>}

    {/* Assignable roles list - now the main interaction point again */}
    {assignableRoles && assignableRoles.length > 0 && <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
      <p className='font-bold'>Manually Assignable Roles</p>
      {isAssigningRole && <p className='text-blue-500'>Assigning role...</p>}
      {assignRoleError && <p className='text-red-500'>Error assigning role: {assignRoleError.message}</p>}
      {assignableRoles?.map((role) => (
        <div className='grid grid-cols-2 items-center gap-2' key={role.id}>
          <p>{role.title}</p>
          {userInfo?.roles?.includes(role.id) ? (
            <span>Has Role</span>
          ) : (
            <button
              className='bg-blue-500 text-white px-2 py-1 rounded-md disabled:opacity-50'
              onClick={() => handleAssignRoleClick(role.id)} // Uses the central handler
              disabled={isAssigningRole}
            >
              Give Role
            </button>
          )}
        </div>
      ))}
    </div>}
  </div>);
}

export default MyInfo;