import { describe, it, expect } from 'vitest';

import { filledPeriods, isPeriodFilled } from '@/lib/charting/v2-periods';

/**
 * A game with shots charted in Period 1 only was reporting three periods, with
 * the two empty ones averaged in at a Mind Control of 3. An untouched period
 * must not count.
 */

const empty = {
  shots: 0,
  saves: 0,
  goalsAgainst: 0,
  standardSaves: 0,
  keySaves: 0,
  weakGoals: 0,
  midChallengeCount: 0,
  highChallengeCount: 0,
  goals: [],
};

describe('isPeriodFilled', () => {
  it('is false for a period nobody touched', () => {
    expect(isPeriodFilled(empty)).toBe(false);
    expect(isPeriodFilled({})).toBe(false);
    expect(isPeriodFilled(undefined)).toBe(false);
    expect(isPeriodFilled(null)).toBe(false);
  });

  it('is true once a counter moves', () => {
    expect(isPeriodFilled({ ...empty, shots: 5 })).toBe(true);
    expect(isPeriodFilled({ ...empty, keySaves: 1 })).toBe(true);
  });

  it('is true once a goal is classified', () => {
    expect(isPeriodFilled({ ...empty, goals: [{ goalNumber: 1, isGoodGoal: true }] })).toBe(true);
  });

  it('is true once any rating is answered', () => {
    expect(isPeriodFilled({ ...empty, mindControlRating: 3 })).toBe(true);
    expect(isPeriodFilled({ ...empty, periodFactorRatio: 1 })).toBe(true);
    expect(isPeriodFilled({ ...empty, formRating: 4 })).toBe(true);
  });

  it('is true when only a note was recorded', () => {
    expect(isPeriodFilled({ ...empty, skatingVoiceNote: 'Late on my edges' })).toBe(true);
  });

  it('ignores a note that is only whitespace', () => {
    expect(isPeriodFilled({ ...empty, skatingVoiceNote: '   ' })).toBe(false);
  });
});

describe('filledPeriods', () => {
  it('drops the untouched periods and keeps the order of play', () => {
    const periods = {
      period1: { ...empty, shots: 5, saves: 5 },
      period2: { ...empty },
      period3: undefined,
      overtime: { ...empty, mindControlRating: 4 },
    };
    expect(filledPeriods(periods).map(([key]) => key)).toEqual(['period1', 'overtime']);
  });

  it('returns nothing when there are no periods', () => {
    expect(filledPeriods(undefined)).toEqual([]);
    expect(filledPeriods(null)).toEqual([]);
  });
});
