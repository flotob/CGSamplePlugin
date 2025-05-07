'use client';

import React from 'react';
import { useWizardsQuery } from '@/hooks/useWizardsQuery';
import { WizardListItem } from './WizardListItem';
import { Separator } from "@/components/ui/separator";
import { FileTextIcon, Loader2 } from 'lucide-react';
import { NewWizardButton } from './NewWizardButton';
import type { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';

// Define Role type (can be shared or imported if defined elsewhere)
// Assuming structure from CommunityInfoResponsePayload
type Role = NonNullable<CommunityInfoResponsePayload['roles']>[number];

// Update props for WizardList
interface WizardListProps {
  setEditingWizardId: (id: string) => void;
  assignableRoles: Role[] | undefined; // Accept roles
}

// WizardList component for listing wizards
export const WizardList: React.FC<WizardListProps> = ({ 
  setEditingWizardId, 
  assignableRoles // Destructure roles
}) => {
  const { data, isLoading, error } = useWizardsQuery();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground/80 space-x-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading wizards...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-md border border-destructive/20 shadow-sm">
        Error loading wizards: {error.message}
      </div>
    );
  }
  
  if (!data || data.wizards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground/80 space-y-3 bg-muted/30 rounded-lg border border-border/50">
        <FileTextIcon className="h-10 w-10 opacity-40" />
        <div className="text-center">
          <p className="text-base">No onboarding wizards found</p>
          <p className="text-sm mt-1">Create one to get started!</p>
        </div>
        <div className="mt-4">
          <NewWizardButton assignableRoles={assignableRoles} />
        </div>
      </div>
    );
  }

  // Separate wizards into published and unpublished (drafts)
  const publishedWizards = data.wizards.filter(w => w.is_active);
  const unpublishedWizards = data.wizards.filter(w => !w.is_active);

  return (
    <div className="space-y-8">
      {/* Unpublished (Draft) Wizards Section */}
      <section className="sm:rounded-xl sm:border sm:bg-card sm:shadow-sm sm:p-6 sm:transition-all">
        <div className="flex items-center justify-between px-1 sm:px-0 pb-2 sm:pb-6">
          <h3 className="text-base font-medium text-muted-foreground/90 tracking-tight">Draft Wizards</h3>
          {unpublishedWizards.length > 0 && <span className="text-xs text-muted-foreground/70 bg-muted/40 rounded-full px-2 py-0.5">{unpublishedWizards.length}</span>}
        </div>
        
        {unpublishedWizards.length > 0 ? (
          <div className="space-y-3 px-1 sm:px-0 pt-2 sm:pt-0">
            {unpublishedWizards.map((wizard) => (
              <WizardListItem 
                key={wizard.id} 
                wizard={wizard} 
                setEditingWizardId={setEditingWizardId} 
                assignableRoles={assignableRoles} // Pass roles down
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground/60 italic border border-dashed border-border/40 bg-muted/20 rounded-md py-4 px-5 mx-1 sm:mx-0">
            No draft wizards found.
          </div>
        )}
      </section>

      {/* Separator - only show if both sections have content */}
      {publishedWizards.length > 0 && unpublishedWizards.length > 0 && (
        <Separator className="opacity-50 mx-1 sm:mx-0" />
      )}

      {/* Published Wizards Section */}
      <section className="sm:rounded-xl sm:border sm:bg-card sm:shadow-sm sm:p-6 sm:transition-all">
        <div className="flex items-center justify-between px-1 sm:px-0 pb-2 sm:pb-6">
          <h3 className="text-base font-medium text-muted-foreground/90 tracking-tight">Published Wizards</h3>
          {publishedWizards.length > 0 && <span className="text-xs text-muted-foreground/70 bg-muted/40 rounded-full px-2 py-0.5">{publishedWizards.length}</span>}
        </div>
        
        {publishedWizards.length > 0 ? (
          <div className="space-y-3 px-1 sm:px-0 pt-2 sm:pt-0">
            {publishedWizards.map((wizard) => (
              <WizardListItem 
                key={wizard.id} 
                wizard={wizard} 
                setEditingWizardId={setEditingWizardId} // Pass prop even if unused by published item
                assignableRoles={assignableRoles} // Pass roles down
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground/60 italic border border-dashed border-border/40 bg-muted/20 rounded-md py-4 px-5 mx-1 sm:mx-0">
            No published wizards found.
          </div>
        )}
      </section>
    </div>
  );
}; 