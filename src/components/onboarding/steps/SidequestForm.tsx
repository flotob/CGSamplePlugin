import React, { useState, useEffect } from 'react';
import type { Sidequest } from '@/types/sidequests';
import {
  CreateSidequestPayload,
  UpdateSidequestPayload,
  useCreateSidequestMutation,
  useUpdateSidequestMutation
} from '@/hooks/useSidequestAdminMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageLibraryModal } from '../ImageLibraryModal'; // Assuming path relative to 'steps' directory
import NextImage from 'next/image';
import { Loader2, AlertCircle, ImagePlus, XCircle } from 'lucide-react';

interface SidequestFormProps {
  stepId: string;
  wizardId: string;
  existingSidequest?: Sidequest | null;
  onCloseForm: () => void;
  onSaveSuccess?: (savedSidequest: Sidequest) => void;
}

const defaultSidequestState: CreateSidequestPayload = {
  title: '',
  description: '',
  image_url: null,
  sidequest_type: 'link', // Default type
  content_payload: '',
  // display_order is usually handled by the backend on create (e.g., append) or set via reorder
  // For explicit setting via form, it could be added here, but often better managed separately.
  // For MVP, we can let backend assign default if not provided, or set during reorder.
  // display_order: 0, 
};

export const SidequestForm: React.FC<SidequestFormProps> = ({
  stepId,
  wizardId,
  existingSidequest,
  onCloseForm,
  onSaveSuccess,
}) => {
  const isEditMode = !!existingSidequest;
  const [formData, setFormData] = useState<CreateSidequestPayload | UpdateSidequestPayload>(
    defaultSidequestState
  );
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateSidequestMutation({ stepId });
  const updateMutation = useUpdateSidequestMutation({ 
    stepId, 
    sidequestId: existingSidequest?.id || '', 
  });

  const currentMutation = isEditMode ? updateMutation : createMutation;

  useEffect(() => {
    if (isEditMode && existingSidequest) {
      setFormData({
        title: existingSidequest.title,
        description: existingSidequest.description || '',
        image_url: existingSidequest.image_url || null,
        sidequest_type: existingSidequest.sidequest_type,
        content_payload: existingSidequest.content_payload,
        display_order: existingSidequest.display_order, // Include for edit if present
      });
    } else {
      // When creating, or if existingSidequest becomes null, reset to default.
      // For create, we might want to fetch current max display_order + 1 for this step
      // or let backend handle default on creation (e.g., to append).
      // For simplicity, let's not set display_order in create form initially unless required.
      const { display_order, ...createDefaults } = defaultSidequestState;
      setFormData(createDefaults);
    }
    setFormErrors({}); // Clear errors when mode or existing data changes
  }, [existingSidequest, isEditMode]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value, content_payload: '' })); // Reset content_payload when type changes
     if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (formErrors.content_payload) {
      setFormErrors(prev => ({...prev, content_payload: ''}));
    }
  };
  
  const handleImageSelected = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, image_url: imageUrl }));
    setIsImageLibraryOpen(false);
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: null }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const currentTitle = (formData as CreateSidequestPayload).title || (formData as UpdateSidequestPayload).title;
    const currentSidequestType = (formData as CreateSidequestPayload).sidequest_type || (formData as UpdateSidequestPayload).sidequest_type;
    const currentContentPayload = (formData as CreateSidequestPayload).content_payload || (formData as UpdateSidequestPayload).content_payload;

    if (!currentTitle || !currentTitle.trim()) errors.title = 'Title is required.';
    if (!currentSidequestType) errors.sidequest_type = 'Sidequest type is required.';
    if (!currentContentPayload || !currentContentPayload.trim()) {
        errors.content_payload = 'Content payload is required.';
    } else if ((currentSidequestType === 'youtube' || currentSidequestType === 'link')) {
        try {
            new URL(currentContentPayload);
        } catch (_) {
            errors.content_payload = 'Please enter a valid URL.';
        }
    }
    // Display order validation (if field is present and required)
    // const currentDisplayOrder = (formData as { display_order?: number }).display_order;
    // if (typeof currentDisplayOrder === 'number' && currentDisplayOrder < 0) {
    //   errors.display_order = 'Display order must be non-negative.';
    // }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Ensure description and image_url are null if empty strings, consistent with DB
    const payloadToSubmit = {
        ...formData,
        description: formData.description?.trim() === '' ? null : formData.description,
        image_url: formData.image_url?.trim() === '' ? null : formData.image_url,
    };

    // Remove display_order for create if it's not explicitly set or meant to be auto-assigned by backend
    let finalPayload: CreateSidequestPayload | UpdateSidequestPayload = payloadToSubmit;
    if (!isEditMode) {
      const { display_order, ...createPayload } = payloadToSubmit as CreateSidequestPayload & {display_order?:number}; // Type assertion for destructuring
      finalPayload = createPayload;
      // If your create API expects display_order, ensure it's included or handled
      // if (payloadToSubmit.display_order !== undefined) {
      //   (finalPayload as CreateSidequestPayload).display_order = payloadToSubmit.display_order;
      // }
    }

    currentMutation.mutate(finalPayload as any, { // Use `as any` if types become too complex for TS to infer quickly with conditional payloads
      onSuccess: (savedData) => {
        onSaveSuccess?.(savedData);
        onCloseForm(); 
      },
      onError: (error) => {
        // Errors are displayed via currentMutation.isError and currentMutation.error below
        // Optionally add toast notifications here
        console.error("Save error:", error);
      }
    });
  };

  const formTitle = isEditMode ? 'Edit Sidequest' : 'Create New Sidequest';
  const submitButtonText = isEditMode ? 'Save Changes' : 'Create Sidequest';

  return (
    <div className="p-1">
      <h3 className="text-lg font-semibold mb-6 text-center">{formTitle}</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="title">Title*</Label>
          <Input id="title" name="title" value={(formData as CreateSidequestPayload).title} onChange={handleChange} />
          {formErrors.title && <p className="text-xs text-destructive mt-1">{formErrors.title}</p>}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} />
        </div>

        <div className="space-y-2">
          <Label>Image</Label>
          {formData.image_url && (
            <div className="relative group w-36 h-36 border rounded-md overflow-hidden">
              <NextImage src={formData.image_url} alt="Sidequest image preview" layout="fill" objectFit="cover" unoptimized />
              <Button 
                type="button" 
                variant="destructive" 
                size="icon" 
                className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 p-1"
                onClick={removeImage}
                title="Remove image"
              >
                <XCircle className="h-5 w-5 text-white"/>
              </Button>
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setIsImageLibraryOpen(true)} className="flex items-center">
            <ImagePlus className="mr-2 h-4 w-4" />
            {formData.image_url ? 'Change Image' : 'Choose or Generate Image'}
          </Button>
          {formErrors.image_url && <p className="text-xs text-destructive mt-1">{formErrors.image_url}</p>}
        </div>
        
        <ImageLibraryModal
          isOpen={isImageLibraryOpen}
          onClose={() => setIsImageLibraryOpen(false)}
          onSelect={handleImageSelected}
          wizardId={wizardId}
          stepId={stepId} 
        />

        <div>
          <Label htmlFor="sidequest_type">Sidequest Type*</Label>
          <Select 
            name="sidequest_type" 
            value={(formData as CreateSidequestPayload).sidequest_type} 
            onValueChange={(value) => handleSelectChange('sidequest_type', value)}
          >
            <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="link">External Link / Article</SelectItem>
              <SelectItem value="youtube">YouTube Video</SelectItem>
              <SelectItem value="markdown">Markdown Content</SelectItem>
            </SelectContent>
          </Select>
          {formErrors.sidequest_type && <p className="text-xs text-destructive mt-1">{formErrors.sidequest_type}</p>}
        </div>

        <div>
          <Label htmlFor="content_payload">
            { (formData as CreateSidequestPayload).sidequest_type === 'youtube' ? 'YouTube URL*' 
            : (formData as CreateSidequestPayload).sidequest_type === 'link' ? 'Link URL*' 
            : 'Markdown Content*'}
          </Label>
          {(formData as CreateSidequestPayload).sidequest_type === 'markdown' ? (
            <Textarea id="content_payload" name="content_payload" value={(formData as CreateSidequestPayload).content_payload} onChange={handleChange} rows={6} />
          ) : (
            <Input id="content_payload" name="content_payload" type={(formData as CreateSidequestPayload).sidequest_type === 'link' || (formData as CreateSidequestPayload).sidequest_type === 'youtube' ? 'url' : 'text'} value={(formData as CreateSidequestPayload).content_payload} onChange={handleChange} />
          )}
          {formErrors.content_payload && <p className="text-xs text-destructive mt-1">{formErrors.content_payload}</p>}
        </div>
        
        {/* Display Order: For create, it's usually auto-assigned (e.g., as last). For edit, user might change it. */}
        {isEditMode && (
          <div>
            <Label htmlFor="display_order">Display Order</Label>
            <Input id="display_order" name="display_order" type="number" value={(formData as UpdateSidequestPayload).display_order || 0} onChange={handleChange} min="0" />
            {formErrors.display_order && <p className="text-xs text-destructive mt-1">{formErrors.display_order}</p>}
          </div>
        )}

        {currentMutation.isError && (
           <div className="text-destructive text-sm bg-destructive/10 rounded p-3 flex items-center">
             <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0"/>
             <span>Error: {currentMutation.error instanceof Error ? currentMutation.error.message : 'Failed to save sidequest.'}</span>
           </div>
        )}

        <div className="flex justify-end gap-3 pt-4 mt-2 border-t">
          <Button type="button" variant="ghost" onClick={onCloseForm} disabled={currentMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={currentMutation.isPending} className="min-w-[120px]">
            {currentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : submitButtonText}
          </Button>
        </div>
      </form>
    </div>
  );
}; 