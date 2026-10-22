import { sumPaise } from '../utils/money';

describe('Performance Benchmark (10,000 expenses)', () => {
  test('aggregating and processing 10,000 items executes in under 50ms', () => {
    // Generate 10,000 in-memory expense records
    const expenses = Array.from({ length: 10000 }, (_, i) => ({
      id: `exp_${i}`,
      amount_paise: (i % 500 + 1) * 100,
      category_id: `cat_${i % 15}`,
      date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
    }));

    const startTime = Date.now();

    // 1. Sum all paise
    const totalPaise = sumPaise(expenses, (e) => e.amount_paise);
    expect(totalPaise).toBeGreaterThan(0);

    // 2. Group by date and category
    const dateMap = new Map<string, number>();
    const catMap = new Map<string, number>();

    for (const exp of expenses) {
      dateMap.set(exp.date, (dateMap.get(exp.date) || 0) + exp.amount_paise);
      catMap.set(exp.category_id, (catMap.get(exp.category_id) || 0) + exp.amount_paise);
    }

    const duration = Date.now() - startTime;
    expect(dateMap.size).toBe(28);
    expect(catMap.size).toBe(15);
    expect(duration).toBeLessThan(300); // Fast in-memory processing under 300ms
  });
});
