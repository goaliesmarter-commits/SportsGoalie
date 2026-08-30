import { Timestamp } from 'firebase/firestore';
import type { LegalAcceptance } from './legal';

export type UserRole = 'student' | 'admin' | 'coach' | 'parent';
export type WorkflowType = 'automated' | 'custom';
export type DifficultyLevel = 'introduction' | 'development' | 'refinement';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type QuestionType = 'multiple_choice' | 'true_false' | 'descriptive' | 'fill_in_blank';
export type MediaType = 'image' | 'video' | 'youtube';
export type ContentType = 'video' | 'article' | 'tutorial';
export type NotificationType = 'progress' | 'quiz_result' | 'new_content' | 'reminder' | 'achievement' | 'admin_message';
export type AchievementType = 'progress' | 'quiz' | 'streak' | 'time' | 'special';

// User Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  studentNumber?: string; // Random unique ID for students (e.g., "SG-K7M9-P2X4")
  workflowType?: WorkflowType; // Learning workflow: automated (self-paced) or custom (coach-guided)
  assignedCoachId?: string; // Required for custom workflow students
  coachCode?: string; // Unique code for coaches (LASTNAME-XXXX format)
  profileImage?: string;
  emailVerified: boolean;
  preferences: UserPreferences;
  profile?: UserProfile;
  isActive: boolean;
  // Onboarding evaluation fields
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: Timestamp;
  initialAssessmentLevel?: 'beginner' | 'intermediate' | 'advanced';

  // Charting configuration — admin-assigned
  chartLevel?: 'basic' | 'five_pillar'; // Basic = 2-3 min entry experience; 5-Pillar = full advanced chart. Default (undefined) = five_pillar.
  chartGrowthLevel?: 'introduction' | 'development' | 'refinement'; // Chart growth path. Default (undefined) = introduction.
  livingIndex?: string[]; // Active L-index item IDs for this goalie — admin-assigned

  // Parent-Child Linking Fields (for students/goalies)
  linkedParentIds?: string[];      // Array of parent user IDs linked to this goalie
  parentLinkCode?: string;         // Code for parents to link (XXXX-XXXX format)
  parentLinkCodeExpiry?: Timestamp; // Optional expiration for the link code

  // Parent-Child Linking Fields (for parents)
  linkedChildIds?: string[];       // Array of goalie user IDs this parent is linked to
  parentOnboardingComplete?: boolean; // Whether parent has completed onboarding
  coachOnboardingComplete?: boolean;      // Whether coach has completed baseline profile
  coachOnboardingCompletedAt?: Timestamp; // When coach completed baseline profile

  /**
   * Terms and Privacy acceptance, stamped at registration from the versions in
   * `src/data/legal`. Optional because every account created before 27 August
   * 2026 predates this being recorded — absent means unknown, not refused.
   */
  legalAcceptance?: LegalAcceptance;

  /**
   * Subscription pause switch, flipped only by an admin. Paused accounts stop
   * counting as active and cannot enter the app, but every part of their
   * record is left exactly as it was — resuming puts them back where they
   * left off. Absent means active: accounts predate the field. Distinct from
   * `isActive`, which is the soft-delete flag.
   */
  isPaused?: boolean;
  pausedAt?: Timestamp;
  resumedAt?: Timestamp;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  deactivatedAt?: Timestamp;
  reactivatedAt?: Timestamp;
}

export interface UserPreferences {
  notifications: boolean;
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  emailNotifications: {
    progress: boolean;
    quizResults: boolean;
    newContent: boolean;
    reminders: boolean;
  };
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  bio?: string;
  dateOfBirth?: Date;
  location?: {
    country: string;
    city: string;
  };
  sportsInterests?: string[];
  experienceLevel?: DifficultyLevel;
  goals?: string[];
}

// Sport Types
export interface Sport {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  difficulty: DifficultyLevel;
  estimatedTimeToComplete: number; // hours
  skillsCount: number;
  imageUrl?: string;
  tags: string[];
  prerequisites?: string[]; // sport IDs
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  metadata: SportMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface SportMetadata {
  totalEnrollments: number;
  totalCompletions: number;
  averageRating: number;
  totalRatings: number;
  averageCompletionTime: number; // hours
}

// Skill Types
export interface Skill {
  id: string;
  sportId: string;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedTimeToComplete: number; // minutes
  content?: string; // Rich HTML content
  externalResources: ExternalResource[];
  media?: SkillMedia;
  prerequisites: string[]; // skill IDs
  learningObjectives: string[];
  tags: string[];
  hasVideo: boolean;
  hasQuiz: boolean; // @deprecated - Quiz availability is now determined dynamically by querying the database
  isActive: boolean;
  order: number;
  metadata: SkillMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface ExternalResource {
  id: string;
  title: string;
  url: string;
  type: 'website' | 'pdf' | 'video' | 'other';
  description?: string;
}

export interface SkillMedia {
  text: string;
  images: MediaItem[];
  videos: VideoItem[];
}

export interface MediaItem {
  id: string;
  url: string;
  title?: string;
  alt: string;
  caption?: string;
  order: number;
}

export interface VideoItem {
  id: string;
  youtubeId?: string;
  url?: string; // Direct video URL (alternative to youtubeId)
  title: string;
  duration: number; // seconds
  thumbnail?: string;
  order: number;
}

export interface SkillMetadata {
  totalCompletions: number;
  averageCompletionTime: number; // minutes
  averageRating: number;
  totalRatings: number;
  difficulty: DifficultyLevel;
}

// Quiz Types - Import comprehensive Quiz interface from quiz.ts to avoid duplication
export type { Quiz, QuizSettings, Question, QuizMetadata, QuizAnswer } from './quiz';

// Video Quiz Types - Import video quiz types
export type {
  VideoQuiz,
  VideoQuizQuestion,
  VideoQuizSettings,
  VideoQuizMetadata,
  VideoQuizProgress,
  VideoQuestionAnswer,
  VideoQuizQuestionWithState,
  VideoPlayerState,
  QuestionOverlayProps,
  VideoControlsProps,
  DropOffPoint
} from './video-quiz';

// Video Tag Types - Structured tagging system for video content
export type {
  PillarTag,
  SystemTag,
  UserTypeTag,
  AngleMarkerTag,
  ArchLevelTag,
  VideoStructuredTags,
  VideoTagFilter,
  TagFacetCounts,
} from './video-tags';

export {
  SYSTEM_TAGS,
  USER_TYPE_TAGS,
  ANGLE_MARKER_TAGS,
  ARCH_LEVEL_TAGS,
  SYSTEM_TAG_METADATA,
  USER_TYPE_TAG_METADATA,
  ARCH_LEVEL_TAG_METADATA,
  ANGLE_MARKER_TAG_METADATA,
  TAG_METADATA,
  createEmptyStructuredTags,
  buildTagIndex,
  parseTagIndex,
  filterToTagIndex,
  matchesFilter,
  getSystemTagLabel,
  getUserTypeTagLabel,
  getArchLevelTagLabel,
  getAngleMarkerTagLabel,
  getSystemTagColorClass,
  getArchLevelTagColorClass,
  countTags,
  countActiveFilters,
} from './video-tags';


export interface QuizQuestion {
  id: string;
  quizId: string;
  type: QuestionType;
  question: string;
  options?: string[]; // for MCQ and image_choice
  correctAnswer: string | number;
  explanation: string;
  points: number;
  media?: QuestionMedia;
  order: number;
  difficulty: DifficultyLevel;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QuestionMedia {
  type: MediaType;
  url: string;
  caption?: string;
  alt?: string; // for images
}



// Progress Types
export interface SportProgress {
  id: string;
  userId: string;
  sportId: string;
  status: ProgressStatus;
  completedSkills: string[];
  totalSkills: number;
  progressPercentage: number;
  timeSpent: number; // minutes
  currentSkillId?: string;
  streak: StreakInfo;
  rating?: number;
  review?: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  lastAccessedAt: Timestamp;
}

export interface SkillProgress {
  id: string;
  userId: string;
  skillId: string;
  sportId: string;
  status: ProgressStatus;
  progressPercentage: number;
  timeSpent: number; // minutes
  bookmarked: boolean;
  notes: string;
  rating?: number;
  quizScore?: number;
  videoProgress?: VideoProgress;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  lastAccessedAt?: Timestamp;
}

export interface VideoProgress {
  watchTime: number; // seconds watched
  totalDuration: number; // total video duration
  progressPercentage: number;
  isCompleted: boolean;
  bookmarks: VideoBookmark[];
}

export interface VideoBookmark {
  id: string;
  timestamp: number; // seconds
  note: string;
  createdAt: Timestamp;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDate: Timestamp;
}

export interface UserProgress {
  userId: string;
  overallStats: OverallStats;
  achievements: string[]; // achievement IDs
  lastUpdated: Timestamp;
  progressHistory?: Array<{
    date: string;
    value: number;
  }>;
}

export interface OverallStats {
  totalTimeSpent: number; // minutes
  skillsCompleted: number;  // Number of unique skills attempted
  sportsCompleted: number;
  quizzesCompleted: number;  // Total quiz attempts
  averageQuizScore: number;  // Average percentage from video quizzes
  currentStreak: number;
  longestStreak: number;
  lastStreakDate?: Timestamp;
  // Deprecated - keeping for backward compatibility but always return default values
  totalPoints: number;       // Always returns 0
  level: number;             // Always returns 1
  experiencePoints: number;  // Always returns 0
}

// Content Types
export interface Content {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  content: string; // Rich HTML content
  thumbnail: string;
  media: ContentMedia;
  tags: string[];
  category: string;
  difficulty: DifficultyLevel;
  relatedSports: string[];
  relatedSkills: string[];
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt?: Timestamp;
  author: Author;
  metadata: ContentMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContentMedia {
  type: MediaType;
  url: string;
  duration?: number; // for videos
  transcript?: string;
}

export interface Author {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
}

export interface ContentMetadata {
  views: number;
  likes: number;
  shares: number;
  averageRating: number;
  totalRatings: number;
  bookmarks: number;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface NotificationData {
  sportId?: string;
  skillId?: string;
  quizId?: string;
  contentId?: string;
  actionUrl?: string;
  achievementId?: string;
  messageId?: string;        // Link to message for admin_message notifications
  messageType?: string;       // Type of message (instruction, feedback, etc.)
}

// Achievement Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: AchievementType;
  criteria: AchievementCriteria;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  tier?: 'FOUNDATION' | 'DEVELOPING' | 'OWNING IT' | '80-100 CLUB' | '95-100 CLUB';
  category?: 'WINS' | 'BREAKTHROUGHS' | 'CLIMBS' | 'STREAKS' | 'MILESTONES';
  isActive: boolean;
  isSecret: boolean;
  metadata: AchievementMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AchievementCriteria {
  condition: string;
  value: number;
  sportId?: string;
  skillId?: string;
  timeframe?: number; // in days
}

export interface AchievementMetadata {
  totalUnlocked: number;
  unlockRate: number; // percentage
  firstUnlockedAt?: Timestamp;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number; // for progressive achievements
  isCompleted: boolean;
  unlockedAt?: Timestamp;
  isNotified: boolean;
}

// App Configuration Types
export interface AppSettings {
  id: string;
  maintenanceMode: boolean;
  featuresEnabled: FeatureFlags;
  supportedLanguages: string[];
  maxQuizAttempts: number;
  sessionTimeout: number; // minutes
  cacheSettings: CacheSettings;
  rateLimit: RateLimitSettings;
  analytics: AnalyticsSettings;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface FeatureFlags {
  registration: boolean;
  quizzes: boolean;
  achievements: boolean;
  notifications: boolean;
  contentCreation: boolean;
  videoLearning: boolean;
  socialFeatures: boolean;
  analyticsTracking: boolean;
}

export interface CacheSettings {
  userDataTTL: number; // milliseconds
  contentTTL: number;
  quizTTL: number;
  staticAssetsTTL: number;
}

export interface RateLimitSettings {
  apiCallsPerMinute: number;
  quizAttemptsPerHour: number;
  contentUploadPerDay: number;
}

export interface AnalyticsSettings {
  trackPageViews: boolean;
  trackUserActions: boolean;
  trackPerformance: boolean;
  dataRetentionDays: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  message?: string;
  timestamp: Date;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: unknown;
  field?: string; // for validation errors
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// Database Query Types
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: OrderByClause[];
  where?: WhereClause[];
  cursor?: string; // for cursor-based pagination
}

export interface OrderByClause {
  field: string;
  direction: 'asc' | 'desc';
}

export interface WhereClause {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';
  value: unknown;
}

// Real-time Update Types
export interface RealtimeUpdate<T> {
  type: 'added' | 'modified' | 'removed';
  data: T;
  oldData?: T;
  timestamp: Date;
}

export type RealtimeListener<T> = (update: RealtimeUpdate<T>) => void;

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  refreshOnAccess?: boolean;
  compress?: boolean;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  workflowType?: WorkflowType; // For students: automated or custom
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  preferences?: Partial<UserPreferences>;
}

export interface ForgotPasswordForm {
  email: string;
}

export interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
  token: string;
}

export interface ProfileUpdateForm {
  firstName?: string;
  lastName?: string;
  bio?: string;
  dateOfBirth?: Date;
  location?: {
    country: string;
    city: string;
  };
  sportsInterests?: string[];
  experienceLevel?: DifficultyLevel;
  goals?: string[];
}

export interface PreferencesUpdateForm {
  notifications?: boolean;
  theme?: 'light' | 'dark';
  language?: string;
  timezone?: string;
  emailNotifications?: {
    progress?: boolean;
    quizResults?: boolean;
    newContent?: boolean;
    reminders?: boolean;
  };
}

// Search Types
export interface SearchFilters {
  difficulty?: DifficultyLevel[];
  categories?: string[];
  tags?: string[];
  duration?: {
    min?: number;
    max?: number;
  };
  rating?: {
    min?: number;
  };
  hasVideo?: boolean;
  hasQuiz?: boolean;
  isFree?: boolean;
}

export interface SearchResult<T> {
  item: T;
  score: number; // relevance score
  highlights?: { [field: string]: string };
}

export interface SearchResponse<T> {
  results: SearchResult<T>[];
  total: number;
  facets?: { [key: string]: { [value: string]: number } };
  suggestions?: string[];
  query: string;
  took: number; // search time in ms
}

// Analytics Types
export interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  eventName: string;
  properties: { [key: string]: unknown };
  timestamp: Timestamp;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export interface UserSession {
  id: string;
  userId?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number; // seconds
  pageViews: number;
  events: number;
  referrer?: string;
  userAgent: string;
  ipAddress?: string;
}

// Validation Schema Types (for Zod integration)
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// Migration Types
export interface Migration {
  id: string;
  version: string;
  name: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
  executedAt?: Timestamp;
}

export interface MigrationState {
  id: string;
  currentVersion: string;
  executedMigrations: string[];
  lastMigrationAt: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Backup Types
export interface BackupInfo {
  id: string;
  type: 'full' | 'incremental';
  collections: string[];
  size: number; // bytes
  recordCount: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  status: 'in_progress' | 'completed' | 'failed';
  error?: string;
}

// System Health Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: ServiceHealth;
    storage: ServiceHealth;
    authentication: ServiceHealth;
    cache: ServiceHealth;
  };
  lastChecked: Date;
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number; // milliseconds
  error?: string;
  lastChecked: Date;
}

// Message Types - Export from message.ts
export type { Message, MessageAttachment, MessageType, AttachmentType, CreateMessageInput, MessageQueryOptions, MessageStats } from './message';

// Charting System Types - Export from charting.ts
export type {
  Session,
  ChartingEntry,
  SessionType,
  SessionStatus,
  PerformanceLevel,
  ConsistencyLevel,
  DecisionMakingLevel,
  SkatingLevel,
  YesNoResponse,
  GameReadiness,
  MindSetPreGame,
  PreGameRoutine,
  WarmUp,
  PreGameData,
  GoalsByPeriod,
  GameOverview,
  MindSetPeriod,
  SkatingPerformance,
  PositionalAboveIcingLine,
  PositionalBelowIcingLine,
  ReboundControl,
  FreezingPuck,
  TeamPlay,
  PeriodData,
  OvertimeData,
  ShootoutData,
  PostGameData,
  SessionStats,
  StreakData,
  GoalsAnalytics,
  CategoryPerformance,
  PreGameRoutineAdherence,
  PeriodPerformanceAnalytics,
  ShootoutAnalytics,
  V2PeriodAverage,
  V2GameAnalytics,
  V2PracticeAnalytics,
  StudentChartingAnalytics,
  PerformanceInsight,
  SessionFormData,
  ChartingFormData,
  StudentSummary,
  CohortAnalytics,
  SessionComparison,
  ChartingQueryOptions,
  // V2 Charting Types
  MindManagementStartTime,
  V2PreGameData,
  GoalEntry,
  V2PeriodData,
  V2PostGameData,
  V2GameChartEntry,
  PracticeIndexCategory,
  PracticeIndexItem,
  V2PracticeChartEntry,
  MindVaultEntry,
  // Parent Chart Types
  ParentEmotionalState,
  ParentRoutineStatus,
  ParentCarRideMood,
  ParentTalkAboutGame,
  ParentNoticedObservation,
  ParentPreGameData,
  ParentPeriodRatings,
  ParentPostGameData,
  ParentChartEntry,
  // Coach Chart Types
  CoachReadinessLevel,
  CoachPriorityFactor,
  CoachPreGameData,
  CoachPeriodData,
  CoachPostGameData,
  CoachChartEntry,
} from './charting';

// Form Template Types - Export from form-template.ts
export type {
  FieldType,
  AnalyticsType,
  TrendDirection,
  ChartMode,
  FieldAnalyticsConfig,
  FieldValidation,
  FormField,
  FormSection,
  FormTemplate,
  FieldResponseValue,
  FieldResponse,
  SectionResponse,
  FormResponses,
  DynamicChartingEntry,
  FieldAnalyticsResult,
  CategoryAnalyticsResult,
  DynamicStudentAnalytics,
  TemplateBuilderState,
  TemplateValidationResult,
  FormTemplateQueryOptions,
  AnalyticsQueryOptions,
  ExportConfig,
  MigrationMapping,
  TemplateMigrationConfig,
} from './form-template';

// Custom Curriculum Types - Export from curriculum.ts
export type {
  CurriculumContentType,
  CurriculumItemStatus,
  CustomCurriculum,
  CustomCurriculumItem,
  CustomContent,
  CustomContentLibrary,
  CustomContentMetadata,
  CreateCurriculumData,
  AddCurriculumItemData,
  CreateCustomContentData,
  CurriculumQueryOptions,
  CurriculumProgress,
  CurriculumNotification,
} from './curriculum';

// Onboarding Evaluation Types - Export from onboarding.ts
export type {
  AssessmentLevel,
  PillarSlug,
  OnboardingQuestionType,
  PillarInfo,
  PacingLevel,
  QuestionnaireRole,
  GoalieAgeRange,
  IntelligenceScore,
  GoalieCategorySlug,
  ParentCategorySlug,
  CoachCategorySlug,
  CategorySlug,
  IntakeQuestionType,
  IntakeQuestionOption,
  IntakeQuestion,
  IntakeResponse,
  IntakeData,
  AssessmentQuestionOption,
  AssessmentQuestion,
  AssessmentResponse,
  PacingThresholds,
  CategoryWeight,
  CategoryScoreResult,
  IntelligenceProfile,
  GapAnalysis,
  StrengthAnalysis,
  ContentRecommendation,
  CrossReferenceType,
  CrossReferenceFlag,
  CrossReferenceRule,
  CrossReferenceResult,
  QuestionnaireConfig,
  BridgeMessageTemplate,
  ProfileSummaryTemplate,
  OnboardingEvaluation,
  CoachReview,
  CoachReviewInput,
  EvaluationSummary,
  CategoryInfo,
} from './onboarding';

export {
  PILLARS,
  getPillarInfo,
  pillarOptionLabel,
  pillarShortLabel,
  pillarFromSportId,
  DEFAULT_PACING_THRESHOLDS,
  GOALIE_CATEGORY_WEIGHTS,
  PARENT_CATEGORY_WEIGHTS,
  COACH_CATEGORY_WEIGHTS,
  getCategoryWeights,
  calculatePacingLevel,
  getPacingLevelDisplayText,
  getPacingLevelColor,
  assessmentLevelToPacingLevel,
  pacingLevelToAssessmentLevel,
  GOALIE_CATEGORIES,
  PARENT_CATEGORIES,
  COACH_CATEGORIES,
  getCategoryInfo,
} from './onboarding';

/**
 * Pillar type alias - Pillars use the same structure as Sports
 * but represent the fixed 8 Ice Hockey Goalie learning pillars
 */
export type Pillar = Sport;

// Parent Link Types - Export from parent-link.ts
export type {
  ParentRelationship,
  ParentLinkStatus,
  LinkMethod,
  ParentLink,
  CreateParentLinkData,
  ParentLinkCodeConfig,
  ParentLinkCode,
  LinkedChildSummary,
  LinkedParentSummary,
  PerceptionComparison,
  ParentCrossReferenceView,
  ParentLinkQueryOptions,
} from './parent-link';

// Mind Vault Types - Export from mind-vault.ts
export type {
  MindVaultCategory,
  AcceptanceSubCategory,
  CannotAcceptSubCategory,
  CreateMindVaultEntryData,
  MindVaultCategoryInfo,
  AcceptancePrompt,
  AcceptanceSubCategoryInfo,
  CannotAcceptSubCategoryInfo,
  MindVaultCategorySummary,
} from './mind-vault';

// Re-export MindVaultEntry with a different name to avoid collision with charting.ts
export type { MindVaultEntry as MindVaultFullEntry } from './mind-vault';

export {
  MIND_VAULT_CATEGORIES,
  getMindVaultCategoryInfo,
  ACCEPTANCE_SUBCATEGORIES,
  CANNOT_ACCEPT_SUBCATEGORIES,
  ACCEPTANCE_PROMPTS,
  CANNOT_ACCEPT_PROMPTS,
} from './mind-vault';