describe('Budget Threshold Logic', () => {
  test('calculates percentage and warning / over-budget flags accurately', () => {
    const budgetPaise = 1000000; // 10,000 INR

    // 50% spent: normal
    const spent50 = 500000;
    const pct50 = Math.round((spent50 / budgetPaise) * 100);
    expect(pct50).toBe(50);
    expect(pct50 >= 80).toBe(false);
    expect(pct50 >= 100).toBe(false);

    // 80% spent: warning
    const spent80 = 800000;
    const pct80 = Math.round((spent80 / budgetPaise) * 100);
    expect(pct80).toBe(80);
    expect(pct80 >= 80).toBe(true);
    expect(pct80 >= 100).toBe(false);

    // 105% spent: over budget
    const spent105 = 1050000;
    const pct105 = Math.round((spent105 / budgetPaise) * 100);
    expect(pct105).toBe(105);
    expect(pct105 >= 100).toBe(true);
  });
});
