import { BaseDatabaseService } from '../base.service';
import { userService } from './user.service';
import { sportsService } from './sports.service';
import { ApiResponse } from '@/types';
import { sportDisplayName } from '@/lib/utils/pillars';
import { logger } from '../../utils/logger';

export interface PlatformAnalytics {
  users: {
    total: number;
    active: number;
    inactive: number;
    paused: number;
    newThisMonth: number;
    adminCount: number;
    studentCount: number;
    activeStudentCount: number;
  };
  content: {
    totalSports: number;
    totalSkills: number;
    totalQuizzes: number;
    averageSkillsPerSport: number;
  };
  engagement: {
    totalQuizAttempts: number;
    averageQuizScore: number;
    completionRate: number;
    activeUsersToday: number;
  };
  performance: {
    averageResponseTime: number;
    systemUptime: number;
    errorRate: number;
    lastUpdated: Date;
  };
}

export interface UserEngagementData {
  date: string;
  activeUsers: number;
  quizAttempts: number;
  averageScore: number;
}

export interface ContentPopularity {
  sportId: string;
  sportName: string;
  views: number;
  completions: number;
  averageRating: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  services: {
    database: 'online' | 'offline' | 'degraded';
    auth: 'online' | 'offline' | 'degraded';
    storage: 'online' | 'offline' | 'degraded';
  };
}

/**
 * Service for collecting and providing platform analytics and system health metrics.
 *
 * This service aggregates data from various sources to provide insights into:
 * - User engagement and growth
 * - Content performance and popularity
 * - System health and performance
 * - Real-time platform statistics
 *
 * @example
 * ```typescript
 * // Get platform overview
 * const analytics = await analyticsService.getPlatformAnalytics();
 *
 * // Get user engagement trends
 * const engagement = await analyticsService.getUserEngagementData(30);
 *
 * // Check system health
 * const health = await analyticsService.getSystemHealth();
 * ```
 */
export class AnalyticsService extends BaseDatabaseService {
  private readonly ANALYTICS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private analyticsCache: { data: PlatformAnalytics; timestamp: number } | null = null;

  /**
   * Gets comprehensive platform analytics including user, content, and engagement metrics.
   * Results are cached for 5 minutes to improve performance.
   */
  async getPlatformAnalytics(): Promise<ApiResponse<PlatformAnalytics>> {
    logger.info('Fetching platform analytics', 'AnalyticsService');

    // Check cache first
    if (this.analyticsCache &&
        Date.now() - this.analyticsCache.timestamp < this.ANALYTICS_CACHE_DURATION) {
      logger.debug('Returning cached analytics data', 'AnalyticsService');
      return {
        success: true,
        data: this.analyticsCache.data,
        timestamp: new Date(),
      };
    }

    try {
      // Fetch data in parallel for better performance
      const [usersResult, sportsResult, quizzesResult] = await Promise.all([
        this.getUserAnalytics(),
        this.getContentAnalytics(),
        this.getEngagementAnalytics(),
      ]);

      if (!usersResult.success || !sportsResult.success || !quizzesResult.success) {
        return {
          success: false,
          error: {
            code: 'ANALYTICS_FETCH_FAILED',
            message: 'Failed to fetch analytics data',
          },
          timestamp: new Date(),
        };
      }

      const analytics: PlatformAnalytics = {
        users: usersResult.data!,
        content: sportsResult.data!,
        engagement: quizzesResult.data!,
        performance: {
          averageResponseTime: this.getAverageResponseTime(),
          systemUptime: this.getSystemUptime(),
          errorRate: this.getErrorRate(),
          lastUpdated: new Date(),
        },
      };

      // Cache the results
      this.analyticsCache = {
        data: analytics,
        timestamp: Date.now(),
      };

      logger.info('Platform analytics fetched successfully', 'AnalyticsService', {
        totalUsers: analytics.users.total,
        totalSports: analytics.content.totalSports,
        totalQuizAttempts: analytics.engagement.totalQuizAttempts,
      });

      return {
        success: true,
        data: analytics,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch platform analytics', 'AnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to fetch platform analytics',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets user engagement data for the specified number of days.
   */
  async getUserEngagementData(days: number = 30): Promise<ApiResponse<UserEngagementData[]>> {
    logger.info('Fetching user engagement data', 'AnalyticsService', { days });

    try {
      // Query quiz attempts and users in parallel
      const [quizAttemptsResult, usersResult] = await Promise.all([
        this.query<any>('quiz_attempts', {
          where: [{ field: 'isCompleted', operator: '==', value: true }],
          limit: 10000,
        }),
        this.query<any>('users', {
          where: [{ field: 'isActive', operator: '==', value: true }],
          limit: 10000,
        }),
      ]);

      const quizAttempts = quizAttemptsResult.success ? quizAttemptsResult.data?.items || [] : [];
      const users = usersResult.success ? usersResult.data?.items || [] : [];

      // Group quiz attempts by date
      const attemptsByDate = new Map<string, any[]>();
      const usersByDate = new Map<string, Set<string>>();

      // Track active users by lastLoginAt
      users.forEach((u: any) => {
        if (u.lastLoginAt) {
          const date = u.lastLoginAt.toDate
            ? u.lastLoginAt.toDate()
            : new Date(u.lastLoginAt);
          const dateStr = date.toISOString().split('T')[0];
          if (!usersByDate.has(dateStr)) {
            usersByDate.set(dateStr, new Set());
          }
          usersByDate.get(dateStr)!.add(u.id);
        }
      });

      quizAttempts.forEach((attempt: any) => {
        if (attempt.submittedAt) {
          const date = attempt.submittedAt.toDate
            ? attempt.submittedAt.toDate()
            : new Date(attempt.submittedAt);
          const dateStr = date.toISOString().split('T')[0];

          // Group attempts by date
          if (!attemptsByDate.has(dateStr)) {
            attemptsByDate.set(dateStr, []);
          }
          attemptsByDate.get(dateStr)!.push(attempt);

          // Also track quiz users as active
          if (!usersByDate.has(dateStr)) {
            usersByDate.set(dateStr, new Set());
          }
          usersByDate.get(dateStr)!.add(attempt.userId);
        }
      });

      // Build engagement data for each day
      const engagementData: UserEngagementData[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayAttempts = attemptsByDate.get(dateStr) || [];
        const activeUsers = usersByDate.get(dateStr)?.size || 0;
        const quizAttemptsCount = dayAttempts.length;
        const averageScore = quizAttemptsCount > 0
          ? Math.round(dayAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / quizAttemptsCount)
          : 0;

        engagementData.push({
          date: dateStr,
          activeUsers,
          quizAttempts: quizAttemptsCount,
          averageScore,
        });
      }

      return {
        success: true,
        data: engagementData,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch engagement data', 'AnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'ENGAGEMENT_FETCH_FAILED',
          message: 'Failed to fetch user engagement data',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets content popularity metrics.
   */
  async getContentPopularity(): Promise<ApiResponse<ContentPopularity[]>> {
    try {
      const sportsResult = await sportsService.getAllSports();

      if (!sportsResult.success || !sportsResult.data) {
        return {
          success: false,
          error: {
            code: 'SPORTS_FETCH_FAILED',
            message: 'Failed to fetch sports data',
          },
          timestamp: new Date(),
        };
      }

      // Use real metadata from sports or return zero values for new data
      const popularityData: ContentPopularity[] = sportsResult.data.items.map(sport => ({
        sportId: sport.id,
        sportName: sportDisplayName(sport),
        views: sport.metadata?.totalEnrollments || 0,
        completions: sport.metadata?.totalCompletions || 0,
        averageRating: sport.metadata?.averageRating || 0,
      }));

      // Sort by views descending
      popularityData.sort((a, b) => b.views - a.views);

      return {
        success: true,
        data: popularityData,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch content popularity', 'AnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'POPULARITY_FETCH_FAILED',
          message: 'Failed to fetch content popularity data',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Gets current system health status.
   */
  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    logger.info('Checking system health', 'AnalyticsService');

    try {
      // Perform basic health checks
      const dbCheck = await this.checkDatabaseHealth();
      const authCheck = await this.checkAuthHealth();
      const storageCheck = await this.checkStorageHealth();

      const health: SystemHealth = {
        status: this.determineOverallStatus(dbCheck, authCheck, storageCheck),
        uptime: this.getSystemUptime(),
        responseTime: this.getAverageResponseTime(),
        errorRate: this.getErrorRate(),
        lastCheck: new Date(),
        services: {
          database: dbCheck,
          auth: authCheck,
          storage: storageCheck,
        },
      };

      return {
        success: true,
        data: health,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('System health check failed', 'AnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Failed to check system health',
        },
        timestamp: new Date(),
      };
    }
  }

  // Private helper methods for fetching specific analytics

  private async getUserAnalytics() {
    const allUsersResult = await userService.getAllUsers({ limit: 1000 });

    if (!allUsersResult.success || !allUsersResult.data) {
      return { success: false, error: { code: 'USER_FETCH_FAILED', message: 'Failed to fetch users' } };
    }

    const users = allUsersResult.data.items;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const userStats = {
      total: users.length,
      // Paused accounts are Michael's subscription pause switch: still fully
      // on the books, but not active until switched back on.
      active: users.filter(u => u.isActive && u.isPaused !== true).length,
      inactive: users.filter(u => !u.isActive).length,
      paused: users.filter(u => u.isPaused === true).length,
      activeStudentCount: users.filter(u => u.role === 'student' && u.isPaused !== true).length,
      newThisMonth: users.filter(u => u.createdAt && (typeof u.createdAt === 'object' && 'toDate' in u.createdAt ? u.createdAt.toDate() : new Date(u.createdAt as unknown as string | number)) >= startOfMonth).length,
      adminCount: users.filter(u => u.role === 'admin').length,
      studentCount: users.filter(u => u.role === 'student').length,
      coachCount: users.filter(u => u.role === 'coach').length,
      parentCount: users.filter(u => u.role === 'parent').length,
    };

    return { success: true, data: userStats };
  }

  private async getContentAnalytics() {
    const sportsResult = await sportsService.getAllSports();

    if (!sportsResult.success || !sportsResult.data) {
      return { success: false, error: { code: 'CONTENT_FETCH_FAILED', message: 'Failed to fetch content' } };
    }

    const sports = sportsResult.data.items;
    // Use skillsCount from sport metadata instead of trying to access nested skills
    const totalSkills = sports.reduce((sum, sport) => sum + sport.skillsCount, 0);

    const contentStats = {
      totalSports: sports.length,
      totalSkills,
      totalQuizzes: 0, // Would be fetched from quiz service
      averageSkillsPerSport: sports.length > 0 ? Math.round(totalSkills / sports.length) : 0,
    };

    return { success: true, data: contentStats };
  }

  private async getEngagementAnalytics() {
    // Query real engagement data from sport_progress and quiz_attempts collections
    try {
      const [progressResult, quizAttemptsResult] = await Promise.all([
        this.query<any>('sport_progress', {}),
        this.query<any>('quiz_attempts', {
          where: [{ field: 'isCompleted', operator: '==', value: true }],
          limit: 10000
        }),
      ]);

      const progressData = progressResult.success ? progressResult.data?.items || [] : [];
      const quizAttempts = quizAttemptsResult.success ? quizAttemptsResult.data?.items || [] : [];

      // Calculate total quiz attempts and average score
      const totalQuizAttempts = quizAttempts.length;
      const averageQuizScore = totalQuizAttempts > 0
        ? Math.round(quizAttempts.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0) / totalQuizAttempts)
        : 0;

      // Calculate completion rate from sport progress
      const completionRate = progressData.length > 0
        ? Math.round((progressData.filter(p => p.status === 'completed').length / progressData.length) * 100)
        : 0;

      // Calculate active users today
      const today = new Date().toDateString();
      const activeUsersToday = progressData.filter(p => {
        const lastAccessed = p.lastAccessedAt && typeof p.lastAccessedAt.toDate === 'function'
          ? p.lastAccessedAt.toDate().toDateString()
          : null;
        return lastAccessed === today;
      }).length;

      const engagementStats = {
        totalQuizAttempts,
        averageQuizScore,
        completionRate,
        activeUsersToday,
      };

      return { success: true, data: engagementStats };
    } catch (error) {
      logger.error('Failed to fetch engagement analytics', 'AnalyticsService', error);
      // Return zero values on error
      return {
        success: true,
        data: {
          totalQuizAttempts: 0,
          averageQuizScore: 0,
          completionRate: 0,
          activeUsersToday: 0,
        }
      };
    }
  }

  // System health check methods

  private async checkDatabaseHealth(): Promise<'online' | 'offline' | 'degraded'> {
    try {
      // Simple test query
      await userService.getAllUsers({ limit: 1 });
      return 'online';
    } catch (error) {
      logger.warn('Database health check failed', 'AnalyticsService', error);
      return 'degraded';
    }
  }

  private async checkAuthHealth(): Promise<'online' | 'offline' | 'degraded'> {
    // In a real implementation, this would test Firebase Auth
    return 'online';
  }

  private async checkStorageHealth(): Promise<'online' | 'offline' | 'degraded'> {
    // In a real implementation, this would test Firebase Storage
    return 'online';
  }

  private determineOverallStatus(
    db: string,
    auth: string,
    storage: string
  ): 'healthy' | 'warning' | 'critical' {
    const services = [db, auth, storage];

    if (services.every(s => s === 'online')) return 'healthy';
    if (services.some(s => s === 'offline')) return 'critical';
    return 'warning';
  }

  private getSystemUptime(): number {
    // Return uptime in percentage (for demo, always high)
    return 99.9;
  }

  private getAverageResponseTime(): number {
    // Would be calculated from actual request metrics
    return 100; // Default value until real metrics are implemented
  }

  private getErrorRate(): number {
    // Would be calculated from actual error logs
    return 0; // Default value until real error tracking is implemented
  }

  /**
   * Clears the analytics cache to force fresh data on next request.
   */
  clearCache(): void {
    this.analyticsCache = null;
    logger.debug('Analytics cache cleared', 'AnalyticsService');
  }

  /**
   * Gets cache status for debugging.
   */
  getCacheInfo(): { cached: boolean; age: number } {
    if (!this.analyticsCache) {
      return { cached: false, age: 0 };
    }

    return {
      cached: true,
      age: Date.now() - this.analyticsCache.timestamp,
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();