import { BaseDatabaseService } from '../base.service';
import {
  Sport,
  Skill,
  SportProgress,
  SkillProgress,
  ApiResponse,
  PaginatedResponse,
  QueryOptions,
  SearchFilters,
  DifficultyLevel,
  WhereClause,
} from '@/types';
import { Timestamp } from 'firebase/firestore';
import { logger } from '../../utils/logger';
import {
  createDefaultSportMetadata,
  validateSportData,
  validateSkillData,
} from '../utils/sport-helpers';

/**
 * Service for managing sports, skills, and user progress in the Smarter Goalie application.
 *
 * This service provides comprehensive functionality for:
 * - CRUD operations for sports and skills
 * - Progress tracking for users
 * - Analytics and reporting
 * - Real-time subscriptions
 * - Batch operations for data management
 *
 * @example
 * ```typescript
 * // Create a new sport
 * const result = await sportsService.createSport({
 *   name: 'Basketball',
 *   description: 'Learn basketball fundamentals',
 *   difficulty: 'introduction',
 *   category: 'team-sports',
 *   estimatedTimeToComplete: 120,
 *   isActive: true,
 *   isFeatured: true,
 *   order: 1,
 *   imageUrl: 'https://example.com/basketball.jpg',
 *   prerequisites: [],
 *   tags: ['team', 'indoor', 'ball-game']
 * });
 *
 * // Get user's sport progress
 * const progress = await sportsService.getSportProgress('user123', 'sport456');
 * ```
 */
export class SportsService extends BaseDatabaseService {
  private readonly SPORTS_COLLECTION = 'sports';
  private readonly SKILLS_COLLECTION = 'skills';
  private readonly SPORT_PROGRESS_COLLECTION = 'sport_progress';
  private readonly SKILL_PROGRESS_COLLECTION = 'skill_progress';

  // Sports CRUD operations
  /**
   * Creates a new sport in the database.
   *
   * @param sport - Sport data excluding auto-generated fields
   * @returns Promise resolving to API response with created sport ID
   *
   * @example
   * ```typescript
   * const result = await sportsService.createSport({
   *   name: 'Tennis',
   *   description: 'Learn tennis fundamentals and techniques',
   *   difficulty: 'development',
   *   category: 'racket-sports',
   *   estimatedTimeToComplete: 180,
   *   isActive: true,
   *   isFeatured: false,
   *   order: 5,
   *   imageUrl: 'https://example.com/tennis.jpg',
   *   prerequisites: [],
   *   tags: ['individual', 'outdoor', 'racket']
   * });
   * ```
   */
  async createSport(
    sport: Omit<Sport, 'id' | 'createdAt' | 'updatedAt' | 'skillsCount' | 'metadata'>
  ): Promise<ApiResponse<{ id: string }>> {
    logger.database('create', this.SPORTS_COLLECTION, undefined, { name: sport.name });

    // Validate sport data
    const validation = validateSportData(sport);
    if (!validation.valid) {
      logger.warn('Sport creation failed validation', 'SportsService', { errors: validation.errors });
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.join(', '),
        },
        timestamp: new Date(),
      };
    }

    const sportData = {
      ...sport,
      skillsCount: 0,
      metadata: createDefaultSportMetadata(),
    };

    const result = await this.create<Sport>(this.SPORTS_COLLECTION, sportData);

    if (result.success) {
      logger.info('Sport created successfully', 'SportsService', { sportId: result.data?.id, name: sport.name });
    } else {
      logger.error('Sport creation failed', 'SportsService', result.error);
    }

    return result;
  }

  /**
   * Retrieves a sport by its ID.
   *
   * @param sportId - The ID of the sport to retrieve
   * @returns Promise resolving to API response with sport data or null if not found
   *
   * @example
   * ```typescript
   * const result = await sportsService.getSport('sport123');
   * if (result.success && result.data) {
   *   console.log(`Found sport: ${result.data.name}`);
   * }
   * ```
   */
  async getSport(sportId: string): Promise<ApiResponse<Sport | null>> {
    logger.database('read', this.SPORTS_COLLECTION, sportId);
    const result = await this.getById<Sport>(this.SPORTS_COLLECTION, sportId);

    if (result.success && result.data) {
      logger.debug('Sport retrieved successfully', 'SportsService', { sportId, name: result.data.name });
    } else if (result.success && !result.data) {
      logger.warn('Sport not found', 'SportsService', { sportId });
    } else {
      logger.error('Sport retrieval failed', 'SportsService', result.error);
    }

    return result;
  }

  /**
   * Updates an existing sport with new data.
   *
   * @param sportId - The ID of the sport to update
   * @param updates - Partial sport data to update
   * @returns Promise resolving to API response indicating success or failure
   *
   * @example
   * ```typescript
   * const result = await sportsService.updateSport('sport123', {
   *   description: 'Updated description with new information',
   *   isFeatured: true
   * });
   * ```
   */
  async updateSport(
    sportId: string,
    updates: Partial<Omit<Sport, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>>
  ): Promise<ApiResponse<void>> {
    logger.database('update', this.SPORTS_COLLECTION, sportId, updates);

    // Validate updates if name is being changed
    if (updates.name || updates.estimatedTimeToComplete || updates.order) {
      const validation = validateSportData(updates);
      if (!validation.valid) {
        logger.warn('Sport update failed validation', 'SportsService', { sportId, errors: validation.errors });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors.join(', '),
          },
          timestamp: new Date(),
        };
      }
    }

    const result = await this.update<Sport>(this.SPORTS_COLLECTION, sportId, updates);

    if (result.success) {
      logger.info('Sport updated successfully', 'SportsService', { sportId });
    } else {
      logger.error('Sport update failed', 'SportsService', result.error);
    }

    return result;
  }

  async deleteSport(sportId: string): Promise<ApiResponse<void>> {
    // Check if sport has skills
    const skills = await this.getSkillsBySport(sportId);
    if (skills.data && skills.data.items.length > 0) {
      return {
        success: false,
        error: {
          code: 'SPORT_HAS_SKILLS',
          message: 'Cannot delete sport that has skills. Delete skills first.',
        },
        timestamp: new Date(),
      };
    }

    return this.delete(this.SPORTS_COLLECTION, sportId);
  }

  async getAllSports(options: QueryOptions & SearchFilters = {}): Promise<ApiResponse<PaginatedResponse<Sport>>> {
    const queryOptions: QueryOptions = {
      // Remove ordering to avoid index requirement - will sort client-side
      ...options,
    };

    // Restore active filter now that permissions are fixed
    const whereClause: WhereClause[] = [
      { field: 'isActive', operator: '==', value: true },
    ];

    if (options.difficulty && options.difficulty.length > 0) {
      whereClause.push({
        field: 'difficulty',
        operator: 'in',
        value: options.difficulty,
      });
    }

    if (options.categories && options.categories.length > 0) {
      whereClause.push({
        field: 'category',
        operator: 'in',
        value: options.categories,
      });
    }

    queryOptions.where = whereClause;

    logger.info('Querying Firebase for sports', 'SportsService', { queryOptions });

    try {
      const result = await this.query<Sport>(this.SPORTS_COLLECTION, queryOptions);
      logger.info('Sports query result', 'SportsService', { success: result.success, itemCount: result.data?.items?.length || 0 });

      // Apply client-side sorting to avoid index requirements
      if (result.success && result.data) {
        result.data.items.sort((a, b) => {
          // `order`, then name. Deliberately NOT featured-first: the rows are the
          // eight pillars, whose sequence is fixed taxonomy, and isFeatured is an
          // admin-editable flag that currently disagrees across them — sorting by
          // it put Pillar 8 above Pillars 6 and 7 in every dropdown that shows
          // this list unsorted. Callers wanting featured content have
          // getFeaturedSports.
          if (a.order !== b.order) {
            return a.order - b.order;
          }
          return a.name.localeCompare(b.name);
        });
      }

      return result;
    } catch (error) {
      logger.error('Error in getAllSports', 'SportsService', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: { code: 'FETCH_SPORTS_ERROR', message: `Failed to fetch sports: ${error instanceof Error ? error.message : 'Unknown error'}` },
        timestamp: new Date(),
      };
    }
  }

  async getFeaturedSports(limit: number = 6): Promise<ApiResponse<PaginatedResponse<Sport>>> {
    return this.query<Sport>(this.SPORTS_COLLECTION, {
      where: [
        { field: 'isActive', operator: '==', value: true },
        { field: 'isFeatured', operator: '==', value: true },
      ],
      orderBy: [{ field: 'order', direction: 'asc' }],
      limit,
    });
  }

  async searchSports(searchQuery: string, filters: SearchFilters = {}): Promise<ApiResponse<PaginatedResponse<Sport>>> {
    try {
      // For full-text search, this would integrate with Algolia or similar
      // For now, we'll do a simple name/description search
      const queryOptions: QueryOptions = {
        orderBy: [{ field: 'name', direction: 'asc' }],
        limit: filters.duration?.max || 50,
      };

      const whereClause: WhereClause[] = [
        { field: 'isActive', operator: '==', value: true },
      ];

      if (filters.difficulty && filters.difficulty.length > 0) {
        whereClause.push({
          field: 'difficulty',
          operator: 'in',
          value: filters.difficulty,
        });
      }

      if (filters.categories && filters.categories.length > 0) {
        whereClause.push({
          field: 'category',
          operator: 'in',
          value: filters.categories,
        });
      }

      queryOptions.where = whereClause;

      const result = await this.query<Sport>(this.SPORTS_COLLECTION, queryOptions);

      // Return error result if query fails
      if (!result.success) {
        return result;
      }

      // Client-side filtering for search query (in production, use proper search engine)
      if (result.success && result.data && searchQuery) {
        const filteredItems = result.data.items.filter(sport =>
          sport.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sport.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sport.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        result.data.items = filteredItems;
        result.data.total = filteredItems.length;
      }

      return result;
    } catch (error) {
      logger.error('Error in searchSports', 'SportsService', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'An error occurred while searching sports',
        },
        timestamp: new Date(),
      };
    }
  }

  // Skills CRUD operations
  async createSkill(
    skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>
  ): Promise<ApiResponse<{ id: string }>> {
    logger.database('create', this.SKILLS_COLLECTION, undefined, { name: skill.name, sportId: skill.sportId });

    // MANDATORY: Validate that the sport exists
    if (!skill.sportId || skill.sportId.trim() === '') {
      logger.warn('Skill creation failed: sportId is required', 'SportsService', { skillName: skill.name });
      return {
        success: false,
        error: {
          code: 'SPORT_ID_REQUIRED',
          message: 'Every skill must be associated with a valid sport',
        },
        timestamp: new Date(),
      };
    }

    const sportResult = await this.getSport(skill.sportId);
    if (!sportResult.success || !sportResult.data) {
      logger.warn('Skill creation failed: sport not found', 'SportsService', {
        skillName: skill.name,
        sportId: skill.sportId
      });
      return {
        success: false,
        error: {
          code: 'SPORT_NOT_FOUND',
          message: `Sport with ID ${skill.sportId} does not exist`,
        },
        timestamp: new Date(),
      };
    }

    // Validate skill data
    const validation = validateSkillData(skill);
    if (!validation.valid) {
      logger.warn('Skill creation failed validation', 'SportsService', { errors: validation.errors });
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors.join(', '),
        },
        timestamp: new Date(),
      };
    }

    const skillData = {
      ...skill,
      metadata: {
        totalCompletions: 0,
        averageCompletionTime: skill.estimatedTimeToComplete,
        averageRating: 0,
        totalRatings: 0,
        difficulty: skill.difficulty,
      },
    };

    const result = await this.create<Skill>(this.SKILLS_COLLECTION, skillData);

    if (result.success) {
      // Increment sport skills count
      await this.incrementField(this.SPORTS_COLLECTION, skill.sportId, 'skillsCount');
      logger.info('Skill created successfully', 'SportsService', {
        skillId: result.data?.id,
        skillName: skill.name,
        sportId: skill.sportId
      });
    } else {
      logger.error('Skill creation failed', 'SportsService', result.error);
    }

    return result;
  }

  async getSkill(skillId: string): Promise<ApiResponse<Skill | null>> {
    return this.getById<Skill>(this.SKILLS_COLLECTION, skillId);
  }

  async updateSkill(
    skillId: string,
    updates: Partial<Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>>
  ): Promise<ApiResponse<void>> {
    return this.update<Skill>(this.SKILLS_COLLECTION, skillId, updates);
  }

  async deleteSkill(skillId: string): Promise<ApiResponse<void>> {
    // Get skill to find sport ID
    const skillResult = await this.getSkill(skillId);
    if (!skillResult.success || !skillResult.data) {
      return {
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
        timestamp: new Date(),
      };
    }

    const result = await this.delete(this.SKILLS_COLLECTION, skillId);

    if (result.success) {
      // Decrement sport skills count
      await this.incrementField(this.SPORTS_COLLECTION, skillResult.data.sportId, 'skillsCount', -1);
    }

    return result;
  }

  async getSkillsBySport(
    sportId: string,
    options: QueryOptions = {}
  ): Promise<ApiResponse<PaginatedResponse<Skill>>> {
    const queryOptions: QueryOptions = {
      where: [
        { field: 'sportId', operator: '==', value: sportId },
        { field: 'isActive', operator: '==', value: true },
      ],
      orderBy: [{ field: 'order', direction: 'asc' }],
      ...options,
    };

    return this.query<Skill>(this.SKILLS_COLLECTION, queryOptions);
  }

  async getSkillsByDifficulty(
    sportId: string,
    difficulty: DifficultyLevel
  ): Promise<ApiResponse<PaginatedResponse<Skill>>> {
    return this.query<Skill>(this.SKILLS_COLLECTION, {
      where: [
        { field: 'sportId', operator: '==', value: sportId },
        { field: 'difficulty', operator: '==', value: difficulty },
        { field: 'isActive', operator: '==', value: true },
      ],
      orderBy: [{ field: 'order', direction: 'asc' }],
    });
  }

  /**
   * Retrieves all skills across all sports.
   * Used for admin interfaces and bulk operations.
   *
   * @param options - Query options for filtering and pagination
   * @returns Promise resolving to API response with paginated skills
   */
  async getAllSkills(options: QueryOptions = {}): Promise<ApiResponse<PaginatedResponse<Skill>>> {
    logger.database('query', this.SKILLS_COLLECTION, undefined, options);

    const queryOptions: QueryOptions = {
      where: [{ field: 'isActive', operator: '==', value: true }],
      orderBy: [{ field: 'order', direction: 'asc' }],
      ...options,
    };

    const result = await this.query<Skill>(this.SKILLS_COLLECTION, queryOptions);

    if (result.success) {
      logger.info('All skills retrieved successfully', 'SportsService', {
        count: result.data?.items?.length || 0
      });
    } else {
      logger.error('Failed to retrieve all skills', 'SportsService', result.error);
    }

    return result;
  }

  async getSkillPrerequisites(skillId: string): Promise<ApiResponse<Skill[]>> {
    const skillResult = await this.getSkill(skillId);
    if (!skillResult.success || !skillResult.data) {
      return {
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found',
        },
        timestamp: new Date(),
      };
    }

    const prerequisites = skillResult.data.prerequisites;
    if (!prerequisites || prerequisites.length === 0) {
      return {
        success: true,
        data: [],
        timestamp: new Date(),
      };
    }

    const prerequisiteSkills: Skill[] = [];
    for (const prereqId of prerequisites) {
      const prereqResult = await this.getSkill(prereqId);
      if (prereqResult.success && prereqResult.data) {
        prerequisiteSkills.push(prereqResult.data);
      }
    }

    return {
      success: true,
      data: prerequisiteSkills,
      timestamp: new Date(),
    };
  }

  // Progress tracking
  async createSportProgress(
    userId: string,
    sportId: string
  ): Promise<ApiResponse<{ id: string }>> {
    const progressData: Omit<SportProgress, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      sportId,
      status: 'not_started',
      completedSkills: [],
      totalSkills: 0,
      progressPercentage: 0,
      timeSpent: 0,
      streak: {
        current: 0,
        longest: 0,
        lastActiveDate: Timestamp.fromDate(new Date()),
      },
      startedAt: Timestamp.fromDate(new Date()),
      lastAccessedAt: Timestamp.fromDate(new Date()),
    };

    // Get total skills count
    const skillsResult = await this.getSkillsBySport(sportId);
    if (skillsResult.success && skillsResult.data) {
      progressData.totalSkills = skillsResult.data.total;
    }

    return this.create<SportProgress>(this.SPORT_PROGRESS_COLLECTION, progressData);
  }

  async getSportProgress(
    userId: string,
    sportId: string
  ): Promise<ApiResponse<SportProgress | null>> {
    const result = await this.query<SportProgress>(this.SPORT_PROGRESS_COLLECTION, {
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'sportId', operator: '==', value: sportId },
      ],
      limit: 1,
    });

    return {
      success: result.success,
      data: result.data?.items[0] || null,
      error: result.error,
      timestamp: new Date(),
    };
  }

  async updateSportProgress(
    userId: string,
    sportId: string,
    updates: Partial<SportProgress>
  ): Promise<ApiResponse<void>> {
    const progressResult = await this.getSportProgress(userId, sportId);
    if (!progressResult.success || !progressResult.data) {
      return {
        success: false,
        error: {
          code: 'PROGRESS_NOT_FOUND',
          message: 'Sport progress not found',
        },
        timestamp: new Date(),
      };
    }

    return this.update<SportProgress>(
      this.SPORT_PROGRESS_COLLECTION,
      progressResult.data.id,
      updates
    );
  }

  async createSkillProgress(
    userId: string,
    skillId: string,
    sportId: string
  ): Promise<ApiResponse<{ id: string }>> {
    const progressData: Omit<SkillProgress, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      skillId,
      sportId,
      status: 'not_started',
      progressPercentage: 0,
      timeSpent: 0,
      bookmarked: false,
      notes: '',
      lastAccessedAt: Timestamp.fromDate(new Date()),
    };

    return this.create<SkillProgress>(this.SKILL_PROGRESS_COLLECTION, progressData);
  }

  async getSkillProgress(
    userId: string,
    skillId: string
  ): Promise<ApiResponse<SkillProgress | null>> {
    const result = await this.query<SkillProgress>(this.SKILL_PROGRESS_COLLECTION, {
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'skillId', operator: '==', value: skillId },
      ],
      limit: 1,
    });

    return {
      success: result.success,
      data: result.data?.items[0] || null,
      error: result.error,
      timestamp: new Date(),
    };
  }

  async updateSkillProgress(
    userId: string,
    skillId: string,
    updates: Partial<SkillProgress>
  ): Promise<ApiResponse<void>> {
    const progressResult = await this.getSkillProgress(userId, skillId);
    if (!progressResult.success || !progressResult.data) {
      return {
        success: false,
        error: {
          code: 'PROGRESS_NOT_FOUND',
          message: 'Skill progress not found',
        },
        timestamp: new Date(),
      };
    }

    return this.update<SkillProgress>(
      this.SKILL_PROGRESS_COLLECTION,
      progressResult.data.id,
      updates
    );
  }

  async getUserProgress(userId: string): Promise<ApiResponse<{
    sports: SportProgress[];
    skills: SkillProgress[];
  }>> {
    const [sportsResult, skillsResult] = await Promise.all([
      this.query<SportProgress>(this.SPORT_PROGRESS_COLLECTION, {
        where: [{ field: 'userId', operator: '==', value: userId }],
      }),
      this.query<SkillProgress>(this.SKILL_PROGRESS_COLLECTION, {
        where: [{ field: 'userId', operator: '==', value: userId }],
      }),
    ]);

    if (!sportsResult.success || !skillsResult.success) {
      return {
        success: false,
        error: {
          code: 'PROGRESS_FETCH_ERROR',
          message: 'Failed to fetch user progress',
        },
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      data: {
        sports: sportsResult.data?.items || [],
        skills: skillsResult.data?.items || [],
      },
      timestamp: new Date(),
    };
  }

  // Batch operations
  async reorderSkills(
    _sportId: string,
    skillOrders: Array<{ skillId: string; order: number }>
  ): Promise<ApiResponse<void>> {
    const operations = skillOrders.map(({ skillId, order }) => ({
      type: 'update' as const,
      collection: this.SKILLS_COLLECTION,
      id: skillId,
      data: { order },
    }));

    return this.batchWrite(operations);
  }

  async reorderSports(
    sportOrders: Array<{ sportId: string; order: number }>
  ): Promise<ApiResponse<void>> {
    const operations = sportOrders.map(({ sportId, order }) => ({
      type: 'update' as const,
      collection: this.SPORTS_COLLECTION,
      id: sportId,
      data: { order },
    }));

    return this.batchWrite(operations);
  }

  // Analytics and reporting
  async getSportAnalytics(sportId: string): Promise<ApiResponse<{
    totalEnrollments: number;
    totalCompletions: number;
    completionRate: number;
    averageCompletionTime: number;
    skillCompletionRates: Array<{ skillId: string; completionRate: number }>;
  }>> {
    const [sportResult, skillsResult, progressResult] = await Promise.all([
      this.getSport(sportId),
      this.getSkillsBySport(sportId),
      this.query<SportProgress>(this.SPORT_PROGRESS_COLLECTION, {
        where: [{ field: 'sportId', operator: '==', value: sportId }],
      }),
    ]);

    if (!sportResult.success || !skillsResult.success || !progressResult.success) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_FETCH_ERROR',
          message: 'Failed to fetch sport analytics',
        },
        timestamp: new Date(),
      };
    }

    const skills = skillsResult.data!.items;
    const progresses = progressResult.data!.items;

    const totalEnrollments = progresses.length;
    const totalCompletions = progresses.filter(p => p.status === 'completed').length;
    const completionRate = totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0;

    const completedProgresses = progresses.filter(p => p.status === 'completed');
    const averageCompletionTime = completedProgresses.length > 0
      ? completedProgresses.reduce((sum, p) => sum + p.timeSpent, 0) / completedProgresses.length
      : 0;

    const skillCompletionRates = skills.map(skill => {
      const skillProgresses = progresses.filter(p => p.completedSkills.includes(skill.id));
      const completionRate = totalEnrollments > 0 ? (skillProgresses.length / totalEnrollments) * 100 : 0;
      return {
        skillId: skill.id,
        completionRate,
      };
    });

    return {
      success: true,
      data: {
        totalEnrollments,
        totalCompletions,
        completionRate,
        averageCompletionTime,
        skillCompletionRates,
      },
      timestamp: new Date(),
    };
  }

  // Real-time subscriptions
  subscribeToSports(
    callback: (sports: Sport[]) => void,
    filters: SearchFilters = {}
  ): () => void {
    const queryOptions: QueryOptions = {
      where: [{ field: 'isActive', operator: '==', value: true }],
      orderBy: [
        { field: 'isFeatured', direction: 'desc' },
        { field: 'order', direction: 'asc' },
      ],
    };

    if (filters.difficulty && filters.difficulty.length > 0) {
      queryOptions.where?.push({
        field: 'difficulty',
        operator: 'in',
        value: filters.difficulty,
      });
    }

    return this.subscribeToCollection<Sport>(
      this.SPORTS_COLLECTION,
      queryOptions,
      (update) => {
        if (update.type === 'modified') {
          callback(update.data);
        }
      }
    );
  }

  subscribeToSkills(
    sportId: string,
    callback: (skills: Skill[]) => void
  ): () => void {
    return this.subscribeToCollection<Skill>(
      this.SKILLS_COLLECTION,
      {
        where: [
          { field: 'sportId', operator: '==', value: sportId },
          { field: 'isActive', operator: '==', value: true },
        ],
        orderBy: [{ field: 'order', direction: 'asc' }],
      },
      (update) => {
        if (update.type === 'modified') {
          callback(update.data);
        }
      }
    );
  }
}

// Export singleton instance
export const sportsService = new SportsService();