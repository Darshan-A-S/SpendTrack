import {
  format,
  isToday,
  isYesterday,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  subDays,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addYears,
  setDate,
  getDaysInMonth,
} from 'date-fns';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatDateToString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parses a YYYY-MM-DD string into a local Date object.
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Returns a friendly header label for a date string:
 * "Today", "Yesterday", or "18 Apr 2026".
 */
export function getFriendlyDateLabel(dateStr: string): string {
  try {
    const date = parseDateString(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Formats a month into readable text (e.g. "April 2026").
 */
export function formatMonthDisplay(date: Date): string {
  return format(date, 'MMMM yyyy');
}

/**
 * Formats a month key (e.g. "2026-04").
 */
export function formatMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

/**
 * Calculates start and end dates for a month cycle given an anchor date and monthStartDay (1-31).
 * If monthStartDay is 1, it's standard 1st to last day of that month.
 * If monthStartDay > 1, for example 25:
 * A cycle for anchor month YYYY-MM starts on YYYY-MM-25 and ends on the day before in the next month.
 */
export function getMonthCycleRange(
  anchorDate: Date,
  monthStartDay: number = 1
): { startDate: string; endDate: string; label: string } {
  if (monthStartDay <= 1) {
    const start = startOfMonth(anchorDate);
    const end = endOfMonth(anchorDate);
    return {
      startDate: formatDateToString(start),
      endDate: formatDateToString(end),
      label: format(anchorDate, 'MMMM yyyy'),
    };
  }

  // Clamped start day for this month
  const daysInAnchor = getDaysInMonth(anchorDate);
  const clampedStartDay = Math.min(monthStartDay, daysInAnchor);
  
  const cycleStart = setDate(anchorDate, clampedStartDay);
  
  // Next month
  const nextMonth = addMonths(cycleStart, 1);
  const daysInNextMonth = getDaysInMonth(nextMonth);
  const clampedNextStartDay = Math.min(monthStartDay, daysInNextMonth);
  const nextCycleStart = setDate(nextMonth, clampedNextStartDay);
  const cycleEnd = subDays(nextCycleStart, 1);

  return {
    startDate: formatDateToString(cycleStart),
    endDate: formatDateToString(cycleEnd),
    label: `${format(cycleStart, 'dd MMM')} – ${format(cycleEnd, 'dd MMM yyyy')}`,
  };
}

/**
 * Determines whether a date string is in the future relative to today.
 */
export function isFutureDate(dateStr: string): boolean {
  const todayStr = getTodayDateString();
  return dateStr > todayStr;
}

/**
 * Range presets for the Stats screen.
 */
export type StatsRangeType =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'this_year'
  | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function getDateRangeForPreset(
  preset: StatsRangeType,
  monthStartDay: number = 1,
  customRange?: { startDate: string; endDate: string }
): DateRange {
  const now = new Date();

  switch (preset) {
    case 'this_month': {
      const range = getMonthCycleRange(now, monthStartDay);
      return { startDate: range.startDate, endDate: range.endDate };
    }
    case 'last_month': {
      const prevMonthDate = subMonths(now, 1);
      const range = getMonthCycleRange(prevMonthDate, monthStartDay);
      return { startDate: range.startDate, endDate: range.endDate };
    }
    case 'last_3_months': {
      const threeMonthsAgo = subMonths(now, 2);
      const startRange = getMonthCycleRange(threeMonthsAgo, monthStartDay);
      const endRange = getMonthCycleRange(now, monthStartDay);
      return { startDate: startRange.startDate, endDate: endRange.endDate };
    }
    case 'this_year': {
      return {
        startDate: formatDateToString(startOfYear(now)),
        endDate: formatDateToString(endOfYear(now)),
      };
    }
    case 'custom': {
      if (customRange && customRange.startDate && customRange.endDate) {
        return customRange;
      }
      return {
        startDate: formatDateToString(startOfMonth(now)),
        endDate: formatDateToString(endOfMonth(now)),
      };
    }
  }
}

/**
 * Computes next occurrence date for a recurring rule based on frequency.
 * Handles month-end clamp correctly (e.g. Jan 31 + 1 month -> Feb 28 or 29).
 */
export function getNextRecurringDate(
  currentDateStr: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  originalDayOfMonth?: number
): string {
  const curr = parseDateString(currentDateStr);

  switch (frequency) {
    case 'daily':
      return formatDateToString(addDays(curr, 1));
    case 'weekly':
      return formatDateToString(addWeeks(curr, 1));
    case 'yearly':
      return formatDateToString(addYears(curr, 1));
    case 'monthly': {
      const targetMonth = addMonths(curr, 1);
      const maxDays = getDaysInMonth(targetMonth);
      const targetDay = originalDayOfMonth
        ? Math.min(originalDayOfMonth, maxDays)
        : Math.min(curr.getDate(), maxDays);
      return formatDateToString(setDate(targetMonth, targetDay));
    }
  }
}
