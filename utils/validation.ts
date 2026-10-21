import { z } from 'zod';
import { MAX_PAISE } from './money';

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  amount_paise: z
    .number()
    .int()
    .positive({ message: 'Amount must be greater than 0' })
    .max(MAX_PAISE, { message: 'Amount exceeds maximum limit' }),
  category_id: z.string().min(1, { message: 'Category is required' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
  note: z.string().max(200, { message: 'Note cannot exceed 200 characters' }).nullable().optional(),
  payment_method: z.string().nullable().optional(),
  recurring_id: z.string().nullable().optional(),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'Category name is required' }).max(50),
  icon: z.string().min(1, { message: 'Icon is required' }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Invalid color hex' }),
  sort_order: z.number().int().default(0),
  is_default: z.number().int().default(0),
  archived: z.number().int().default(0),
});

export const budgetSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().nullable().optional(),
  amount_paise: z.number().int().positive().max(MAX_PAISE),
});

export const recurringRuleSchema = z.object({
  id: z.string().uuid().optional(),
  amount_paise: z.number().int().positive().max(MAX_PAISE),
  category_id: z.string().min(1),
  note: z.string().max(200).nullable().optional(),
  payment_method: z.string().nullable().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  active: z.number().int().min(0).max(1).default(1),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type RecurringRuleFormData = z.infer<typeof recurringRuleSchema>;
