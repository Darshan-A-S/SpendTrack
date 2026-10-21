import {
  parseToPaise,
  paiseToRupeeString,
  formatIndianNumber,
  formatCurrency,
  sumPaise,
} from '../utils/money';
import {
  formatDateToString,
  parseDateString,
  getFriendlyDateLabel,
  getMonthCycleRange,
  isFutureDate,
  getNextRecurringDate,
} from '../utils/dates';
import { generateExpensesCsv } from '../utils/csv';

describe('Money Utilities', () => {
  test('parseToPaise parses standard and decimal amounts correctly', () => {
    expect(parseToPaise('100')).toBe(10000);
    expect(parseToPaise('100.5')).toBe(10050);
    expect(parseToPaise('100.50')).toBe(10050);
    expect(parseToPaise('0.99')).toBe(99);
    expect(parseToPaise('12,345.50')).toBe(1234550);
    expect(parseToPaise('0')).toBeNull();
    expect(parseToPaise('-50')).toBeNull();
    expect(parseToPaise('abc')).toBeNull();
    expect(parseToPaise('100.999')).toBeNull(); // More than 2 decimals rejected
  });

  test('paiseToRupeeString formats paise to decimal string', () => {
    expect(paiseToRupeeString(10000)).toBe('100.00');
    expect(paiseToRupeeString(10050)).toBe('100.50');
    expect(paiseToRupeeString(99)).toBe('0.99');
    expect(paiseToRupeeString(5)).toBe('0.05');
  });

  test('formatIndianNumber groups digits according to Indian numbering system', () => {
    expect(formatIndianNumber(100)).toBe('100');
    expect(formatIndianNumber(1000)).toBe('1,000');
    expect(formatIndianNumber(10000)).toBe('10,000');
    expect(formatIndianNumber(100000)).toBe('1,00,000');
    expect(formatIndianNumber(1234567)).toBe('12,34,567');
  });

  test('formatCurrency formats with symbol and grouping', () => {
    expect(formatCurrency(123456700, '₹', 'en-IN')).toBe('₹12,34,567.00');
    expect(formatCurrency(5000, '₹')).toBe('₹50.00');
    expect(formatCurrency(5000, '$', 'en-US', false)).toBe('$50');
  });

  test('sumPaise sums integer paise without floating point issues', () => {
    const items = [{ amt: 10050 }, { amt: 20075 }, { amt: 99 }];
    expect(sumPaise(items, (x) => x.amt)).toBe(30224);
  });
});

describe('Date Utilities', () => {
  test('date conversions to and from string', () => {
    const d = new Date(2026, 3, 15); // 15 Apr 2026
    const str = formatDateToString(d);
    expect(str).toBe('2026-04-15');
    const parsed = parseDateString(str);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(3);
    expect(parsed.getDate()).toBe(15);
  });

  test('friendly labels for today and past dates', () => {
    const today = formatDateToString(new Date());
    expect(getFriendlyDateLabel(today)).toBe('Today');
    expect(getFriendlyDateLabel('2026-01-01')).toBe('01 Jan 2026');
  });

  test('getMonthCycleRange with monthStartDay = 1', () => {
    const date = new Date(2026, 3, 10); // April 2026
    const range = getMonthCycleRange(date, 1);
    expect(range.startDate).toBe('2026-04-01');
    expect(range.endDate).toBe('2026-04-30');
  });

  test('getMonthCycleRange with custom monthStartDay (e.g. 25th)', () => {
    const date = new Date(2026, 3, 10); // April 2026
    const range = getMonthCycleRange(date, 25);
    expect(range.startDate).toBe('2026-04-25');
    expect(range.endDate).toBe('2026-05-24');
  });

  test('getNextRecurringDate correctly calculates intervals and month-end clamp', () => {
    // Daily
    expect(getNextRecurringDate('2026-01-01', 'daily')).toBe('2026-01-02');
    // Weekly
    expect(getNextRecurringDate('2026-01-01', 'weekly')).toBe('2026-01-08');
    // Yearly
    expect(getNextRecurringDate('2026-01-01', 'yearly')).toBe('2027-01-01');
    // Monthly normal
    expect(getNextRecurringDate('2026-01-15', 'monthly', 15)).toBe('2026-02-15');
    // Monthly Jan 31 -> Feb 28 (month-end clamp in non-leap year 2026)
    expect(getNextRecurringDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
  });

  test('isFutureDate correctly checks if date is in future', () => {
    expect(isFutureDate('2099-01-01')).toBe(true);
    expect(isFutureDate('2000-01-01')).toBe(false);
  });
});

describe('CSV Utilities', () => {
  test('generateExpensesCsv creates formatted CSV with escaping', () => {
    const rows = [
      {
        date: '2026-04-15',
        amount_paise: 25050,
        category_name: 'Food',
        payment_method: 'UPI',
        note: 'Lunch, snacks',
      },
      {
        date: '2026-04-16',
        amount_paise: 100000,
        category_name: 'Groceries',
        payment_method: 'Credit Card',
        note: 'Supermarket "Mega" store',
      },
    ];

    const csv = generateExpensesCsv(rows);
    expect(csv).toContain('date,amount,category,payment_method,note');
    expect(csv).toContain('2026-04-15,250.50,Food,UPI,"Lunch, snacks"');
    expect(csv).toContain('2026-04-16,1000.00,Groceries,Credit Card,"Supermarket ""Mega"" store"');
  });
});
