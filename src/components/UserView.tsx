'use client';

import React from 'react';
import Image from 'next/image'; // Import Image
// Import only the necessary payload types
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
// Import Shadcn components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define props expected from PluginContainer
interface UserViewProps {
  userInfo: UserInfoResponsePayload | undefined;
  communityInfo: CommunityInfoResponsePayload | undefined;
  friends: UserFriendsResponsePayload | undefined;
  // Use the inferred type for roles directly from the communityInfo payload
  assignableRoles: CommunityInfoResponsePayload['roles'] | undefined;
  handleAssignRoleClick: (roleId: string | undefined) => void;
  isAssigningRole: boolean;
  assignRoleError: Error | null;
  activeSection: string; // Receive activeSection prop
  // Add loading/error props for specific data
  isLoadingUserInfo: boolean;
  userInfoError: Error | null;
  isLoadingCommunityInfo: boolean;
  communityInfoError: Error | null;
  isLoadingFriends: boolean;
  friendsError: Error | null;
}

export const UserView: React.FC<UserViewProps> = ({
  userInfo,
  communityInfo,
  friends,
  assignableRoles,
  handleAssignRoleClick,
  isAssigningRole,
  assignRoleError,
  activeSection,
  // Destructure loading/error states
  isLoadingUserInfo,
  userInfoError,
  isLoadingCommunityInfo,
  communityInfoError,
  isLoadingFriends,
  friendsError,
}) => {

  // Only render content if the active section is 'profile'
  if (activeSection !== 'profile') {
    return null; 
  }

  // Optional: Add specific loading/error handling for this view
  if (isLoadingUserInfo || isLoadingCommunityInfo || isLoadingFriends) {
      // Could return a specific skeleton for the user view
      // return <UserViewSkeleton />;
  }
  if (userInfoError || communityInfoError || friendsError) {
      // Could return a specific error message for this view
      // return <p>Error loading profile data.</p>;
  }

  return (
    // Wrap content in a div with max-width and grid layout
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* User Info Card - Span 1 or 2 columns? Let's try spanning 1 */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Your Info</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-1 text-sm'>
          {/* Check for loading/error specifically for userInfo */}
          {isLoadingUserInfo ? <p>Loading...</p> : userInfoError ? <p className='text-red-500'>Error</p> : (
            <>
              <p><span className='font-semibold'>Username:</span> {userInfo?.name}</p>
              {!!userInfo?.twitter && <p><span className='font-semibold'>Twitter:</span> {userInfo?.twitter?.username || 'Not connected'}</p>}
              {!!userInfo?.lukso && <p><span className='font-semibold'>Lukso:</span> {userInfo?.lukso?.username || 'Not connected'}</p>}
              {!!userInfo?.farcaster && <p><span className='font-semibold'>Farcaster:</span> {userInfo?.farcaster?.username || 'Not connected'}</p>}
              {!!userInfo?.email && <p><span className='font-semibold'>Email:</span> {userInfo?.email || 'Not connected'}</p>}
              <p><span className='font-semibold'>Community:</span> {communityInfo?.title}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Friends list Card - Span 1 column */}
      {!isLoadingFriends && !friendsError && friends && friends.friends.length > 0 && (
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Some of your friends</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-2'>
            {friends.friends.map((friend) => (
              <div key={friend.id} className='flex items-center gap-2 text-sm'>
                {friend.imageUrl && <Image src={friend.imageUrl} alt={friend.name} width={32} height={32} className='rounded-full' />}
                <span>{friend.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Assignable roles Card - Span full width on medium screens */}
      {!isLoadingCommunityInfo && !communityInfoError && assignableRoles && assignableRoles.length > 0 && (
        <Card className="md:col-span-2"> {/* Span 2 columns */} 
          <CardHeader>
            <CardTitle>Manually Assignable Roles</CardTitle>
            {/* Display status messages inside the card header or content */}
            {isAssigningRole && <CardDescription className='text-blue-500 pt-2'>Assigning role...</CardDescription>}
            {assignRoleError && <CardDescription className='text-red-500 pt-2'>Error: {assignRoleError.message}</CardDescription>}
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            {assignableRoles?.map((role) => (
              <div className='flex items-center justify-between text-sm' key={role.id}>
                <p>{role.title}</p>
                {userInfo?.roles?.includes(role.id) ? (
                  <span className='text-xs text-gray-500 px-2 py-1 border rounded-md'>Already Has Role</span>
                ) : (
                  // Use Shadcn Button component
                  <Button
                    variant="outline" // Example variant
                    size="sm"
                    onClick={() => handleAssignRoleClick(role.id)}
                    disabled={isAssigningRole}
                  >
                    Get Role
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 