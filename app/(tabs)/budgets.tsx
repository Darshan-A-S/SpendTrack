import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useBudgets } from '../../hooks/useBudgets';
import { useCategories } from '../../hooks/useCategories';
import { useThemeColor } from '../../hooks/useThemeColor';

import { BudgetProgress } from '../../components/BudgetProgress';
import { AmountInput } from '../../components/AmountInput';
import { EmptyState } from '../../components/EmptyState';

import { parseToPaise, paiseToRupeeString } from '../../utils/money';
import { Spacing, Radii, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';

export default function BudgetsScreen() {
  const { colors } = useThemeColor();

  const {
    overallBudgetProgress,
    categoryBudgetProgresses,
    saveBudget,
    deleteBudget,
  } = useBudgets();

  const { categories } = useCategories(false);

  // Edit / Add Budget Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null); // null = overall
  const [amountStr, setAmountStr] = useState('');
  const [amountError, setAmountError] = useState<string | undefined>();

  const openSetOverallModal = () => {
    setEditingCategoryId(null);
    setAmountStr(
      overallBudgetProgress
        ? paiseToRupeeString(overallBudgetProgress.budget.amount_paise)
        : ''
    );
    setAmountError(undefined);
    setModalVisible(true);
  };

  const openSetCategoryModal = (catId?: string, existingPaise?: number) => {
    setEditingCategoryId(catId || (categories.length > 0 ? categories[0].id : null));
    setAmountStr(existingPaise ? paiseToRupeeString(existingPaise) : '');
    setAmountError(undefined);
    setModalVisible(true);
  };

  const handleSaveBudget = async () => {
    const paise = parseToPaise(amountStr);
    if (!paise || paise <= 0) {
      setAmountError(Strings.expenseForm.errors.amountRequired);
      return;
    }

    await saveBudget(editingCategoryId, paise);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setModalVisible(false);
  };

  const handleDeleteBudget = (id: string, name: string) => {
    Alert.alert(
      Strings.budgets.removeBudget,
      `${Strings.budgets.confirmRemoveBudget} (${name})`,
      [
        { text: Strings.common.cancel, style: 'cancel' },
        {
          text: Strings.common.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteBudget(id);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
          },
        },
      ]
    );
  };

  // Categories not yet budgeted
  const availableCategoriesForBudget = categories.filter(
    (cat) => !categoryBudgetProgresses.some((p) => p.budget.category_id === cat.id)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{Strings.budgets.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Overall Monthly Budget Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {Strings.budgets.overallBudgetTitle}
          </Text>
          <TouchableOpacity onPress={openSetOverallModal}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              {overallBudgetProgress ? Strings.common.edit : Strings.common.add}
            </Text>
          </TouchableOpacity>
        </View>

        {overallBudgetProgress ? (
          <View style={{ marginHorizontal: Spacing.md }}>
            <BudgetProgress
              item={overallBudgetProgress}
              onPress={openSetOverallModal}
            />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={openSetOverallModal}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.emptyCardText, { color: colors.primary }]}>
              {Strings.budgets.setOverallBudget}
            </Text>
          </TouchableOpacity>
        )}

        {/* Per-Category Budgets Section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {Strings.budgets.categoryBudgetsTitle}
          </Text>
          {availableCategoriesForBudget.length > 0 && (
            <TouchableOpacity onPress={() => openSetCategoryModal(availableCategoriesForBudget[0].id)}>
              <Text style={[styles.linkText, { color: colors.primary }]}>
                {Strings.budgets.addCategoryBudget}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {categoryBudgetProgresses.length === 0 ? (
          <View style={{ marginHorizontal: Spacing.md }}>
            <EmptyState
              icon="pie-chart-outline"
              title="No Category Budgets"
              description="Set specific limits for dining out, shopping, groceries, and more."
              actionLabel={availableCategoriesForBudget.length > 0 ? Strings.budgets.addCategoryBudget : undefined}
              onAction={
                availableCategoriesForBudget.length > 0
                  ? () => openSetCategoryModal(availableCategoriesForBudget[0].id)
                  : undefined
              }
            />
          </View>
        ) : (
          <View style={{ marginHorizontal: Spacing.md }}>
            {categoryBudgetProgresses.map((item) => (
              <View key={item.budget.id} style={{ position: 'relative' }}>
                <BudgetProgress
                  item={item}
                  onPress={() =>
                    openSetCategoryModal(
                      item.budget.category_id!,
                      item.budget.amount_paise
                    )
                  }
                />
                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: colors.cardAlt }]}
                  onPress={() =>
                    handleDeleteBudget(
                      item.budget.id,
                      item.budget.category_name || 'Category'
                    )
                  }
                  accessibilityLabel="Delete category budget"
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Set Budget Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingCategoryId === null
                  ? Strings.budgets.overallBudgetTitle
                  : Strings.budgets.addCategoryBudget}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* If Category Budget: Category selector */}
            {editingCategoryId !== null && (
              <View style={{ marginBottom: Spacing.md }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {Strings.expenseForm.categoryLabel}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {categories.map((cat) => {
                    const isSelected = editingCategoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: isSelected ? `${cat.color}25` : colors.cardAlt,
                            borderColor: isSelected ? cat.color : colors.border,
                          },
                        ]}
                        onPress={() => setEditingCategoryId(cat.id)}
                      >
                        <Text style={{ color: isSelected ? cat.color : colors.text, fontWeight: '600', fontSize: 13 }}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {Strings.budgets.amountLabel}
            </Text>
            <AmountInput
              value={amountStr}
              onChangeText={(t) => {
                setAmountStr(t);
                if (amountError) setAmountError(undefined);
              }}
              autoFocus
              error={amountError}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                  {Strings.common.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: colors.primary }]}
                onPress={handleSaveBudget}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>
                  {Strings.common.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    ...Typography.titleLarge,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  emptyCard: {
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emptyCardText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  deleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalBox: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  label: {
    ...Typography.caption,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalCancel: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSave: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
