'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Wizard } from '@/hooks/useWizardsQuery';
import {
  usePublishWizard,
  useDuplicateWizard,
  useDeleteWizard,
  useUpdateWizardDetails,
} from '@/hooks/useWizardMutations';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Copy, Trash2, Play, Square, Check, Loader2, Settings, ShieldCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useUpdateWizardRoleRequirementMutation } from '@/hooks/useUpdateWizardRoleRequirementMutation';
import type { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { Switch } from "@/components/ui/switch";

// Define Role type (can be shared or imported if defined elsewhere)
// Assuming structure from CommunityInfoResponsePayload
type Role = NonNullable<CommunityInfoResponsePayload['roles']>[number];

interface WizardListItemProps {
  wizard: Wizard;
  setEditingWizardId: (id: string) => void; // For full edit
  assignableRoles: Role[] | undefined; // Accept roles
}

export const WizardListItem: React.FC<WizardListItemProps> = ({ 
  wizard, 
  setEditingWizardId,
  assignableRoles // Destructure roles
}) => {
  const { toast } = useToast();
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editedName, setEditedName] = useState(wizard.name);
  const [editedDescription, setEditedDescription] = useState(wizard.description || '');

  // Reset local state if wizard prop changes (e.g., after refetch)
  useEffect(() => {
    setEditedName(wizard.name);
    setEditedDescription(wizard.description || '');
  }, [wizard]);

  // Mutations
  const publishMutation = usePublishWizard();
  const duplicateMutation = useDuplicateWizard();
  const deleteMutation = useDeleteWizard();
  const updateDetailsMutation = useUpdateWizardDetails();
  const updateRoleMutation = useUpdateWizardRoleRequirementMutation();

  const handleTogglePublish = useCallback(() => {
    publishMutation.mutate(
      { wizardId: wizard.id, is_active: !wizard.is_active },
      {
        onSuccess: () => {
          toast({ title: wizard.is_active ? 'Wizard deactivated' : 'Wizard published' });
        },
        onError: (error) => {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
      }
    );
  }, [publishMutation, wizard.id, wizard.is_active, toast]);

  const handleDuplicate = useCallback(() => {
    duplicateMutation.mutate(
      { wizardId: wizard.id },
      {
        onSuccess: () => {
          toast({ title: 'Wizard duplicated', description: 'New draft created.' });
        },
        onError: (error) => {
          toast({ title: 'Error duplicating', description: error.message, variant: 'destructive' });
        },
      }
    );
  }, [duplicateMutation, wizard.id, toast]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(
      { wizardId: wizard.id },
      {
        onSuccess: () => {
          toast({ title: 'Wizard deleted' });
        },
        onError: (error) => {
          toast({ title: 'Error deleting', description: error.message, variant: 'destructive' });
        },
      }
    );
  }, [deleteMutation, wizard.id, toast]);

  const handleSaveInlineEdit = useCallback(() => {
    if (editedName.trim() === '') {
      toast({ title: 'Name cannot be empty', variant: 'destructive' });
      return;
    }
    updateDetailsMutation.mutate(
      { wizardId: wizard.id, name: editedName, description: editedDescription },
      {
        onSuccess: () => {
          toast({ title: 'Wizard details updated' });
          setIsInlineEditing(false);
        },
        onError: (error) => {
          toast({ title: 'Error updating details', description: error.message, variant: 'destructive' });
        },
      }
    );
  }, [updateDetailsMutation, wizard.id, editedName, editedDescription, toast]);

  const handleCancelInlineEdit = useCallback(() => {
    setEditedName(wizard.name);
    setEditedDescription(wizard.description || '');
    setIsInlineEditing(false);
  }, [wizard.name, wizard.description]);

  const isMutatingAny = 
    publishMutation.isPending || 
    duplicateMutation.isPending || 
    deleteMutation.isPending || 
    updateDetailsMutation.isPending ||
    updateRoleMutation.isPending;

  // Format date
  const updatedAt = formatDistanceToNow(new Date(wizard.updated_at), { addSuffix: true });

  return (
    <Card className={`transition-all border border-border/40 hover:border-border/60 ${isMutatingAny ? 'opacity-70 pointer-events-none' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          {isInlineEditing ? (
            <div className="flex-grow space-y-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-lg font-semibold h-9"
                placeholder="Wizard Name"
                disabled={isMutatingAny}
              />
              <Textarea
                value={editedDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedDescription(e.target.value)}
                placeholder="Wizard description (optional)"
                rows={2}
                className="text-sm resize-none"
                disabled={isMutatingAny}
              />
            </div>
          ) : (
            <div className="flex-grow">
              <CardTitle className="text-lg mb-1">{wizard.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {wizard.description || <span className="italic text-muted-foreground/70">No description</span>}
              </CardDescription>
            </div>
          )}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
             <Badge 
               variant={wizard.is_active ? 'default' : 'secondary'} 
               className={wizard.is_active
                 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700/30 dark:hover:bg-emerald-950/60'
                 : 'bg-secondary/50 hover:bg-secondary/70'
               }>
               {wizard.is_active ? 'Published' : 'Draft'}
             </Badge>
             <span className="text-xs text-muted-foreground mt-1">Updated {updatedAt}</span>
          </div>
        </div>
      </CardHeader>
      
      {/* Settings Section (Role Req + Per Step Flag) */}
      <div className="px-6 pb-4 pt-2 space-y-4">
          {/* Required Role Dropdown */}
          <div className="space-y-1.5">
             <Label htmlFor={`role-req-${wizard.id}`} className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Required Role
             </Label>
             <Select 
                value={wizard.required_role_id ?? 'none'} 
                onValueChange={(value) => {
                    const newRoleId = value === 'none' ? null : value;
                    updateRoleMutation.mutate({ wizardId: wizard.id, requiredRoleId: newRoleId });
                }}
                disabled={isMutatingAny} 
              >
                <SelectTrigger id={`role-req-${wizard.id}`} className="h-8 text-xs w-full sm:w-auto">
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
          </div>

          {/* Assign Roles Per Step Switch */}
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id={`assign-per-step-${wizard.id}`}
              checked={wizard.assign_roles_per_step}
              onCheckedChange={(checked) => {
                updateDetailsMutation.mutate({ 
                  wizardId: wizard.id, 
                  assign_roles_per_step: checked 
                });
              }}
              disabled={isMutatingAny}
            />
            <Label htmlFor={`assign-per-step-${wizard.id}`} className="text-xs font-normal cursor-pointer">
              Grant roles per step (instead of after wizard completion)
            </Label>
          </div>
      </div>
      
      <CardFooter className="flex justify-between items-center pt-4 border-t border-border/30">
         {isInlineEditing ? (
            <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveInlineEdit} disabled={isMutatingAny} className="h-8">
                    {updateDetailsMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-2 h-3.5 w-3.5"/>} Save
                </Button>
                <Button size="sm" variant="secondary" onClick={handleCancelInlineEdit} disabled={isMutatingAny} className="h-8">Cancel</Button>
            </div>
         ) : (
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={() => setIsInlineEditing(true)} disabled={isMutatingAny} className="text-muted-foreground/90 hover:text-foreground h-8">
                            <Edit2 className="h-3.5 w-3.5"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        <p>Edit Name/Description</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
         )}

        <div className="flex items-center gap-1.5">
          {/* ----- Conditional Actions ----- */} 
          
          {/* Edit Steps (Only for Drafts) */} 
          {!wizard.is_active && (
             <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="sm" variant="secondary" onClick={() => setEditingWizardId(wizard.id)} disabled={isMutatingAny} className="h-8 px-3 text-xs">
                            <Settings className="mr-1.5 h-3.5 w-3.5"/> Edit Steps
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        <p>Open full step editor</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          )}

          {/* Publish/Deactivate Button */} 
          <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant={wizard.is_active ? "secondary" : "default"} 
                                disabled={isMutatingAny}
                                className="h-8 px-3 text-xs">
                                {publishMutation.isPending ? 
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : 
                                  (wizard.is_active ? 
                                    <Square className="mr-1.5 h-3.5 w-3.5"/> : 
                                    <Play className="mr-1.5 h-3.5 w-3.5"/>
                                  )
                                }
                                {wizard.is_active ? 'Deactivate' : 'Publish'}
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{wizard.is_active ? 'Deactivate wizard?' : 'Publish wizard?'}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {wizard.is_active 
                                   ? 'Deactivating this wizard will make it unavailable for users, but retain its configuration.'
                                   : 'Publishing this wizard will make it available for users. You won\'t be able to edit its steps directly after publishing.'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleTogglePublish} 
                                disabled={publishMutation.isPending}
                                className={wizard.is_active ? 'bg-secondary hover:bg-secondary/90 text-secondary-foreground h-9' : 'h-9'}>
                                {wizard.is_active ? 'Deactivate' : 'Publish'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        <p>{wizard.is_active ? 'Make this wizard a draft' : 'Make this wizard live'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          
          {/* Duplicate Button */} 
          <TooltipProvider delayDuration={200}>
             <Tooltip>
                 <TooltipTrigger asChild>
                     <Button 
                       size="sm" 
                       variant="secondary" 
                       onClick={handleDuplicate} 
                       disabled={isMutatingAny}
                       className="h-8 px-3 text-xs">
                         {duplicateMutation.isPending ? 
                           <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : 
                           <Copy className="mr-1.5 h-3.5 w-3.5"/>
                         }
                          Duplicate
                     </Button>
                 </TooltipTrigger>
                 <TooltipContent side="bottom" className="text-xs">
                     <p>Create an editable draft copy</p>
                 </TooltipContent>
             </Tooltip>
         </TooltipProvider>

          {/* Delete Button */} 
          <AlertDialog>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                      disabled={isMutatingAny}> 
                      {deleteMutation.isPending ? 
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 
                        <Trash2 className="h-3.5 w-3.5"/>
                      }
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Delete Wizard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Wizard?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  &quot;{wizard.name}&quot; wizard and all its associated steps and progress.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete} 
                  disabled={deleteMutation.isPending} 
                  className="bg-destructive hover:bg-destructive/90 h-9">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}; 