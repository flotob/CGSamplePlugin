import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { 
  conversationsListAtom, 
  activeConversationIdAtom, 
  createConversationAtom,
  deleteConversationAtom,
  clearAllConversationsAtom,
} from '@/stores/useChatHistoryStore';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, TrashIcon, MessageSquare, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConversationSidebarProps {
  className?: string;
  onConversationSelect?: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({ 
  className = '',
  onConversationSelect
}) => {
  const [conversations] = useAtom(conversationsListAtom);
  const [activeConversationId, setActiveConversationId] = useAtom(activeConversationIdAtom);
  const [, createConversation] = useAtom(createConversationAtom);
  const [, deleteConversation] = useAtom(deleteConversationAtom);
  const [, clearAllConversations] = useAtom(clearAllConversationsAtom);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleNewChat = () => {
    createConversation();
    if (onConversationSelect) {
      onConversationSelect();
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    if (onConversationSelect) {
      onConversationSelect();
    }
  };

  const handleDeleteConversation = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string
  ) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  const handleClearAllConversations = () => {
    clearAllConversations();
    setShowClearDialog(false);
  };

  // Format date for display
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // If the date is today
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If the date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show the date
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: today.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <>
      <div className={`flex flex-col h-full border-r ${className}`}>
        <div className="p-3 border-b">
          <Button 
            onClick={handleNewChat} 
            className="w-full flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
            variant="default"
          >
            <PlusCircle className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {conversations.map((conversation) => (
                <li 
                  key={conversation.id}
                  className={`
                    rounded-md p-2 cursor-pointer 
                    transition-colors duration-200
                    hover:bg-muted group
                    ${activeConversationId === conversation.id ? 'bg-gradient-to-r from-muted to-muted/80' : ''}
                  `}
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{conversation.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(conversation.updatedAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                      title="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                  {conversation.messages.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {conversation.messages.length} message{conversation.messages.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {conversations.length > 0 && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs flex items-center gap-1 text-muted-foreground hover:text-destructive bg-gradient-to-r from-transparent to-background/40 hover:from-destructive/10 hover:to-destructive/5"
              onClick={() => setShowClearDialog(true)}
            >
              <TrashIcon className="h-3 w-3" />
              Clear all conversations
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for clearing all conversations */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-background to-background/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All Conversations
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all conversations? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAllConversations}>
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 