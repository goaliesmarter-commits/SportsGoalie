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
