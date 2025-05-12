'use client';

import React from 'react';
import { useChat, type Message } from 'ai/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthFetch } from '@/lib/authFetch';
import { WizardCreatedCard, StepAddedCard } from './function-cards';
import { useWizardEditorStore } from '@/stores/useWizardEditorStore';

export const AdminAIChatView: React.FC = () => {
  const { authFetch } = useAuthFetch();
  const { openEditor } = useWizardEditorStore();
  
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

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/admin/ai-assistant/chat',
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      return authFetch<Response>(input.toString(), {
        ...(init || {}),
        parseJson: false,
      });
    },
    onError: (err) => {
      console.error("[AdminAIChatView] Chat error:", err);
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
          </div>
        )}
        {messages.map((m: Message) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`p-3 rounded-lg max-w-[75%] shadow-sm \\\n                ${m.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
                } \\\n                ${m.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`
              }
            >
              <span className="text-xs font-semibold capitalize pb-1 block border-b border-current/20 mb-1">{m.role}</span>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{typeof m.content === 'string' ? m.content : JSON.stringify(m.content, null, 2)}</pre>
              
              {/* Render tool invocations with custom components */}
              {m.toolInvocations && m.toolInvocations.map((toolInvocation, index: number) => {
                const { toolName, toolCallId, state } = toolInvocation;
                
                // Check for createWizard successful result
                if (state === 'result' && toolName === 'createWizard' && toolInvocation.result?.success) {
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
                if (state === 'result' && toolName === 'addWizardStep' && toolInvocation.result?.success) {
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
                        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(toolInvocation.result, null, 2)}</pre>
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
        <div className="p-2 my-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p>Error: {error.message}</p>
        </div>
      )}

      {/* Input Form Area */}
      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 border-t pt-4">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={isLoading ? "AI is thinking..." : "Ask the admin AI..."}
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
        </Button>
      </form>
    </div>
  );
}; 