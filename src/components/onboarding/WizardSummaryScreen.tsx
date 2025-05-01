'use client';

import React from 'react';
import { CheckCircle, Award, User, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { UserStepProgress } from '@/app/api/user/wizards/[wizardId]/steps/route';
import type { StepType } from '@/hooks/useStepTypesQuery';

interface WizardSummaryScreenProps {
  wizardId: string;
  completedSteps: (UserStepProgress & { stepType?: StepType })[];
  credentials: { platform: string; username: string | null }[];
  allCredentials: { 
    platform: string; 
    username: string | null;
    external_id?: string; 
  }[];
  rolesGranted: { id: string; name: string }[];
  onClose: () => void;
}

export const WizardSummaryScreen: React.FC<WizardSummaryScreenProps> = ({
  wizardId,
  completedSteps,
  credentials,
  allCredentials,
  rolesGranted,
  onClose
}) => {
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
          You've successfully completed all required steps.
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
              <div key={step.id} className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
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
                <div key={index} className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center">
                    <div className="mr-3 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-medium">{cred.platform.charAt(0)}</span>
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

        {/* Roles Granted */}
        {rolesGranted.length > 0 && (
          <section>
            <h2 className="text-xl font-medium flex items-center mb-4">
              <Shield className="mr-2 h-5 w-5 text-purple-500" />
              Roles Granted
            </h2>
            <div className="space-y-3">
              {rolesGranted.map((role) => (
                <div key={role.id} className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium">{role.name}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Your Credentials */}
        {allCredentials.length > 0 && (
          <section>
            <h2 className="text-xl font-medium flex items-center mb-4">
              <User className="mr-2 h-5 w-5 text-gray-500" />
              All Your Credentials
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allCredentials.map((cred, index) => (
                <div key={index} className="bg-white/30 backdrop-blur-sm rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center">
                    <div className="mr-2 h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-700 text-xs font-medium">{cred.platform.charAt(0)}</span>
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