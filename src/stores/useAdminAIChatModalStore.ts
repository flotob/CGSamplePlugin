import { create } from 'zustand';

interface AdminAIChatModalState {
  isAdminAIChatModalOpen: boolean;
  openAdminAIChatModal: () => void;
  closeAdminAIChatModal: () => void;
}

export const useAdminAIChatModalStore = create<AdminAIChatModalState>((set) => ({
  isAdminAIChatModalOpen: false,
  openAdminAIChatModal: () => set({ isAdminAIChatModalOpen: true }),
  closeAdminAIChatModal: () => set({ isAdminAIChatModalOpen: false }),
})); 