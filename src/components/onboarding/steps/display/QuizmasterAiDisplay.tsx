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
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, SendHorizonal, Bot, User, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface QuizmasterAiDisplayProps {
  step: UserStepProgress; // Ensure this type includes id, wizard_id, config.specific, completed_at
  onComplete: () => void;
}

// Improved Type Guard
function isQuizmasterAiConfig(config: unknown): config is QuizmasterAiSpecificConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'knowledgeBase' in config && typeof (config as { knowledgeBase: unknown }).knowledgeBase === 'string' &&
    'agentPersonality' in config && typeof (config as { agentPersonality: unknown }).agentPersonality === 'string' &&
    'taskChallenge' in config && typeof (config as { taskChallenge: unknown }).taskChallenge === 'string'
  );
}

// Unused interface
// interface VercelAIMessageWithPotentialToolId extends VercelAIMessage {
//   toolCallId?: string;
// }

// Unused interface
// interface MarkTestPassedToolResult {
//   success?: boolean;
//   errorForAI?: string;
//   messageForAI?: string;
// }

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

  // Create a ref for the messages container
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Effect to handle scrolling when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Add a useEffect to ensure initial scroll position is at the bottom when first rendered
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // Improved useEffect to detect successful tool call based on research AI's guidance
  useEffect(() => {
    if (!quizPassed && !step.completed_at) {  // only run if we haven't already marked the quiz as passed
      const toolResultFound = messages.some(message =>
        message.role === 'assistant' &&
        message.parts?.some(part =>
          part.type === 'tool-invocation' &&
          part.toolInvocation.toolName === 'markTestPassed' &&
          part.toolInvocation.state === 'result' // Check for the 'result' state
        )
      );
      if (toolResultFound) {
        console.log('QuizmasterAI: markTestPassed tool invocation resulted, marking quiz as passed.');
        setQuizPassed(true);
        if (onComplete) onComplete();
      }
    }
  }, [messages, quizPassed, onComplete, step.completed_at]);

  // Effect to handle if the step is already completed when mounted (e.g. user re-visits)
  useEffect(() => {
    if (step.completed_at && !quizPassed) {
      console.log('QuizmasterAI: Step already completed on mount or after revalidation.');
      setQuizPassed(true);
      // onComplete should ideally not be called again if it was for the initial completion.
      // This effect primarily sets the UI state.
    }
  }, [step.completed_at, quizPassed]);
  
  // Handle case where AI config is not valid
  if (!aiStepConfig) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center pt-8 pb-4 px-2">
        <div className="relative max-w-lg w-full text-center animate-in fade-in-0 duration-300">
          <div className="absolute inset-0 -z-10 bg-background/30 dark:bg-background/20 backdrop-blur-md rounded-2xl shadow-sm"></div>
          
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-destructive">Configuration Error</h2>
            <p className="text-muted-foreground">
              AI Quiz configuration is missing or invalid. Please contact an administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Handle missing JWT if chat is supposed to be active
  if (!jwt && !quizPassed && !step.completed_at && aiStepConfig) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center pt-8 pb-4 px-2">
        <div className="relative max-w-lg w-full text-center animate-in fade-in-0 duration-300">
          <div className="absolute inset-0 -z-10 bg-background/30 dark:bg-background/20 backdrop-blur-md rounded-2xl shadow-sm"></div>
          
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-destructive">Authentication Error</h2>
            <p className="text-muted-foreground">
              You need to be authenticated to start the AI Quiz. Please ensure you are logged in.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // UI for when quiz is passed (either by current interaction or already completed)
  if (quizPassed) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center pt-8 pb-4 px-2">
        <div className="relative max-w-lg w-full text-center animate-in fade-in-0 duration-300">
          <div 
            className="absolute inset-0 -z-10 bg-background/60 dark:bg-background/50 backdrop-blur-lg rounded-2xl shadow-sm border border-border/40 dark:border-border/20"
            style={{
              WebkitBackdropFilter: 'blur(16px)',
              transform: 'translateZ(0)',
            }}
          ></div>
          
          <div className="p-6 space-y-6 relative z-10">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Quiz Complete!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Great job! You've demonstrated your knowledge and completed this AI-powered quiz successfully.
              </p>
            </div>
            
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 text-md px-4 py-1">
              Passed
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat UI with improved scrolling
  return (
    <div className="flex flex-col h-full w-full pt-4 pb-4 px-2">
      <div className="w-full max-w-2xl mx-auto h-full flex flex-col">
        {/* Reset button */}
        <div className="flex justify-end mb-2 sticky top-0 z-10">
          {messages.length > 1 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => reload()} 
              disabled={isLoading}
              className="h-7 w-7 rounded-full p-0 bg-background/20 backdrop-blur-sm"
              title="Restart Chat"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        {/* Messages container - flex-grow to take available space */}
        <div 
          ref={messagesContainerRef}
          className="flex-grow overflow-y-auto mb-3 pr-1 custom-scrollbar flex flex-col"
          style={{ 
            overscrollBehavior: 'contain',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
            justifyContent: 'flex-end', // Push messages to the bottom
          }}
        >
          <div className="flex flex-col space-y-4 w-full">
            {/* Welcome message when there are no messages */}
            {messages.filter(message => message.role !== 'system').length === 0 && (
              <div className="flex justify-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 dark:bg-primary/20 backdrop-blur-sm flex items-center justify-center mr-2 flex-shrink-0 ring-1 ring-foreground/5 shadow-sm">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                
                <div className="px-4 py-3 rounded-lg max-w-[85%] shadow-sm animate-in bg-muted/80 backdrop-blur-sm text-foreground rounded-tl-none slide-in-from-left-1 duration-150 ring-1 ring-foreground/5">
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    👋 Welcome to the quiz! Introduce yourself to the Quizmaster to start the game.
                  </p>
                </div>
              </div>
            )}
            
            {/* Regular messages */}
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
                    .join('\n'); // Use newline instead of space to preserve line breaks
                }

                // Remove our previous custom transformations that were breaking markdown
                // Let ReactMarkdown handle the formatting properly
                
                return (
                  <div
                    key={message.id || index}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar for assistant messages */}
                    {!isUser && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 dark:bg-primary/20 backdrop-blur-sm flex items-center justify-center mr-2 flex-shrink-0 ring-1 ring-foreground/5 shadow-sm">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    
                    <div
                      className={`px-4 py-3 rounded-lg max-w-[85%] shadow-sm animate-in ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-none slide-in-from-right-1 duration-150'
                          : 'bg-muted/80 backdrop-blur-sm text-foreground rounded-tl-none slide-in-from-left-1 duration-150 ring-1 ring-foreground/5'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              // Configure components to handle line breaks and lists properly
                              p: ({/*node,*/ ...props}) => <p className="mb-2 whitespace-pre-line" {...props} />,
                              ul: ({/*node,*/ ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                              ol: ({/*node,*/ ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                              li: ({/*node,*/ ...props}) => <li className="my-1" {...props} />
                            }}
                          >
                            {content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    
                    {/* Avatar for user messages */}
                    {isUser && (
                      <div className="h-8 w-8 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center ml-2 flex-shrink-0 shadow-sm">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            
            {/* Typing indicator when loading */}
            {isLoading && (
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary/10 dark:bg-primary/20 backdrop-blur-sm flex items-center justify-center mr-2 flex-shrink-0 ring-1 ring-foreground/5 shadow-sm">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="px-4 py-3 rounded-lg bg-muted/80 backdrop-blur-sm max-w-[85%] flex items-center space-x-1 rounded-tl-none shadow-sm ring-1 ring-foreground/5">
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Input form - now part of the flex layout */}
        <div className="py-2 px-1">
          <form onSubmit={handleSubmit} className="flex w-full space-x-2 relative">
            <div className="absolute inset-0 bg-background/40 dark:bg-background/30 backdrop-blur-md rounded-xl -z-10 shadow-sm"></div>
            <Input 
              value={input}
              onChange={handleInputChange}
              placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
              disabled={isLoading}
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
        
        {error && (
          <div className="absolute bottom-20 left-0 right-0 mx-2 px-4 py-2 bg-destructive/10 text-destructive text-xs text-center rounded-lg backdrop-blur-sm">
            <p>Error: {error.message}</p>
          </div>
        )}
        
        {/* Keep the ref for scrolling */}
        <div ref={messagesEndRef} className="sr-only"></div>
      </div>
    </div>
  );
};

export default QuizmasterAiDisplay; 