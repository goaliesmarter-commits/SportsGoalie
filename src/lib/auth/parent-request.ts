import { NextRequest } from 'next/server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';

export type ParentRequestResult =
  | { ok: true; uid: string; displayName: string; email: string }
  | { ok: false; error: string; status: 401 | 403 };

/**
 * Verifies that a request carries a valid Firebase ID token belonging to a
 * parent account. The parent counterpart of `verifyAdminRequest`.
 *
 * It returns the parent's name and email as well as their id, because the
 * routes that use it stamp those onto a consent record. Reading them here,
 * from the server's own copy of the user document, means the browser never
 * gets to say who is consenting — which is the one detail of a consent record
 * that must not be taken on trust from the client.
 *
 * Callers send the token as `Authorization: Bearer <idToken>`, obtained
 * client-side from `auth.currentUser.getIdToken()`.
 */
export async function verifyParentRequest(request: NextRequest): Promise<ParentRequestResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, error: 'Unauthorized - No valid token provided', status: 401 };
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    uid = decoded.uid;
  } catch {
    return { ok: false, error: 'Unauthorized - Invalid token', status: 401 };
  }

  const userDoc = await adminDb.collection('users').doc(uid).get();
  const data = userDoc.data();

  if (!data || data.role !== 'parent') {
    return { ok: false, error: 'Forbidden - Parent access required', status: 403 };
  }

  // A paused account keeps every part of its record but cannot act. Creating a
  // login is acting.
  if (data.isPaused === true) {
    return { ok: false, error: 'Forbidden - This account is paused', status: 403 };
  }

  return {
    ok: true,
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    email: typeof data.email === 'string' ? data.email : '',
  };
}
