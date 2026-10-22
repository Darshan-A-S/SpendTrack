import { SQLiteDatabase } from 'expo-sqlite';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../db/repositories/categoryRepo';
import {
  insertExpense,
  getExpenseById,
  deleteExpense,
  getExpensesSummary,
} from '../db/repositories/expenseRepo';
import { setBudget, getBudgets, deleteBudget } from '../db/repositories/budgetRepo';
import {
  insertRecurringRule,
  getRecurringRules,
  toggleRecurringRuleActive,
} from '../db/repositories/recurringRepo';

// Create a typed mock DB for unit testing repository functions
function createMockDb(): SQLiteDatabase {
  const tables = {
    categories: [] as any[],
    expenses: [] as any[],
    budgets: [] as any[],
    recurring_rules: [] as any[],
    budget_alerts: [] as any[],
  };

  const mockDb = {
    getAllAsync: jest.fn(async (query: string, params: any[] = []) => {
      const q = query.toLowerCase();
      if (q.includes('from categories')) {
        let results = [...tables.categories];
        if (q.includes('archived = 0')) {
          results = results.filter((c) => c.archived === 0);
        }
        return results;
      }
      if (q.includes('from expenses')) {
        let results = tables.expenses.map((e) => {
          const cat = tables.categories.find((c) => c.id === e.category_id) || {
            name: 'Cat',
            color: '#fff',
            icon: 'icon',
          };
          return {
            ...e,
            category_name: cat.name,
            category_color: cat.color,
            category_icon: cat.icon,
          };
        });
        return results;
      }
      if (q.includes('from budgets')) {
        return tables.budgets.map((b) => ({
          ...b,
          category_name: 'Test Cat',
          category_color: '#fff',
          category_icon: 'icon',
        }));
      }
      if (q.includes('from recurring_rules')) {
        let results = [...tables.recurring_rules];
        if (q.includes('r.active = 1')) {
          results = results.filter((r) => r.active === 1);
        }
        return results.map((r) => ({
          ...r,
          category_name: 'Cat',
          category_color: '#fff',
          category_icon: 'icon',
        }));
      }
      return [];
    }),

    getFirstAsync: jest.fn(async (query: string, params: any[] = []) => {
      const q = query.toLowerCase();
      if (q.includes('from categories where id = ?')) {
        return tables.categories.find((c) => c.id === params[0]) ?? null;
      }
      if (q.includes('from expenses') && (q.includes('where e.id = ?') || q.includes('where id = ?'))) {
        const exp = tables.expenses.find((e) => e.id === params[0]);
        if (!exp) return null;
        return {
          ...exp,
          category_name: 'Food',
          category_color: '#F97316',
          category_icon: 'restaurant-outline',
        };
      }
      if (q.includes('select sum(amount_paise) as total_paise, count(*) as count from expenses')) {
        let exps = tables.expenses;
        if (q.includes('pot_id is null')) {
          exps = exps.filter((e) => !e.pot_id && (!e.note || !e.note.startsWith('[')));
        }
        const total = exps.reduce((sum, e) => sum + e.amount_paise, 0);
        return { total_paise: total, count: exps.length };
      }
      if (q.includes('from budgets where category_id is null')) {
        return tables.budgets.find((b) => b.category_id === null) ?? null;
      }
      if (q.includes('from budgets where category_id = ?')) {
        return tables.budgets.find((b) => b.category_id === params[0]) ?? null;
      }
      if (q.includes('from recurring_rules where r.id = ?')) {
        const r = tables.recurring_rules.find((rule) => rule.id === params[0]);
        if (!r) return null;
        return {
          ...r,
          category_name: 'Cat',
          category_color: '#fff',
          category_icon: 'icon',
        };
      }
      if (q.includes('count(*) as count from expenses where category_id = ?')) {
        const count = tables.expenses.filter((e) => e.category_id === params[0]).length;
        return { count };
      }
      if (q.includes('count(*) as count from recurring_rules where category_id = ?')) {
        const count = tables.recurring_rules.filter((r) => r.category_id === params[0]).length;
        return { count };
      }
      if (q.includes('count(*) as count from budgets where category_id = ?')) {
        const count = tables.budgets.filter((b) => b.category_id === params[0]).length;
        return { count };
      }
      return null;
    }),

    runAsync: jest.fn(async (query: string, params: any[] = []) => {
      const q = query.toLowerCase();
      if (q.startsWith('insert into categories')) {
        tables.categories.push({
          id: params[0],
          name: params[1],
          icon: params[2],
          color: params[3],
          sort_order: params[4],
          is_default: params[5],
          archived: params[6],
          created_at: params[7],
        });
      } else if (q.startsWith('update categories set name')) {
        const cat = tables.categories.find((c) => c.id === params[5]);
        if (cat) {
          cat.name = params[0];
          cat.icon = params[1];
          cat.color = params[2];
          cat.sort_order = params[3];
          cat.archived = params[4];
        }
      } else if (q.startsWith('update categories set archived = ?')) {
        const cat = tables.categories.find((c) => c.id === params[1]);
        if (cat) cat.archived = params[0];
      } else if (q.startsWith('delete from categories')) {
        tables.categories = tables.categories.filter((c) => c.id !== params[0]);
      } else if (q.startsWith('insert into expenses')) {
        tables.expenses.push({
          id: params[0],
          amount_paise: params[1],
          category_id: params[2],
          note: params[3],
          payment_method: params[4],
          date: params[5],
          recurring_id: params[6],
          pot_id: params[7],
          created_at: params[8],
          updated_at: params[9],
        });
      } else if (q.startsWith('delete from expenses')) {
        tables.expenses = tables.expenses.filter((e) => e.id !== params[0]);
      } else if (q.startsWith('insert into budgets')) {
        tables.budgets.push({
          id: params[0],
          category_id: params[1],
          amount_paise: params[2],
          created_at: params[3],
          updated_at: params[4],
        });
      } else if (q.startsWith('delete from budgets')) {
        tables.budgets = tables.budgets.filter((b) => b.id !== params[0]);
      } else if (q.startsWith('insert into recurring_rules')) {
        tables.recurring_rules.push({
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
          created_at: params[10],
          updated_at: params[11],
        });
      } else if (q.startsWith('update recurring_rules set active = ?')) {
        const r = tables.recurring_rules.find((rule) => rule.id === params[2]);
        if (r) r.active = params[0];
      }
      return { lastInsertRowId: 1, changes: 1 };
    }),

    execAsync: jest.fn(async () => {}),
    withTransactionAsync: jest.fn(async (cb: () => Promise<any>) => cb()),
  } as unknown as SQLiteDatabase;

  return mockDb;
}

describe('Repositories CRUD Layer', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = createMockDb();
  });

  test('Category repository creates, reads, updates, and archives categories', async () => {
    const newCat = await createCategory(db, {
      id: 'cat_test_1',
      name: 'Freelance',
      icon: 'cash-outline',
      color: '#10B981',
      sort_order: 1,
      is_default: 0,
      archived: 0,
    });
    expect(newCat.id).toBe('cat_test_1');

    const list = await getAllCategories(db);
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Freelance');

    await updateCategory(db, {
      id: 'cat_test_1',
      name: 'Side Project',
    });

    const deleted = await deleteCategory(db, 'cat_test_1');
    expect(deleted).toBe(true);
  });

  test('Expense repository creates, reads, and deletes expenses', async () => {
    const expense = await insertExpense(db, {
      id: 'exp_test_1',
      amount_paise: 25000,
      category_id: 'cat_test_1',
      note: 'Dinner with friends',
      payment_method: 'UPI',
      date: '2026-04-15',
      recurring_id: null,
    });
    expect(expense.amount_paise).toBe(25000);

    const fetched = await getExpenseById(db, 'exp_test_1');
    expect(fetched).not.toBeNull();
    expect(fetched?.amount_paise).toBe(25000);

    const summary = await getExpensesSummary(db, '2026-04-01', '2026-04-30');
    expect(summary.total_paise).toBe(25000);
    expect(summary.count).toBe(1);

    // Add an expense allocated to a pot
    await insertExpense(db, {
      id: 'exp_test_pot',
      amount_paise: 750000,
      category_id: 'cat_test_1',
      note: '[Rent] PG fee',
      payment_method: 'UPI',
      date: '2026-04-15',
      recurring_id: null,
      pot_id: 'pot_rent',
    });

    const totalSummary = await getExpensesSummary(db, '2026-04-01', '2026-04-30');
    expect(totalSummary.total_paise).toBe(775000);

    const discretionarySummary = await getExpensesSummary(db, '2026-04-01', '2026-04-30', false, true);
    expect(discretionarySummary.total_paise).toBe(25000);

    await deleteExpense(db, 'exp_test_pot');
    await deleteExpense(db, 'exp_test_1');
  });

  test('Budget repository sets, retrieves, and deletes budgets', async () => {
    const budget = await setBudget(db, {
      id: 'budget_overall',
      category_id: null,
      amount_paise: 5000000, // 50,000 INR
    });
    expect(budget.amount_paise).toBe(5000000);

    const budgets = await getBudgets(db);
    expect(budgets.length).toBe(1);

    await deleteBudget(db, 'budget_overall');
  });

  test('Recurring rule repository inserts and toggles active state', async () => {
    const rule = await insertRecurringRule(db, {
      id: 'rule_1',
      amount_paise: 1500000,
      category_id: 'cat_test_1',
      note: 'Monthly Rent',
      payment_method: 'Net Banking',
      frequency: 'monthly',
      start_date: '2026-04-01',
      end_date: null,
      last_generated_date: null,
      active: 1,
    });
    expect(rule.frequency).toBe('monthly');

    const rules = await getRecurringRules(db, true);
    expect(rules.length).toBe(1);

    await toggleRecurringRuleActive(db, 'rule_1', false);
  });
});
