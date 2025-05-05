import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Define the possible background types
export type BackgroundType = 'image' | 'color' | 'gradient' | 'youtube';

// Updated PresentationConfig structure
export interface PresentationConfig {
  headline?: string | null;
  subtitle?: string | null;
  backgroundType?: BackgroundType | null;
  backgroundValue?: string | null; 
  // Optional future extension
  // backgroundOptions?: Record<string, any> | null;
}

interface CommonStepPresentationSettingsProps {
  initialData?: PresentationConfig | null;
  onChange: (newConfig: PresentationConfig) => void;
  disabled?: boolean;
}

export const CommonStepPresentationSettings: React.FC<CommonStepPresentationSettingsProps> = ({
  initialData,
  onChange,
  disabled = false,
}) => {
  const [headline, setHeadline] = React.useState(initialData?.headline ?? '');
  const [subtitle, setSubtitle] = React.useState(initialData?.subtitle ?? '');
  // Keep track of background type/value from props, but don't render them here
  const backgroundType = initialData?.backgroundType;
  const backgroundValue = initialData?.backgroundValue;

  // Update local state for headline/subtitle if initialData changes
  React.useEffect(() => {
    setHeadline(initialData?.headline ?? '');
    setSubtitle(initialData?.subtitle ?? '');
    // No need to update background state locally as it's not edited here
  }, [initialData]);

  // Notify parent when local headline/subtitle state changes
  React.useEffect(() => {
    const newConfig: PresentationConfig = {
      headline: headline.trim() === '' ? null : headline,
      subtitle: subtitle.trim() === '' ? null : subtitle,
      // Pass through the existing background settings from initialData
      backgroundType: backgroundType ?? null,
      backgroundValue: backgroundValue ?? null,
    };
    onChange(newConfig);
    // Effect only depends on locally editable fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline, subtitle]); // Exclude backgroundType/Value/onChange

  return (
    // Renders only Headline and Subtitle inputs
    <div className="space-y-4">
       <div className="space-y-1.5">
         <Label htmlFor="step-headline">Headline (Optional)</Label>
         <Input 
           id="step-headline"
           value={headline}
           onChange={(e) => setHeadline(e.target.value)}
           placeholder="Enter an optional headline for this step"
           disabled={disabled}
           className="text-base"
         />
       </div>
       <div className="space-y-1.5">
         <Label htmlFor="step-subtitle">Subtitle (Optional)</Label>
         <Textarea 
           id="step-subtitle"
           value={subtitle}
           onChange={(e) => setSubtitle(e.target.value)}
           placeholder="Enter an optional subtitle or description for this step"
           disabled={disabled}
           rows={2}
           className="text-sm resize-none"
         />
       </div>
    </div>
  );
}; 