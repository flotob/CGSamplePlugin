import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea component exists

// Define the structure for the specific config of a content step
export interface ContentSpecificConfig {
  title?: string | null;
  body?: string | null;
}

interface ContentStepConfigProps {
  initialData?: ContentSpecificConfig | null;
  onChange: (newConfig: Record<string, unknown>) => void;
  disabled?: boolean;
}

export const ContentStepConfig: React.FC<ContentStepConfigProps> = ({
  initialData,
  onChange,
  disabled = false,
}) => {
  // Extract values from initialData or use defaults
  const title = initialData?.title || '';
  const body = initialData?.body || '';

  // Handler for title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...initialData,
      title: e.target.value || null, // Store null if empty
    });
  };

  // Handler for body changes
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      ...initialData,
      body: e.target.value || null, // Store null if empty
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/20">
      <div className="space-y-1.5">
        <Label htmlFor="content-title">Display Title (Optional)</Label>
        <Input
          id="content-title"
          value={title}
          onChange={handleTitleChange}
          placeholder="Enter a prominent title for the slide"
          disabled={disabled}
          className="text-lg" // Make title input slightly larger?
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="content-body">Display Body Text (Optional)</Label>
         <p className="text-xs text-muted-foreground">
           Enter the main content for the slide. Markdown might be supported in the future.
         </p>
        <Textarea
          id="content-body"
          value={body}
          onChange={handleBodyChange}
          placeholder="Enter the main body text..."
          disabled={disabled}
          rows={6} // Give some decent space
          className="mt-1"
        />
      </div>
    </div>
  );
}; 