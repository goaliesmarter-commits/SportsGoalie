import { describe, expect, it } from 'vitest';

import {
  MAX_SIGNUP_AGE,
  MIN_SIGNUP_AGE,
  PARENT_HELD_ACCOUNT_AGE,
  calculateAge,
  getAgeBracket,
  parseDateOfBirth,
  requiresParentHeldAccount,
} from '@/lib/auth/signup-policy';

// A fixed "today" so these assertions still mean the same thing next year.
const NOW = new Date(2026, 8, 6); // 6 September 2026, local time

describe('calculateAge', () => {
  it('counts a birthday that has already happened this year', () => {
    expect(calculateAge(new Date(2008, 0, 1), NOW)).toBe(18);
  });

  it('does not count a birthday still to come this year', () => {
    expect(calculateAge(new Date(2008, 11, 31), NOW)).toBe(17);
  });

  it('counts the birthday itself', () => {
    expect(calculateAge(new Date(2008, 8, 6), NOW)).toBe(18);
  });

  it('does not count the day before the birthday', () => {
    // The one that matters: at 17 years and 364 days they are still 17.
    expect(calculateAge(new Date(2008, 8, 7), NOW)).toBe(17);
  });

  it('handles a birthday later in the same month', () => {
    expect(calculateAge(new Date(2008, 8, 30), NOW)).toBe(17);
  });

  it('handles a leap-day birthday', () => {
    expect(calculateAge(new Date(2008, 1, 29), NOW)).toBe(18);
  });
});

describe('getAgeBracket', () => {
  it.each([
    [5, 'under_13'],
    [12, 'under_13'],
    [13, 'teen_13_17'],
    [17, 'teen_13_17'],
    [18, 'adult_18_plus'],
    [40, 'adult_18_plus'],
  ])('puts age %i in %s', (age, bracket) => {
    expect(getAgeBracket(age as number)).toBe(bracket);
  });
});

describe('requiresParentHeldAccount', () => {
  it('is true the day before the threshold birthday', () => {
    expect(requiresParentHeldAccount(new Date(2008, 8, 7), NOW)).toBe(true);
  });

  it('is false on the threshold birthday itself', () => {
    expect(requiresParentHeldAccount(new Date(2008, 8, 6), NOW)).toBe(false);
  });

  it('is true for a young goalie', () => {
    expect(requiresParentHeldAccount(new Date(2016, 3, 2), NOW)).toBe(true);
  });

  // Guards the constant itself. If the threshold is ever changed, this fails
  // and whoever changed it has to say so deliberately rather than by accident.
  it('uses the agreed threshold', () => {
    expect(PARENT_HELD_ACCOUNT_AGE).toBe(18);
    expect(MIN_SIGNUP_AGE).toBe(5);
    expect(MAX_SIGNUP_AGE).toBe(100);
  });
});

describe('parseDateOfBirth', () => {
  it('reads the date as the local calendar date that was typed', () => {
    // `new Date('2010-06-01')` is UTC midnight, which is 31 May anywhere west
    // of Greenwich — including every province this platform sells into.
    const parsed = parseDateOfBirth('2010-06-01');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2010);
    expect(parsed?.getMonth()).toBe(5);
    expect(parsed?.getDate()).toBe(1);
  });

  it('accepts 29 February in a leap year', () => {
    expect(parseDateOfBirth('2008-02-29')).not.toBeNull();
  });

  it.each([
    ['2011-02-29', 'a leap day in a non-leap year'],
    ['2011-02-30', 'a day February never has'],
    ['2011-04-31', 'a day April never has'],
    ['2011-13-01', 'a thirteenth month'],
    ['14/07/2005', 'the wrong format'],
    ['not-a-date', 'nonsense'],
    ['999-01-01', 'a three-digit year'],
    ['', 'an empty string'],
  ])('rejects %s (%s)', (value) => {
    expect(parseDateOfBirth(value)).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect(parseDateOfBirth(null)).toBeNull();
    expect(parseDateOfBirth(undefined)).toBeNull();
  });

  it('ignores surrounding whitespace', () => {
    expect(parseDateOfBirth('  2005-07-14  ')).not.toBeNull();
  });
});
