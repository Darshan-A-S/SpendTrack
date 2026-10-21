import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { useSettingsStore } from '../store/settingsStore';
import { Spacing, Typography } from '../constants/theme';
import { formatCurrency } from '../utils/money';

interface DaySectionHeaderProps {
  friendlyDate: string;
  dailyTotalPaise: number;
}

export const DaySectionHeader: React.FC<DaySectionHeaderProps> = ({
  friendlyDate,
  dailyTotalPaise,
}) => {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.dateText, { color: colors.textSecondary }]}>
        {friendlyDate}
      </Text>
      <Text style={[styles.totalText, { color: colors.text }]}>
        {formatCurrency(dailyTotalPaise, currency)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  dateText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
});
