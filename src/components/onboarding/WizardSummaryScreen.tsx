'use client';

import React from 'react';
import { CheckCircle, Award, User /*, Shield*/ } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery';
// import { UserAvatar } from '@/components/UserAvatar';
import type { UserCredential } from '@/hooks/useUserCredentialsQuery';
import type { UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { useAssignRoleAndRefresh } from '@/hooks/useAssignRoleAndRefresh';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from "@/components/ui/skeleton";

interface WizardSummaryScreenProps {
  // wizardId: string; // Comment out unused prop
  completedSteps: (UserStepProgress & { stepType?: StepType })[];
  credentials: UserCredential[];
  allCredentials: UserCredential[];
  rolesGranted: { id: string; name: string }[];
  userInfo: UserInfoResponsePayload | undefined;
  isLoadingRoles: boolean;
  onClose: () => void;
}

export const WizardSummaryScreen: React.FC<WizardSummaryScreenProps> = ({
  // wizardId, // Comment out unused prop
  completedSteps,
  credentials,
  allCredentials,
  rolesGranted,
  userInfo,
  isLoadingRoles,
  onClose
}) => {
  // Filter additional credentials that aren't already shown in the credentials section
  const additionalCredentials = React.useMemo(() => {
    if (!credentials.length) return allCredentials;
    
    return allCredentials.filter(allCred => 
      !credentials.some(cred => 
        cred.platform === allCred.platform && 
        (cred.username === allCred.username || cred.username === allCred.external_id)
      )
    );
  }, [credentials, allCredentials]);

  // Find user ID for the assignment hook
  const userId = userInfo?.id;
  const userRoles = userInfo?.roles ?? [];

  // Instantiate the role assignment hook
  const assignRoleMutation = useAssignRoleAndRefresh();

  // TODO: Add claim button logic

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Summary Header */}
      <div className="text-center p-6 border-b">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-green-100/30 blur-2xl rounded-full w-20 h-20 -z-10 mx-auto" />
          <CheckCircle className="h-16 w-16 text-green-500/90" />
        </div>
        <h1 className="text-2xl font-semibold">Wizard Completed!</h1>
        <p className="text-gray-500 mt-1">
          You&apos;ve successfully completed all required steps.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-8">
        {/* Completed Steps */}
        <section>
          <h2 className="text-xl font-medium flex items-center mb-4">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            Completed Steps
          </h2>
          <div className="space-y-3">
            {completedSteps.map((step) => (
              <div key={step.id} className="bg-card/80 dark:bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium">{step.stepType?.name.replace(/_/g, ' ') || 'Step'}</h3>
                    {step.verified_data && (
                      <p className="text-sm text-gray-500 mt-1">
                        {renderVerifiedData(step)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Credentials Earned */}
        {credentials.length > 0 && (
          <section>
            <h2 className="text-xl font-medium flex items-center mb-4">
              <User className="mr-2 h-5 w-5 text-blue-500" />
              Credentials Verified
            </h2>
            <div className="space-y-3">
              {credentials.map((cred, index) => (
                <div key={index} className="bg-card/80 dark:bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20 dark:border-blue-500/30">
                  <div className="flex items-center">
                    <div className="mr-3 h-8 w-8 bg-muted/50 dark:bg-muted/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{cred.platform.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-medium">{formatPlatformName(cred.platform)}</h3>
                      <p className="text-sm text-gray-500">{cred.username || cred.platform}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Roles Granted / Earned Section */}
        {(rolesGranted.length > 0 || isLoadingRoles) && (
          <section>
            <h2 className="text-xl font-medium flex items-center mb-4">
              <Award className="mr-2 h-5 w-5 text-blue-500" />
              Roles Earned
            </h2>
            <div className="space-y-3">
              {isLoadingRoles ? (
                <>
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </>
              ) : rolesGranted.length > 0 ? (
                  rolesGranted.map((role) => {
                    const alreadyHasRole = userRoles.includes(role.id);
                    return (
                      <div 
                        key={role.id} 
                        className={cn(
                          "bg-card/80 dark:bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border flex justify-between items-center",
                          alreadyHasRole ? "opacity-70" : ""
                        )}
                      >
                        <div className="flex items-center gap-3">
                            <Award className="h-5 w-5 text-blue-400"/>
                            <span className="font-medium">{role.name}</span>
                        </div>
                        {alreadyHasRole ? (
                            <Badge variant="outline" className="text-xs border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">
                                Claimed
                            </Badge>
                        ) : (
                            <Button 
                                size="sm" 
                                onClick={() => {
                                    if (userId) {
                                        assignRoleMutation.mutate({ roleId: role.id, userId: userId });
                                    } else {
                                        console.error('Cannot claim role: User ID not found.');
                                    }
                                }}
                                disabled={assignRoleMutation.isPending}
                            >
                               {assignRoleMutation.isPending ? 'Claiming...' : 'Claim Role'}
                            </Button>
                        )}
                      </div>
                    );
                  })
              ) : (
                 null 
              )}
            </div>
          </section>
        )}

        {/* Only show additional credentials if there are any beyond what's shown in Credentials Verified */}
        {additionalCredentials.length > 0 && (
          <section>
            <h2 className="text-xl font-medium flex items-center mb-4">
              <User className="mr-2 h-5 w-5 text-gray-500" />
              All Your Credentials
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {additionalCredentials.map((cred, index) => (
                <div key={index} className="bg-card/50 dark:bg-card/30 backdrop-blur-sm rounded-lg p-3 border border-border">
                  <div className="flex items-center">
                    <div className="mr-2 h-6 w-6 bg-muted/50 dark:bg-muted/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-muted-foreground text-xs font-medium">{cred.platform.charAt(0)}</span>
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-medium text-sm">{formatPlatformName(cred.platform)}</h3>
                      <p className="text-xs text-gray-500 truncate">{cred.username || cred.external_id || cred.platform}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t text-center">
        <Button 
          onClick={onClose} 
          className="bg-green-600 hover:bg-green-700 px-8 py-2 h-12"
        >
          Finish
        </Button>
      </div>
    </div>
  );
};

// Helper functions
const renderVerifiedData = (step: UserStepProgress) => {
  if (!step.verified_data) return 'Completed';
  
  if (step.verified_data.ensName) {
    return `ENS Name: ${step.verified_data.ensName}`;
  }
  
  if (step.verified_data.discordUsername) {
    return `Discord: ${step.verified_data.discordUsername}`;
  }
  
  if (step.verified_data.telegramUsername) {
    return `Telegram: ${step.verified_data.telegramUsername}`;
  }
  
  return 'Verified';
};

const formatPlatformName = (platform: string) => {
  switch (platform.toUpperCase()) {
    case 'ENS':
      return 'Ethereum Name Service';
    case 'DISCORD':
      return 'Discord';
    case 'TELEGRAM':
      return 'Telegram';
    default:
      return platform;
  }
}; 