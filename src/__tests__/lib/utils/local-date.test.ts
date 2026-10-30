import { describe, it, expect } from 'vitest';

import {
  calendarDaysAgo,
  fromLocalDateKey,
  toLocalDateKey,
  toLocalDateTimeInputValue,
} from '@/lib/utils/local-date';

describe('toLocalDateKey', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // Built from local parts, so the expectation holds in any test time zone.
    const lateEvening = new Date(2026, 9, 4, 22, 30);
    expect(toLocalDateKey(lateEvening)).toBe('2026-10-04');
  });

  it('zero-pads month and day', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 8, 0))).toBe('2026-01-05');
  });
});

describe('toLocalDateTimeInputValue', () => {
  it('formats for a datetime-local input in local time', () => {
    expect(toLocalDateTimeInputValue(new Date(2026, 9, 4, 22, 5))).toBe('2026-10-04T22:05');
  });
});

describe('fromLocalDateKey', () => {
  it('round-trips with toLocalDateKey', () => {
    expect(toLocalDateKey(fromLocalDateKey('2026-10-25'))).toBe('2026-10-25');
  });

  it('labels a day with the same date it was keyed under', () => {
    // A Knowledge Check taken in the afternoon of Oct 27: the chart label read the
    // key as UTC midnight and printed Oct 26 anywhere west of UTC.
    const takenAt = new Date(2026, 9, 27, 14, 0);
    const label = fromLocalDateKey(toLocalDateKey(takenAt)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    expect(label).toBe('Oct 27');
  });
});

describe('calendarDaysAgo', () => {
  const morning = new Date(2026, 9, 28, 9, 0);

  it('counts last night as yesterday, not today', () => {
    expect(calendarDaysAgo(new Date(2026, 9, 27, 22, 0), morning)).toBe(1);
  });

  it('counts anything earlier the same day as today', () => {
    expect(calendarDaysAgo(new Date(2026, 9, 28, 0, 5), morning)).toBe(0);
  });

  it('does not call a day-and-a-bit ago yesterday when it was two days back', () => {
    expect(calendarDaysAgo(new Date(2026, 9, 26, 23, 0), morning)).toBe(2);
  });
});
