'use client';

import React, { useMemo } from 'react';
// Removed Image import as it's handled by UserAvatar
// Import necessary payload types
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
import { Badge } from "@/components/ui/badge";
// Import Icons
import { User, Users, Award, BadgeCheck, Wallet, Loader2, AlertCircle, Star, Ticket, ExternalLink } from 'lucide-react';
// Import the new UserAvatar component
import { UserAvatar } from './UserAvatar';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWizardSlideshow } from '@/context/WizardSlideshowContext';
import { useCgLib } from '@/context/CgLibContext';
import { useCgQuery } from '@/hooks/useCgQuery';
import { useActiveWizardsQuery } from '@/hooks/useActiveWizardsQuery';
import { useRelevantStepsQuery } from '@/hooks/useRelevantStepsQuery';
import { useUserWizardCompletionsQuery } from '@/hooks/useUserWizardCompletionsQuery';

// Define Role type alias using the imported payload
type Role = NonNullable<CommunityInfoResponsePayload['roles']>[number]; 

// Define props expected from PluginContainer
interface UserViewProps {
  friends: UserFriendsResponsePayload | undefined;
  activeSection: string;
  isLoadingFriends: boolean;
  friendsError: Error | null;
}

export const UserView: React.FC<UserViewProps> = ({
  friends,
  activeSection,
  isLoadingFriends,
  friendsError,
}) => {
  // Get CG Lib context
  const { isInitializing, iframeUid } = useCgLib(); 

  // Fetch UserInfo and CommunityInfo using useCgQuery
  const { data: userInfo, isLoading: isLoadingUserInfo, error: userInfoError } = useCgQuery<
    UserInfoResponsePayload,
    Error
  >(
    ['userInfo', iframeUid],
    async (instance) => (await instance.getUserInfo()).data,
    { enabled: !!iframeUid }
  );

  const { data: communityInfo, isLoading: isLoadingCommunityInfo, error: communityInfoError } = useCgQuery<
    CommunityInfoResponsePayload,
    Error
  >(
    ['communityInfo', iframeUid],
    async (instance) => (await instance.getCommunityInfo()).data,
    { enabled: !!iframeUid }
  );

  // Fetch other data as before
  const { data: activeWizardsData, isLoading: isLoadingActiveWizards } = useActiveWizardsQuery();
  const { data: relevantStepsData, isLoading: isLoadingRelevantSteps } = useRelevantStepsQuery();
  const { data: completionsData, isLoading: isLoadingCompletions } = useUserWizardCompletionsQuery();
  const { setActiveSlideshowWizardId } = useWizardSlideshow();

  // Extract core data
  const userRoleIds = userInfo?.roles || [];
  const allCommunityRoles = communityInfo?.roles || [];

  // Calculate current roles
  const myRoles = useMemo(() => {
    if (!allCommunityRoles) return []; // Guard against undefined
    // Ensure the filter function correctly uses the Role type
    return allCommunityRoles.filter((role: Role) => userRoleIds.includes(role.id));
  }, [allCommunityRoles, userRoleIds]);

  // Combine loading/error states
  const isLoading = isLoadingUserInfo || isLoadingCommunityInfo || isLoadingActiveWizards || isLoadingRelevantSteps || isLoadingCompletions || isLoadingFriends;
  const error = userInfoError || communityInfoError; 

  // Only render content if the active section is 'profile'
  if (activeSection !== 'profile') {
    return null; 
  }
  
  // Handle overall loading state
  if (isInitializing || isLoading) {
      return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  // Handle overall error state
  if (error) {
       return (
        <div className="p-4 text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            <p>Error loading profile data: {(error as Error)?.message || 'An unknown error occurred'}</p>
        </div>
    );
  }

  // --- Render Logic --- 
  return (
    <>
      {/* Section title with animation */}
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          View your information, community connections, and roles.
        </p>
      </div>

      {/* Grid layout back to 2 cols on medium */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"> 
        {/* User Info Card */}
        <Card className="md:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-100" interactive>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Your Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className='flex flex-col gap-2.5 text-sm'> {/* Reverted gap change */}
            {isLoadingUserInfo ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : userInfoError ? (
              <div className="text-destructive flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <p>Error loading profile</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-3">
                    <UserAvatar 
                      imageUrl={userInfo?.imageUrl} 
                      name={userInfo?.name} 
                      userId={userInfo?.id} 
                      size={36} 
                      className="ring-2 ring-primary/20"
                    />
                    <div>
                      <p className="font-medium">{userInfo?.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {userInfo?.id?.substring(0, 10)}...</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mt-2">
                  {!!userInfo?.twitter && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                      </svg>
                      <span>{userInfo?.twitter?.username || 'Not connected'}</span>
                    </div>
                  )}
                  {!!userInfo?.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                      </svg>
                      <span>{userInfo?.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 21a8 8 0 0 0-16 0"></path>
                      <circle cx="10" cy="8" r="5"></circle>
                      <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path>
                    </svg>
                    <span>{communityInfo?.title}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Wallet Connection Card */}
        <Card className="md:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150" interactive>
           <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Wallet Connection</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-4"> 
            <ConnectButton showBalance={false} />
          </CardContent>
        </Card>

        {/* Your Roles Card */}
        <Card className="md:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-200" interactive>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <BadgeCheck className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Your Roles</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUserInfo || isLoadingCommunityInfo ? (
              <div className="flex items-center justify-center p-4">
                 <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : myRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {myRoles.map(role => (
                  <Badge key={role.id} variant="secondary" className="font-medium">
                    {role.title}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">You don't have any community roles yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Friends list Card (will wrap below on md screens) */}
        {((!isLoadingFriends && !friendsError && friends && friends.friends.length > 0) || isLoadingFriends) && (
           // Safely check friends?.friends before accessing length
           <Card className={`animate-in fade-in slide-in-from-bottom-5 duration-500 delay-250 ${(!isLoadingCommunityInfo) ? 'md:col-span-1' : 'md:col-span-2'}`} interactive>
             <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle>Your Friends</CardTitle>
                </div>
              </CardHeader>
              {/* Render content only if not loading and friends exist */}
              {!isLoadingFriends && friends?.friends && friends.friends.length > 0 && (
                <CardContent className='flex flex-col gap-3'>
                   {friends.friends.map((friend, index) => (
                    <div 
                      key={friend.id} 
                      className='flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-secondary/40'
                      style={{ animationDelay: `${150 + (index * 50)}ms` }}
                    >
                      <UserAvatar 
                        imageUrl={friend.imageUrl} 
                        name={friend.name} 
                        userId={friend.id} 
                        size={32}
                      />
                      <span className="font-medium">{friend.name}</span>
                    </div>
                  ))}
                 </CardContent>
              )}
              {/* Show loading inside if loading */}
               {isLoadingFriends && (
                  <CardContent className='flex items-center justify-center p-8'>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </CardContent>
               )}
           </Card>
        )}

      </div>
    </>
  );
}; 