import { SQLiteDatabase } from 'expo-sqlite';
import { OTHER_CATEGORY_ID } from '../../constants/categories';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_default: number;
  archived: number;
  created_at: number;
}

export async function getAllCategories(
  db: SQLiteDatabase,
  includeArchived: boolean = false
): Promise<Category[]> {
  const query = includeArchived
    ? 'SELECT * FROM categories ORDER BY sort_order ASC, name ASC;'
    : 'SELECT * FROM categories WHERE archived = 0 ORDER BY sort_order ASC, name ASC;';

  return db.getAllAsync<Category>(query);
}

export async function getCategoryById(
  db: SQLiteDatabase,
  id: string
): Promise<Category | null> {
  const row = await db.getFirstAsync<Category>(
    'SELECT * FROM categories WHERE id = ?;',
    [id]
  );
  return row ?? null;
}

export async function createCategory(
  db: SQLiteDatabase,
  cat: Omit<Category, 'created_at'>
): Promise<Category> {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, color, sort_order, is_default, archived, created_at)
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

  return {
    ...cat,
    created_at: now,
  };
}

export async function updateCategory(
  db: SQLiteDatabase,
  cat: Partial<Category> & { id: string }
): Promise<void> {
  // Disallow modifying OTHER category
  if (cat.id === OTHER_CATEGORY_ID && cat.archived === 1) {
    throw new Error('The Other category cannot be archived.');
  }

  const existing = await getCategoryById(db, cat.id);
  if (!existing) {
    throw new Error(`Category not found: ${cat.id}`);
  }

  const updatedName = cat.name ?? existing.name;
  const updatedIcon = cat.icon ?? existing.icon;
  const updatedColor = cat.color ?? existing.color;
  const updatedSortOrder = cat.sort_order ?? existing.sort_order;
  const updatedArchived = cat.archived ?? existing.archived;

  await db.runAsync(
    `UPDATE categories
     SET name = ?, icon = ?, color = ?, sort_order = ?, archived = ?
     WHERE id = ?;`,
    [
      updatedName,
      updatedIcon,
      updatedColor,
      updatedSortOrder,
      updatedArchived,
      cat.id,
    ]
  );
}

export async function archiveCategory(
  db: SQLiteDatabase,
  id: string,
  archived: boolean
): Promise<void> {
  if (id === OTHER_CATEGORY_ID && archived) {
    throw new Error('The Other category cannot be archived.');
  }

  await db.runAsync('UPDATE categories SET archived = ? WHERE id = ?;', [
    archived ? 1 : 0,
    id,
  ]);
}

export async function reorderCategories(
  db: SQLiteDatabase,
  categoryIdsInOrder: string[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < categoryIdsInOrder.length; i++) {
      await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?;', [
        i + 1,
        categoryIdsInOrder[i],
      ]);
    }
  });
}

export async function canHardDeleteCategory(
  db: SQLiteDatabase,
  id: string
): Promise<boolean> {
  if (id === OTHER_CATEGORY_ID) return false;

  const expenseCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM expenses WHERE category_id = ?;',
    [id]
  );
  if (expenseCount && expenseCount.count > 0) return false;

  const ruleCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM recurring_rules WHERE category_id = ?;',
    [id]
  );
  if (ruleCount && ruleCount.count > 0) return false;

  const budgetCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM budgets WHERE category_id = ?;',
    [id]
  );
  if (budgetCount && budgetCount.count > 0) return false;

  return true;
}

export async function deleteCategory(
  db: SQLiteDatabase,
  id: string
): Promise<boolean> {
  const canDelete = await canHardDeleteCategory(db, id);
  if (!canDelete) {
    throw new Error('Category has associated data and cannot be deleted.');
  }

  await db.runAsync('DELETE FROM categories WHERE id = ?;', [id]);
  return true;
}
