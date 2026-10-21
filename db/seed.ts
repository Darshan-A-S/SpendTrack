import { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_CATEGORIES } from '../constants/categories';

export async function seedCategories(db: SQLiteDatabase): Promise<void> {
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories;'
  );

  if (!countRow || countRow.count === 0) {
    const now = Date.now();
    await db.withTransactionAsync(async () => {
      for (const cat of DEFAULT_CATEGORIES) {
        await db.runAsync(
          `INSERT OR IGNORE INTO categories (id, name, icon, color, sort_order, is_default, archived, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            cat.id,
            cat.name,
            cat.icon,
            cat.color,
            cat.sort_order,
            cat.is_default,
            cat.archived,
            now,
          ]
        );
      }
    });
  }
}
