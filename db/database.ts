import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { seedCategories } from './seed';

const DB_NAME = 'spendtrack.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  return initDatabase();
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Enable foreign keys and WAL mode for optimal offline performance
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // Run migrations and seed defaults
  await runMigrations(db);
  await seedCategories(db);

  dbInstance = db;
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
