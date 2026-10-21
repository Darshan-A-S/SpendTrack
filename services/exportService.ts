import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SQLiteDatabase } from 'expo-sqlite';
import { getExpenses, ExpenseFilterOptions } from '../db/repositories/expenseRepo';
import { getAllCategories } from '../db/repositories/categoryRepo';
import { getBudgets } from '../db/repositories/budgetRepo';
import { getRecurringRules } from '../db/repositories/recurringRepo';
import { generateExpensesCsv, CsvExpenseRow } from '../utils/csv';
import { useSettingsStore } from '../store/settingsStore';
import { format } from 'date-fns';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: number;
  appName: string;
  categories: any[];
  expenses: any[];
  budgets: any[];
  recurringRules: any[];
  settings: Record<string, any>;
}

/**
 * Generates and shares a CSV file of expenses matching the specified filter.
 */
export async function exportExpensesCsv(
  db: SQLiteDatabase,
  filterOptions: ExpenseFilterOptions = {}
): Promise<string> {
  const expenses = await getExpenses(db, filterOptions);

  const rows: CsvExpenseRow[] = expenses.map((e) => ({
    date: e.date,
    amount_paise: e.amount_paise,
    category_name: e.category_name,
    payment_method: e.payment_method,
    note: e.note,
  }));

  const csvContent = generateExpensesCsv(rows);
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const filename = `spendtrack_expenses_${timestamp}.csv`;
  const fileUri = `${FileSystem.cacheDirectory || ''}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export SpendTrack Expenses',
      UTI: 'public.comma-separated-values-text',
    });
  }

  return fileUri;
}

/**
 * Generates and shares a full JSON backup of the entire app database and settings.
 */
export async function exportFullBackupJson(db: SQLiteDatabase): Promise<string> {
  const categories = await getAllCategories(db, true);
  const expenses = await getExpenses(db, {});
  const budgets = await getBudgets(db);
  const recurringRules = await getRecurringRules(db, false);

  const settingsState = useSettingsStore.getState();
  const settings = {
    currency: settingsState.currency,
    theme: settingsState.theme,
    weekStart: settingsState.weekStart,
    monthStartDay: settingsState.monthStartDay,
    reminderEnabled: settingsState.reminderEnabled,
    reminderTime: settingsState.reminderTime,
    lockEnabled: settingsState.lockEnabled,
    lockTimeout: settingsState.lockTimeout,
  };

  const backupData: BackupData = {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    appName: 'SpendTrack',
    categories,
    expenses,
    budgets,
    recurringRules,
    settings,
  };

  const jsonContent = JSON.stringify(backupData, null, 2);
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const filename = `spendtrack_backup_${timestamp}.json`;
  const fileUri = `${FileSystem.cacheDirectory || ''}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export SpendTrack Backup',
      UTI: 'public.json',
    });
  }

  return fileUri;
}
