import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';

import { verifyParentRequest } from '@/lib/auth/parent-request';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { resetChildPasswordSchema } from '@/lib/validation/child-account';
import { logger } from '@/lib/utils/logger';

/**
 * PATCH /api/parent/goalies/[childId]/password
 *
 * Sets a new password on a goalie account the parent holds.
 *
 * This is not a convenience. A goalie who signs in with a handle has no email
 * address, so the ordinary "forgot password" route cannot reach them — without
 * this, one forgotten password would end the account permanently. Michael's
 * model already says the parent holds the account; this is what that means in
 * practice on the one day it matters.
 *
 * Deliberately narrow: only the parent named as `accountHolderId` may do it.
 * Being merely *linked* to a goalie is not enough — a goalie who signed
 * themselves up and later shared a link code with a parent still owns their own
 * password, and a link must never become a way to take an account over.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { childId } = await params;

  const auth = await verifyParentRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = resetChildPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid password' },
      { status: 400 }
    );
  }

  const childDoc = await adminDb.collection('users').doc(childId).get();
  const child = childDoc.data();

  if (!childDoc.exists || !child) {
    return NextResponse.json({ success: false, error: 'Goalie not found' }, { status: 404 });
  }

  if (child.accountHolderId !== auth.uid) {
    return NextResponse.json(
      {
        success: false,
        error: 'You can only reset the password for a goalie account you created.',
      },
      { status: 403 }
    );
  }

  try {
    await adminAuth.updateUser(childId, { password: parsed.data.password });
    await adminDb.collection('users').doc(childId).update({ updatedAt: Timestamp.now() });

    logger.info('Parent reset a goalie password', 'Parent-Goalies-API', {
      parentId: auth.uid,
      childId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to reset goalie password', 'Parent-Goalies-API', {
      childId,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Could not update the password. Please try again.' },
      { status: 500 }
    );
  }
}
