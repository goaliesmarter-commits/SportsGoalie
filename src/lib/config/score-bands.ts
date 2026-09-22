/**
 * Grasp Level bands for Knowledge Check scores.
 *
 * `tier` is the value written to records (achievements, celebration popups, the tier
 * union in src/types/index.ts) and must not change — old records already carry it.
 * `label` is what a goalie reads, which is why the 80-94 band is stored as
 * '80-100 CLUB' but shown as '80-94 CLUB'.
 *
 * `color` is the palette used on the progress screens. The achievements list and the
 * celebration popup have their own palettes and deliberately keep them.
 */

export type ScoreTier =
  | 'FOUNDATION'
  | 'DEVELOPING'
  | 'OWNING IT'
  | '80-100 CLUB'
  | '95-100 CLUB';

export interface ScoreBand {
  /** Stored value. Never change these strings. */
  tier: ScoreTier;
  /** What the goalie sees. */
  label: string;
  /** Inclusive lower bound of the band. */
  min: number;
  /** Inclusive upper bound of the band. */
  max: number;
  color: string;
}

/** Highest band first, so the first match wins. */
export const SCORE_BANDS: readonly ScoreBand[] = [
  { tier: '95-100 CLUB', label: '95-100 CLUB', min: 95, max: 100, color: '#fbbf24' },
  { tier: '80-100 CLUB', label: '80-94 CLUB', min: 80, max: 94, color: '#60cdff' },
  { tier: 'OWNING IT', label: 'OWNING IT', min: 70, max: 79, color: '#37b5ff' },
  { tier: 'DEVELOPING', label: 'DEVELOPING', min: 40, max: 69, color: '#93c5fd' },
  { tier: 'FOUNDATION', label: 'FOUNDATION', min: 0, max: 39, color: '#f59e0b' },
] as const;

/** The band a percentage falls into. Always returns a band. */
export function getScoreBand(percentage: number): ScoreBand {
  const pct = Number.isFinite(percentage) ? percentage : 0;
  return SCORE_BANDS.find(band => pct >= band.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}

/** e.g. "80-94 CLUB (80-94%)" — for legends that show the range. */
export function getScoreBandRangeLabel(band: ScoreBand): string {
  return `${band.label} (${band.min}-${band.max}%)`;
}
