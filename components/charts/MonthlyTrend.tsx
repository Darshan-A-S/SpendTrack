import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSettingsStore } from '../../store/settingsStore';
import { Spacing, Radii, Typography } from '../../constants/theme';

interface MonthlyTrendProps {
  data: { label: string; value: number; totalPaise: number }[];
}

const screenWidth = Dimensions.get('window').width;

export const MonthlyTrend: React.FC<MonthlyTrendProps> = ({ data }) => {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  if (data.length === 0) {
    return null;
  }

  const chartData = data.map((d) => ({
    value: d.value,
    label: d.label,
    frontColor: colors.accent,
  }));

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>6-Month Trend ({currency})</Text>

      <View style={styles.chartWrapper}>
        <BarChart
          data={chartData}
          width={screenWidth - 90}
          height={160}
          barWidth={24}
          spacing={22}
          roundedTop
          roundedBottom
          hideRules={false}
          rulesColor={colors.border}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}
          noOfSections={4}
          initialSpacing={12}
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
