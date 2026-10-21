import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { CategoryBreakdownItem } from '../../hooks/useStats';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSettingsStore } from '../../store/settingsStore';
import { Spacing, Radii, Typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/money';

interface CategoryDonutProps {
  data: CategoryBreakdownItem[];
  totalPaise: number;
  onSelectCategory?: (categoryId: string) => void;
}

export const CategoryDonut: React.FC<CategoryDonutProps> = ({
  data,
  totalPaise,
  onSelectCategory,
}) => {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  if (data.length === 0 || totalPaise === 0) {
    return null;
  }

  // Format data for Gifted Charts PieChart
  const pieData = data.map((item) => ({
    value: item.total_paise,
    color: item.category_color,
    text: `${item.percentage}%`,
  }));

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Category Breakdown</Text>

      {/* Donut Chart */}
      <View style={styles.chartContainer}>
        <PieChart
          data={pieData}
          donut
          radius={90}
          innerRadius={60}
          innerCircleColor={colors.card}
          centerLabelComponent={() => (
            <View style={styles.centerLabel}>
              <Text style={[styles.centerSub, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.centerTotal, { color: colors.text }]} numberOfLines={1}>
                {formatCurrency(totalPaise, currency, 'en-IN', false)}
              </Text>
            </View>
          )}
        />
      </View>

      {/* Ranked Category List */}
      <View style={styles.listContainer}>
        {data.map((item) => (
          <TouchableOpacity
            key={item.category_id}
            style={styles.categoryRow}
            onPress={() => onSelectCategory?.(item.category_id)}
            disabled={!onSelectCategory}
            activeOpacity={0.7}
          >
            <View style={styles.leftCol}>
              <View style={[styles.colorDot, { backgroundColor: item.category_color }]} />
              <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                {item.category_name}
              </Text>
            </View>

            <View style={styles.rightCol}>
              <Text style={[styles.amountText, { color: colors.text }]}>
                {formatCurrency(item.total_paise, currency)}
              </Text>
              <Text style={[styles.percentText, { color: colors.textSecondary }]}>
                {item.percentage}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  title: {
    ...Typography.titleSmall,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSub: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  centerTotal: {
    fontSize: 14,
    fontWeight: '800',
    maxWidth: 90,
  },
  listContainer: {
    marginTop: Spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.full,
    marginRight: Spacing.sm,
  },
  categoryName: {
    ...Typography.bodyMedium,
    fontWeight: '500',
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  percentText: {
    ...Typography.caption,
  },
});
