export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type InvitableRole = 'student' | 'coach' | 'goalie_coach' | 'parent' | 'admin';

// Machine-readable reason for a failed validation — lets the UI distinguish
// "you already finished signing up" (should point to login) from a genuinely
// broken/expired link, without string-matching the human-readable `error` text.
export type InvitationValidationReason =
  | 'not_found'
  | 'already_accepted'
  | 'revoked'
  | 'expired'
  | 'unknown';

export interface Invitation {
  id: string;
  email: string;
  token: string;
  role: InvitableRole;
  status: InvitationStatus;
  invitedBy: string;
  invitedByName: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  acceptedUserId?: string;
  metadata: {
    firstName?: string;
    lastName?: string;
    // Goalie-specific
    assignedCoachId?: string;
    assignedCoachName?: string;
    tier?: 'automated' | 'custom';
    // Coach-specific
    organizationName?: string;
    // Parent-specific
    linkedGoalieId?: string;
    // General
    customMessage?: string;
  };
}

export interface CreateInvitationData {
  email: string;
  role: InvitableRole;
  invitedBy: string;
  invitedByName: string;
  expiresInDays?: number;
  metadata?: Invitation['metadata'];
}

export interface ValidateInvitationResult {
  valid: boolean;
  invitation?: Invitation;
  error?: string;
  reason?: InvitationValidationReason;
}
