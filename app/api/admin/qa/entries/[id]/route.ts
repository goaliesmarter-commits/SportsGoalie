import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/auth/admin-request';
import { logger } from '@/lib/utils/logger';

/**
 * Admin: one library entry.
 *
 *   PATCH  /api/admin/qa/entries/:id — edit question, answer, or status
 *   DELETE /api/admin/qa/entries/:id — remove it permanently
 */

const updateSchema = z
  .object({
    question: z.string().trim().min(3).max(500).optional(),
    answer: z.string().trim().min(1).max(10000).optional(),
    status: z.enum(['published', 'draft']).optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'Nothing to update' });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid update' },
      { status: 400 }
    );
  }

  try {
    const ref = adminDb.collection('qaEntries').doc(id);
    if (!(await ref.get()).exists) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }
    await ref.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to update QA entry', 'QA-Admin-API', { id, error });
    return NextResponse.json({ success: false, error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = await params;

  try {
    await adminDb.collection('qaEntries').doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete QA entry', 'QA-Admin-API', { id, error });
    return NextResponse.json({ success: false, error: 'Failed to delete entry' }, { status: 500 });
  }
}
