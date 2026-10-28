import { describe, it, expect } from 'vitest';

import {
  FRESH_TAKE_MS,
  knowledgeCheckMoment,
  masteryMilestoneCrossed,
  streakMilestoneReached,
} from '@/lib/audio/learning-moments';
import { pickMomentClip } from '@/hooks/useEventVoice';
import { builtInLine, LEARNING_MOMENTS, MOMENT_LABELS } from '@/lib/audio/events';
import { isKnownSlot, momentSlotKey } from '@/lib/audio/slots';

const NOW = new Date('2026-10-28T12:00:00Z').getTime();

function take(id: string, minutesAgo: number, answers: Array<[string, boolean]>) {
  return {
    id,
    videoQuizId: 'kc-1',
    skillId: 'skill-1',
    completedAt: new Date(NOW - minutesAgo * 60_000),
    questionsAnswered: answers.map(([questionId, isCorrect]) => ({ questionId, isCorrect })),
  };
}

describe('the moment for a Knowledge Check just finished', () => {
  it('is "owned" on the take that made every question right', () => {
    const first = take('t1', 60, [['q1', true], ['q2', false]]);
    const second = take('t2', 1, [['q1', false], ['q2', true]]);
    expect(knowledgeCheckMoment([first, second], 't2', NOW)).toBe('knowledgeCheckOwned');
  });

  it('is "every answer right" on a perfect take of a check already owned', () => {
    const first = take('t1', 60, [['q1', true], ['q2', true]]);
    const second = take('t2', 1, [['q1', true], ['q2', true]]);
    expect(knowledgeCheckMoment([first, second], 't2', NOW)).toBe('knowledgeCheckPerfect');
  });

  it('is "finished" on a take with a question still to get right', () => {
    const only = take('t1', 1, [['q1', true], ['q2', false]]);
    expect(knowledgeCheckMoment([only], 't1', NOW)).toBe('knowledgeCheckDone');
  });

  it('is "owned" on a first take that gets everything right', () => {
    const only = take('t1', 1, [['q1', true], ['q2', true]]);
    expect(knowledgeCheckMoment([only], 't1', NOW)).toBe('knowledgeCheckOwned');
  });

  it('is nothing for a results page opened later from history', () => {
    const old = take('t1', FRESH_TAKE_MS / 60_000 + 1, [['q1', true]]);
    expect(knowledgeCheckMoment([old], 't1', NOW)).toBeNull();
  });

  it('is nothing for a take that is not on file', () => {
    expect(knowledgeCheckMoment([], 'missing', NOW)).toBeNull();
  });
});

describe('mastery milestones', () => {
  it('speak at 25, 50, 75 and 100%, the highest crossed', () => {
    expect(masteryMilestoneCrossed(20, 30)).toBe(25);
    expect(masteryMilestoneCrossed(20, 80)).toBe(75);
    expect(masteryMilestoneCrossed(99, 100)).toBe(100);
  });

  it('stay quiet between milestones and going down', () => {
    expect(masteryMilestoneCrossed(26, 40)).toBeNull();
    expect(masteryMilestoneCrossed(60, 40)).toBeNull();
  });
});

describe('streak milestones', () => {
  it('are celebrated once each', () => {
    expect(streakMilestoneReached(3, 0)).toBe(3);
    expect(streakMilestoneReached(4, 3)).toBeNull();
    expect(streakMilestoneReached(7, 3)).toBe(7);
  });

  it('are celebrated again after the streak breaks and builds back', () => {
    expect(streakMilestoneReached(3, 7)).toBe(3);
  });

  it('wait for the first milestone', () => {
    expect(streakMilestoneReached(2, 0)).toBeNull();
  });
});

describe('the recording a moment plays', () => {
  it('is one Coach Mike placed on it, in turn when there are several', () => {
    expect(pickMomentClip(['A', 'B', 'C'], 'V-A-27', () => 0)).toBe('A');
    expect(pickMomentClip(['A', 'B', 'C'], 'V-A-27', () => 0.99)).toBe('C');
  });

  it('falls back to the line built into the code', () => {
    expect(pickMomentClip([], builtInLine('chartSaved'))).toBe('V-A-27');
  });

  it('is nothing for a learning moment nobody has placed a recording on', () => {
    expect(pickMomentClip([], builtInLine('knowledgeCheckOwned'))).toBeNull();
  });
});

describe('moments in the admin list', () => {
  it('every moment is a place admin can choose', () => {
    for (const event of Object.keys(MOMENT_LABELS) as Array<keyof typeof MOMENT_LABELS>) {
      expect(isKnownSlot(momentSlotKey(event))).toBe(true);
    }
  });

  it('learning moments have no line built in', () => {
    for (const moment of LEARNING_MOMENTS) expect(builtInLine(moment)).toBeNull();
  });
});
