import { SQLiteDatabase } from 'expo-sqlite';

export const migration002 = {
  version: 2,
  name: '002_add_pot_id',
  up: async (db: SQLiteDatabase): Promise<void> => {
    await db.execAsync(`
      ALTER TABLE expenses ADD COLUMN pot_id TEXT;
    `);
  },
};
