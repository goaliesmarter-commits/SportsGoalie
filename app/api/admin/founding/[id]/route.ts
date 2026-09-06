import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/auth/admin-request';
import { logger } from '@/lib/utils/logger';

/**
 * Admin: acting on one founding-member sign-up.
 *
 *   PATCH /api/admin/founding/:id
 *     { action: 'mark_paid' }   — the e-transfer (or cheque) cleared
 *     { action: 'mark_unpaid' } — undo a misclick, or restore an archived row
 *     { action: 'archive' }     — junk/duplicate; hidden from the working list
 *
 * Reconciliation is deliberately manual — Michael matches the goalie's name
 * in the transfer message to the record and clicks. Marking paid records
 * paidAt; nothing here touches user accounts (account opening stays on the
 * invitation flow).
 */

const actionSchema = z.object({
  action: z.enum(['mark_paid', 'mark_unpaid', 'archive']),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = await params;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid action' },
      { status: 400 }
    );
  }

  try {
    const signupRef = adminDb.collection('foundingSignups').doc(id);
    const snapshot = await signupRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ success: false, error: 'Sign-up not found' }, { status: 404 });
    }

    switch (parsed.data.action) {
      case 'mark_paid':
        await signupRef.update({
          status: 'paid',
          paidAt: FieldValue.serverTimestamp(),
          paidBy: auth.uid,
        });
        break;
      case 'mark_unpaid':
        await signupRef.update({
          status: 'awaiting_payment',
          paidAt: FieldValue.delete(),
          paidBy: FieldValue.delete(),
        });
        break;
      case 'archive':
        await signupRef.update({ status: 'archived' });
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to act on founding sign-up', 'Founding-Admin-API', { id, error });
    return NextResponse.json({ success: false, error: 'Failed to update sign-up' }, { status: 500 });
  }
}
