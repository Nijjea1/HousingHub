import { describe, expect, it } from 'vitest';
import { budget } from './budget';

describe('budget', () => {
  it('adds utilities to rent and measures the share of income', () => {
    const b = budget({ income: 2000, rent: 500, utilities: 100, otherExpenses: 400 });
    expect(b.housing).toBe(600);
    expect(b.share).toBeCloseTo(0.3);
    expect(b.left).toBe(1000);
    expect(b.guideMax).toBe(600);
    expect(b.overGuide).toBe(false);
  });

  it('flags housing over 30% of income', () => {
    expect(budget({ income: 2000, rent: 700, utilities: 0, otherExpenses: 0 }).overGuide).toBe(true);
  });

  it('can leave a negative balance', () => {
    expect(budget({ income: 1000, rent: 900, utilities: 100, otherExpenses: 200 }).left).toBe(-200);
  });

  it('has no share without income, and any rent is over the guide', () => {
    const b = budget({ income: 0, rent: 500, utilities: 0, otherExpenses: 0 });
    expect(b.share).toBeNull();
    expect(b.overGuide).toBe(true);
  });
});
