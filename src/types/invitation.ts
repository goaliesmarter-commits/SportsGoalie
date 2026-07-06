export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type InvitableRole = 'student' | 'coach' | 'goalie_coach' | 'parent' | 'admin';

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
}
