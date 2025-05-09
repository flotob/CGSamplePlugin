'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  QuizmasterAiSpecificConfig, 
  // QuizmasterAiVerifiedData // Will be needed for displaying results if step is already completed
} from '@/types/onboarding-steps';
import type { UserStepProgress } from '@/app/api/user/wizards/[id]/steps/route'; // Assuming this is the correct path
import { useChat, type Message as VercelAIMessage } from '@ai-sdk/react'; // Correct import for useChat and Message
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { useAuthFetch } from '@/lib/authFetch'; // Import useAuthFetch

// Import shadcn/ui components (add as needed)
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from 'lucide-react';

interface QuizmasterAiDisplayProps {
  step: UserStepProgress; // Ensure this type includes id, wizard_id, config.specific, completed_at
  onComplete: () => void;
}

// Type guard to check if specific config is QuizmasterAiSpecificConfig
function isQuizmasterAiConfig(config: any): config is QuizmasterAiSpecificConfig {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.knowledgeBase === 'string' &&
    typeof config.agentPersonality === 'string' &&
    typeof config.taskChallenge === 'string'
  );
}

const QuizmasterAiDisplay: React.FC<QuizmasterAiDisplayProps> = ({ step, onComplete }) => {
  const [quizPassed, setQuizPassed] = useState<boolean>(!!step.completed_at);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { jwt } = useAuth(); // Get JWT from AuthContext
  const { authFetch } = useAuthFetch(); // Get your authenticated fetch function

  // Safely extract and validate the specific configuration for the AI quiz
  const aiStepConfig = useMemo(() => {
    const specificConfig = step.config?.specific;
    if (isQuizmasterAiConfig(specificConfig)) {
      return specificConfig;
    }
    console.warn('QuizmasterAI: Step specific config is invalid or missing.', step.config?.specific);
    return null;
  }, [step.config?.specific]);

  const systemMessage = useMemo<VercelAIMessage | null>(() => {
    if (!aiStepConfig) return null;
    return {
      id: 'system-instructions',
      role: 'system',
      content: 
        `You are a quizmaster. ` +
        `Your personality is: ${aiStepConfig.agentPersonality}. ` +
        `The knowledge base you must use is: "${aiStepConfig.knowledgeBase}". ` +
        `Your task is: "${aiStepConfig.taskChallenge}". ` +
        `If the user successfully completes the task, you MUST call the 'markTestPassed' tool. Do not ask for confirmation before calling it.`
    };
  }, [aiStepConfig]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    id: `quiz-${step.id}`,
    api: '/api/onboarding/quizmaster/chat', // useChat uses this to construct the first arg for fetch
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      // The `input` from useChat is the URL (string or URL object).
      // The `init` from useChat contains method, headers (like Content-Type), and body.
      const url = typeof input === 'string' ? input : input.toString();
      
      // Call authFetch, which will add Authorization header and handle the request.
      // Ensure it returns a raw Response for useChat stream handling.
      return authFetch<Response>(url, {
        ...(init || {}), // Spread provided init, or empty object if init is undefined
        parseJson: false // Tell authFetch to return the raw Response
      });
    },
    body: { // This data gets merged by useChat into the request body it sends to `fetch` (in init.body)
      wizardId: step.wizard_id,
      stepId: step.id,
      stepConfig: aiStepConfig,
    },
    initialMessages: systemMessage ? [systemMessage] : [],
    onFinish: (message) => {
      console.log('useChat onFinish, last message:', message);
    }
  });

  // Effect to auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Effect: monitor messages for the tool result indicating quiz passed
  useEffect(() => {
    if (!quizPassed && !step.completed_at) { // Only run if not already marked passed
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg && lastAssistantMsg.toolInvocations && lastAssistantMsg.toolInvocations.length > 0) {
        for (const toolInvocation of lastAssistantMsg.toolInvocations) {
          // Try checking state === 'result' as per the ai-chat-guidance.md document.
          // The Vercel AI SDK ToolInvocation type typically has state as 'tool-result' when a result is present.
          // If this still causes issues, we may need to inspect the exact type of toolInvocation at runtime.
          if (toolInvocation.toolName === 'markTestPassed' && (toolInvocation as any).state === 'result') {
            // Accessing toolInvocation.result. The result type is unknown from the SDK side.
            const executionResult = (toolInvocation as any).result as { success?: boolean; errorForAI?: string; messageForAI?: string };
            if (executionResult && executionResult.success === true) {
              console.log('QuizmasterAI: markTestPassed tool call successful, marking quiz as passed.');
              setQuizPassed(true);
              if (onComplete) onComplete();
              break; // Exit loop once handled
            }
          }
        }
      }
    }
  }, [messages, quizPassed, onComplete, step.completed_at]);

  // Effect to handle if the step is already completed when mounted (e.g. user re-visits)
  useEffect(() => {
    if (step.completed_at && !quizPassed) {
      console.log('QuizmasterAI: Step already completed on mount.');
      setQuizPassed(true);
      // onComplete should ideally not be called again if it was for the initial completion.
      // This effect primarily sets the UI state.
    }
  }, [step.completed_at, quizPassed]);
  
  // Handle case where AI config is not valid
  if (!aiStepConfig) {
    // Optionally, if this is an unrecoverable state, call onComplete immediately
    // useEffect(() => { onComplete(); }, [onComplete]); 
    return (
      <Card className="w-full p-4">
        <CardHeader>
          <CardTitle className="text-destructive">Configuration Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">AI Quiz configuration is missing or invalid. Please contact an administrator.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Handle missing JWT if chat is supposed to be active
  if (!jwt && !quizPassed && !step.completed_at && aiStepConfig) {
    return (
      <Card className="w-full max-w-2xl mx-auto p-4">
        <CardHeader><CardTitle className="text-destructive">Authentication Error</CardTitle></CardHeader>
        <CardContent><p>You need to be authenticated to start the AI Quiz. Please ensure you are logged in.</p></CardContent>
      </Card>
    );
  }
  
  // UI for when quiz is passed (either by current interaction or already completed)
  if (quizPassed) {
    return (
      <Card className="w-full p-4 text-center">
        <CardHeader>
          <CardTitle>Quiz Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <p className="text-muted-foreground">You have successfully completed this quiz.</p>
          {/* TODO: Optionally show results from step.verified_data if needed */}
        </CardContent>
        {/* Optionally, add a button to proceed if onComplete doesn't auto-navigate */}
      </Card>
    );
  }

  // Main Chat UI
  return (
    <Card className="w-full max-w-2xl mx-auto flex flex-col h-[70vh]">
      <CardHeader>
        <CardTitle>AI Quizmaster</CardTitle>
        <CardDescription>
          Interact with the AI to complete the quiz.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          {messages
            .filter(msg => msg.role !== 'system') // Filter out system messages from rendering
            .map(msg => (
            <div key={msg.id} className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`p-3 rounded-lg max-w-[80%] break-words 
                  ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                  // ${msg.role === 'system' ? 'bg-amber-100 text-amber-800 text-xs italic p-2' : ''} // System style no longer needed here
                `}
              >
                {typeof msg.content === 'string' ? msg.content : 
                  (msg.content as Array<{type: string, text?: string, tool_invocation?: any}>)
                  .map((part, index) => part.type === 'text' ? part.text : null)
                  .filter(Boolean).join('\n')
                }
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input 
            value={input}
            onChange={handleInputChange}
            placeholder={isLoading ? "AI is thinking..." : "Type your answer..."}
            disabled={isLoading || quizPassed}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || quizPassed || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
        </form>
      </CardFooter>
      {error && (
        <div className="p-4 text-center text-xs text-destructive">
          <p>Error: {error.message}</p>
        </div>
      )}
    </Card>
  );
};

export default QuizmasterAiDisplay; 