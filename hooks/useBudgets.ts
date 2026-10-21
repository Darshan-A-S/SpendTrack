import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../db/database';
import {
  getBudgets,
  setBudget as dbSetBudget,
  deleteBudget as dbDeleteBudget,
  BudgetWithCategory,
} from '../db/repositories/budgetRepo';
import {
  getExpensesSummary,
  getExpensesByCategory,
} from '../db/repositories/expenseRepo';
import { useDataStore } from '../store/dataStore';
import { useSettingsStore } from '../store/settingsStore';
import { getMonthCycleRange } from '../utils/dates';
import * as Crypto from 'expo-crypto';

export interface BudgetProgressItem {
  budget: BudgetWithCategory;
  spentPaise: number;
  remainingPaise: number;
  percentage: number;
  isWarning: boolean; // >= 80% and < 100%
  isOverBudget: boolean; // >= 100%
}

export function useBudgets() {
  const dataVersion = useDataStore((state) => state.dataVersion);
  const bumpDataVersion = useDataStore((state) => state.bumpDataVersion);
  const monthStartDay = useSettingsStore((state) => state.monthStartDay);

  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [overallBudgetProgress, setOverallBudgetProgress] = useState<BudgetProgressItem | null>(null);
  const [categoryBudgetProgresses, setCategoryBudgetProgresses] = useState<BudgetProgressItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDb();
      const list = await getBudgets(db);
      setBudgets(list);

      const cycle = getMonthCycleRange(new Date(), monthStartDay);

      // Overall budget
      const overall = list.find((b) => b.category_id === null);
      if (overall) {
        const summary = await getExpensesSummary(db, cycle.startDate, cycle.endDate, true);
        const spent = summary.total_paise;
        const remaining = overall.amount_paise - spent;
        const pct = Math.round((spent / overall.amount_paise) * 100);
        setOverallBudgetProgress({
          budget: overall,
          spentPaise: spent,
          remainingPaise: remaining,
          percentage: pct,
          isWarning: pct >= 80 && pct < 100,
          isOverBudget: pct >= 100,
        });
      } else {
        setOverallBudgetProgress(null);
      }

      // Category budgets
      const catBudgets = list.filter((b) => b.category_id !== null);
      if (catBudgets.length > 0) {
        const catExpenses = await getExpensesByCategory(db, cycle.startDate, cycle.endDate, true);
        const spentMap = new Map<string, number>();
        for (const exp of catExpenses) {
          spentMap.set(exp.category_id, exp.total_paise);
        }

        const progresses: BudgetProgressItem[] = catBudgets.map((b) => {
          const spent = spentMap.get(b.category_id!) || 0;
          const remaining = b.amount_paise - spent;
          const pct = Math.round((spent / b.amount_paise) * 100);
          return {
            budget: b,
            spentPaise: spent,
            remainingPaise: remaining,
            percentage: pct,
            isWarning: pct >= 80 && pct < 100,
            isOverBudget: pct >= 100,
          };
        });

        setCategoryBudgetProgresses(progresses);
      } else {
        setCategoryBudgetProgresses([]);
      }
    } catch (err) {
      console.error('Error fetching budgets:', err);
    } finally {
      setLoading(false);
    }
  }, [monthStartDay, dataVersion]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const saveBudget = async (categoryId: string | null, amountPaise: number) => {
    const db = await getDb();
    const id = Crypto.randomUUID();
    await dbSetBudget(db, {
      id,
      category_id: categoryId,
      amount_paise: amountPaise,
    });
    bumpDataVersion();
  };

  const deleteBudget = async (id: string) => {
    const db = await getDb();
    await dbDeleteBudget(db, id);
    bumpDataVersion();
  };

  return {
    budgets,
    overallBudgetProgress,
    categoryBudgetProgresses,
    loading,
    refresh: fetchBudgets,
    saveBudget,
    deleteBudget,
  };
}
