import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export type AdminRequestResult =
  | { ok: true; uid: string }
  | { ok: false; error: string; status: 401 | 403 };

/**
 * Verifies that an API request carries a valid Firebase ID token belonging to
 * an admin user. The same check /api/admin/chat does inline, extracted so
 * every admin route performs it identically.
 *
 * Callers send the token as `Authorization: Bearer <idToken>`, obtained
 * client-side from `auth.currentUser.getIdToken()`.
 */
export async function verifyAdminRequest(request: NextRequest): Promise<AdminRequestResult> {
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
  if (userDoc.data()?.role !== 'admin') {
    return { ok: false, error: 'Forbidden - Admin access required', status: 403 };
  }

  return { ok: true, uid };
}
