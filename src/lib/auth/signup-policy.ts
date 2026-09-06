/**
 * Who may create an account, and what their age means for how.
 *
 * Two separate rules live here on purpose — they are asked together on the
 * sign-up form and answered together, so keeping them apart in two files would
 * only invite them to drift.
 *
 * 1. Whether a goalie may register themselves at all (Michael's item 6a).
 * 2. What happens when the person signing up is a child (item 6b).
 *
 * Neither rule is enforced here. This module answers questions; the sign-up
 * form and the registration schema act on the answers.
 */

/**
 * Whether the sign-up form offers "Goalie" as an account type.
 *
 * Goalies have been invitation-only since the start of the project. The account
 * type itself is complete — an invited goalie already gets a full account, a
 * coach, and a parent link code — so opening self-registration is genuinely
 * this one switch and nothing more.
 *
 * It ships OFF. Michael's governing principle from 2 September is "build it,
 * gate it, and I decide when to turn it on", and he named public
 * self-registration as one of the things that principle covers: the soft launch
 * is invitation-only and every founding goalie is hand-picked. Turning this to
 * `true` is the entire act of opening the doors — nothing else needs changing.
 */
export const GOALIE_SELF_REGISTRATION_ENABLED: boolean = false;

/**
 * Below this age a parent holds the account rather than the goalie.
 *
 * Michael's position, stated twice and unchanged: "A parent creates and holds
 * the account. The young goalie has his own login inside it. The parent
 * consents; the child does the work." The parent also receives the analytics
 * and pays, which is what makes 18 the line rather than a lower one.
 *
 * Canadian privacy guidance puts the *legal* floor lower — parental consent is
 * mandatory under 13, and 13-to-17 is treated as evolving capacity. So 18 is
 * stricter than the law requires in both directions that matter: nobody under
 * 13 can slip through, and 13-to-17 gets a consenting parent rather than an
 * assessment of whether the teenager understood the privacy policy.
 *
 * Lowering it to 13 later is a one-line change here, and nothing else moves.
 */
export const PARENT_HELD_ACCOUNT_AGE = 18;

/** Youngest age the sign-up form will accept. Below this, assume a typo. */
export const MIN_SIGNUP_AGE = 5;

/** Oldest age the sign-up form will accept. Above this, assume a typo. */
export const MAX_SIGNUP_AGE = 100;

/**
 * Age brackets kept alongside the date of birth on the account.
 *
 * The date of birth answers "how old are they"; the bracket answers "which
 * consent rules applied when this account was made", which is the question a
 * privacy request actually asks. Storing it means the answer does not have to
 * be re-derived years later against rules that may have changed since.
 */
export type AgeBracket = 'under_13' | 'teen_13_17' | 'adult_18_plus';

/**
 * Whole years elapsed, by calendar — not by dividing days, which drifts a day
 * every leap year and can report someone as 18 on the day before their
 * birthday.
 *
 * `now` is injectable so the age logic can be tested without waiting a year.
 */
export function calculateAge(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();
  // Birthday has not come round yet this year.
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

/** Which consent bracket an age falls in. Independent of PARENT_HELD_ACCOUNT_AGE. */
export function getAgeBracket(age: number): AgeBracket {
  if (age < 13) return 'under_13';
  if (age < 18) return 'teen_13_17';
  return 'adult_18_plus';
}

/**
 * Whether this goalie needs a parent to hold their account.
 *
 * True is not a rejection. It means the sign-up form sends them to the parent
 * path instead of creating a goalie account directly.
 */
export function requiresParentHeldAccount(dateOfBirth: Date, now: Date = new Date()): boolean {
  return calculateAge(dateOfBirth, now) < PARENT_HELD_ACCOUNT_AGE;
}

/**
 * Parses the `YYYY-MM-DD` a date input produces into a local-midnight Date.
 *
 * `new Date('2010-06-01')` parses as UTC midnight, which in any timezone west
 * of Greenwich is the evening of 31 May locally — enough to report a goalie as
 * a year younger on their birthday. Building the date from its parts keeps it
 * local, which is how the person typing it meant it.
 *
 * Returns null for anything that is not a real calendar date, including the
 * ones that look real: 2011-02-30 rolls over to 2 March unless it is caught.
 */
export function parseDateOfBirth(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}
