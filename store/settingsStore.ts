import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppTheme = 'light' | 'dark' | 'system';
export type WeekStartDay = 'sunday' | 'monday';
export type LockTimeout = 'immediately' | 'one_minute' | 'five_minutes';

export interface SettingsState {
  currency: string;
  theme: AppTheme;
  weekStart: WeekStartDay;
  monthStartDay: number;
  reminderEnabled: boolean;
  reminderTime: string; // HH:mm format
  lockEnabled: boolean;
  lockTimeout: LockTimeout;
  onboardingDone: boolean;
  lastUsedCategoryId: string | null;
  lastUsedPaymentMethod: string | null;

  // Actions
  setCurrency: (currency: string) => void;
  setTheme: (theme: AppTheme) => void;
  setWeekStart: (weekStart: WeekStartDay) => void;
  setMonthStartDay: (day: number) => void;
  setReminderEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  setLockEnabled: (enabled: boolean) => void;
  setLockTimeout: (timeout: LockTimeout) => void;
  setOnboardingDone: (done: boolean) => void;
  setLastUsedCategory: (categoryId: string) => void;
  setLastUsedPaymentMethod: (method: string) => void;
  resetAllSettings: () => void;
}

const initialSettings = {
  currency: '₹',
  theme: 'system' as AppTheme,
  weekStart: 'monday' as WeekStartDay,
  monthStartDay: 1,
  reminderEnabled: false,
  reminderTime: '21:00',
  lockEnabled: false,
  lockTimeout: 'immediately' as LockTimeout,
  onboardingDone: false,
  lastUsedCategoryId: null,
  lastUsedPaymentMethod: null,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialSettings,
      setCurrency: (currency) => set({ currency }),
      setTheme: (theme) => set({ theme }),
      setWeekStart: (weekStart) => set({ weekStart }),
      setMonthStartDay: (monthStartDay) => set({ monthStartDay }),
      setReminderEnabled: (reminderEnabled) => set({ reminderEnabled }),
      setReminderTime: (reminderTime) => set({ reminderTime }),
      setLockEnabled: (lockEnabled) => set({ lockEnabled }),
      setLockTimeout: (lockTimeout) => set({ lockTimeout }),
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      setLastUsedCategory: (lastUsedCategoryId) => set({ lastUsedCategoryId }),
      setLastUsedPaymentMethod: (lastUsedPaymentMethod) => set({ lastUsedPaymentMethod }),
      resetAllSettings: () => set(initialSettings),
    }),
    {
      name: 'spendtrack-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
