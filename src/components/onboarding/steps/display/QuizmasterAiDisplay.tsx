'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Loader2, CheckCircle2, SendHorizonal, Bot, User, RefreshCcw } from 'lucide-react';
import { Separator } from "@/components/ui/separator";

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

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, reload } = useChat({
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
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Card className="w-full max-w-2xl shadow-md">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-destructive">Configuration Error</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p>AI Quiz configuration is missing or invalid. Please contact an administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Handle missing JWT if chat is supposed to be active
  if (!jwt && !quizPassed && !step.completed_at && aiStepConfig) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Card className="w-full max-w-2xl shadow-md">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-destructive">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p>You need to be authenticated to start the AI Quiz. Please ensure you are logged in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // UI for when quiz is passed (either by current interaction or already completed)
  if (quizPassed) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Card className="w-full max-w-2xl shadow-md overflow-hidden animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
          <CardHeader className="bg-muted text-center pb-6">
            <CardTitle className="text-2xl font-bold">Quiz Complete!</CardTitle>
            <CardDescription>
              You have successfully completed this challenge.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-center text-muted-foreground max-w-md">
              Great job! You've demonstrated your knowledge and completed this AI-powered quiz successfully.
            </p>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-md px-4 py-1">
              Passed
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Chat UI
  return (
    <div className="flex items-center justify-center h-full w-full">
      <Card className="w-full max-w-2xl shadow-md h-[70vh] flex flex-col animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
        <CardHeader className="bg-card/60 pb-2 flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Bot className="mr-2 h-5 w-5" /> 
                AI Quizmaster
              </CardTitle>
              <CardDescription className="mt-1">
                Answer the AI's questions to complete this challenge
              </CardDescription>
            </div>
            {messages.length > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => reload()} 
                disabled={isLoading}
                className="h-8 w-8 p-0"
                title="Restart Chat"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0 overflow-hidden flex-grow">
          <ScrollArea className="h-full p-4">
            {messages
              .filter(message => message.role !== 'system') // Don't display system messages
              .map((message, index) => {
                const isUser = message.role === 'user';
                
                // Handle message content that could be string or array
                let content = '';
                if (typeof message.content === 'string') {
                  content = message.content;
                } else if (Array.isArray(message.content)) {
                  // Only render text parts for now
                  content = (message.content as Array<{ type: string; text: string }>)
                    .filter(part => part.type === 'text')
                    .map(part => part.text)
                    .join(' ');
                }
                
                return (
                  <div
                    key={message.id || index}
                    className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar for assistant messages */}
                    {!isUser && (
                      <div className="h-8 w-8 rounded-full bg-primary-foreground flex items-center justify-center mr-2 flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    
                    <div
                      className={`px-4 py-3 rounded-lg max-w-[80%] ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-muted text-foreground rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{content}</p>
                    </div>
                    
                    {/* Avatar for user messages */}
                    {isUser && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center ml-2 flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
              
            {/* Typing indicator when loading */}
            {isLoading && (
              <div className="flex items-center mb-4">
                <div className="h-8 w-8 rounded-full bg-primary-foreground flex items-center justify-center mr-2 flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="px-4 py-3 rounded-lg bg-muted max-w-[80%] flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            
            {/* Empty div for scrolling to bottom */}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="p-4 border-t flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex w-full space-x-2">
            <Input 
              value={input}
              onChange={handleInputChange}
              placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
              disabled={isLoading}
              className="flex-1 bg-background/80 backdrop-blur-sm"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="px-3"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
        
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs text-center">
            <p>Error: {error.message}</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default QuizmasterAiDisplay; 