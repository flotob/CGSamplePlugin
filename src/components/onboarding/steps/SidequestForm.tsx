import React, { useState, useEffect } from 'react';
import type { Sidequest, CreateGlobalSidequestPayload, UpdateGlobalSidequestPayload } from '@/types/sidequests';
import {
  useCreateGlobalSidequestMutation,
  useUpdateGlobalSidequestMutation
} from '@/hooks/useSidequestLibraryHooks';
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

const defaultGlobalSidequestState: CreateGlobalSidequestPayload = {
  title: '',
  description: '',
  image_url: null,
  sidequest_type: 'link',
  content_payload: '',
  is_public: false,
};

export const SidequestForm: React.FC<SidequestFormProps> = ({
  stepId,
  wizardId,
  existingSidequest,
  onCloseForm,
  onSaveSuccess,
}) => {
  const isEditMode = !!existingSidequest;
  const [formData, setFormData] = useState<CreateGlobalSidequestPayload | UpdateGlobalSidequestPayload>(
    defaultGlobalSidequestState
  );
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateGlobalSidequestMutation();
  const updateMutation = useUpdateGlobalSidequestMutation();

  const currentMutation = isEditMode ? updateMutation : createMutation;

  useEffect(() => {
    if (isEditMode && existingSidequest) {
      setFormData({
        title: existingSidequest.title,
        description: existingSidequest.description || '',
        image_url: existingSidequest.image_url || null,
        sidequest_type: existingSidequest.sidequest_type,
        content_payload: existingSidequest.content_payload,
        is_public: existingSidequest.is_public,
      });
    } else {
      setFormData(defaultGlobalSidequestState);
    }
    setFormErrors({});
  }, [existingSidequest, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value, content_payload: '' }));
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
    const currentTitle = formData.title;
    const currentSidequestType = formData.sidequest_type;
    const currentContentPayload = formData.content_payload;

    if (!currentTitle || !currentTitle.trim()) errors.title = 'Title is required.';
    if (!currentSidequestType) errors.sidequest_type = 'Sidequest type is required.';
    if (!currentContentPayload || !currentContentPayload.trim()) {
        errors.content_payload = 'Content payload is required.';
    } else if ((currentSidequestType === 'youtube' || currentSidequestType === 'link')) {
        try {
            new URL(currentContentPayload);
        } catch {
            errors.content_payload = 'Please enter a valid URL.';
        }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payloadToSubmit: CreateGlobalSidequestPayload | UpdateGlobalSidequestPayload = {
        ...formData,
        description: formData.description?.trim() === '' ? null : formData.description,
        image_url: formData.image_url?.trim() === '' ? null : formData.image_url,
    };

    if (isEditMode && existingSidequest) {
      updateMutation.mutate({ sidequestId: existingSidequest.id, payload: payloadToSubmit as UpdateGlobalSidequestPayload }, {
        onSuccess: (savedData) => {
          onSaveSuccess?.(savedData);
          onCloseForm(); 
        },
      });
    } else {
      createMutation.mutate(payloadToSubmit as CreateGlobalSidequestPayload, {
        onSuccess: (savedData) => {
          onSaveSuccess?.(savedData);
          onCloseForm(); 
        },
      });
    }
  };

  const formTitle = isEditMode ? `Edit ${existingSidequest?.title || 'Sidequest'}` : 'Create New Library Sidequest';
  const submitButtonText = isEditMode ? 'Save Changes to Library' : 'Create Library Sidequest';

  return (
    <div className="p-1">
      <h3 className="text-lg font-semibold mb-6 text-center">{formTitle}</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="title">Title*</Label>
          <Input id="title" name="title" value={formData.title || ''} onChange={handleChange} />
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
            value={formData.sidequest_type} 
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
            { formData.sidequest_type === 'youtube' ? 'YouTube URL*' 
            : formData.sidequest_type === 'link' ? 'Link URL*' 
            : 'Markdown Content*'}
          </Label>
          {formData.sidequest_type === 'markdown' ? (
            <Textarea id="content_payload" name="content_payload" value={formData.content_payload || ''} onChange={handleChange} rows={6} />
          ) : (
            <Input id="content_payload" name="content_payload" type={formData.sidequest_type === 'link' || formData.sidequest_type === 'youtube' ? 'url' : 'text'} value={formData.content_payload || ''} onChange={handleChange} />
          )}
          {formErrors.content_payload && <p className="text-xs text-destructive mt-1">{formErrors.content_payload}</p>}
        </div>

        <div className="flex items-center space-x-2 py-2">
          <input 
            type="checkbox" 
            id="is_public" 
            name="is_public"
            checked={!!formData.is_public}
            onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="is_public" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Make this sidequest public to the community library?
          </Label>
        </div>
        
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
          <Button type="submit" disabled={currentMutation.isPending} className="min-w-[150px]">
            {currentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : submitButtonText}
          </Button>
        </div>
      </form>
    </div>
  );
}; 