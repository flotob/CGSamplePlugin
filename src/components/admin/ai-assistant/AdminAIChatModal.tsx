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
      <DialogContent className="sm:max-w-[600px] h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Admin AI Assistant</DialogTitle>
          <DialogDescription>
            Interact with the administrative AI to manage platform resources.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-0">
          <AdminAIChatView /> {/* Use the actual component */}
        </div>
        {/* Optional Footer if needed for actions outside the chat view itself */}
        {/* <DialogFooter className="p-6 pt-2">
          <Button variant="outline" onClick={closeAdminAIChatModal}>Close</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}; 