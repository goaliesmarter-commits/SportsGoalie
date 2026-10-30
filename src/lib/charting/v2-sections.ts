/**
 * Which sections of a V2 game chart the goalie has actually filled in.
 *
 * Saving a section used to be enough to count it as done, and every section
 * opened with answers already chosen. A game with one question answered could
 * therefore read as fully charted. A section only counts once something in it
 * holds an answer.
 */

import { filledPeriods, type PeriodLike, type V2PeriodKey } from './v2-periods';

const isText = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;
const isNumber = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value);

export interface PreGameLike {
  personalStartTime?: string;
  mentalStateRating?: number;
  routineCompleted?: boolean;
  anxietyPresent?: boolean;
  targetStateAchieved?: boolean;
}

export interface PostGameLike {
  overallFeeling?: string;
  overallGameFactorRating?: number;
  gameRetentionRating?: number;
  mindVaultEntry?: string;
  improvementFocus?: string;
  whatWillYouDoDifferently?: string;
}

/** True when at least one of the five pre-game questions has an answer. */
export function hasPreGameAnswer(data: PreGameLike | null | undefined): boolean {
  if (!data) return false;
  return (
    isText(data.personalStartTime) ||
    isNumber(data.mentalStateRating) ||
    typeof data.routineCompleted === 'boolean' ||
    typeof data.anxietyPresent === 'boolean' ||
    typeof data.targetStateAchieved === 'boolean'
  );
}

/**
 * True when the goalie answered something on the post-game page. The totals the
 * page works out for itself (goal counts, averages) are not answers.
 */
export function hasPostGameAnswer(data: PostGameLike | null | undefined): boolean {
  if (!data) return false;
  return (
    isText(data.overallFeeling) ||
    isNumber(data.overallGameFactorRating) ||
    isNumber(data.gameRetentionRating) ||
    isText(data.mindVaultEntry) ||
    isText(data.improvementFocus) ||
    isText(data.whatWillYouDoDifferently)
  );
}

export interface V2EntryLike {
  v2PreGame?: PreGameLike | null;
  v2Periods?: Partial<Record<V2PeriodKey, PeriodLike | null>> | null;
  v2PostGame?: PostGameLike | null;
}

export interface V2SectionState {
  preGame: boolean;
  periods: boolean;
  postGame: boolean;
}

export function v2SectionState(entry: V2EntryLike | null | undefined): V2SectionState {
  return {
    preGame: hasPreGameAnswer(entry?.v2PreGame),
    periods: filledPeriods(entry?.v2Periods).length > 0,
    postGame: hasPostGameAnswer(entry?.v2PostGame),
  };
}

/** Number of the three sections that hold an answer. */
export function v2SectionsDone(entry: V2EntryLike | null | undefined): number {
  const state = v2SectionState(entry);
  return Number(state.preGame) + Number(state.periods) + Number(state.postGame);
}

/** All three sections are filled in. */
export function isV2ChartComplete(entry: V2EntryLike | null | undefined): boolean {
  return v2SectionsDone(entry) === 3;
}

export type V2GameProgress = 'complete' | 'partial' | 'none';

/** True when a stored charting entry is a V2 game chart (as opposed to a legacy or practice one). */
export function isV2GameEntry(entry: object | null | undefined): boolean {
  const raw = entry as V2EntryLike | null | undefined;
  return !!raw && (!!raw.v2PreGame || !!raw.v2Periods || !!raw.v2PostGame);
}

/**
 * How far along a V2 game chart is. Screens that say "charted" use this so a
 * game with only some sections filled reads as partial rather than done.
 */
export function v2GameProgress(entry: object | null | undefined): V2GameProgress {
  const done = v2SectionsDone(entry as V2EntryLike | null | undefined);
  if (done === 3) return 'complete';
  return done > 0 ? 'partial' : 'none';
}
