import { BaseDatabaseService } from '../base.service';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  runTransaction,
  increment,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  SportProgress,
  SkillProgress,
  UserProgress,
  OverallStats,
  UserAchievement,
  Achievement,
  ApiResponse,
  StreakInfo,
  VideoProgress,
} from '@/types';
import { logger } from '@/lib/utils/logger';
import { withRetry } from '@/lib/database/utils/error-recovery';
import { cacheService } from '@/lib/utils/cache.service';

/**
 * Type for updating OverallStats where numeric fields can accept FieldValue (for increment())
 */
type OverallStatsUpdate = {
  [K in keyof OverallStats]?: OverallStats[K] | FieldValue;
};

/**
 * Service for managing user progress tracking, analytics, and achievements
 * Handles sport progress, skill progress, achievements, and statistics
 */
export class ProgressService extends BaseDatabaseService {
  private static readonly COLLECTIONS = {
    SPORT_PROGRESS: 'sport_progress',
    SKILL_PROGRESS: 'skill_progress',
    USER_PROGRESS: 'user_progress',
    USER_ACHIEVEMENTS: 'user_achievements',
    ACHIEVEMENTS: 'achievements',
  } as const;

  private static cache = cacheService;

  /**
   * Starting stats for a student who has no progress document yet. Most student accounts
   * are created without one, so the first write to `user_progress` has to build the record
   * rather than assume it exists.
   */
  private static readonly DEFAULT_OVERALL_STATS: OverallStats = {
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
  };

  /**
   * Get user's overall progress statistics from video quiz data
   */
  static async getUserProgress(userId: string): Promise<ApiResponse<UserProgress | null>> {
    try {
      // Use userService which calculates progress from video quiz attempts
      const { userService } = await import('./user.service');
      const result = await userService.getUserProgress(userId);

      if (result.success && result.data) {
        // Cache the result
        const cacheKey = `user_progress_${userId}`;
        this.cache.set(cacheKey, result.data);
        logger.info('Retrieved user progress from video quiz data', 'ProgressService', {
          userId,
          skillsCompleted: result.data.overallStats.skillsCompleted,
          quizzesCompleted: result.data.overallStats.quizzesCompleted
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to get user progress', 'ProgressService', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: {
          code: 'PROGRESS_FETCH_ERROR',
          message: 'Failed to fetch user progress',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user's sport-specific progress
   */
  static async getSportProgress(userId: string, sportId: string): Promise<ApiResponse<SportProgress | null>> {
    try {
      const cacheKey = `sport_progress_${userId}_${sportId}`;
      const cached = this.cache.get<SportProgress>(cacheKey);
      if (cached) {
        return { success: true, data: cached, timestamp: new Date() };
      }

      const q = query(
        collection(db, this.COLLECTIONS.SPORT_PROGRESS),
        where('userId', '==', userId),
        where('sportId', '==', sportId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: true, data: null, timestamp: new Date() };
      }

      const doc = querySnapshot.docs[0];
      const progress = { id: doc.id, ...doc.data() } as SportProgress;
      this.cache.set(cacheKey, progress);

      logger.info('Retrieved sport progress', 'ProgressService', { userId, sportId, progress: progress.progressPercentage });
      return { success: true, data: progress, timestamp: new Date() };
    } catch (error) {
      logger.error('Failed to get sport progress', 'ProgressService', {
        userId,
        sportId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: {
          code: 'SPORT_PROGRESS_FETCH_ERROR',
          message: 'Failed to fetch sport progress',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user's skill-specific progress
   */
  static async getSkillProgress(userId: string, skillId: string): Promise<ApiResponse<SkillProgress | null>> {
    try {
      const cacheKey = `skill_progress_${userId}_${skillId}`;
      const cached = this.cache.get<SkillProgress>(cacheKey);
      if (cached) {
        return { success: true, data: cached, timestamp: new Date() };
      }

      const q = query(
        collection(db, this.COLLECTIONS.SKILL_PROGRESS),
        where('userId', '==', userId),
        where('skillId', '==', skillId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: true, data: null, timestamp: new Date() };
      }

      const doc = querySnapshot.docs[0];
      const progress = { id: doc.id, ...doc.data() } as SkillProgress;
      this.cache.set(cacheKey, progress);

      return { success: true, data: progress, timestamp: new Date() };
    } catch (error) {
      logger.error('Failed to get skill progress', 'ProgressService', {
        userId,
        skillId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: {
          code: 'SKILL_PROGRESS_FETCH_ERROR',
          message: 'Failed to fetch skill progress',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update sport progress for a user
   */
  static async updateSportProgress(
    userId: string,
    sportId: string,
    updates: Partial<SportProgress>
  ): Promise<ApiResponse<SportProgress>> {
    try {
      return await withRetry(async () => {
        const progress = await runTransaction(db, async (transaction) => {
          // Get or create sport progress
          const q = query(
            collection(db, this.COLLECTIONS.SPORT_PROGRESS),
            where('userId', '==', userId),
            where('sportId', '==', sportId)
          );

          const querySnapshot = await getDocs(q);
          let docRef;
          let currentProgress: SportProgress;

          if (querySnapshot.empty) {
            // Create new progress record
            docRef = doc(collection(db, this.COLLECTIONS.SPORT_PROGRESS));
            currentProgress = {
              id: docRef.id,
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
                lastActiveDate: Timestamp.now(),
              },
              startedAt: Timestamp.now(),
              lastAccessedAt: Timestamp.now(),
              ...updates,
            };
          } else {
            docRef = querySnapshot.docs[0].ref;
            currentProgress = { id: docRef.id, ...querySnapshot.docs[0].data() } as SportProgress;
            currentProgress = { ...currentProgress, ...updates, lastAccessedAt: Timestamp.now() };
          }

          transaction.set(docRef, currentProgress);

          // Update overall user progress if sport completed
          if (updates.status === 'completed' && currentProgress.status !== 'completed') {
            await this.updateOverallStats(userId, {
              sportsCompleted: increment(1),
              totalPoints: increment(100), // Base points for completing sport
            });
          }

          // Invalidate cache
          this.cache.delete(`sport_progress_${userId}_${sportId}`);
          this.cache.delete(`user_progress_${userId}`);

          logger.info('Updated sport progress', 'ProgressService', {
            userId,
            sportId,
            status: currentProgress.status,
            progress: currentProgress.progressPercentage
          });

          return currentProgress;
        });
        return {
          success: true,
          data: progress,
          timestamp: new Date(),
        };
      });
    } catch (error) {
      logger.error('Failed to update sport progress', 'ProgressService', {
        userId,
        sportId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: {
          code: 'SPORT_PROGRESS_UPDATE_ERROR',
          message: 'Failed to update sport progress',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update skill progress for a user
   */
  static async updateSkillProgress(
    userId: string,
    skillId: string,
    sportId: string,
    updates: Partial<SkillProgress>
  ): Promise<ApiResponse<SkillProgress>> {
    try {
      return await withRetry(async () => {
        const progress = await runTransaction(db, async (transaction) => {
          // Get or create skill progress
          const q = query(
            collection(db, this.COLLECTIONS.SKILL_PROGRESS),
            where('userId', '==', userId),
            where('skillId', '==', skillId)
          );

          const querySnapshot = await getDocs(q);
          let docRef;
          let currentProgress: SkillProgress;

          if (querySnapshot.empty) {
            // Create new progress record
            docRef = doc(collection(db, this.COLLECTIONS.SKILL_PROGRESS));
            currentProgress = {
              id: docRef.id,
              userId,
              skillId,
              sportId,
              status: 'not_started',
              progressPercentage: 0,
              timeSpent: 0,
              bookmarked: false,
              notes: '',
              startedAt: Timestamp.now(),
              lastAccessedAt: Timestamp.now(),
              ...updates,
            };
          } else {
            docRef = querySnapshot.docs[0].ref;
            currentProgress = { id: docRef.id, ...querySnapshot.docs[0].data() } as SkillProgress;
            currentProgress = { ...currentProgress, ...updates, lastAccessedAt: Timestamp.now() };
          }

          transaction.set(docRef, currentProgress);

          // Update overall user progress if skill completed
          if (updates.status === 'completed' && currentProgress.status !== 'completed') {
            await this.updateOverallStats(userId, {
              skillsCompleted: increment(1),
              totalPoints: increment(50), // Base points for completing skill
            });

            // Update sport progress
            await this.updateSportSkillCompletion(userId, sportId, skillId);
          }

          // Invalidate cache
          this.cache.delete(`skill_progress_${userId}_${skillId}`);
          this.cache.delete(`sport_progress_${userId}_${sportId}`);
          this.cache.delete(`user_progress_${userId}`);

          logger.info('Updated skill progress', 'ProgressService', {
            userId,
            skillId,
            sportId,
            status: currentProgress.status,
            progress: currentProgress.progressPercentage
          });

          return currentProgress;
        });
        return {
          success: true,
          data: progress,
          timestamp: new Date(),
        };
      });
    } catch (error) {
      logger.error('Failed to update skill progress', 'ProgressService', {
        userId,
        skillId,
        sportId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: {
          code: 'SKILL_PROGRESS_UPDATE_ERROR',
          message: 'Failed to update skill progress',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update video progress for a skill
   */
  static async updateVideoProgress(
    userId: string,
    skillId: string,
    videoProgress: VideoProgress
  ): Promise<ApiResponse<void>> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.SKILL_PROGRESS),
        where('userId', '==', userId),
        where('skillId', '==', skillId)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          videoProgress,
          lastAccessedAt: Timestamp.now(),
        });

        // Invalidate cache
        this.cache.delete(`skill_progress_${userId}_${skillId}`);

        logger.info('Updated video progress', 'ProgressService', { userId, skillId, progress: videoProgress.progressPercentage });
      }

      return { success: true, timestamp: new Date() };
    } catch (error) {
      logger.error('Failed to update video progress', 'ProgressService', {
        userId,
        skillId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: {
          code: 'VIDEO_PROGRESS_UPDATE_ERROR',
          message: 'Failed to update video progress',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Record quiz completion and update progress
   */
  static async recordQuizCompletion(
    userId: string,
    quizId: string,
    skillId: string,
    sportId: string,
    score: number,
    timeSpent: number,
    passed: boolean
  ): Promise<ApiResponse<void>> {
    try {
      return await withRetry(async () => {
        await runTransaction(db, async (_transaction) => {
          // Get current skill progress to calculate new timeSpent
          const currentSkillProgress = await this.getSkillProgress(userId, skillId);
          const currentTimeSpent = currentSkillProgress.data?.timeSpent || 0;

          // Update skill progress
          await this.updateSkillProgress(userId, skillId, sportId, {
            quizScore: score,
            timeSpent: currentTimeSpent + timeSpent,
            status: passed ? 'completed' : 'in_progress',
          });

          // Update overall stats
          const statsUpdate: OverallStatsUpdate = {
            quizzesCompleted: increment(1),
            totalTimeSpent: increment(timeSpent),
            totalPoints: increment(passed ? score : Math.floor(score / 2)),
          };

          // Calculate new average quiz score
          const userProgressResult = await this.getUserProgress(userId);
          if (userProgressResult.success && userProgressResult.data) {
            const currentStats = userProgressResult.data.overallStats;
            const newAverage = (
              (currentStats.averageQuizScore * currentStats.quizzesCompleted + score) /
              (currentStats.quizzesCompleted + 1)
            );
            statsUpdate.averageQuizScore = newAverage;
          }

          await this.updateOverallStats(userId, statsUpdate);

          // Check for achievements
          await this.checkQuizAchievements(userId, score, passed);
        });

        logger.info('Recorded quiz completion', 'ProgressService', { userId, quizId, score, passed });
        return { success: true, timestamp: new Date() };
      });
    } catch (error) {
      logger.error('Failed to record quiz completion', 'ProgressService', {
        userId,
        quizId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: {
          code: 'QUIZ_COMPLETION_ERROR',
          message: 'Failed to record quiz completion',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user's achievement progress
   */
  static async getUserAchievements(userId: string): Promise<ApiResponse<UserAchievement[]>> {
    try {
      const cacheKey = `user_achievements_${userId}`;
      const cached = this.cache.get<UserAchievement[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached, timestamp: new Date() };
      }

      const q = query(
        collection(db, this.COLLECTIONS.USER_ACHIEVEMENTS),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const achievements: UserAchievement[] = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as UserAchievement))
        .sort((a, b) => {
          const aTime = a.unlockedAt?.toMillis?.() || 0;
          const bTime = b.unlockedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });

      this.cache.set(cacheKey, achievements);

      logger.info('Retrieved user achievements', 'ProgressService', { userId, count: achievements.length });
      return { success: true, data: achievements, timestamp: new Date() };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : (typeof error === 'object' && error !== null && 'message' in error)
          ? String((error as { message?: unknown }).message)
          : String(error);

      logger.error('Failed to get user achievements', 'ProgressService', {
        userId,
        error: errorMessage
      });
      return {
        success: false,
        error: {
          code: 'ACHIEVEMENTS_FETCH_ERROR',
          message: 'Failed to fetch user achievements',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get all available achievements
   */
  static async getAvailableAchievements(): Promise<ApiResponse<Achievement[]>> {
    try {
      const cacheKey = 'available_achievements';
      const cached = this.cache.get<Achievement[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached, timestamp: new Date() };
      }

      // Avoid composite-index dependency by sorting client-side.
      const q = query(
        collection(db, this.COLLECTIONS.ACHIEVEMENTS),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const achievements: Achievement[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Achievement));

      const rarityOrder: Record<Achievement['rarity'], number> = {
        common: 0,
        uncommon: 1,
        rare: 2,
        epic: 3,
        legendary: 4,
      };

      achievements.sort((a, b) => {
        const rarityDiff = (rarityOrder[a.rarity] ?? 999) - (rarityOrder[b.rarity] ?? 999);
        if (rarityDiff !== 0) return rarityDiff;
        return (b.points ?? 0) - (a.points ?? 0);
      });

      this.cache.set(cacheKey, achievements, 30 * 60 * 1000); // Cache for 30 minutes

      return { success: true, data: achievements, timestamp: new Date() };
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';

      // Achievements are non-critical for app flow; degrade gracefully for rules/index issues.
      if (errorCode === 'permission-denied' || errorCode === 'failed-precondition') {
        logger.warn('Unable to load available achievements; returning empty list', 'ProgressService', {
          errorCode,
          error: errorMessage,
        });
        return {
          success: true,
          data: [],
          timestamp: new Date(),
        };
      }

      logger.error('Failed to get available achievements', 'ProgressService', {
        errorCode,
        error: errorMessage,
      });
      return {
        success: false,
        error: {
          code: 'ACHIEVEMENTS_FETCH_ERROR',
          message: 'Failed to fetch available achievements',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Award achievement to user
   */
  static async awardAchievement(
    userId: string,
    achievementId: string
  ): Promise<ApiResponse<UserAchievement>> {
    try {
      // Check if user already has this achievement
      const existingQuery = query(
        collection(db, this.COLLECTIONS.USER_ACHIEVEMENTS),
        where('userId', '==', userId),
        where('achievementId', '==', achievementId)
      );

      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        const existing = existingSnapshot.docs[0].data() as UserAchievement;
        return { success: true, data: existing, timestamp: new Date() };
      }

      // Get achievement details for points
      const achievementDoc = await getDoc(doc(db, this.COLLECTIONS.ACHIEVEMENTS, achievementId));
      if (!achievementDoc.exists()) {
        return {
          success: false,
          error: {
            code: 'ACHIEVEMENT_NOT_FOUND',
            message: 'Achievement not found',
          },
          timestamp: new Date(),
        };
      }

      const achievement = achievementDoc.data() as Achievement;

      // Create document reference first to get the ID
      const docRef = doc(collection(db, this.COLLECTIONS.USER_ACHIEVEMENTS));

      // Create user achievement with id
      const userAchievement: UserAchievement = {
        id: docRef.id,
        userId,
        achievementId,
        progress: 100,
        isCompleted: true,
        unlockedAt: Timestamp.now(),
        isNotified: false,
      };

      await setDoc(docRef, userAchievement);

      // Update user's overall stats
      await this.updateOverallStats(userId, {
        totalPoints: increment(achievement.points),
        experiencePoints: increment(achievement.points),
      });

      // Invalidate cache
      this.cache.delete(`user_achievements_${userId}`);
      this.cache.delete(`user_progress_${userId}`);

      logger.info('Awarded achievement', 'ProgressService', { userId, achievementId, points: achievement.points });
      return { success: true, data: userAchievement, timestamp: new Date() };
    } catch (error) {
      logger.error('Failed to award achievement', 'ProgressService', {
        userId,
        achievementId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: {
          code: 'ACHIEVEMENT_AWARD_ERROR',
          message: 'Failed to award achievement',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update user's learning streak
   */
  static async updateStreak(userId: string): Promise<ApiResponse<StreakInfo>> {
    try {
      const userProgressResult = await this.getUserProgress(userId);

      // A failed lookup is worth reporting. A missing progress record is not: most student
      // accounts are created without one, and "no record yet" just means this is day one of
      // the streak. Treating the two the same is what made every such login log an error.
      if (!userProgressResult.success) {
        throw new Error(userProgressResult.error?.message || 'Failed to get user progress');
      }

      const stats = userProgressResult.data?.overallStats;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let newStreak = stats?.currentStreak || 0;
      let longestStreak = stats?.longestStreak || 0;

      if (stats?.lastStreakDate) {
        const last = stats.lastStreakDate.toDate();
        const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
        const daysDiff = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          // Already logged in today — no change needed
        } else if (daysDiff === 1) {
          // Consecutive day — extend streak
          newStreak += 1;
        } else {
          // Gap in login — reset
          newStreak = 1;
        }
      } else {
        // First time ever logging in — start streak
        newStreak = 1;
      }

      if (newStreak > longestStreak) {
        longestStreak = newStreak;
      }

      const streakInfo: StreakInfo = {
        current: newStreak,
        longest: longestStreak,
        lastActiveDate: Timestamp.now(),
      };

      await this.updateOverallStats(userId, {
        currentStreak: newStreak,
        longestStreak,
        lastStreakDate: Timestamp.now(),
      });

      // Check for streak achievements
      await this.checkStreakAchievements(userId, newStreak, longestStreak);

      logger.info('Updated user streak', 'ProgressService', { userId, currentStreak: newStreak, longestStreak });
      return { success: true, data: streakInfo, timestamp: new Date() };
    } catch (error) {
      // The reason goes in the message, not only in the data payload: the dev overlay
      // renders that payload as `{}`, which is what made this failure unreadable.
      const reason = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to update streak: ${reason}`, 'ProgressService', {
        userId,
        error: reason,
      });
      return {
        success: false,
        error: {
          code: 'STREAK_UPDATE_ERROR',
          message: 'Failed to update learning streak',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user's learning analytics
   */
  static async getLearningAnalytics(
    userId: string,
    timeframe: 'week' | 'month' | 'year' = 'month'
  ): Promise<ApiResponse<any>> {
    try {
      // This would implement detailed analytics queries
      // For now, return basic structure
      const analytics = {
        timeframe,
        totalSessions: 0,
        averageSessionTime: 0,
        skillsProgress: [],
        quizPerformance: [],
        streakData: [],
        focusAreas: [],
        recommendations: [],
      };

      return { success: true, data: analytics, timestamp: new Date() };
    } catch (error) {
      logger.error('Failed to get learning analytics', 'ProgressService', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to fetch learning analytics',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  // Private helper methods

  /**
   * Update overall user statistics
   */
  private static async updateOverallStats(
    userId: string,
    updates: OverallStatsUpdate
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTIONS.USER_PROGRESS, userId);

    // Calculate level based on experience points
    if (updates.experiencePoints) {
      const currentProgressResult = await this.getUserProgress(userId);
      if (currentProgressResult.success && currentProgressResult.data) {
        const currentXP = currentProgressResult.data.overallStats.experiencePoints;
        const newXP = typeof updates.experiencePoints === 'object'
          ? currentXP + (updates.experiencePoints as any).operand
          : updates.experiencePoints;

        const newLevel = Math.floor(newXP / 1000) + 1; // 1000 XP per level
        updates.level = newLevel;
      }
    }

    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      // Dotted keys are read as a path into `overallStats`. That only holds for updateDoc.
      await updateDoc(docRef, {
        ...Object.fromEntries(
          Object.entries(updates).map(([key, value]) => [`overallStats.${key}`, value])
        ),
        lastUpdated: Timestamp.now(),
      });
    } else {
      // updateDoc throws on a document that doesn't exist, and most student accounts have
      // never had one, so the first write has to create it. Note the shape change: setDoc
      // does NOT read dots as a path, so the update goes in nested. Reusing the flat
      // `overallStats.x` keys here would create a literal field of that name sitting next
      // to the real object.
      await setDoc(docRef, {
        userId,
        overallStats: { ...this.DEFAULT_OVERALL_STATS, ...updates },
        achievements: [],
        lastUpdated: Timestamp.now(),
      });
    }

    // Invalidate cache
    this.cache.delete(`user_progress_${userId}`);
  }

  /**
   * Update sport progress when skill is completed
   */
  private static async updateSportSkillCompletion(
    userId: string,
    sportId: string,
    skillId: string
  ): Promise<void> {
    const sportProgressResult = await this.getSportProgress(userId, sportId);
    if (sportProgressResult.success && sportProgressResult.data) {
      const sportProgress = sportProgressResult.data;
      const completedSkills = [...sportProgress.completedSkills];

      if (!completedSkills.includes(skillId)) {
        completedSkills.push(skillId);
        const progressPercentage = Math.round(
          (completedSkills.length / sportProgress.totalSkills) * 100
        );

        await this.updateSportProgress(userId, sportId, {
          completedSkills,
          progressPercentage,
          status: progressPercentage === 100 ? 'completed' : 'in_progress',
        });
      }
    }
  }

  /**
   * Check and award quiz-related achievements
   */
  private static async checkQuizAchievements(
    userId: string,
    score: number,
    passed: boolean
  ): Promise<void> {
    // Example achievement checks
    if (score === 100) {
      await this.awardAchievement(userId, 'perfect_score');
    }

    if (passed) {
      await this.awardAchievement(userId, 'first_quiz_pass');
    }

    // Check for multiple quiz completions
    const userProgressResult = await this.getUserProgress(userId);
    if (userProgressResult.success && userProgressResult.data) {
      const quizCount = userProgressResult.data.overallStats.quizzesCompleted;

      if (quizCount >= 10) {
        await this.awardAchievement(userId, 'quiz_master');
      }

      if (quizCount >= 50) {
        await this.awardAchievement(userId, 'quiz_legend');
      }
    }
  }

  /**
   * Check and award streak-related achievements
   */
  private static async checkStreakAchievements(
    userId: string,
    currentStreak: number,
    longestStreak: number
  ): Promise<void> {
    if (currentStreak >= 7) {
      await this.awardAchievement(userId, 'week_warrior');
    }

    if (currentStreak >= 30) {
      await this.awardAchievement(userId, 'month_master');
    }

    if (longestStreak >= 100) {
      await this.awardAchievement(userId, 'streak_legend');
    }
  }

  /**
   * ========================================
   * WORKFLOW TYPE METHODS (Phase 2.0.6)
   * ========================================
   */

  /**
   * Check if user can access content based on workflow type
   * - Automated workflow: Check if level is unlocked via standard progression
   * - Custom workflow: Check if item is in curriculum and unlocked
   */
  static async canAccessContent(
    userId: string,
    contentId: string,
    _contentType: 'lesson' | 'quiz'
  ): Promise<ApiResponse<boolean>> {
    try {
      const { userService } = await import('./user.service');
      const userResult = await userService.getUser(userId);

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

      const user = userResult.data;

      // If automated workflow or no workflow type set (default to automated).
      // A custom-workflow goalie with no assigned coach is treated as automated
      // too: nobody can manage their curriculum, so gating them on it would
      // silently lock them out of all content.
      if (!user.workflowType || user.workflowType === 'automated' || !user.assignedCoachId) {
        // TODO: Implement standard level unlock check when Phase 2.1 (6 Pillars) is complete
        // For now, allow access (backward compatible with current system)
        return {
          success: true,
          data: true,
          timestamp: new Date(),
        };
      }

      // Custom workflow: check curriculum
      const { customCurriculumService } = await import('./custom-curriculum.service');
      const curriculumResult = await customCurriculumService.getStudentCurriculum(userId);

      if (!curriculumResult.success || !curriculumResult.data) {
        // No curriculum yet, deny access
        return {
          success: true,
          data: false,
          timestamp: new Date(),
        };
      }

      const curriculum = curriculumResult.data;

      // Check if content is in curriculum and unlocked
      const item = curriculum.items.find(
        i => i.contentId === contentId && (i.status === 'unlocked' || i.status === 'in_progress' || i.status === 'completed')
      );

      return {
        success: true,
        data: !!item,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to check content access', 'ProgressService', {
        userId,
        contentId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: {
          code: 'ACCESS_CHECK_ERROR',
          message: 'Failed to check content access',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Notify coach when custom workflow student completes content
   */
  static async notifyCoachOfCompletion(
    studentId: string,
    coachId: string,
    contentId: string,
    contentTitle: string,
    score?: number
  ): Promise<ApiResponse<void>> {
    try {
      // Use notification service if available
      // For now, just log (notification system will be enhanced in future phases)
      logger.info('Coach notification created', 'ProgressService', {
        coachId,
        studentId,
        contentId,
        contentTitle,
        score,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to notify coach', 'ProgressService', {
        studentId,
        coachId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: {
          code: 'NOTIFICATION_ERROR',
          message: 'Failed to notify coach',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Record quiz completion with workflow-aware logic
   * - Automated: Auto-unlock next level if passing score
   * - Custom: Just record completion and notify coach
   */
  static async recordWorkflowQuizCompletion(
    userId: string,
    quizId: string,
    score: number,
    pillarId?: string,
    _levelId?: string
  ): Promise<ApiResponse<void>> {
    try {
      const { userService } = await import('./user.service');
      const userResult = await userService.getUser(userId);

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

      const user = userResult.data;

      // Automated workflow or default
      if (!user.workflowType || user.workflowType === 'automated') {
        // TODO: Implement auto-unlock logic when Phase 2.1 (6 Pillars) is complete
        // For now, just log the completion
        logger.info('Quiz completed (automated workflow)', 'ProgressService', {
          userId,
          quizId,
          score,
          pillarId,
        });

        return {
          success: true,
          timestamp: new Date(),
        };
      }

      // Custom workflow: Record completion and notify coach
      const { customCurriculumService } = await import('./custom-curriculum.service');
      const curriculumResult = await customCurriculumService.getStudentCurriculum(userId);

      if (curriculumResult.success && curriculumResult.data) {
        const curriculum = curriculumResult.data;

        // Find the quiz in curriculum
        const item = curriculum.items.find(i => i.contentId === quizId);

        if (item) {
          // Mark as completed
          await customCurriculumService.markItemComplete(curriculum.id, item.id, userId);
        }

        // Notify coach
        if (user.assignedCoachId) {
          await this.notifyCoachOfCompletion(
            userId,
            user.assignedCoachId,
            quizId,
            'Quiz', // TODO: Get actual quiz title
            score
          );
        }
      }

      logger.info('Quiz completed (custom workflow)', 'ProgressService', {
        userId,
        quizId,
        score,
        coachNotified: !!user.assignedCoachId,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to record quiz completion', 'ProgressService', {
        userId,
        quizId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: {
          code: 'QUIZ_COMPLETION_ERROR',
          message: 'Failed to record quiz completion',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Record lesson/skill completion with workflow-aware logic
   * - Automated: Just record completion for regular progress tracking
   * - Custom: Mark curriculum item as complete and notify coach
   */
  static async recordLessonCompletion(
    userId: string,
    skillId: string,
    pillarId?: string
  ): Promise<ApiResponse<void>> {
    try {
      // Always write a video_quiz_progress record so the dashboard, pillar pages,
      // and analytics all reflect this lesson completion via their standard query path.
      const progressId = `lesson_${userId}_${skillId}`;
      await setDoc(doc(db, 'video_quiz_progress', progressId), {
        id: progressId,
        userId,
        videoQuizId: `lesson_${skillId}`,
        skillId,
        sportId: pillarId || '',
        isCompleted: true,
        status: 'submitted',
        percentage: 100,
        score: 100,
        maxScore: 100,
        questionsAnswered: [],
        questionsRemaining: 0,
        currentTime: 0,
        watchTime: 0,
        totalTimeSpent: 0,
        startedAt: Timestamp.now(),
        completedAt: Timestamp.now(),
        lastAccessedAt: Timestamp.now(),
      });

      const { userService } = await import('./user.service');
      const userResult = await userService.getUser(userId);

      if (!userResult.success || !userResult.data) {
        // Even if we can't load the user, the progress record was written above.
        logger.warn('recordLessonCompletion: user not found for workflow step', 'ProgressService', { userId });
        return { success: true, timestamp: new Date() };
      }

      const user = userResult.data;

      // Automated workflow or default
      if (!user.workflowType || user.workflowType === 'automated') {
        logger.info('Lesson completed (automated workflow)', 'ProgressService', {
          userId,
          skillId,
          pillarId,
        });

        return {
          success: true,
          timestamp: new Date(),
        };
      }

      // Custom workflow: Record completion and notify coach
      const { customCurriculumService } = await import('./custom-curriculum.service');
      console.log('📝 recordLessonCompletion: Getting curriculum for user:', userId);
      const curriculumResult = await customCurriculumService.getStudentCurriculum(userId);
      console.log('📝 recordLessonCompletion: Curriculum result:', curriculumResult);

      if (curriculumResult.success && curriculumResult.data) {
        const curriculum = curriculumResult.data;
        console.log('📝 recordLessonCompletion: Curriculum items:', curriculum.items);
        console.log('📝 recordLessonCompletion: Looking for skillId:', skillId);

        // Find the lesson in curriculum
        const item = curriculum.items.find(i => i.contentId === skillId);
        console.log('📝 recordLessonCompletion: Found item:', item);

        if (item) {
          // Mark as completed
          console.log('📝 recordLessonCompletion: Marking item complete:', {
            curriculumId: curriculum.id,
            itemId: item.id,
            userId,
          });
          await customCurriculumService.markItemComplete(curriculum.id, item.id, userId);
          console.log('📝 recordLessonCompletion: Item marked complete');
        } else {
          console.log('📝 recordLessonCompletion: Item NOT found in curriculum');
        }

        // Notify coach
        if (user.assignedCoachId) {
          await this.notifyCoachOfCompletion(
            userId,
            user.assignedCoachId,
            skillId,
            'Lesson',
            100 // Lessons are pass/fail, so 100% for completion
          );
        }
      }

      logger.info('Lesson completed (custom workflow)', 'ProgressService', {
        userId,
        skillId,
        coachNotified: !!user.assignedCoachId,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to record lesson completion', 'ProgressService', {
        userId,
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: {
          code: 'LESSON_COMPLETION_ERROR',
          message: 'Failed to record lesson completion',
          details: error,
        },
        timestamp: new Date(),
      };
    }
  }
}