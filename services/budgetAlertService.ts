import { SQLiteDatabase } from 'expo-sqlite';
import {
  getBudgets,
  hasBudgetAlertFired,
  recordBudgetAlert,
} from '../db/repositories/budgetRepo';
import {
  getExpensesSummary,
  getExpensesByCategory,
} from '../db/repositories/expenseRepo';
import { sendLocalAlertNotification } from './notificationService';
import { formatCurrency } from '../utils/money';
import { formatMonthKey, getMonthCycleRange } from '../utils/dates';

/**
 * Checks overall and category budget thresholds (80% and 100%) for the current month cycle.
 * Fires a local notification once per budget per month per threshold.
 */
export async function checkBudgetAlerts(
  db: SQLiteDatabase,
  monthStartDay: number = 1,
  currency: string = '₹'
): Promise<void> {
  const now = new Date();
  const currentMonthKey = formatMonthKey(now);
  const cycle = getMonthCycleRange(now, monthStartDay);

  const budgets = await getBudgets(db);
  if (budgets.length === 0) return;

  // 1. Overall budget check
  const overallBudget = budgets.find((b) => b.category_id === null);
  if (overallBudget) {
    const summary = await getExpensesSummary(db, cycle.startDate, cycle.endDate, true);
    const spentPaise = summary.total_paise;
    const limitPaise = overallBudget.amount_paise;
    const ratio = spentPaise / limitPaise;

    // Check 100%
    if (ratio >= 1.0) {
      const alreadyFired = await hasBudgetAlertFired(db, overallBudget.id, currentMonthKey, 100);
      if (!alreadyFired) {
        await recordBudgetAlert(db, overallBudget.id, currentMonthKey, 100);
        await sendLocalAlertNotification(
          'Monthly Budget Exceeded!',
          `You have spent ${formatCurrency(spentPaise, currency)} of your ${formatCurrency(limitPaise, currency)} budget.`
        );
      }
    } else if (ratio >= 0.8) {
      // Check 80%
      const alreadyFired = await hasBudgetAlertFired(db, overallBudget.id, currentMonthKey, 80);
      if (!alreadyFired) {
        await recordBudgetAlert(db, overallBudget.id, currentMonthKey, 80);
        await sendLocalAlertNotification(
          'Budget Warning (80%)',
          `You have spent 80% (${formatCurrency(spentPaise, currency)}) of your monthly budget.`
        );
      }
    }
  }

  // 2. Category budgets check
  const categoryBudgets = budgets.filter((b) => b.category_id !== null);
  if (categoryBudgets.length > 0) {
    const categoryExpenses = await getExpensesByCategory(
      db,
      cycle.startDate,
      cycle.endDate,
      true
    );
    const spentByCatMap = new Map<string, number>();
    for (const exp of categoryExpenses) {
      spentByCatMap.set(exp.category_id, exp.total_paise);
    }

    for (const catBudget of categoryBudgets) {
      const categoryId = catBudget.category_id!;
      const spentPaise = spentByCatMap.get(categoryId) || 0;
      const limitPaise = catBudget.amount_paise;
      const ratio = spentPaise / limitPaise;
      const catName = catBudget.category_name || 'Category';

      if (ratio >= 1.0) {
        const alreadyFired = await hasBudgetAlertFired(db, catBudget.id, currentMonthKey, 100);
        if (!alreadyFired) {
          await recordBudgetAlert(db, catBudget.id, currentMonthKey, 100);
          await sendLocalAlertNotification(
            `${catName} Budget Exceeded!`,
            `You spent ${formatCurrency(spentPaise, currency)} of your ${formatCurrency(limitPaise, currency)} budget for ${catName}.`
          );
        }
      } else if (ratio >= 0.8) {
        const alreadyFired = await hasBudgetAlertFired(db, catBudget.id, currentMonthKey, 80);
        if (!alreadyFired) {
          await recordBudgetAlert(db, catBudget.id, currentMonthKey, 80);
          await sendLocalAlertNotification(
            `${catName} Budget Warning (80%)`,
            `You have spent 80% of your ${catName} budget.`
          );
        }
      }
    }
  }
}
