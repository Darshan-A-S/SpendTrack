import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { subMonths, addMonths } from 'date-fns';

import { useExpenses } from '../../hooks/useExpenses';
import { useCategories } from '../../hooks/useCategories';
import { useBudgets } from '../../hooks/useBudgets';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSettingsStore } from '../../store/settingsStore';
import { useDataStore } from '../../store/dataStore';

import { MonthSwitcher } from '../../components/MonthSwitcher';
import { DaySectionHeader } from '../../components/DaySectionHeader';
import { ExpenseItem } from '../../components/ExpenseItem';
import { BudgetProgress } from '../../components/BudgetProgress';
import { EmptyState } from '../../components/EmptyState';
import { Snackbar } from '../../components/Snackbar';

import { getMonthCycleRange } from '../../utils/dates';
import { Spacing, Radii, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';

const PAYMENT_METHODS = [
  Strings.paymentMethods.cash,
  Strings.paymentMethods.upi,
  Strings.paymentMethods.creditCard,
  Strings.paymentMethods.debitCard,
  Strings.paymentMethods.netBanking,
  Strings.paymentMethods.other,
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useThemeColor();
  const monthStartDay = useSettingsStore((state) => state.monthStartDay);

  const undoExpense = useDataStore((state) => state.undoExpense);
  const clearUndoExpense = useDataStore((state) => state.clearUndoExpense);

  // Month navigation anchor
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const cycle = useMemo(() => {
    return getMonthCycleRange(currentDate, monthStartDay);
  }, [currentDate, monthStartDay]);

  // Filters & Search state
  const [searchNote, setSearchNote] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const filterOptions = useMemo(() => ({
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    paymentMethods: selectedPaymentMethods.length > 0 ? selectedPaymentMethods : undefined,
    minAmountPaise: minAmount ? Math.round(parseFloat(minAmount) * 100) : undefined,
    maxAmountPaise: maxAmount ? Math.round(parseFloat(maxAmount) * 100) : undefined,
    searchNote: searchNote.trim() || undefined,
  }), [cycle.startDate, cycle.endDate, selectedCategoryIds, selectedPaymentMethods, minAmount, maxAmount, searchNote]);

  const {
    dayGroups,
    totalSpentPaise,
    deleteExpenseWithUndo,
    restoreExpense,
    duplicateExpense,
  } = useExpenses(filterOptions);

  const { categories } = useCategories(false);
  const { overallBudgetProgress } = useBudgets();

  const activeFiltersCount =
    (selectedCategoryIds.length > 0 ? 1 : 0) +
    (selectedPaymentMethods.length > 0 ? 1 : 0) +
    (minAmount || maxAmount ? 1 : 0);

  const handlePrevMonth = () => {
    setCurrentDate((d) => subMonths(d, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => addMonths(d, 1));
  };

  const handleUndo = async () => {
    if (undoExpense) {
      await restoreExpense(undoExpense);
      clearUndoExpense();
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
  };

  const clearAllFilters = () => {
    setSelectedCategoryIds([]);
    setSelectedPaymentMethods([]);
    setMinAmount('');
    setMaxAmount('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Search & Filter Bar */}
      <View style={styles.headerBar}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={Strings.home.searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={searchNote}
            onChangeText={setSearchNote}
            clearButtonMode="while-editing"
          />
          {searchNote ? (
            <TouchableOpacity onPress={() => setSearchNote('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: activeFiltersCount > 0 ? `${colors.primary}20` : colors.card,
              borderColor: activeFiltersCount > 0 ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel={Strings.home.filters}
        >
          <Ionicons
            name="funnel-outline"
            size={18}
            color={activeFiltersCount > 0 ? colors.primary : colors.text}
          />
          {activeFiltersCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{activeFiltersCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Main Expense List */}
      <SectionList
        sections={dayGroups}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { friendlyDate, dailyTotalPaise } }) => (
          <DaySectionHeader friendlyDate={friendlyDate} dailyTotalPaise={dailyTotalPaise} />
        )}
        renderItem={({ item }) => (
          <ExpenseItem
            item={item}
            onPress={(exp) => router.push(`/add-expense?id=${exp.id}`)}
            onDelete={deleteExpenseWithUndo}
            onDuplicate={duplicateExpense}
          />
        )}
        ListHeaderComponent={
          <View>
            {/* Month Switcher & Total */}
            <MonthSwitcher
              monthDisplay={cycle.label}
              totalSpentPaise={totalSpentPaise}
              onPreviousMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />

            {/* Overall Monthly Budget Card (if configured) */}
            {overallBudgetProgress ? (
              <View style={{ marginHorizontal: Spacing.md, marginTop: Spacing.xs }}>
                <BudgetProgress
                  item={overallBudgetProgress}
                  onPress={() => router.push('/(tabs)/budgets')}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={Strings.home.noExpensesFound}
            description={
              searchNote || activeFiltersCount > 0
                ? Strings.home.noExpensesMatchFilter
                : Strings.home.addExpenseCta
            }
            actionLabel={
              searchNote || activeFiltersCount > 0
                ? Strings.home.clearFilters
                : Strings.expenseForm.titleAdd
            }
            onAction={
              searchNote || activeFiltersCount > 0
                ? () => {
                    setSearchNote('');
                    clearAllFilters();
                  }
                : () => router.push('/add-expense')
            }
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Add Expense Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
          router.push('/add-expense');
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={Strings.expenseForm.titleAdd}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Undo Delete Snackbar */}
      <Snackbar
        visible={!!undoExpense}
        message={Strings.home.undoDelete}
        actionLabel={Strings.common.undo}
        onAction={handleUndo}
        onDismiss={clearUndoExpense}
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{Strings.home.filters}</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Filter */}
              <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>
                {Strings.home.filterByCategory}
              </Text>
              <View style={styles.chipsRow}>
                {categories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? `${cat.color}25` : colors.cardAlt,
                          borderColor: isSelected ? cat.color : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedCategoryIds((prev) =>
                          isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? cat.color : colors.text },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Payment Method Filter */}
              <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>
                {Strings.home.filterByPaymentMethod}
              </Text>
              <View style={styles.chipsRow}>
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = selectedPaymentMethods.includes(pm);
                  return (
                    <TouchableOpacity
                      key={pm}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? `${colors.primary}25` : colors.cardAlt,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedPaymentMethods((prev) =>
                          isSelected ? prev.filter((m) => m !== pm) : [...prev, pm]
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? colors.primary : colors.text },
                        ]}
                      >
                        {pm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount Range Filter */}
              <Text style={[styles.filterSectionTitle, { color: colors.textSecondary }]}>
                {Strings.home.filterByAmountRange}
              </Text>
              <View style={styles.rangeRow}>
                <TextInput
                  style={[styles.rangeInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder={Strings.home.minAmount}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={minAmount}
                  onChangeText={setMinAmount}
                />
                <Text style={{ color: colors.textSecondary, marginHorizontal: 8 }}>—</Text>
                <TextInput
                  style={[styles.rangeInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder={Strings.home.maxAmount}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={maxAmount}
                  onChangeText={setMaxAmount}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.resetButton, { borderColor: colors.border }]}
                onPress={clearAllFilters}
              >
                <Text style={[styles.resetText, { color: colors.textSecondary }]}>{Strings.common.reset}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyText}>{Strings.home.applyFilters}</Text>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    ...Typography.bodyMedium,
    paddingVertical: 8,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 90,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
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
  filterSectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  rangeInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyMedium,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC',
  },
  resetButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: '#FFF',
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
});
