import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { v4 as uuidv4 } from 'uuid';

// Define types for our chat history
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolInvocations?: ToolInvocation[];
}

export interface ToolInvocation {
  toolName: string;
  toolCallId: string;
  args: Record<string, any>;
  result?: any;
  state: 'pending' | 'result' | 'error';
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// Helper function to generate a title from the first message
const generateTitle = (message: string): string => {
  // Trim and truncate the message to create a title
  const MAX_TITLE_LENGTH = 30;
  const cleaned = message.trim().replace(/\s+/g, ' ');
  
  if (cleaned.length <= MAX_TITLE_LENGTH) {
    return cleaned;
  }
  
  return cleaned.substring(0, MAX_TITLE_LENGTH) + '...';
};

// Setup localStorage with safety checks
const storage = createJSONStorage<Record<string, Conversation>>(() => {
  return {
    getItem: (key) => {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : {};
      } catch (e) {
        console.error('Error reading from localStorage', e);
        return {};
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Error writing to localStorage', e);
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Error removing from localStorage', e);
      }
    },
  };
});

// Base atoms
export const conversationsAtom = atomWithStorage<Record<string, Conversation>>(
  'ai-chat-conversations', 
  {}, 
  storage
);

export const activeConversationIdAtom = atom<string | null>(null);

// Time threshold for creating a new conversation (in milliseconds)
const CONVERSATION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

// Derived atoms
export const conversationsListAtom = atom(get => {
  const conversationsMap = get(conversationsAtom);
  return Object.values(conversationsMap).sort((a, b) => b.updatedAt - a.updatedAt);
});

export const activeConversationAtom = atom(
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

// Action atoms

// Create a new conversation
export const createConversationAtom = atom(
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
export const addMessageAtom = atom(
  null,
  (get, set, payload: { message: Omit<ChatMessage, 'id' | 'timestamp'>, conversationId?: string }) => {
    const { message, conversationId } = payload;
    const activeId = conversationId || get(activeConversationIdAtom);
    
    // If no active conversation, create a new one
    if (!activeId) {
      if (message.role === 'user') {
        const newId = set(createConversationAtom, message.content);
        return newId;
      }
      return null;
    }
    
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
export const deleteConversationAtom = atom(
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

// Check if we should start a new conversation based on time
export const shouldStartNewConversationAtom = atom(
  get => {
    const activeId = get(activeConversationIdAtom);
    const conversations = get(conversationsAtom);
    
    if (!activeId || !conversations[activeId]) {
      return true;
    }
    
    const now = Date.now();
    const lastUpdateTime = conversations[activeId].updatedAt;
    
    return (now - lastUpdateTime) > CONVERSATION_TIMEOUT;
  }
);

// Clear all conversations
export const clearAllConversationsAtom = atom(
  null,
  (_, set) => {
    set(conversationsAtom, {});
    set(activeConversationIdAtom, null);
  }
);

// Update tool invocation result
export const updateToolInvocationAtom = atom(
  null,
  (get, set, payload: { 
    conversationId: string, 
    messageId: string, 
    toolCallId: string, 
    result: any,
    state: 'result' | 'error'
  }) => {
    const { conversationId, messageId, toolCallId, result, state } = payload;
    const conversations = get(conversationsAtom);
    const conversation = conversations[conversationId];
    
    if (!conversation) return;
    
    const updatedMessages = conversation.messages.map(message => {
      if (message.id !== messageId) return message;
      
      const updatedToolInvocations = (message.toolInvocations || []).map(invocation => {
        if (invocation.toolCallId !== toolCallId) return invocation;
        
        return {
          ...invocation,
          result,
          state
        };
      });
      
      return {
        ...message,
        toolInvocations: updatedToolInvocations
      };
    });
    
    set(conversationsAtom, {
      ...conversations,
      [conversationId]: {
        ...conversation,
        messages: updatedMessages,
        updatedAt: Date.now()
      }
    });
  }
); 