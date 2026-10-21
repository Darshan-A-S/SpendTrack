import { create } from 'zustand';

interface AuthState {
  isLocked: boolean;
  lastBackgroundTime: number | null;
  setLocked: (locked: boolean) => void;
  setLastBackgroundTime: (time: number | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLocked: false,
  lastBackgroundTime: null,
  setLocked: (isLocked) => set({ isLocked }),
  setLastBackgroundTime: (lastBackgroundTime) => set({ lastBackgroundTime }),
}));
