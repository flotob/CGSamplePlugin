'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWizardsQuery } from '@/hooks/useWizardsQuery'; // Assuming this hook exists

// WizardList component for listing wizards
export const WizardList: React.FC<{ setEditingWizardId: (id: string) => void }> = ({ setEditingWizardId }) => {
  const { data, isLoading, error } = useWizardsQuery();

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading wizards...</div>;
  }
  if (error) {
    return <div className="text-destructive p-4 bg-destructive/10 rounded-md">Error loading wizards: {error.message}</div>;
  }
  if (!data || data.wizards.length === 0) {
    return <div className="text-muted-foreground p-8 text-center">No onboarding wizards found for this community.</div>;
  }
  return (
    <div className="space-y-4">
      {data.wizards.map((wizard) => (
        <Card
          key={wizard.id}
          className="border border-border cursor-pointer hover:bg-accent transition"
          onClick={() => setEditingWizardId(wizard.id)}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{wizard.name}</CardTitle>
              <CardDescription>{wizard.description || <span className="italic text-muted-foreground">No description</span>}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${wizard.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{wizard.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}; 