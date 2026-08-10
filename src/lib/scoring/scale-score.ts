/**
 * The single rule for turning a rating into a percentage.
 *
 * Michael, 6 August 2026: "make 7/10 read 70% (understood that 1/10 then reads
 * 10%, never 0%). Please sync every screen."
 *
 * Every screen that shows a rating as a percentage or a bar width must go
 * through this function, so a 7 never reads 70% in one place and 67% in another.
 *
 * WHAT CHANGED AND WHY IT MATTERED
 * Scores used to be normalised across the *range* of the scale:
 *
 *     (value - min) / (max - min) * 100
 *
 * On a 1-10 scale that made 7 read 67%, and — the part that actually hurt — it
 * made the bottom of the scale read 0%. A goalie who answered honestly and
 * scored 1/10 was shown a completely empty bar, which reads as "you have
 * nothing", not as "you are at the start". The floor of a scale is a real
 * answer, not an absence of one.
 *
 * The rule is now simply "value out of the top of the scale":
 *
 *     value / max * 100
 *
 * so 7/10 is 70%, 1/10 is 10%, 4/5 is 80%, and 3/4 is 75% — each reads the way
 * a person would say it out loud.
 */

/**
 * Percentage for `value` on a scale topping out at `max`.
 *
 * `min` is only consulted to catch scales that run through or below zero (a
 * -5..+5 slider, say), where "out of the top" is meaningless and range
 * normalisation is the only honest reading.
 *
 * Returns null when the scale cannot produce a percentage at all, so callers
 * leave the figure out rather than printing an invented one.
 */
export function scaleToPercentage(
  value: number,
  max: number,
  min: number = 1
): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(max)) return null;

  // A scale that can go negative has no "out of" reading — 0 on a -5..+5 slider
  // is the middle, not the bottom. Fall back to range normalisation there.
  if (min < 0) {
    const range = max - min;
    if (range <= 0) return null;
    return clampPercentage(((value - min) / range) * 100);
  }

  if (max <= 0) return null;

  return clampPercentage((value / max) * 100);
}

/** Rounds to a whole percent and keeps the result inside 0-100. */
export function clampPercentage(pct: number): number {
  return Math.round(Math.max(0, Math.min(100, pct)));
}
