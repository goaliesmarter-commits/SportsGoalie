import { BaseDatabaseService } from '../base.service';
import {
  ApiResponse,
  OnboardingEvaluation,
  AssessmentResponse,
  IntakeResponse,
  IntakeData,
  CoachReviewInput,
  EvaluationSummary,
  User,
  IntelligenceProfile,
  pacingLevelToAssessmentLevel,
} from '@/types';
import { Timestamp } from 'firebase/firestore';
import { logger } from '../../utils/logger';
import {
  extractAgeRange,
  extractExperienceLevel,
  extractPlayingLevel,
  extractGoalieCoachStatus,
  extractPrimaryReasons,
} from '@/data/goalie-intake-questions';
import { generateGoalieIntelligenceProfile, generateIntelligenceProfile } from '@/lib/scoring/intelligence-profile';
import { PARENT_ASSESSMENT_QUESTIONS } from '@/data/parent-assessment-questions';
import { enrollmentService } from './enrollment.service';
import { getAllPillarIds } from '@/lib/utils/pillars';

/**
 * Service for managing student onboarding evaluations.
 *
 * Handles the complete onboarding flow including:
 * - Creating and managing evaluations
 * - Saving question responses
 * - Calculating intelligence profiles and pacing levels
 * - Coach review functionality
 */
export class OnboardingService extends BaseDatabaseService {
  private readonly EVALUATIONS_COLLECTION = 'onboarding_evaluations';
  private readonly USERS_COLLECTION = 'users';

  /**
   * Create a new evaluation for a user
   * Uses the 7-category, 1.0-4.0 scoring system
   */
  async createEvaluation(userId: string): Promise<ApiResponse<OnboardingEvaluation>> {
    logger.info('Creating onboarding evaluation', 'OnboardingService', { userId });

    try {
      // Check if evaluation already exists
      const existingResult = await this.getEvaluation(userId);
      if (existingResult.success && existingResult.data) {
        logger.info('Returning existing evaluation', 'OnboardingService', {
          userId,
          evaluationId: existingResult.data.id,
        });
        return {
          success: true,
          data: existingResult.data,
          timestamp: new Date(),
        };
      }

      const evaluationId = `eval_${userId}`;
      const now = Timestamp.now();

      const evaluationData: Omit<OnboardingEvaluation, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        role: 'goalie',
        phase: 'intake',
        currentCategoryIndex: 0,
        currentQuestionIndex: 0,
        assessmentResponses: [],
        status: 'in_progress',
      };

      await this.createWithId<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId,
        evaluationData
      );

      const evaluation: OnboardingEvaluation = {
        id: evaluationId,
        ...evaluationData,
        createdAt: now,
        updatedAt: now,
      };

      logger.info('Evaluation created successfully', 'OnboardingService', {
        userId,
        evaluationId,
      });

      return {
        success: true,
        data: evaluation,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to create evaluation', 'OnboardingService', { userId, error });
      return {
        success: false,
        error: {
          code: 'CREATE_EVALUATION_FAILED',
          message: 'Failed to create onboarding evaluation',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get a user's evaluation
   */
  async getEvaluation(userId: string): Promise<ApiResponse<OnboardingEvaluation | null>> {
    const evaluationId = `eval_${userId}`;

    logger.database('read', this.EVALUATIONS_COLLECTION, evaluationId);

    try {
      const result = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId
      );

      return {
        success: true,
        data: result.data || null,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get evaluation', 'OnboardingService', { userId, error });
      return {
        success: false,
        error: {
          code: 'GET_EVALUATION_FAILED',
          message: 'Failed to retrieve evaluation',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Save an intake response (Front Door questions)
   */
  async saveIntakeResponse(
    evaluationId: string,
    response: IntakeResponse,
    currentIntakeScreen: number
  ): Promise<ApiResponse<void>> {
    logger.info('Saving intake response', 'OnboardingService', {
      evaluationId,
      questionId: response.questionId,
    });

    try {
      const evalResult = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId
      );

      if (!evalResult.success || !evalResult.data) {
        return {
          success: false,
          error: {
            code: 'EVALUATION_NOT_FOUND',
            message: 'Evaluation not found',
          },
          timestamp: new Date(),
        };
      }

      const evaluation = evalResult.data;
      const existingResponses = evaluation.intakeData?.responses || [];

      // Update or add response
      const updatedResponses = [...existingResponses.filter(r => r.questionId !== response.questionId), response];

      // Build partial intake data
      const intakeData: Partial<IntakeData> = {
        userId: evaluation.userId,
        role: 'goalie',
        responses: updatedResponses,
      };

      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, {
        intakeData: intakeData as IntakeData,
        // Store current screen for resume functionality
        currentQuestionIndex: currentIntakeScreen,
      });

      logger.info('Intake response saved successfully', 'OnboardingService', {
        evaluationId,
        questionId: response.questionId,
        totalResponses: updatedResponses.length,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to save intake response', 'OnboardingService', { evaluationId, error });
      return {
        success: false,
        error: {
          code: 'SAVE_INTAKE_RESPONSE_FAILED',
          message: 'Failed to save intake response',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Complete intake phase and transition to assessment
   */
  async completeIntake(evaluationId: string): Promise<ApiResponse<IntakeData>> {
    logger.info('Completing intake phase', 'OnboardingService', { evaluationId });

    try {
      const evalResult = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId
      );

      if (!evalResult.success || !evalResult.data) {
        return {
          success: false,
          error: {
            code: 'EVALUATION_NOT_FOUND',
            message: 'Evaluation not found',
          },
          timestamp: new Date(),
        };
      }

      const evaluation = evalResult.data;
      const responses = evaluation.intakeData?.responses || [];

      // Convert responses to the format expected by extraction functions
      const extractionFormat = responses.map(r => ({
        questionId: r.questionId,
        value: Array.isArray(r.value) ? r.value[0] : r.value,
      }));
      const extractionFormatMulti = responses.map(r => ({
        questionId: r.questionId,
        value: r.value,
      }));

      // Extract key data from intake responses
      const ageRange = extractAgeRange(extractionFormat);
      const experienceLevel = extractExperienceLevel(extractionFormat);
      const playingLevel = extractPlayingLevel(extractionFormat);
      const hasGoalieCoach = extractGoalieCoachStatus(extractionFormat);
      const primaryReasons = extractPrimaryReasons(extractionFormatMulti);

      const completedAt = Timestamp.now();

      const intakeData: IntakeData = {
        userId: evaluation.userId,
        role: 'goalie',
        responses,
        completedAt,
        ageRange,
        experienceLevel,
        playingLevel,
        hasGoalieCoach,
        primaryReasons,
      };

      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, {
        intakeData,
        intakeCompletedAt: completedAt,
        phase: 'bridge',
        currentCategoryIndex: 0,
        currentQuestionIndex: 0,
      });

      logger.info('Intake phase completed successfully', 'OnboardingService', {
        evaluationId,
        ageRange,
        experienceLevel,
      });

      return {
        success: true,
        data: intakeData,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to complete intake', 'OnboardingService', { evaluationId, error });
      return {
        success: false,
        error: {
          code: 'COMPLETE_INTAKE_FAILED',
          message: 'Failed to complete intake phase',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Start assessment phase (after bridge message)
   */
  async startAssessment(evaluationId: string): Promise<ApiResponse<void>> {
    logger.info('Starting assessment phase', 'OnboardingService', { evaluationId });

    try {
      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, {
        phase: 'assessment',
        assessmentStartedAt: Timestamp.now(),
        currentCategoryIndex: 0,
        currentQuestionIndex: 0,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to start assessment', 'OnboardingService', { evaluationId, error });
      return {
        success: false,
        error: {
          code: 'START_ASSESSMENT_FAILED',
          message: 'Failed to start assessment phase',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Save an assessment response with 1.0-4.0 scoring
   */
  async saveAssessmentResponse(
    evaluationId: string,
    response: AssessmentResponse,
    currentCategoryIndex: number,
    currentQuestionIndex: number
  ): Promise<ApiResponse<void>> {
    logger.info('Saving assessment response', 'OnboardingService', {
      evaluationId,
      questionId: response.questionId,
      score: response.score,
    });

    try {
      const evalResult = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId
      );

      if (!evalResult.success || !evalResult.data) {
        return {
          success: false,
          error: {
            code: 'EVALUATION_NOT_FOUND',
            message: 'Evaluation not found',
          },
          timestamp: new Date(),
        };
      }

      const evaluation = evalResult.data;
      const responses = [...evaluation.assessmentResponses];
      const existingIndex = responses.findIndex(r => r.questionId === response.questionId);

      if (existingIndex >= 0) {
        responses[existingIndex] = response;
      } else {
        responses.push(response);
      }

      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, {
        assessmentResponses: responses,
        currentCategoryIndex,
        currentQuestionIndex,
      });

      logger.info('Assessment response saved successfully', 'OnboardingService', {
        evaluationId,
        questionId: response.questionId,
        totalResponses: responses.length,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to save assessment response', 'OnboardingService', { evaluationId, error });
      return {
        success: false,
        error: {
          code: 'SAVE_ASSESSMENT_RESPONSE_FAILED',
          message: 'Failed to save assessment response',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Complete evaluation and generate intelligence profile
   */
  async completeEvaluation(userId: string): Promise<ApiResponse<IntelligenceProfile>> {
    logger.info('Completing evaluation', 'OnboardingService', { userId });

    try {
      const evaluationId = `eval_${userId}`;
      const evalResult = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId
      );

      if (!evalResult.success || !evalResult.data) {
        return {
          success: false,
          error: {
            code: 'EVALUATION_NOT_FOUND',
            message: 'Evaluation not found',
          },
          timestamp: new Date(),
        };
      }

      const evaluation = evalResult.data;
      const ageRange = evaluation.intakeData?.ageRange;

      // Generate intelligence profile
      const intelligenceProfile = generateGoalieIntelligenceProfile(
        userId,
        evaluation.assessmentResponses,
        ageRange
      );

      const completedAt = Timestamp.now();
      const duration = evaluation.assessmentStartedAt
        ? Math.round((completedAt.toMillis() - evaluation.assessmentStartedAt.toMillis()) / 1000)
        : 0;

      // Update evaluation
      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, {
        status: 'completed',
        phase: 'completed',
        completedAt,
        duration,
        intelligenceProfile,
        pacingLevel: intelligenceProfile.pacingLevel,
      });

      // Update user document
      await this.update<User>(this.USERS_COLLECTION, userId, {
        onboardingCompleted: true,
        onboardingCompletedAt: completedAt,
        initialAssessmentLevel: pacingLevelToAssessmentLevel(intelligenceProfile.pacingLevel),
      });

      // Auto-enroll student in all 8 pillars
      const pillarIds = getAllPillarIds();
      logger.info('Auto-enrolling student in pillars', 'OnboardingService', {
        userId,
        pillarCount: pillarIds.length,
        pacingLevel: intelligenceProfile.pacingLevel,
      });

      for (const pillarId of pillarIds) {
        try {
          await enrollmentService.enrollInSport(userId, pillarId);
        } catch (enrollError) {
          // Log but don't fail the whole evaluation if one enrollment fails
          logger.error('Failed to enroll in pillar', 'OnboardingService', {
            userId,
            pillarId,
            error: enrollError,
          });
        }
      }

      logger.info('Evaluation completed successfully', 'OnboardingService', {
        userId,
        pacingLevel: intelligenceProfile.pacingLevel,
        overallScore: intelligenceProfile.overallScore,
        duration,
        pillarsEnrolled: pillarIds.length,
      });

      return {
        success: true,
        data: intelligenceProfile,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to complete evaluation', 'OnboardingService', { userId, error });
      return {
        success: false,
        error: {
          code: 'COMPLETE_EVALUATION_FAILED',
          message: 'Failed to complete evaluation',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update evaluation phase
   */
  async updatePhase(
    evaluationId: string,
    phase: OnboardingEvaluation['phase'],
    additionalData: Partial<OnboardingEvaluation> = {}
  ): Promise<ApiResponse<void>> {
    try {
      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, {
        phase,
        ...additionalData,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to update phase', 'OnboardingService', { evaluationId, phase, error });
      return {
        success: false,
        error: {
          code: 'UPDATE_PHASE_FAILED',
          message: 'Failed to update phase',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Mark user's onboarding as complete (fallback method)
   */
  async markOnboardingComplete(userId: string): Promise<ApiResponse<void>> {
    logger.info('Marking onboarding complete', 'OnboardingService', { userId });

    try {
      await this.update<User>(this.USERS_COLLECTION, userId, {
        onboardingCompleted: true,
        onboardingCompletedAt: Timestamp.now(),
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to mark onboarding complete', 'OnboardingService', { userId, error });
      return {
        success: false,
        error: {
          code: 'MARK_COMPLETE_FAILED',
          message: 'Failed to mark onboarding as complete',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get students with pending evaluation reviews (for coaches)
   */
  async getPendingReviews(coachId?: string): Promise<ApiResponse<EvaluationSummary[]>> {
    logger.info('Getting pending reviews', 'OnboardingService', { coachId });

    try {
      // Get all completed evaluations without coach review
      const evaluationsResult = await this.query<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        {
          where: [{ field: 'status', operator: '==', value: 'completed' }],
        }
      );

      if (!evaluationsResult.success || !evaluationsResult.data) {
        return {
          success: false,
          error: evaluationsResult.error,
          timestamp: new Date(),
        };
      }

      // Filter to only those without coach review
      const pendingEvaluations = evaluationsResult.data.items.filter(
        e => !e.coachReview
      );

      // Get user info for each evaluation
      const summaries: EvaluationSummary[] = [];

      for (const evaluation of pendingEvaluations) {
        const userResult = await this.getById<User>(this.USERS_COLLECTION, evaluation.userId);
        if (!userResult.success || !userResult.data) continue;

        const user = userResult.data;

        // If coachId provided, filter by assigned students
        if (coachId && user.assignedCoachId !== coachId) continue;

        summaries.push({
          evaluationId: evaluation.id,
          userId: evaluation.userId,
          studentName: user.displayName,
          studentEmail: user.email,
          completedAt: evaluation.completedAt!,
          pacingLevel: evaluation.pacingLevel || 'introduction',
          overallScore: evaluation.intelligenceProfile?.overallScore || 0,
          hasCoachReview: false,
        });
      }

      return {
        success: true,
        data: summaries,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get pending reviews', 'OnboardingService', { coachId, error });
      return {
        success: false,
        error: {
          code: 'GET_PENDING_REVIEWS_FAILED',
          message: 'Failed to retrieve pending reviews',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Add coach review to an evaluation
   */
  async addCoachReview(input: CoachReviewInput): Promise<ApiResponse<void>> {
    logger.info('Adding coach review', 'OnboardingService', {
      evaluationId: input.evaluationId,
      coachId: input.coachId,
    });

    try {
      const evalResult = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        input.evaluationId
      );

      if (!evalResult.success || !evalResult.data) {
        return {
          success: false,
          error: {
            code: 'EVALUATION_NOT_FOUND',
            message: 'Evaluation not found',
          },
          timestamp: new Date(),
        };
      }

      const coachReview = {
        reviewedAt: Timestamp.now(),
        reviewedBy: input.coachId,
        reviewerName: input.coachName,
        notes: input.notes,
        adjustedLevel: input.adjustedLevel,
        adjustedPacingLevel: input.adjustedPacingLevel,
      };

      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, input.evaluationId, {
        status: 'reviewed',
        coachReview,
      });

      // If level was adjusted, update user's initial assessment level
      if (input.adjustedLevel) {
        const evaluation = evalResult.data;
        await this.update<User>(this.USERS_COLLECTION, evaluation.userId, {
          initialAssessmentLevel: input.adjustedLevel,
        });
      }

      logger.info('Coach review added successfully', 'OnboardingService', {
        evaluationId: input.evaluationId,
        coachId: input.coachId,
        adjustedLevel: input.adjustedLevel,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to add coach review', 'OnboardingService', {
        evaluationId: input.evaluationId,
        error,
      });
      return {
        success: false,
        error: {
          code: 'ADD_REVIEW_FAILED',
          message: 'Failed to add coach review',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get evaluation by ID
   */
  async getEvaluationById(evaluationId: string): Promise<ApiResponse<OnboardingEvaluation | null>> {
    logger.database('read', this.EVALUATIONS_COLLECTION, evaluationId);

    try {
      const result = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId
      );

      return {
        success: true,
        data: result.data || null,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get evaluation by ID', 'OnboardingService', {
        evaluationId,
        error,
      });
      return {
        success: false,
        error: {
          code: 'GET_EVALUATION_FAILED',
          message: 'Failed to retrieve evaluation',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Create a new parent evaluation
   */
  async createParentEvaluation(userId: string): Promise<ApiResponse<OnboardingEvaluation>> {
    logger.info('Creating parent onboarding evaluation', 'OnboardingService', { userId });

    try {
      const evaluationId = `eval_parent_${userId}`;

      // Check if evaluation already exists
      try {
        const existingResult = await this.getById<OnboardingEvaluation>(
          this.EVALUATIONS_COLLECTION,
          evaluationId
        );
        if (existingResult.success && existingResult.data) {
          return {
            success: true,
            data: existingResult.data,
            timestamp: new Date(),
          };
        }
      } catch {
        // No existing evaluation, continue creating
      }

      const now = Timestamp.now();

      const evaluationData: Omit<OnboardingEvaluation, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        role: 'parent',
        phase: 'intake',
        currentCategoryIndex: 0,
        currentQuestionIndex: 0,
        assessmentResponses: [],
        status: 'in_progress',
      };

      await this.createWithId<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId,
        evaluationData
      );

      const evaluation: OnboardingEvaluation = {
        id: evaluationId,
        ...evaluationData,
        createdAt: now,
        updatedAt: now,
      };

      return {
        success: true,
        data: evaluation,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to create parent evaluation', 'OnboardingService', { userId, error });
      return {
        success: false,
        error: {
          code: 'CREATE_PARENT_EVALUATION_FAILED',
          message: 'Failed to create parent onboarding evaluation',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get a parent's evaluation
   */
  async getParentEvaluation(userId: string): Promise<ApiResponse<OnboardingEvaluation | null>> {
    const evaluationId = `eval_parent_${userId}`;

    try {
      const result = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId
      );

      return {
        success: true,
        data: result.data || null,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get parent evaluation', 'OnboardingService', { userId, error });
      return {
        success: false,
        error: {
          code: 'GET_PARENT_EVALUATION_FAILED',
          message: 'Failed to retrieve parent evaluation',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Complete parent intake phase (simplified — no goalie-specific extraction)
   */
  async completeParentIntake(evaluationId: string): Promise<ApiResponse<IntakeData>> {
    logger.info('Completing parent intake phase', 'OnboardingService', { evaluationId });

    try {
      const evalResult = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId
      );

      if (!evalResult.success || !evalResult.data) {
        return {
          success: false,
          error: { code: 'EVALUATION_NOT_FOUND', message: 'Evaluation not found' },
          timestamp: new Date(),
        };
      }

      const evaluation = evalResult.data;
      const responses = evaluation.intakeData?.responses || [];
      const completedAt = Timestamp.now();

      const intakeData: IntakeData = {
        userId: evaluation.userId,
        role: 'parent',
        responses,
        completedAt,
      };

      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, {
        intakeData,
        intakeCompletedAt: completedAt,
        phase: 'bridge',
        currentCategoryIndex: 0,
        currentQuestionIndex: 0,
      });

      return {
        success: true,
        data: intakeData,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to complete parent intake', 'OnboardingService', { evaluationId, error });
      return {
        success: false,
        error: { code: 'COMPLETE_PARENT_INTAKE_FAILED', message: 'Failed to complete parent intake' },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Complete parent evaluation and generate intelligence profile
   */
  async completeParentEvaluation(userId: string): Promise<ApiResponse<IntelligenceProfile>> {
    logger.info('Completing parent evaluation', 'OnboardingService', { userId });

    try {
      const evaluationId = `eval_parent_${userId}`;
      const evalResult = await this.getById<OnboardingEvaluation>(
        this.EVALUATIONS_COLLECTION,
        evaluationId
      );

      if (!evalResult.success || !evalResult.data) {
        return {
          success: false,
          error: { code: 'EVALUATION_NOT_FOUND', message: 'Evaluation not found' },
          timestamp: new Date(),
        };
      }

      const evaluation = evalResult.data;

      // Generate intelligence profile using parent questions and weights
      const intelligenceProfile = generateIntelligenceProfile(
        userId,
        'parent',
        evaluation.assessmentResponses,
        PARENT_ASSESSMENT_QUESTIONS,
      );

      const completedAt = Timestamp.now();
      const duration = evaluation.assessmentStartedAt
        ? Math.round((completedAt.toMillis() - evaluation.assessmentStartedAt.toMillis()) / 1000)
        : 0;

      // Update evaluation
      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, {
        status: 'completed',
        phase: 'completed',
        completedAt,
        duration,
        intelligenceProfile,
        pacingLevel: intelligenceProfile.pacingLevel,
      });

      // Update user document — mark parent onboarding complete
      await this.update<User>(this.USERS_COLLECTION, userId, {
        parentOnboardingComplete: true,
      });

      logger.info('Parent evaluation completed successfully', 'OnboardingService', {
        userId,
        overallScore: intelligenceProfile.overallScore,
        duration,
      });

      return {
        success: true,
        data: intelligenceProfile,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to complete parent evaluation', 'OnboardingService', { userId, error });
      return {
        success: false,
        error: { code: 'COMPLETE_PARENT_EVALUATION_FAILED', message: 'Failed to complete parent evaluation' },
        timestamp: new Date(),
      };
    }
  }

  // ─────────────────────────────────────────────
  // COACH EVALUATION METHODS
  // ─────────────────────────────────────────────

  async createCoachEvaluation(userId: string): Promise<ApiResponse<OnboardingEvaluation>> {
    try {
      const evaluationId = `eval_coach_${userId}`;
      try {
        const existing = await this.getById<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId);
        if (existing.success && existing.data) return { success: true, data: existing.data, timestamp: new Date() };
      } catch { /* no existing eval */ }

      const now = Timestamp.now();
      const evaluationData: Omit<OnboardingEvaluation, 'id' | 'createdAt' | 'updatedAt'> = {
        userId, role: 'coach', phase: 'intake', currentCategoryIndex: 0, currentQuestionIndex: 0, assessmentResponses: [], status: 'in_progress',
      };
      await this.createWithId<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, evaluationData);
      return { success: true, data: { id: evaluationId, ...evaluationData, createdAt: now, updatedAt: now }, timestamp: new Date() };
    } catch (error) {
      logger.error('Failed to create coach evaluation', 'OnboardingService', { userId, error });
      return { success: false, error: { code: 'CREATE_COACH_EVALUATION_FAILED', message: 'Failed to create coach evaluation' }, timestamp: new Date() };
    }
  }

  async getCoachEvaluation(userId: string): Promise<ApiResponse<OnboardingEvaluation | null>> {
    try {
      const result = await this.getById<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, `eval_coach_${userId}`);
      return { success: true, data: result.data || null, timestamp: new Date() };
    } catch (error) {
      logger.error('Failed to get coach evaluation', 'OnboardingService', { userId, error });
      return { success: false, error: { code: 'GET_COACH_EVALUATION_FAILED', message: 'Failed to retrieve coach evaluation' }, timestamp: new Date() };
    }
  }

  async completeCoachIntake(evaluationId: string): Promise<ApiResponse<IntakeData>> {
    try {
      const evalResult = await this.getById<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId);
      if (!evalResult.success || !evalResult.data) {
        return { success: false, error: { code: 'EVALUATION_NOT_FOUND', message: 'Evaluation not found' }, timestamp: new Date() };
      }
      const evaluation = evalResult.data;
      const completedAt = Timestamp.now();
      const intakeData: IntakeData = { userId: evaluation.userId, role: 'coach', responses: evaluation.intakeData?.responses || [], completedAt };
      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, { intakeData, intakeCompletedAt: completedAt, phase: 'bridge', currentCategoryIndex: 0, currentQuestionIndex: 0 });
      return { success: true, data: intakeData, timestamp: new Date() };
    } catch (error) {
      logger.error('Failed to complete coach intake', 'OnboardingService', { evaluationId, error });
      return { success: false, error: { code: 'COMPLETE_COACH_INTAKE_FAILED', message: 'Failed to complete coach intake' }, timestamp: new Date() };
    }
  }

  async completeCoachEvaluation(userId: string): Promise<ApiResponse<IntelligenceProfile>> {
    try {
      const evaluationId = `eval_coach_${userId}`;
      const evalResult = await this.getById<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId);
      if (!evalResult.success || !evalResult.data) {
        return { success: false, error: { code: 'EVALUATION_NOT_FOUND', message: 'Evaluation not found' }, timestamp: new Date() };
      }
      const evaluation = evalResult.data;
      const { COACH_ASSESSMENT_QUESTIONS: coachQs } = await import('@/data/coach-assessment-questions');
      const intelligenceProfile = generateIntelligenceProfile(userId, 'coach', evaluation.assessmentResponses, coachQs);
      const completedAt = Timestamp.now();
      const duration = evaluation.assessmentStartedAt ? Math.round((completedAt.toMillis() - evaluation.assessmentStartedAt.toMillis()) / 1000) : 0;
      await this.update<OnboardingEvaluation>(this.EVALUATIONS_COLLECTION, evaluationId, { status: 'completed', phase: 'completed', completedAt, duration, intelligenceProfile, pacingLevel: intelligenceProfile.pacingLevel });
      await this.update<User>(this.USERS_COLLECTION, userId, { coachOnboardingComplete: true } as Partial<User>);
      return { success: true, data: intelligenceProfile, timestamp: new Date() };
    } catch (error) {
      logger.error('Failed to complete coach evaluation', 'OnboardingService', { userId, error });
      return { success: false, error: { code: 'COMPLETE_COACH_EVALUATION_FAILED', message: 'Failed to complete coach evaluation' }, timestamp: new Date() };
    }
  }

}

// Export singleton instance
export const onboardingService = new OnboardingService();
