'use client';

import React from 'react';
import { useChat, type Message } from 'ai/react';
import { Input } from '@/components/ui/input'; // Using Input for simplicity, can be Textarea
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthFetch } from '@/lib/authFetch'; // Import useAuthFetch

// Placeholder for AdminAIChatMessage and AdminAIChatInput if we split them further
// For now, keeping input and message rendering inline for initial setup.

export const AdminAIChatView: React.FC = () => {
  const { authFetch } = useAuthFetch(); // Get authFetch instance

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    // reload, // Function to reload the last AI response
    // stop, // Function to stop the AI response generation
  } = useChat({
    api: '/api/admin/ai-assistant/chat', // This URL is passed as `input` to the custom fetch
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      // authFetch will handle adding the Authorization header internally.
      // It expects the URL as the first argument and options (like method, body, headers) as the second.
      // We must ensure authFetch returns a raw Promise<Response> for useChat.
      return authFetch<Response>(input.toString(), {
        ...(init || {}), // Spread the init options from useChat
        parseJson: false, // Tell authFetch to return the raw Response object
      });
    },
    // initialMessages: [], // Optional: any initial messages
    // id: 'admin-ai-chat', // Optional unique ID for the chat instance if needed
    // body: {}, // Optional: any additional body params to send with each request
    onError: (err) => {
      // TODO: Implement more user-friendly error display (e.g., toast)
      console.error("[AdminAIChatView] Chat error:", err);
      // TODO: Implement more user-friendly error display (e.g., toast)
      // Consider if specific error messages (like 401/403) need different handling here
      // For instance, if err.message includes "Forbidden" or "Unauthorized", 
      // it could indicate a deeper auth issue not just a chat processing error.
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
              {/* Naive way to display content, including potential tool calls/results as strings for now */}
              {/* More sophisticated rendering would parse m.toolInvocations or m.content if it contains structured data */}
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{typeof m.content === 'string' ? m.content : JSON.stringify(m.content, null, 2)}</pre>
              {m.toolInvocations && m.toolInvocations.map((toolInvocation, index: number) => (
                <div key={index} className="mt-2 p-2 border border-blue-500/30 bg-blue-500/10 rounded">
                  Tool Call (ID: {toolInvocation.toolCallId}): {toolInvocation.toolName}
                  Args: <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(toolInvocation.args, null, 2)}</pre>
                  {/* Result would typically be in a subsequent assistant message or a dedicated 'tool' role message */} 
                </div>
              ))}
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