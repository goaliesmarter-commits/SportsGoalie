/**
 * The short lines that answer something the goalie just did.
 *
 * V-A-27 to V-A-37 in Michael's list are a word or two each ("Chart saved.",
 * "Got it."). They are not behind a button and not once-only moments: each one
 * plays when its event happens. Michael passed them for testing on 17 Oct 2026
 * and has not yet said how often they should speak, so the pacing here is a
 * placeholder and lives in this file only.
 *
 * To change what plays on an event, change the clip here. To add a place that
 * fires one, call `useEventVoice()` there (or mount `<EventVoice />` for a
 * screen that fires it by showing up).
 *
 * V-A-31, 33, 34 and 36 are parked (Potential Builds) and V-A-32 has no trigger
 * yet, so none of them are here.
 */

import type { User } from '@/types';

export const EVENT_LINES = {
  /** A chart is saved. */
  chartSaved: 'V-A-27',
  /** An answer is saved. */
  answerSaved: 'V-A-28',
  /** A Mind-Vault entry is saved. */
  vaultSaved: 'V-A-29',
  /** A long form opens. */
  longFormOpen: 'V-A-30',
  /** An empty screen on a new account. */
  emptyScreen: 'V-A-35',
  /** The goalie moves on to the next step. */
  nextStep: 'V-A-37',
} as const;

/**
 * Learning moments (Audio Part 3): a message for a step in the goalie's
 * learning. They have no line built in. Coach Mike places a recording on each
 * one from the Coach Audio screen, once, and from then on it plays for every
 * goalie who reaches that moment; until he does, the moment stays silent.
 */
export const LEARNING_MOMENTS = [
  'knowledgeCheckDone',
  'knowledgeCheckPerfect',
  'knowledgeCheckOwned',
  'masteryMilestone',
  'streakReached',
] as const;

export type LearningMomentKey = (typeof LEARNING_MOMENTS)[number];

export type VoiceEventKey = keyof typeof EVENT_LINES | LearningMomentKey;

/** Every moment as admin sees it, in the order the Coach Audio screen lists them. */
export const MOMENT_LABELS: Record<VoiceEventKey, string> = {
  knowledgeCheckDone: 'KNOWLEDGE CHECK FINISHED',
  knowledgeCheckPerfect: 'KNOWLEDGE CHECK: EVERY ANSWER RIGHT',
  knowledgeCheckOwned: 'KNOWLEDGE CHECK OWNED (EVERY QUESTION NOW RIGHT)',
  masteryMilestone: 'MASTERY MILESTONE REACHED (25, 50, 75, 100%)',
  streakReached: 'LEARNING STREAK REACHED (3, 7, 14, 30 DAYS…)',
  chartSaved: 'A CHART IS SAVED',
  answerSaved: 'AN ANSWER IS SAVED',
  vaultSaved: 'A MIND-VAULT ENTRY IS SAVED',
  longFormOpen: 'A LONG FORM OPENS',
  emptyScreen: 'AN EMPTY SCREEN ON A NEW ACCOUNT',
  nextStep: 'THE GOALIE MOVES ON TO THE NEXT STEP',
};

/** The line built into the code for an event, or null for a learning moment. */
export function builtInLine(event: VoiceEventKey): string | null {
  return event in EVENT_LINES ? EVENT_LINES[event as keyof typeof EVENT_LINES] : null;
}

/**
 * How long one event stays quiet at one place after it has spoken. Saving five
 * Mind-Vault entries in a row says "That's in your record." once, not five times.
 * Steps that follow each other (Pre-Game, then Periods) are separate places.
 */
export const EVENT_COOLDOWN_MS = 5 * 60 * 1000;

/** "That's normal on day one" stops being true after the first couple of weeks. */
export const NEW_ACCOUNT_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

type Dated = { toMillis?: () => number; seconds?: number } | Date | null | undefined;

function millisOf(value: Dated): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return null;
}

/** Whether the account is young enough for a line that talks about day one. */
export function isNewAccount(user: { createdAt?: unknown } | null | undefined, now: number): boolean {
  const created = millisOf(user?.createdAt as Dated);
  return created !== null && now - created <= NEW_ACCOUNT_DAYS * DAY_MS;
}

/**
 * Whether this event may speak right now. These lines are addressed to a
 * goalie, so a coach, parent or admin doing the same thing hears nothing.
 *
 * `lastSpokeAt` is when this same event last spoke at this same place in this
 * browser tab, if it has. It is not stored anywhere: reloading the page starts it
 * afresh.
 */
export function eventMaySpeak(
  event: VoiceEventKey,
  user: Pick<User, 'role' | 'createdAt'> | null | undefined,
  lastSpokeAt: number | undefined,
  now: number
): boolean {
  if (!user || user.role !== 'student') return false;
  if (lastSpokeAt !== undefined && now - lastSpokeAt < EVENT_COOLDOWN_MS) return false;
  if (event === 'emptyScreen' && !isNewAccount(user, now)) return false;
  return true;
}
