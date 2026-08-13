/**
 * The 5-Star development scale — one convention for the whole app.
 *
 * Every self-rating and coach rating in Smarter Goalie reads off the same five
 * rungs, so a goalie and their coach are never looking at the same number with
 * two different vocabularies in their heads.
 *
 * Ratings are still *stored* on their original 1–10 scale. The stars are a
 * reading of that number, not a replacement for it: charts, averages, baselines
 * and every entry already in Firestore are untouched. All conversion between
 * the stored number and the star display lives in this file and nowhere else.
 */

export interface StarStage {
  /** Position on the ladder, 1–5. */
  stars: number;
  /** Stage name. Coach Mike's wording — don't paraphrase it. */
  name: string;
  /** The line revealed when the stage is tapped. */
  line: string;
  /**
   * Whether `line` is the goalie's own voice. Coach Mike quoted stages 2, 3 and
   * 4 and wrote 1 and 5 as description, so the quote marks carry meaning rather
   * than decoration — they render only where he used them.
   */
  spoken: boolean;
}

export const STAR_COUNT = 5;

/** The scale ratings are stored on, and the one analytics reads. */
export const DEVELOPMENT_SCALE_MIN = 1;
export const DEVELOPMENT_SCALE_MAX = 10;

export const FIVE_STAR_SCALE: readonly StarStage[] = [
  {
    stars: 1,
    name: 'Learning',
    line: "It's going in.",
    spoken: false,
  },
  {
    stars: 2,
    name: 'Self-Evaluation',
    line: "I can see where I'm at.",
    spoken: true,
  },
  {
    stars: 3,
    name: 'Self-Awareness',
    line: 'I know why.',
    spoken: true,
  },
  {
    stars: 4,
    name: 'Self-Adjusting',
    line: 'I can change it.',
    spoken: true,
  },
  {
    stars: 5,
    name: 'Self-Coaching',
    line: 'The Intelligent Athletic Goaltender who owns their development and knows the support they need.',
    spoken: false,
  },
];

/**
 * How many points of the stored scale one star covers — 2 on a 1–10 scale.
 */
export function pointsPerStar(max: number = DEVELOPMENT_SCALE_MAX): number {
  return max / STAR_COUNT;
}

/**
 * The number written to storage when a goalie taps the nth star.
 *
 * On a 1–10 field the five stars land on 2, 4, 6, 8 and 10. Ratings recorded
 * before the stars existed can sit on the odd numbers; those still display
 * correctly (see `starsFromScore`), they just aren't a tap target any more.
 */
export function scoreFromStars(stars: number, max: number = DEVELOPMENT_SCALE_MAX): number {
  return Math.round(stars * pointsPerStar(max));
}

/**
 * How much of the star row a stored value fills. Deliberately fractional: an
 * average of 6.4, or a 7 recorded under the old 1–10 control, has to be able to
 * render honestly rather than being rounded into a stage it isn't at.
 */
export function starsFromScore(score: number, max: number = DEVELOPMENT_SCALE_MAX): number {
  return score / pointsPerStar(max);
}

export function stageForStars(stars: number): StarStage | null {
  return FIVE_STAR_SCALE.find((stage) => stage.stars === stars) ?? null;
}

/**
 * The stage a stored value sits in. A value part-way into a star counts as that
 * star — 7 out of 10 is 3.5 stars, which is a goalie working inside Stage 4,
 * not one who has finished Stage 3.
 */
export function stageForScore(score: number, max: number = DEVELOPMENT_SCALE_MAX): StarStage | null {
  if (!Number.isFinite(score) || score <= 0) return null;
  const position = Math.ceil(starsFromScore(score, max));
  return stageForStars(Math.min(Math.max(position, 1), STAR_COUNT));
}

/**
 * Whether a field's numeric range divides cleanly into five stars.
 *
 * A 1–10 or 1–5 rating does. A 0-based or 1–7 range doesn't, and gets the plain
 * numeric control instead of a star row that would misrepresent it.
 */
export function isStarScale(
  min: number = DEVELOPMENT_SCALE_MIN,
  max: number = DEVELOPMENT_SCALE_MAX
): boolean {
  return min === 1 && max >= STAR_COUNT && max % STAR_COUNT === 0;
}

/** `Self-Awareness — "I know why."`, punctuation included. */
export function describeStage(stage: StarStage): string {
  return `${stage.name} — ${stage.spoken ? `"${stage.line}"` : stage.line}`;
}
