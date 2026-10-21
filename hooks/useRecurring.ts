import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../db/database';
import {
  getRecurringRules,
  insertRecurringRule as dbInsertRecurringRule,
  updateRecurringRule as dbUpdateRecurringRule,
  toggleRecurringRuleActive as dbToggleRecurringRuleActive,
  deleteRecurringRule as dbDeleteRecurringRule,
  RecurringRuleWithCategory,
  RecurringFrequency,
} from '../db/repositories/recurringRepo';
import { useDataStore } from '../store/dataStore';
import * as Crypto from 'expo-crypto';

export function useRecurring() {
  const dataVersion = useDataStore((state) => state.dataVersion);
  const bumpDataVersion = useDataStore((state) => state.bumpDataVersion);

  const [rules, setRules] = useState<RecurringRuleWithCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDb();
      const list = await getRecurringRules(db, false);
      setRules(list);
    } catch (err) {
      console.error('Error fetching recurring rules:', err);
    } finally {
      setLoading(false);
    }
  }, [dataVersion]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (data: {
    amount_paise: number;
    category_id: string;
    note: string | null;
    payment_method: string | null;
    frequency: RecurringFrequency;
    start_date: string;
    end_date: string | null;
  }) => {
    const db = await getDb();
    const id = Crypto.randomUUID();
    await dbInsertRecurringRule(db, {
      id,
      ...data,
      last_generated_date: null,
      active: 1,
    });
    bumpDataVersion();
  };

  const updateRule = async (
    id: string,
    data: Partial<{
      amount_paise: number;
      category_id: string;
      note: string | null;
      payment_method: string | null;
      frequency: RecurringFrequency;
      start_date: string;
      end_date: string | null;
    }>
  ) => {
    const db = await getDb();
    await dbUpdateRecurringRule(db, { id, ...data });
    bumpDataVersion();
  };

  const toggleActive = async (id: string, active: boolean) => {
    const db = await getDb();
    await dbToggleRecurringRuleActive(db, id, active);
    bumpDataVersion();
  };

  const deleteRule = async (id: string) => {
    const db = await getDb();
    await dbDeleteRecurringRule(db, id);
    bumpDataVersion();
  };

  return {
    rules,
    loading,
    refresh: fetchRules,
    addRule,
    updateRule,
    toggleActive,
    deleteRule,
  };
}
