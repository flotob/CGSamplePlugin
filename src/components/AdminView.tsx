'use client';

import React, { useState, useEffect } from 'react';
// Removed Image import
// Shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
// Payload types
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import type { UserFriendsResponsePayload } from '@common-ground-dao/cg-plugin-lib-host';
// Icons
import { Shield, Users, BadgeCheck, Cog, Plug, Building, AlertCircle } from 'lucide-react';
// Import the new UserAvatar component
import { UserAvatar } from './UserAvatar';
import { WizardStepEditorPage } from './onboarding/WizardStepEditorPage';
import { WizardList } from './onboarding/WizardList';
import { NewWizardButton } from './onboarding/NewWizardButton';
// Hooks & Libs
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import Image from 'next/image';
import { BillingManagementSection } from './billing/BillingManagementSection';
import { QuotaUsageDisplay } from './admin/QuotaUsageDisplay';
import { useAssignRoleAndRefresh } from '@/hooks/useAssignRoleAndRefresh';

// Define props expected from PluginContainer
interface AdminViewProps {
  userInfo: UserInfoResponsePayload | undefined;
  communityInfo: CommunityInfoResponsePayload | undefined;
  friends: UserFriendsResponsePayload | undefined;
  assignableRoles: CommunityInfoResponsePayload['roles'] | undefined;
  activeSection: string; // Receive activeSection prop
  // Add loading/error props for specific data if needed
  isLoadingUserInfo: boolean;
  userInfoError: Error | null;
  isLoadingCommunityInfo: boolean;
  communityInfoError: Error | null;
  isLoadingFriends: boolean;
  friendsError: Error | null;
  // Remove JWT state props that are unused
  // jwt: string | null;
  // isAuthenticating: boolean;
  authError: Error | null;
}

// Define the expected shape of the settings API response
interface CommunitySettings {
  logo_url: string | null;
}

export const AdminView: React.FC<AdminViewProps> = ({
  userInfo,
  communityInfo,
  friends,
  assignableRoles,
  activeSection,
  // Destructure loading/error states
  isLoadingUserInfo,
  userInfoError,
  isLoadingCommunityInfo,
  communityInfoError,
  isLoadingFriends,
  friendsError,
  // Remove JWT state destructuring
  // jwt,
  // isAuthenticating,
  authError,
}) => {
  const { toast } = useToast();
  const [editingWizardId, setEditingWizardId] = React.useState<string | null>(null);
  const { authFetch } = useAuthFetch();
  const queryClient = useQueryClient();
  const communityId = communityInfo?.id;

  // Instantiate the new role assignment hook
  const assignRoleMutation = useAssignRoleAndRefresh();

  // --- State for Community Settings --- 
  const [logoUrlInput, setLogoUrlInput] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [showLogoPreview, setShowLogoPreview] = useState<boolean>(false);

  // --- Data Fetching for Community Settings --- 
  const { data: settings, isLoading: isLoadingSettings, error: settingsError } = useQuery<CommunitySettings, Error>({
    queryKey: ['communitySettings', communityId],
    queryFn: async () => {
      const res = await fetch(`/api/community/settings?communityId=${communityId}`); // Use fetch directly for public GET
      if (!res.ok) {
        throw new Error('Failed to fetch community settings');
      }
      return res.json();
    },
    enabled: !!communityId && activeSection === 'account', // Only fetch when ID is available and section is active
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // --- Update state when settings are loaded --- 
  useEffect(() => {
    if (settings) {
      setLogoUrlInput(settings.logo_url ?? '');
      setShowLogoPreview(!!settings.logo_url); // Show preview if URL exists
      setInputError(null); // Clear error on successful load
    }
  }, [settings]);

  // --- Input Validation --- 
  const validateUrl = (url: string): boolean => {
    if (url === '' || url === null) {
      setInputError(null);
      return true; // Allow empty/null to clear
    }
    if (!url.startsWith('https://app.cg/')) {
      setInputError('URL must start with https://app.cg/');
      return false;
    }
    setInputError(null);
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setLogoUrlInput(newUrl);
    validateUrl(newUrl); // Validate on change
    setShowLogoPreview(newUrl.startsWith('https://app.cg/')); // Update preview visibility based on valid prefix
  };

  // --- Data Mutation for Community Settings --- 
  const { mutate: updateSettings, isPending: isUpdatingSettings } = useMutation<unknown, Error, { logo_url: string | null }>({
    mutationFn: async (payload) => {
      await authFetch('/api/community/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communitySettings', communityId] });
      queryClient.invalidateQueries({ queryKey: ['communityLogo', communityId] }); // Invalidate logo-specific query too
      toast({ title: "Settings saved successfully!" });
      setShowLogoPreview(!!variables.logo_url); // Ensure preview state matches saved state
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveSettings = () => {
    if (validateUrl(logoUrlInput)) {
      updateSettings({ logo_url: logoUrlInput.trim() === '' ? null : logoUrlInput });
    }
  };

  // Define the click handler locally using the new mutation hook
  const handleAssignRoleClickLocal = (roleId: string | undefined) => {
    if (!roleId) {
        console.error("Cannot assign undefined role ID");
        toast({ title: "Error", description: "Invalid role selected.", variant: "destructive" });
        return;
    }
    if (!userInfo?.id) {
        console.error("Cannot assign role, user ID not found");
        toast({ title: "Error", description: "User information not available.", variant: "destructive" });
        return;
    }
    // Call the mutate function from the centralized hook
    assignRoleMutation.mutate({ roleId, userId: userInfo.id }); 
  };

  // Render loading/error specifically for the data needed by the active section if desired
  // Or rely on the global loading state in PluginContainer

  // Display JWT auth errors if they occur
  if (authError) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-md border border-destructive">
        Error establishing backend session: {authError.message}
      </div>
    )
  }

  // Optionally show a loading state while authenticating
  // if (isAuthenticating) {
  //   return <div>Establishing session...</div>;
  // }

  return (
    <>
      {/* Section title with animation */}
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
        {activeSection === 'dashboard' && (
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          </div>
        )}
        {activeSection === 'config' && (
          <div className="flex items-center gap-2">
            <Cog className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Wizard Configuration</h1>
          </div>
        )}
        {activeSection === 'connections' && (
          <div className="flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Service Connections</h1>
          </div>
        )}
        {activeSection === 'account' && (
          <div className="flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
          </div>
        )}
      </div>
      
      {/* Render Dashboard content */}
      {activeSection === 'dashboard' && (
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Info Card */} 
          <Card className="md:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150" interactive>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle>Your Admin Profile</CardTitle>
                </div>
              </CardHeader>
              <CardContent className='flex flex-col gap-2.5 text-sm'>
                {isLoadingUserInfo ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : userInfoError ? (
                  <div className="text-destructive flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    <p>Error loading user data</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-1">
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
                    
                    <div className="flex items-center gap-2 mt-3 bg-primary/10 text-primary px-3 py-2 rounded-md">
                      <BadgeCheck className="h-4 w-4" />
                      <p className="font-medium">Admin Privileges Active</p>
                    </div>
                  </>
                )}
              </CardContent>
          </Card>

          {/* Friends list Card */} 
          {/* Only render if not loading and no error, and friends exist */}
          {!isLoadingFriends && !friendsError && friends && friends.friends.length > 0 && (
              <Card className="md:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300" interactive>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle>Your Community</CardTitle>
                  </div>
                </CardHeader>
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
              </Card>
            )}
            {isLoadingFriends && (
              <Card className="md:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle>Your Community</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className='flex items-center justify-center p-8'>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </CardContent>
              </Card>
            )}

            {/* Assignable roles Card */} 
            {/* Only render if not loading community info and roles exist */} 
            {!isLoadingCommunityInfo && !communityInfoError && assignableRoles && assignableRoles.length > 0 && (
              <Card className="md:col-span-2 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-450" interactive>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
                        <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
                        <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
                      </svg>
                    </div>
                    <div>
                      <CardTitle>Role Management</CardTitle>
                      <CardDescription className="mt-1">Assign roles to members</CardDescription>
                    </div>
                  </div>
                  {/* Use the mutation state from the new hook */}
                  {assignRoleMutation.isPending && (
                    <div className='text-blue-500 pt-2 flex items-center gap-2'>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      <p className="text-sm">Assigning role...</p>
                    </div>
                  )}
                  {/* Use the mutation state from the new hook */}
                  {assignRoleMutation.isError && (
                    <div className='text-destructive pt-2 flex items-center gap-2 p-2 bg-destructive/10 rounded-md'>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" x2="12" y1="8" y2="12"/>
                        <line x1="12" x2="12.01" y1="16" y2="16"/>
                      </svg>
                      {/* Use the mutation state from the new hook */}
                      <p className="text-sm">Error: {assignRoleMutation.error?.message ?? 'Failed to assign role'}</p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {assignableRoles?.map((role, index) => (
                    <div 
                      className='flex items-center justify-between p-3 rounded-md border border-border bg-card transition-all hover:bg-secondary/20' 
                      key={role.id}
                      style={{ animationDelay: `${450 + (index * 50)}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground">
                          {role.title.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{role.title}</p>
                          <p className="text-xs text-muted-foreground">ID: {role.id.substring(0, 6)}...</p>
                        </div>
                      </div>
                      {userInfo?.roles?.includes(role.id) ? (
                        <div className='text-xs flex items-center gap-1.5 text-primary px-2.5 py-1.5 border-primary/20 border rounded-md bg-primary/10'>
                          <BadgeCheck className="h-3.5 w-3.5" />
                          <span>Assigned</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignRoleClickLocal(role.id)}
                          disabled={assignRoleMutation.isPending}
                          className="transition-all duration-200"
                        >
                          Assign Role
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
             {isLoadingCommunityInfo && (
              <Card className="md:col-span-2 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-450">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
                        <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
                        <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
                      </svg>
                    </div>
                    <CardTitle>Role Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className='flex items-center justify-center p-12'>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </CardContent>
              </Card>
            )}
        </div>
      )}

      {/* Render Configuration Section */}
      {activeSection === 'config' && (
        <div className="w-full max-w-4xl mx-auto px-1 sm:px-2 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150">
           <div className="sm:rounded-xl sm:border sm:bg-card sm:shadow-sm sm:p-6 sm:transition-all">
               <div className="flex flex-row items-center justify-between px-1 sm:px-0 pb-2 sm:pb-6">
                   <div>
                     <h2 className="text-xl font-semibold leading-none tracking-tight">Wizard Configuration</h2>
                     <p className="text-sm text-muted-foreground mt-2 text-balance">Setup roles and steps for the onboarding wizard here.</p>
                   </div>
                   <NewWizardButton assignableRoles={assignableRoles} />
               </div>
               <div className="px-1 sm:px-0 pt-2 sm:pt-0">
                 {/* Pass assignableRoles to WizardList */}
                 <WizardList setEditingWizardId={setEditingWizardId} assignableRoles={assignableRoles} />
               </div>
           </div>
         </div>
      )}

      {/* Render Connections Section */}
      {activeSection === 'connections' && (
        <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150">
           <Card interactive>
               <CardHeader>
                   <CardTitle>Service Connections</CardTitle>
                   <CardDescription>Connect third-party services (Discord, Telegram, Guild.xyz, etc.) to use in your wizard.</CardDescription>
               </CardHeader>
               <CardContent>
                   <div className="flex items-center justify-center p-12 text-muted-foreground border border-dashed border-border rounded-md">
                     <div className="text-center">
                       <Plug className="h-8 w-8 mx-auto mb-3 opacity-50" />
                       <p>Connection UI coming soon...</p>
                     </div>
                   </div>
               </CardContent>
           </Card>
         </div>
      )}

      {/* Render Account Settings Section */}
      {activeSection === 'account' && (
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
          {/* Community Info Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Community Settings</CardTitle>
              <CardDescription>Manage basic community details and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSettings && <p>Loading settings...</p>}
              {settingsError && <p className="text-destructive">Error loading settings: {settingsError.message}</p>}
              {!isLoadingSettings && !settingsError && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="community-logo-url">Community Logo URL</Label>
                    <Input 
                      id="community-logo-url" 
                      placeholder="https://app.cg/path/to/your/logo.png" 
                      value={logoUrlInput}
                      onChange={handleInputChange}
                      disabled={isUpdatingSettings}
                    />
                    {inputError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5"/> 
                        {inputError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Logo must be hosted on app.cg domain (e.g., uploaded via Common Ground).
                    </p>
                  </div>

                  {showLogoPreview && logoUrlInput && (
                    <div className="space-y-1.5">
                       <Label>Logo Preview</Label>
                       <div className="relative p-4 border rounded-md flex items-center justify-center bg-muted/40 h-32">
                         <Image 
                           src={logoUrlInput} 
                           alt="Community Logo Preview" 
                           fill={true}
                           className="object-contain"
                         />
                       </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveSettings} 
                      disabled={isUpdatingSettings || !!inputError || logoUrlInput === (settings?.logo_url ?? '')}
                    >
                      {isUpdatingSettings ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan & Billing Card (potentially spanning full width if only two cols, or keep alongside usage) */}
          <BillingManagementSection communityId={communityInfo?.id} />

          {/* Plan Usage Card (Spanning full width below settings/billing) */}
          <QuotaUsageDisplay className="md:col-span-2" /> 
        </div>
      )}

      {editingWizardId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full relative">
            <button
              className="absolute top-2 right-2 text-xl p-2 rounded hover:bg-muted"
              onClick={() => setEditingWizardId(null)}
              aria-label="Close step editor"
            >
              ×
            </button>
            <WizardStepEditorPage wizardId={editingWizardId} assignableRoles={assignableRoles} />
          </div>
        </div>
      )}
    </>
  );
};
