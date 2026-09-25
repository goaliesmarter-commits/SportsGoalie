/**
 * Question index — types.
 *
 * The question index is a public question box backed by a library of answers
 * Michael has written himself. The one promise the whole feature is built
 * around: the system never writes an answer. It either serves one of his
 * answers word for word, or admits it has none and captures the question.
 *
 * Storage (all server-side via firebase-admin — there are no Firestore rules
 * for these collections and none are needed, because the client never touches
 * them directly):
 *
 *   qaEntries      — the answer library. One doc per canonical question.
 *   qaSubmissions  — the queue of unmatched visitor questions.
 *   qaUsage        — one doc per day, counting AI matching calls, so a public
 *                    box can be capped before it can cost real money.
 */

/**
 * Michael's eight categories, in his order and his wording.
 *
 * These replace the pillar-keyed categories the library was originally seeded
 * with rather than merging with them — his 8 September sheet is the single
 * scheme now. The letter prefix is part of the name because it is how he
 * refers to the rows ("A7", "G24"), and dropping it would break that shared
 * reference.
 */
export const QA_CATEGORIES = [
  'A cold questions',
  'B page-triggered terms',
  'C the parent',
  'D on-ice problems',
  'E practical and commercial',
  'F mind body and situation',
  "G the visitor's questions",
  'H the pillar groups',
] as const;

export type QACategory = (typeof QA_CATEGORIES)[number];

export function isQACategory(value: unknown): value is QACategory {
  return typeof value === 'string' && (QA_CATEGORIES as readonly string[]).includes(value);
}

export type QAEntryStatus = 'published' | 'draft';

/** One canonical question with Michael's verbatim answer. */
export interface QAEntry {
  id: string;
  /** The question as Michael writes it — shown back to the visitor on a match. */
  question: string;
  /** Michael's answer, served word for word. Never generated, never edited by the system. */
  answer: string;
  /** Only 'published' entries are matchable from the public box. */
  status: QAEntryStatus;
  /**
   * Null for the entries that predate the September import and for anything
   * published out of the visitor queue, which arrives without one. The admin
   * screen surfaces those as "Uncategorised" so they can be filed rather than
   * quietly disappearing from a filtered view.
   */
  category: QACategory | null;
  /** Michael's search terms for this row. Used to widen matching, never shown. */
  keywords: string[];
  /**
   * Where the entry came from: written directly in the library, or published
   * out of the visitor-question queue.
   */
  source: 'manual' | 'visitor-question';
  /** How many times this answer has been served to a visitor. */
  timesServed: number;
  createdAt: string; // ISO — serialized server-side before crossing to the client
  updatedAt: string; // ISO
}

export type QASubmissionStatus = 'new' | 'answered' | 'dismissed';

/** A visitor question no stored answer matched, waiting in Michael's queue. */
export interface QASubmission {
  id: string;
  question: string;
  /** Where the answer gets sent when Michael writes it. */
  email: string;
  status: QASubmissionStatus;
  createdAt: string; // ISO
  answeredAt?: string; // ISO
  /** The library entry Michael's reply was published as. */
  publishedEntryId?: string;
}

/* ── Public API payloads ── */

/** POST /api/qa/ask */
export interface QAAskResponse {
  success: boolean;
  /** True when a stored answer matched. */
  matched: boolean;
  /** Present only when matched — both verbatim from the library. */
  question?: string;
  answer?: string;
  error?: string;
}

/** POST /api/qa/submit */
export interface QASubmitResponse {
  success: boolean;
  error?: string;
}
