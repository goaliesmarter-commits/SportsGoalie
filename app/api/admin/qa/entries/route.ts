import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/auth/admin-request';
import { logger } from '@/lib/utils/logger';

/**
 * Admin: the answer library.
 *
 *   GET  /api/admin/qa/entries — list every entry, newest first
 *   POST /api/admin/qa/entries — create one
 *
 * All access is server-side through firebase-admin; the browser never touches
 * the qaEntries collection directly.
 */

const createSchema = z.object({
  question: z.string().trim().min(3).max(500),
  answer: z.string().trim().min(1).max(10000),
  status: z.enum(['published', 'draft']),
});

function toIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const snapshot = await adminDb.collection('qaEntries').orderBy('createdAt', 'desc').limit(500).get();
    const entries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        question: data.question ?? '',
        answer: data.answer ?? '',
        status: data.status ?? 'draft',
        source: data.source ?? 'manual',
        timesServed: data.timesServed ?? 0,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
    return NextResponse.json({ success: true, entries });
  } catch (error) {
    logger.error('Failed to list QA entries', 'QA-Admin-API', { error });
    return NextResponse.json({ success: false, error: 'Failed to load entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid entry' },
      { status: 400 }
    );
  }

  try {
    const docRef = await adminDb.collection('qaEntries').add({
      ...parsed.data,
      source: 'manual',
      timesServed: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    logger.error('Failed to create QA entry', 'QA-Admin-API', { error });
    return NextResponse.json({ success: false, error: 'Failed to create entry' }, { status: 500 });
  }
}
