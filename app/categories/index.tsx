import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useCategories } from '../../hooks/useCategories';
import { useThemeColor } from '../../hooks/useThemeColor';
import { OTHER_CATEGORY_ID } from '../../constants/categories';
import { Spacing, Radii, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';
import { Category } from '../../db/repositories/categoryRepo';

export default function CategoriesListScreen() {
  const router = useRouter();
  const { colors } = useThemeColor();

  const [showArchived, setShowArchived] = useState(false);
  const {
    categories,
    archiveCategory,
    deleteCategory,
    canHardDeleteCategory,
  } = useCategories(true);

  const activeCategories = categories.filter((c) => c.archived === 0);
  const archivedCategories = categories.filter((c) => c.archived === 1);

  const handleArchiveToggle = async (cat: Category) => {
    if (cat.id === OTHER_CATEGORY_ID) {
      Alert.alert(Strings.common.warning, Strings.categories.cannotModifyOther);
      return;
    }

    const newArchived = cat.archived === 0;
    await archiveCategory(cat.id, newArchived);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleDelete = async (cat: Category) => {
    if (cat.id === OTHER_CATEGORY_ID) {
      Alert.alert(Strings.common.warning, Strings.categories.cannotModifyOther);
      return;
    }

    const canDelete = await canHardDeleteCategory(cat.id);
    if (!canDelete) {
      Alert.alert(
        'Cannot Delete Category',
        Strings.categories.cannotDeleteWithExpenses,
        [
          { text: Strings.common.cancel, style: 'cancel' },
          {
            text: Strings.categories.archive,
            onPress: () => handleArchiveToggle(cat),
          },
        ]
      );
      return;
    }

    Alert.alert(
      Strings.categories.editCategory,
      `${Strings.categories.confirmDelete} (${cat.name})`,
      [
        { text: Strings.common.cancel, style: 'cancel' },
        {
          text: Strings.common.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(cat.id);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={Strings.common.back}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{Strings.categories.title}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/categories/edit')}
          accessibilityRole="button"
          accessibilityLabel={Strings.categories.addCategory}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>{Strings.common.add}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Active Categories */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {activeCategories.map((cat, idx) => (
            <View
              key={cat.id}
              style={[
                styles.itemRow,
                idx > 0 && [styles.borderTop, { borderColor: colors.border }],
              ]}
            >
              <View style={styles.left}>
                <View style={[styles.iconWrap, { backgroundColor: `${cat.color}20` }]}>
                  <Ionicons name={(cat.icon as any) || 'pricetag-outline'} size={18} color={cat.color} />
                </View>
                <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push(`/categories/edit?id=${cat.id}`)}
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {cat.id !== OTHER_CATEGORY_ID && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleArchiveToggle(cat)}
                  >
                    <Ionicons name="archive-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}

                {cat.id !== OTHER_CATEGORY_ID && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(cat)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Archived Section Toggle */}
        {archivedCategories.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <TouchableOpacity
              style={styles.archivedToggle}
              onPress={() => setShowArchived((s) => !s)}
            >
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {Strings.categories.archivedSection} ({archivedCategories.length})
              </Text>
              <Ionicons
                name={showArchived ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showArchived && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing.xs }]}>
                {archivedCategories.map((cat, idx) => (
                  <View
                    key={cat.id}
                    style={[
                      styles.itemRow,
                      idx > 0 && [styles.borderTop, { borderColor: colors.border }],
                    ]}
                  >
                    <View style={styles.left}>
                      <View style={[styles.iconWrap, { backgroundColor: `${cat.color}20` }]}>
                        <Ionicons name={(cat.icon as any) || 'pricetag-outline'} size={18} color={cat.color} />
                      </View>
                      <Text style={[styles.catName, { color: colors.textSecondary }]}>
                        {cat.name} (Archived)
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.restoreBtn, { backgroundColor: colors.cardAlt }]}
                      onPress={() => handleArchiveToggle(cat)}
                    >
                      <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                        {Strings.categories.unarchive}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.md,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    minHeight: 54,
  },
  borderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  catName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
});
