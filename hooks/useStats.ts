import { useState, useEffect, useCallback } from 'react';
import { getDb } from '../db/database';
import {
  getExpensesSummary,
  getExpensesByCategory,
  getDailySpending,
  getTopExpenses,
  getPaymentMethodBreakdown,
  ExpenseWithCategory,
} from '../db/repositories/expenseRepo';
import { useDataStore } from '../store/dataStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  StatsRangeType,
  getDateRangeForPreset,
  getMonthCycleRange,
  parseDateString,
  getTodayDateString,
} from '../utils/dates';
import { differenceInCalendarDays, subMonths, format } from 'date-fns';

export interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  total_paise: number;
  count: number;
  percentage: number;
}

export interface StatsData {
  totalPaise: number;
  dailyAveragePaise: number;
  comparison: {
    prevTotalPaise: number;
    diffPaise: number;
    pctChange: number; // positive = increased spending, negative = decreased
    isHigher: boolean;
    hasPrevData: boolean;
  };
  categoryBreakdown: CategoryBreakdownItem[];
  dailyTrend: { date: string; dayLabel: string; value: number }[];
  monthlyTrend: { label: string; value: number; totalPaise: number }[];
  topExpenses: ExpenseWithCategory[];
  paymentMethodSplit: { method: string; totalPaise: number; percentage: number; count: number }[];
}

export function useStats(
  preset: StatsRangeType = 'this_month',
  customRange?: { startDate: string; endDate: string }
) {
  const dataVersion = useDataStore((state) => state.dataVersion);
  const monthStartDay = useSettingsStore((state) => state.monthStartDay);

  const [range, setRange] = useState(() =>
    getDateRangeForPreset(preset, monthStartDay, customRange)
  );
  const [stats, setStats] = useState<StatsData>({
    totalPaise: 0,
    dailyAveragePaise: 0,
    comparison: {
      prevTotalPaise: 0,
      diffPaise: 0,
      pctChange: 0,
      isHigher: false,
      hasPrevData: false,
    },
    categoryBreakdown: [],
    dailyTrend: [],
    monthlyTrend: [],
    topExpenses: [],
    paymentMethodSplit: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Update current range when preset or monthStartDay changes
  useEffect(() => {
    setRange(getDateRangeForPreset(preset, monthStartDay, customRange));
  }, [preset, monthStartDay, customRange?.startDate, customRange?.endDate]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDb();
      const todayStr = getTodayDateString();

      // 1. Current period summary (exclude future for spent total)
      const summary = await getExpensesSummary(db, range.startDate, range.endDate, true);
      const totalPaise = summary.total_paise;

      // Calculate elapsed days for daily average
      const start = parseDateString(range.startDate);
      const end = parseDateString(range.endDate);
      const effectiveEnd = range.endDate > todayStr ? parseDateString(todayStr) : end;
      const elapsedDays = Math.max(1, differenceInCalendarDays(effectiveEnd, start) + 1);
      const dailyAveragePaise = Math.round(totalPaise / elapsedDays);

      // 2. Comparison with previous period
      // For 'this_month', compare with last month cycle
      const prevMonthDate = subMonths(new Date(), 1);
      const prevCycle = getMonthCycleRange(prevMonthDate, monthStartDay);
      const prevSummary = await getExpensesSummary(
        db,
        prevCycle.startDate,
        prevCycle.endDate,
        true
      );
      const prevTotalPaise = prevSummary.total_paise;
      const diffPaise = totalPaise - prevTotalPaise;
      let pctChange = 0;
      if (prevTotalPaise > 0) {
        pctChange = Math.round((Math.abs(diffPaise) / prevTotalPaise) * 100);
      }
      const comparison = {
        prevTotalPaise,
        diffPaise,
        pctChange,
        isHigher: diffPaise > 0,
        hasPrevData: prevTotalPaise > 0 || prevSummary.count > 0,
      };

      // 3. Category breakdown
      const rawCategories = await getExpensesByCategory(
        db,
        range.startDate,
        range.endDate,
        true
      );
      const categoryBreakdown: CategoryBreakdownItem[] = rawCategories.map((c) => ({
        ...c,
        percentage: totalPaise > 0 ? Math.round((c.total_paise / totalPaise) * 100) : 0,
      }));

      // 4. Daily spending trend for selected range
      const rawDaily = await getDailySpending(db, range.startDate, range.endDate);
      const dailyTrend = rawDaily.map((d) => ({
        date: d.date,
        dayLabel: d.date.substring(8), // day of month '01', '15'
        value: d.total_paise / 100, // In rupees for chart display
      }));

      // 5. Monthly trend for last 6 months
      const monthlyTrend: { label: string; value: number; totalPaise: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const targetDate = subMonths(now, i);
        const cycle = getMonthCycleRange(targetDate, monthStartDay);
        const cycleSummary = await getExpensesSummary(
          db,
          cycle.startDate,
          cycle.endDate,
          true
        );
        monthlyTrend.push({
          label: format(targetDate, 'MMM'),
          value: cycleSummary.total_paise / 100, // In rupees for chart display
          totalPaise: cycleSummary.total_paise,
        });
      }

      // 6. Top 5 expenses
      const topExpenses = await getTopExpenses(db, range.startDate, range.endDate, 5);

      // 7. Payment method breakdown
      const rawPaymentMethods = await getPaymentMethodBreakdown(
        db,
        range.startDate,
        range.endDate
      );
      const paymentMethodSplit = rawPaymentMethods.map((p) => ({
        method: p.payment_method,
        totalPaise: p.total_paise,
        percentage: totalPaise > 0 ? Math.round((p.total_paise / totalPaise) * 100) : 0,
        count: p.count,
      }));

      setStats({
        totalPaise,
        dailyAveragePaise,
        comparison,
        categoryBreakdown,
        dailyTrend,
        monthlyTrend,
        topExpenses,
        paymentMethodSplit,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, [range.startDate, range.endDate, monthStartDay, dataVersion]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    range,
    loading,
    refresh: fetchStats,
  };
}
