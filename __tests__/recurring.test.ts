import { SQLiteDatabase } from 'expo-sqlite';
import { generateDueRecurringExpenses } from '../services/recurringService';
import { insertRecurringRule } from '../db/repositories/recurringRepo';

function createMockDbForRecurring() {
  const expenses: any[] = [];
  const rules: any[] = [];

  const mockDb = {
    getAllAsync: jest.fn(async (q: string) => {
      if (q.toLowerCase().includes('from recurring_rules')) {
        return rules.filter((r) => r.active === 1).map((r) => ({
          ...r,
          category_name: 'Rent',
          category_color: '#8B5CF6',
          category_icon: 'home-outline',
        }));
      }
      return expenses;
    }),
    getFirstAsync: jest.fn(async (q: string, params: any[]) => {
      if (q.toLowerCase().includes('from expenses where recurring_id = ? and date = ?')) {
        return expenses.find((e) => e.recurring_id === params[0] && e.date === params[1]) || null;
      }
      return null;
    }),
    runAsync: jest.fn(async (q: string, params: any[]) => {
      const sql = q.toLowerCase();
      if (sql.startsWith('insert into recurring_rules')) {
        rules.push({
          id: params[0],
          amount_paise: params[1],
          category_id: params[2],
          note: params[3],
          payment_method: params[4],
          frequency: params[5],
          start_date: params[6],
          end_date: params[7],
          last_generated_date: params[8],
          active: params[9],
        });
      } else if (sql.startsWith('insert into expenses')) {
        expenses.push({
          id: params[0],
          amount_paise: params[1],
          category_id: params[2],
          note: params[3],
          payment_method: params[4],
          date: params[5],
          recurring_id: params[6],
        });
      } else if (sql.startsWith('update recurring_rules set last_generated_date = ?')) {
        const rule = rules.find((r) => r.id === params[2]);
        if (rule) rule.last_generated_date = params[0];
      }
      return { changes: 1 };
    }),
  } as unknown as SQLiteDatabase;

  return { mockDb, expenses };
}

describe('Recurring Service', () => {
  test('idempotently generates due expenses and does not duplicate on second run', async () => {
    const { mockDb, expenses } = createMockDbForRecurring();

    // Insert a daily rule starting 2 days ago
    const pastDate = '2026-04-10';
    await insertRecurringRule(mockDb, {
      id: 'rule_sub_1',
      amount_paise: 50000,
      category_id: 'cat_default_food',
      note: 'Lunch tiffin',
      payment_method: 'UPI',
      frequency: 'daily',
      start_date: pastDate,
      end_date: null,
      last_generated_date: null,
      active: 1,
    });

    // Run first generation
    const count1 = await generateDueRecurringExpenses(mockDb);
    expect(count1).toBeGreaterThan(0);
    const generatedTotal = expenses.length;

    // Run second generation immediately
    const count2 = await generateDueRecurringExpenses(mockDb);
    // Should be 0 since all up to today were already generated
    expect(count2).toBe(0);
    expect(expenses.length).toBe(generatedTotal);
  });
});
