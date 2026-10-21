import { create } from 'zustand';
import { ExpenseWithCategory } from '../db/repositories/expenseRepo';

interface DataState {
  dataVersion: number;
  bumpDataVersion: () => void;
  undoExpense: ExpenseWithCategory | null;
  setUndoExpense: (expense: ExpenseWithCategory | null) => void;
  clearUndoExpense: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  dataVersion: 1,
  bumpDataVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
  undoExpense: null,
  setUndoExpense: (expense) => set({ undoExpense: expense }),
  clearUndoExpense: () => set({ undoExpense: null }),
}));
