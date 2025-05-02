import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface PresentationConfig {
  headline?: string | null;
  subtitle?: string | null;
  // Future: background_url?: string | null;
  // Future: background_color?: string | null;
}

interface CommonStepPresentationSettingsProps {
  initialData?: PresentationConfig | null;
  onChange: (newConfig: Record<string, unknown>) => void;
  disabled?: boolean;
}

export const CommonStepPresentationSettings: React.FC<CommonStepPresentationSettingsProps> = ({
  initialData,
  onChange,
  disabled = false,
}) => {
  const [headline, setHeadline] = React.useState(initialData?.headline ?? '');
  const [subtitle, setSubtitle] = React.useState(initialData?.subtitle ?? '');

  // Update local state if initialData changes (e.g., switching steps)
  React.useEffect(() => {
    setHeadline(initialData?.headline ?? '');
    setSubtitle(initialData?.subtitle ?? '');
  }, [initialData]);

  // Notify parent when local state changes
  React.useEffect(() => {
    onChange({
      headline: headline.trim() === '' ? null : headline,
      subtitle: subtitle.trim() === '' ? null : subtitle,
    });
    // Run effect only when headline or subtitle changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline, subtitle]); // We deliberately exclude onChange here to avoid potential loops if parent re-renders

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
       {/* Placeholder for future background settings */}
    </div>
  );
}; 