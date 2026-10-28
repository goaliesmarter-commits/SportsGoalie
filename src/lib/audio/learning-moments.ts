/**
 * Which learning moment a goalie has just reached (Audio Part 3).
 *
 * Pure rules, so the screens that fire the moments stay thin and the choices
 * are tested in one place. Each returns at most one moment: one step deserves
 * one message, and the most meaningful one wins.
 */

import { quizIsOwned, type OwnableAttempt } from '@/lib/training/owned';
import { finishedTakeDate } from '@/lib/training/attempt-streak';
import type { LearningMomentKey } from '@/lib/audio/events';

/**
 * A results page opened later from the goalie's history is not a moment. Only a
 * take finished this recently counts as "just finished".
 */
export const FRESH_TAKE_MS = 10 * 60 * 1000;

interface Take extends OwnableAttempt {
  id: string;
}

function gradedAllRight(take: OwnableAttempt): boolean {
  const graded = (take.questionsAnswered ?? []).filter(answer => answer && answer.reflective !== true);
  if (graded.length > 0) return graded.every(answer => answer.isCorrect === true);
  return typeof take.percentage === 'number' && take.percentage >= 100;
}

/**
 * The moment for a Knowledge Check take, given every take of that check.
 *
 *   knowledgeCheckOwned   — this take is the one that made every question right
 *   knowledgeCheckPerfect — every answer in this take was right
 *   knowledgeCheckDone    — the take is finished
 *
 * Null when the take is not the newest or was not finished just now.
 */
export function knowledgeCheckMoment(
  takes: Take[],
  latestId: string,
  now: number = Date.now()
): LearningMomentKey | null {
  const latest = takes.find(take => take.id === latestId);
  if (!latest) return null;

  const finished = finishedTakeDate(latest as Parameters<typeof finishedTakeDate>[0]);
  if (!finished || now - finished.getTime() > FRESH_TAKE_MS) return null;

  const before = takes.filter(take => take.id !== latestId);
  if (quizIsOwned(takes) && !quizIsOwned(before)) return 'knowledgeCheckOwned';
  if (gradedAllRight(latest)) return 'knowledgeCheckPerfect';
  return 'knowledgeCheckDone';
}

/** Mastery levels worth a spoken message. Sparser than the notification thresholds on purpose. */
export const SPOKEN_MASTERY = [25, 50, 75, 100] as const;

/** The highest spoken mastery level crossed going from `prev` to `next` percent, or null. */
export function masteryMilestoneCrossed(prev: number, next: number): number | null {
  const crossed = SPOKEN_MASTERY.filter(level => prev < level && next >= level);
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
}

/** Streak lengths worth a message. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365] as const;

/**
 * The streak milestone to celebrate now, or null. `celebrated` is the milestone
 * last celebrated. Each is said once per streak; a streak shorter than that one
 * means it was broken and a new streak has started, so its milestones count again.
 */
export function streakMilestoneReached(days: number, celebrated: number): number | null {
  const since = days < celebrated ? 0 : celebrated;
  const reached = [...STREAK_MILESTONES].reverse().find(milestone => days >= milestone);
  if (reached === undefined || reached <= since) return null;
  return reached;
}
