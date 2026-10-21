import { SQLiteDatabase } from 'expo-sqlite';

export const migration001 = {
  version: 1,
  name: '001_initial_schema',
  up: async (db: SQLiteDatabase): Promise<void> => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL,
        icon         TEXT NOT NULL,
        color        TEXT NOT NULL,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        is_default   INTEGER NOT NULL DEFAULT 0,
        archived     INTEGER NOT NULL DEFAULT 0,
        created_at   INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recurring_rules (
        id                    TEXT PRIMARY KEY,
        amount_paise          INTEGER NOT NULL CHECK (amount_paise > 0),
        category_id           TEXT NOT NULL REFERENCES categories(id),
        note                  TEXT,
        payment_method        TEXT,
        frequency             TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
        start_date            TEXT NOT NULL,
        end_date              TEXT,
        last_generated_date   TEXT,
        active                INTEGER NOT NULL DEFAULT 1,
        created_at            INTEGER NOT NULL,
        updated_at            INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id             TEXT PRIMARY KEY,
        amount_paise   INTEGER NOT NULL CHECK (amount_paise > 0),
        category_id    TEXT NOT NULL REFERENCES categories(id),
        note           TEXT,
        payment_method TEXT,
        date           TEXT NOT NULL,
        recurring_id   TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(recurring_id);

      CREATE TABLE IF NOT EXISTS budgets (
        id            TEXT PRIMARY KEY,
        category_id   TEXT REFERENCES categories(id),
        amount_paise  INTEGER NOT NULL CHECK (amount_paise > 0),
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL,
        UNIQUE (category_id)
      );

      CREATE TABLE IF NOT EXISTS budget_alerts (
        budget_id   TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        month       TEXT NOT NULL,
        threshold   INTEGER NOT NULL,
        fired_at    INTEGER NOT NULL,
        PRIMARY KEY (budget_id, month, threshold)
      );
    `);
  },
};
