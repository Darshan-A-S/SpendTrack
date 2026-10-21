import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSettingsStore } from '../../store/settingsStore';
import { Spacing, Radii, Typography } from '../../constants/theme';

interface DailyBarsProps {
  data: { date: string; dayLabel: string; value: number }[];
}

const screenWidth = Dimensions.get('window').width;

export const DailyBars: React.FC<DailyBarsProps> = ({ data }) => {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  if (data.length === 0) {
    return null;
  }

  const chartData = data.map((d) => ({
    value: d.value,
    label: d.dayLabel,
    frontColor: colors.primary,
    topLabelComponent: () => null,
  }));

  const chartWidth = Math.max(screenWidth - 80, data.length * 28);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Daily Spending Trend ({currency})</Text>

      <View style={styles.chartWrapper}>
        <BarChart
          data={chartData}
          width={chartWidth}
          height={160}
          barWidth={14}
          spacing={14}
          roundedTop
          roundedBottom
          hideRules={false}
          rulesColor={colors.border}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          noOfSections={4}
          initialSpacing={10}
        />
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
  chartWrapper: {
    overflow: 'hidden',
    paddingVertical: Spacing.xs,
  },
});
