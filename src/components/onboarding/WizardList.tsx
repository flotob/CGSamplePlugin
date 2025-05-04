'use client';

import React, { useState } from 'react';
import { useWizardsQuery } from '@/hooks/useWizardsQuery'; // Assuming this hook exists
import { WizardListItem } from './WizardListItem'; // Import the new item component
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileTextIcon, Loader2, PlusIcon } from 'lucide-react';
import { useCommunityInfoQuery } from '@/hooks/useCommunityInfoQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';
import type { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib'; // Add missing import

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
  const { data: communityInfo } = useCommunityInfoQuery();
  
  // State for new wizard dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { authFetch } = useAuthFetch();

  const newWizardMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch<{ wizard: unknown }>('/api/wizards', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          is_active: false, // Always create as draft
          communityTitle: communityInfo?.title || 'Untitled Community',
        }),
      });
      return res;
    },
    onSuccess: () => {
      setDialogOpen(false);
      setName('');
      setDescription('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['wizards'] });
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    newWizardMutation.mutate();
  };
  
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
        <Button variant="default" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-1" /> New Wizard
        </Button>
      </div>
    );
  }

  // Separate wizards into published and unpublished (drafts)
  const publishedWizards = data.wizards.filter(w => w.is_active);
  const unpublishedWizards = data.wizards.filter(w => !w.is_active);

  return (
    <div className="space-y-8">
      {/* Unpublished (Draft) Wizards Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-muted-foreground/90 tracking-tight">Draft Wizards</h3>
          {unpublishedWizards.length > 0 && <span className="text-xs text-muted-foreground/70 bg-muted/40 rounded-full px-2 py-0.5">{unpublishedWizards.length}</span>}
        </div>
        
        {unpublishedWizards.length > 0 ? (
          <div className="space-y-3">
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
          <div className="text-sm text-muted-foreground/60 italic border border-dashed border-border/40 bg-muted/20 rounded-md py-4 px-5">
            No draft wizards found.
          </div>
        )}
      </section>

      {/* Separator - only show if both sections have content */}
      {publishedWizards.length > 0 && unpublishedWizards.length > 0 && (
        <Separator className="opacity-50" />
      )}

      {/* Published Wizards Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-muted-foreground/90 tracking-tight">Published Wizards</h3>
          {publishedWizards.length > 0 && <span className="text-xs text-muted-foreground/70 bg-muted/40 rounded-full px-2 py-0.5">{publishedWizards.length}</span>}
        </div>
        
        {publishedWizards.length > 0 ? (
          <div className="space-y-3">
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
          <div className="text-sm text-muted-foreground/60 italic border border-dashed border-border/40 bg-muted/20 rounded-md py-4 px-5">
            No published wizards found.
          </div>
        )}
      </section>
      
      {/* New Wizard Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Wizard</DialogTitle>
            <DialogDescription>Enter details for your new onboarding wizard.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter wizard name"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="resize-none"
              />
            </div>
            {formError && (
              <div className="text-destructive text-sm bg-destructive/10 rounded-md p-2.5 border border-destructive/20">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)} disabled={newWizardMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={newWizardMutation.isPending}>
                {newWizardMutation.isPending ? 'Creating...' : 'Create Wizard'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 