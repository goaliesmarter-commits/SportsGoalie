import { User } from './index';
export type { User };

// Authentication state interface
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Registration credentials
export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
  role: 'student' | 'admin' | 'coach' | 'parent';
  workflowType?: 'automated' | 'custom'; // For students: learning workflow type
  coachCode?: string; // Required for custom workflow students
  firstName?: string;
  lastName?: string;
  skipEmailVerification?: boolean; // For invited coaches - email already verified via invitation link
  /**
   * True only when the flow that collected these credentials actually showed
   * the Terms and Privacy documents and required them to be accepted.
   *
   * This gates whether `legalAcceptance` is written to the user record. The
   * sign-up form sets it; the invitation flow does not, because it has no
   * tickbox — an invited coach has never been shown either document, and
   * recording an acceptance they never gave would be worse than recording
   * nothing. Closing that gap is part of the agreements gate work.
   */
  agreeToTerms?: boolean;
}

// Profile update data
export interface ProfileUpdateData {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  workflowType?: 'automated' | 'custom';
  assignedCoachId?: string;
}

// Auth error types
export interface AuthError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

// Coach invitation status
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

// Coach invitation interface
export interface CoachInvitation {
  id: string;
  email: string;
  token: string;
  status: InvitationStatus;
  invitedBy: string; // Admin user ID
  invitedByName: string; // Admin display name
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  acceptedUserId?: string; // User ID after accepting
  metadata?: {
    firstName?: string;
    lastName?: string;
    organizationName?: string;
    customMessage?: string;
  };
}

// Data to create a new invitation
export interface CreateInvitationData {
  email: string;
  invitedBy: string;
  invitedByName: string;
  expiresInDays?: number; // Default: 7 days
  metadata?: {
    firstName?: string;
    lastName?: string;
    organizationName?: string;
    customMessage?: string;
  };
}

// Data to accept an invitation
export interface AcceptInvitationData {
  token: string;
  password: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
}