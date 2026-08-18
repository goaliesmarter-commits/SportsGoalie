import { BaseDatabaseService } from '../base.service';
import {
  VideoQuiz,
  VideoQuizProgress,
  VideoQuizMetadata,
  ApiResponse,
  PaginatedResponse,
  QueryOptions,
  WhereClause,
  Skill,
  VideoTagFilter,
  VideoStructuredTags,
  TagFacetCounts,
  buildTagIndex,
  SYSTEM_TAGS,
  USER_TYPE_TAGS,
  ANGLE_MARKER_TAGS,
  ARCH_LEVEL_TAGS,
  PillarTag,
  SystemTag,
  UserTypeTag,
  AngleMarkerTag,
  ArchLevelTag,
} from '@/types';
import { PILLARS } from '@/types/onboarding';
import { logger } from '../../utils/logger';
import { Timestamp } from 'firebase/firestore';

/**
 * Service for managing video quizzes and student progress in the Smarter Goalie application.
 *
 * This service provides comprehensive functionality for:
 * - CRUD operations for video quizzes
 * - Video quiz progress tracking
 * - Video quiz analytics and reporting
 * - Real-time subscriptions for progress updates
 *
 * @example
 * ```typescript
 * // Create a new video quiz
 * const result = await videoQuizService.createVideoQuiz({
 *   title: 'Shooting Form Analysis',
 *   videoUrl: 'https://storage.../video.mp4',
 *   videoDuration: 480,
 *   skillId: 'shooting-technique',
 *   sportId: 'basketball',
 *   questions: [...],
 *   settings: {...}
 * });
 *
 * // Get user progress
 * const progress = await videoQuizService.getUserProgress('user123', 'quiz456');
 * ```
 */
export class VideoQuizService extends BaseDatabaseService {
  private readonly VIDEO_QUIZZES_COLLECTION = 'video_quizzes';
  private readonly VIDEO_QUIZ_PROGRESS_COLLECTION = 'video_quiz_progress';

  // Video Quiz CRUD operations

  /**
   * Creates a new video quiz in the database.
   */
  async createVideoQuiz(
    quiz: Omit<VideoQuiz, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>
  ): Promise<ApiResponse<{ id: string }>> {
    logger.database('create', this.VIDEO_QUIZZES_COLLECTION, undefined, {
      title: quiz.title,
      skillId: quiz.skillId,
      sportId: quiz.sportId,
    });

    // For coach-created quizzes, sport/skill validation is optional
    const isCoachContent = quiz.source === 'coach';

    // Validate required fields (skip for coach content)
    if (!isCoachContent) {
      if (!quiz.sportId || quiz.sportId.trim() === '') {
        logger.warn('Video quiz creation failed: sportId is required', 'VideoQuizService', {
          quizTitle: quiz.title,
        });
        return {
          success: false,
          error: {
            code: 'SPORT_ID_REQUIRED',
            message: 'Every video quiz must be associated with a valid sport',
          },
          timestamp: new Date(),
        };
      }

      if (!quiz.skillId || quiz.skillId.trim() === '') {
        logger.warn('Video quiz creation failed: skillId is required', 'VideoQuizService', {
          quizTitle: quiz.title,
        });
        return {
          success: false,
          error: {
            code: 'SKILL_ID_REQUIRED',
            message: 'Every video quiz must be associated with a valid skill',
          },
          timestamp: new Date(),
        };
      }
    }

    if (!quiz.videoUrl || quiz.videoUrl.trim() === '') {
      return {
        success: false,
        error: {
          code: 'VIDEO_URL_REQUIRED',
          message: 'Video URL is required for video quizzes',
        },
        timestamp: new Date(),
      };
    }

    try {
      // Verify sport and skill exist (skip for coach-created content)
      if (!isCoachContent) {
        // Verify sport exists
        const sportExists = await this.documentExists('sports', quiz.sportId);
        if (!sportExists) {
          logger.warn('Video quiz creation failed: sport not found', 'VideoQuizService', {
            sportId: quiz.sportId,
          });
          return {
            success: false,
            error: {
              code: 'SPORT_NOT_FOUND',
              message: `Sport with ID '${quiz.sportId}' does not exist`,
            },
            timestamp: new Date(),
          };
        }

        // Verify skill exists and belongs to the sport
        const skill = await this.getDocument<Skill>('skills', quiz.skillId);
        if (!skill) {
          logger.warn('Video quiz creation failed: skill not found', 'VideoQuizService', {
            skillId: quiz.skillId,
          });
          return {
            success: false,
            error: {
              code: 'SKILL_NOT_FOUND',
              message: `Skill with ID '${quiz.skillId}' does not exist`,
            },
            timestamp: new Date(),
          };
        }

        if (skill.sportId !== quiz.sportId) {
          logger.warn('Video quiz creation failed: skill does not belong to sport', 'VideoQuizService', {
            skillId: quiz.skillId,
            skillSportId: skill.sportId,
            quizSportId: quiz.sportId,
          });
          return {
            success: false,
            error: {
              code: 'SKILL_SPORT_MISMATCH',
              message: `Skill '${quiz.skillId}' does not belong to sport '${quiz.sportId}'`,
            },
            timestamp: new Date(),
          };
        }
      }

      // Initialize metadata
      const metadata: VideoQuizMetadata = {
        totalAttempts: 0,
        totalCompletions: 0,
        averageScore: 0,
        averageTimeSpent: 0,
        averageCompletionTime: 0,
        dropOffPoints: [],
      };

      // Create the video quiz
      const now = Timestamp.now();

      // Build tag index if structured tags are provided
      const _tagIndex = quiz.structuredTags ? buildTagIndex(quiz.structuredTags) : [];

      const videoQuizData = {
        ...quiz,
        _tagIndex,
        metadata,
        createdAt: now,
        updatedAt: now,
      };

      // DEBUG: Log the exact data being sent to Firestore
      console.log('📦 [VideoQuizService] Preparing to save quiz:', {
        hasQuestions: !!videoQuizData.questions,
        questionsCount: videoQuizData.questions?.length,
        questionsIsArray: Array.isArray(videoQuizData.questions),
        firstQuestion: videoQuizData.questions?.[0],
        questionsField: videoQuizData.questions,
      });

      logger.debug('Creating video quiz with data', 'VideoQuizService', {
        videoQuizData: JSON.stringify(videoQuizData, (key, value) => {
          if (value === undefined) {
            return `[UNDEFINED_FIELD: ${key}]`;
          }
          return value;
        }, 2),
        undefinedFields: Object.keys(videoQuizData).filter(key => (videoQuizData as Record<string, unknown>)[key] === undefined),
      });

      // Check for undefined fields
      const undefinedFields = Object.keys(videoQuizData).filter(key => (videoQuizData as Record<string, unknown>)[key] === undefined);
      if (undefinedFields.length > 0) {
        logger.error('Found undefined fields in video quiz data', 'VideoQuizService', {
          error: 'Undefined fields detected',
          undefinedFields,
          allFields: Object.keys(videoQuizData),
        });
      }

      const docId = await this.addDocument(this.VIDEO_QUIZZES_COLLECTION, videoQuizData);

      // DEBUG: Verify what was saved
      console.log('✅ [VideoQuizService] Quiz created with ID:', docId);

      // Immediately read it back to verify
      const verifyQuiz = await this.getDocument<VideoQuiz>(this.VIDEO_QUIZZES_COLLECTION, docId);
      console.log('🔄 [VideoQuizService] Verification read after create:', {
        docId,
        hasQuiz: !!verifyQuiz,
        hasQuestions: !!verifyQuiz?.questions,
        questionsCount: verifyQuiz?.questions?.length,
        firstQuestion: verifyQuiz?.questions?.[0],
      });

      logger.info('Video quiz created successfully', 'VideoQuizService', {
        quizId: docId,
        title: quiz.title,
        questionsCount: verifyQuiz?.questions?.length || 0,
      });

      return {
        success: true,
        data: { id: docId },
        timestamp: new Date(),
      };
    } catch (error: any) {
      // Extract all available error information
      const errorMessage = error?.message || error?.code || String(error);
      const errorCode = error?.code || 'VIDEO_QUIZ_CREATE_FAILED';
      const errorName = error?.name || 'Unknown';

      // Log to console for debugging
      console.error('❌ [VideoQuizService] Firestore error creating quiz:', {
        message: errorMessage,
        code: errorCode,
        name: errorName,
        fullError: error,
      });

      logger.error('Failed to create video quiz', 'VideoQuizService', {
        errorMessage,
        errorCode,
        errorName,
        title: quiz.title,
        sportId: quiz.sportId,
        skillId: quiz.skillId,
        source: (quiz as any).source,
        createdBy: quiz.createdBy,
      });

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage || 'Failed to create video quiz',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Retrieves a video quiz by ID.
   */
  async getVideoQuiz(quizId: string): Promise<ApiResponse<VideoQuiz | null>> {
    logger.database('read', this.VIDEO_QUIZZES_COLLECTION, quizId);

    try {
      const quiz = await this.getDocument<VideoQuiz>(this.VIDEO_QUIZZES_COLLECTION, quizId);

      if (!quiz) {
        return {
          success: true,
          data: null,
          timestamp: new Date(),
        };
      }

      // DEBUG: Log what was fetched from Firestore
      console.log('🔍 [VideoQuizService] Raw quiz from Firestore:', {
        quizId,
        hasQuestions: !!quiz.questions,
        questionsIsArray: Array.isArray(quiz.questions),
        questionsLength: quiz.questions?.length,
        questionsType: typeof quiz.questions,
        firstQuestion: quiz.questions?.[0],
        allFields: Object.keys(quiz),
        rawQuestions: quiz.questions,
      });

      // Ensure questions field exists and is an array
      if (!quiz.questions) {
        console.warn('⚠️ Quiz has no questions field, initializing as empty array');
        quiz.questions = [];
      } else if (!Array.isArray(quiz.questions)) {
        console.warn('⚠️ Questions field is not an array:', typeof quiz.questions);
        // Try to convert if it's an object with numeric keys (like from Firestore)
        if (typeof quiz.questions === 'object') {
          const questionsArray = Object.values(quiz.questions);
          console.log('📋 Converting questions object to array:', questionsArray);
          quiz.questions = questionsArray as any;
        } else {
          quiz.questions = [];
        }
      }

      // Ensure each question has required fields
      quiz.questions = quiz.questions.map((q: any, index: number) => {
        // Make sure question has an ID
        if (!q.id) {
          q.id = `q_${quizId}_${index}`;
        }
        // Make sure question has points
        if (q.points === undefined || q.points === null) {
          q.points = q.reflective ? 0 : 10; // Default points — reflective ones score nothing
        }
        // Make sure question has required field
        if (q.required === undefined) {
          q.required = true;
        }
        return q;
      });

      logger.debug('Video quiz processed', 'VideoQuizService', {
        quizId,
        finalQuestionsCount: quiz.questions.length,
      });

      return {
        success: true,
        data: quiz,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch video quiz', 'VideoQuizService', { error: error instanceof Error ? error.message : String(error), quizId });
      return {
        success: false,
        error: {
          code: 'VIDEO_QUIZ_FETCH_FAILED',
          message: 'Failed to fetch video quiz',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Updates a video quiz.
   */
  async updateVideoQuiz(
    quizId: string,
    updates: Partial<Omit<VideoQuiz, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<ApiResponse<void>> {
    logger.database('update', this.VIDEO_QUIZZES_COLLECTION, quizId, updates);

    // Debug logging
    console.log('🔧 [VideoQuizService] updateVideoQuiz called:', {
      quizId,
      updatesKeys: Object.keys(updates),
      questionsCount: updates.questions?.length,
      settingsKeys: updates.settings ? Object.keys(updates.settings) : [],
      settings: updates.settings,
    });

    try {
      // Build tag index if structured tags are being updated
      const _tagIndex = updates.structuredTags ? buildTagIndex(updates.structuredTags) : undefined;

      const updateData = {
        ...updates,
        ...(_tagIndex !== undefined && { _tagIndex }),
        updatedAt: Timestamp.now(),
      };

      console.log('📦 [VideoQuizService] Calling updateDocument with:', {
        collection: this.VIDEO_QUIZZES_COLLECTION,
        quizId,
        dataKeys: Object.keys(updateData),
        hasStructuredTags: !!updates.structuredTags,
      });

      await this.updateDocument(this.VIDEO_QUIZZES_COLLECTION, quizId, updateData);

      console.log('✅ [VideoQuizService] Update successful');
      logger.info('Video quiz updated successfully', 'VideoQuizService', { quizId });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ [VideoQuizService] Update failed with error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined,
      });

      logger.error('Failed to update video quiz', 'VideoQuizService', { error: error instanceof Error ? error.message : String(error), quizId });
      return {
        success: false,
        error: {
          code: 'VIDEO_QUIZ_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update video quiz',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Deletes a video quiz.
   */
  async deleteVideoQuiz(quizId: string): Promise<ApiResponse<void>> {
    logger.database('delete', this.VIDEO_QUIZZES_COLLECTION, quizId);

    try {
      await this.deleteDocument(this.VIDEO_QUIZZES_COLLECTION, quizId);

      logger.info('Video quiz deleted successfully', 'VideoQuizService', { quizId });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to delete video quiz', 'VideoQuizService', { error: error instanceof Error ? error.message : String(error), quizId });
      return {
        success: false,
        error: {
          code: 'VIDEO_QUIZ_DELETE_FAILED',
          message: 'Failed to delete video quiz',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets all video quizzes (for admin).
   */
  async getVideoQuizzes(
    options?: QueryOptions
  ): Promise<ApiResponse<PaginatedResponse<VideoQuiz>>> {
    logger.database('query', this.VIDEO_QUIZZES_COLLECTION, undefined, { admin: true });

    try {
      const result = await this.query<VideoQuiz>(
        this.VIDEO_QUIZZES_COLLECTION,
        options || {}
      );

      if (!result.success) {
        logger.error('Query failed', 'VideoQuizService', result.error);
        return result;
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch video quizzes', 'VideoQuizService', error as Error);
      return {
        success: false,
        error: {
          code: 'VIDEO_QUIZZES_FETCH_FAILED',
          message: 'Failed to fetch video quizzes',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets all published video quizzes (for students).
   */
  async getPublishedVideoQuizzes(
    options?: QueryOptions
  ): Promise<ApiResponse<PaginatedResponse<VideoQuiz>>> {
    logger.database('query', this.VIDEO_QUIZZES_COLLECTION, undefined, { published: true });

    try {
      const whereConditions = [
        { field: 'isActive', operator: '==' as const, value: true },
        { field: 'isPublished', operator: '==' as const, value: true },
      ];

      const result = await this.query<VideoQuiz>(
        this.VIDEO_QUIZZES_COLLECTION,
        {
          ...options,
          where: [...(options?.where || []), ...whereConditions],
        }
      );

      if (!result.success) {
        logger.error('Query failed', 'VideoQuizService', result.error);
        return result;
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch published video quizzes', 'VideoQuizService', error as Error);
      return {
        success: false,
        error: {
          code: 'VIDEO_QUIZZES_FETCH_FAILED',
          message: 'Failed to fetch published video quizzes',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets video quizzes by sport.
   */
  async getQuizzesBySport(
    sportId: string,
    options?: QueryOptions
  ): Promise<ApiResponse<PaginatedResponse<VideoQuiz>>> {
    logger.database('query', this.VIDEO_QUIZZES_COLLECTION, undefined, { sportId });

    try {
      const result = await this.query<VideoQuiz>(
        this.VIDEO_QUIZZES_COLLECTION,
        {
          ...options,
          where: [
            ...(options?.where || []),
            { field: 'sportId', operator: '==' as const, value: sportId },
            { field: 'isActive', operator: '==' as const, value: true },
          ],
        }
      );

      if (!result.success) {
        logger.error('Query failed', 'VideoQuizService', result.error);
        return result;
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch video quizzes by sport', 'VideoQuizService', { error: error instanceof Error ? error.message : String(error), sportId });
      return {
        success: false,
        error: {
          code: 'VIDEO_QUIZZES_FETCH_FAILED',
          message: 'Failed to fetch video quizzes by sport',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets video quizzes by skill.
   */
  async getVideoQuizzesBySkill(
    skillId: string,
    options?: QueryOptions
  ): Promise<ApiResponse<PaginatedResponse<VideoQuiz>>> {
    logger.database('query', this.VIDEO_QUIZZES_COLLECTION, undefined, { skillId });

    try {
      const result = await this.query<VideoQuiz>(
        this.VIDEO_QUIZZES_COLLECTION,
        {
          ...options,
          where: [
            ...(options?.where || []),
            { field: 'skillId', operator: '==' as const, value: skillId },
            { field: 'isActive', operator: '==' as const, value: true },
          ],
        }
      );

      if (!result.success) {
        logger.error('Query failed', 'VideoQuizService', result.error);
        return result;
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch video quizzes by skill', 'VideoQuizService', { error: error instanceof Error ? error.message : String(error), skillId });
      return {
        success: false,
        error: {
          code: 'VIDEO_QUIZZES_FETCH_FAILED',
          message: 'Failed to fetch video quizzes by skill',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  // Progress Management

  /**
   * Gets or creates user progress for a video quiz.
   */
  async getUserProgress(
    userId: string,
    quizId: string
  ): Promise<ApiResponse<VideoQuizProgress>> {
    logger.database('read', this.VIDEO_QUIZ_PROGRESS_COLLECTION, `progress_${userId}_${quizId}`);

    try {
      const progressId = `progress_${userId}_${quizId}`;
      let progress = await this.getDocument<VideoQuizProgress>(
        this.VIDEO_QUIZ_PROGRESS_COLLECTION,
        progressId
      );

      if (!progress) {
        // Get quiz to initialize progress
        const quizResult = await this.getVideoQuiz(quizId);
        if (!quizResult.success || !quizResult.data) {
          return {
            success: false,
            error: {
              code: 'VIDEO_QUIZ_NOT_FOUND',
              message: 'Video quiz not found',
            },
            timestamp: new Date(),
          };
        }

        const quiz = quizResult.data;

        // Create initial progress
        progress = {
          id: progressId,
          userId,
          videoQuizId: quizId,
          skillId: quiz.skillId,
          sportId: quiz.sportId,
          currentTime: 0,
          questionsAnswered: [],
          questionsRemaining: quiz.questions.length,
          score: 0,
          // Reflective questions are unscored, so they must not count toward the
          // total available — see VideoQuizQuestion.reflective.
          maxScore: quiz.questions.reduce((sum, q) => sum + (q.reflective ? 0 : q.points), 0),
          percentage: 0,
          isCompleted: false,
          status: 'in-progress',
          startedAt: Timestamp.now(),
          watchTime: 0,
          totalTimeSpent: 0,
        };

        await this.setDocument(this.VIDEO_QUIZ_PROGRESS_COLLECTION, progressId, progress);
        logger.info('Video quiz progress initialized', 'VideoQuizService', {
          userId,
          quizId,
        });
      }

      return {
        success: true,
        data: progress,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get user progress', 'VideoQuizService', { error: error instanceof Error ? error.message : String(error), userId, quizId });
      return {
        success: false,
        error: {
          code: 'PROGRESS_FETCH_FAILED',
          message: 'Failed to get user progress',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Saves user progress.
   */
  async saveProgress(progress: VideoQuizProgress): Promise<ApiResponse<void>> {
    logger.database('update', this.VIDEO_QUIZ_PROGRESS_COLLECTION, progress.id, {
      currentTime: progress.currentTime,
      questionsAnswered: progress.questionsAnswered.length,
    });

    try {
      await this.setDocument(this.VIDEO_QUIZ_PROGRESS_COLLECTION, progress.id, {
        ...progress,
        lastAccessedAt: Timestamp.now(),
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to save progress', 'VideoQuizService', { error: error instanceof Error ? error.message : String(error), progressId: progress.id });
      return {
        success: false,
        error: {
          code: 'PROGRESS_SAVE_FAILED',
          message: 'Failed to save progress',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Completes a video quiz attempt.
   */
  async completeQuiz(progress: VideoQuizProgress): Promise<ApiResponse<void>> {
    logger.database('update', this.VIDEO_QUIZ_PROGRESS_COLLECTION, progress.id, {
      completed: true,
    });

    try {
      const completedProgress = {
        ...progress,
        isCompleted: true,
        status: 'submitted' as const,
        completedAt: Timestamp.now(),
        lastAccessedAt: Timestamp.now(),
      };

      await this.setDocument(
        this.VIDEO_QUIZ_PROGRESS_COLLECTION,
        progress.id,
        completedProgress
      );

      logger.info('Video quiz completed', 'VideoQuizService', {
        progressId: progress.id,
        score: progress.percentage,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to complete quiz', 'VideoQuizService', { error: error instanceof Error ? error.message : String(error), progressId: progress.id });
      return {
        success: false,
        error: {
          code: 'QUIZ_COMPLETE_FAILED',
          message: 'Failed to complete quiz',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets user's video quiz attempts with filters.
   */
  async getUserVideoQuizAttempts(
    userId: string,
    filters?: {
      videoQuizId?: string;
      skillId?: string;
      sportId?: string;
      completed?: boolean;
      limit?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<VideoQuizProgress>>> {
    logger.database('query', this.VIDEO_QUIZ_PROGRESS_COLLECTION, undefined, {
      userId,
      filters,
    });

    try {
      const whereConditions: WhereClause[] = [
        { field: 'userId', operator: '==', value: userId }
      ];

      if (filters?.videoQuizId) {
        whereConditions.push({ field: 'videoQuizId', operator: '==', value: filters.videoQuizId });
      }

      if (filters?.skillId) {
        whereConditions.push({ field: 'skillId', operator: '==', value: filters.skillId });
      }

      if (filters?.sportId) {
        whereConditions.push({ field: 'sportId', operator: '==', value: filters.sportId });
      }

      if (filters?.completed !== undefined) {
        whereConditions.push({ field: 'isCompleted', operator: '==', value: filters.completed });
      }

      const queryOptions: QueryOptions = {
        where: whereConditions,
        limit: filters?.limit || 10,
      };

      const result = await this.query<VideoQuizProgress>(
        this.VIDEO_QUIZ_PROGRESS_COLLECTION,
        queryOptions
      );

      if (result.success && result.data) {
        result.data.items = [...result.data.items].sort((a, b) => {
          const aMs = a.completedAt?.toMillis?.() ?? a.startedAt?.toMillis?.() ?? 0;
          const bMs = b.completedAt?.toMillis?.() ?? b.startedAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch user video quiz attempts', 'VideoQuizService', { error: error instanceof Error ? error.message : String(error), userId, filters });
      return {
        success: false,
        error: {
          code: 'USER_VIDEO_QUIZ_ATTEMPTS_FETCH_FAILED',
          message: 'Failed to fetch user video quiz attempts',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  // ==========================================
  // TAG-BASED QUERY METHODS
  // ==========================================

  /**
   * Gets video quizzes filtered by structured tags.
   * Uses _tagIndex field for efficient Firestore queries.
   *
   * Note: Due to Firestore limitations, we can only use one array-contains-any
   * per query. For complex multi-category filters, we do client-side filtering.
   */
  async getVideoQuizzesByTags(
    filter: VideoTagFilter,
    options?: QueryOptions
  ): Promise<ApiResponse<PaginatedResponse<VideoQuiz>>> {
    logger.database('query', this.VIDEO_QUIZZES_COLLECTION, undefined, { filter });

    try {
      // Build query conditions
      const whereConditions: WhereClause[] = [
        { field: 'isActive', operator: '==', value: true },
        { field: 'isPublished', operator: '==', value: true },
        ...(options?.where || []),
      ];

      // Determine if we can use a single array-contains-any query
      // Firestore only allows one array-contains-any per query
      const tagValues: string[] = [];

      // Prioritize: pick the most specific filter category to query on
      if (filter.pillars?.length) {
        filter.pillars.forEach(p => tagValues.push(`pillar:${p}`));
      } else if (filter.systems?.length) {
        filter.systems.forEach(s => tagValues.push(`system:${s}`));
      } else if (filter.userTypes?.length) {
        filter.userTypes.forEach(u => tagValues.push(`user:${u}`));
      } else if (filter.angleMarkers?.length) {
        filter.angleMarkers.forEach(m => tagValues.push(`am:${m}`));
      } else if (filter.archLevels?.length) {
        filter.archLevels.forEach(l => tagValues.push(`level:${l}`));
      }

      // If we have tag values, add array-contains-any query
      if (tagValues.length > 0) {
        whereConditions.push({
          field: '_tagIndex',
          operator: 'array-contains-any',
          value: tagValues.slice(0, 10), // Firestore limit
        });
      }

      const result = await this.query<VideoQuiz>(
        this.VIDEO_QUIZZES_COLLECTION,
        {
          ...options,
          where: whereConditions,
        }
      );

      if (!result.success || !result.data) {
        return result;
      }

      // Client-side filtering for additional categories not covered by query
      let filteredItems = result.data.items;

      // Apply remaining filters client-side
      if (filter.pillars?.length && tagValues[0]?.startsWith('pillar:') === false) {
        filteredItems = filteredItems.filter(quiz =>
          quiz.structuredTags?.pillar && filter.pillars!.includes(quiz.structuredTags.pillar)
        );
      }

      if (filter.systems?.length && !tagValues.some(t => t.startsWith('system:'))) {
        filteredItems = filteredItems.filter(quiz =>
          quiz.structuredTags?.systems.some(s => filter.systems!.includes(s))
        );
      }

      if (filter.userTypes?.length && !tagValues.some(t => t.startsWith('user:'))) {
        filteredItems = filteredItems.filter(quiz =>
          quiz.structuredTags?.userTypes.some(u => filter.userTypes!.includes(u))
        );
      }

      if (filter.angleMarkers?.length && !tagValues.some(t => t.startsWith('am:'))) {
        filteredItems = filteredItems.filter(quiz =>
          quiz.structuredTags?.angleMarkers.some(m => filter.angleMarkers!.includes(m))
        );
      }

      if (filter.archLevels?.length && !tagValues.some(t => t.startsWith('level:'))) {
        filteredItems = filteredItems.filter(quiz =>
          quiz.structuredTags?.archLevel && filter.archLevels!.includes(quiz.structuredTags.archLevel)
        );
      }

      return {
        success: true,
        data: {
          ...result.data,
          items: filteredItems,
          total: filteredItems.length,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch video quizzes by tags', 'VideoQuizService', {
        error: error instanceof Error ? error.message : String(error),
        filter,
      });
      return {
        success: false,
        error: {
          code: 'VIDEO_QUIZZES_TAG_QUERY_FAILED',
          message: 'Failed to fetch video quizzes by tags',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets facet counts for all tag categories.
   * Useful for displaying filter options with counts in the UI.
   */
  async getTagFacets(): Promise<ApiResponse<TagFacetCounts>> {
    logger.database('query', this.VIDEO_QUIZZES_COLLECTION, undefined, { facets: true });

    try {
      // Get all active, published quizzes
      const result = await this.query<VideoQuiz>(
        this.VIDEO_QUIZZES_COLLECTION,
        {
          where: [
            { field: 'isActive', operator: '==', value: true },
            { field: 'isPublished', operator: '==', value: true },
          ],
          limit: 1000, // Get all for accurate counts
        }
      );

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || { code: 'QUERY_FAILED', message: 'Failed to query quizzes' },
          timestamp: new Date(),
        };
      }

      // Initialize facet counts
      const facets: TagFacetCounts = {
        pillars: {} as Record<PillarTag, number>,
        systems: {} as Record<SystemTag, number>,
        userTypes: {} as Record<UserTypeTag, number>,
        angleMarkers: {} as Record<AngleMarkerTag, number>,
        archLevels: {} as Record<ArchLevelTag, number>,
      };

      // Initialize all possible values with 0
      PILLARS.forEach(p => { facets.pillars[p.slug] = 0; });
      SYSTEM_TAGS.forEach(s => { facets.systems[s] = 0; });
      USER_TYPE_TAGS.forEach(u => { facets.userTypes[u] = 0; });
      ANGLE_MARKER_TAGS.forEach(m => { facets.angleMarkers[m] = 0; });
      ARCH_LEVEL_TAGS.forEach(l => { facets.archLevels[l] = 0; });

      // Count occurrences
      result.data.items.forEach(quiz => {
        if (quiz.structuredTags) {
          if (quiz.structuredTags.pillar) {
            facets.pillars[quiz.structuredTags.pillar] = (facets.pillars[quiz.structuredTags.pillar] || 0) + 1;
          }

          quiz.structuredTags.systems.forEach(system => {
            facets.systems[system] = (facets.systems[system] || 0) + 1;
          });

          quiz.structuredTags.userTypes.forEach(userType => {
            facets.userTypes[userType] = (facets.userTypes[userType] || 0) + 1;
          });

          quiz.structuredTags.angleMarkers.forEach(marker => {
            facets.angleMarkers[marker] = (facets.angleMarkers[marker] || 0) + 1;
          });

          if (quiz.structuredTags.archLevel) {
            facets.archLevels[quiz.structuredTags.archLevel] = (facets.archLevels[quiz.structuredTags.archLevel] || 0) + 1;
          }
        }
      });

      return {
        success: true,
        data: facets,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get tag facets', 'VideoQuizService', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: {
          code: 'TAG_FACETS_FAILED',
          message: 'Failed to get tag facets',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Updates the _tagIndex field for a video quiz.
   * Call this when structured tags are modified.
   */
  async updateTagIndex(
    quizId: string,
    structuredTags: VideoStructuredTags
  ): Promise<ApiResponse<void>> {
    logger.database('update', this.VIDEO_QUIZZES_COLLECTION, quizId, { updateTagIndex: true });

    try {
      const _tagIndex = buildTagIndex(structuredTags);

      await this.updateDocument(this.VIDEO_QUIZZES_COLLECTION, quizId, {
        structuredTags,
        _tagIndex,
        updatedAt: Timestamp.now(),
      });

      logger.info('Tag index updated successfully', 'VideoQuizService', { quizId, tagCount: _tagIndex.length });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to update tag index', 'VideoQuizService', {
        error: error instanceof Error ? error.message : String(error),
        quizId,
      });
      return {
        success: false,
        error: {
          code: 'TAG_INDEX_UPDATE_FAILED',
          message: 'Failed to update tag index',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }
}

// Export singleton instance
export const videoQuizService = new VideoQuizService();
