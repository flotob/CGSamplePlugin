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
import { ImageLibraryModal } from '../ImageLibraryModal';
import { Switch } from '@/components/ui/switch';
import NextImage from 'next/image';
import { Loader2, AlertCircle, ImagePlus, XCircle, YoutubeIcon, LinkIcon, FileTextIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminImagesQuery } from '@/hooks/useAdminImagesQuery';
import { extractYouTubeVideoId } from '@/lib/utils';

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

export const EnhancedSidequestForm: React.FC<SidequestFormProps> = ({
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
  
  // Fetch recent images
  const myImagesQuery = useAdminImagesQuery({ scope: 'mine' });

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
      {/* Top control bar with Public Switcher */}
      <div className="flex items-center justify-between py-3 px-4 rounded-md bg-muted/30 border">
        <div className="flex items-center">
          <span className={cn(
            "p-1.5 rounded-full mr-2",
            formData.sidequest_type === 'youtube' && "bg-red-100 text-red-500",
            formData.sidequest_type === 'link' && "bg-blue-100 text-blue-500",
            formData.sidequest_type === 'markdown' && "bg-green-100 text-green-500",
            !['youtube', 'link', 'markdown'].includes(formData.sidequest_type || '') && "bg-primary/10 text-primary"
          )}>
            {formData.sidequest_type === 'youtube' && <YoutubeIcon className="h-4 w-4" />}
            {formData.sidequest_type === 'link' && <LinkIcon className="h-4 w-4" />}
            {formData.sidequest_type === 'markdown' && <FileTextIcon className="h-4 w-4" />}
            {!['youtube', 'link', 'markdown'].includes(formData.sidequest_type || '') && <span className="h-4 w-4 flex items-center justify-center">✨</span>}
          </span>
          <span className="font-medium text-sm">
            {isEditMode ? 'Edit Sidequest' : 'Create Sidequest'}
          </span>
        </div>

        <div className="flex items-center">
          <span className="text-sm mr-3 text-muted-foreground">Make Public</span>
          <Switch 
            id="is_public_top"
            checked={!!formData.is_public}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
          />
        </div>
      </div>

      {/* Row 1: Title and Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Title */}
        <div className="space-y-4">
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
          
          <p className="text-xs text-muted-foreground mt-1">
            A clear, descriptive title helps users understand what this sidequest is about.
          </p>
        </div>

        {/* Right: Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
          <Textarea 
            id="description" 
            name="description" 
            value={formData.description || ''} 
            onChange={handleChange}
            placeholder="Optional description or summary of this sidequest content"
            className="resize-none min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Add an optional description to provide more context about this sidequest.
          </p>
        </div>
      </div>

      {/* Row 2: Content Type & Content / Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Left: Content Type & Input */}
        <div className="space-y-5">
          {/* Content Type Selection Cards */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Select Content Type <span className="text-destructive">*</span>
            </Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* YouTube Card */}
              <div 
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-4 transition-all duration-200",
                  formData.sidequest_type === 'youtube' 
                    ? "border-red-500 bg-red-50 dark:bg-red-900/10 shadow-sm" 
                    : "border-muted bg-card hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/5"
                )}
                onClick={() => handleSelectChange('sidequest_type', 'youtube')}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={cn(
                    "rounded-full p-2 mb-2",
                    formData.sidequest_type === 'youtube' ? "bg-red-100 dark:bg-red-700/20" : "bg-muted"
                  )}>
                    <YoutubeIcon className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className={cn(
                    "font-medium",
                    formData.sidequest_type === 'youtube' ? "text-red-700 dark:text-red-400" : ""
                  )}>
                    YouTube Video
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Embed a YouTube video
                  </p>
                </div>
              </div>
              
              {/* Link Card */}
              <div 
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-4 transition-all duration-200",
                  formData.sidequest_type === 'link' 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-sm" 
                    : "border-muted bg-card hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/5"
                )}
                onClick={() => handleSelectChange('sidequest_type', 'link')}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={cn(
                    "rounded-full p-2 mb-2",
                    formData.sidequest_type === 'link' ? "bg-blue-100 dark:bg-blue-700/20" : "bg-muted"
                  )}>
                    <LinkIcon className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className={cn(
                    "font-medium",
                    formData.sidequest_type === 'link' ? "text-blue-700 dark:text-blue-400" : ""
                  )}>
                    External Link
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Link to an external resource
                  </p>
                </div>
              </div>
              
              {/* Markdown Card */}
              <div 
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-4 transition-all duration-200",
                  formData.sidequest_type === 'markdown' 
                    ? "border-green-500 bg-green-50 dark:bg-green-900/10 shadow-sm" 
                    : "border-muted bg-card hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-900/5"
                )}
                onClick={() => handleSelectChange('sidequest_type', 'markdown')}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={cn(
                    "rounded-full p-2 mb-2",
                    formData.sidequest_type === 'markdown' ? "bg-green-100 dark:bg-green-700/20" : "bg-muted"
                  )}>
                    <FileTextIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className={cn(
                    "font-medium",
                    formData.sidequest_type === 'markdown' ? "text-green-700 dark:text-green-400" : ""
                  )}>
                    Markdown Content
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create rich formatted text
                  </p>
                </div>
              </div>
            </div>
            
            {formErrors.sidequest_type && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-2">
                <AlertCircle className="h-3 w-3" /> {formErrors.sidequest_type}
              </p>
            )}
          </div>
          
          {/* Content Input */}
          <div className="space-y-2 pt-2">
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
                rows={6}
                placeholder="Enter markdown content here..."
                className={`font-mono text-sm resize-none ${formErrors.content_payload ? "border-destructive" : ""}`}
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
        </div>

        {/* Right: Content Preview */}
        <div>
          <div className="border rounded-md bg-card h-[345px] flex flex-col overflow-hidden">
            <div className="p-3 border-b bg-muted/40">
              <p className="text-xs uppercase text-muted-foreground font-medium flex items-center">
                {formData.sidequest_type === 'youtube' && <YoutubeIcon className="h-3.5 w-3.5 mr-1.5 text-red-500" />}
                {formData.sidequest_type === 'link' && <LinkIcon className="h-3.5 w-3.5 mr-1.5 text-blue-500" />}
                {formData.sidequest_type === 'markdown' && <FileTextIcon className="h-3.5 w-3.5 mr-1.5 text-green-500" />}
                {formData.sidequest_type === 'youtube' && "YouTube Preview"}
                {formData.sidequest_type === 'link' && "Link Preview"}
                {formData.sidequest_type === 'markdown' && "Markdown Preview"}
              </p>
            </div>
            
            <div className="flex-grow p-4 overflow-auto">
              {/* YouTube Preview */}
              {formData.sidequest_type === 'youtube' && (
                formData.content_payload && !formErrors.content_payload ? (
                  <div className="aspect-video w-full bg-black rounded overflow-hidden">
                    {(() => {
                      const videoId = extractYouTubeVideoId(formData.content_payload || '');
                      
                      if (videoId) {
                        return (
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube video preview"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        );
                      } else {
                        return (
                          <div className="flex items-center justify-center h-full text-white">
                            <YoutubeIcon className="h-12 w-12 text-red-500 mr-2" />
                            <span>Invalid YouTube URL</span>
                          </div>
                        );
                      }
                    })()}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <YoutubeIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <p>Enter a YouTube URL to see a preview</p>
                  </div>
                )
              )}
              
              {/* Link Preview */}
              {formData.sidequest_type === 'link' && (
                formData.content_payload && !formErrors.content_payload ? (
                  <div className="flex items-center p-4 border rounded">
                    <LinkIcon className="h-8 w-8 text-blue-500 mr-4 flex-shrink-0" />
                    <div>
                      <a 
                        href={formData.content_payload} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm font-medium break-all"
                      >
                        {formData.content_payload}
                      </a>
                      <p className="text-xs text-muted-foreground mt-2">
                        This link will open in a new window when users click it.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <LinkIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <p>Enter a URL to see a preview</p>
                  </div>
                )
              )}
              
              {/* Markdown Preview */}
              {formData.sidequest_type === 'markdown' && (
                formData.content_payload ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {/* Simple preview for now, in a real implementation you would use a markdown renderer */}
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {formData.content_payload}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <FileTextIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <p>Enter markdown content to see a preview</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Image Picker / Selected Image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Left: Image Picker (Recent Images) */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Recent Images</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {myImagesQuery.isLoading && (
              <div className="col-span-full flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
              </div>
            )}
            {myImagesQuery.isError && (
              <div className="col-span-full flex justify-center py-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
            
            {myImagesQuery.data && myImagesQuery.data.images.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground italic py-4">No recent images available.</p>
            )}
            
            {myImagesQuery.data && myImagesQuery.data.images.slice(0, 6).map(img => (
              <button 
                type="button" 
                key={img.id} 
                onClick={() => handleImageSelected(img.storage_url)}
                className={cn(
                  "border rounded-md overflow-hidden aspect-square relative bg-muted hover:ring-2 hover:ring-primary focus:ring-2 focus:ring-primary transition-shadow",
                  formData.image_url === img.storage_url && "ring-2 ring-primary"
                )}
                title="Select this image"
              >
                <NextImage 
                  src={img.storage_url}
                  alt="Recent image preview"
                  layout="fill"
                  objectFit="cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
          
          <Button 
            type="button"
            variant="default" 
            onClick={() => setIsImageLibraryOpen(true)}
            className="w-full"
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            Generate or Choose an Image
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            A thumbnail image helps users identify and remember your sidequest content.
          </p>
        </div>
        
        {/* Right: Selected Image */}
        <div>
          <div className="flex items-center justify-center h-full min-h-[280px]">
            <div 
              className={cn(
                "border-2 rounded-md overflow-hidden w-full aspect-video relative bg-muted",
                formData.image_url ? "border-primary shadow-md" : "border-dashed border-muted-foreground/30"
              )}
            >
              {formData.image_url ? (
                <div className="relative group w-full h-full">
                  <NextImage 
                    src={formData.image_url}
                    alt="Selected image preview"
                    layout="fill"
                    objectFit="cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removeImage}
                    >
                      <XCircle className="h-4 w-4 mr-1.5"/> Remove Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <ImagePlus className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No image selected</p>
                  <p className="text-xs text-muted-foreground mt-1">Choose an image from the library</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Error Display */}
      {currentMutation.isError && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0"/>
          <span>{currentMutation.error instanceof Error ? currentMutation.error.message : 'Failed to save sidequest.'}</span>
        </div>
      )}

      {/* Form Actions with success animation */}
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
          className={cn(
            "min-w-[150px] transition-all duration-300",
            currentMutation.isSuccess && "bg-green-500 hover:bg-green-600"
          )}
        >
          {currentMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              {isEditMode ? "Saving..." : "Creating..."}
            </>
          ) : currentMutation.isSuccess ? (
            <>
              <span className="mr-2">✓</span> Saved!
            </>
          ) : (
            isEditMode ? "Save Changes" : "Create Sidequest"
          )}
        </Button>
      </div>

      {/* Image Library Modal */}
      <ImageLibraryModal
        isOpen={isImageLibraryOpen}
        onClose={() => setIsImageLibraryOpen(false)}
        onSelect={handleImageSelected}
        wizardId={wizardId}
        stepId={stepId}
      />
    </form>
  );
}; 