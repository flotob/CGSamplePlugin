'use client';

import React, { useState, useEffect } from 'react';
// Removed Image import
// Shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
// Payload types
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
// Icons
import { Shield, BadgeCheck, Cog, Plug, Building, AlertCircle } from 'lucide-react';
import { WizardStepEditorPage } from './onboarding/WizardStepEditorPage';
import { WizardList } from './onboarding/WizardList';
import { NewWizardButton } from './onboarding/NewWizardButton';
// Hooks & Libs
import { BillingManagementSection } from './billing/BillingManagementSection';
import { QuotaUsageDisplay } from './admin/QuotaUsageDisplay';
import { DashboardStatsSection } from './admin/DashboardStatsSection';
import { useAssignRoleAndRefresh } from '@/hooks/useAssignRoleAndRefresh';

// Define props expected from PluginContainer
interface AdminViewProps {
  userInfo: UserInfoResponsePayload | undefined;
  communityInfo: CommunityInfoResponsePayload | undefined;
  assignableRoles: CommunityInfoResponsePayload['roles'] | undefined;
  activeSection: string; // Receive activeSection prop
  // Add loading/error props for specific data if needed
  isLoadingCommunityInfo: boolean;
  communityInfoError: Error | null;
  // Remove JWT state props that are unused
  // jwt: string | null;
  // isAuthenticating: boolean;
  authError: Error | null;
}

export const AdminView: React.FC<AdminViewProps> = ({
  userInfo,
  communityInfo,
  assignableRoles,
  activeSection,
  // Destructure loading/error states
  isLoadingCommunityInfo,
  communityInfoError,
  // Remove JWT state destructuring
  // jwt,
  // isAuthenticating,
  authError,
}) => {
  const { toast } = useToast();
  const [editingWizardId, setEditingWizardId] = React.useState<string | null>(null);
  const communityId = communityInfo?.id;

  // Instantiate the new role assignment hook
  const assignRoleMutation = useAssignRoleAndRefresh();

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
          <DashboardStatsSection className="md:col-span-2 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150" />

          {/* KEEP QuotaUsageDisplay */}
          <QuotaUsageDisplay className="md:col-span-2 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300" />

          {/* Role Management Card - Ensure this remains */}
          {!isLoadingCommunityInfo && !communityInfoError && assignableRoles && assignableRoles.length > 0 && (
            <Card className="md:col-span-2 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-600" interactive>
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
                {assignRoleMutation.isPending && (
                  <div className='text-blue-500 pt-2 flex items-center gap-2'>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <p className="text-sm">Assigning role...</p>
                  </div>
                )}
                {assignRoleMutation.isError && (
                  <div className='text-destructive pt-2 flex items-center gap-2 p-2 bg-destructive/10 rounded-md'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" x2="12" y1="8" y2="12"/>
                      <line x1="12" x2="12.01" y1="16" y2="16"/>
                    </svg>
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
            <Card className="md:col-span-2 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-600">
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
          {/* Community Info Card has been removed */}

          {/* BillingManagementSection will now be the first item in this grid section. 
              It will naturally take up one column on medium screens due to md:grid-cols-2 on the parent. 
              If it should span both columns, it would need internal styling or its own col-span prop if supported.
              The QuotaUsageDisplay below is md:col-span-2, so it will take the full width underneath.
          */}
          <BillingManagementSection communityId={communityInfo?.id} />

          <QuotaUsageDisplay className="md:col-span-2" /> 
        </div>
      )}

      {editingWizardId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-5xl w-full relative">
            {/* Close button - updated visibility and mobile friendliness */}
            <button
              className="absolute top-3 right-3 z-50 text-lg p-2.5 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-muted text-foreground flex items-center justify-center"
              onClick={() => setEditingWizardId(null)}
              aria-label="Close step editor"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
            <WizardStepEditorPage 
              wizardId={editingWizardId} 
              assignableRoles={assignableRoles} 
              onClose={() => setEditingWizardId(null)}
            />
          </div>
        </div>
      )}
    </>
  );
};
