import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import {
  getRecurringRules,
  updateLastGeneratedDate,
} from '../db/repositories/recurringRepo';
import { insertExpense } from '../db/repositories/expenseRepo';
import {
  getTodayDateString,
  getNextRecurringDate,
  parseDateString,
} from '../utils/dates';

/**
 * Generates due recurring expenses up to today in an idempotent manner.
 * Returns the count of newly generated expenses.
 */
export async function generateDueRecurringExpenses(
  db: SQLiteDatabase
): Promise<number> {
  const activeRules = await getRecurringRules(db, true);
  const todayStr = getTodayDateString();
  let generatedCount = 0;

  for (const rule of activeRules) {
    const originalDay = parseDateString(rule.start_date).getDate();

    // Determine starting anchor for generation
    let nextDate: string;
    if (rule.last_generated_date) {
      nextDate = getNextRecurringDate(rule.last_generated_date, rule.frequency, originalDay);
    } else {
      nextDate = rule.start_date;
    }

    let lastSuccessfulDate = rule.last_generated_date;

    // Generate all due dates up to today and within end_date if set
    while (nextDate <= todayStr && (!rule.end_date || nextDate <= rule.end_date)) {
      // Check if expense already generated for this rule and date (idempotency safeguard)
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM expenses WHERE recurring_id = ? AND date = ?;',
        [rule.id, nextDate]
      );

      if (!existing) {
        await insertExpense(db, {
          id: Crypto.randomUUID(),
          amount_paise: rule.amount_paise,
          category_id: rule.category_id,
          note: rule.note,
          payment_method: rule.payment_method,
          date: nextDate,
          recurring_id: rule.id,
        });
        generatedCount++;
      }

      lastSuccessfulDate = nextDate;
      nextDate = getNextRecurringDate(nextDate, rule.frequency, originalDay);
    }

    if (lastSuccessfulDate && lastSuccessfulDate !== rule.last_generated_date) {
      await updateLastGeneratedDate(db, rule.id, lastSuccessfulDate);
    }
  }

  return generatedCount;
}
