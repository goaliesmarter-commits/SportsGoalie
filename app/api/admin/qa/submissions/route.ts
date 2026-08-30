import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/auth/admin-request';
import { logger } from '@/lib/utils/logger';

/**
 * Admin: the visitor-question queue.
 *
 *   GET /api/admin/qa/submissions — list every submission, newest first
 */

function toIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const snapshot = await adminDb.collection('qaSubmissions').orderBy('createdAt', 'desc').limit(500).get();
    const submissions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        question: data.question ?? '',
        email: data.email ?? '',
        status: data.status ?? 'new',
        createdAt: toIso(data.createdAt),
        answeredAt: data.answeredAt instanceof Timestamp ? data.answeredAt.toDate().toISOString() : undefined,
        publishedEntryId: data.publishedEntryId,
      };
    });
    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    logger.error('Failed to list QA submissions', 'QA-Admin-API', { error });
    return NextResponse.json({ success: false, error: 'Failed to load submissions' }, { status: 500 });
  }
}
