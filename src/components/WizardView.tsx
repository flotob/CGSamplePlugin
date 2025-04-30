'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wand2, CheckCircle } from 'lucide-react';

// Define props - adjust later as needed when data is available
interface WizardViewProps {
  // Props will be added here later, e.g., list of wizards
}

export const WizardView: React.FC<WizardViewProps> = ({ /* props */ }) => {

  // Placeholder data structure (replace with actual data later)
  const availableWizards = [
    { id: 'wiz1', title: 'Community Welcome Wizard', description: 'Get started with the basics.' },
    { id: 'wiz2', title: 'Developer Onboarding', description: 'Setup your dev environment.' },
  ];
  const completedWizards = [
    { id: 'wiz0', title: 'Account Verification', description: 'Identity confirmed.' },
  ];

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
        {/* Available Wizards Card */}
        <Card className="animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150" interactive>
          <CardHeader>
            <CardTitle>Available Wizards</CardTitle>
            <CardDescription>Start these wizards to progress in the community.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableWizards.length > 0 ? (
              availableWizards.map((wizard, index) => (
                <div 
                  key={wizard.id} 
                  className='flex items-center justify-between p-3 rounded-md border border-border bg-card transition-all hover:bg-secondary/20 cursor-pointer'
                  style={{ animationDelay: `${150 + (index * 50)}ms` }}
                  onClick={() => console.log(`Start wizard: ${wizard.id}`)} // Placeholder action
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground">
                      <Wand2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{wizard.title}</p>
                      <p className="text-xs text-muted-foreground">{wizard.description}</p>
                    </div>
                  </div>
                  {/* Add a start button or indicator */} 
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
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
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{wizard.title}</p>
                      <p className="text-xs text-muted-foreground">{wizard.description}</p>
                    </div>
                  </div>
                  {/* Indicator for completion */} 
                   <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center">You haven't completed any wizards yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}; 