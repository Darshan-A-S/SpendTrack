import { SQLiteDatabase } from 'expo-sqlite';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: string;
  amount_paise: number;
  category_id: string;
  note: string | null;
  payment_method: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  last_generated_date: string | null;
  active: number;
  created_at: number;
  updated_at: number;
}

export interface RecurringRuleWithCategory extends RecurringRule {
  category_name: string;
  category_color: string;
  category_icon: string;
}

export async function getRecurringRules(
  db: SQLiteDatabase,
  activeOnly: boolean = false
): Promise<RecurringRuleWithCategory[]> {
  const whereSql = activeOnly ? 'WHERE r.active = 1' : '';
  const query = `
    SELECT
      r.id,
      r.amount_paise,
      r.category_id,
      r.note,
      r.payment_method,
      r.frequency,
      r.start_date,
      r.end_date,
      r.last_generated_date,
      r.active,
      r.created_at,
      r.updated_at,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon
    FROM recurring_rules r
    JOIN categories c ON r.category_id = c.id
    ${whereSql}
    ORDER BY r.created_at DESC;
  `;

  return db.getAllAsync<RecurringRuleWithCategory>(query);
}

export async function getRecurringRuleById(
  db: SQLiteDatabase,
  id: string
): Promise<RecurringRuleWithCategory | null> {
  const query = `
    SELECT
      r.id,
      r.amount_paise,
      r.category_id,
      r.note,
      r.payment_method,
      r.frequency,
      r.start_date,
      r.end_date,
      r.last_generated_date,
      r.active,
      r.created_at,
      r.updated_at,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon
    FROM recurring_rules r
    JOIN categories c ON r.category_id = c.id
    WHERE r.id = ?;
  `;

  const row = await db.getFirstAsync<RecurringRuleWithCategory>(query, [id]);
  return row ?? null;
}

export async function insertRecurringRule(
  db: SQLiteDatabase,
  rule: Omit<RecurringRule, 'created_at' | 'updated_at'>
): Promise<RecurringRule> {
  const now = Date.now();
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
      rule.frequency,
      rule.start_date,
      rule.end_date || null,
      rule.last_generated_date || null,
      rule.active,
      now,
      now,
    ]
  );

  return {
    ...rule,
    created_at: now,
    updated_at: now,
  };
}

export async function updateRecurringRule(
  db: SQLiteDatabase,
  rule: Partial<RecurringRule> & { id: string }
): Promise<void> {
  const existing = await getRecurringRuleById(db, rule.id);
  if (!existing) {
    throw new Error(`Recurring rule not found: ${rule.id}`);
  }

  const now = Date.now();
  const updatedAmount = rule.amount_paise ?? existing.amount_paise;
  const updatedCategoryId = rule.category_id ?? existing.category_id;
  const updatedNote = rule.note !== undefined ? rule.note : existing.note;
  const updatedPaymentMethod =
    rule.payment_method !== undefined ? rule.payment_method : existing.payment_method;
  const updatedFrequency = rule.frequency ?? existing.frequency;
  const updatedStartDate = rule.start_date ?? existing.start_date;
  const updatedEndDate = rule.end_date !== undefined ? rule.end_date : existing.end_date;
  const updatedActive = rule.active ?? existing.active;
  const updatedLastGen =
    rule.last_generated_date !== undefined
      ? rule.last_generated_date
      : existing.last_generated_date;

  await db.runAsync(
    `UPDATE recurring_rules
     SET amount_paise = ?, category_id = ?, note = ?, payment_method = ?,
         frequency = ?, start_date = ?, end_date = ?, last_generated_date = ?,
         active = ?, updated_at = ?
     WHERE id = ?;`,
    [
      updatedAmount,
      updatedCategoryId,
      updatedNote,
      updatedPaymentMethod,
      updatedFrequency,
      updatedStartDate,
      updatedEndDate,
      updatedLastGen,
      updatedActive,
      now,
      rule.id,
    ]
  );
}

export async function toggleRecurringRuleActive(
  db: SQLiteDatabase,
  id: string,
  active: boolean
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE recurring_rules SET active = ?, updated_at = ? WHERE id = ?;',
    [active ? 1 : 0, now, id]
  );
}

export async function updateLastGeneratedDate(
  db: SQLiteDatabase,
  id: string,
  lastDate: string
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    'UPDATE recurring_rules SET last_generated_date = ?, updated_at = ? WHERE id = ?;',
    [lastDate, now, id]
  );
}

export async function deleteRecurringRule(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM recurring_rules WHERE id = ?;', [id]);
}
