'use client';

import React from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import type { Wizard } from '@/hooks/useWizardsQuery'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Loader2, Star } from 'lucide-react';

// Define expected props
interface HeroToggleButtonProps {
  wizard: Wizard;
  disabled: boolean; // Is any mutation running?
  mutation: UseMutationResult<
    { wizard: Wizard, message?: string }, // Success type
    Error,                              // Error type
    { wizardId: string, targetState: boolean }, // Variables type
    unknown                             // Context type
  >;
}

export const HeroToggleButton: React.FC<HeroToggleButtonProps> = ({ 
  wizard, 
  disabled, 
  mutation 
}) => {

  // Don't render the button at all if the wizard is not active
  if (!wizard.is_active) {
    return null;
  }

  // Render based on current hero status
  if (!wizard.is_hero) {
    // --- Render Button to SET as Hero --- 
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => mutation.mutate({ wizardId: wizard.id, targetState: true })}
              disabled={disabled} // Disable if any parent mutation is running
              className="h-8 px-3 text-xs">
              {mutation.isPending && mutation.variables?.wizardId === wizard.id ? // Show loader only for this wizard
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : 
                  <Star className="mr-1.5 h-3.5 w-3.5"/> // Outline star
              }
              Hero
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
              <p>Set as the primary wizard for new users</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  } else {
    // --- Render Button to UNSET as Hero --- 
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => mutation.mutate({ wizardId: wizard.id, targetState: false })}
              disabled={disabled} // Disable if any parent mutation is running
              className="h-8 px-3 text-xs border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20">
              {mutation.isPending && mutation.variables?.wizardId === wizard.id ? // Show loader only for this wizard
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : 
                  <Star className="mr-1.5 h-3.5 w-3.5 fill-current"/> // Filled star
              }
              Hero
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
              <p>Click to remove Hero status</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
}; 