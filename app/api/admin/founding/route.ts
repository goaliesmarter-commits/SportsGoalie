import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/auth/admin-request';
import { logger } from '@/lib/utils/logger';
import type { FoundingSignup } from '@/types/founding';

/**
 * Admin: founding-member sign-ups.
 *
 *   GET /api/admin/founding — list every sign-up, newest first
 */

function toIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const snapshot = await adminDb.collection('foundingSignups').orderBy('createdAt', 'desc').limit(500).get();
    const signups: FoundingSignup[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name ?? '',
        email: data.email ?? '',
        goalieName: data.goalieName ?? '',
        phone: data.phone,
        note: data.note,
        status: data.status ?? 'awaiting_payment',
        confirmationEmailSent: data.confirmationEmailSent === true,
        createdAt: toIso(data.createdAt),
        paidAt: data.paidAt instanceof Timestamp ? data.paidAt.toDate().toISOString() : undefined,
      };
    });
    return NextResponse.json({ success: true, signups });
  } catch (error) {
    logger.error('Failed to list founding sign-ups', 'Founding-Admin-API', { error });
    return NextResponse.json({ success: false, error: 'Failed to load sign-ups' }, { status: 500 });
  }
}
