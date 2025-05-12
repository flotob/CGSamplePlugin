'use client';

import React, { useEffect, useState } from 'react';
import { useChat, type Message } from 'ai/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, MessageSquare, X, ChevronLeft } from 'lucide-react';
import { useAuthFetch } from '@/lib/authFetch';
import { WizardCreatedCard, StepAddedCard } from './function-cards';
import { useWizardEditorStore } from '@/stores/useWizardEditorStore';
import { ConversationSidebar } from './ConversationSidebar';
import { useAtom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { 
  conversationsAtom,
  activeConversationIdAtom,
  createConversationAtom,
  shouldStartNewConversationAtom,
  type ChatMessage,
  type Conversation,
  type ToolInvocation as StoredToolInvocation
} from '@/stores/useChatHistoryStore';

export const AdminAIChatView: React.FC = () => {
  const { authFetch } = useAuthFetch();
  const { openEditor } = useWizardEditorStore();
  const [isConversationPanelOpen, setIsConversationPanelOpen] = useState(false);
  
  // Chat history state - simplify to just what we need
  const [conversations, setConversations] = useAtom(conversationsAtom);
  const [activeConversationId, setActiveConversationId] = useAtom(activeConversationIdAtom);
  const [shouldStartNewConversation] = useAtom(shouldStartNewConversationAtom);
  const [, createNewConversation] = useAtom(createConversationAtom);
  
  // Function to handle opening the wizard step editor
  const handleOpenWizardEditor = (wizardId: string) => {
    console.log(`Opening step editor for wizard ID: ${wizardId}`);
    openEditor(wizardId);
  };

  // Function to handle opening a specific step editor
  const handleOpenStepEditor = (stepId: string, wizardId: string) => {
    console.log(`Opening step editor for step ID: ${stepId} in wizard: ${wizardId}`);
    openEditor(wizardId, stepId);
  };

  // Function to toggle the conversation panel
  const toggleConversationPanel = () => {
    setIsConversationPanelOpen(!isConversationPanelOpen);
  };

  // Get the active conversation from storage
  const activeConversation = activeConversationId ? conversations[activeConversationId] : null;

  // Get initial messages from the active conversation
  const initialMessages = React.useMemo(() => {
    if (!activeConversation) return [];
    
    return activeConversation.messages.map((msg): Message => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.timestamp),
      // Skip toolInvocations for now due to type incompatibility
      toolInvocations: undefined
    }));
  }, [activeConversation]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: aIHandleSubmit,
    isLoading,
    error,
    setMessages,
    id,
  } = useChat({
    api: '/api/admin/ai-assistant/chat',
    id: activeConversationId || undefined,
    initialMessages,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      return authFetch<Response>(input.toString(), {
        ...(init || {}),
        parseJson: false,
      });
    },
    onError: (err) => {
      console.error("[AdminAIChatView] Chat error:", err);
    },
    onFinish: () => {
      // Save entire conversation to storage after AI responds
      saveConversationToStorage();
    }
  });
  
  // Function to save the entire conversation to storage
  const saveConversationToStorage = () => {
    if (!activeConversationId || !messages.length) return;
    
    // Convert Messages to our storage format
    const storedMessages: ChatMessage[] = messages.map(msg => ({
      id: msg.id,
      // Cast to our restricted role type
      role: msg.role === 'user' || msg.role === 'assistant' 
        ? msg.role 
        : 'assistant', // Default fallback
      content: msg.content,
      timestamp: msg.createdAt?.getTime() || Date.now(),
      toolInvocations: msg.toolInvocations?.map(ti => ({
        toolCallId: ti.toolCallId,
        toolName: ti.toolName,
        args: ti.args,
        state: ti.state as 'pending' | 'result' | 'error',
        result: 'result' in ti ? ti.result : undefined
      } as StoredToolInvocation))
    }));
    
    // Update conversation in storage
    const conversation = conversations[activeConversationId];
    if (conversation) {
      const updatedConversation: Conversation = {
        ...conversation,
        messages: storedMessages,
        updatedAt: Date.now(),
        // Update title if needed
        title: conversation.title === 'New Conversation' && storedMessages.length > 0 && storedMessages[0].role === 'user'
          ? generateTitleFromMessage(storedMessages[0].content)
          : conversation.title
      };
      
      setConversations({
        ...conversations,
        [activeConversationId]: updatedConversation
      });
    }
  };
  
  // Generate a title from a message
  const generateTitleFromMessage = (content: string): string => {
    const MAX_TITLE_LENGTH = 30;
    const cleaned = content.trim().replace(/\s+/g, ' ');
    
    if (cleaned.length <= MAX_TITLE_LENGTH) {
      return cleaned;
    }
    
    return cleaned.substring(0, MAX_TITLE_LENGTH) + '...';
  };

  // When active conversation changes, reset chat state
  useEffect(() => {
    if (activeConversationId && id !== activeConversationId) {
      // For conversation switching, reload the page since useChat doesn't expose a proper reset method
      if (activeConversation?.messages?.length) {
        setMessages(initialMessages);
      } else {
        setMessages([]);
      }
      
      // Close the conversation panel after selecting a conversation
      setIsConversationPanelOpen(false);
    }
  }, [activeConversationId, id, activeConversation, initialMessages, setMessages]);

  // Check if we need to create a new conversation on component load
  useEffect(() => {
    if (!activeConversationId || shouldStartNewConversation) {
      const newId = createNewConversation();
      setActiveConversationId(newId);
      // Let the next effect handle loading the empty conversation
      
      // Close conversation panel for new conversations
      setIsConversationPanelOpen(false);
    }
  }, [activeConversationId, shouldStartNewConversation, createNewConversation, setActiveConversationId]);
  
  // Custom submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // If no active conversation, create a new one
    if (!activeConversationId) {
      const newId = createNewConversation();
      setActiveConversationId(newId);
      // Submit after updating state
      setTimeout(() => {
        aIHandleSubmit(e);
      }, 0);
    } else {
      // Let useChat handle the message display and API call
      aIHandleSubmit(e);
    }
    
    // After sending a user message, save the current state
    // This ensures the user message is saved even if the AI errors out
    setTimeout(() => {
      saveConversationToStorage();
    }, 100);
    
    // Close conversation panel when sending a message
    setIsConversationPanelOpen(false);
  };

  // Count total conversations
  const conversationCount = Object.keys(conversations).length;

  return (
    <div className="relative flex flex-col h-full">
      {/* History Button and Conversation Count */}
      <div className="absolute top-2 left-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs flex items-center gap-1 px-3 py-1 h-8 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15"
          onClick={toggleConversationPanel}
          title={isConversationPanelOpen ? "Close conversation history" : "View conversation history"}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Conversations</span>
          {conversationCount > 0 && (
            <span className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full text-xs px-1.5 py-0.5 min-w-5 text-center">
              {conversationCount}
            </span>
          )}
        </Button>
      </div>
      
      {/* Conversations Panel (Slide-out) */}
      <div 
        className={`
          absolute top-0 left-0 bottom-0 z-20 
          w-72 bg-gradient-to-br from-card to-card/95 shadow-lg border-r
          transform transition-transform duration-200 ease-in-out
          ${isConversationPanelOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Conversation History</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={toggleConversationPanel}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-[calc(100%-3rem)]">
          <ConversationSidebar 
            className="border-none" 
            onConversationSelect={() => setIsConversationPanelOpen(false)} 
          />
        </div>
      </div>
      
      {/* Click-away overlay when panel is open */}
      {isConversationPanelOpen && (
        <div 
          className="absolute inset-0 bg-black/20 z-10"
          onClick={() => setIsConversationPanelOpen(false)}
        />
      )}
      
      {/* Chat Area */}
      <div className="flex flex-col flex-1 h-full bg-gradient-to-b from-background to-background/95">
        {/* Message List Area */}
        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
            </div>
          )}
          {messages.map((m: Message) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`p-3 rounded-lg max-w-[80%] shadow-sm \\\n                ${m.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
                  } \\\n                ${m.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`
                }
              >
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{typeof m.content === 'string' ? m.content : JSON.stringify(m.content, null, 2)}</pre>
                
                {/* Render tool invocations with custom components */}
                {m.toolInvocations && m.toolInvocations.map((toolInvocation, index: number) => {
                  const { toolName, toolCallId, state } = toolInvocation;
                  
                  // Check for createWizard successful result
                  if (state === 'result' && toolName === 'createWizard' && 'result' in toolInvocation && toolInvocation.result?.success) {
                    const { wizardId, wizardName, communityId } = toolInvocation.result;
                    return (
                      <WizardCreatedCard
                        key={toolCallId}
                        wizardId={wizardId}
                        wizardName={wizardName}
                        communityId={communityId}
                        onOpenEditor={handleOpenWizardEditor}
                      />
                    );
                  }
                  
                  // Check for addWizardStep successful result
                  if (state === 'result' && toolName === 'addWizardStep' && 'result' in toolInvocation && toolInvocation.result?.success) {
                    const { stepId, wizardId, stepOrder } = toolInvocation.result;
                    return (
                      <StepAddedCard
                        key={toolCallId}
                        stepId={stepId}
                        wizardId={wizardId}
                        stepOrder={stepOrder}
                        stepTypeId={toolInvocation.result.stepTypeId || toolInvocation.result.step_type_id || ''}
                        onOpenStepEditor={handleOpenStepEditor}
                      />
                    );
                  }
                  
                  // Default rendering for other tool invocations
                  return (
                    <div key={index} className="mt-2 p-2 border border-blue-500/30 bg-blue-500/10 rounded">
                      {state === 'result' ? (
                        <>
                          <div className="text-xs text-muted-foreground mb-1">Tool Result: {toolName}</div>
                          <pre className="text-xs whitespace-pre-wrap">{
                            'result' in toolInvocation 
                            ? JSON.stringify(toolInvocation.result, null, 2)
                            : 'No result available'
                          }</pre>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                            <span>Executing {toolName}...</span>
                          </div>
                          <div className="mt-1">
                            Args: <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(toolInvocation.args, null, 2)}</pre>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {isLoading && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-2 mx-4 mb-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <p>Error: {error.message}</p>
          </div>
        )}

        {/* Input Form Area */}
        <form onSubmit={handleSubmit} className="p-3 flex items-center gap-2 border-t">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={isLoading ? "AI is thinking..." : "Ask the admin AI..."}
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="sm">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
}; 