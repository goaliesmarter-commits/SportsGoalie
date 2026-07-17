/**
 * Coach Invitation Service
 *
 * Handles creation, validation, and management of coach invitations.
 * Provides secure token generation and expiry management.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  CoachInvitation,
  CreateInvitationData,
  InvitationStatus,
} from '@/types/auth';
import type { InvitationValidationReason } from '@/types/invitation';
import { logInfo, logDebug, logError } from '@/lib/errors/error-logger';

/**
 * Generate a secure random token for invitations
 * Format: 32-character alphanumeric string
 */
function generateInvitationToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const tokenLength = 32;
  let token = '';

  // Use crypto for secure randomness
  const crypto = typeof window !== 'undefined' ? window.crypto : global.crypto;
  const randomValues = new Uint32Array(tokenLength);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < tokenLength; i++) {
    token += chars[randomValues[i] % chars.length];
  }

  return token;
}

/**
 * Calculate expiration date
 */
function calculateExpiryDate(days: number = 7): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/**
 * Remove undefined values from object (Firestore doesn't allow undefined)
 */
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

/**
 * Check if invitation is expired
 */
function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Coach Invitation Service Interface
 */
export interface ICoachInvitationService {
  createInvitation(data: CreateInvitationData): Promise<CoachInvitation>;
  getInvitation(invitationId: string): Promise<CoachInvitation | null>;
  getInvitationByToken(token: string): Promise<CoachInvitation | null>;
  getInvitationsByEmail(email: string): Promise<CoachInvitation[]>;
  getAllInvitations(): Promise<CoachInvitation[]>;
  getPendingInvitations(): Promise<CoachInvitation[]>;
  validateInvitation(token: string): Promise<{ valid: boolean; invitation?: CoachInvitation; error?: string; reason?: InvitationValidationReason }>;
  acceptInvitation(invitationId: string, userId: string): Promise<void>;
  revokeInvitation(invitationId: string, revokedBy: string): Promise<void>;
  resendInvitation(invitationId: string): Promise<CoachInvitation>;
  checkExistingInvitation(email: string): Promise<CoachInvitation | null>;
}

/**
 * Coach Invitation Service Implementation
 */
export class CoachInvitationService implements ICoachInvitationService {
  private static instance: CoachInvitationService;
  private readonly collectionName = 'coach_invitations';

  private constructor() {}

  public static getInstance(): CoachInvitationService {
    if (!CoachInvitationService.instance) {
      CoachInvitationService.instance = new CoachInvitationService();
    }
    return CoachInvitationService.instance;
  }

  /**
   * Create a new coach invitation
   */
  public async createInvitation(data: CreateInvitationData): Promise<CoachInvitation> {
    try {
      logDebug('Creating coach invitation', { email: data.email });

      // Check for existing pending invitation
      const existing = await this.checkExistingInvitation(data.email);
      if (existing) {
        throw new Error(`An active invitation already exists for ${data.email}`);
      }

      // Generate unique token
      const token = generateInvitationToken();
      const invitationRef = doc(collection(db, this.collectionName));
      const now = new Date();
      const expiresAt = calculateExpiryDate(data.expiresInDays || 7);

      const invitation: CoachInvitation = {
        id: invitationRef.id,
        email: data.email.toLowerCase().trim(),
        token,
        status: 'pending',
        invitedBy: data.invitedBy,
        invitedByName: data.invitedByName,
        createdAt: now,
        expiresAt,
        metadata: data.metadata,
      };

      // Prepare data for Firestore (remove undefined values)
      const firestoreData: any = {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        status: invitation.status,
        invitedBy: invitation.invitedBy,
        invitedByName: invitation.invitedByName,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
      };

      // Only add metadata if it exists and has values
      if (data.metadata) {
        const cleanedMetadata = removeUndefined(data.metadata);
        if (Object.keys(cleanedMetadata).length > 0) {
          firestoreData.metadata = cleanedMetadata;
        }
      }

      await setDoc(invitationRef, firestoreData);

      logInfo('Coach invitation created', { invitationId: invitation.id, email: invitation.email });

      return invitation;
    } catch (error) {
      logError('Failed to create coach invitation', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get invitation by ID
   */
  public async getInvitation(invitationId: string): Promise<CoachInvitation | null> {
    try {
      const invitationDoc = await getDoc(doc(db, this.collectionName, invitationId));

      if (!invitationDoc.exists()) {
        return null;
      }

      return this.convertToInvitation(invitationDoc.data());
    } catch (error) {
      logError('Failed to get invitation', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get invitation by token
   */
  public async getInvitationByToken(token: string): Promise<CoachInvitation | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('token', '==', token)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return this.convertToInvitation(snapshot.docs[0].data());
    } catch (error) {
      logError('Failed to get invitation by token', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get all invitations for a specific email
   */
  public async getInvitationsByEmail(email: string): Promise<CoachInvitation[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('email', '==', email.toLowerCase().trim()),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.convertToInvitation(doc.data()));
    } catch (error) {
      logError('Failed to get invitations by email', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get all invitations (admin only)
   */
  public async getAllInvitations(): Promise<CoachInvitation[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.convertToInvitation(doc.data()));
    } catch (error) {
      logError('Failed to get all invitations', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Get all pending invitations (admin only)
   */
  public async getPendingInvitations(): Promise<CoachInvitation[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const invitations = snapshot.docs.map(doc => this.convertToInvitation(doc.data()));

      // Filter out expired invitations and update their status
      const validInvitations: CoachInvitation[] = [];

      for (const invitation of invitations) {
        if (isExpired(invitation.expiresAt)) {
          // Update status to expired
          await this.updateStatus(invitation.id, 'expired');
          invitation.status = 'expired';
        }
        validInvitations.push(invitation);
      }

      return validInvitations;
    } catch (error) {
      logError('Failed to get pending invitations', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Validate invitation token
   */
  public async validateInvitation(
    token: string
  ): Promise<{ valid: boolean; invitation?: CoachInvitation; error?: string; reason?: InvitationValidationReason }> {
    try {
      const invitation = await this.getInvitationByToken(token);

      if (!invitation) {
        return { valid: false, error: 'Invalid invitation token', reason: 'not_found' };
      }

      if (invitation.status === 'accepted') {
        return { valid: false, error: 'This invitation has already been accepted', reason: 'already_accepted' };
      }

      if (invitation.status === 'revoked') {
        return { valid: false, error: 'This invitation has been revoked', reason: 'revoked' };
      }

      if (isExpired(invitation.expiresAt)) {
        // Update status to expired
        await this.updateStatus(invitation.id, 'expired');
        return { valid: false, error: 'This invitation has expired', reason: 'expired' };
      }

      return { valid: true, invitation };
    } catch (error) {
      logError('Failed to validate invitation', error instanceof Error ? error : undefined, { error: String(error) });
      return { valid: false, error: 'Failed to validate invitation', reason: 'unknown' };
    }
  }

  /**
   * Accept an invitation
   */
  public async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      logDebug('Accepting invitation', { invitationId, userId });

      await updateDoc(doc(db, this.collectionName, invitationId), {
        status: 'accepted',
        acceptedAt: Timestamp.fromDate(new Date()),
        acceptedUserId: userId,
      });

      logInfo('Invitation accepted', { invitationId, userId });
    } catch (error) {
      logError('Failed to accept invitation', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Revoke an invitation
   */
  public async revokeInvitation(invitationId: string, revokedBy: string): Promise<void> {
    try {
      logDebug('Revoking invitation', { invitationId, revokedBy });

      await updateDoc(doc(db, this.collectionName, invitationId), {
        status: 'revoked',
        revokedAt: Timestamp.fromDate(new Date()),
        revokedBy,
      });

      logInfo('Invitation revoked', { invitationId, revokedBy });
    } catch (error) {
      logError('Failed to revoke invitation', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Resend an invitation (generates new token and extends expiry)
   */
  public async resendInvitation(invitationId: string): Promise<CoachInvitation> {
    try {
      logDebug('Resending invitation', { invitationId });

      const newToken = generateInvitationToken();
      const newExpiry = calculateExpiryDate(7);

      await updateDoc(doc(db, this.collectionName, invitationId), {
        token: newToken,
        expiresAt: Timestamp.fromDate(newExpiry),
        status: 'pending',
      });

      const invitation = await this.getInvitation(invitationId);
      if (!invitation) {
        throw new Error('Invitation not found after resend');
      }

      logInfo('Invitation resent', { invitationId });

      return invitation;
    } catch (error) {
      logError('Failed to resend invitation', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Check if there's an existing pending invitation for email
   */
  public async checkExistingInvitation(email: string): Promise<CoachInvitation | null> {
    try {
      const invitations = await this.getInvitationsByEmail(email);

      // Find any pending non-expired invitation
      for (const invitation of invitations) {
        if (invitation.status === 'pending' && !isExpired(invitation.expiresAt)) {
          return invitation;
        }
      }

      return null;
    } catch (error) {
      logError('Failed to check existing invitation', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Update invitation status
   */
  private async updateStatus(invitationId: string, status: InvitationStatus): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, invitationId), { status });
    } catch (error) {
      logError('Failed to update invitation status', error instanceof Error ? error : undefined, { error: String(error) });
      throw error;
    }
  }

  /**
   * Convert Firestore data to CoachInvitation
   */
  private convertToInvitation(data: any): CoachInvitation {
    return {
      id: data.id,
      email: data.email,
      token: data.token,
      status: data.status,
      invitedBy: data.invitedBy,
      invitedByName: data.invitedByName,
      createdAt: data.createdAt?.toDate() || new Date(),
      expiresAt: data.expiresAt?.toDate() || new Date(),
      acceptedAt: data.acceptedAt?.toDate(),
      revokedAt: data.revokedAt?.toDate(),
      revokedBy: data.revokedBy,
      acceptedUserId: data.acceptedUserId,
      metadata: data.metadata,
    };
  }
}

// Export singleton instance
export const coachInvitationService = CoachInvitationService.getInstance();
