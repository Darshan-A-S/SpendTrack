import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../hooks/useThemeColor';
import { useSettingsStore } from '../store/settingsStore';
import { Spacing, Radii, Typography } from '../constants/theme';
import { formatCurrency } from '../utils/money';

interface MonthSwitcherProps {
  monthDisplay: string;
  totalSpentPaise: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export const MonthSwitcher: React.FC<MonthSwitcherProps> = ({
  monthDisplay,
  totalSpentPaise,
  onPreviousMonth,
  onNextMonth,
}) => {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Month Navigation Row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.arrowButton, { backgroundColor: colors.cardAlt }]}
          onPress={onPreviousMonth}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {monthDisplay}
        </Text>

        <TouchableOpacity
          style={[styles.arrowButton, { backgroundColor: colors.cardAlt }]}
          onPress={onNextMonth}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Hero Total Spent */}
      <View style={styles.totalContainer}>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
          Total Spending
        </Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>
          {formatCurrency(totalSpentPaise, currency)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  totalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  totalLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  totalAmount: {
    ...Typography.amountHero,
    fontWeight: '800',
  },
});
