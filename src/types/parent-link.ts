import { Timestamp } from 'firebase/firestore';

/**
 * Relationship type between parent/guardian and goalie
 */
export type ParentRelationship = 'parent' | 'guardian' | 'other';

/**
 * Status of a parent-child link
 */
export type ParentLinkStatus = 'active' | 'revoked';

/**
 * How the link was created.
 *
 * 'parent_created' is the under-age path (item 6c): the parent made the
 * goalie's account, so the link existed from the account's first moment and
 * was never consented to by the goalie. Worth telling apart from a link the
 * goalie handed a code over for, because only one of the two is theirs to
 * revoke.
 */
export type LinkMethod = 'code' | 'invite' | 'parent_created';

/**
 * Parent-Child Link Document
 * Stored in the 'parentLinks' collection
 */
export interface ParentLink {
  id: string;
  parentId: string;              // Parent user ID
  childId: string;               // Goalie user ID
  linkedAt: Timestamp;
  linkedBy: LinkMethod;          // How the link was created
  status: ParentLinkStatus;
  relationship: ParentRelationship;

  // Revocation tracking
  revokedAt?: Timestamp;
  revokedBy?: string;            // User ID who revoked (parent or child)

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Data required to create a new parent link
 */
export interface CreateParentLinkData {
  parentId: string;
  childId: string;
  linkCode: string;
  relationship?: ParentRelationship;
}

/**
 * Parent link code configuration
 */
export interface ParentLinkCodeConfig {
  /** Format: XXXX-XXXX (8 alphanumeric, uppercase) */
  format: 'alphanumeric';
  /** Length in characters (excluding hyphen) */
  length: 8;
  /** Default expiration in days */
  defaultExpirationDays: 7;
}

/**
 * Parent link code stored on User document
 */
export interface ParentLinkCode {
  code: string;
  generatedAt: Timestamp;
  expiresAt?: Timestamp;
}

/**
 * Summary of a linked child for parent dashboard
 */
export interface LinkedChildSummary {
  childId: string;
  displayName: string;
  email: string;
  profileImage?: string;
  studentNumber?: string;
  linkedAt: Date;
  relationship: ParentRelationship;

  // Progress summary
  progressPercentage?: number;
  lastActiveAt?: Date;
  quizzesCompleted?: number;
  currentStreak?: number;

  // Assessment status
  hasCompletedAssessment?: boolean;
  pacingLevel?: string;
}

/**
 * Summary of a linked parent for goalie settings
 */
export interface LinkedParentSummary {
  parentId: string;
  displayName: string;
  email: string;
  profileImage?: string;
  linkedAt: Date;
  relationship: ParentRelationship;

  // Assessment status
  hasCompletedAssessment?: boolean;
}

/**
 * Cross-reference comparison data for parent dashboard
 */
export interface PerceptionComparison {
  categorySlug: string;
  categoryName: string;

  // Scores (1.0 - 4.0)
  goalieScore?: number;
  parentScore?: number;

  // Difference analysis
  scoreDifference?: number;
  alignmentLevel: 'aligned' | 'minor_gap' | 'significant_gap';

  // Display
  description?: string;
  recommendation?: string;
}

/**
 * Complete cross-reference result for parent view
 */
export interface ParentCrossReferenceView {
  childId: string;
  childName: string;

  // Assessment completion status
  goalieAssessmentComplete: boolean;
  parentAssessmentComplete: boolean;

  // Comparisons by category
  comparisons: PerceptionComparison[];

  // Summary metrics
  overallAlignmentScore: number; // 0-100
  criticalGapsCount: number;
  strengthAlignmentsCount: number;

  // Timestamps
  lastUpdated: Date;
  goalieAssessmentDate?: Date;
  parentAssessmentDate?: Date;
}

/**
 * Query options for parent links
 */
export interface ParentLinkQueryOptions {
  status?: ParentLinkStatus;
  parentId?: string;
  childId?: string;
  limit?: number;
}
