import { describe, it, expect } from 'vitest';

import {
  hasPostGameAnswer,
  hasPreGameAnswer,
  isV2ChartComplete,
  isV2GameEntry,
  v2GameProgress,
  v2SectionState,
  v2SectionsDone,
} from '@/lib/charting/v2-sections';

/**
 * A game with only part of the chart filled in was showing as charted. Each
 * section counts only once the goalie has answered something in it.
 */

const shotsInPeriodOne = {
  period1: { shots: 5, saves: 5, goalsAgainst: 0, goals: [] },
};

describe('hasPreGameAnswer', () => {
  it('is false for an empty or missing section', () => {
    expect(hasPreGameAnswer({})).toBe(false);
    expect(hasPreGameAnswer(undefined)).toBe(false);
    expect(hasPreGameAnswer(null)).toBe(false);
  });

  it('is true once any question is answered, including a No', () => {
    expect(hasPreGameAnswer({ personalStartTime: 'at_the_rink' })).toBe(true);
    expect(hasPreGameAnswer({ mentalStateRating: 3 })).toBe(true);
    expect(hasPreGameAnswer({ anxietyPresent: false })).toBe(true);
  });
});

describe('hasPostGameAnswer', () => {
  it('is false when only worked-out totals are present', () => {
    expect(hasPostGameAnswer({})).toBe(false);
    expect(hasPostGameAnswer({ overallFeeling: '   ', mindVaultEntry: '' })).toBe(false);
  });

  it('is true once the goalie answers something', () => {
    expect(hasPostGameAnswer({ gameRetentionRating: 4 })).toBe(true);
    expect(hasPostGameAnswer({ mindVaultEntry: 'Stayed calm after the early goal' })).toBe(true);
  });
});

describe('v2SectionState', () => {
  it('reports each section on its own', () => {
    const entry = { v2PreGame: { routineCompleted: true }, v2Periods: shotsInPeriodOne };
    expect(v2SectionState(entry)).toEqual({ preGame: true, periods: true, postGame: false });
  });

  it('does not count a periods section that holds only untouched periods', () => {
    const entry = { v2Periods: { period1: { shots: 0, goals: [] }, period2: {} } };
    expect(v2SectionState(entry).periods).toBe(false);
  });
});

describe('isV2ChartComplete', () => {
  it('is false for a game with a single section filled in', () => {
    const entry = { v2PreGame: { routineCompleted: true } };
    expect(v2SectionsDone(entry)).toBe(1);
    expect(isV2ChartComplete(entry)).toBe(false);
  });

  it('is true only when all three sections hold answers', () => {
    const entry = {
      v2PreGame: { mentalStateRating: 4 },
      v2Periods: shotsInPeriodOne,
      v2PostGame: { gameRetentionRating: 3 },
    };
    expect(isV2ChartComplete(entry)).toBe(true);
  });

  it('is false for no entry at all', () => {
    expect(isV2ChartComplete(undefined)).toBe(false);
  });
});

describe('isV2GameEntry', () => {
  it('tells a V2 game chart from a legacy or practice entry', () => {
    expect(isV2GameEntry({ v2PreGame: {} })).toBe(true);
    expect(isV2GameEntry({ v2Practice: {} })).toBe(false);
    expect(isV2GameEntry({ gameOverview: {} })).toBe(false);
    expect(isV2GameEntry(undefined)).toBe(false);
  });
});

describe('v2GameProgress', () => {
  it('is partial while only some sections hold answers', () => {
    expect(v2GameProgress({ v2PreGame: { routineCompleted: false }, v2Periods: shotsInPeriodOne })).toBe('partial');
  });

  it('is complete once all three do', () => {
    const entry = {
      v2PreGame: { mentalStateRating: 4 },
      v2Periods: shotsInPeriodOne,
      v2PostGame: { gameRetentionRating: 3 },
    };
    expect(v2GameProgress(entry)).toBe('complete');
  });

  it('is none when every saved section is empty', () => {
    expect(v2GameProgress({ v2PreGame: {}, v2Periods: { period1: {} }, v2PostGame: {} })).toBe('none');
  });
});
