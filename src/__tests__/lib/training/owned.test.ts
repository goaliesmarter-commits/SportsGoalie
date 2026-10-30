import { describe, it, expect } from 'vitest';
import {
  attemptedSkillIds,
  ownedSkillIds,
  pillarIsComplete,
  quizIsOwned,
  skillOwnedDates,
  type OwnableAttempt,
} from '@/lib/training/owned';

const at = (day: number) => new Date(2026, 9, day, 12, 0, 0);

function take(
  answers: Array<[string, boolean] | [string, boolean, 'reflective']>,
  extra: Partial<OwnableAttempt> = {},
): OwnableAttempt {
  return {
    videoQuizId: 'quiz-1',
    skillId: 'skill-1',
    completedAt: at(1),
    questionsAnswered: answers.map(([questionId, isCorrect, kind]) => ({
      questionId,
      isCorrect,
      reflective: kind === 'reflective',
    })),
    ...extra,
  };
}

describe('quizIsOwned', () => {
  it('is not owned at 0% (the skill-done-at-0% bug)', () => {
    expect(quizIsOwned([take([['q1', false], ['q2', false]], { percentage: 0 })])).toBe(false);
  });

  it('is not owned with some questions still wrong', () => {
    expect(quizIsOwned([take([['q1', true], ['q2', false]], { percentage: 50 })])).toBe(false);
  });

  it('is owned when every graded question was right on the first look', () => {
    expect(quizIsOwned([take([['q1', true], ['q2', true]], { percentage: 100 })])).toBe(true);
  });

  it('is owned when the misses were each got right on another take', () => {
    const first = take([['q1', true], ['q2', false], ['q3', false]], { completedAt: at(1) });
    const second = take([['q1', false], ['q2', true], ['q3', true]], { completedAt: at(2) });
    expect(quizIsOwned([second, first])).toBe(true);
  });

  it('stays open while one question has never been got right', () => {
    const first = take([['q1', true], ['q2', false]], { completedAt: at(1) });
    const second = take([['q1', true], ['q2', false]], { completedAt: at(2) });
    expect(quizIsOwned([first, second])).toBe(false);
  });

  it('never asks the goalie to get a reflective question right', () => {
    const attempt = take([['q1', true], ['r1', false, 'reflective']]);
    expect(quizIsOwned([attempt])).toBe(true);
  });

  it('counts a check with nothing graded as done once it has been finished', () => {
    expect(quizIsOwned([take([['r1', false, 'reflective']])])).toBe(true);
  });

  it('judges against the questions in the most recent take', () => {
    const old = take([['q1', true], ['gone', false]], { completedAt: at(1) });
    const latest = take([['q1', true]], { completedAt: at(2) });
    expect(quizIsOwned([old, latest])).toBe(true);
  });

  it('falls back to a take at 100% when there is no per-question record', () => {
    const legacyFull: OwnableAttempt = { videoQuizId: 'quiz-1', skillId: 'skill-1', percentage: 100, completedAt: at(1) };
    const legacyLow: OwnableAttempt = { videoQuizId: 'quiz-1', skillId: 'skill-1', percentage: 60, completedAt: at(2) };
    expect(quizIsOwned([legacyLow, legacyFull])).toBe(true);
    expect(quizIsOwned([legacyLow])).toBe(false);
  });

  it('is not owned with no takes', () => {
    expect(quizIsOwned([])).toBe(false);
  });
});

describe('ownedSkillIds', () => {
  it('lists only the skills every taken check of which is owned', () => {
    const attempts = [
      take([['q1', true]], { skillId: 'skill-a', videoQuizId: 'quiz-a' }),
      take([['q1', false]], { skillId: 'skill-b', videoQuizId: 'quiz-b' }),
    ];
    expect([...ownedSkillIds(attempts)]).toEqual(['skill-a']);
    expect([...attemptedSkillIds(attempts)].sort()).toEqual(['skill-a', 'skill-b']);
  });

  it('keeps a skill open while any check taken under it is not owned', () => {
    const attempts = [
      take([['q1', true]], { skillId: 'skill-a', videoQuizId: 'quiz-1' }),
      take([['q1', false]], { skillId: 'skill-a', videoQuizId: 'quiz-2' }),
    ];
    expect(ownedSkillIds(attempts).has('skill-a')).toBe(false);
  });

  it('ignores takes with no skill', () => {
    expect(ownedSkillIds([take([['q1', true]], { skillId: null })]).size).toBe(0);
  });
});

describe('skillOwnedDates', () => {
  it('dates a skill by the take that completed it, not the first take', () => {
    const first = take([['q1', true], ['q2', false]], { completedAt: at(3) });
    const second = take([['q1', false], ['q2', true]], { completedAt: at(5) });
    const dates = skillOwnedDates([second, first]);
    expect(dates.get('skill-1')).toEqual(at(5));
  });

  it('has no date for a skill that is still open', () => {
    expect(skillOwnedDates([take([['q1', false]], { completedAt: at(3) })]).has('skill-1')).toBe(false);
  });
});

describe('pillarIsComplete', () => {
  const owned = new Set(['a', 'b']);

  it('is complete when every skill in the pillar is owned', () => {
    expect(pillarIsComplete(['a', 'b'], owned)).toBe(true);
  });

  it('is not complete while one skill is still open', () => {
    expect(pillarIsComplete(['a', 'b', 'c'], owned)).toBe(false);
  });

  it('is never complete without skills', () => {
    expect(pillarIsComplete([], owned)).toBe(false);
  });
});
