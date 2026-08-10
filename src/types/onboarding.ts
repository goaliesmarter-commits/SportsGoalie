import { Timestamp } from 'firebase/firestore';

// ==========================================
// ONBOARDING EVALUATION SYSTEM TYPES
// Michael's Phase 2 Specification Compliant
// ==========================================

/**
 * Pacing levels for content delivery
 * Per Michael's spec: Everyone starts at fundamentals, level determines pacing
 */
export type PacingLevel = 'introduction' | 'development' | 'refinement';

/**
 * Assessment level type (maps to pacing levels for display)
 */
export type AssessmentLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * User roles that have questionnaires
 */
export type QuestionnaireRole = 'goalie' | 'parent' | 'coach';

/**
 * Age range for goalies (used for PIPEDA compliance and tone adaptation)
 */
export type GoalieAgeRange = '8-10' | '11-13' | '14-16' | '17-18';

/**
 * The 7 Ice Hockey Goalie Assessment Categories
 * Based on Michael's goalie questionnaire spec
 */
export type GoalieCategorySlug =
  | 'feelings'       // Category 1: How You Feel About Being a Goalie (15%)
  | 'knowledge'      // Category 2: What You Know About Your Position (25%)
  | 'pre_game'       // Category 3: Before the Game (10%)
  | 'in_game'        // Category 4: During the Game (25%)
  | 'post_game'      // Category 5: After the Game (10%)
  | 'training'       // Category 6: Your Training and Development (10%)
  | 'learning';      // Category 7: How You Want to Learn (5%)

/**
 * The 7 Parent Assessment Categories
 * Based on Michael's parent questionnaire spec
 */
export type ParentCategorySlug =
  | 'goalie_state'     // Category 1: Your Goalie's Current State (10%)
  | 'understanding'    // Category 2: Your Understanding of the Position (30%)
  | 'pre_game'         // Category 3: Pre-Game (10%)
  | 'car_ride_home'    // Category 4: The Car Ride Home (20%)
  | 'development_role' // Category 5: Your Role in Their Development (15%)
  | 'expectations'     // Category 6: Your Expectations and Goals (10%)
  | 'preferences';     // Category 7: Communication and Preferences (5%)

/**
 * The 7 Coach Assessment Categories
 * Based on Michael's coach questionnaire spec
 */
export type CoachCategorySlug =
  | 'goalie_knowledge'   // Category 1: Your Goaltending Knowledge (30%)
  | 'current_approach'   // Category 2: Your Current Approach (25%)
  | 'pre_game'           // Category 3: Pre-Game Assessment (10%)
  | 'in_game'            // Category 4: In-Game Reading (15%)
  | 'post_game'          // Category 5: Post-Game Debrief (10%)
  | 'coaching_goals'     // Category 6: Your Coaching Goals (5%)
  | 'preferences';       // Category 7: Communication and Preferences (5%)

/**
 * Union type for all category slugs
 */
export type CategorySlug = GoalieCategorySlug | ParentCategorySlug | CoachCategorySlug;

/**
 * The 7 Ice Hockey Goalie Pillars (used for content organization)
 * Assessment uses 7 categories; pillars are for content organization
 */
export type PillarSlug =
  | 'mindset'      // Pillar 1 — MindSet
  | 'skating'      // Pillar 2 — Skating
  | 'positioning'  // Pillar 3 · 7AMS (Above the Icing Line)
  | 'seven_point'  // Pillar 3 · 6 Zone – 7 Point System™ (Below the Icing Line)
  | 'form'         // Pillar 4 — Form
  | 'game'         // Pillar 5 — Game
  | 'practice'     // Pillar 6 — Practice
  | 'lifestyle';   // Pillar 7 — Lifestyle (includes off-ice training, nutrition, recovery, sleep)

/**
 * Pillar slugs that no longer exist but are still written on stored documents.
 *
 * `training` was the combined "Game/Practice/Off-Ice" pillar, split into Game and
 * Practice on Michael's instruction (6 August 2026) with its off-ice material
 * moved into Lifestyle. Anything read back from Firestore may still carry it, so
 * it is resolved rather than rejected — see `resolvePillarSlug`.
 */
export type LegacyPillarSlug = 'training';

/** A pillar slug as it may appear on a stored document — current or retired. */
export type StoredPillarSlug = PillarSlug | LegacyPillarSlug;

const LEGACY_PILLAR_SLUGS: Record<LegacyPillarSlug, PillarSlug> = {
  // Practice is the wider of the two halves and holds the planning and repetition
  // material, so it is where an unmigrated `training` document reads most sensibly.
  training: 'practice',
};

/**
 * Resolves a slug read from storage to one that currently exists.
 * Returns null for anything unrecognised so callers can decide how to handle it.
 */
export function resolvePillarSlug(slug: string | null | undefined): PillarSlug | null {
  if (!slug) return null;
  if (slug in LEGACY_PILLAR_SLUGS) return LEGACY_PILLAR_SLUGS[slug as LegacyPillarSlug];
  return PILLARS.some(p => p.slug === slug) ? (slug as PillarSlug) : null;
}

/**
 * Types of questions in the onboarding assessment
 */
export type OnboardingQuestionType =
  | 'single_select'    // Single selection from options (Michael's standard)
  | 'multi_select'     // Multiple selections allowed
  | 'rating'           // 1-5 scale slider (legacy, convert to single_select)
  | 'multiple_choice'  // Card-based options (legacy alias for single_select)
  | 'true_false'       // True/False selection
  | 'video_scenario';  // Video + question

/**
 * Types of intake questions (simpler than assessment)
 */
export type IntakeQuestionType =
  | 'single_select'    // Single selection
  | 'multi_select';    // Multiple selections allowed

// ==========================================
// SCORING & INTELLIGENCE PROFILE TYPES
// ==========================================

/**
 * Intelligence Profile Score (1.0 - 4.0 continuous scale)
 * Per Michael's scoring principles:
 * - 1.0: Minimal awareness / Starting point
 * - 2.0: Some awareness / Building
 * - 3.0: Moderate awareness / Developing
 * - 4.0: Strong awareness / Advanced
 */
export type IntelligenceScore = number; // 1.0 to 4.0

/**
 * Pacing level thresholds (admin-configurable)
 */
export interface PacingThresholds {
  introduction: { min: number; max: number }; // Default: 1.0 - 2.2
  development: { min: number; max: number };  // Default: 2.2 - 3.1
  refinement: { min: number; max: number };   // Default: 3.1 - 4.0
}

/**
 * Category weight configuration
 */
export interface CategoryWeight {
  categorySlug: string;
  weight: number; // Percentage (0-100), all weights must sum to 100
  name: string;
  description?: string;
}

/**
 * Category score result
 */
export interface CategoryScoreResult {
  categorySlug: string;
  categoryName: string;
  rawScore: number;           // Sum of answer scores
  maxPossibleScore: number;   // Sum of max possible scores
  averageScore: IntelligenceScore; // 1.0-4.0 average
  weight: number;             // Category weight percentage
  weightedScore: number;      // averageScore * (weight/100)
  questionCount: number;
  strengths: string[];        // Questions scored > 3.5
  gaps: string[];             // Questions scored < 2.0
}

/**
 * Complete Intelligence Profile
 */
export interface IntelligenceProfile {
  userId: string;
  role: QuestionnaireRole;

  // Overall scores
  overallScore: IntelligenceScore;  // Weighted average 1.0-4.0
  pacingLevel: PacingLevel;

  // Category breakdown
  categoryScores: CategoryScoreResult[];

  // Gap and strength analysis
  identifiedGaps: GapAnalysis[];
  identifiedStrengths: StrengthAnalysis[];

  // Recommendations
  contentRecommendations: ContentRecommendation[];
  chartingEmphasis: string[];  // Areas to emphasize in charting

  // Metadata
  assessmentCompletedAt: Timestamp;
  profileGeneratedAt: Timestamp;

  // For goalies: age-related tone adjustment
  ageRange?: GoalieAgeRange;
}

/**
 * Gap analysis item
 */
export interface GapAnalysis {
  categorySlug: string;
  categoryName: string;
  score: IntelligenceScore;
  deviationFromAverage: number; // Negative number
  priority: 'high' | 'medium' | 'low';
  relatedQuestions: string[];
  suggestedContent: string[];
}

/**
 * Strength analysis item
 */
export interface StrengthAnalysis {
  categorySlug: string;
  categoryName: string;
  score: IntelligenceScore;
  deviationFromAverage: number; // Positive number
  relatedQuestions: string[];
}

/**
 * Content recommendation
 */
export interface ContentRecommendation {
  contentArea: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  suggestedModules?: string[];
}

// ==========================================
// INTAKE QUESTION TYPES
// ==========================================

/**
 * Option for intake questions with scoring
 */
export interface IntakeQuestionOption {
  id: string;
  text: string;
  score?: IntelligenceScore; // 1.0-4.0, optional for preference questions
  triggersFlow?: string;     // Special routing (e.g., 'under_13_pipeda')
}

/**
 * Intake question definition
 */
export interface IntakeQuestion {
  id: string;
  screenNumber: number;      // Which intake screen (1-4)
  questionCode: string;      // e.g., 'Q-IN-1', 'Q-IN-2'
  question: string;
  type: IntakeQuestionType;
  options: IntakeQuestionOption[];
  isRequired: boolean;
  order: number;
  tooltip?: string;          // Educational tooltip
}

/**
 * User's response to an intake question
 */
export interface IntakeResponse {
  questionId: string;
  questionCode: string;
  value: string | string[];  // Single option ID or array for multi-select
  answeredAt: Timestamp;
}

/**
 * Complete intake data for a user
 */
export interface IntakeData {
  userId: string;
  role: QuestionnaireRole;
  responses: IntakeResponse[];
  completedAt: Timestamp;

  // Extracted data for quick access
  ageRange?: GoalieAgeRange;           // For goalies
  experienceLevel?: string;
  playingLevel?: string;
  hasGoalieCoach?: boolean;
  primaryReasons?: string[];           // Why they joined
}

// ==========================================
// CROSS-REFERENCE ENGINE TYPES
// ==========================================

/**
 * Cross-reference comparison type
 */
export type CrossReferenceType =
  | 'confidence_gap'      // Parent/goalie confidence perception mismatch
  | 'feedback_gap'        // Coach says feedback, goalie doesn't hear it
  | 'car_ride_gap'        // Parent/goalie car ride experience differs
  | 'development_gap'     // Different views on practice value
  | 'communication_gap'   // Communication disconnect
  | 'alignment';          // Matching perceptions

/**
 * Cross-reference flag
 */
export interface CrossReferenceFlag {
  id: string;
  type: CrossReferenceType;
  severity: 'high' | 'medium' | 'low';

  // The compared data
  goalieQuestionId?: string;
  goalieResponse?: string;
  goalieScore?: IntelligenceScore;

  parentQuestionId?: string;
  parentResponse?: string;
  parentScore?: IntelligenceScore;

  coachQuestionId?: string;
  coachResponse?: string;
  coachScore?: IntelligenceScore;

  // Analysis
  scoreDifference?: number;
  description: string;
  recommendation: string;

  // Metadata
  detectedAt: Timestamp;
}

/**
 * Cross-reference comparison rule (admin-configurable)
 */
export interface CrossReferenceRule {
  id: string;
  name: string;
  description: string;

  // Question mappings
  goalieQuestionId?: string;
  parentQuestionId?: string;
  coachQuestionId?: string;

  // Threshold for flagging
  scoreDifferenceThreshold: number; // Flag if difference > this
  resultType: CrossReferenceType;
  severity: 'high' | 'medium' | 'low';

  isActive: boolean;
}

/**
 * Complete cross-reference result for a goalie
 */
export interface CrossReferenceResult {
  goalieUserId: string;
  parentUserId?: string;
  coachUserId?: string;

  flags: CrossReferenceFlag[];
  alignments: CrossReferenceFlag[];  // Positive matches

  // Summary metrics
  overallAlignmentScore: number; // 0-100
  criticalGapsCount: number;

  // Timestamps
  lastUpdated: Timestamp;
  goalieAssessmentDate?: Timestamp;
  parentAssessmentDate?: Timestamp;
  coachAssessmentDate?: Timestamp;
}

// ==========================================
// ASSESSMENT QUESTION TYPES
// ==========================================

/**
 * Assessment question option with 1.0-4.0 scoring
 */
export interface AssessmentQuestionOption {
  id: string;
  text: string;
  score: IntelligenceScore; // 1.0 to 4.0
}

/**
 * Assessment question (category-based)
 */
export interface AssessmentQuestion {
  id: string;
  categorySlug: string;       // GoalieCategorySlug | ParentCategorySlug | CoachCategorySlug
  questionCode: string;       // e.g., 'Q1.1', 'Q2.3'
  type: OnboardingQuestionType;
  question: string;
  tooltip?: string;           // Educational ⓘ tooltip
  options: AssessmentQuestionOption[];
  order: number;
  isRequired: boolean;

  // For video scenarios
  videoUrl?: string;
  videoThumbnail?: string;

  // Michael's review flags
  requiresReview?: boolean;   // ⚠️ flagged for Michael's review
  reviewNote?: string;
}

/**
 * Assessment response
 */
export interface AssessmentResponse {
  questionId: string;
  questionCode: string;
  categorySlug: string;
  value: string | string[];   // Option ID(s)
  score: IntelligenceScore;   // 1.0-4.0
  answeredAt: Timestamp;
}


/**
 * Complete questionnaire configuration
 */
export interface QuestionnaireConfig {
  role: QuestionnaireRole;
  version: string;

  // Intake questions (Front Door)
  intakeQuestions: IntakeQuestion[];

  // Assessment questions (Getting to Know You)
  assessmentQuestions: AssessmentQuestion[];

  // Category weights
  categoryWeights: CategoryWeight[];

  // Pacing level thresholds
  pacingThresholds: PacingThresholds;

  // Bridge message templates
  bridgeMessageTemplates: BridgeMessageTemplate[];

  // Profile summary templates
  profileSummaryTemplates: ProfileSummaryTemplate[];

  // Metadata
  lastUpdated: Timestamp;
  updatedBy: string;
}

/**
 * Bridge message template
 */
export interface BridgeMessageTemplate {
  id: string;
  conditions: Record<string, string[]>; // e.g., { ageRange: ['11-13'], experienceLevel: ['1-3'] }
  messageTemplate: string;              // Template with {{variable}} placeholders
  order: number;                        // Priority order for matching
}

/**
 * Profile summary template
 */
export interface ProfileSummaryTemplate {
  id: string;
  pacingLevel: PacingLevel;
  ageRange?: GoalieAgeRange;  // For goalies
  messageTemplate: string;
  order: number;
}

// ==========================================
// COACH REVIEW TYPE
// ==========================================

/**
 * Coach review data for an evaluation
 */
export interface CoachReview {
  reviewedAt: Timestamp;
  reviewedBy: string;
  reviewerName?: string;
  notes: string;
  adjustedLevel?: AssessmentLevel;
  adjustedPacingLevel?: PacingLevel;
}

/**
 * Input for coach review
 */
export interface CoachReviewInput {
  evaluationId: string;
  coachId: string;
  coachName: string;
  notes: string;
  adjustedLevel?: AssessmentLevel;
  adjustedPacingLevel?: PacingLevel;
}

/**
 * Summary of a student's evaluation for coach dashboard
 */
export interface EvaluationSummary {
  evaluationId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  completedAt: Timestamp;
  pacingLevel: PacingLevel;
  overallScore: number;
  hasCoachReview: boolean;
  reviewedAt?: Timestamp;
}

// ==========================================
// EVALUATION TYPES & HELPERS
// ==========================================

/**
 * Complete onboarding evaluation record
 */
export interface OnboardingEvaluation {
  id: string;
  userId: string;
  role: QuestionnaireRole;

  // Phase tracking
  phase: 'intake' | 'bridge' | 'assessment' | 'completed';

  // Intake data
  intakeData?: IntakeData;
  intakeCompletedAt?: Timestamp;

  // Assessment progress
  currentCategoryIndex: number;
  currentQuestionIndex: number;
  assessmentResponses: AssessmentResponse[];
  assessmentStartedAt?: Timestamp;

  // Results
  intelligenceProfile?: IntelligenceProfile;
  pacingLevel?: PacingLevel;

  // Cross-reference (if applicable)
  crossReferenceResult?: CrossReferenceResult;
  linkedGoalieId?: string;    // For parent/coach linking
  linkedParentIds?: string[]; // For goalie linking
  linkedCoachIds?: string[];  // For goalie linking

  // Status
  status: 'in_progress' | 'completed' | 'reviewed';
  completedAt?: Timestamp;
  duration?: number;

  // Coach review (if reviewed)
  coachReview?: CoachReview;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Default pacing thresholds (admin-configurable)
 */
export const DEFAULT_PACING_THRESHOLDS: PacingThresholds = {
  introduction: { min: 1.0, max: 2.2 },
  development: { min: 2.2, max: 3.1 },
  refinement: { min: 3.1, max: 4.0 },
};

/**
 * Goalie category weights per Michael's spec
 */
export const GOALIE_CATEGORY_WEIGHTS: CategoryWeight[] = [
  { categorySlug: 'feelings', weight: 15, name: 'How You Feel About Being a Goalie' },
  { categorySlug: 'knowledge', weight: 25, name: 'What You Know About Your Position' },
  { categorySlug: 'pre_game', weight: 10, name: 'Before the Game' },
  { categorySlug: 'in_game', weight: 25, name: 'During the Game' },
  { categorySlug: 'post_game', weight: 10, name: 'After the Game' },
  { categorySlug: 'training', weight: 10, name: 'Your Training and Development' },
  { categorySlug: 'learning', weight: 5, name: 'How You Want to Learn' },
];

/**
 * Parent category weights per Michael's spec
 */
export const PARENT_CATEGORY_WEIGHTS: CategoryWeight[] = [
  { categorySlug: 'goalie_state', weight: 10, name: "Your Goalie's Current State" },
  { categorySlug: 'understanding', weight: 30, name: 'Your Understanding of the Position' },
  { categorySlug: 'pre_game', weight: 10, name: 'Pre-Game' },
  { categorySlug: 'car_ride_home', weight: 20, name: 'The Car Ride Home' },
  { categorySlug: 'development_role', weight: 15, name: 'Your Role in Their Development' },
  { categorySlug: 'expectations', weight: 10, name: 'Your Expectations and Goals' },
  { categorySlug: 'preferences', weight: 5, name: 'Communication and Preferences' },
];

/**
 * Coach category weights per Michael's spec
 */
export const COACH_CATEGORY_WEIGHTS: CategoryWeight[] = [
  { categorySlug: 'goalie_knowledge', weight: 30, name: 'Your Goaltending Knowledge' },
  { categorySlug: 'current_approach', weight: 25, name: 'Your Current Approach' },
  { categorySlug: 'pre_game', weight: 10, name: 'Pre-Game Assessment' },
  { categorySlug: 'in_game', weight: 15, name: 'In-Game Reading' },
  { categorySlug: 'post_game', weight: 10, name: 'Post-Game Debrief' },
  { categorySlug: 'coaching_goals', weight: 5, name: 'Your Coaching Goals' },
  { categorySlug: 'preferences', weight: 5, name: 'Communication and Preferences' },
];

/**
 * Get category weights for a role
 */
export function getCategoryWeights(role: QuestionnaireRole): CategoryWeight[] {
  switch (role) {
    case 'goalie': return GOALIE_CATEGORY_WEIGHTS;
    case 'parent': return PARENT_CATEGORY_WEIGHTS;
    case 'coach': return COACH_CATEGORY_WEIGHTS;
  }
}

/**
 * Calculate pacing level from intelligence score
 */
export function calculatePacingLevel(
  score: IntelligenceScore,
  thresholds: PacingThresholds = DEFAULT_PACING_THRESHOLDS
): PacingLevel {
  if (score >= thresholds.refinement.min) return 'refinement';
  if (score >= thresholds.development.min) return 'development';
  return 'introduction';
}

/**
 * Get display text for pacing level
 */
export function getPacingLevelDisplayText(level: PacingLevel): string {
  switch (level) {
    case 'introduction': return 'Introduction';
    case 'development': return 'Development';
    case 'refinement': return 'Refinement';
  }
}

/**
 * Get color class for pacing level
 */
export function getPacingLevelColor(level: PacingLevel): string {
  switch (level) {
    case 'introduction': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'development': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'refinement': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  }
}

/**
 * Convert legacy AssessmentLevel to PacingLevel
 */
export function assessmentLevelToPacingLevel(level: AssessmentLevel): PacingLevel {
  switch (level) {
    case 'beginner': return 'introduction';
    case 'intermediate': return 'development';
    case 'advanced': return 'refinement';
  }
}

/**
 * Convert PacingLevel to legacy AssessmentLevel
 */
export function pacingLevelToAssessmentLevel(level: PacingLevel): AssessmentLevel {
  switch (level) {
    case 'introduction': return 'beginner';
    case 'development': return 'intermediate';
    case 'refinement': return 'advanced';
  }
}

/**
 * Category metadata for display
 */
export interface CategoryInfo {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  weight: number;
}

/**
 * Goalie category definitions with metadata
 */
export const GOALIE_CATEGORIES: CategoryInfo[] = [
  {
    slug: 'feelings',
    name: 'Emotional State',
    shortName: 'Emotional State',
    description: 'Mental resilience, confidence, and emotional response to the position',
    icon: 'Heart',
    color: 'purple',
    weight: 15,
  },
  {
    slug: 'knowledge',
    name: 'Goalie IQ',
    shortName: 'Goalie IQ',
    description: 'Understanding of goaltending fundamentals and self-awareness',
    icon: 'Brain',
    color: 'blue',
    weight: 25,
  },
  {
    slug: 'pre_game',
    name: 'Pre-Game',
    shortName: 'Pre-Game',
    description: 'Pre-game routines, preparation, and mental readiness',
    icon: 'Clock',
    color: 'cyan',
    weight: 10,
  },
  {
    slug: 'in_game',
    name: 'In-Game',
    shortName: 'In-Game',
    description: 'In-game awareness, tracking, and competitive response',
    icon: 'Target',
    color: 'red',
    weight: 25,
  },
  {
    slug: 'post_game',
    name: 'Post-Game',
    shortName: 'Post-Game',
    description: 'Self-evaluation, reflection, and processing performance',
    icon: 'MessageCircle',
    color: 'green',
    weight: 10,
  },
  {
    slug: 'training',
    name: 'Self-Training Habits',
    shortName: 'Self-Training Habits',
    description: 'Training habits, practice engagement, and commitment',
    icon: 'Dumbbell',
    color: 'orange',
    weight: 10,
  },
  {
    slug: 'learning',
    name: 'Learning Attitude',
    shortName: 'Learning Attitude',
    description: 'Learning preferences and platform engagement style',
    icon: 'BookOpen',
    color: 'indigo',
    weight: 5,
  },
];

/**
 * Parent category definitions with metadata
 * Based on Michael's parent questionnaire spec (03-parent-questionnaire-spec.md)
 */
export const PARENT_CATEGORIES: CategoryInfo[] = [
  {
    slug: 'goalie_state',
    name: "Your Goalie's Current State",
    shortName: 'Goalie State',
    description: 'What the parent sees from the outside looking in',
    icon: 'Eye',
    color: 'purple',
    weight: 10,
  },
  {
    slug: 'understanding',
    name: 'Your Understanding of the Position',
    shortName: 'Understanding',
    description: 'Knowledge of goaltending fundamentals',
    icon: 'Brain',
    color: 'blue',
    weight: 30,
  },
  {
    slug: 'pre_game',
    name: 'Pre-Game',
    shortName: 'Pre-Game',
    description: 'Before they hit the ice',
    icon: 'Clock',
    color: 'cyan',
    weight: 10,
  },
  {
    slug: 'car_ride_home',
    name: 'The Car Ride Home',
    shortName: 'Car Ride Home',
    description: 'Post-game communication',
    icon: 'Car',
    color: 'amber',
    weight: 20,
  },
  {
    slug: 'development_role',
    name: 'Your Role in Their Development',
    shortName: 'Development Role',
    description: 'Active involvement in development',
    icon: 'Users',
    color: 'green',
    weight: 15,
  },
  {
    slug: 'expectations',
    name: 'Your Expectations and Goals',
    shortName: 'Expectations',
    description: 'Goals for the platform',
    icon: 'Target',
    color: 'red',
    weight: 10,
  },
  {
    slug: 'preferences',
    name: 'Communication and Preferences',
    shortName: 'Preferences',
    description: 'Platform engagement style',
    icon: 'MessageCircle',
    color: 'indigo',
    weight: 5,
  },
];

export const COACH_CATEGORIES: CategoryInfo[] = [
  {
    slug: 'goalie_knowledge',
    name: 'Your Goaltending Knowledge',
    shortName: 'Knowledge',
    description: 'Understanding of goaltending fundamentals',
    icon: 'Brain',
    color: 'blue',
    weight: 30,
  },
  {
    slug: 'current_approach',
    name: 'Your Current Approach',
    shortName: 'Approach',
    description: 'Current goalie development practices',
    icon: 'Target',
    color: 'purple',
    weight: 25,
  },
  {
    slug: 'pre_game',
    name: 'Pre-Game Assessment',
    shortName: 'Pre-Game',
    description: 'Assessing goalie readiness before games',
    icon: 'Clock',
    color: 'cyan',
    weight: 10,
  },
  {
    slug: 'in_game',
    name: 'In-Game Reading',
    shortName: 'In-Game',
    description: 'Reading goalie performance during games',
    icon: 'Eye',
    color: 'red',
    weight: 15,
  },
  {
    slug: 'post_game',
    name: 'Post-Game Debrief',
    shortName: 'Post-Game',
    description: 'Post-game feedback and communication',
    icon: 'MessageCircle',
    color: 'green',
    weight: 10,
  },
  {
    slug: 'coaching_goals',
    name: 'Your Coaching Goals',
    shortName: 'Goals',
    description: 'Goals for goalie development',
    icon: 'TrendingUp',
    color: 'orange',
    weight: 5,
  },
  {
    slug: 'preferences',
    name: 'Communication & Preferences',
    shortName: 'Preferences',
    description: 'Platform engagement style',
    icon: 'BookOpen',
    color: 'indigo',
    weight: 5,
  },
];

/**
 * Get category info by slug
 */
export function getCategoryInfo(slug: string, role: QuestionnaireRole = 'goalie'): CategoryInfo | undefined {
  if (role === 'goalie') {
    return GOALIE_CATEGORIES.find(c => c.slug === slug);
  }
  if (role === 'parent') {
    return PARENT_CATEGORIES.find(c => c.slug === slug);
  }
  if (role === 'coach') {
    return COACH_CATEGORIES.find(c => c.slug === slug);
  }
  return undefined;
}

// ==========================================
// CONTENT PILLAR TYPES (Not Assessment)
// Used for organizing learning content
// ==========================================

/**
 * Pillar metadata with display information
 * Used for content organization (7 learning pillars)
 */
export interface PillarInfo {
  slug: PillarSlug;
  /** Which of the seven Pillars this belongs to. Pillar 3 has two halves, so 3 appears twice. */
  pillarNumber: number;
  name: string;
  shortName: string;
  description: string;
  icon: string;  // Lucide icon name
  color: string; // Tailwind color class
}

/**
 * The 7 Ice Hockey Goalie content pillars, in the order Michael approved on
 * 6 August 2026. This array is the single source the app reads its pillar
 * wording and ordering from — changing it here changes every screen that
 * renders the list.
 *
 * Pillar 3 is deliberately two entries: 7AMS governs play above the icing line
 * and the 6 Zone – 7 Point System™ governs play below it. They are taught as one
 * pillar but charted separately, so both need to exist as selectable options.
 */
export const PILLARS: PillarInfo[] = [
  {
    slug: 'mindset',
    pillarNumber: 1,
    name: 'MindSet',
    shortName: 'MindSet',
    description: 'Mental resilience, focus, and emotional regulation skills',
    icon: 'Brain',
    color: 'purple',
  },
  {
    slug: 'skating',
    pillarNumber: 2,
    name: 'Skating',
    shortName: 'Skating',
    description: 'Movement confidence and skating knowledge',
    icon: 'Footprints',
    color: 'blue',
  },
  {
    slug: 'positioning',
    pillarNumber: 3,
    name: '7AMS (Above the Icing Line)',
    shortName: '7AMS',
    description: 'The 7 Angle-Marker System — positioning above the icing line',
    icon: 'Target',
    color: 'orange',
  },
  {
    slug: 'seven_point',
    pillarNumber: 3,
    name: '6 Zone – 7 Point System™ (Below the Icing Line)',
    shortName: '6 Zone – 7 Point System™',
    description: 'Zone awareness and coverage patterns below the icing line',
    icon: 'Grid3X3',
    color: 'red',
  },
  {
    slug: 'form',
    pillarNumber: 4,
    name: 'Form',
    shortName: 'Form',
    description: 'Stance awareness and execution fundamentals',
    icon: 'Shapes',
    color: 'green',
  },
  {
    slug: 'game',
    pillarNumber: 5,
    name: 'Game',
    shortName: 'Game',
    description: 'Game-day routine, charting, and post-game review',
    icon: 'Trophy',
    color: 'cyan',
  },
  {
    slug: 'practice',
    pillarNumber: 6,
    name: 'Practice',
    shortName: 'Practice',
    description: 'Purposeful practice, planning, and repetition that earns the technique',
    icon: 'Dumbbell',
    color: 'teal',
  },
  {
    slug: 'lifestyle',
    pillarNumber: 7,
    name: 'Lifestyle',
    shortName: 'Lifestyle',
    description: 'Off-ice training, nutrition, recovery, sleep, life balance, and overall wellness essential for peak goaltending performance',
    icon: 'Heart',
    color: 'pink',
  },
];

/**
 * The label a pillar carries in a picker: "Pillar 4 — Form".
 *
 * The two halves of Pillar 3 are joined with "·" rather than "—" so the list
 * reads as one pillar split in two rather than two pillars sharing a number.
 */
export function pillarOptionLabel(pillar: PillarInfo): string {
  const isSplit = PILLARS.filter(p => p.pillarNumber === pillar.pillarNumber).length > 1;
  return `Pillar ${pillar.pillarNumber} ${isSplit ? '·' : '—'} ${pillar.name}`;
}

/**
 * Helper to get pillar info by slug.
 * Accepts retired slugs found on stored documents and resolves them.
 */
export function getPillarInfo(slug: StoredPillarSlug): PillarInfo {
  const resolved = resolvePillarSlug(slug);
  const pillar = resolved ? PILLARS.find(p => p.slug === resolved) : undefined;
  if (!pillar) {
    throw new Error(`Unknown pillar slug: ${slug}`);
  }
  return pillar;
}
