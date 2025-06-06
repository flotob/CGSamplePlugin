'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthFetch } from '@/lib/authFetch';

// Define Role type (adjust if needed based on actual structure)
type Role = NonNullable<CommunityInfoResponsePayload['roles']>[number];

// NewWizardButton component
interface NewWizardButtonProps {
  // communityInfo: CommunityInfoResponsePayload | undefined; // Removed as unused
  assignableRoles: Role[] | undefined;
}
export const NewWizardButton: React.FC<NewWizardButtonProps> = ({ /* communityInfo, */ assignableRoles }) => { // Commented out prop
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null); // State for selected role
  const [assignPerStep, setAssignPerStep] = React.useState<boolean>(false); // State for the checkbox
  const [error, setError] = React.useState<string | null>(null);
  const queryClient = useQueryClient();
  const { authFetch } = useAuthFetch();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch<{ wizard: unknown }>('/api/wizards', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          is_active: false, // Always create as draft
          required_role_id: selectedRoleId, // Add selected role ID
          assign_roles_per_step: assignPerStep, // Include the flag value
        }),
      });
      return res;
    },
    onSuccess: () => {
      setOpen(false);
      setName('');
      setDescription('');
      setSelectedRoleId(null); // Reset role selection
      setAssignPerStep(false); // Reset checkbox state
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['wizards'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    mutation.mutate();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="default" size="sm">
        + New Wizard
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Create New Wizard</DialogTitle>
            <DialogDescription>Enter details for your new onboarding wizard.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 text-sm"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm min-h-[60px]"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="wizard-role-req">Required Role (Optional)</Label>
              <Select 
                value={selectedRoleId ?? 'none'} 
                onValueChange={(value) => setSelectedRoleId(value === 'none' ? null : value)}
              >
                <SelectTrigger id="wizard-role-req">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Requirement</SelectItem>
                  {assignableRoles?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                If selected, only users with this role can see and start this wizard.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="assign-per-step" 
                checked={assignPerStep}
                onCheckedChange={(checked) => setAssignPerStep(Boolean(checked))}
              />
              <Label htmlFor="assign-per-step" className="text-sm font-normal cursor-pointer">
                Grant roles immediately after each step? (Default: Grant after full wizard completion)
              </Label>
            </div>
            {error && <div className="text-destructive text-sm bg-destructive/10 rounded p-2">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating...' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}; 