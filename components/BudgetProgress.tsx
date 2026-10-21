import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../hooks/useThemeColor';
import { useSettingsStore } from '../store/settingsStore';
import { Spacing, Radii, Typography } from '../constants/theme';
import { formatCurrency } from '../utils/money';
import { BudgetProgressItem } from '../hooks/useBudgets';

interface BudgetProgressProps {
  item: BudgetProgressItem;
  onPress?: () => void;
  showCategoryIcon?: boolean;
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  item,
  onPress,
  showCategoryIcon = true,
}) => {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  const isOverall = item.budget.category_id === null;
  const title = isOverall ? 'Overall Monthly Budget' : (item.budget.category_name || 'Category');
  const barColor = item.isOverBudget
    ? colors.danger
    : item.isWarning
    ? colors.warning
    : colors.primary;

  const clampedPercentage = Math.min(100, Math.max(0, item.percentage));

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${item.percentage}% spent`}
    >
      {/* Title & Status Indicator */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          {showCategoryIcon && !isOverall && (
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${item.budget.category_color || colors.primary}20` },
              ]}
            >
              <Ionicons
                name={(item.budget.category_icon as any) || 'pricetag-outline'}
                size={16}
                color={item.budget.category_color || colors.primary}
              />
            </View>
          )}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          {item.isOverBudget ? (
            <View style={[styles.alertTag, { backgroundColor: `${colors.danger}20` }]}>
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text style={[styles.alertText, { color: colors.danger }]}>Exceeded</Text>
            </View>
          ) : item.isWarning ? (
            <View style={[styles.alertTag, { backgroundColor: `${colors.warning}20` }]}>
              <Ionicons name="warning" size={14} color={colors.warning} />
              <Text style={[styles.alertText, { color: colors.warning }]}>80% Reached</Text>
            </View>
          ) : (
            <Text style={[styles.percentText, { color: colors.textSecondary }]}>
              {item.percentage}%
            </Text>
          )}
        </View>
      </View>

      {/* Progress Track */}
      <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: `${clampedPercentage}%`,
            },
          ]}
        />
      </View>

      {/* Amounts Footnotes */}
      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Spent: <Text style={{ color: colors.text, fontWeight: '600' }}>{formatCurrency(item.spentPaise, currency)}</Text>
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {item.isOverBudget ? 'Over by: ' : 'Remaining: '}
          <Text
            style={{
              color: item.isOverBudget ? colors.danger : colors.success,
              fontWeight: '600',
            }}
          >
            {formatCurrency(Math.abs(item.remainingPaise), currency)}
          </Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginVertical: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.xs,
    gap: 4,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '700',
  },
  percentText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: Radii.full,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  footerText: {
    ...Typography.bodySmall,
  },
});
