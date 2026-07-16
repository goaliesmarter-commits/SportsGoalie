/**
 * Generic Invitation Service
 *
 * Handles invite-link registration for ALL roles: student (goalie), coach,
 * goalie_coach, and parent. Uses the `invitations` Firestore collection.
 *
 * The existing `coach_invitations` collection and CoachInvitationService remain
 * untouched for backward compatibility.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Invitation,
  CreateInvitationData,
  InvitationStatus,
  ValidateInvitationResult,
  InvitableRole,
} from '@/types/invitation';
import { logInfo, logDebug, logError } from '@/lib/errors/error-logger';

const COLLECTION = 'invitations';

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const crypto = typeof window !== 'undefined' ? window.crypto : global.crypto;
  const values = new Uint32Array(32);
  crypto.getRandomValues(values);
  return Array.from(values, v => chars[v % chars.length]).join('');
}

function expiryDate(days = 30): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function isExpired(date: Date): boolean {
  return new Date() > date;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

function toInvitation(data: Record<string, any>): Invitation {
  return {
    id: data.id,
    email: data.email,
    token: data.token,
    role: data.role as InvitableRole,
    status: data.status,
    invitedBy: data.invitedBy,
    invitedByName: data.invitedByName,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    expiresAt: data.expiresAt?.toDate?.() ?? new Date(),
    acceptedAt: data.acceptedAt?.toDate?.(),
    revokedAt: data.revokedAt?.toDate?.(),
    revokedBy: data.revokedBy,
    acceptedUserId: data.acceptedUserId,
    metadata: data.metadata ?? {},
  };
}

class InvitationService {
  private static instance: InvitationService;

  private constructor() {}

  static getInstance(): InvitationService {
    if (!InvitationService.instance) {
      InvitationService.instance = new InvitationService();
    }
    return InvitationService.instance;
  }

  async createInvitation(data: CreateInvitationData): Promise<Invitation> {
    try {
      logDebug('Creating invitation', { email: data.email, role: data.role });

      const existing = await this.checkExistingInvitation(data.email, data.role);
      if (existing) {
        throw new Error(`An active ${data.role} invitation already exists for ${data.email}`);
      }

      const token = generateToken();
      const ref = doc(collection(db, COLLECTION));
      const now = new Date();
      const expires = expiryDate(data.expiresInDays ?? 30);

      const invitation: Invitation = {
        id: ref.id,
        email: data.email.toLowerCase().trim(),
        token,
        role: data.role,
        status: 'pending',
        invitedBy: data.invitedBy,
        invitedByName: data.invitedByName,
        createdAt: now,
        expiresAt: expires,
        metadata: data.metadata ?? {},
      };

      const firestoreData: Record<string, unknown> = {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        role: invitation.role,
        status: invitation.status,
        invitedBy: invitation.invitedBy,
        invitedByName: invitation.invitedByName,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expires),
      };

      if (data.metadata && Object.keys(data.metadata).length > 0) {
        firestoreData.metadata = stripUndefined(data.metadata as Record<string, unknown>);
      }

      await setDoc(ref, firestoreData);
      logInfo('Invitation created', { id: invitation.id, email: invitation.email, role: invitation.role });
      return invitation;
    } catch (error) {
      logError('Failed to create invitation', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  async getInvitation(id: string): Promise<Invitation | null> {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      return snap.exists() ? toInvitation(snap.data()) : null;
    } catch (error) {
      logError('Failed to get invitation', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    try {
      const q = query(collection(db, COLLECTION), where('token', '==', token));
      const snap = await getDocs(q);
      return snap.empty ? null : toInvitation(snap.docs[0].data());
    } catch (error) {
      logError('Failed to get invitation by token', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async getAllInvitations(role?: InvitableRole): Promise<Invitation[]> {
    try {
      const constraints = role
        ? [where('role', '==', role), orderBy('createdAt', 'desc')]
        : [orderBy('createdAt', 'desc')];
      const q = query(collection(db, COLLECTION), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map(d => toInvitation(d.data()));
    } catch (error) {
      logError('Failed to get invitations', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async validateInvitation(token: string): Promise<ValidateInvitationResult> {
    try {
      const invitation = await this.getInvitationByToken(token);

      if (!invitation) return { valid: false, error: 'Invalid invitation link.', reason: 'not_found' };
      if (invitation.status === 'accepted') return { valid: false, error: 'This invitation has already been used.', reason: 'already_accepted' };
      if (invitation.status === 'revoked') return { valid: false, error: 'This invitation has been revoked.', reason: 'revoked' };
      if (isExpired(invitation.expiresAt)) {
        // Best-effort status update — fails silently if the user isn't authenticated yet
        this.updateStatus(invitation.id, 'expired').catch(() => {});
        return { valid: false, error: 'This invitation has expired. Ask your admin to resend it.', reason: 'expired' };
      }

      return { valid: true, invitation };
    } catch (error) {
      logError('Failed to validate invitation', error instanceof Error ? error : undefined);
      return { valid: false, error: 'Failed to validate the invitation link.', reason: 'unknown' };
    }
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTION, invitationId), {
        status: 'accepted',
        acceptedAt: Timestamp.fromDate(new Date()),
        acceptedUserId: userId,
      });
      logInfo('Invitation accepted', { invitationId, userId });
    } catch (error) {
      logError('Failed to accept invitation', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async revokeInvitation(invitationId: string, revokedBy: string): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTION, invitationId), {
        status: 'revoked',
        revokedAt: Timestamp.fromDate(new Date()),
        revokedBy,
      });
      logInfo('Invitation revoked', { invitationId, revokedBy });
    } catch (error) {
      logError('Failed to revoke invitation', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async resendInvitation(invitationId: string): Promise<Invitation> {
    try {
      const newToken = generateToken();
      const newExpiry = expiryDate(30);

      await updateDoc(doc(db, COLLECTION, invitationId), {
        token: newToken,
        expiresAt: Timestamp.fromDate(newExpiry),
        status: 'pending',
      });

      const updated = await this.getInvitation(invitationId);
      if (!updated) throw new Error('Invitation not found after resend');
      logInfo('Invitation resent', { invitationId });
      return updated;
    } catch (error) {
      logError('Failed to resend invitation', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async checkExistingInvitation(email: string, role: InvitableRole): Promise<Invitation | null> {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('email', '==', email.toLowerCase().trim()),
        where('role', '==', role),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const inv = toInvitation(d.data());
        if (!isExpired(inv.expiresAt)) return inv;
      }
      return null;
    } catch (error) {
      logError('Failed to check existing invitation', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION, invitationId));
      logInfo('Invitation deleted', { invitationId });
    } catch (error) {
      logError('Failed to delete invitation', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async deleteByAcceptedUserId(userId: string): Promise<void> {
    try {
      const q = query(collection(db, COLLECTION), where('acceptedUserId', '==', userId));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch (error) {
      logError('Failed to delete invitations for user', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  private async updateStatus(id: string, status: InvitationStatus): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), { status });
  }
}

export const invitationService = InvitationService.getInstance();
