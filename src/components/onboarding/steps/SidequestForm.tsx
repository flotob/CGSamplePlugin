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
import { ImageLibraryModal } from '../ImageLibraryModal';
import { Switch } from '@/components/ui/switch';
import NextImage from 'next/image';
import { Loader2, AlertCircle, ImagePlus, XCircle, YoutubeIcon, LinkIcon, FileTextIcon } from 'lucide-react';

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
          console.log("Sidequest updated successfully");
          onSaveSuccess?.(savedData);
          onCloseForm(); 
        },
        onError: (error) => {
          console.error("Error updating sidequest:", error);
        }
      });
    } else {
      createMutation.mutate(payloadToSubmit as CreateGlobalSidequestPayload, {
        onSuccess: (savedData) => {
          console.log("Sidequest created successfully");
          onSaveSuccess?.(savedData);
          onCloseForm(); 
        },
        onError: (error) => {
          console.error("Error creating sidequest:", error);
        }
      });
    }
  };

  // Helper function to get the appropriate icon for content type
  const getContentTypeIcon = () => {
    switch(formData.sidequest_type) {
      case 'youtube': return <YoutubeIcon className="h-5 w-5 text-red-500 mr-2" />;
      case 'link': return <LinkIcon className="h-5 w-5 text-blue-500 mr-2" />;
      case 'markdown': return <FileTextIcon className="h-5 w-5 text-green-500 mr-2" />;
      default: return null;
    }
  };

  // Get content type label
  const getContentTypeLabel = () => {
    switch(formData.sidequest_type) {
      case 'youtube': return 'YouTube Video URL';
      case 'link': return 'External Link URL';
      case 'markdown': return 'Markdown Content';
      default: return 'Content';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title Field */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">Title <span className="text-destructive">*</span></Label>
        <Input 
          id="title" 
          name="title" 
          value={formData.title || ''} 
          onChange={handleChange}
          className={formErrors.title ? "border-destructive" : ""} 
          placeholder="Enter a descriptive title for this sidequest"
        />
        {formErrors.title && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3" /> {formErrors.title}
          </p>
        )}
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
        <Textarea 
          id="description" 
          name="description" 
          value={formData.description || ''} 
          onChange={handleChange}
          placeholder="Optional description or summary of this sidequest content"
          className="resize-none min-h-[80px]"
        />
      </div>

      {/* Image Field */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Image</Label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            {formData.image_url ? (
              <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted border group">
                <NextImage 
                  src={formData.image_url} 
                  alt="Sidequest image preview" 
                  layout="fill" 
                  objectFit="cover" 
                  className="transition-opacity group-hover:opacity-90"
                  unoptimized 
                />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={removeImage}
                  title="Remove image"
                >
                  <XCircle className="h-4 w-4"/>
                </Button>
              </div>
            ) : (
              <div className="w-full aspect-video rounded-md flex items-center justify-center bg-muted/40 border border-dashed border-muted-foreground/40">
                <p className="text-sm text-muted-foreground">No image selected</p>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center space-y-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => setIsImageLibraryOpen(true)} 
              className="w-full justify-start bg-primary/5 border-primary/20 hover:bg-primary/10"
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              {formData.image_url ? 'Change Image' : 'Choose or Generate Image'}
            </Button>
            <p className="text-xs text-muted-foreground">
              A thumbnail image helps users identify and remember your sidequest content.
            </p>
          </div>
        </div>
      </div>
      
      {/* Image Library Modal */}
      <ImageLibraryModal
        isOpen={isImageLibraryOpen}
        onClose={() => setIsImageLibraryOpen(false)}
        onSelect={handleImageSelected}
        wizardId={wizardId}
        stepId={stepId}
      />

      {/* Content Type Field */}
      <div className="space-y-2">
        <Label htmlFor="sidequest_type" className="text-sm font-medium">
          Content Type <span className="text-destructive">*</span>
        </Label>
        <Select 
          name="sidequest_type" 
          value={formData.sidequest_type} 
          onValueChange={(value) => handleSelectChange('sidequest_type', value)}
        >
          <SelectTrigger className={formErrors.sidequest_type ? "border-destructive" : ""}>
            <SelectValue placeholder="Select content type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="link" className="flex items-center">
              <div className="flex items-center">
                <LinkIcon className="h-4 w-4 text-blue-500 mr-2" /> 
                <span>External Link / Article</span>
              </div>
            </SelectItem>
            <SelectItem value="youtube">
              <div className="flex items-center">
                <YoutubeIcon className="h-4 w-4 text-red-500 mr-2" /> 
                <span>YouTube Video</span>
              </div>
            </SelectItem>
            <SelectItem value="markdown">
              <div className="flex items-center">
                <FileTextIcon className="h-4 w-4 text-green-500 mr-2" /> 
                <span>Markdown Content</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {formErrors.sidequest_type && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3" /> {formErrors.sidequest_type}
          </p>
        )}
      </div>

      {/* Content Payload Field */}
      <div className="space-y-2">
        <Label htmlFor="content_payload" className="text-sm font-medium flex items-center">
          {getContentTypeIcon()}
          {getContentTypeLabel()} <span className="text-destructive ml-1">*</span>
        </Label>
        {formData.sidequest_type === 'markdown' ? (
          <Textarea 
            id="content_payload" 
            name="content_payload" 
            value={formData.content_payload || ''} 
            onChange={handleChange} 
            rows={8}
            placeholder="Enter markdown content here..."
            className={`font-mono text-sm resize-none min-h-[200px] ${formErrors.content_payload ? "border-destructive" : ""}`}
          />
        ) : (
          <Input 
            id="content_payload" 
            name="content_payload" 
            type="url"
            value={formData.content_payload || ''} 
            onChange={handleChange}
            className={formErrors.content_payload ? "border-destructive" : ""}
            placeholder={formData.sidequest_type === 'youtube' ? 
              "https://www.youtube.com/watch?v=..." : 
              "https://example.com/article"
            }
          />
        )}
        {formErrors.content_payload && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3" /> {formErrors.content_payload}
          </p>
        )}
        
        <p className="text-xs text-muted-foreground mt-1">
          {formData.sidequest_type === 'youtube' && "Enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=...)"}
          {formData.sidequest_type === 'link' && "Enter a valid URL to external content (e.g., https://example.com/article)"}
          {formData.sidequest_type === 'markdown' && "Enter formatted markdown content. Basic formatting is supported (headings, lists, links, etc)."}
        </p>
      </div>

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between py-4 px-4 rounded-md bg-muted/30 border">
        <div>
          <p className="font-medium text-sm">Make Public to Community</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            When enabled, this sidequest will be visible to all community members.
          </p>
        </div>
        <Switch 
          id="is_public"
          checked={!!formData.is_public}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
        />
      </div>
      
      {/* Error Display */}
      {currentMutation.isError && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0"/>
          <span>{currentMutation.error instanceof Error ? currentMutation.error.message : 'Failed to save sidequest.'}</span>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 mt-2 border-t">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCloseForm} 
          disabled={currentMutation.isPending}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={currentMutation.isPending} 
          className="min-w-[150px]"
        >
          {currentMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              {isEditMode ? "Saving..." : "Creating..."}
            </>
          ) : (
            isEditMode ? "Save Changes" : "Create Sidequest"
          )}
        </Button>
      </div>
    </form>
  );
}; 