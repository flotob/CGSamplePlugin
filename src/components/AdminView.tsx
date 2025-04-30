'use client';

import React from 'react';
import Image from 'next/image';
// Shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Payload types
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';

// Define props expected from PluginContainer
interface AdminViewProps {
  userInfo: UserInfoResponsePayload | undefined;
  communityInfo: CommunityInfoResponsePayload | undefined;
  friends: UserFriendsResponsePayload | undefined;
  assignableRoles: CommunityInfoResponsePayload['roles'] | undefined;
  handleAssignRoleClick: (roleId: string | undefined) => void;
  isAssigningRole: boolean;
  assignRoleError: Error | null;
  activeSection: string; // Receive activeSection prop
  // Add loading/error props for specific data if needed
  isLoadingUserInfo: boolean;
  userInfoError: Error | null;
  isLoadingCommunityInfo: boolean;
  communityInfoError: Error | null;
  isLoadingFriends: boolean;
  friendsError: Error | null;
}

export const AdminView: React.FC<AdminViewProps> = ({
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

  // Render loading/error specifically for the data needed by the active section if desired
  // Or rely on the global loading state in PluginContainer

  return (
    <>
      {/* Render Dashboard content */}
      {activeSection === 'dashboard' && (
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Info Card */} 
          <Card className="md:col-span-1">
              <CardHeader> <CardTitle>Your Info (Admin)</CardTitle> </CardHeader>
              <CardContent className='flex flex-col gap-1 text-sm'>
                {isLoadingUserInfo ? <p>Loading...</p> : userInfoError ? <p className='text-red-500'>Error</p> : (
                  <>
                    <p><span className='font-semibold'>Username:</span> {userInfo?.name}</p>
                    {!!userInfo?.twitter && <p><span className='font-semibold'>Twitter:</span> {userInfo?.twitter?.username || 'Not connected'}</p>}
                    {!!userInfo?.lukso && <p><span className='font-semibold'>Lukso:</span> {userInfo?.lukso?.username || 'Not connected'}</p>}
                    {!!userInfo?.farcaster && <p><span className='font-semibold'>Farcaster:</span> {userInfo?.farcaster?.username || 'Not connected'}</p>}
                    {!!userInfo?.email && <p><span className='font-semibold'>Email:</span> {userInfo?.email || 'Not connected'}</p>}
                    <p><span className='font-semibold'>Community:</span> {communityInfo?.title}</p>
                    <p><span className='font-semibold text-purple-600 dark:text-purple-400'>Admin Status Check:</span> Yes</p>
                  </>
                )}
              </CardContent>
          </Card>

          {/* Friends list Card */} 
          {/* Only render if not loading and no error, and friends exist */}
          {!isLoadingFriends && !friendsError && friends && friends.friends.length > 0 && (
              <Card className="md:col-span-1">
                <CardHeader> <CardTitle>Some of your friends</CardTitle> </CardHeader>
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
             {/* TODO: Add loading/error display for friends card */}

            {/* Assignable roles Card */} 
            {/* Only render if not loading community info and roles exist */} 
            {!isLoadingCommunityInfo && !communityInfoError && assignableRoles && assignableRoles.length > 0 && (
              <Card className="md:col-span-1"> 
                <CardHeader>
                  <CardTitle>Manually Assignable Roles</CardTitle>
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
                         <Button
                           variant="outline"
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
             {/* TODO: Add loading/error display for roles card */}
        </div>
      )}

      {/* Render Configuration Section */}
      {activeSection === 'config' && (
        <div className="w-full max-w-4xl mx-auto">
           <Card>
               <CardHeader>
                   <CardTitle>Wizard Configuration</CardTitle>
                   <CardDescription>Setup roles and steps for the onboarding wizard here.</CardDescription>
               </CardHeader>
               <CardContent>
                   {/* Role selection UI will go here in Phase 4 */}
                   <p className="text-sm text-muted-foreground">Role selection UI coming soon...</p>
               </CardContent>
           </Card>
         </div>
      )}
    </>
  );
};
