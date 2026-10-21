import { SQLiteDatabase } from 'expo-sqlite';

export interface Budget {
  id: string;
  category_id: string | null;
  amount_paise: number;
  created_at: number;
  updated_at: number;
}

export interface BudgetWithCategory extends Budget {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
}

export async function getBudgets(db: SQLiteDatabase): Promise<BudgetWithCategory[]> {
  const query = `
    SELECT
      b.id,
      b.category_id,
      b.amount_paise,
      b.created_at,
      b.updated_at,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    ORDER BY (b.category_id IS NULL) DESC, c.name ASC;
  `;

  return db.getAllAsync<BudgetWithCategory>(query);
}

export async function getOverallBudget(db: SQLiteDatabase): Promise<Budget | null> {
  const row = await db.getFirstAsync<Budget>(
    'SELECT * FROM budgets WHERE category_id IS NULL;'
  );
  return row ?? null;
}

export async function getCategoryBudget(
  db: SQLiteDatabase,
  categoryId: string
): Promise<Budget | null> {
  const row = await db.getFirstAsync<Budget>(
    'SELECT * FROM budgets WHERE category_id = ?;',
    [categoryId]
  );
  return row ?? null;
}

export async function setBudget(
  db: SQLiteDatabase,
  budget: { id: string; category_id: string | null; amount_paise: number }
): Promise<Budget> {
  const now = Date.now();

  // Check if exists for this category_id (or NULL for overall)
  const existing = budget.category_id
    ? await getCategoryBudget(db, budget.category_id)
    : await getOverallBudget(db);

  if (existing) {
    await db.runAsync(
      'UPDATE budgets SET amount_paise = ?, updated_at = ? WHERE id = ?;',
      [budget.amount_paise, now, existing.id]
    );
    return {
      ...existing,
      amount_paise: budget.amount_paise,
      updated_at: now,
    };
  }

  await db.runAsync(
    `INSERT INTO budgets (id, category_id, amount_paise, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?);`,
    [budget.id, budget.category_id, budget.amount_paise, now, now]
  );

  return {
    id: budget.id,
    category_id: budget.category_id,
    amount_paise: budget.amount_paise,
    created_at: now,
    updated_at: now,
  };
}

export async function deleteBudget(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM budgets WHERE id = ?;', [id]);
}

export async function hasBudgetAlertFired(
  db: SQLiteDatabase,
  budgetId: string,
  month: string,
  threshold: number
): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM budget_alerts WHERE budget_id = ? AND month = ? AND threshold = ?;',
    [budgetId, month, threshold]
  );
  return (row?.count ?? 0) > 0;
}

export async function recordBudgetAlert(
  db: SQLiteDatabase,
  budgetId: string,
  month: string,
  threshold: number
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    `INSERT OR IGNORE INTO budget_alerts (budget_id, month, threshold, fired_at)
     VALUES (?, ?, ?, ?);`,
    [budgetId, month, threshold, now]
  );
}

export async function clearBudgetAlerts(
  db: SQLiteDatabase,
  budgetId?: string
): Promise<void> {
  if (budgetId) {
    await db.runAsync('DELETE FROM budget_alerts WHERE budget_id = ?;', [budgetId]);
  } else {
    await db.runAsync('DELETE FROM budget_alerts;');
  }
}
