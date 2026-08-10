import { Timestamp } from 'firebase/firestore';
import { PillarSlug } from './onboarding';

// Field Types
export type FieldType =
  | 'yesno'        // Yes/No with optional comments
  | 'radio'        // Single selection from options
  | 'checkbox'     // Multiple selections from options
  | 'numeric'      // Number input with optional min/max
  | 'scale'        // Numeric scale (e.g., 1-10)
  | 'text'         // Short text input
  | 'textarea'     // Long text input
  | 'date'         // Date picker
  | 'time';        // Time picker

// Analytics Types
export type AnalyticsType =
  | 'percentage'     // Calculate % of yes/true responses
  | 'average'        // Calculate average of numeric values
  | 'sum'            // Calculate sum of numeric values
  | 'trend'          // Calculate improvement/decline trend
  | 'consistency'    // Calculate consistency score
  | 'distribution'   // Calculate distribution of options
  | 'count'          // Count occurrences
  | 'none';          // No analytics for this field

// Trend Direction
export type TrendDirection = 'improving' | 'declining' | 'stable';

// Mini-Chart Mode (Flash Learning / Reinforcement / Maintenance loop).
// Carried on templates now so charts don't need retrofitting once mode-specific
// behavior is built; the mode behavior itself is not implemented yet.
export type ChartMode = 'learning' | 'reinforcement' | 'maintenance';

// Field Analytics Configuration
export interface FieldAnalyticsConfig {
  enabled: boolean;
  type: AnalyticsType;
  category?: string;           // For grouping related fields
  displayName?: string;         // Override field label for analytics display
  weight?: number;              // For weighted averages (0-1, default 1)
  higherIsBetter?: boolean;     // For trend analysis (default true)
  targetValue?: number;         // Target percentage/value for goal tracking
}

// Validation Rules
export interface FieldValidation {
  required?: boolean;
  min?: number;               // For numeric/scale fields
  max?: number;               // For numeric/scale fields
  minLength?: number;         // For text fields
  maxLength?: number;         // For text fields
  pattern?: string;           // Regex pattern for text validation
  customErrorMessage?: string;
}

// Field Definition
export interface FormField {
  id: string;                   // Unique field ID (e.g., 'well_rested', 'focus_p1')
  label: string;                // Display label
  type: FieldType;
  description?: string;         // Help text for the field
  placeholder?: string;         // Placeholder for text inputs

  // Options for radio/checkbox fields
  options?: string[];           // e.g., ['poor', 'improving', 'good', 'strong']

  // Configuration
  includeComments: boolean;     // Whether to show comments textarea
  commentsRequired?: boolean;   // Whether comments are required
  commentsLabel?: string;       // Custom label for comments field

  // Validation
  validation: FieldValidation;

  // Analytics
  analytics: FieldAnalyticsConfig;

  // Conditional display
  conditionalDisplay?: {
    fieldId: string;            // Show this field only if...
    condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    value: any;
  };

  // UI
  order: number;
  columnSpan?: 1 | 2;          // For grid layout (1 = half width, 2 = full width)
}

// Section Definition
export interface FormSection {
  id: string;                   // Unique section ID (e.g., 'pre_game', 'period_1')
  title: string;                // Display title
  description?: string;         // Section description
  icon?: string;                // Icon name (lucide-react)
  order: number;

  // Fields in this section
  fields: FormField[];

  // Conditional display
  conditionalDisplay?: {
    fieldId: string;
    condition: 'equals' | 'notEquals' | 'contains';
    value: any;
  };

  // Section settings
  isRepeatable?: boolean;       // Can this section be filled multiple times?
  repeatLabel?: string;         // Label for repeat instances (e.g., "Period")
  maxRepeats?: number;          // Maximum number of repeats
}

// Form Template
export interface FormTemplate {
  id: string;
  name: string;                 // e.g., "Hockey Goalie Performance Tracker"
  description?: string;
  sport?: string;               // e.g., "Hockey", "Soccer", "Basketball"
  pillar: PillarSlug | 'combined'; // Which pillar this template tracks, or 'combined' for the whole-sport tracker
  mode?: ChartMode;             // Optional Mini-Chart mode tag (Learning/Reinforcement/Maintenance); unset = standard chart
  version: number;              // Version number for tracking changes

  // Status
  isActive: boolean;            // Only one template can be active at a time per (sport, pillar) pair
  isArchived: boolean;          // Archived templates can't be used for new entries

  // Structure
  sections: FormSection[];

  // Settings
  allowPartialSubmission: boolean;  // Can save incomplete forms
  requireSignature?: boolean;       // Require digital signature

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;            // userId
  lastModifiedBy?: string;      // userId

  // Usage stats
  usageCount?: number;          // Number of entries using this template
}

// Form Response Value Types
export type FieldResponseValue =
  | boolean                     // For yesno
  | string                      // For radio, text, textarea, date, time
  | string[]                    // For checkbox (multiple selections)
  | number;                     // For numeric, scale

// Field Response
export interface FieldResponse {
  value: FieldResponseValue;
  comments?: string;
}

// Section Responses (for repeatable sections)
export type SectionResponse = {
  [fieldId: string]: FieldResponse;
};

// Complete Entry Responses
export interface FormResponses {
  [sectionId: string]: SectionResponse | SectionResponse[]; // Array if repeatable
}

// Updated Charting Entry Interface (extends existing)
export interface DynamicChartingEntry {
  id: string;
  sessionId?: string;           // Absent for standalone pillar check-ins (not tied to a logged session)
  studentId: string;

  // Template information
  formTemplateId: string;
  formTemplateVersion: number;

  // Submission info
  submittedBy: string;
  submitterRole: 'student' | 'admin';
  submittedAt: Timestamp;
  lastUpdatedAt: Timestamp;

  // Dynamic responses
  responses: FormResponses;

  // Additional data
  additionalComments?: string;
  signature?: string;           // Base64 encoded signature image

  // Status
  isComplete: boolean;
  completionPercentage: number; // 0-100
}

// Analytics Result for a Single Field
export interface FieldAnalyticsResult {
  fieldId: string;
  fieldLabel: string;
  fieldType: FieldType;
  analyticsType: AnalyticsType;
  category?: string;

  // Generic value for display
  value?: number;
  enabled?: boolean;
  trend?: TrendDirection;

  // Common metrics
  dataPoints: number;           // Number of entries with this field

  // Percentage analytics (for yesno, percentage of yes)
  percentage?: number;
  percentageTrend?: TrendDirection;

  // Average analytics (for numeric, scale)
  average?: number;
  min?: number;                 // Lowest value the athlete actually entered
  max?: number;                 // Highest value the athlete actually entered
  scaleMin?: number;            // Floor of the rating scale the field was answered on
  scaleMax?: number;            // Ceiling of that scale — absent when the field is open-ended
  median?: number;
  averageTrend?: TrendDirection;

  // Sum analytics
  sum?: number;

  // Distribution analytics (for radio, checkbox)
  distribution?: {
    [option: string]: {
      count: number;
      percentage: number;
    };
  };
  mostCommon?: string;

  // Consistency analytics
  consistencyScore?: number;    // 0-100
  standardDeviation?: number;

  // Count analytics
  count?: number;

  // Trend data (recent vs older data)
  recentAverage?: number;       // Last 5 entries
  olderAverage?: number;        // Previous 5 entries
  improvementRate?: number;     // Percentage change

  // Target tracking
  targetValue?: number;
  targetProgress?: number;      // Percentage toward target
  isOnTarget?: boolean;

  // Baseline tracking (first-ever entry for this field, vs. latest)
  baselineValue?: number;
  baselineDate?: Timestamp;
  latestValue?: number;
  latestDate?: Timestamp;
  growthFromBaseline?: number;
}

// Category Analytics (grouped fields)
export interface CategoryAnalyticsResult {
  category: string;
  fields: string[];             // Field IDs in this category
  fieldCount: number;

  // Overall metrics
  overallScore: number;         // 0-100 weighted average
  averageValue?: number;        // Average numeric value across fields
  trend: TrendDirection;

  // Individual field results
  fieldResults: FieldAnalyticsResult[];

  // Strengths and weaknesses
  topPerformingFields: string[];
  needsImprovementFields: string[];

  // Baseline tracking (first-ever entry for this category, vs. current)
  baselineScore?: number;
  baselineDate?: Timestamp;
  currentScore?: number;
  growthFromBaseline?: number;
}

// Complete Analytics for a Student
export interface DynamicStudentAnalytics {
  studentId: string;
  formTemplateId: string;
  formTemplateName: string;
  pillar?: PillarSlug | 'combined'; // Denormalized from the template at calculation time
  sport?: string;                   // Denormalized from the template at calculation time
  totalEntries?: number; // Total number of entries for this student

  // Session stats (general)
  sessionStats: {
    totalSessions: number;
    completedSessions: number;
    partialSessions: number;
    completionRate: number;
    averageCompletionPercentage: number;
    firstSessionDate?: Timestamp;
    lastSessionDate?: Timestamp;
    averageSessionsPerWeek: number;
    averageSessionsPerMonth: number;
  };

  // Streak data
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: Timestamp;
    streakDates: string[];      // ISO date strings for calendar
  };

  // Field-level analytics
  fieldAnalytics: {
    [fieldId: string]: FieldAnalyticsResult;
  };

  // Category-level analytics
  categoryAnalytics: {
    [category: string]: CategoryAnalyticsResult;
  };

  // Overall performance
  overallPerformanceScore: number;  // 0-100
  overallTrend: TrendDirection;

  // Insights
  topStrengths: string[];       // Field labels
  areasForImprovement: string[]; // Field labels

  // Calculation metadata
  lastCalculated: Timestamp;
  calculationVersion: number;   // For tracking algorithm changes
}

// Template Builder UI State (for admin interface)
export interface TemplateBuilderState {
  template: Partial<FormTemplate>;
  currentSection?: string;      // ID of section being edited
  currentField?: string;        // ID of field being edited
  isDirty: boolean;             // Has unsaved changes
  validationErrors: {
    [path: string]: string;     // path: error message
  };
}

// Template Validation Result
export interface TemplateValidationResult {
  isValid: boolean;
  errors: {
    path: string;               // e.g., 'sections[0].fields[2].label'
    message: string;
  }[];
  warnings: {
    path: string;
    message: string;
  }[];
}

// Form Template Query Options
export interface FormTemplateQueryOptions {
  sport?: string;
  pillar?: PillarSlug | 'combined';
  isActive?: boolean;
  isArchived?: boolean;
  createdBy?: string;
  limit?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'usageCount';
  orderDirection?: 'asc' | 'desc';
}

// Analytics Query Options
export interface AnalyticsQueryOptions {
  studentId: string;
  formTemplateId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includePartialEntries?: boolean;
  recalculate?: boolean;        // Force recalculation instead of using cached
}

// Export Types for Data Export
export interface ExportConfig {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  includeFields: string[];      // Field IDs to include
  includeAnalytics: boolean;
  includeComments: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Migration Types (for converting old data to new format)
export interface MigrationMapping {
  oldFieldPath: string;         // e.g., 'preGame.gameReadiness.wellRested'
  newFieldId: string;           // e.g., 'well_rested'
  transformation?: 'none' | 'boolean' | 'string' | 'number';
}

export interface TemplateMigrationConfig {
  sourceTemplate: 'legacy';
  targetTemplateId: string;
  fieldMappings: MigrationMapping[];
  preserveLegacyData: boolean;  // Keep old structure alongside new
}
