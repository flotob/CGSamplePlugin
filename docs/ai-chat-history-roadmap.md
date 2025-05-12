# AI Assistant Chat History Management Roadmap

## Overview

This document outlines the plan for implementing chat history management in the AI Assistant using Jotai for state management and localStorage for persistence.

## Requirements

- Store conversations in localStorage
- Display past conversations in a sidebar within the AI chat component
- Allow selecting and continuing past conversations
- Intelligently determine when to start a new chat vs continue existing conversations
- Provide ability to delete old conversations

## Data Model

```typescript
// Core data types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolInvocations?: ToolInvocation[];
}

interface ToolInvocation {
  toolName: string;
  toolCallId: string;
  args: Record<string, any>;
  result?: any;
  state: 'pending' | 'result' | 'error';
}

interface Conversation {
  id: string;
  title: string; // Auto-generated from first user message
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
```

## Implementation Plan

### Phase 1: Core State Management

1. **Setup Jotai Store**
   - Define base atoms for conversations list and active conversation
   - Create derived atoms for filtered/sorted conversations
   - Implement localStorage persistence

2. **Basic Operations**
   - Create new conversation
   - Add messages to conversation
   - Generate conversation titles
   - Continue existing conversation

### Phase 2: UI Integration

1. **Conversation Sidebar**
   - List of past conversations
   - New chat button
   - Basic conversation search/filter

2. **Chat View Updates**
   - Show active conversation
   - Handle starting/continuing conversations
   - Display conversation title

### Phase 3: Enhanced Features

1. **Session Management**
   - Auto-create new session after time threshold (e.g., 2 hours of inactivity)
   - Save last active conversation

2. **Conversation Management**
   - Delete conversations
   - Export/import conversations
   - Clear all history

## Technical Implementation

### Jotai Atoms

```typescript
// Base atoms
const conversationsAtom = atomWithStorage<Record<string, Conversation>>('ai-chat-conversations', {});
const activeConversationIdAtom = atom<string | null>(null);

// Derived atoms
const conversationsListAtom = atom(get => {
  const conversationsMap = get(conversationsAtom);
  return Object.values(conversationsMap).sort((a, b) => b.updatedAt - a.updatedAt);
});

const activeConversationAtom = atom(
  get => {
    const activeId = get(activeConversationIdAtom);
    const conversations = get(conversationsAtom);
    return activeId ? conversations[activeId] || null : null;
  },
  (get, set, conversation: Conversation) => {
    const conversations = get(conversationsAtom);
    set(conversationsAtom, {
      ...conversations,
      [conversation.id]: conversation
    });
  }
);
```

### Core Functions

```typescript
// Create a new conversation
const createConversationAtom = atom(
  null,
  (get, set, initialMessage?: string) => {
    const id = uuidv4();
    const now = Date.now();
    const newConversation: Conversation = {
      id,
      title: initialMessage ? generateTitle(initialMessage) : 'New Conversation',
      messages: initialMessage ? [{
        id: uuidv4(),
        role: 'user',
        content: initialMessage,
        timestamp: now
      }] : [],
      createdAt: now,
      updatedAt: now
    };
    
    const conversations = get(conversationsAtom);
    set(conversationsAtom, {
      ...conversations,
      [id]: newConversation
    });
    set(activeConversationIdAtom, id);
    return id;
  }
);

// Add message to conversation
const addMessageAtom = atom(
  null,
  (get, set, payload: { message: Omit<ChatMessage, 'id' | 'timestamp'>, conversationId?: string }) => {
    const { message, conversationId } = payload;
    const activeId = conversationId || get(activeConversationIdAtom);
    if (!activeId) return null;
    
    const conversations = get(conversationsAtom);
    const conversation = conversations[activeId];
    if (!conversation) return null;
    
    const now = Date.now();
    const newMessage: ChatMessage = {
      id: uuidv4(),
      ...message,
      timestamp: now
    };
    
    const updatedConversation: Conversation = {
      ...conversation,
      messages: [...conversation.messages, newMessage],
      updatedAt: now,
      // Update title if this is the first user message
      title: conversation.messages.length === 0 && message.role === 'user' 
        ? generateTitle(message.content)
        : conversation.title
    };
    
    set(conversationsAtom, {
      ...conversations,
      [activeId]: updatedConversation
    });
    
    return newMessage.id;
  }
);

// Delete conversation
const deleteConversationAtom = atom(
  null,
  (get, set, conversationId: string) => {
    const conversations = get(conversationsAtom);
    const { [conversationId]: _, ...rest } = conversations;
    
    set(conversationsAtom, rest);
    
    // If the active conversation was deleted, set active to null
    const activeId = get(activeConversationIdAtom);
    if (activeId === conversationId) {
      set(activeConversationIdAtom, null);
    }
  }
);
```

## Migration Strategy

1. Modify the existing `AdminAIChatView` component to use our new Jotai atoms
2. Implement the conversation sidebar as a new component
3. Update the AI chat component to handle conversation continuation

## First Implementation Steps

1. Create basic Jotai atoms for conversation storage
2. Implement localStorage persistence
3. Build the conversation sidebar UI
4. Modify chat view to support conversation history

## Timeline

- Phase 1: 1-2 days
- Phase 2: 2-3 days
- Phase 3: 1-2 days

## Open Questions

- Should we limit the number of stored conversations?
- Do we need a mechanism to handle localStorage size limitations?
- What metadata should we display for each conversation in the sidebar? 