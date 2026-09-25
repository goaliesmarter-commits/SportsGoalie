/**
 * Michael's question index, as sent on 8 September (`SG_QUESTION_INDEX_FOR_
 * IMPORT_20260908_v2.xlsx`) and converted to JSON for import.
 *
 * Why this lives in the repo rather than behind an upload screen: the sheet is
 * the source of truth for what the library should contain, and keeping it in
 * git means a re-import is reproducible and a change to his wording shows up in
 * a diff. Regenerating it when he sends a revision is a mechanical job.
 *
 * What the conversion applied, all of it read off his own `status` column:
 *
 *   FINAL            → imported as `published`   (10 rows)
 *   DRAFT            → imported as `draft`       (127 rows)
 *   COACH TO SUPPLY  → not exported at all       (2 rows)
 *
 * The two excluded rows are QA-071 ("How do I stop the negative voice in my
 * head?") and QA-101 ("Is that really your voice, or a computer?"). Both carry
 * bracketed instructions to Michael in place of an answer rather than an answer,
 * so loading either — even as a draft — would put staging notes one careless
 * publish away from the public box.
 *
 * The `QA-nnn` ids are his, not ours. They are the row numbers from the sheet
 * and they are also the filenames in his voice manifest, so using them as the
 * Firestore document ids keeps the two halves aligned if the recordings are
 * ever wired up.
 *
 * The four version rules from his 8 September email are deliberately not
 * implemented. They resolved which of two drafts each row should use, and the
 * sheet has one answer column holding the settled text — there is no longer a
 * choice to make.
 */

import { z } from 'zod';

import { QA_CATEGORIES, type QAEntryStatus, type QACategory } from '@/types/qa';

import rawLibrary from './qa-library.json';

/** One row of the sheet, after conversion. */
export interface QALibrarySeedEntry {
  /** His row id, e.g. 'QA-001'. Becomes the Firestore document id. */
  id: string;
  question: string;
  answer: string;
  category: QACategory;
  keywords: string[];
  status: QAEntryStatus;
}

const seedEntrySchema = z.object({
  id: z.string().regex(/^QA-\d{3}$/, 'Ids must look like QA-001'),
  question: z.string().trim().min(3).max(500),
  answer: z.string().trim().min(1).max(10000),
  category: z.enum(QA_CATEGORIES),
  keywords: z.array(z.string().trim().min(1)),
  status: z.enum(['published', 'draft']),
});

/**
 * Parsed at module load rather than per-request.
 *
 * A malformed seed is a build-time mistake — a bad regeneration, a stray edit —
 * and it should fail loudly the first time the module is touched rather than
 * halfway through writing 137 documents to Firestore.
 */
export const QA_LIBRARY_SEED: QALibrarySeedEntry[] = z
  .array(seedEntrySchema)
  .parse(rawLibrary);
