'use client';

import React from 'react';
import Image from 'next/image';
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
// Shadcn components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components

// Define props expected from PluginContainer
interface AdminViewProps {
  userInfo: UserInfoResponsePayload | undefined;
  communityInfo: CommunityInfoResponsePayload | undefined;
  friends: UserFriendsResponsePayload | undefined;
  assignableRoles: CommunityInfoResponsePayload['roles'] | undefined;
  handleAssignRoleClick: (roleId: string | undefined) => void;
  isAssigningRole: boolean;
  assignRoleError: Error | null;
}

export const AdminView: React.FC<AdminViewProps> = ({
  userInfo,
  communityInfo,
  friends,
  assignableRoles,
  handleAssignRoleClick,
  isAssigningRole,
  assignRoleError,
}) => {

  return (
    // Use Tabs component for main structure
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto"> {/* Constrain TabsList width */}
        <TabsTrigger value="info">Current Info</TabsTrigger>
        <TabsTrigger value="config">Configuration</TabsTrigger>
      </TabsList>

      {/* Tab Content for Current Info */}
      <TabsContent value="info" className="mt-4">
        {/* Wrap content in a div with max-width and grid layout */}
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Info Card - Span 1 column */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Your Info (Admin)</CardTitle>
              </CardHeader>
              <CardContent className='flex flex-col gap-1 text-sm'>
                <p><span className='font-semibold'>Username:</span> {userInfo?.name}</p>
                {!!userInfo?.twitter && <p><span className='font-semibold'>Twitter:</span> {userInfo?.twitter?.username || 'Not connected'}</p>}
                {!!userInfo?.lukso && <p><span className='font-semibold'>Lukso:</span> {userInfo?.lukso?.username || 'Not connected'}</p>}
                {!!userInfo?.farcaster && <p><span className='font-semibold'>Farcaster:</span> {userInfo?.farcaster?.username || 'Not connected'}</p>}
                {!!userInfo?.email && <p><span className='font-semibold'>Email:</span> {userInfo?.email || 'Not connected'}</p>}
                <p><span className='font-semibold'>Community:</span> {communityInfo?.title}</p>
                <p><span className='font-semibold text-purple-600 dark:text-purple-400'>Admin Status Check:</span> Yes</p>
              </CardContent>
            </Card>

            {/* Friends list Card - Span 1 column */}
            {friends && friends.friends.length > 0 && (
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

            {/* Assignable roles Card - Span full width */} 
            {assignableRoles && assignableRoles.length > 0 && (
              <Card className="md:col-span-2"> {/* Span 2 columns */} 
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
        </div>
      </TabsContent>

      {/* Tab Content for Configuration */}
      <TabsContent value="config" className="mt-4">
        {/* Apply max-width to this container as well */}
        <div className="w-full max-w-4xl mx-auto">
          <Card>
              <CardHeader>
                  <CardTitle>Wizard Configuration (Phase 3)</CardTitle>
                  <CardDescription>Setup roles and steps for the onboarding wizard here.</CardDescription>
              </CardHeader>
              <CardContent>
                  {/* Role selection and workflow builder will go here */}
                  <p className="text-sm text-muted-foreground">Configuration UI coming soon...</p>
              </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};
