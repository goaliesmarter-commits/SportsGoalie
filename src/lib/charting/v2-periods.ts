/**
 * Which saved V2 periods count as data.
 *
 * The periods page used to save all three periods whether or not the goalie had
 * touched them, each with a Mind Control rating of 3 already filled in. A game
 * with shots charted in Period 1 only therefore reported three periods, and the
 * two empty ones pulled the Emotional Balance average toward 3.
 *
 * The page now leaves an untouched period out of what it saves, and every
 * average and count that reads periods goes through this check as well, so an
 * empty period that is already stored is not counted either.
 */

export type V2PeriodKey = 'period1' | 'period2' | 'period3' | 'overtime';

export const V2_PERIOD_KEYS: readonly V2PeriodKey[] = ['period1', 'period2', 'period3', 'overtime'];

/** The parts of a period this check looks at. Narrower than V2PeriodData so the analytics page's own cast fits. */
export interface PeriodLike {
  shots?: number;
  saves?: number;
  goalsAgainst?: number;
  standardSaves?: number;
  keySaves?: number;
  weakGoals?: number;
  midChallengeCount?: number;
  highChallengeCount?: number;
  goals?: readonly unknown[];
  mindControlRating?: number;
  mindControlChallengeLevel?: string;
  mindControlVoiceNote?: string;
  periodFactorRatio?: number;
  skatingRating?: number;
  skatingVoiceNote?: string;
  sevenAMSRating?: number;
  sevenAMSVoiceNote?: string;
  sixZSRating?: number;
  sixZSVoiceNote?: string;
  formRating?: number;
  formVoiceNote?: string;
  factorRatios?: Record<string, number>;
}

const COUNTERS = [
  'shots',
  'saves',
  'goalsAgainst',
  'standardSaves',
  'keySaves',
  'weakGoals',
  'midChallengeCount',
  'highChallengeCount',
] as const;

const RATINGS = [
  'mindControlRating',
  'periodFactorRatio',
  'skatingRating',
  'sevenAMSRating',
  'sixZSRating',
  'formRating',
] as const;

const NOTES = [
  'mindControlVoiceNote',
  'skatingVoiceNote',
  'sevenAMSVoiceNote',
  'sixZSVoiceNote',
  'formVoiceNote',
] as const;

/** True when the goalie entered anything at all for this period. */
export function isPeriodFilled(period: PeriodLike | null | undefined): boolean {
  if (!period) return false;
  if (COUNTERS.some((key) => (period[key] ?? 0) > 0)) return true;
  if ((period.goals?.length ?? 0) > 0) return true;
  if (RATINGS.some((key) => typeof period[key] === 'number')) return true;
  if (period.mindControlChallengeLevel) return true;
  if (NOTES.some((key) => (period[key] ?? '').trim().length > 0)) return true;
  if (period.factorRatios && Object.keys(period.factorRatios).length > 0) return true;
  return false;
}

/** The periods of a game that hold data, keyed as stored. */
export function filledPeriods<T extends PeriodLike>(
  periods: Partial<Record<V2PeriodKey, T | null | undefined>> | null | undefined,
): [V2PeriodKey, T][] {
  if (!periods) return [];
  const result: [V2PeriodKey, T][] = [];
  for (const key of V2_PERIOD_KEYS) {
    const period = periods[key];
    if (period && isPeriodFilled(period)) result.push([key, period]);
  }
  return result;
}
