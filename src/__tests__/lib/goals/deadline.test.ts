import { describe, it, expect } from 'vitest';
import { daysUntilDeadline, formatDeadline } from '@/lib/goals/deadline';

// A deadline is saved as 23:59:59 on the chosen day.
const endOfDay = (y: number, m: number, d: number) => new Date(y, m - 1, d, 23, 59, 59);

describe('formatDeadline', () => {
  const lunchtime = new Date(2026, 9, 28, 13, 20);

  it('says due today for the whole of the due day', () => {
    expect(formatDeadline(endOfDay(2026, 10, 28), new Date(2026, 9, 28, 0, 5))).toBe('Due today');
    expect(formatDeadline(endOfDay(2026, 10, 28), lunchtime)).toBe('Due today');
    expect(formatDeadline(endOfDay(2026, 10, 28), new Date(2026, 9, 28, 23, 50))).toBe('Due today');
  });

  it('says due tomorrow the day before', () => {
    expect(formatDeadline(endOfDay(2026, 10, 29), lunchtime)).toBe('Due tomorrow');
  });

  it('counts calendar days within the week', () => {
    expect(formatDeadline(endOfDay(2026, 10, 31), lunchtime)).toBe('Due in 3 day(s)');
    expect(formatDeadline(endOfDay(2026, 11, 4), lunchtime)).toBe('Due in 7 day(s)');
  });

  it('shows the date once it is more than a week away', () => {
    expect(formatDeadline(endOfDay(2026, 11, 5), lunchtime)).toMatch(/^Due /);
    expect(formatDeadline(endOfDay(2026, 11, 5), lunchtime)).not.toMatch(/day\(s\)/);
  });

  it('is overdue from the morning after the due day, not still due today', () => {
    expect(formatDeadline(endOfDay(2026, 10, 27), lunchtime)).toBe('Overdue by 1 day(s)');
    expect(formatDeadline(endOfDay(2026, 10, 25), lunchtime)).toBe('Overdue by 3 day(s)');
  });
});

describe('daysUntilDeadline', () => {
  it('stays a whole number of days across the clocks going back', () => {
    // 1 Nov 2026 is a 25-hour day in North America.
    const now = new Date(2026, 9, 31, 12, 0);
    expect(daysUntilDeadline(endOfDay(2026, 11, 2), now)).toBe(2);
    expect(daysUntilDeadline(endOfDay(2026, 11, 1), now)).toBe(1);
  });
});
