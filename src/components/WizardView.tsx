'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wand2, CheckCircle, Loader2, AlertCircle, CirclePlay, CircleCheck } from 'lucide-react';
import { useUserWizardsQuery } from '@/hooks/useUserWizardsQuery';
import { useWizardSlideshow } from '@/context/WizardSlideshowContext';

// Define props - currently none needed, but keep interface for consistency
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WizardViewProps {}

export const WizardView: React.FC<WizardViewProps> = () => {
  const { data: wizardsData, isLoading, error } = useUserWizardsQuery();
  const { setActiveSlideshowWizardId } = useWizardSlideshow();

  // Memoize filtered lists
  const availableWizards = React.useMemo(() => {
    return wizardsData?.wizards.filter(w => w.progressStatus === 'not_started' || w.progressStatus === 'started') ?? [];
  }, [wizardsData]);

  const completedWizards = React.useMemo(() => {
    return wizardsData?.wizards.filter(w => w.progressStatus === 'completed') ?? [];
  }, [wizardsData]);

  // Handle Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center pt-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading wizards...</p>
      </div>
    );
  }

  // Handle Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center pt-12 text-destructive">
        <AlertCircle className="h-8 w-8 mb-4" />
        <p className="font-medium">Error loading wizards</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <>
      {/* Section title */}
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Onboarding Wizards</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Complete wizards to gain roles and access within the community.
        </p>
      </div>

      {/* Main content grid */}
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Available Wizards Card (Includes Not Started and Started) */}
        <Card className="animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150" interactive>
          <CardHeader>
            <CardTitle>Available Wizards</CardTitle>
            <CardDescription>Start or continue these wizards to progress.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableWizards.length > 0 ? (
              availableWizards.map((wizard, index) => (
                <div 
                  key={wizard.id} 
                  className='flex items-center justify-between p-3 rounded-md border border-border bg-card transition-all hover:bg-secondary/20 cursor-pointer'
                  style={{ animationDelay: `${150 + (index * 50)}ms` }}
                  onClick={() => setActiveSlideshowWizardId(wizard.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-accent-foreground ${wizard.progressStatus === 'started' ? 'bg-blue-500/10 text-blue-600' : 'bg-accent'}`}>
                      {wizard.progressStatus === 'started' ? <CirclePlay className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{wizard.name}</p>
                      <p className="text-xs text-muted-foreground">{wizard.description || 'No description available.'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2"> 
                    {wizard.progressStatus === 'started' ? (
                       <span className="text-xs font-medium text-blue-600">Continue</span>
                    ) : (
                       <span className="text-xs font-medium text-primary">Start</span>
                    )}
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div> 
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center">No available wizards at this time.</p>
            )}
          </CardContent>
        </Card>

        {/* Completed Wizards Card */}
        <Card className="animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300" interactive>
          <CardHeader>
            <CardTitle>Completed Wizards</CardTitle>
            <CardDescription>You have successfully completed these wizards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedWizards.length > 0 ? (
              completedWizards.map((wizard, index) => (
                <div 
                  key={wizard.id} 
                  className='flex items-center justify-between p-3 rounded-md border border-border bg-card/50 opacity-70 cursor-default'
                  style={{ animationDelay: `${300 + (index * 50)}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                      <CircleCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{wizard.name}</p>
                      <p className="text-xs text-muted-foreground">{wizard.description || 'No description available.'}</p>
                    </div>
                  </div>
                  {/* Indicator for completion */}
                   <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center">You haven&apos;t completed any wizards yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}; 