import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../db/database';
import {
  getAllCategories,
  createCategory as dbCreateCategory,
  updateCategory as dbUpdateCategory,
  archiveCategory as dbArchiveCategory,
  deleteCategory as dbDeleteCategory,
  canHardDeleteCategory as dbCanHardDeleteCategory,
  reorderCategories as dbReorderCategories,
  Category,
} from '../db/repositories/categoryRepo';
import { useDataStore } from '../store/dataStore';
import * as Crypto from 'expo-crypto';

export function useCategories(includeArchived: boolean = false) {
  const dataVersion = useDataStore((state) => state.dataVersion);
  const bumpDataVersion = useDataStore((state) => state.bumpDataVersion);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDb();
      const list = await getAllCategories(db, includeArchived);
      setCategories(list);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [includeArchived, dataVersion]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (cat: { name: string; icon: string; color: string }) => {
    const db = await getDb();
    const id = Crypto.randomUUID();
    const sort_order = categories.length + 1;
    await dbCreateCategory(db, {
      id,
      name: cat.name.trim(),
      icon: cat.icon,
      color: cat.color,
      sort_order,
      is_default: 0,
      archived: 0,
    });
    bumpDataVersion();
  };

  const updateCategory = async (cat: Partial<Category> & { id: string }) => {
    const db = await getDb();
    await dbUpdateCategory(db, cat);
    bumpDataVersion();
  };

  const archiveCategory = async (id: string, archived: boolean) => {
    const db = await getDb();
    await dbArchiveCategory(db, id, archived);
    bumpDataVersion();
  };

  const canHardDeleteCategory = async (id: string): Promise<boolean> => {
    const db = await getDb();
    return dbCanHardDeleteCategory(db, id);
  };

  const deleteCategory = async (id: string) => {
    const db = await getDb();
    await dbDeleteCategory(db, id);
    bumpDataVersion();
  };

  const reorderCategories = async (ids: string[]) => {
    const db = await getDb();
    await dbReorderCategories(db, ids);
    bumpDataVersion();
  };

  return {
    categories,
    loading,
    refresh: fetchCategories,
    addCategory,
    updateCategory,
    archiveCategory,
    canHardDeleteCategory,
    deleteCategory,
    reorderCategories,
  };
}
