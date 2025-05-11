'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MarkdownViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
  title?: string;
}

export const MarkdownViewerModal: React.FC<MarkdownViewerModalProps> = ({
  isOpen,
  onClose,
  markdownContent,
  title,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader className="pt-6 px-6 pb-2 flex-shrink-0">
          {title && (
            <DialogTitle className="truncate">{title}</DialogTitle>
          )}
          {!title && <DialogTitle>Markdown Content</DialogTitle>} 
        </DialogHeader>
        <div className="px-6 pb-4 flex-grow overflow-y-auto prose dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdownContent}
          </ReactMarkdown>
        </div>
        <DialogFooter className="p-6 pt-2 sm:justify-start border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 