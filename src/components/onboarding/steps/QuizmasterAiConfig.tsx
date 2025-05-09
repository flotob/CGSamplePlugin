'use client';

import React, { useState, useEffect } from 'react';
import { 
  QuizmasterAiSpecificConfig,
  AIModelSettings 
} from '@/types/onboarding-steps'; // Adjust path if necessary

// Import shadcn/ui components as needed
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface QuizmasterAiConfigProps {
  initialData?: Partial<QuizmasterAiSpecificConfig>;
  onChange: (newConfig: QuizmasterAiSpecificConfig) => void;
}

const DEFAULT_MODEL_SETTINGS: AIModelSettings = {
  model: 'gpt-4o', // Or your preferred default model
  temperature: 0.7,
};

const QuizmasterAiConfig: React.FC<QuizmasterAiConfigProps> = ({ initialData, onChange }) => {
  const [knowledgeBase, setKnowledgeBase] = useState<string>('');
  const [agentPersonality, setAgentPersonality] = useState<string>('');
  const [taskChallenge, setTaskChallenge] = useState<string>('');
  const [modelSettings, setModelSettings] = useState<AIModelSettings>(DEFAULT_MODEL_SETTINGS);

  // Helper to build the config and call onChange
  const triggerOnChange = (updatedState: Partial<QuizmasterAiSpecificConfig>) => {
    const currentConfig: QuizmasterAiSpecificConfig = {
      knowledgeBase: updatedState.knowledgeBase !== undefined ? updatedState.knowledgeBase : knowledgeBase,
      agentPersonality: updatedState.agentPersonality !== undefined ? updatedState.agentPersonality : agentPersonality,
      taskChallenge: updatedState.taskChallenge !== undefined ? updatedState.taskChallenge : taskChallenge,
      aiModelSettings: updatedState.aiModelSettings !== undefined ? updatedState.aiModelSettings : modelSettings,
    };
    onChange(currentConfig);
  };

  // Initialize state from initialData
  useEffect(() => {
    if (initialData) {
      // Check against current state before setting to prevent unnecessary updates if possible
      if (initialData.knowledgeBase !== undefined && initialData.knowledgeBase !== knowledgeBase) {
        setKnowledgeBase(initialData.knowledgeBase || '');
      }
      if (initialData.agentPersonality !== undefined && initialData.agentPersonality !== agentPersonality) {
        setAgentPersonality(initialData.agentPersonality || '');
      }
      if (initialData.taskChallenge !== undefined && initialData.taskChallenge !== taskChallenge) {
        setTaskChallenge(initialData.taskChallenge || '');
      }
      if (initialData.aiModelSettings && JSON.stringify(initialData.aiModelSettings) !== JSON.stringify(modelSettings)) {
        setModelSettings(initialData.aiModelSettings || DEFAULT_MODEL_SETTINGS);
      } else if (!initialData.aiModelSettings && JSON.stringify(modelSettings) !== JSON.stringify(DEFAULT_MODEL_SETTINGS)) {
        setModelSettings(DEFAULT_MODEL_SETTINGS); // Reset to default if initialData has no settings
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); // Only run when initialData prop itself changes

  const handleKnowledgeBaseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setKnowledgeBase(newValue);
    triggerOnChange({ knowledgeBase: newValue });
  };

  const handleAgentPersonalityChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setAgentPersonality(newValue);
    triggerOnChange({ agentPersonality: newValue });
  };

  const handleTaskChallengeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setTaskChallenge(newValue);
    triggerOnChange({ taskChallenge: newValue });
  };

  const handleModelSettingChange = <K extends keyof AIModelSettings>(
    key: K,
    value: AIModelSettings[K]
  ) => {
    const newModelSettings = { ...modelSettings, [key]: value };
    setModelSettings(newModelSettings);
    triggerOnChange({ aiModelSettings: newModelSettings });
  };

  const handleModelTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tempStr = e.target.value;
    if (tempStr === '') {
      // Allow clearing temperature to fallback to undefined/default
      const newModelSettings = { ...modelSettings, temperature: undefined };
      setModelSettings(newModelSettings);
      triggerOnChange({ aiModelSettings: newModelSettings });
      return;
    }
    const temp = parseFloat(tempStr);
    const newTemp = isNaN(temp) ? undefined : Math.max(0, Math.min(2, temp));
    const newModelSettings = { ...modelSettings, temperature: newTemp };
    setModelSettings(newModelSettings);
    triggerOnChange({ aiModelSettings: newModelSettings });
  };

  const handleModelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value || undefined; // Ensure undefined if empty
    const newModelSettings = { ...modelSettings, model: newName };
    setModelSettings(newModelSettings);
    triggerOnChange({ aiModelSettings: newModelSettings });
  };

  return (
    <div className="space-y-6 p-1">
      <p className="text-sm text-muted-foreground">
        Configure the AI-powered quiz. Provide a knowledge base for the AI, define its personality, and set the task or challenge for the user.
      </p>

      <div className="space-y-2">
        <Label htmlFor="knowledgeBase">Knowledge Base</Label>
        <Textarea
          id="knowledgeBase"
          placeholder="Enter the factual content or text the AI will use to generate quiz questions..."
          value={knowledgeBase}
          onChange={handleKnowledgeBaseChange}
          rows={8}
          className="min-h-[150px]"
        />
        <p className="text-xs text-muted-foreground">
          This is the material the AI will quiz the user on. It can be plain text or Markdown.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="agentPersonality">AI Agent Personality</Label>
        <Textarea
          id="agentPersonality"
          placeholder="e.g., You are a friendly and encouraging tutor. OR You are a strict quizmaster testing for mastery..."
          value={agentPersonality}
          onChange={handleAgentPersonalityChange}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Describe the persona the AI should adopt (tone, behavior, instructions).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskChallenge">Task / Challenge Description</Label>
        <Textarea
          id="taskChallenge"
          placeholder="e.g., Ask the user 5 questions based on the knowledge base. The user must answer at least 3 correctly to pass. Call the markTestPassed function upon success."
          value={taskChallenge}
          onChange={handleTaskChallengeChange}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Specific instructions for the AI on how to conduct the quiz and when to consider it passed.
        </p>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="ai-model-settings">
          <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline">
            Advanced: AI Model Settings (Optional)
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aiModelName">Model Name</Label>
              <Input 
                id="aiModelName"
                placeholder="e.g., gpt-4o, gpt-3.5-turbo"
                value={modelSettings.model || ''}
                onChange={handleModelNameChange}
              />
              <p className="text-xs text-muted-foreground">
                Default is usually fine (e.g., gpt-4o or gpt-3.5-turbo).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aiModelTemperature">Temperature (0.0 - 2.0)</Label>
              <Input 
                id="aiModelTemperature"
                type="number"
                placeholder="e.g., 0.7"
                value={modelSettings.temperature === undefined ? '' : modelSettings.temperature}
                onChange={handleModelTemperatureChange}
                min="0" max="2" step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness. Lower is more deterministic, higher is more creative. Default: 0.7.
              </p>
            </div>
            {/* TODO: Add input for maxTokens if desired */}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default QuizmasterAiConfig; 