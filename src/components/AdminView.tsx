'use client';

import React from 'react';
// Removed Image import
// Shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
// Payload types
import type { CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
// Icons
import { Shield, BadgeCheck, Cog, Plug, Building } from 'lucide-react';
import { WizardStepEditorPage } from './onboarding/WizardStepEditorPage';
import { WizardList } from './onboarding/WizardList';
import { NewWizardButton } from './onboarding/NewWizardButton';
// Hooks & Libs
import { QuotaUsageDisplay } from './admin/QuotaUsageDisplay';
import { DashboardStatsSection } from './admin/DashboardStatsSection';
import { useAssignRoleAndRefresh } from '@/hooks/useAssignRoleAndRefresh';

// Define Role type based on CommunityInfoResponsePayload for clarity
type CommunityRole = NonNullable<CommunityInfoResponsePayload['roles']>[number];

// Define props expected from PluginContainer
interface AdminViewProps {
  userInfo: UserInfoResponsePayload | undefined;
  communityInfo: CommunityInfoResponsePayload | undefined;
  pluginControlledDisplayRoles: CommunityRole[] | undefined;
  otherDisplayRoles: CommunityRole[] | undefined;
  selectableRolesForWizardConfig: CommunityRole[] | undefined;
  activeSection: string; // Receive activeSection prop
  isLoadingCommunityInfo: boolean;
  communityInfoError: Error | null;
  authError: Error | null;
}

export const AdminView: React.FC<AdminViewProps> = ({
  userInfo,
  communityInfo,
  pluginControlledDisplayRoles,
  otherDisplayRoles,
  selectableRolesForWizardConfig,
  activeSection,
  isLoadingCommunityInfo,
  communityInfoError,
  authError,
}) => {
  const { toast } = useToast();
  const [editingWizardId, setEditingWizardId] = React.useState<string | null>(null);

  const assignRoleMutation = useAssignRoleAndRefresh();

  // Display JWT auth errors if they occur
  if (authError) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-md border border-destructive">
        Error establishing backend session: {authError.message}
      </div>
    )
  }

  const renderRoleItem = (role: CommunityRole, isFromPluginControlledGroup: boolean) => {
    const isAssignedToCurrentUser = userInfo?.roles?.includes(role.id);
    let isPluginManuallyAssignable = false;
    let itemDisabledClass = '';
    let buttonDisabled = assignRoleMutation.isPending;

    if (!isAssignedToCurrentUser) {
      if (isFromPluginControlledGroup) {
        // For plugin-controlled roles, only CUSTOM_MANUAL_ASSIGN are truly clickable by admin in this UI
        // (or PREDEFINED Public, if it weren't ignored - though it's filtered out before reaching here usually)
        // CUSTOM_AUTO_ASSIGN roles in this group will appear but be disabled by this check.
        isPluginManuallyAssignable = (role.type === 'CUSTOM_MANUAL_ASSIGN') || 
                                     (role.type === 'PREDEFINED' && role.title === 'Public'); 
        if (!isPluginManuallyAssignable) {
          itemDisabledClass = 'opacity-60 cursor-not-allowed';
          buttonDisabled = true;
        }
      } else {
        // Roles in "Other Community Roles" group are always visually/functionally disabled for assignment via this UI
        itemDisabledClass = 'opacity-60 cursor-not-allowed';
        buttonDisabled = true;
      }
    }

    return (
      <div 
        className={`flex items-center justify-between p-3 rounded-md border border-border bg-card transition-all hover:bg-secondary/20 ${itemDisabledClass}`}
        key={role.id}
      >
        <div className={`flex items-center gap-3 ${itemDisabledClass ? 'opacity-80' : ''}`}>
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground">
            {role.title.charAt(0)}
          </div>
          <div>
            <p className="font-medium">{role.title}</p>
            <p className="text-xs text-muted-foreground">ID: {role.id.substring(0, 6)}...</p>
            <p className="text-xs text-muted-foreground">Type: {role.type}</p> {/* Show type for clarity */}
          </div>
        </div>
        {isAssignedToCurrentUser ? (
          <div className='text-xs flex items-center gap-1.5 text-primary px-2.5 py-1.5 border-primary/20 border rounded-md bg-primary/10'>
            <BadgeCheck className="h-3.5 w-3.5" />
            <span>Assigned</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (userInfo && userInfo.id) {
                assignRoleMutation.mutate({ roleId: role.id, userId: userInfo.id });
              } else {
                toast({
                  title: "Error",
                  description: "User information not available to assign role.",
                  variant: "destructive",
                });
              }
            }}
            disabled={buttonDisabled}
            className="transition-all duration-200"
          >
            Assign Role
          </Button>
        )}
      </div>
    );
  };

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

          {/* Role Management Card - Updated structure */}
          {(!isLoadingCommunityInfo && !communityInfoError) && 
           ( (pluginControlledDisplayRoles && pluginControlledDisplayRoles.length > 0) || 
             (otherDisplayRoles && otherDisplayRoles.length > 0) ) && (
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
                    <CardDescription className="mt-1">Assign or view community roles.</CardDescription>
                  </div>
                </div>
                {assignRoleMutation.isPending && (
                  <div className='text-blue-500 pt-2 flex items-center gap-2'>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <p className="text-sm">Assigning role...</p>
                  </div>
                )}
                {assignRoleMutation.error && (
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
              <CardContent className='space-y-4'> {/* Use space-y for separation between groups */}
                {pluginControlledDisplayRoles && pluginControlledDisplayRoles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground px-1">Plugin Assignable Roles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pluginControlledDisplayRoles.map((role) => renderRoleItem(role, true))}
                    </div>
                  </div>
                )}
                {otherDisplayRoles && otherDisplayRoles.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-border mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground px-1">Other Community Roles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {otherDisplayRoles.map((role) => renderRoleItem(role, false))}
                    </div>
                  </div>
                )}
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
                   <NewWizardButton assignableRoles={selectableRolesForWizardConfig} />
               </div>
               <div className="px-1 sm:px-0 pt-2 sm:pt-0">
                 <WizardList setEditingWizardId={setEditingWizardId} assignableRoles={selectableRolesForWizardConfig} />
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

          {/* BillingManagementSection was here. QuotaUsageDisplay now handles billing and should span both columns if it's the primary content for account settings, or adjust layout as needed. */}
          {/* For now, assuming QuotaUsageDisplay will be the main component here. If it needs to be single column, it would need internal adjustment or a different parent grid structure. */}
          <QuotaUsageDisplay className="md:col-span-2" /> 

          {/* If QuotaUsageDisplay handles ALL billing and usage, this second instance might be redundant or need to be a different component. */}
          {/* For now, I am assuming the QuotaUsageDisplay above replaces the old BillingManagementSection AND the old QuotaUsageDisplay in this spot. */}
          {/* If there was another QuotaUsageDisplay instance intended for other purposes, that needs clarification. */}
          {/* Based on the request, it seems one consolidated component is desired. */}
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
              assignableRoles={selectableRolesForWizardConfig} 
              onClose={() => setEditingWizardId(null)}
            />
          </div>
        </div>
      )}
    </>
  );
};
