import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

export interface PresentationConfig {
  headline?: string | null;
  subtitle?: string | null;
  backgroundImageUrl?: string | null;
  // Future: background_url?: string | null;
  // Future: background_color?: string | null;
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
  const [backgroundImageUrl, setBackgroundImageUrl] = React.useState(initialData?.backgroundImageUrl ?? '');

  // Update local state if initialData changes
  React.useEffect(() => {
    setHeadline(initialData?.headline ?? '');
    setSubtitle(initialData?.subtitle ?? '');
    setBackgroundImageUrl(initialData?.backgroundImageUrl ?? '');
  }, [initialData]);

  // Notify parent when local state changes
  React.useEffect(() => {
    const newConfig: PresentationConfig = {
      headline: headline.trim() === '' ? null : headline,
      subtitle: subtitle.trim() === '' ? null : subtitle,
      backgroundImageUrl: backgroundImageUrl.trim() === '' ? null : backgroundImageUrl,
    };
    onChange(newConfig);
    // Run effect only when relevant state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline, subtitle, backgroundImageUrl]);

  return (
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
       <div className="space-y-1.5 pt-4 border-t">
         <Label htmlFor="step-background-url">Background Image</Label>
         <Input 
           id="step-background-url"
           value={backgroundImageUrl}
           readOnly
           placeholder="No background image selected"
           disabled={disabled}
           className="text-sm bg-muted/50"
         />
         {backgroundImageUrl && (
           <div className="mt-2 border rounded-md overflow-hidden w-32 h-32 relative bg-muted">
             <Image 
                src={backgroundImageUrl}
                alt="Background preview"
                layout="fill"
                objectFit="cover"
                unoptimized
             />
           </div>
         )}
       </div>
    </div>
  );
}; 