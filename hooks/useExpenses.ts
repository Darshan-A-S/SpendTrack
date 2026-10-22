import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../db/database';
import {
  getExpenses,
  deleteExpense as dbDeleteExpense,
  insertExpense,
  ExpenseWithCategory,
  ExpenseFilterOptions,
} from '../db/repositories/expenseRepo';
import { useDataStore } from '../store/dataStore';
import { useSalaryStore } from '../store/salaryStore';
import { getFriendlyDateLabel, getTodayDateString } from '../utils/dates';
import * as Crypto from 'expo-crypto';

export interface DayExpenseGroup {
  date: string;
  friendlyDate: string;
  dailyTotalPaise: number;
  data: ExpenseWithCategory[];
}

export function useExpenses(filters: ExpenseFilterOptions) {
  const dataVersion = useDataStore((state) => state.dataVersion);
  const bumpDataVersion = useDataStore((state) => state.bumpDataVersion);
  const setUndoExpense = useDataStore((state) => state.setUndoExpense);

  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [dayGroups, setDayGroups] = useState<DayExpenseGroup[]>([]);
  const [totalSpentPaise, setTotalSpentPaise] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const startDate = filters.startDate;
  const endDate = filters.endDate;
  const categoryIdsKey = filters.categoryIds?.join(',');
  const paymentMethodsKey = filters.paymentMethods?.join(',');
  const minAmountPaise = filters.minAmountPaise;
  const maxAmountPaise = filters.maxAmountPaise;
  const searchNote = filters.searchNote;

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDb();
      const list = await getExpenses(db, filters);

      setExpenses(list);

      // Group by day
      const groupMap = new Map<string, ExpenseWithCategory[]>();
      let total = 0;

      for (const item of list) {
        total += item.amount_paise;
        const currentList = groupMap.get(item.date) || [];
        currentList.push(item);
        groupMap.set(item.date, currentList);
      }

      setTotalSpentPaise(total);

      const groups: DayExpenseGroup[] = Array.from(groupMap.entries()).map(
        ([date, items]) => {
          const dayTotal = items.reduce((sum, i) => sum + i.amount_paise, 0);
          return {
            date,
            friendlyDate: getFriendlyDateLabel(date),
            dailyTotalPaise: dayTotal,
            data: items,
          };
        }
      );

      setDayGroups(groups);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    categoryIdsKey,
    paymentMethodsKey,
    minAmountPaise,
    maxAmountPaise,
    searchNote,
    dataVersion,
  ]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Delete with Undo support
  const deleteExpenseWithUndo = async (item: ExpenseWithCategory) => {
    const db = await getDb();
    await dbDeleteExpense(db, item.id);

    // Refund pot if this was charged to an earmarked pot
    let potId = item.pot_id;
    if (!potId && item.note?.startsWith('[')) {
      const match = /^\[([^\]]+)\]/.exec(item.note);
      if (match) {
        const found = useSalaryStore.getState().pots.find(
          (p) => p.name.toLowerCase() === match[1].toLowerCase()
        );
        if (found) potId = found.id;
      }
    }
    if (potId) {
      useSalaryStore.getState().refundToPot(potId, item.amount_paise);
    }

    setUndoExpense(item);
    bumpDataVersion();
  };

  // Restore deleted expense (Undo)
  const restoreExpense = async (item: ExpenseWithCategory) => {
    const db = await getDb();
    await insertExpense(db, {
      id: item.id,
      amount_paise: item.amount_paise,
      category_id: item.category_id,
      note: item.note,
      payment_method: item.payment_method,
      date: item.date,
      recurring_id: item.recurring_id,
      pot_id: item.pot_id,
    });

    // Re-charge pot if restored
    let potId = item.pot_id;
    if (!potId && item.note?.startsWith('[')) {
      const match = /^\[([^\]]+)\]/.exec(item.note);
      if (match) {
        const found = useSalaryStore.getState().pots.find(
          (p) => p.name.toLowerCase() === match[1].toLowerCase()
        );
        if (found) potId = found.id;
      }
    }
    if (potId) {
      useSalaryStore.getState().spendFromPot(potId, item.amount_paise);
    }

    bumpDataVersion();
  };

  // Duplicate expense: creates a copy dated today
  const duplicateExpense = async (item: ExpenseWithCategory) => {
    const db = await getDb();
    const newId = Crypto.randomUUID();
    const today = getTodayDateString();

    await insertExpense(db, {
      id: newId,
      amount_paise: item.amount_paise,
      category_id: item.category_id,
      note: item.note,
      payment_method: item.payment_method,
      date: today,
      recurring_id: null,
    });

    bumpDataVersion();
  };

  return {
    expenses,
    dayGroups,
    totalSpentPaise,
    loading,
    refresh: fetchExpenses,
    deleteExpenseWithUndo,
    restoreExpense,
    duplicateExpense,
  };
}
