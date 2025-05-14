import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedTextSpecificConfig } from "@/types/onboarding-steps";
import { useEffect, useState } from "react";

interface AnimatedTextConfigProps {
  initialData: AnimatedTextSpecificConfig;
  onChange: (config: AnimatedTextSpecificConfig) => void;
}

const AnimatedTextConfig: React.FC<AnimatedTextConfigProps> = ({ initialData, onChange }) => {
  const [text, setText] = useState(initialData?.text ?? '');

  useEffect(() => {
    setText(initialData?.text ?? '');
  }, [initialData]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setText(newText);
    onChange({ text: newText });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="animated-text-input">Text to Animate</Label>
      <Textarea
        id="animated-text-input"
        value={text}
        onChange={handleTextChange}
        placeholder="Enter the text you want to animate..."
        rows={3}
      />
      {/* 
        Future configuration options could be added here, for example:
        <Label htmlFor="animated-text-stroke-color">Stroke Color</Label>
        <Input id="animated-text-stroke-color" ... /> 
      */}
    </div>
  );
};

export default AnimatedTextConfig; 