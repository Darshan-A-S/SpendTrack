import { useSalaryStore, getSalaryMetrics } from '../store/salaryStore';

describe('Salary Mode & Pots Engine', () => {
  beforeEach(() => {
    useSalaryStore.setState({
      isSalaryMode: true,
      monthlySalaryPaise: 5000000, // ₹50,000
      pots: [
        {
          id: 'pot-family',
          name: 'Family',
          icon: 'people-outline',
          color: '#8B5CF6',
          allocatedPaise: 1000000, // ₹10,000
          spentPaise: 0,
          isFlexible: false,
        },
        {
          id: 'pot-emi',
          name: 'EMI',
          icon: 'card-outline',
          color: '#EF4444',
          allocatedPaise: 1500000, // ₹15,000
          spentPaise: 0,
          isFlexible: false,
        },
        {
          id: 'pot-travel',
          name: 'Travel',
          icon: 'airplane-outline',
          color: '#F59E0B',
          allocatedPaise: 500000, // ₹5,000
          spentPaise: 0,
          isFlexible: true,
        },
      ],
      reallocatedPaise: 0,
      streak: 3,
      lastEvaluatedDate: '2026-10-22',
      streakBrokenToday: false,
    });
  });

  test('calculates correct spendable pool and daily allowance', () => {
    // 50,000 salary - (10k family + 15k emi + 5k travel) = 20,000 spendable
    const metrics = getSalaryMetrics(useSalaryStore.getState(), new Date('2026-10-01'));
    expect(metrics.totalAllocatedPotsPaise).toBe(3000000); // ₹30,000
    expect(metrics.discretionaryMonthlyPoolPaise).toBe(2000000); // ₹20,000
    // In October (31 days): 20,000 / 31 = 645.16 -> 64516 paise (₹645)
    expect(metrics.dailyAllowancePaise).toBe(Math.floor(2000000 / 31));
  });

  test('reallocating unused travel fund adds to daily spending pool', () => {
    const store = useSalaryStore.getState();

    // Reallocate entire remaining Travel fund (₹5,000)
    const result = store.reallocatePotToSpendable('pot-travel');
    expect(result.success).toBe(true);
    expect(result.transferredPaise).toBe(500000);

    const updatedState = useSalaryStore.getState();
    // Reference Oct 22 (10 days remaining in October)
    const metrics = getSalaryMetrics(updatedState, new Date('2026-10-22'));

    // Spendable pool should increase from ₹20,000 to ₹25,000!
    expect(metrics.discretionaryMonthlyPoolPaise).toBe(2500000);
    // Base allowance = 20,000 / 31 = 64,516 paise (₹645)
    // Boost across remaining 10 days = 5,000 / 10 = 50,000 paise (₹500/day)
    expect(metrics.reallocatedDailyBoostPaise).toBe(50000);
    expect(metrics.dailyAllowancePaise).toBe(Math.floor(2000000 / 31) + 50000);
  });

  test('spending against an earmarked pot deducts from that pot', () => {
    const store = useSalaryStore.getState();

    // Spend ₹2,000 for travel
    store.spendFromPot('pot-travel', 200000);

    const travelPot = useSalaryStore.getState().pots.find((p) => p.id === 'pot-travel');
    expect(travelPot?.spentPaise).toBe(200000);
    expect(travelPot!.allocatedPaise - travelPot!.spentPaise).toBe(300000); // ₹3,000 remaining
  });

  test('streak breaks when daily spending exceeds daily allowance', () => {
    const store = useSalaryStore.getState();

    // Limit is 645 rupees (64,516 paise). Spend 1000 rupees (100,000 paise).
    store.evaluateStreak(100000, 64516);

    const state = useSalaryStore.getState();
    expect(state.streak).toBe(0);
    expect(state.streakBrokenToday).toBe(true);

    // If spending is corrected or under limit, streak recovers
    store.evaluateStreak(20000, 64516);
    const recoveredState = useSalaryStore.getState();
    expect(recoveredState.streakBrokenToday).toBe(false);
    expect(recoveredState.streak).toBeGreaterThan(0);
  });
});
