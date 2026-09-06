/**
 * The four sign-up intake fields — Michael's Item 2, first half:
 * "Four fields at sign-up — name, age, level, and why they are here — followed
 * by the Driver-or-Passenger screen."
 *
 * These are asked once, on their own screen, before Driver-or-Passenger and
 * before the 74-question Student Baseline Profile begins. They are written to
 * the user record as soon as the goalie leaves the screen, so a goalie who
 * abandons the long questionnaire still leaves behind who they are and what
 * brought them here.
 *
 * Name and age also pre-fill the matching baseline questions (A1 and A2) so
 * nobody is asked the same thing twice.
 *
 * Michael supplied the requirement and the field list, not the option wording.
 * The level options are the ones already used elsewhere in the app
 * (src/data/goalie-intake-questions.ts, Q-IN-3) and the age bands are the ones
 * already used by baseline question A2 — reused verbatim so the two never
 * disagree.
 */

export type SignupAgeBandId =
  | 'age_7_9'
  | 'age_10_12'
  | 'age_13_15'
  | 'age_16_18'
  | 'age_19_21'
  | 'age_adult'
  | 'age_masters';

export type SignupLevelId =
  | 'house'
  | 'select'
  | 'aa_aaa'
  | 'elite'
  | 'not_playing';

export interface SignupAgeBand {
  id: SignupAgeBandId;
  label: string;
  /** The matching option id on baseline question A2, so A2 can be pre-filled. */
  baselineOptionId: string;
}

export interface SignupLevel {
  id: SignupLevelId;
  label: string;
}

/** Age bands — identical to baseline question A2's options. */
export const SIGNUP_AGE_BANDS: SignupAgeBand[] = [
  { id: 'age_7_9', label: '7–9', baselineOptionId: 'A2-1' },
  { id: 'age_10_12', label: '10–12', baselineOptionId: 'A2-2' },
  { id: 'age_13_15', label: '13–15', baselineOptionId: 'A2-3' },
  { id: 'age_16_18', label: '16–18', baselineOptionId: 'A2-4' },
  { id: 'age_19_21', label: '19–21', baselineOptionId: 'A2-5' },
  { id: 'age_adult', label: 'Adult', baselineOptionId: 'A2-6' },
  { id: 'age_masters', label: 'Masters', baselineOptionId: 'A2-7' },
];

/** Playing levels — the same four the goalie intake already uses, plus the
 *  honest fifth answer for someone who is not on a team right now. */
export const SIGNUP_LEVELS: SignupLevel[] = [
  { id: 'house', label: 'House league / recreational' },
  { id: 'select', label: 'Select / competitive' },
  { id: 'aa_aaa', label: 'AA / AAA' },
  { id: 'elite', label: 'Elite / Junior / Pre-Junior' },
  { id: 'not_playing', label: 'Not playing on a team right now' },
];

/** What gets stored, on the user record and on the baseline profile. */
export interface GoalieSignupIntake {
  name: string;
  ageBand: SignupAgeBandId;
  level: SignupLevelId;
  /** Free text — why they are here, in their own words. */
  reason: string;
}

/** The screen's own wording. */
export const SIGNUP_INTAKE_SCREEN = {
  eyebrow: 'Before the questions begin',
  heading: 'FOUR QUICK THINGS',
  subline: 'Name, age, level, and what brought you here. Everything else can wait.',
  fields: {
    name: 'Your full name.',
    age: 'Your age.',
    level: 'What level do you play at?',
    reason: 'Why are you here?',
  },
  reasonPlaceholder: 'In your own words — what brought you to Smarter Goalie?',
  reasonHint: 'A sentence or two is plenty. There is no right answer.',
} as const;

/** The band behind a stored id, or null for anything unrecognised. */
export function getSignupAgeBand(id: string | null | undefined): SignupAgeBand | null {
  if (!id) return null;
  return SIGNUP_AGE_BANDS.find((b) => b.id === id) ?? null;
}

/** The level behind a stored id, or null for anything unrecognised. */
export function getSignupLevel(id: string | null | undefined): SignupLevel | null {
  if (!id) return null;
  return SIGNUP_LEVELS.find((l) => l.id === id) ?? null;
}
