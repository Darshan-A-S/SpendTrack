import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSalaryStore, getSalaryMetrics } from '../store/salaryStore';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeColor } from '../hooks/useThemeColor';
import { formatPaise } from '../utils/money';
import { Spacing, Radii, Typography } from '../constants/theme';

interface DailySpendHeaderProps {
  todaySpentPaise: number;
}

export function DailySpendHeader({ todaySpentPaise }: DailySpendHeaderProps) {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  const salaryState = useSalaryStore();
  const { isSalaryMode, streak, streakBrokenToday, evaluateStreak } = salaryState;

  const metrics = getSalaryMetrics(salaryState);
  const dailyAllowance = metrics.dailyAllowancePaise;
  const remainingToday = dailyAllowance - todaySpentPaise;
  const isOverBudget = remainingToday < 0;

  useEffect(() => {
    evaluateStreak(todaySpentPaise, dailyAllowance);
  }, [todaySpentPaise, dailyAllowance, evaluateStreak]);

  if (!isSalaryMode) return null;

  const percentSpent = Math.min(
    100,
    Math.round((todaySpentPaise / Math.max(1, dailyAllowance)) * 100)
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isOverBudget ? 'rgba(239, 68, 68, 0.4)' : colors.border,
        },
      ]}
    >
      {/* Top Row: Daily Label & Streak */}
      <View style={styles.topRow}>
        <View style={styles.headerTitleBox}>
          <Ionicons
            name="sunny-outline"
            size={18}
            color={isOverBudget ? '#EF4444' : colors.primary}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Today's Allowance ({metrics.currentDay}/{metrics.totalDays})
          </Text>
        </View>

        {/* Streak Badge */}
        <View
          style={[
            styles.streakBadge,
            {
              backgroundColor: streakBrokenToday ? '#FEE2E2' : '#FEF3C7',
              borderColor: streakBrokenToday ? '#F87171' : '#FBBF24',
            },
          ]}
        >
          <Text
            style={[
              styles.streakText,
              { color: streakBrokenToday ? '#DC2626' : '#92400E' },
            ]}
          >
            {streakBrokenToday ? '⚠️ Streak Broken' : `🔥 ${streak} Day Streak`}
          </Text>
        </View>
      </View>

      {/* Main Numbers: Remaining & Limit */}
      <View style={styles.amountRow}>
        <View>
          <Text style={[styles.remainingLabel, { color: colors.textSecondary }]}>
            {isOverBudget ? 'OVER LIMIT' : 'REMAINING TODAY'}
          </Text>
          <Text
            style={[
              styles.remainingAmount,
              { color: isOverBudget ? '#EF4444' : '#10B981' },
            ]}
          >
            {formatPaise(isOverBudget ? Math.abs(remainingToday) : remainingToday, currency)}
          </Text>
        </View>

        <View style={styles.rightStats}>
          <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
            Daily Limit:{' '}
            <Text style={{ fontWeight: '700', color: colors.text }}>
              {formatPaise(dailyAllowance, currency)}
            </Text>
            {metrics.reallocatedDailyBoostPaise > 0 && (
              <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>
                {' '}(+{formatPaise(metrics.reallocatedDailyBoostPaise, currency)})
              </Text>
            )}
          </Text>
          <Text style={[styles.statSubText, { color: colors.textSecondary }]}>
            Spent Today:{' '}
            <Text
              style={{
                fontWeight: '700',
                color: isOverBudget ? '#EF4444' : colors.text,
              }}
            >
              {formatPaise(todaySpentPaise, currency)}
            </Text>
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${percentSpent}%`,
              backgroundColor: isOverBudget ? '#EF4444' : '#10B981',
            },
          ]}
        />
      </View>

      {/* Bottom helper note */}
      <View style={styles.bottomRow}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {isOverBudget
            ? `Exceeded today by ${formatPaise(Math.abs(remainingToday), currency)}`
            : `${percentSpent}% of today's limit used`}
        </Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {metrics.remainingDays} days left this month
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  streakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  remainingLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  remainingAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
  rightStats: {
    alignItems: 'flex-end',
    gap: 3,
  },
  statSubText: {
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.full,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  progressBar: {
    height: '100%',
    borderRadius: Radii.full,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  footerText: {
    fontSize: 11,
  },
});
