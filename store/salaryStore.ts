import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDaysInMonth, getDate, format } from 'date-fns';

export interface SalaryPot {
  id: string;
  name: string;
  icon: string;
  color: string;
  allocatedPaise: number;
  spentPaise: number;
  isFlexible: boolean; // e.g. Travel can be returned to daily spending
}

export interface SalaryState {
  isSalaryMode: boolean;
  monthlySalaryPaise: number; // e.g. 50,000 INR = 5,000,000 paise
  pots: SalaryPot[];
  reallocatedPaise: number; // extra funds released from pots into discretionary spending
  streak: number; // consecutive days under daily limit
  lastEvaluatedDate: string; // YYYY-MM-DD
  streakBrokenToday: boolean;

  // Actions
  setSalaryMode: (enabled: boolean) => void;
  setMonthlySalary: (rupees: number) => void;
  addPot: (pot: { name: string; icon: string; color: string; allocatedRupees: number; isFlexible: boolean }) => void;
  updatePot: (id: string, updates: Partial<Omit<SalaryPot, 'id'>>) => void;
  deletePot: (id: string) => void;
  spendFromPot: (id: string, amountPaise: number) => void;
  refundToPot: (id: string, amountPaise: number) => void;
  reallocatePotToSpendable: (potId: string, amountRupees?: number) => { success: boolean; transferredPaise: number };
  evaluateStreak: (todaySpentPaise: number, dailyLimitPaise: number) => void;
  setStreak: (count: number) => void;
  resetMonth: (newSalaryRupees?: number) => void;
  resetToInitial: () => void;
}

const DEFAULT_POTS: SalaryPot[] = [
  {
    id: 'pot-family',
    name: 'Family',
    icon: 'people-outline',
    color: '#8B5CF6',
    allocatedPaise: 1000000, // ₹10,000
    spentPaise: 0,
    isFlexible: false,
  },
  {
    id: 'pot-emi',
    name: 'EMI / Payments',
    icon: 'card-outline',
    color: '#EF4444',
    allocatedPaise: 1500000, // ₹15,000
    spentPaise: 0,
    isFlexible: false,
  },
  {
    id: 'pot-travel',
    name: 'Travel',
    icon: 'airplane-outline',
    color: '#F59E0B',
    allocatedPaise: 500000, // ₹5,000
    spentPaise: 0,
    isFlexible: true, // Can be reallocated to daily spending!
  },
];

export const useSalaryStore = create<SalaryState>()(
  persist(
    (set, get) => ({
      isSalaryMode: true,
      monthlySalaryPaise: 5000000, // ₹50,000 default
      pots: DEFAULT_POTS,
      reallocatedPaise: 0,
      streak: 3,
      lastEvaluatedDate: format(new Date(), 'yyyy-MM-dd'),
      streakBrokenToday: false,

      setSalaryMode: (enabled) => set({ isSalaryMode: enabled }),

      setMonthlySalary: (rupees) => {
        set({ monthlySalaryPaise: Math.max(0, Math.round(rupees * 100)) });
      },

      addPot: ({ name, icon, color, allocatedRupees, isFlexible }) => {
        const newPot: SalaryPot = {
          id: `pot-${Date.now()}`,
          name: name.trim(),
          icon,
          color,
          allocatedPaise: Math.max(0, Math.round(allocatedRupees * 100)),
          spentPaise: 0,
          isFlexible,
        };
        set((state) => ({ pots: [...state.pots, newPot] }));
      },

      updatePot: (id, updates) => {
        set((state) => ({
          pots: state.pots.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      deletePot: (id) => {
        set((state) => ({
          pots: state.pots.filter((p) => p.id !== id),
        }));
      },

      spendFromPot: (id, amountPaise) => {
        set((state) => ({
          pots: state.pots.map((p) =>
            p.id === id ? { ...p, spentPaise: p.spentPaise + amountPaise } : p
          ),
        }));
      },

      refundToPot: (id, amountPaise) => {
        set((state) => ({
          pots: state.pots.map((p) =>
            p.id === id ? { ...p, spentPaise: Math.max(0, p.spentPaise - amountPaise) } : p
          ),
        }));
      },

      reallocatePotToSpendable: (potId, amountRupees) => {
        const state = get();
        const pot = state.pots.find((p) => p.id === potId);
        if (!pot) return { success: false, transferredPaise: 0 };

        const remainingPaise = Math.max(0, pot.allocatedPaise - pot.spentPaise);
        const transferPaise = amountRupees
          ? Math.min(remainingPaise, Math.round(amountRupees * 100))
          : remainingPaise;

        if (transferPaise <= 0) return { success: false, transferredPaise: 0 };

        set((s) => ({
          pots: s.pots.map((p) =>
            p.id === potId
              ? { ...p, allocatedPaise: p.allocatedPaise - transferPaise }
              : p
          ),
          reallocatedPaise: s.reallocatedPaise + transferPaise,
        }));

        return { success: true, transferredPaise: transferPaise };
      },

      setStreak: (count) => {
        set({ streak: Math.max(0, count), streakBrokenToday: false });
      },

      evaluateStreak: (todaySpentPaise, dailyLimitPaise) => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const state = get();

        if (dailyLimitPaise <= 0) return;

        if (todaySpentPaise > dailyLimitPaise) {
          // Exceeded limit: break streak!
          set({
            streakBrokenToday: true,
            streak: 0,
            lastEvaluatedDate: todayStr,
          });
        } else {
          // Under limit
          if (state.streakBrokenToday) {
            // Un-break streak if it was falsely marked broken!
            set({
              streakBrokenToday: false,
              streak: state.streak === 0 ? 1 : state.streak,
              lastEvaluatedDate: todayStr,
            });
          } else if (state.lastEvaluatedDate !== todayStr) {
            // New day reached and previous was safe: increment streak
            set({
              streakBrokenToday: false,
              streak: state.streak + 1,
              lastEvaluatedDate: todayStr,
            });
          }
        }
      },

      resetMonth: (newSalaryRupees) => {
        set((state) => ({
          monthlySalaryPaise: newSalaryRupees
            ? Math.round(newSalaryRupees * 100)
            : state.monthlySalaryPaise,
          reallocatedPaise: 0,
          pots: state.pots.map((p) => ({ ...p, spentPaise: 0 })),
          streakBrokenToday: false,
        }));
      },

      resetToInitial: () => {
        set({
          isSalaryMode: true,
          monthlySalaryPaise: 5000000,
          pots: DEFAULT_POTS.map((p) => ({ ...p, spentPaise: 0 })),
          reallocatedPaise: 0,
          streak: 0,
          lastEvaluatedDate: format(new Date(), 'yyyy-MM-dd'),
          streakBrokenToday: false,
        });
      },
    }),
    {
      name: 'spendtrack-salary-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * Computes the derived Salary Mode statistics:
 * - Total allocated to pots
 * - Discretionary spending pool for the month
 * - Daily allowance (total days or remaining days)
 */
export function getSalaryMetrics(
  salaryState: SalaryState,
  referenceDate: Date = new Date()
) {
  const totalDays = getDaysInMonth(referenceDate);
  const currentDay = getDate(referenceDate);
  const remainingDays = Math.max(1, totalDays - currentDay + 1);

  // Total allocated to pots currently
  const totalAllocatedPotsPaise = salaryState.pots.reduce(
    (sum, pot) => sum + pot.allocatedPaise,
    0
  );

  // Original pots allocation before any mid-month reallocations
  const originalAllocatedPotsPaise = totalAllocatedPotsPaise + (salaryState.reallocatedPaise || 0);

  // Base monthly discretionary pool at the start of the month
  const baseDiscretionaryPoolPaise = Math.max(
    0,
    salaryState.monthlySalaryPaise - originalAllocatedPotsPaise
  );

  // Base daily allowance per day across the entire month
  const baseDailyAllowancePaise = Math.floor(baseDiscretionaryPoolPaise / totalDays);

  // Any reallocated funds (e.g. unused Travel money transferred mid/late month)
  // are distributed over the remaining days of the month (including today)
  const reallocatedDailyBoostPaise =
    salaryState.reallocatedPaise > 0 && remainingDays > 0
      ? Math.floor(salaryState.reallocatedPaise / remainingDays)
      : 0;

  // Total daily allowance for today and remaining days
  const dailyAllowancePaise = baseDailyAllowancePaise + reallocatedDailyBoostPaise;

  // Monthly discretionary spendable pool
  const discretionaryMonthlyPoolPaise = Math.max(
    0,
    salaryState.monthlySalaryPaise - totalAllocatedPotsPaise
  );

  return {
    totalDays,
    currentDay,
    remainingDays,
    totalAllocatedPotsPaise,
    discretionaryMonthlyPoolPaise,
    baseDailyAllowancePaise,
    reallocatedDailyBoostPaise,
    dailyAllowancePaise,
  };
}
