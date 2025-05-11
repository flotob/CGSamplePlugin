'use client';

import React from 'react';
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery'; // Assuming StepType is exported from here
import { ShieldCheck, Link2, /*Info,*/ AlertTriangle, CheckCircle2 } from 'lucide-react'; // Removed Info

// Assuming a Role type definition similar to what WizardSlideshowModal might use
interface Role {
  id: string;
  title: string;
  // Add other role properties if available and needed
}

interface StepInfoDisplayProps {
  currentStep?: UserStepProgress;
  currentStepType?: StepType;
  communityRoles?: Role[];
  assignRolesPerStep?: boolean;
}

export const StepInfoDisplay: React.FC<StepInfoDisplayProps> = ({
  currentStep,
  currentStepType,
  communityRoles,
  assignRolesPerStep,
}) => {
  if (!currentStep) {
    return (
      <div className="p-3 text-sm border-t border-border/50 text-muted-foreground">
        Loading step information...
      </div>
    ); 
  }

  const earnableRoleId = currentStep.target_role_id; // Role ID is always on currentStep if targeted
  const earnableRole = earnableRoleId && communityRoles 
    ? communityRoles.find(role => role.id === earnableRoleId)
    : null;

  const requiresCredentials = currentStepType?.requires_credentials;
  // Heuristic to get platform name from step type label or name for a slightly better message
  let platformHint = '';
  if (requiresCredentials && currentStepType) {
    const typeNameLower = currentStepType.name.toLowerCase();
    const typeLabelLower = currentStepType.label?.toLowerCase() || '';
    if (typeNameLower.includes('discord') || typeLabelLower.includes('discord')) platformHint = 'Discord';
    else if (typeNameLower.includes('telegram') || typeLabelLower.includes('telegram')) platformHint = 'Telegram';
    else if (typeNameLower.includes('twitter') || typeLabelLower.includes('twitter')) platformHint = 'Twitter/X';
    else if (typeNameLower.includes('github') || typeLabelLower.includes('github')) platformHint = 'GitHub';
    else if (typeNameLower.includes('ens') || typeLabelLower.includes('ens')) platformHint = 'ENS';
    // Add more heuristics as needed
  }

  return (
    <div className="p-3 text-sm border-t border-border/50 space-y-3">
      {/* Earnable Role Section */}
      {earnableRole && (
        <div className="p-2.5 rounded-md bg-primary/10">
          <div className="flex items-center">
            <ShieldCheck className="h-5 w-5 mr-2 flex-shrink-0 text-primary" />
            <span className="font-semibold text-xs text-primary">Role Opportunity</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Completing this step contributes towards earning the <span className="font-medium text-foreground">{earnableRole.title}</span> role.
            It will be {assignRolesPerStep ? "granted after completing this step." : "granted after completing the entire wizard."}
          </p>
        </div>
      )}

      {/* Account Linking Section */}
      {requiresCredentials && (
        <div className="p-2.5 rounded-md bg-accent">
          <div className="flex items-center">
            <Link2 className="h-5 w-5 mr-2 flex-shrink-0 text-accent-foreground/80" />
            <span className="font-semibold text-xs text-accent-foreground">Account Linking</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {platformHint 
              ? `Requires a linked ${platformHint} account.` 
              : 'This step requires a linked account.'}
          </p>
        </div>
      )}
      
      {/* Step Status Section (Mandatory/Optional) */}
      <div className={`p-2.5 rounded-md ${!earnableRole && !requiresCredentials ? 'bg-muted' : 'border border-transparent'}`}> 
        <div className="flex items-center">
          {currentStep.is_mandatory
            ? <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 text-amber-500" />
            : <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0 text-green-500" />
          }
          <span className="font-semibold text-xs text-foreground">
            Step Requirement
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          This step is {currentStep.is_mandatory ? 
            <span className="font-medium text-amber-600 dark:text-amber-400">Mandatory</span> : 
            <span className="font-medium text-green-600 dark:text-green-400">Optional</span>}. 
          {!earnableRole && !requiresCredentials && (
            <span className="italic">No specific role or account linking.</span>
          )}
        </p>
      </div>
    </div>
  );
}; 