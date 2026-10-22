import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useStats } from '../../hooks/useStats';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSettingsStore } from '../../store/settingsStore';

import { CategoryDonut } from '../../components/charts/CategoryDonut';
import { DailyBars } from '../../components/charts/DailyBars';
import { MonthlyTrend } from '../../components/charts/MonthlyTrend';
import { EmptyState } from '../../components/EmptyState';

import { StatsRangeType } from '../../utils/dates';
import { formatCurrency } from '../../utils/money';
import { Spacing, Radii, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';

const RANGE_TABS: { key: StatsRangeType; label: string }[] = [
  { key: 'this_month', label: Strings.stats.ranges.thisMonth },
  { key: 'last_month', label: Strings.stats.ranges.lastMonth },
  { key: 'last_3_months', label: Strings.stats.ranges.last3Months },
  { key: 'this_year', label: Strings.stats.ranges.thisYear },
  { key: 'custom', label: Strings.stats.ranges.custom },
];

export default function StatsScreen() {
  const router = useRouter();
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  const [selectedPreset, setSelectedPreset] = useState<StatsRangeType>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);

  const [appliedCustomRange, setAppliedCustomRange] = useState<{
    startDate: string;
    endDate: string;
  } | undefined>();

  const { stats, loading } = useStats(selectedPreset, appliedCustomRange);

  const handleSelectPreset = (preset: StatsRangeType) => {
    if (preset === 'custom') {
      setCustomModalVisible(true);
    } else {
      setSelectedPreset(preset);
      setAppliedCustomRange(undefined);
    }
  };

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      setAppliedCustomRange({ startDate: customStart, endDate: customEnd });
      setSelectedPreset('custom');
      setCustomModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Screen Title */}
      <View style={styles.titleRow}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>{Strings.stats.title}</Text>
      </View>

      {/* Date Range Selector Chips */}
      <View style={styles.rangeScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeScroll}>
          {RANGE_TABS.map((tab) => {
            const isSelected = selectedPreset === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleSelectPreset(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.rangeChipText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Stats Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {stats.totalPaise === 0 && !loading ? (
          <EmptyState
            icon="pie-chart-outline"
            title={Strings.stats.noExpensesPeriod}
            description="Log your daily expenses to see comprehensive charts and insights."
            actionLabel={Strings.expenseForm.titleAdd}
            onAction={() => router.push('/add-expense')}
          />
        ) : (
          <>
            {/* Top Stat Cards: Total & Daily Average */}
            <View style={styles.cardsRow}>
              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                  {Strings.stats.monthTotal}
                </Text>
                <Text style={[styles.cardValue, { color: colors.text }]}>
                  {formatCurrency(stats.totalPaise, currency)}
                </Text>
                {stats.hasPotExpenses && (
                  <Text style={[styles.cardSubText, { color: colors.textSecondary }]}>
                    {formatCurrency(stats.totalPaise - stats.discretionaryTotalPaise, currency)} from pots
                  </Text>
                )}
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                  {Strings.stats.dailyAverage}
                </Text>
                <Text style={[styles.cardValue, { color: colors.text }]}>
                  {formatCurrency(stats.dailyAveragePaise, currency)}
                </Text>
                {stats.hasPotExpenses && (
                  <Text style={[styles.cardSubText, { color: colors.primary }]}>
                    Excl. pot expenses
                  </Text>
                )}
              </View>
            </View>

            {/* Comparison vs Previous Month */}
            {selectedPreset === 'this_month' && stats.comparison.hasPrevData && (
              <View
                style={[
                  styles.comparisonCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.compLeft}>
                  <Ionicons
                    name={stats.comparison.isHigher ? 'trending-up' : 'trending-down'}
                    size={24}
                    color={stats.comparison.isHigher ? colors.danger : colors.success}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.compTitle, { color: colors.textSecondary }]}>
                      {Strings.stats.comparisonTitle}
                    </Text>
                    <Text style={[styles.compText, { color: colors.text }]}>
                      {stats.comparison.diffPaise === 0
                        ? Strings.stats.equalPrev
                        : stats.comparison.isHigher
                        ? Strings.stats.higherThanPrev(
                            stats.comparison.pctChange.toString(),
                            formatCurrency(stats.comparison.diffPaise, currency)
                          )
                        : Strings.stats.lowerThanPrev(
                            stats.comparison.pctChange.toString(),
                            formatCurrency(Math.abs(stats.comparison.diffPaise), currency)
                          )}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Category Donut Breakdown */}
            <CategoryDonut
              data={stats.categoryBreakdown}
              totalPaise={stats.totalPaise}
            />

            {/* Daily Spending Trend (Bars) */}
            <DailyBars data={stats.dailyTrend} />

            {/* 6-Month Trend */}
            <MonthlyTrend data={stats.monthlyTrend} />

            {/* Top 5 Expenses */}
            {stats.topExpenses.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {Strings.stats.topExpensesTitle}
                </Text>
                {stats.topExpenses.map((exp, idx) => (
                  <View key={exp.id} style={styles.topItemRow}>
                    <Text style={[styles.rankNumber, { color: colors.textMuted }]}>{idx + 1}</Text>
                    <View style={styles.topItemDetails}>
                      <Text style={[styles.topItemCat, { color: colors.text }]}>
                        {exp.category_name}
                      </Text>
                      <Text style={[styles.topItemDate, { color: colors.textSecondary }]}>
                        {exp.date} • {exp.note || 'No note'}
                      </Text>
                    </View>
                    <Text style={[styles.topItemAmount, { color: colors.text }]}>
                      {formatCurrency(exp.amount_paise, currency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Payment Method Split */}
            {stats.paymentMethodSplit.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {Strings.stats.paymentMethodSplitTitle}
                </Text>
                {stats.paymentMethodSplit.map((pm) => (
                  <View key={pm.method} style={styles.pmRow}>
                    <Text style={[styles.pmName, { color: colors.text }]}>{pm.method}</Text>
                    <Text style={[styles.pmAmount, { color: colors.text }]}>
                      {formatCurrency(pm.totalPaise, currency)} ({pm.percentage}%)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Custom Range Picker Modal */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Custom Date Range</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.dateInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={customStart}
              onChangeText={setCustomStart}
              placeholder="2026-04-01"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.dateInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={customEnd}
              onChangeText={setCustomEnd}
              placeholder="2026-04-30"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalApply, { backgroundColor: colors.primary }]}
                onPress={handleApplyCustomRange}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Apply</Text>
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
  titleRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  screenTitle: {
    ...Typography.titleLarge,
    fontWeight: '800',
  },
  rangeScrollWrapper: {
    marginVertical: Spacing.xs,
  },
  rangeScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  rangeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rangeChipText: {
    ...Typography.bodySmall,
    flexShrink: 0,
    includeFontPadding: false,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  cardLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    ...Typography.amountLarge,
    fontWeight: '800',
  },
  cardSubText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  comparisonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  compLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  compText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  sectionCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    ...Typography.titleSmall,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  topItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC2',
  },
  rankNumber: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    width: 24,
  },
  topItemDetails: {
    flex: 1,
  },
  topItemCat: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  topItemDate: {
    ...Typography.caption,
  },
  topItemAmount: {
    ...Typography.amountMedium,
    fontWeight: '700',
  },
  pmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
  },
  pmName: {
    ...Typography.bodyMedium,
  },
  pmAmount: {
    ...Typography.bodyMedium,
    fontWeight: '600',
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
  modalTitle: {
    ...Typography.titleSmall,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  dateInput: {
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyMedium,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalCancel: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApply: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
