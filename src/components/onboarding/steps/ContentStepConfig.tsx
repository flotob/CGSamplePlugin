import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea component exists

// Define the expected structure for the 'specific' config of a content step
export interface ContentSpecificConfig {
  content?: string; // Making content optional initially
}

interface ContentStepConfigProps {
  value: ContentSpecificConfig | undefined; // The current specific config
  onChange: (newConfig: ContentSpecificConfig) => void; // Callback to update the config
}

export const ContentStepConfig: React.FC<ContentStepConfigProps> = ({
  value,
  onChange,
}) => {
  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ content: event.target.value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="content-input">Slide Content (Markdown supported)</Label>
        <Textarea
          id="content-input"
          placeholder="Enter your content here. You can use Markdown for formatting."
          value={value?.content || ''}
          onChange={handleContentChange}
          rows={10} // Adjust rows as needed
          className="mt-1"
        />
        <p className="text-sm text-muted-foreground mt-1">
          You can use standard Markdown syntax for text formatting, links, lists, etc.
        </p>
      </div>
    </div>
  );
};

// Export the config type for use in StepEditor
export type { ContentSpecificConfig as ContentSpecificConfigType }; 