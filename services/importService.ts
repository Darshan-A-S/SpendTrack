import { SQLiteDatabase } from 'expo-sqlite';
import { BACKUP_SCHEMA_VERSION, BackupData } from './exportService';
import { seedCategories } from '../db/seed';
import { useSettingsStore } from '../store/settingsStore';

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  success: boolean;
  importedExpensesCount: number;
  importedCategoriesCount: number;
  importedBudgetsCount: number;
  importedRulesCount: number;
  error?: string;
}

/**
 * Validates a parsed JSON backup object.
 */
export function validateBackupData(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'File does not contain valid JSON data.' };
  }

  if (typeof data.version !== 'number') {
    return { valid: false, error: 'Backup is missing version information.' };
  }

  if (data.version > BACKUP_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Backup version ${data.version} is newer than supported version (${BACKUP_SCHEMA_VERSION}). Please update the app.`,
    };
  }

  if (!Array.isArray(data.categories) || !Array.isArray(data.expenses)) {
    return { valid: false, error: 'Backup is missing required categories or expenses data.' };
  }

  return { valid: true };
}

/**
 * Restores data from a backup object with either 'merge' or 'replace' strategy.
 */
export async function restoreBackupData(
  db: SQLiteDatabase,
  backupData: BackupData,
  mode: ImportMode
): Promise<ImportResult> {
  const validation = validateBackupData(backupData);
  if (!validation.valid) {
    return {
      success: false,
      importedExpensesCount: 0,
      importedCategoriesCount: 0,
      importedBudgetsCount: 0,
      importedRulesCount: 0,
      error: validation.error,
    };
  }

  let importedCategories = 0;
  let importedExpenses = 0;
  let importedBudgets = 0;
  let importedRules = 0;

  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      // Clear all tables
      await db.runAsync('DELETE FROM budget_alerts;');
      await db.runAsync('DELETE FROM expenses;');
      await db.runAsync('DELETE FROM recurring_rules;');
      await db.runAsync('DELETE FROM budgets;');
      await db.runAsync('DELETE FROM categories;');
    }

    // 1. Categories
    for (const cat of backupData.categories || []) {
      if (!cat.id || !cat.name) continue;
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM categories WHERE id = ?;',
        [cat.id]
      );

      if (!existing) {
        await db.runAsync(
          `INSERT INTO categories (id, name, icon, color, sort_order, is_default, archived, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            cat.id,
            cat.name,
            cat.icon || 'ellipsis-horizontal-circle-outline',
            cat.color || '#64748B',
            cat.sort_order ?? 0,
            cat.is_default ?? 0,
            cat.archived ?? 0,
            cat.created_at || Date.now(),
          ]
        );
        importedCategories++;
      }
    }

    // Ensure default categories exist if replace was run
    if (mode === 'replace') {
      await seedCategories(db);
    }

    // 2. Recurring rules
    for (const rule of backupData.recurringRules || []) {
      if (!rule.id || !rule.category_id || !rule.amount_paise) continue;
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM recurring_rules WHERE id = ?;',
        [rule.id]
      );

      if (!existing) {
        await db.runAsync(
          `INSERT INTO recurring_rules (
            id, amount_paise, category_id, note, payment_method, frequency,
            start_date, end_date, last_generated_date, active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            rule.id,
            rule.amount_paise,
            rule.category_id,
            rule.note || null,
            rule.payment_method || null,
            rule.frequency || 'monthly',
            rule.start_date,
            rule.end_date || null,
            rule.last_generated_date || null,
            rule.active ?? 1,
            rule.created_at || Date.now(),
            rule.updated_at || Date.now(),
          ]
        );
        importedRules++;
      }
    }

    // 3. Expenses
    for (const exp of backupData.expenses || []) {
      if (!exp.id || !exp.category_id || !exp.amount_paise) continue;
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM expenses WHERE id = ?;',
        [exp.id]
      );

      if (!existing) {
        await db.runAsync(
          `INSERT INTO expenses (id, amount_paise, category_id, note, payment_method, date, recurring_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            exp.id,
            exp.amount_paise,
            exp.category_id,
            exp.note || null,
            exp.payment_method || null,
            exp.date,
            exp.recurring_id || null,
            exp.created_at || Date.now(),
            exp.updated_at || Date.now(),
          ]
        );
        importedExpenses++;
      }
    }

    // 4. Budgets
    for (const b of backupData.budgets || []) {
      if (!b.id || !b.amount_paise) continue;
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM budgets WHERE id = ?;',
        [b.id]
      );

      if (!existing) {
        // Also check unique constraint on category_id
        const catBudgetExists = b.category_id
          ? await db.getFirstAsync<{ id: string }>(
              'SELECT id FROM budgets WHERE category_id = ?;',
              [b.category_id]
            )
          : await db.getFirstAsync<{ id: string }>(
              'SELECT id FROM budgets WHERE category_id IS NULL;'
            );

        if (!catBudgetExists) {
          await db.runAsync(
            `INSERT INTO budgets (id, category_id, amount_paise, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?);`,
            [b.id, b.category_id || null, b.amount_paise, b.created_at || Date.now(), b.updated_at || Date.now()]
          );
          importedBudgets++;
        }
      }
    }

    // 5. Restore Settings if provided and in replace mode
    if (backupData.settings && mode === 'replace') {
      const setSettings = useSettingsStore.getState();
      if (backupData.settings.currency) setSettings.setCurrency(backupData.settings.currency);
      if (backupData.settings.theme) setSettings.setTheme(backupData.settings.theme);
      if (backupData.settings.weekStart) setSettings.setWeekStart(backupData.settings.weekStart);
      if (backupData.settings.monthStartDay) setSettings.setMonthStartDay(backupData.settings.monthStartDay);
    }
  });

  return {
    success: true,
    importedExpensesCount: importedExpenses,
    importedCategoriesCount: importedCategories,
    importedBudgetsCount: importedBudgets,
    importedRulesCount: importedRules,
  };
}

/**
 * Completely wipes all database data and resets categories and settings.
 */
export async function wipeAllData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM budget_alerts;');
    await db.runAsync('DELETE FROM expenses;');
    await db.runAsync('DELETE FROM recurring_rules;');
    await db.runAsync('DELETE FROM budgets;');
    await db.runAsync('DELETE FROM categories;');
    await seedCategories(db);
  });

  useSettingsStore.getState().resetAllSettings();
}
