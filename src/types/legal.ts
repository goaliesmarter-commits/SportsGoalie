/**
 * Legal document types — Terms of Service and Privacy Policy.
 *
 * Created 27 August 2026 for Block 1. Two things are deliberate here:
 *
 * 1. Content lives in data files (`src/data/legal/*`), never in components.
 *    Michael supplies the wording; dropping it in must not require touching
 *    a single .tsx file.
 *
 * 2. Every document carries a `version`, and that version is stamped onto the
 *    user record at the moment they accept. Recording *that they agreed* is
 *    close to worthless on its own — what matters if it is ever questioned is
 *    which wording they agreed to, and when. The agreements gate later in
 *    Block 1 reuses this same shape per sector.
 */

export type LegalDocumentId = 'terms' | 'privacy';

export interface LegalSection {
  /** Stable anchor id — survives reordering and section renames. */
  id: string;
  heading: string;
  /**
   * Paragraphs of the section. An empty array means the wording has not been
   * supplied yet, which is what puts the whole document into draft state.
   */
  body: string[];
  /**
   * A note to whoever writes this section. NEVER rendered to visitors — it
   * exists so the author's checklist can be generated from this file rather
   * than maintained separately alongside it.
   */
  brief?: string;
}

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  /** Short line under the title. Safe to show while the document is a draft. */
  subtitle: string;
  /**
   * Stamped onto the user record on acceptance. Bump this whenever the wording
   * changes in a way a user would care about — that is the signal a future
   * re-acceptance prompt compares against.
   */
  version: string;
  /**
   * ISO date the document comes into force, or null while it is still a draft.
   * This single field decides whether the page renders as a real document or
   * as a not-yet-in-force outline. Nothing else needs changing to flip it.
   */
  effectiveDate: string | null;
  intro: string[];
  sections: LegalSection[];
}

/** True once the wording exists and a date has been set. */
export function isInForce(doc: LegalDocument): boolean {
  return doc.effectiveDate !== null && doc.sections.some(s => s.body.length > 0);
}

/**
 * What gets written to the user document at registration.
 *
 * Stored as a nested object rather than four loose fields so the whole record
 * can be read, displayed in the admin acceptance register, and extended with
 * further sector agreements without reshaping the user document each time.
 */
export interface LegalAcceptance {
  termsVersion: string;
  privacyVersion: string;
  /** Date object on write; a Firestore Timestamp when read back. */
  acceptedAt: Date | import('firebase/firestore').Timestamp;
}
