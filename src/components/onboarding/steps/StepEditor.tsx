import React, { useState, useEffect, useCallback } from 'react';
import { Step, useUpdateStep, useDeleteStep } from '@/hooks/useStepsQuery';
import { Button } from '@/components/ui/button';
import { useStepTypesQuery, StepType } from '@/hooks/useStepTypesQuery';
import { CommonStepPresentationSettings, PresentationConfig } from './CommonStepPresentationSettings';
import { EnsStepConfig, EnsSpecificConfig } from './EnsStepConfig';
import { ContentStepConfig, ContentSpecificConfigType } from './ContentStepConfig';
import QuizmasterBasicConfig from './QuizmasterBasicConfig';
import type { QuizmasterBasicSpecificConfig } from '@/types/onboarding-steps';
import QuizmasterAiConfig from './QuizmasterAiConfig';
import type { QuizmasterAiSpecificConfig } from '@/types/onboarding-steps';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminWizardSummaryPreview } from './AdminWizardSummaryPreview';
import { ImageLibraryModal } from '../ImageLibraryModal';
import Image from 'next/image';
import { useAdminImagesQuery } from '@/hooks/useAdminImagesQuery';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackgroundType } from './CommonStepPresentationSettings';
import { ColorPicker } from '../../color-picker';
import { Input } from "@/components/ui/input";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/utils";
import { SidequestsManager } from './SidequestsManager';

interface CommunityRole {
  id: string;
  title: string;
}

interface StepEditorProps {
  wizardId: string;
  step: Step | null;
  roles?: CommunityRole[];
  onSave?: () => void;
  onDelete?: () => void;
  isSummaryPreview?: boolean;
  summaryData?: { includedStepTypes: StepType[]; potentialRoles: CommunityRole[] } | undefined;
}

const INITIAL_PRESENTATION_CONFIG: PresentationConfig = {
  headline: null,
  subtitle: null,
  backgroundType: null,
  backgroundValue: null,
};

const INITIAL_SPECIFIC_CONFIG: Record<string, unknown> = {};

const INITIAL_STEP_CONFIG = {
  presentation: INITIAL_PRESENTATION_CONFIG,
  specific: INITIAL_SPECIFIC_CONFIG,
};

export const StepEditor: React.FC<StepEditorProps> = ({
  wizardId,
  step,
  roles = [],
  onSave,
  onDelete,
  isSummaryPreview = false,
  summaryData,
}) => {
  const { data: stepTypesData } = useStepTypesQuery();
  
  const [targetRoleId, setTargetRoleId] = React.useState<string>('');
  const [isMandatory, setIsMandatory] = React.useState<boolean>(true);
  const [isActive, setIsActive] = React.useState<boolean>(true);

  const [stepConfig, setStepConfig] = React.useState(INITIAL_STEP_CONFIG);

  const [isRoleAssignmentEnabled, setIsRoleAssignmentEnabled] = React.useState<boolean>(false);
  
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);

  const myImagesQuery = useAdminImagesQuery({ scope: 'mine' });

  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  const updateStep = useUpdateStep(wizardId, step?.id);
  const deleteStep = useDeleteStep(wizardId, step?.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleImageSelected = (imageUrl: string) => {
    setStepConfig(prev => ({ 
      ...prev, 
      presentation: { 
        ...(prev.presentation),
        backgroundType: 'image',
        backgroundValue: imageUrl
      } 
    }));
    setIsImageLibraryOpen(false);
  };

  const parseConfig = (config: Record<string, unknown> | undefined | null): { presentation: PresentationConfig, specific: Record<string, unknown> } => {
    const presentation = config?.presentation as PresentationConfig || {};
    const specific = config?.specific as Record<string, unknown> || INITIAL_SPECIFIC_CONFIG;
    return { 
        presentation: {
            headline: presentation.headline ?? null,
            subtitle: presentation.subtitle ?? null,
            backgroundType: presentation.backgroundType ?? null,
            backgroundValue: presentation.backgroundValue ?? null,
        },
        specific: specific
    };
  };

  const handleBackgroundTabChange = (newType: string) => {
    const type = newType as BackgroundType;
    setStepConfig(prev => {
      if (prev.presentation.backgroundType === type) {
        return prev;
      }
      return {
        ...prev,
        presentation: {
          ...prev.presentation,
          backgroundType: type,
          backgroundValue: null,
        }
      }
    });
  }

  const handleSpecificConfigChange = useCallback((newSpecificConfig: Record<string, unknown> | ContentSpecificConfigType | EnsSpecificConfig | QuizmasterBasicSpecificConfig | QuizmasterAiSpecificConfig) => {
    setStepConfig(prev => ({ ...prev, specific: newSpecificConfig as Record<string, unknown> }));
  }, []);

  // Main useEffect - Initializes step-level things 
  React.useEffect(() => {
    // Reset updateStep mutation status when step changes (createStepMutation is removed)
    updateStep.reset(); 

    if (step) {
      const shouldEnableRole = !!step.target_role_id;
      setTargetRoleId(step.target_role_id ?? '');
      setIsMandatory(step.is_mandatory);
      setIsActive(step.is_active);
      setStepConfig(parseConfig(step.config));
      setIsRoleAssignmentEnabled(shouldEnableRole);
    } else {
      setTargetRoleId('');
      setIsMandatory(true);
      setIsActive(true);
      setStepConfig(INITIAL_STEP_CONFIG);
      setIsRoleAssignmentEnabled(false);
    }
    setShowDeleteConfirm(false);
    setIsImageLibraryOpen(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const type = stepConfig.presentation.backgroundType;
    const value = stepConfig.presentation.backgroundValue;

    if (type === 'youtube' && typeof value === 'string') {
      if (youtubeUrlInput !== value) { 
          setYoutubeUrlInput(value || '');
      }
      setYoutubeError(null); 
    } else {
       if (youtubeUrlInput !== '') {
           setYoutubeUrlInput('');
       }
       setYoutubeError(null);
    }
  }, [stepConfig.presentation.backgroundType, stepConfig.presentation.backgroundValue, youtubeUrlInput]);

  const currentMutation = updateStep;

  const handleYouTubeUrlChange = (url: string) => {
    setYoutubeUrlInput(url);

    if (!url) {
      setYoutubeError(null);
      if (stepConfig.presentation.backgroundType === 'youtube') {
          setStepConfig(prev => ({
            ...prev,
            presentation: { ...prev.presentation, backgroundValue: null }
          }));
      }
      return;
    }

    if (isValidYouTubeUrl(url)) {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        setYoutubeError(null);
        setStepConfig(prev => ({
          ...prev,
          presentation: { 
            ...prev.presentation, 
            backgroundType: 'youtube', 
            backgroundValue: url
          }
        }));
      } else {
        setYoutubeError('Could not extract Video ID from URL.');
      } 
    } else {
      setYoutubeError('Please enter a valid YouTube URL (youtube.com or youtu.be).');
    }
  };

  const previewVideoId = (stepConfig.presentation.backgroundType === 'youtube' && typeof stepConfig.presentation.backgroundValue === 'string') 
      ? extractYouTubeVideoId(stepConfig.presentation.backgroundValue)
      : null;

  if (isSummaryPreview) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Wizard Summary Preview</h2>
        {summaryData ? (
           <AdminWizardSummaryPreview 
             includedStepTypes={summaryData.includedStepTypes}
             potentialRoles={summaryData.potentialRoles}
           />
        ) : (
           <div className="p-4 border rounded bg-muted/30">
             <p className="text-muted-foreground">Loading summary data...</p>
           </div>
        )}
      </div>
    );
  }

  if (!step) {
    return <div className="p-8 text-muted-foreground">Select a step to edit or add a new one.</div>;
  }

  const stepTypeInfo = stepTypesData?.step_types.find(t => t.id === step?.step_type_id);
  const roleOptions = roles;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step) return;

    const finalTargetRoleId = targetRoleId === '' ? null : targetRoleId;

    const updatePayload: Partial<Step> = {
      target_role_id: finalTargetRoleId,
      is_mandatory: isMandatory,
      is_active: isActive,
      config: stepConfig,
    }
    updateStep.mutate(updatePayload, {
      onSuccess: () => onSave && onSave(),
    });
  };

  const handleDelete = () => {
    if (!step) return;
    setShowDeleteConfirm(false);
    deleteStep.mutate(undefined, {
      onSuccess: () => onDelete && onDelete(),
    });
  };

  const isSaveDisabled = currentMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 flex flex-col gap-4">
      <div>
        <span className="text-xs font-semibold uppercase text-muted-foreground">Step Type</span>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block px-2 py-1 rounded bg-primary/10 text-primary font-medium text-sm capitalize">
            {stepTypeInfo ? (stepTypeInfo.label || stepTypeInfo.name.replace(/_/g, ' ')) : 'Unknown'}
          </span>
          {stepTypeInfo?.description && (
            <span className="text-xs text-muted-foreground ml-2">{stepTypeInfo.description}</span>
          )}
        </div>
      </div>
      
      <Accordion type="single" collapsible defaultValue="presentation-settings" className="w-full space-y-3 border-t border-border/30 pt-4 mt-4">
        <AccordionItem value="presentation-settings">
          <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
            Presentation (Headline & Subtitle)
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-2">
            <CommonStepPresentationSettings 
              initialData={stepConfig.presentation}
              onChange={(newPresentationConfig) => setStepConfig(prev => ({ ...prev, presentation: { ...prev.presentation, headline: newPresentationConfig.headline, subtitle: newPresentationConfig.subtitle } }))}
              disabled={currentMutation.isPending}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="background-settings">
           <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
             Background
           </AccordionTrigger>
           <AccordionContent className="pt-1 pb-2">
              <Tabs 
                 defaultValue="image" 
                 value={stepConfig.presentation.backgroundType ?? 'image'}
                 onValueChange={handleBackgroundTabChange}
                 className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4 h-9">
                  <TabsTrigger value="image" className="text-xs px-2">Image</TabsTrigger>
                  <TabsTrigger value="color" className="text-xs px-2">Solid Color</TabsTrigger>
                  <TabsTrigger value="gradient" className="text-xs px-2">Gradient</TabsTrigger>
                  <TabsTrigger value="youtube" className="text-xs px-2">YouTube</TabsTrigger>
                </TabsList>

                <TabsContent value="image" className="mt-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Label className="text-xs font-medium text-muted-foreground">Selected</Label>
                      <div 
                        className={cn(
                          "mt-1 border rounded-md overflow-hidden w-32 h-32 relative bg-muted",
                          stepConfig.presentation.backgroundType === 'image' && stepConfig.presentation.backgroundValue && "border-2 border-primary shadow-md"
                        )}
                      >
                        {stepConfig.presentation.backgroundType === 'image' && stepConfig.presentation.backgroundValue ? (
                          <Image 
                             src={stepConfig.presentation.backgroundValue}
                             alt="Selected background preview"
                             layout="fill"
                             objectFit="cover"
                             unoptimized
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic p-2 text-center">
                            No image selected
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-grow">
                       <Label className="text-xs font-medium text-muted-foreground">Recently Generated (Quick Select)</Label>
                       <div className="mt-1 flex gap-2 flex-wrap">
                          {myImagesQuery.isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>}
                          {myImagesQuery.isError && <AlertCircle className="h-5 w-5 text-destructive" />}
                          {myImagesQuery.data && myImagesQuery.data.images.length === 0 && (
                              <p className="text-xs text-muted-foreground italic">No recent images.</p>
                          )}
                          {myImagesQuery.data && myImagesQuery.data.images.slice(0, 3).map(img => (
                              <button 
                                type="button" 
                                key={img.id} 
                                onClick={() => handleImageSelected(img.storage_url)}
                                className="border rounded-md overflow-hidden w-16 h-16 relative bg-muted hover:ring-2 hover:ring-primary focus:ring-2 focus:ring-primary transition-shadow"
                                title="Select this image"
                              >
                                <Image 
                                   src={img.storage_url}
                                   alt="Recent image preview"
                                   layout="fill"
                                   objectFit="cover"
                                   unoptimized
                                />
                              </button>
                          ))}
                       </div>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    variant="default" 
                    size="sm" 
                    onClick={() => setIsImageLibraryOpen(true)} 
                    disabled={currentMutation.isPending}
                  >
                    {stepConfig.presentation.backgroundType === 'image' && stepConfig.presentation.backgroundValue 
                      ? 'Generate or choose another background image' 
                      : 'Generate or choose background image'}
                  </Button>
                </TabsContent>

                <TabsContent value="color" className="mt-4 space-y-4">
                  <div className="flex flex-col items-start gap-4 p-1">
                    <Label className="text-sm font-medium">Select Solid Background Color</Label>
                    <ColorPicker 
                       color={stepConfig.presentation.backgroundType === 'color' ? stepConfig.presentation.backgroundValue : '#ffffff'}
                       onChange={(newColor) => setStepConfig(prev => ({ 
                         ...prev,
                         presentation: {
                           ...prev.presentation,
                           backgroundType: 'color',
                           backgroundValue: newColor
                         }
                       }))}
                       label="Select solid background color"
                    />
                    {stepConfig.presentation.backgroundType === 'color' && stepConfig.presentation.backgroundValue && (
                        <div className="flex items-center gap-2">
                           <div 
                              className="h-6 w-6 rounded border border-border/50"
                              style={{ backgroundColor: stepConfig.presentation.backgroundValue }}
                           />
                           <code className="text-sm text-muted-foreground">{stepConfig.presentation.backgroundValue}</code>
                        </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="gradient" className="mt-4">
                   <div className="p-4 border rounded bg-muted/30">
                    <p className="text-sm text-muted-foreground italic">Gradient Generator Coming Soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="youtube" className="mt-4 space-y-3">
                    <div>
                        <Label htmlFor="youtube-url">YouTube Video URL</Label>
                        <Input 
                            id="youtube-url"
                            type="url" 
                            placeholder="https://www.youtube.com/watch?v=..." 
                            value={youtubeUrlInput}
                            onChange={(e) => setYoutubeUrlInput(e.target.value)}
                            onBlur={(e) => handleYouTubeUrlChange(e.target.value)}
                            className={cn(youtubeError && "border-destructive")}
                        />
                        {youtubeError && <p className="text-xs text-destructive mt-1">{youtubeError}</p>}
                    </div>
                    <div>
                        <Label className="text-sm font-medium mb-1 block">Preview</Label>
                        {previewVideoId ? (
                            <div className="aspect-video w-full max-w-sm border rounded overflow-hidden bg-black">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=0&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                                    title="YouTube video preview"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    style={{ border: 0 }}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32 w-full max-w-sm border rounded bg-muted text-sm text-muted-foreground">
                                {stepConfig.presentation.backgroundType === 'youtube' && stepConfig.presentation.backgroundValue ? 'Invalid or unsupported URL' : 'Enter URL to see preview'}
                            </div>
                        )}
                    </div>
                </TabsContent>
              </Tabs>
           </AccordionContent>
        </AccordionItem>

        <AccordionItem value="target-role">
          <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
             Target Role Assignment
          </AccordionTrigger>
          <AccordionContent className="pt-3 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="enable-role-assignment"
                checked={isRoleAssignmentEnabled}
                onCheckedChange={(checked) => {
                  const isEnabled = Boolean(checked);
                  setIsRoleAssignmentEnabled(isEnabled);
                  if (!isEnabled) {
                    setTargetRoleId('');
                  }
                }}
                disabled={currentMutation.isPending}
              />
              <Label 
                htmlFor="enable-role-assignment" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Assign a role upon step completion
              </Label>
            </div>

            {isRoleAssignmentEnabled && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Select the role to assign to the user.
                </p>
                <Select
                  onValueChange={(value) => setTargetRoleId(value)}
                  value={targetRoleId}
                  disabled={currentMutation.isPending}
                >
                  <SelectTrigger id="target_role_id">
                    <SelectValue placeholder="Select a role to grant" />
                  </SelectTrigger>
                  <SelectContent className="z-DROPDOWN">
                    {roleOptions.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {stepTypeInfo?.name === 'ens' && (
          <AccordionItem value="specific-config">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
               ENS Configuration
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <EnsStepConfig 
                initialData={stepConfig.specific as EnsSpecificConfig} 
                onChange={handleSpecificConfigChange}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {stepTypeInfo?.name === 'content' && (
          <AccordionItem value="specific-config">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
               Content Configuration
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <ContentStepConfig 
                value={stepConfig.specific as ContentSpecificConfigType}
                onChange={handleSpecificConfigChange}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {stepTypeInfo?.name === 'quizmaster_basic' && (
          <AccordionItem value="specific-config-quizmaster-basic">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
               Basic Quiz Configuration
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <QuizmasterBasicConfig 
                initialData={stepConfig.specific as Partial<QuizmasterBasicSpecificConfig>} 
                onChange={handleSpecificConfigChange}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {stepTypeInfo?.name === 'quizmaster_ai' && (
          <AccordionItem value="specific-config-quizmaster-ai">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
               AI Quizmaster Configuration
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <QuizmasterAiConfig 
                initialData={stepConfig.specific as Partial<QuizmasterAiSpecificConfig>} 
                onChange={handleSpecificConfigChange}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="sidequests">
          <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
            Sidequests Management
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-2">
            {step && wizardId && (
              <SidequestsManager 
                stepId={step.id} 
                wizardId={wizardId} 
              />
            )}
            {!step && (
              <p className="text-sm text-muted-foreground p-4">Select a step to manage its sidequests.</p>
            )}
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      <div className="space-y-3 border-t border-border/30 pt-4 mt-4">
        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-card/60">
          <div className="space-y-0.5">
            <Label htmlFor="is_active">Step Status</Label>
            <p className="text-xs text-muted-foreground">
              Inactive steps won&apos;t be shown to users. 
            </p>
          </div>
          <Switch
            id="step-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={currentMutation.isPending}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-card/60">
          <div className="space-y-0.5">
            <Label htmlFor="is_mandatory">Mandatory Step</Label>
            <p className="text-xs text-muted-foreground">
              Users must complete mandatory steps to finish the wizard.
            </p>
          </div>
          <Switch
            id="step-mandatory"
            checked={isMandatory}
            onCheckedChange={setIsMandatory}
            disabled={currentMutation.isPending}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          type="submit"
          disabled={isSaveDisabled}
        >
          {currentMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={deleteStep.isPending || !step}>
          Delete Step
        </Button>
      </div>
      {showDeleteConfirm && step && (
        <div className="bg-destructive/10 border border-destructive rounded p-3 mt-2 flex flex-col gap-2">
          <span className="text-destructive font-medium">Are you sure you want to delete this step?</span>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteStep.isPending}>Yes, Delete</Button>
            <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {currentMutation.isError && (
        <div className="text-destructive text-sm bg-destructive/10 rounded p-2 mt-2">
          Error: {currentMutation.error instanceof Error ? currentMutation.error.message : 'Failed to update step'}
        </div>
      )}
      {updateStep.isSuccess && (
        <div className="text-green-700 text-sm bg-green-100 rounded p-2 mt-2">Saved!</div>
      )}
      {deleteStep.isError && (
        <div className="text-destructive text-sm bg-destructive/10 rounded p-2 mt-2">
          Error: {deleteStep.error instanceof Error ? deleteStep.error.message : 'Failed to delete step'}
        </div>
      )}
      <ImageLibraryModal 
        isOpen={isImageLibraryOpen}
        onClose={() => setIsImageLibraryOpen(false)}
        onSelect={handleImageSelected}
        wizardId={wizardId}
        stepId={step?.id}
      />
    </form>
  );
}; 