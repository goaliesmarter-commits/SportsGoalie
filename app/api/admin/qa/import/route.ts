import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/auth/admin-request';
import { logger } from '@/lib/utils/logger';
import { QA_LIBRARY_SEED } from '@/data/qa-library';

/**
 * Admin: import Michael's question index.
 *
 *   POST /api/admin/qa/import
 *
 * Safe to run more than once. Documents are keyed by his row id (`QA-001`), so
 * a second run updates the same 137 documents rather than creating a second
 * copy of the library.
 *
 * Two decisions worth knowing about before reading the code.
 *
 * **A re-import never changes a status.** If Michael publishes a draft in the
 * admin screen and the sheet still says DRAFT, re-importing leaves it published.
 * His live decisions outrank a file he sent in September. The response reports
 * how many rows diverge that way so the difference is visible rather than
 * silent, and he can change them in the screen he changed them in.
 *
 * **Nothing is ever deleted.** The library already held around forty answers
 * before this import and some of them cover the same ground as his sheet. Those
 * are reported as possible duplicates for a human to look at. Deleting an
 * answer because its wording resembled another one is not a decision this route
 * gets to make.
 */

/** Loose enough to catch the same question typed twice, strict enough not to guess. */
function normaliseQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const collection = adminDb.collection('qaEntries');
    const existing = await collection.get();

    const existingById = new Map(existing.docs.map(doc => [doc.id, doc.data()]));

    let created = 0;
    let updated = 0;
    let statusDivergences = 0;

    // 137 writes is comfortably inside Firestore's 500-operation batch limit,
    // so this commits as one atomic unit — a half-imported library is not a
    // state anyone should have to reason about.
    const batch = adminDb.batch();

    for (const entry of QA_LIBRARY_SEED) {
      const previous = existingById.get(entry.id);

      const fields: Record<string, unknown> = {
        question: entry.question,
        answer: entry.answer,
        category: entry.category,
        keywords: entry.keywords,
        source: 'import',
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (previous) {
        if (previous.status !== entry.status) statusDivergences += 1;
        updated += 1;
      } else {
        fields.status = entry.status;
        fields.timesServed = 0;
        fields.createdAt = FieldValue.serverTimestamp();
        created += 1;
      }

      batch.set(collection.doc(entry.id), fields, { merge: true });
    }

    await batch.commit();

    // Anything not carrying one of his row ids predates the import. Flag the
    // ones asking the same question; leave the rest alone.
    const importedQuestions = new Map(
      QA_LIBRARY_SEED.map(entry => [normaliseQuestion(entry.question), entry.id])
    );
    const possibleDuplicates = existing.docs
      .filter(doc => !/^QA-\d{3}$/.test(doc.id))
      .map(doc => ({
        id: doc.id,
        question: (doc.data().question as string) ?? '',
        duplicateOf: importedQuestions.get(normaliseQuestion((doc.data().question as string) ?? '')),
      }))
      .filter(row => row.duplicateOf !== undefined);

    logger.info('QA library imported', 'QA-Admin-API', {
      created,
      updated,
      statusDivergences,
      possibleDuplicates: possibleDuplicates.length,
    });

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: QA_LIBRARY_SEED.length,
      statusDivergences,
      possibleDuplicates,
    });
  } catch (error) {
    logger.error('QA library import failed', 'QA-Admin-API', { error });
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
