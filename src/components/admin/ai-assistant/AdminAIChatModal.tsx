'use client';

import React from 'react';
import {
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
  CustomDialogHeader as DialogHeader,
  CustomDialogTitle as DialogTitle,
  CustomDialogDescription as DialogDescription,
} from "@/components/ui/custom-dialog";
import { useAdminAIChatModalStore } from '@/stores/useAdminAIChatModalStore';
import { AdminAIChatView } from './AdminAIChatView'; // Import the actual view

export const AdminAIChatModal: React.FC = () => {
  const { isAdminAIChatModalOpen, closeAdminAIChatModal } = useAdminAIChatModalStore();

  return (
    <Dialog open={isAdminAIChatModalOpen} onOpenChange={(isOpen) => {
      if (!isOpen) {
        closeAdminAIChatModal();
      }
    }}>
      <DialogContent className="sm:max-w-[600px] lg:max-w-[750px] h-[70vh] flex flex-col p-0 bg-gradient-to-br from-background to-background/95">
        <DialogHeader className="p-3 pb-2 mb-0 border-b bg-gradient-to-b from-background/90 to-background/70">
          <DialogTitle className="text-base">Admin AI Assistant</DialogTitle>
          <DialogDescription className="text-xs">
            Chat with the AI to manage platform resources
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <AdminAIChatView />
        </div>
      </DialogContent>
    </Dialog>
  );
}; 