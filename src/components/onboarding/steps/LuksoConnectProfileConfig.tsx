// src/components/onboarding/steps/LuksoConnectProfileConfig.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface LuksoConnectProfileSpecificConfig {
  customPrompt?: string | null;
}

interface LuksoConnectProfileConfigProps {
  initialData: Partial<LuksoConnectProfileSpecificConfig>;
  onChange: (config: LuksoConnectProfileSpecificConfig) => void;
  disabled?: boolean;
}

const LuksoConnectProfileConfig: React.FC<LuksoConnectProfileConfigProps> = ({
  initialData,
  onChange,
  disabled,
}) => {
  const [customPrompt, setCustomPrompt] = useState(initialData?.customPrompt ?? '');

  useEffect(() => {
    setCustomPrompt(initialData?.customPrompt ?? '');
  }, [initialData]);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newPrompt = e.target.value;
      setCustomPrompt(newPrompt);
      onChange({ customPrompt: newPrompt || null });
    },
    [onChange]
  );

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="lukso-custom-prompt" className="text-sm font-medium">
          Custom Prompt Message (Optional)
        </Label>
        <p className="text-xs text-muted-foreground mb-1">
          This message will be displayed to the user on the connection step.
        </p>
        <Textarea
          id="lukso-custom-prompt"
          value={customPrompt}
          onChange={handlePromptChange}
          placeholder="e.g., Connect your LUKSO Universal Profile to verify your identity."
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>
      {/* Add other minimal configurations here if needed in the future */}
    </div>
  );
};

export default LuksoConnectProfileConfig; 