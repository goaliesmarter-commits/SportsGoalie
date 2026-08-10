/**
 * Scoring Module
 *
 * Intelligence Profile generation and scoring algorithms
 * Based on Michael's Phase 2 Assessment Scoring Engine specification
 */

// Intelligence Profile generation
export {
  calculateCategoryScores,
  calculateOverallScore,
  generateIntelligenceProfile,
  generateGoalieIntelligenceProfile,
  getPacingLevelDescription,
  generateProfileSummary,
  convertLegacyResponses,
} from './intelligence-profile';

// V2 baseline questionnaire scoring bridge
export {
  convertStudentV2ToAssessmentResponses,
  convertParentV2ToAssessmentResponses,
  convertCoachV2ToAssessmentResponses,
  generateStudentV2IntelligenceProfile,
  generateParentV2IntelligenceProfile,
  generateCoachV2IntelligenceProfile,
} from './v2-baseline-scoring';

// Practice index auto-generator (Pillar auto-connect)
export { generatePracticeIndex } from './practice-index-generator';

// The single rating → percentage rule every screen shares
export { scaleToPercentage, clampPercentage } from './scale-score';

// Cross-reference engine
export {
  DEFAULT_CROSS_REFERENCE_RULES,
  compareGoalieAndParent,
  compareGoalieAndCoach,
  generateCrossReferenceResult,
  getCrossReferenceSummary,
  getPriorityRecommendations,
} from './cross-reference-engine';
