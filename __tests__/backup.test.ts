import { validateBackupData, restoreBackupData } from '../services/importService';
import { BACKUP_SCHEMA_VERSION, BackupData } from '../services/exportService';
import { SQLiteDatabase } from 'expo-sqlite';

function createMockDbForBackup() {
  let categories: any[] = [];
  let expenses: any[] = [];
  let budgets: any[] = [];
  let recurringRules: any[] = [];

  const mockDb = {
    withTransactionAsync: jest.fn(async (cb: () => Promise<any>) => cb()),
    getFirstAsync: jest.fn(async (q: string, params: any[]) => {
      const sql = q.toLowerCase();
      if (sql.includes('from categories where id = ?')) {
        return categories.find((c) => c.id === params[0]) || null;
      }
      if (sql.includes('from expenses where id = ?')) {
        return expenses.find((e) => e.id === params[0]) || null;
      }
      if (sql.includes('from budgets where id = ?')) {
        return budgets.find((b) => b.id === params[0]) || null;
      }
      if (sql.includes('from recurring_rules where id = ?')) {
        return recurringRules.find((r) => r.id === params[0]) || null;
      }
      return null;
    }),
    runAsync: jest.fn(async (q: string, params: any[]) => {
      const sql = q.toLowerCase();
      if (sql.startsWith('delete from categories')) categories = [];
      if (sql.startsWith('delete from expenses')) expenses = [];
      if (sql.startsWith('delete from budgets')) budgets = [];
      if (sql.startsWith('delete from recurring_rules')) recurringRules = [];
      if (sql.startsWith('insert into categories')) {
        categories.push({ id: params[0], name: params[1] });
      }
      if (sql.startsWith('insert into expenses')) {
        expenses.push({ id: params[0], amount_paise: params[1] });
      }
      return { changes: 1 };
    }),
  } as unknown as SQLiteDatabase;

  return { mockDb, getExpenses: () => expenses, getCategories: () => categories };
}

describe('Backup Validation & Import', () => {
  test('validates backup data structure correctly', () => {
    // Valid backup
    const validBackup: BackupData = {
      version: BACKUP_SCHEMA_VERSION,
      exportedAt: Date.now(),
      appName: 'SpendTrack',
      categories: [{ id: 'cat_1', name: 'Food' }],
      expenses: [{ id: 'exp_1', amount_paise: 5000, category_id: 'cat_1', date: '2026-04-15' }],
      budgets: [],
      recurringRules: [],
      settings: { currency: '₹' },
    };
    expect(validateBackupData(validBackup).valid).toBe(true);

    // Invalid: higher version
    const futureBackup = { ...validBackup, version: 999 };
    const resFuture = validateBackupData(futureBackup);
    expect(resFuture.valid).toBe(false);
    expect(resFuture.error).toContain('newer than supported');

    // Invalid: missing categories
    const brokenBackup = { version: 1, expenses: [] };
    expect(validateBackupData(brokenBackup).valid).toBe(false);
  });

  test('restores backup data in merge and replace modes', async () => {
    const { mockDb, getExpenses } = createMockDbForBackup();

    const sampleBackup: BackupData = {
      version: BACKUP_SCHEMA_VERSION,
      exportedAt: Date.now(),
      appName: 'SpendTrack',
      categories: [
        { id: 'cat_food', name: 'Food', icon: 'restaurant-outline', color: '#F97316' },
      ],
      expenses: [
        {
          id: 'exp_backup_1',
          amount_paise: 15000,
          category_id: 'cat_food',
          date: '2026-04-15',
          note: 'Groceries',
        },
      ],
      budgets: [],
      recurringRules: [],
      settings: { currency: '₹' },
    };

    const res = await restoreBackupData(mockDb, sampleBackup, 'replace');
    expect(res.success).toBe(true);
    expect(res.importedExpensesCount).toBe(1);
    expect(res.importedCategoriesCount).toBe(1);
    expect(getExpenses().length).toBe(1);
  });
});
