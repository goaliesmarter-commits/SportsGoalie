/**
 * Application by questionnaire — Michael's front door.
 *
 * THE SHAPE OF THIS, AND WHY IT IS NOT A SEPARATE COLLECTION:
 * Michael's instruction was that the applicant's questionnaire *becomes* their
 * baseline — "they never fill it in twice, their record starts the day they
 * applied, not the day they paid". So an applicant is not a row in an
 * `applications` table waiting to be copied into a real account later. They are
 * a real account from the first minute, carrying `applicationStatus`, walled
 * off from the content until Michael approves them. Approval flips the field;
 * nothing is migrated, because there is nothing to migrate.
 *
 * The consequence to keep in mind: a user document with NO `applicationStatus`
 * at all is an ordinary member. Every account created before this existed is in
 * that state, so the wall must never fire on an absent value.
 */

/**
 * Where an applicant stands.
 *
 * `applying`   — account exists, questionnaire not yet submitted. They are mid-flow.
 * `submitted`  — questionnaire in. This is Michael's queue.
 * `waitlisted` — a real answer, not a soft no. Michael parks them and can come back.
 * `approved`   — the wall is down and the approval email carries the booking link.
 * `declined`   — answered, and the account stays walled.
 */
export type ApplicationStatus =
  | 'applying'
  | 'submitted'
  | 'waitlisted'
  | 'approved'
  | 'declined';

/** The three decisions Michael can take from the admin screen. */
export type ApplicationDecision = 'approve' | 'waitlist' | 'decline';

/**
 * An applicant as the admin list shows them: the account, plus the headline
 * numbers from the baseline profile so Michael can triage without opening
 * anything. The full answers sit behind the review screen (item 3).
 */
export interface ApplicantSummary {
  id: string;
  email: string;
  displayName: string;
  applicationStatus: ApplicationStatus;
  /** ISO — serialized by the admin API, as with founding sign-ups. */
  appliedAt?: string;
  submittedAt?: string;
  decidedAt?: string;
  decidedByName?: string;
  /** Michael's own note against the decision. His words, not the system's. */
  decisionNote?: string;

  /** True once the baseline questionnaire has been completed and scored. */
  hasProfile: boolean;
  overallScore?: number;
  pacingLevel?: string;
  driverOrPassenger?: string;
  /** The four sign-up intake answers, when the applicant got that far. */
  ageRange?: string;
  experienceLevel?: string;

  /** Filled in at approval — the coach and track Michael chose. */
  assignedCoachId?: string;
  assignedCoachName?: string;
  tier?: 'automated' | 'custom';
}

/** What the admin screen sends when Michael acts on an applicant. */
export interface ApplicationDecisionPayload {
  decision: ApplicationDecision;
  /** Approve only: the coach and track that get written onto the account. */
  assignedCoachId?: string;
  assignedCoachName?: string;
  tier?: 'automated' | 'custom';
  note?: string;
}

/** Statuses that keep the content wall up. Anything not `approved`, in practice. */
export const WALLED_APPLICATION_STATUSES: ApplicationStatus[] = [
  'applying',
  'submitted',
  'waitlisted',
  'declined',
];

/**
 * The wall test, in one place so the guard, the admin screen and any future
 * caller cannot drift apart on what "still an applicant" means.
 */
export function isWalledApplicant(status: ApplicationStatus | undefined | null): boolean {
  if (!status) return false; // No field at all = an ordinary member. Never wall these.
  return status !== 'approved';
}
