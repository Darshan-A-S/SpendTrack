import { SQLiteDatabase } from 'expo-sqlite';
import { getTodayDateString } from '../../utils/dates';

export interface Expense {
  id: string;
  amount_paise: number;
  category_id: string;
  note: string | null;
  payment_method: string | null;
  date: string;
  recurring_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface ExpenseWithCategory extends Expense {
  category_name: string;
  category_color: string;
  category_icon: string;
}

export interface ExpenseFilterOptions {
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
  paymentMethods?: string[];
  minAmountPaise?: number;
  maxAmountPaise?: number;
  searchNote?: string;
  limit?: number;
  offset?: number;
}

export async function getExpenses(
  db: SQLiteDatabase,
  filters: ExpenseFilterOptions = {}
): Promise<ExpenseWithCategory[]> {
  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters.startDate) {
    whereClauses.push('e.date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    whereClauses.push('e.date <= ?');
    params.push(filters.endDate);
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',');
    whereClauses.push(`e.category_id IN (${placeholders})`);
    params.push(...filters.categoryIds);
  }
  if (filters.paymentMethods && filters.paymentMethods.length > 0) {
    const placeholders = filters.paymentMethods.map(() => '?').join(',');
    whereClauses.push(`e.payment_method IN (${placeholders})`);
    params.push(...filters.paymentMethods);
  }
  if (filters.minAmountPaise !== undefined) {
    whereClauses.push('e.amount_paise >= ?');
    params.push(filters.minAmountPaise);
  }
  if (filters.maxAmountPaise !== undefined) {
    whereClauses.push('e.amount_paise <= ?');
    params.push(filters.maxAmountPaise);
  }
  if (filters.searchNote && filters.searchNote.trim()) {
    whereClauses.push('e.note LIKE ?');
    params.push(`%${filters.searchNote.trim()}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  let paginationSql = '';
  if (filters.limit !== undefined) {
    paginationSql = `LIMIT ${filters.limit}`;
    if (filters.offset !== undefined) {
      paginationSql += ` OFFSET ${filters.offset}`;
    }
  }

  const query = `
    SELECT
      e.id,
      e.amount_paise,
      e.category_id,
      e.note,
      e.payment_method,
      e.date,
      e.recurring_id,
      e.created_at,
      e.updated_at,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    ${whereSql}
    ORDER BY e.date DESC, e.created_at DESC
    ${paginationSql};
  `;

  return db.getAllAsync<ExpenseWithCategory>(query, params);
}

export async function getExpenseById(
  db: SQLiteDatabase,
  id: string
): Promise<ExpenseWithCategory | null> {
  const query = `
    SELECT
      e.id,
      e.amount_paise,
      e.category_id,
      e.note,
      e.payment_method,
      e.date,
      e.recurring_id,
      e.created_at,
      e.updated_at,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    WHERE e.id = ?;
  `;

  const row = await db.getFirstAsync<ExpenseWithCategory>(query, [id]);
  return row ?? null;
}

export async function insertExpense(
  db: SQLiteDatabase,
  expense: Omit<Expense, 'created_at' | 'updated_at'>
): Promise<Expense> {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO expenses (id, amount_paise, category_id, note, payment_method, date, recurring_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      expense.id,
      expense.amount_paise,
      expense.category_id,
      expense.note || null,
      expense.payment_method || null,
      expense.date,
      expense.recurring_id || null,
      now,
      now,
    ]
  );

  return {
    ...expense,
    created_at: now,
    updated_at: now,
  };
}

export async function updateExpense(
  db: SQLiteDatabase,
  expense: Partial<Expense> & { id: string }
): Promise<void> {
  const existing = await getExpenseById(db, expense.id);
  if (!existing) {
    throw new Error(`Expense not found: ${expense.id}`);
  }

  const now = Date.now();
  const updatedAmount = expense.amount_paise ?? existing.amount_paise;
  const updatedCategoryId = expense.category_id ?? existing.category_id;
  const updatedNote = expense.note !== undefined ? expense.note : existing.note;
  const updatedPaymentMethod =
    expense.payment_method !== undefined ? expense.payment_method : existing.payment_method;
  const updatedDate = expense.date ?? existing.date;
  const updatedRecurringId =
    expense.recurring_id !== undefined ? expense.recurring_id : existing.recurring_id;

  await db.runAsync(
    `UPDATE expenses
     SET amount_paise = ?, category_id = ?, note = ?, payment_method = ?, date = ?, recurring_id = ?, updated_at = ?
     WHERE id = ?;`,
    [
      updatedAmount,
      updatedCategoryId,
      updatedNote,
      updatedPaymentMethod,
      updatedDate,
      updatedRecurringId,
      now,
      expense.id,
    ]
  );
}

export async function deleteExpense(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
}

/**
 * Returns distinct recent notes with their category for autocomplete.
 */
export async function getRecentNotes(
  db: SQLiteDatabase,
  limit: number = 20
): Promise<{ note: string; category_id: string }[]> {
  const query = `
    SELECT note, category_id
    FROM expenses
    WHERE note IS NOT NULL AND TRIM(note) != ''
    GROUP BY note
    ORDER BY MAX(created_at) DESC
    LIMIT ?;
  `;
  return db.getAllAsync<{ note: string; category_id: string }>(query, [limit]);
}

/**
 * Returns total paise and count for a date range.
 * If excludeFuture is true, expenses dated after today are omitted.
 */
export async function getExpensesSummary(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
  excludeFuture: boolean = false
): Promise<{ total_paise: number; count: number }> {
  let dateFilter = 'date >= ? AND date <= ?';
  const params: (string | number)[] = [startDate, endDate];

  if (excludeFuture) {
    dateFilter += ' AND date <= ?';
    params.push(getTodayDateString());
  }

  const row = await db.getFirstAsync<{ total_paise: number | null; count: number }>(
    `SELECT SUM(amount_paise) as total_paise, COUNT(*) as count FROM expenses WHERE ${dateFilter};`,
    params
  );

  return {
    total_paise: row?.total_paise ?? 0,
    count: row?.count ?? 0,
  };
}

/**
 * Category breakdown in a given date range.
 */
export async function getExpensesByCategory(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
  excludeFuture: boolean = false
): Promise<
  {
    category_id: string;
    category_name: string;
    category_color: string;
    category_icon: string;
    total_paise: number;
    count: number;
  }[]
> {
  let dateFilter = 'e.date >= ? AND e.date <= ?';
  const params: (string | number)[] = [startDate, endDate];

  if (excludeFuture) {
    dateFilter += ' AND e.date <= ?';
    params.push(getTodayDateString());
  }

  const query = `
    SELECT
      e.category_id,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon,
      SUM(e.amount_paise) AS total_paise,
      COUNT(e.id) AS count
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    WHERE ${dateFilter}
    GROUP BY e.category_id
    ORDER BY total_paise DESC;
  `;

  return db.getAllAsync(query, params);
}

/**
 * Daily spending grouped by date.
 */
export async function getDailySpending(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<{ date: string; total_paise: number }[]> {
  const query = `
    SELECT date, SUM(amount_paise) AS total_paise
    FROM expenses
    WHERE date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date ASC;
  `;

  return db.getAllAsync<{ date: string; total_paise: number }>(query, [
    startDate,
    endDate,
  ]);
}

/**
 * Returns top highest expenses in range.
 */
export async function getTopExpenses(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
  limit: number = 5
): Promise<ExpenseWithCategory[]> {
  const query = `
    SELECT
      e.id,
      e.amount_paise,
      e.category_id,
      e.note,
      e.payment_method,
      e.date,
      e.recurring_id,
      e.created_at,
      e.updated_at,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    WHERE e.date >= ? AND e.date <= ?
    ORDER BY e.amount_paise DESC
    LIMIT ?;
  `;

  return db.getAllAsync<ExpenseWithCategory>(query, [startDate, endDate, limit]);
}

/**
 * Payment method breakdown in range.
 */
export async function getPaymentMethodBreakdown(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<{ payment_method: string; total_paise: number; count: number }[]> {
  const query = `
    SELECT
      COALESCE(payment_method, 'Other') AS payment_method,
      SUM(amount_paise) AS total_paise,
      COUNT(*) AS count
    FROM expenses
    WHERE date >= ? AND date <= ?
    GROUP BY payment_method
    ORDER BY total_paise DESC;
  `;

  return db.getAllAsync(query, [startDate, endDate]);
}
