import { BaseDatabaseService } from '../base.service';
import {
  User,
  UserProfile,
  UserPreferences,
  UserProgress,
  OverallStats,
  UserAchievement,
  Notification,
  ApiResponse,
  PaginatedResponse,
  QueryOptions,
  UserRole,
  SportProgress,
  WhereClause,
} from '@/types';
import { VideoQuizProgress } from '@/types/video-quiz';
import { Timestamp } from 'firebase/firestore';
import { logger } from '../../utils/logger';
import { generateCoachCode, normalizeCoachCode } from '../../utils/coach-code-generator';

/**
 * Service for managing users, user progress, achievements, and notifications in the Smarter Goalie application.
 *
 * This service provides comprehensive functionality for:
 * - User account management and profile operations
 * - User progress tracking and statistics
 * - Achievement system and gamification
 * - Notification management
 * - User analytics and reporting
 * - Real-time subscriptions for user data
 *
 * @example
 * ```typescript
 * // Create a new user
 * const result = await userService.createUser({
 *   email: 'john@example.com',
 *   displayName: 'John Doe',
 *   role: 'student',
 *   emailVerified: true,
 *   isActive: true,
 *   profile: {
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     dateOfBirth: new Date('1990-01-01'),
 *     country: 'US'
 *   }
 * });
 *
 * // Track user progress
 * const progress = await userService.getUserProgress('user123');
 * await userService.addExperiencePoints('user123', 50, 'quiz_completion');
 * ```
 */
export class UserService extends BaseDatabaseService {
  private readonly USERS_COLLECTION = 'users';
  private readonly USER_PROGRESS_COLLECTION = 'user_progress';
  private readonly SPORT_PROGRESS_COLLECTION = 'sport_progress';
  private readonly USER_ACHIEVEMENTS_COLLECTION = 'user_achievements';
  private readonly NOTIFICATIONS_COLLECTION = 'notifications';
  private readonly COACH_CODES_COLLECTION = 'coach_codes';
  private readonly PROGRESS_ATTEMPTS_LIMIT = 2000;

  // User CRUD operations
  /**
   * Creates a new user account in the database.
   *
   * @param user - User data excluding auto-generated fields
   * @returns Promise resolving to API response with created user ID
   *
   * @example
   * ```typescript
   * const result = await userService.createUser({
   *   email: 'jane@example.com',
   *   displayName: 'Jane Smith',
   *   role: 'student',
   *   emailVerified: true,
   *   isActive: true,
   *   profile: {
   *     firstName: 'Jane',
   *     lastName: 'Smith',
   *     dateOfBirth: new Date('1992-05-15'),
   *     country: 'CA',
   *     favoritesSports: ['tennis', 'swimming']
   *   }
   * });
   * ```
   */
  async createUser(
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>
  ): Promise<ApiResponse<{ id: string }>> {
    logger.database('create', this.USERS_COLLECTION, undefined, { email: user.email, displayName: user.displayName });

    // Check if user with email already exists
    const existingUserResult = await this.getUserByEmail(user.email);
    if (existingUserResult.success && existingUserResult.data) {
      logger.warn('User creation failed - email already exists', 'UserService', { email: user.email });
      return {
        success: false,
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'User with this email already exists',
        },
        timestamp: new Date(),
      };
    }

    const userData = {
      ...user,
      preferences: user.preferences || this.getDefaultPreferences(),
    };

    const result = await this.create<User>(this.USERS_COLLECTION, userData);

    if (result.success) {
      // Initialize user progress
      await this.initializeUserProgress(result.data!.id);
      logger.info('User created successfully', 'UserService', {
        userId: result.data!.id,
        email: user.email,
        displayName: user.displayName
      });
    } else {
      logger.error('User creation failed', 'UserService', result.error);
    }

    return result;
  }

  /**
   * Retrieves a user by their ID.
   *
   * @param userId - The ID of the user to retrieve
   * @returns Promise resolving to API response with user data or null if not found
   *
   * @example
   * ```typescript
   * const result = await userService.getUser('user123');
   * if (result.success && result.data) {
   *   console.log(`Found user: ${result.data.displayName}`);
   * }
   * ```
   */
  async getUser(userId: string): Promise<ApiResponse<User | null>> {
    logger.database('read', this.USERS_COLLECTION, userId);
    const result = await this.getById<User>(this.USERS_COLLECTION, userId);

    if (result.success && result.data) {
      logger.debug('User retrieved successfully', 'UserService', {
        userId,
        displayName: result.data.displayName
      });
    } else if (result.success && !result.data) {
      logger.warn('User not found', 'UserService', { userId });
    } else {
      logger.error('User retrieval failed', 'UserService', result.error);
    }

    return result;
  }

  async getUserByEmail(email: string): Promise<ApiResponse<User | null>> {
    const result = await this.query<User>(this.USERS_COLLECTION, {
      where: [{ field: 'email', operator: '==', value: email }],
      limit: 1,
    });

    return {
      success: result.success,
      data: result.data?.items[0] || null,
      error: result.error,
      timestamp: new Date(),
    };
  }

  async updateUser(
    userId: string,
    updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'email'>>
  ): Promise<ApiResponse<void>> {
    // Don't allow email updates through this method - defensive check even though type excludes email
    const { email: _email, ...safeUpdates } = updates as Partial<User>;
    return this.update<User>(this.USERS_COLLECTION, userId, safeUpdates);
  }

  async updateUserProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<ApiResponse<void>> {
    return this.update<User>(this.USERS_COLLECTION, userId, { profile });
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<ApiResponse<void>> {
    // Get current preferences and merge
    const userResult = await this.getUser(userId);
    if (!userResult.success || !userResult.data) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
        timestamp: new Date(),
      };
    }

    const currentPreferences = userResult.data.preferences || this.getDefaultPreferences();
    const updatedPreferences = { ...currentPreferences, ...preferences };

    // Deep merge email notifications if provided
    if (preferences.emailNotifications) {
      updatedPreferences.emailNotifications = {
        ...currentPreferences.emailNotifications,
        ...preferences.emailNotifications,
      };
    }

    return this.update<User>(this.USERS_COLLECTION, userId, {
      preferences: updatedPreferences,
    });
  }

  async updateLastLogin(userId: string): Promise<ApiResponse<void>> {
    return this.update<User>(this.USERS_COLLECTION, userId, {
      lastLoginAt: Timestamp.now(),
    });
  }

  async changeUserRole(
    userId: string,
    newRole: UserRole,
    adminUserId: string
  ): Promise<ApiResponse<void>> {
    // Verify admin permissions
    const adminResult = await this.getUser(adminUserId);
    if (!adminResult.success || !adminResult.data || adminResult.data.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only admins can change user roles',
        },
        timestamp: new Date(),
      };
    }

    return this.update<User>(this.USERS_COLLECTION, userId, { role: newRole });
  }

  /**
   * The subscription pause switch. Pausing freezes the account — the member
   * can no longer enter the app and stops counting as active — while leaving
   * every part of their record untouched. Admin-only, and admins themselves
   * cannot be paused (an admin locked out of the admin panel could not be
   * unlocked from the UI).
   */
  async pauseUser(userId: string, adminUserId: string): Promise<ApiResponse<void>> {
    const permissionError = await this.verifyPauseRequest(userId, adminUserId);
    if (permissionError) return permissionError;

    return this.update<User>(this.USERS_COLLECTION, userId, {
      isPaused: true,
      pausedAt: Timestamp.fromDate(new Date()),
    });
  }

  async resumeUser(userId: string, adminUserId: string): Promise<ApiResponse<void>> {
    const permissionError = await this.verifyPauseRequest(userId, adminUserId);
    if (permissionError) return permissionError;

    return this.update<User>(this.USERS_COLLECTION, userId, {
      isPaused: false,
      resumedAt: Timestamp.fromDate(new Date()),
    });
  }

  private async verifyPauseRequest(userId: string, adminUserId: string): Promise<ApiResponse<void> | null> {
    const adminResult = await this.getUser(adminUserId);
    if (!adminResult.success || !adminResult.data || adminResult.data.role !== 'admin') {
      return {
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only admins can pause or resume accounts' },
        timestamp: new Date(),
      };
    }

    const targetResult = await this.getUser(userId);
    if (!targetResult.success || !targetResult.data) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
        timestamp: new Date(),
      };
    }
    if (targetResult.data.role === 'admin') {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin accounts cannot be paused' },
        timestamp: new Date(),
      };
    }

    return null;
  }

  async deactivateUser(userId: string): Promise<ApiResponse<void>> {
    // Soft delete by marking as inactive
    return this.update<User>(this.USERS_COLLECTION, userId, {
      isActive: false,
      deactivatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async reactivateUser(userId: string): Promise<ApiResponse<void>> {
    return this.update<User>(this.USERS_COLLECTION, userId, {
      isActive: true,
      reactivatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async deleteUser(userId: string, requestingAdminId: string): Promise<ApiResponse<void>> {
    if (!requestingAdminId) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Admin ID required' }, timestamp: new Date() };
    }
    if (userId === requestingAdminId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' }, timestamp: new Date() };
    }
    return this.delete(this.USERS_COLLECTION, userId);
  }

  // User listing and search
  async getAllUsers(
    options: QueryOptions & {
      role?: UserRole;
      isActive?: boolean;
      searchTerm?: string;
    } = {}
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    const whereClause: Array<{field: string, operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any', value: string | boolean | UserRole}> = [];

    if (options.role) {
      whereClause.push({ field: 'role', operator: '==', value: options.role });
    }

    if (options.isActive !== undefined) {
      whereClause.push({ field: 'isActive', operator: '==', value: options.isActive });
    }

    const queryOptions: QueryOptions = {
      where: whereClause,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: options.limit || 50,
      offset: options.offset,
    };

    const result = await this.query<User>(this.USERS_COLLECTION, queryOptions);

    // Client-side search filtering (in production, use proper search engine)
    if (result.success && result.data && options.searchTerm) {
      const searchTerm = options.searchTerm.toLowerCase();
      const filteredItems = result.data.items.filter(user =>
        user.displayName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.profile?.firstName?.toLowerCase().includes(searchTerm)) ||
        (user.profile?.lastName?.toLowerCase().includes(searchTerm))
      );

      result.data.items = filteredItems;
      result.data.total = filteredItems.length;
    }

    return result;
  }

  async getAdminUsers(): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.getAllUsers({ role: 'admin' });
  }

  async getStudentUsers(options: QueryOptions = {}): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.getAllUsers({ role: 'student', ...options });
  }

  async getActiveUsers(options: QueryOptions = {}): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.getAllUsers({ isActive: true, ...options });
  }

  // User Progress Management
  async initializeUserProgress(userId: string): Promise<ApiResponse<{ id: string }>> {
    const progressData: Omit<UserProgress, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      overallStats: {
        totalTimeSpent: 0,
        skillsCompleted: 0,
        sportsCompleted: 0,
        quizzesCompleted: 0,
        averageQuizScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalPoints: 0,
        level: 1,
        experiencePoints: 0,
      },
      achievements: [],
      lastUpdated: Timestamp.now(),
    };

    // Use userId as document ID to match security rules expectation: /user_progress/{userId}
    return this.createWithId<UserProgress>(this.USER_PROGRESS_COLLECTION, userId, progressData);
  }

  async getUserProgress(userId: string): Promise<ApiResponse<UserProgress | null>> {
    // Get base progress record
    const progressResult = await this.getById<UserProgress>(this.USER_PROGRESS_COLLECTION, userId);

    if (!progressResult.success || !progressResult.data) {
      return progressResult;
    }

    // Calculate real stats from video quiz attempts
    try {
      const { videoQuizService } = await import('./video-quiz.service');

      // Get all user's video quiz attempts
      const attemptsResult = await videoQuizService.getUserVideoQuizAttempts(userId, {
        completed: true,
        limit: this.PROGRESS_ATTEMPTS_LIMIT,
      });

      // Get enrollment records directly to avoid expensive nested per-skill aggregation.
      const sportProgressResult = await this.query<SportProgress>(this.SPORT_PROGRESS_COLLECTION, {
        where: [{ field: 'userId', operator: '==', value: userId }],
      });

      const attempts = attemptsResult.success ? attemptsResult.data?.items || [] : [];
      const sportProgressItems = sportProgressResult.success ? sportProgressResult.data?.items || [] : [];

      // Calculate real stats
      const quizzesCompleted = attempts.length; // Total number of video quiz attempts
      const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
      const averageQuizScore = quizzesCompleted > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / quizzesCompleted)
        : 0;

      // Count unique skills attempted (not just passed) for video quizzes
      const attemptedSkillIds = new Set<string>();
      attempts.forEach(attempt => {
        if (attempt.skillId) {
          attemptedSkillIds.add(attempt.skillId);
        }
      });

      const completedSportsCount = sportProgressItems.filter(
        (progress) => progress.status === 'completed'
      ).length;

      // Calculate streak from quiz attempt dates
      const attemptDates = attempts
        .map(a => {
          if (a.submittedAt) {
            const date = typeof a.submittedAt === 'object' && 'toDate' in a.submittedAt
              ? a.submittedAt.toDate()
              : new Date(a.submittedAt as unknown as string | number);
            return date.toISOString().split('T')[0];
          }
          return null;
        })
        .filter((d): d is string => d !== null)
        .sort()
        .reverse();

      let currentStreak = 0;
      let longestStreak = 0;
      let streakCount = 0;
      let maxStreakCount = 0;
      const today = new Date().toISOString().split('T')[0];

      for (let i = 0; i < attemptDates.length; i++) {
        const date = attemptDates[i];
        const prevDate = i > 0 ? attemptDates[i - 1] : null;

        if (i === 0) {
          const daysDiff = Math.floor(
            (new Date(today).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff <= 1) {
            streakCount = 1;
            currentStreak = 1;
          }
        } else if (prevDate) {
          const daysBetween = Math.floor(
            (new Date(prevDate).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysBetween === 1) {
            streakCount++;
            if (i === attemptDates.length - 1 || streakCount === attemptDates.length) {
              currentStreak = streakCount;
            }
          } else {
            maxStreakCount = Math.max(maxStreakCount, streakCount);
            streakCount = 1;
          }
        }
        maxStreakCount = Math.max(maxStreakCount, streakCount);
      }
      longestStreak = maxStreakCount;

      // Update progress data with calculated values
      const updatedProgress: UserProgress = {
        ...progressResult.data,
        overallStats: {
          ...progressResult.data.overallStats,
          totalTimeSpent,
          skillsCompleted: attemptedSkillIds.size, // Unique skills for which quizzes were attempted
          sportsCompleted: completedSportsCount,
          quizzesCompleted, // Total video quiz attempts
          averageQuizScore,
          currentStreak,
          longestStreak: Math.max(longestStreak, progressResult.data.overallStats.longestStreak || 0),
        },
      };

      return {
        success: true,
        data: updatedProgress,
        error: progressResult.error,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to calculate real user progress', 'UserService', error);
      // Return base progress if calculation fails
      return progressResult;
    }
  }

  async updateUserProgress(
    userId: string,
    updates: Partial<Omit<UserProgress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ApiResponse<void>> {
    const progressResult = await this.getUserProgress(userId);
    if (!progressResult.success || !progressResult.data) {
      // Initialize if doesn't exist
      await this.initializeUserProgress(userId);
    }

    const updateData = {
      ...updates,
      lastUpdated: Timestamp.fromDate(new Date()),
    };

    // Since document ID is userId, we can update directly by userId
    return this.update<UserProgress>(this.USER_PROGRESS_COLLECTION, userId, updateData);
  }

  async updateOverallStats(
    userId: string,
    statsUpdates: Partial<OverallStats>
  ): Promise<ApiResponse<void>> {
    const progressResult = await this.getUserProgress(userId);
    if (!progressResult.success || !progressResult.data) {
      return {
        success: false,
        error: {
          code: 'PROGRESS_NOT_FOUND',
          message: 'User progress not found',
        },
        timestamp: new Date(),
      };
    }

    const currentStats = progressResult.data.overallStats;
    const updatedStats = { ...currentStats, ...statsUpdates };

    // Calculate level based on experience points
    if (statsUpdates.experiencePoints !== undefined) {
      updatedStats.level = this.calculateUserLevel(updatedStats.experiencePoints);
    }

    return this.updateUserProgress(userId, { overallStats: updatedStats });
  }

  /**
   * Adds experience points to a user and handles level progression.
   *
   * @param userId - The ID of the user to add points to
   * @param points - The number of experience points to add
   * @param source - The source of the experience points (e.g., 'quiz_completion', 'skill_mastery')
   * @returns Promise resolving to API response with new level information
   *
   * @example
   * ```typescript
   * const result = await userService.addExperiencePoints(
   *   'user123',
   *   100,
   *   'quiz_completion'
   * );
   * if (result.success && result.data.leveledUp) {
   *   console.log(`User leveled up to level ${result.data.newLevel}!`);
   * }
   * ```
   */
  async addExperiencePoints(
    userId: string,
    points: number,
    source: string
  ): Promise<ApiResponse<{ newLevel: number; leveledUp: boolean }>> {
    logger.info('Adding experience points', 'UserService', { userId, points, source });
    const progressResult = await this.getUserProgress(userId);
    if (!progressResult.success || !progressResult.data) {
      return {
        success: false,
        error: {
          code: 'PROGRESS_NOT_FOUND',
          message: 'User progress not found',
        },
        timestamp: new Date(),
      };
    }

    const currentStats = progressResult.data.overallStats;
    const oldLevel = currentStats.level;
    const newExperiencePoints = currentStats.experiencePoints + points;
    const newTotalPoints = currentStats.totalPoints + points;
    const newLevel = this.calculateUserLevel(newExperiencePoints);

    await this.updateOverallStats(userId, {
      experiencePoints: newExperiencePoints,
      totalPoints: newTotalPoints,
      level: newLevel,
    });

    const leveledUp = newLevel > oldLevel;

    // Create notification if user leveled up
    if (leveledUp) {
      logger.info('User leveled up', 'UserService', {
        userId,
        oldLevel,
        newLevel,
        points,
        source
      });

      await this.createNotification(userId, {
        type: 'achievement',
        title: 'Level Up!',
        message: `Congratulations! You've reached level ${newLevel}!`,
        data: {
          actionUrl: '/dashboard',
        },
        priority: 'high',
      });
    }

    return {
      success: true,
      data: {
        newLevel,
        leveledUp,
      },
      timestamp: new Date(),
    };
  }

  // User Achievements
  async getUserAchievements(userId: string): Promise<ApiResponse<PaginatedResponse<UserAchievement>>> {
    return this.query<UserAchievement>(this.USER_ACHIEVEMENTS_COLLECTION, {
      where: [{ field: 'userId', operator: '==', value: userId }],
      orderBy: [{ field: 'unlockedAt', direction: 'desc' }],
    });
  }

  async unlockAchievement(
    userId: string,
    achievementId: string,
    progress: number = 100
  ): Promise<ApiResponse<{ id: string }>> {
    // Check if already unlocked
    const existingResult = await this.query<UserAchievement>(this.USER_ACHIEVEMENTS_COLLECTION, {
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'achievementId', operator: '==', value: achievementId },
      ],
      limit: 1,
    });

    if (existingResult.success && existingResult.data && existingResult.data.items.length > 0) {
      const existing = existingResult.data.items[0];
      if (existing.isCompleted) {
        return {
          success: false,
          error: {
            code: 'ACHIEVEMENT_ALREADY_UNLOCKED',
            message: 'Achievement already unlocked',
          },
          timestamp: new Date(),
        };
      }

      // Update existing achievement
      const achievementData = existing.id;
      await this.update<UserAchievement>(this.USER_ACHIEVEMENTS_COLLECTION, achievementData, {
        progress,
        isCompleted: progress >= 100,
        unlockedAt: progress >= 100 ? Timestamp.fromDate(new Date()) : undefined,
      });

      return {
        success: true,
        data: { id: achievementData },
        timestamp: new Date(),
      };
    }

    // Create new achievement
    const achievementData: Omit<UserAchievement, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      achievementId,
      progress,
      isCompleted: progress >= 100,
      unlockedAt: progress >= 100 ? Timestamp.fromDate(new Date()) : undefined,
      isNotified: false,
    };

    const result = await this.create<UserAchievement>(this.USER_ACHIEVEMENTS_COLLECTION, achievementData);

    if (result.success && progress >= 100) {
      // Add to user progress achievements list
      const progressResult = await this.getUserProgress(userId);
      if (progressResult.success && progressResult.data) {
        const updatedAchievements = [...progressResult.data.achievements, achievementId];
        await this.updateUserProgress(userId, { achievements: updatedAchievements });
      }

      // Create notification
      await this.createNotification(userId, {
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: 'You\'ve unlocked a new achievement!',
        data: {
          achievementId,
          actionUrl: '/achievements',
        },
        priority: 'medium',
      });
    }

    return result;
  }

  // Notifications
  async createNotification(
    userId: string,
    notification: Omit<Notification, 'id' | 'userId' | 'isRead' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<{ id: string }>> {
    const notificationData = {
      ...notification,
      userId,
      isRead: false,
    };

    return this.create<Notification>(this.NOTIFICATIONS_COLLECTION, notificationData);
  }

  async getUserNotifications(
    userId: string,
    options: {
      isRead?: boolean;
      type?: string;
    } & QueryOptions = {}
  ): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    const whereClause: WhereClause[] = [
      { field: 'userId', operator: '==' as const, value: userId },
    ];

    if (options.isRead !== undefined) {
      whereClause.push({ field: 'isRead', operator: '==', value: options.isRead });
    }

    if (options.type) {
      whereClause.push({ field: 'type', operator: '==', value: options.type });
    }

    const queryOptions: QueryOptions = {
      where: whereClause,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: options.limit || 50,
      offset: options.offset,
    };

    return this.query<Notification>(this.NOTIFICATIONS_COLLECTION, queryOptions);
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return this.update<Notification>(this.NOTIFICATIONS_COLLECTION, notificationId, {
      isRead: true,
    });
  }

  async markAllNotificationsAsRead(userId: string): Promise<ApiResponse<void>> {
    const notificationsResult = await this.getUserNotifications(userId, { isRead: false });
    if (!notificationsResult.success || !notificationsResult.data) {
      return {
        success: false,
        error: notificationsResult.error,
        timestamp: new Date(),
      };
    }

    const operations = notificationsResult.data.items.map(notification => ({
      type: 'update' as const,
      collection: this.NOTIFICATIONS_COLLECTION,
      id: notification.id,
      data: { isRead: true },
    }));

    return this.batchWrite(operations);
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return this.delete(this.NOTIFICATIONS_COLLECTION, notificationId);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await this.getUserNotifications(userId, { isRead: false });
    return result.data?.total || 0;
  }

  // Analytics and Statistics
  async getUserAnalytics(userId: string): Promise<ApiResponse<{
    totalTimeSpent: number;
    activeDays: number;
    completionRate: number;
    averageSessionTime: number;
    topSports: Array<{ sportId: string; timeSpent: number }>;
    recentActivity: Array<{
      date: Date;
      activity: string;
      details: string;
    }>;
  }>> {
    // This would typically aggregate data from multiple collections
    // For now, return basic data from user progress
    const progressResult = await this.getUserProgress(userId);
    if (!progressResult.success || !progressResult.data) {
      return {
        success: false,
        error: {
          code: 'PROGRESS_NOT_FOUND',
          message: 'User progress not found',
        },
        timestamp: new Date(),
      };
    }

    const stats = progressResult.data.overallStats;

    return {
      success: true,
      data: {
        totalTimeSpent: stats.totalTimeSpent,
        activeDays: stats.currentStreak, // Simplified
        completionRate: stats.sportsCompleted > 0 ? (stats.skillsCompleted / stats.sportsCompleted) : 0,
        averageSessionTime: 0, // Would need session tracking
        topSports: [], // Would need detailed tracking
        recentActivity: [], // Would need activity logging
      },
      timestamp: new Date(),
    };
  }

  // Helper methods
  private getDefaultPreferences(): UserPreferences {
    return {
      notifications: true,
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      emailNotifications: {
        progress: true,
        quizResults: true,
        newContent: true,
        reminders: true,
      },
    };
  }

  private calculateUserLevel(experiencePoints: number): number {
    // Simple level calculation: every 1000 XP = 1 level
    return Math.floor(experiencePoints / 1000) + 1;
  }

  // Real-time subscriptions
  subscribeToUser(userId: string, callback: (user: User) => void): () => void {
    return this.subscribeToDocument<User>(
      this.USERS_COLLECTION,
      userId,
      (update) => {
        if (update.type === 'modified') {
          callback(update.data);
        }
      }
    );
  }

  subscribeToUserNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    return this.subscribeToCollection<Notification>(
      this.NOTIFICATIONS_COLLECTION,
      {
        where: [{ field: 'userId', operator: '==', value: userId }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 50,
      },
      (update) => {
        if (update.type === 'modified') {
          callback(update.data);
        }
      }
    );
  }

  // Coach-Student Linking Methods

  /**
   * Gets unassigned custom workflow students available for a coach to add.
   * Returns students with workflowType='custom' and no assignedCoachId.
   *
   * @param coachId - The ID of the coach requesting available students
   * @param options - Optional search and pagination options
   * @returns Promise resolving to API response with list of available students
   */
  async getAvailableStudentsForCoach(
    coachId: string,
    options: { searchTerm?: string; limit?: number } = {}
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    logger.info('Getting available students for coach', 'UserService', { coachId, options });

    // Query for custom workflow students without an assigned coach
    // Note: Don't filter by isActive since many documents don't have this field
    const queryOptions: QueryOptions = {
      where: [
        { field: 'role', operator: '==', value: 'student' },
        { field: 'workflowType', operator: '==', value: 'custom' },
      ],
      orderBy: [{ field: 'displayName', direction: 'asc' }],
      limit: options.limit || 50,
    };

    const result = await this.query<User>(this.USERS_COLLECTION, queryOptions);

    if (!result.success || !result.data) {
      return result;
    }

    // Filter out students who already have an assigned coach (client-side filter)
    // Firestore doesn't support querying for null/undefined fields well
    let filteredItems = result.data.items.filter(user => !user.assignedCoachId);

    // Apply search term filter if provided
    if (options.searchTerm) {
      const searchTerm = options.searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(user =>
        user.displayName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.studentNumber?.toLowerCase().includes(searchTerm)) ||
        (user.profile?.firstName?.toLowerCase().includes(searchTerm)) ||
        (user.profile?.lastName?.toLowerCase().includes(searchTerm))
      );
    }

    return {
      success: true,
      data: {
        items: filteredItems,
        total: filteredItems.length,
        page: 1,
        limit: filteredItems.length,
        totalPages: 1,
        hasMore: false,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Assigns a student to a coach by setting their assignedCoachId.
   * Only works for students with workflowType='custom' who aren't already assigned.
   *
   * @param studentId - The ID of the student to assign
   * @param coachId - The ID of the coach to assign the student to
   * @returns Promise resolving to API response indicating success or error
   */
  async assignStudentToCoach(
    studentId: string,
    coachId: string
  ): Promise<ApiResponse<void>> {
    logger.info('Assigning student to coach', 'UserService', { studentId, coachId });

    // Get the student first to validate
    const studentResult = await this.getUser(studentId);
    if (!studentResult.success || !studentResult.data) {
      return {
        success: false,
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: 'Student not found',
        },
        timestamp: new Date(),
      };
    }

    const student = studentResult.data;

    // Validate student is a custom workflow student
    if (student.workflowType !== 'custom') {
      return {
        success: false,
        error: {
          code: 'INVALID_WORKFLOW_TYPE',
          message: 'Only students with custom workflow can be assigned to a coach',
        },
        timestamp: new Date(),
      };
    }

    // Check if already assigned to another coach
    if (student.assignedCoachId && student.assignedCoachId !== coachId) {
      return {
        success: false,
        error: {
          code: 'ALREADY_ASSIGNED',
          message: 'Student is already assigned to another coach',
        },
        timestamp: new Date(),
      };
    }

    // Verify the coach exists and has appropriate role
    const coachResult = await this.getUser(coachId);
    if (!coachResult.success || !coachResult.data) {
      return {
        success: false,
        error: {
          code: 'COACH_NOT_FOUND',
          message: 'Coach not found',
        },
        timestamp: new Date(),
      };
    }

    if (coachResult.data.role !== 'coach' && coachResult.data.role !== 'admin') {
      return {
        success: false,
        error: {
          code: 'INVALID_COACH_ROLE',
          message: 'User must be a coach or admin to have students assigned',
        },
        timestamp: new Date(),
      };
    }

    // Assign the student to the coach
    const updateResult = await this.update<User>(this.USERS_COLLECTION, studentId, {
      assignedCoachId: coachId,
    });

    if (updateResult.success) {
      logger.info('Student assigned to coach successfully', 'UserService', {
        studentId,
        coachId,
        studentName: student.displayName,
      });
    }

    return updateResult;
  }

  /**
   * Removes a student from a coach's roster by clearing their assignedCoachId.
   * Coach can only remove students from their own roster.
   *
   * @param studentId - The ID of the student to remove
   * @param coachId - The ID of the coach removing the student
   * @returns Promise resolving to API response indicating success or error
   */
  async removeStudentFromCoach(
    studentId: string,
    coachId: string
  ): Promise<ApiResponse<void>> {
    logger.info('Removing student from coach', 'UserService', { studentId, coachId });

    // Get the student first to validate
    const studentResult = await this.getUser(studentId);
    if (!studentResult.success || !studentResult.data) {
      return {
        success: false,
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: 'Student not found',
        },
        timestamp: new Date(),
      };
    }

    const student = studentResult.data;

    // Verify the coach is checking their own student (or is admin)
    const coachResult = await this.getUser(coachId);
    const isAdmin = coachResult.success && coachResult.data?.role === 'admin';

    if (!isAdmin && student.assignedCoachId !== coachId) {
      return {
        success: false,
        error: {
          code: 'NOT_YOUR_STUDENT',
          message: 'You can only remove students from your own roster',
        },
        timestamp: new Date(),
      };
    }

    // Remove the assignment by setting assignedCoachId to null
    // Note: We use a direct Firestore update to set the field to null
    const updateResult = await this.update<User>(this.USERS_COLLECTION, studentId, {
      assignedCoachId: null as unknown as string, // Clear the assignment
    });

    if (updateResult.success) {
      logger.info('Student removed from coach successfully', 'UserService', {
        studentId,
        coachId,
        studentName: student.displayName,
      });
    }

    return updateResult;
  }

  /**
   * Gets all students assigned to a specific coach.
   *
   * @param coachId - The ID of the coach
   * @param options - Optional search options
   * @returns Promise resolving to API response with list of assigned students
   */
  async getCoachStudents(
    coachId: string,
    options: { searchTerm?: string } = {}
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    logger.info('Getting coach students', 'UserService', { coachId, options });

    // Note: Don't filter by isActive since many documents don't have this field
    const queryOptions: QueryOptions = {
      where: [
        { field: 'role', operator: '==', value: 'student' },
        { field: 'workflowType', operator: '==', value: 'custom' },
        { field: 'assignedCoachId', operator: '==', value: coachId },
      ],
      orderBy: [{ field: 'displayName', direction: 'asc' }],
    };

    const result = await this.query<User>(this.USERS_COLLECTION, queryOptions);

    if (!result.success || !result.data) {
      return result;
    }

    // Apply search term filter if provided
    if (options.searchTerm) {
      const searchTerm = options.searchTerm.toLowerCase();
      const filteredItems = result.data.items.filter(user =>
        user.displayName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.studentNumber?.toLowerCase().includes(searchTerm)) ||
        (user.profile?.firstName?.toLowerCase().includes(searchTerm)) ||
        (user.profile?.lastName?.toLowerCase().includes(searchTerm))
      );

      return {
        success: true,
        data: {
          items: filteredItems,
          total: filteredItems.length,
          page: 1,
          limit: filteredItems.length,
          totalPages: 1,
          hasMore: false,
        },
        timestamp: new Date(),
      };
    }

    return result;
  }

  // Coach Code Methods

  /**
   * Generates a unique coach code with collision checking.
   * Retries up to 10 times if a collision occurs.
   * Uses the coach_codes collection for collision checking (publicly readable).
   *
   * @param lastName - The coach's last name (or full display name)
   * @returns Promise resolving to a unique coach code
   */
  async generateUniqueCoachCode(lastName: string): Promise<string> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const coachCode = generateCoachCode(lastName);

      try {
        // Check if this coach code already exists in coach_codes collection
        const existingResult = await this.getById<{ coachCode: string; coachId: string }>(
          this.COACH_CODES_COLLECTION,
          coachCode
        );

        if (!existingResult.data) {
          // Unique coach code found (document doesn't exist)
          logger.info('Generated unique coach code', 'UserService', { coachCode, attempts: attempts + 1 });
          return coachCode;
        }

        attempts++;
        logger.debug('Coach code collision, regenerating', 'UserService', { coachCode, attempt: attempts });
      } catch (error) {
        // Permission error or other issue - just use the generated code
        // Collisions are extremely rare (1 in 1M+ chance)
        logger.warn('Coach code collision check error, using generated code', 'UserService', {
          coachCode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return coachCode;
      }
    }

    // Fallback: This should be extremely rare given the large ID space
    throw new Error('Failed to generate unique coach code after maximum attempts');
  }

  /**
   * Registers a coach code in the coach_codes collection.
   * Called after a coach is successfully created.
   *
   * @param coachCode - The coach code to register
   * @param coachId - The coach's user ID
   * @param coachName - The coach's display name
   */
  async registerCoachCode(coachCode: string, coachId: string, coachName: string): Promise<ApiResponse<void>> {
    logger.info('Registering coach code', 'UserService', { coachCode, coachId });

    try {
      await this.createWithId(this.COACH_CODES_COLLECTION, coachCode, {
        coachCode,
        coachId,
        coachName,
        createdAt: new Date(),
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to register coach code', 'UserService', { coachCode, coachId, error });
      return {
        success: false,
        error: {
          code: 'COACH_CODE_REGISTRATION_FAILED',
          message: 'Failed to register coach code',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Look up a coach by their code.
   * Uses the publicly readable coach_codes collection.
   * Used during student registration to validate and link to a coach.
   *
   * @param coachCode - The coach code to search for (case-insensitive)
   * @returns Promise resolving to the coach info or null if not found
   */
  async getCoachByCode(coachCode: string): Promise<ApiResponse<{ id: string; displayName: string } | null>> {
    const normalizedCode = normalizeCoachCode(coachCode);

    if (!normalizedCode) {
      return {
        success: false,
        error: {
          code: 'INVALID_COACH_CODE',
          message: 'Coach code is required',
        },
        timestamp: new Date(),
      };
    }

    logger.info('Looking up coach by code', 'UserService', { coachCode: normalizedCode });

    try {
      // Look up in coach_codes collection (publicly readable)
      const result = await this.getById<{ coachCode: string; coachId: string; coachName: string }>(
        this.COACH_CODES_COLLECTION,
        normalizedCode
      );

      if (!result.success || !result.data) {
        logger.warn('Coach not found by code', 'UserService', { coachCode: normalizedCode });
        return {
          success: true,
          data: null,
          timestamp: new Date(),
        };
      }

      logger.info('Coach found by code', 'UserService', {
        coachCode: normalizedCode,
        coachId: result.data.coachId,
        coachName: result.data.coachName,
      });

      return {
        success: true,
        data: {
          id: result.data.coachId,
          displayName: result.data.coachName,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error looking up coach by code', 'UserService', { coachCode: normalizedCode, error });
      return {
        success: false,
        error: {
          code: 'COACH_LOOKUP_FAILED',
          message: 'Failed to look up coach',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Regenerate a coach's code (security feature).
   * Useful if a coach wants to revoke access for students who have their old code.
   *
   * @param coachId - The coach's user ID
   * @returns Promise resolving to the new coach code
   */
  async regenerateCoachCode(coachId: string): Promise<ApiResponse<{ coachCode: string }>> {
    logger.info('Regenerating coach code', 'UserService', { coachId });

    // Get the coach to verify they exist and have the coach role
    const coachResult = await this.getUser(coachId);
    if (!coachResult.success || !coachResult.data) {
      return {
        success: false,
        error: {
          code: 'COACH_NOT_FOUND',
          message: 'Coach not found',
        },
        timestamp: new Date(),
      };
    }

    if (coachResult.data.role !== 'coach') {
      return {
        success: false,
        error: {
          code: 'NOT_A_COACH',
          message: 'User is not a coach',
        },
        timestamp: new Date(),
      };
    }

    // Generate a new unique coach code
    const newCoachCode = await this.generateUniqueCoachCode(coachResult.data.displayName);

    // Update the coach's document with the new code
    const updateResult = await this.update<User>(this.USERS_COLLECTION, coachId, {
      coachCode: newCoachCode,
    });

    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error,
        timestamp: new Date(),
      };
    }

    // Register the new code in coach_codes collection for lookup
    await this.registerCoachCode(newCoachCode, coachId, coachResult.data.displayName);

    logger.info('Coach code regenerated successfully', 'UserService', {
      coachId,
      newCoachCode,
    });

    return {
      success: true,
      data: { coachCode: newCoachCode },
      timestamp: new Date(),
    };
  }

  /**
   * Retrieves comprehensive user data with progress information.
   * Used for chatbot and analytics that need complete user context.
   *
   * @param userId - The user ID to retrieve data for
   * @returns Promise resolving to user with all progress data
   */
  async getUserWithProgress(userId: string): Promise<ApiResponse<{
    user: User;
    sportProgress: SportProgress[];
    userProgress: UserProgress[];
    quizAttempts: VideoQuizProgress[];
  }>> {
    logger.database('read', 'user_with_progress', userId);

    try {
      // Get user data
      const userResult = await this.getUser(userId);
      if (!userResult.success || !userResult.data) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
          timestamp: new Date(),
        };
      }

      // Get all related progress data in parallel
      const [sportProgressResult, userProgressResult, quizAttemptsResult] = await Promise.all([
        this.query<SportProgress>('sport_progress', {
          where: [{ field: 'userId', operator: '==', value: userId }],
        }),
        this.query<UserProgress>('user_progress', {
          where: [{ field: 'userId', operator: '==', value: userId }],
        }),
        this.query<VideoQuizProgress>('quiz_attempts', {
          where: [{ field: 'userId', operator: '==', value: userId }],
        }),
      ]);

      const result = {
        user: userResult.data,
        sportProgress: sportProgressResult.success ? sportProgressResult.data?.items || [] : [],
        userProgress: userProgressResult.success ? userProgressResult.data?.items || [] : [],
        quizAttempts: quizAttemptsResult.success ? quizAttemptsResult.data?.items || [] : [],
      };

      logger.info('User with progress retrieved successfully', 'UserService', {
        userId,
        sportProgressCount: result.sportProgress.length,
        userProgressCount: result.userProgress.length,
        quizAttemptsCount: result.quizAttempts.length,
      });

      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to retrieve user with progress', 'UserService', { userId, error });
      return {
        success: false,
        error: {
          code: 'USER_PROGRESS_FETCH_ERROR',
          message: 'Failed to retrieve user progress data',
        },
        timestamp: new Date(),
      };
    }
  }
}

// Export singleton instance
export const userService = new UserService();