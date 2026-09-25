import { BaseDatabaseService } from '../base.service';
import {
  Sport,
  SportProgress,
  ApiResponse,
  QueryOptions,
} from '@/types';
import { Timestamp } from 'firebase/firestore';
import { logger } from '../../utils/logger';
import { sportsService } from './sports.service';
import { videoQuizService } from './video-quiz.service';
import { VideoQuizProgress } from '@/types/video-quiz';

/**
 * Service for managing sports enrollment and progress.
 * Handles enrollment (creating SportProgress), retrieving enrolled sports, and progress tracking.
 */
export class EnrollmentService extends BaseDatabaseService {
  private readonly SPORT_PROGRESS_COLLECTION = 'sport_progress';
  private readonly DASHBOARD_ATTEMPTS_LIMIT = 200;

  private getAttemptPercentage(attempt: VideoQuizProgress): number | null {
    if (attempt.percentage !== undefined && attempt.percentage !== null) {
      return attempt.percentage;
    }

    if (attempt.score !== undefined && attempt.score !== null && attempt.maxScore) {
      return (attempt.score / attempt.maxScore) * 100;
    }

    return null;
  }

  private buildLatestAttemptBySkill(attempts: VideoQuizProgress[]): Map<string, VideoQuizProgress> {
    const latestAttemptBySkill = new Map<string, VideoQuizProgress>();

    // Attempts are queried in descending completion order, so first seen per skill is the latest.
    for (const attempt of attempts) {
      if (!attempt.skillId || latestAttemptBySkill.has(attempt.skillId)) {
        continue;
      }

      latestAttemptBySkill.set(attempt.skillId, attempt);
    }

    return latestAttemptBySkill;
  }

  /**
   * Works out which pillars a goalie is active in from their own attempts.
   *
   * A goalie invited straight into the product never runs the enrolment step, so no
   * sport_progress record is ever written for them — which is how a dashboard could
   * read "0 active courses" on the same screen that listed their results. These
   * records are for display only and are never saved.
   */
  private deriveProgressFromAttempts(
    userId: string,
    attempts: VideoQuizProgress[]
  ): SportProgress[] {
    // Attempts arrive newest first, so the first sighting of a pillar is its most
    // recent activity and the resulting order matches the lastAccessedAt sort above.
    const lastActiveBySport = new Map<string, Timestamp>();

    for (const attempt of attempts) {
      if (!attempt.sportId || lastActiveBySport.has(attempt.sportId)) {
        continue;
      }
      lastActiveBySport.set(
        attempt.sportId,
        attempt.completedAt ?? attempt.startedAt ?? Timestamp.now()
      );
    }

    return [...lastActiveBySport.entries()].map(([sportId, lastActive]) => ({
      // Marked derived so it is never mistaken for a stored record.
      id: `derived_${userId}_${sportId}`,
      userId,
      sportId,
      status: 'in_progress' as const,
      completedSkills: [],
      totalSkills: 0,
      progressPercentage: 0,
      timeSpent: 0,
      streak: { current: 0, longest: 0, lastActiveDate: lastActive },
      startedAt: lastActive,
      lastAccessedAt: lastActive,
    }));
  }

  /**
   * Enroll a user in a sport by creating SportProgress record
   */
  async enrollInSport(
    userId: string,
    sportId: string
  ): Promise<ApiResponse<{ id: string }>> {
    console.log('EnrollmentService: Starting enrollment for user', userId, 'in sport', sportId);
    logger.database('create', this.SPORT_PROGRESS_COLLECTION, undefined, { userId, sportId });

    // Check if user is already enrolled
    console.log('EnrollmentService: Checking existing enrollment...');
    const existingProgress = await this.getUserSportProgress(userId, sportId);
    console.log('EnrollmentService: Existing progress check result:', existingProgress);

    if (existingProgress.success && existingProgress.data) {
      console.log('EnrollmentService: User already enrolled');
      return {
        success: false,
        error: {
          code: 'ALREADY_ENROLLED',
          message: 'User is already enrolled in this sport',
        },
        timestamp: new Date(),
      };
    }

    // Get sport to validate it exists and get skills count
    console.log('EnrollmentService: Getting sport data...');
    const sportResult = await sportsService.getSport(sportId);
    console.log('EnrollmentService: Sport result:', sportResult);

    if (!sportResult.success || !sportResult.data) {
      console.log('EnrollmentService: Sport not found');
      return {
        success: false,
        error: {
          code: 'SPORT_NOT_FOUND',
          message: 'Sport not found',
        },
        timestamp: new Date(),
      };
    }

    // Get total skills count for this sport
    const skillsResult = await sportsService.getSkillsBySport(sportId);
    const totalSkills = skillsResult.success ? skillsResult.data?.total || 0 : 0;

    const progressData: Omit<SportProgress, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      sportId,
      status: 'not_started',
      completedSkills: [],
      totalSkills,
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

    const result = await this.create<SportProgress>(this.SPORT_PROGRESS_COLLECTION, progressData);

    if (result.success) {
      logger.info('User enrolled in sport successfully', 'EnrollmentService', {
        userId,
        sportId,
        progressId: result.data?.id
      });
    } else {
      logger.error('Sport enrollment failed', 'EnrollmentService', result.error);
    }

    return result;
  }

  /**
   * Get all sports a user is enrolled in with their progress
   */
  async getUserEnrolledSports(
    userId: string,
    options: QueryOptions = {}
  ): Promise<ApiResponse<Array<{ sport: Sport; progress: SportProgress }>>> {
    logger.database('query', this.SPORT_PROGRESS_COLLECTION, undefined, { userId });

    // Get all sport progress records for user
    const progressResult = await this.query<SportProgress>(this.SPORT_PROGRESS_COLLECTION, {
      where: [{ field: 'userId', operator: '==', value: userId }],
      orderBy: [{ field: 'lastAccessedAt', direction: 'desc' }],
      ...options,
    });

    if (!progressResult.success || !progressResult.data) {
      return {
        success: false,
        error: progressResult.error || { code: 'ENROLLMENT_ERROR', message: 'Failed to fetch enrolled sports' },
        timestamp: new Date(),
      };
    }

    const attemptsResult = await videoQuizService.getUserVideoQuizAttempts(userId, {
      completed: true,
      limit: this.DASHBOARD_ATTEMPTS_LIMIT,
    });
    const attempts = attemptsResult.success ? attemptsResult.data?.items || [] : [];
    const latestAttemptBySkill = this.buildLatestAttemptBySkill(attempts);

    const progressRecords =
      progressResult.data.items.length > 0
        ? progressResult.data.items
        : this.deriveProgressFromAttempts(userId, attempts);

    // A goalie with neither an enrolment nor a completed check really has nothing yet.
    if (progressRecords.length === 0) {
      return {
        success: true,
        data: [],
        timestamp: new Date(),
      };
    }

    const sportDetails = await Promise.all(
      progressRecords.map(async (progress) => {
        const sportResult = await sportsService.getSport(progress.sportId);
        if (!sportResult.success || !sportResult.data) {
          return null;
        }

        const skillsResult = await sportsService.getSkillsBySport(progress.sportId);
        const skills = skillsResult.success ? skillsResult.data?.items || [] : [];

        return {
          progress,
          sport: sportResult.data,
          skills,
        };
      })
    );

    // Get sport details for each progress record and calculate live progress
    const enrolledSports: Array<{ sport: Sport; progress: SportProgress }> = [];

    for (const detail of sportDetails) {
      if (!detail) {
        continue;
      }

      const { progress, sport, skills } = detail;
      const totalSkills = skills.length;

      // Calculate progress based on actual quiz attempts for each skill
      let totalScore = 0;
      let completedSkillsCount = 0;
      const completedSkillIds: string[] = [];

      for (const skill of skills) {
        const latestAttempt = latestAttemptBySkill.get(skill.id);
        if (!latestAttempt) {
          continue;
        }

        const percentage = this.getAttemptPercentage(latestAttempt);
        if (percentage !== null) {
          totalScore += percentage;
          completedSkillsCount++;
          completedSkillIds.push(skill.id);
        }
      }

      // Calculate average progress percentage based on quiz scores
      let progressPercentage = 0;
      if (completedSkillsCount > 0 && totalSkills > 0) {
        // Average of completed quiz scores, scaled by how many skills have been attempted
        const averageScore = totalScore / completedSkillsCount;
        const completionRatio = completedSkillsCount / totalSkills;
        progressPercentage = averageScore * completionRatio;
      }

      // Use stored time and streak data
      const totalTime = progress.timeSpent || 0;
      const currentStreak = progress.streak?.current || 0;
      const longestStreak = progress.streak?.longest || 0;

      // Determine status based on completed skills
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (completedSkillsCount === totalSkills && totalSkills > 0) {
        status = 'completed';
      } else if (completedSkillsCount > 0) {
        status = 'in_progress';
      }

      // Update progress with calculated values
      const updatedProgress: SportProgress = {
        ...progress,
        progressPercentage: Math.round(progressPercentage * 10) / 10, // Round to 1 decimal
        timeSpent: totalTime,
        completedSkills: completedSkillIds,
        totalSkills,
        status,
        streak: {
          current: currentStreak,
          longest: longestStreak,
          lastActiveDate: progress.streak?.lastActiveDate || Timestamp.fromDate(new Date()),
        },
      };

      logger.debug(`Course ${sport.id} progress: ${progressPercentage}% (${completedSkillsCount}/${totalSkills} skills)`, 'EnrollmentService');

      enrolledSports.push({
        sport,
        progress: updatedProgress,
      });
    }

    logger.debug('Retrieved enrolled sports with calculated progress', 'EnrollmentService', {
      userId,
      count: enrolledSports.length
    });

    return {
      success: true,
      data: enrolledSports,
      timestamp: new Date(),
    };
  }

  /**
   * Get user's progress for a specific sport
   */
  async getUserSportProgress(
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

    if (!result.success || !result.data?.items[0]) {
      return {
        success: result.success,
        data: null,
        error: result.error,
        timestamp: new Date(),
      };
    }

    const progress = result.data.items[0];

    // Get all skills for this sport to calculate live progress
    const skillsResult = await sportsService.getSkillsBySport(sportId);
    const skills = skillsResult.success ? skillsResult.data?.items || [] : [];
    const totalSkills = skills.length;

    const attemptsResult = await videoQuizService.getUserVideoQuizAttempts(userId, {
      sportId,
      completed: true,
      limit: this.DASHBOARD_ATTEMPTS_LIMIT,
    });
    const attempts = attemptsResult.success ? attemptsResult.data?.items || [] : [];
    const latestAttemptBySkill = this.buildLatestAttemptBySkill(attempts);

    // Calculate progress based on actual quiz attempts for each skill
    let totalScore = 0;
    let completedSkillsCount = 0;
    const completedSkillIds: string[] = [];

    for (const skill of skills) {
      const latestAttempt = latestAttemptBySkill.get(skill.id);
      if (!latestAttempt) {
        continue;
      }

      const percentage = this.getAttemptPercentage(latestAttempt);
      if (percentage !== null) {
        totalScore += percentage;
        completedSkillsCount++;
        completedSkillIds.push(skill.id);
      }
    }

    // Calculate average progress percentage based on quiz scores
    let progressPercentage = 0;
    if (completedSkillsCount > 0 && totalSkills > 0) {
      // Average of completed quiz scores, scaled by how many skills have been attempted
      const averageScore = totalScore / completedSkillsCount;
      const completionRatio = completedSkillsCount / totalSkills;
      progressPercentage = averageScore * completionRatio;
    }

    // Determine status based on completed skills
    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (completedSkillsCount === totalSkills && totalSkills > 0) {
      status = 'completed';
    } else if (completedSkillsCount > 0) {
      status = 'in_progress';
    }

    // Update progress with calculated values
    const updatedProgress: SportProgress = {
      ...progress,
      progressPercentage: Math.round(progressPercentage * 10) / 10, // Round to 1 decimal
      completedSkills: completedSkillIds,
      totalSkills,
      status,
    };

    return {
      success: true,
      data: updatedProgress,
      timestamp: new Date(),
    };
  }

  /**
   * Check if user is enrolled in a sport
   */
  async isUserEnrolled(userId: string, sportId: string): Promise<boolean> {
    const result = await this.getUserSportProgress(userId, sportId);
    return result.success && result.data !== null;
  }

  /**
   * Unenroll user from a sport (delete progress record)
   */
  async unenrollFromSport(
    userId: string,
    sportId: string
  ): Promise<ApiResponse<void>> {
    const progressResult = await this.getUserSportProgress(userId, sportId);

    if (!progressResult.success || !progressResult.data) {
      return {
        success: false,
        error: {
          code: 'NOT_ENROLLED',
          message: 'User is not enrolled in this sport',
        },
        timestamp: new Date(),
      };
    }

    const result = await this.delete(this.SPORT_PROGRESS_COLLECTION, progressResult.data.id);

    if (result.success) {
      logger.info('User unenrolled from sport', 'EnrollmentService', { userId, sportId });
    }

    return result;
  }

  /**
   * Update enrollment progress (when user completes skills, etc.)
   */
  async updateEnrollmentProgress(
    userId: string,
    sportId: string,
    updates: Partial<SportProgress>
  ): Promise<ApiResponse<void>> {
    const progressResult = await this.getUserSportProgress(userId, sportId);

    if (!progressResult.success || !progressResult.data) {
      return {
        success: false,
        error: {
          code: 'NOT_ENROLLED',
          message: 'User is not enrolled in this sport',
        },
        timestamp: new Date(),
      };
    }

    // Calculate progress percentage if skills were updated
    if (updates.completedSkills && progressResult.data.totalSkills > 0) {
      updates.progressPercentage = (updates.completedSkills.length / progressResult.data.totalSkills) * 100;

      // Update status based on progress
      if (updates.progressPercentage === 100) {
        updates.status = 'completed';
        updates.completedAt = Timestamp.fromDate(new Date());
      } else if (updates.progressPercentage > 0) {
        updates.status = 'in_progress';
      }
    }

    // Always update last accessed time
    updates.lastAccessedAt = Timestamp.fromDate(new Date());

    return this.update<SportProgress>(this.SPORT_PROGRESS_COLLECTION, progressResult.data.id, updates);
  }

  /**
   * Get enrollment statistics for analytics
   */
  async getEnrollmentStats(sportId?: string): Promise<ApiResponse<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    averageProgress: number;
  }>> {
    const whereClause: any[] = [];
    if (sportId) {
      whereClause.push({ field: 'sportId', operator: '==', value: sportId });
    }

    const result = await this.query<SportProgress>(this.SPORT_PROGRESS_COLLECTION, {
      where: whereClause,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || { code: 'ENROLLMENT_STATS_ERROR', message: 'Failed to fetch enrollment stats' },
        timestamp: new Date(),
      };
    }

    const enrollments = result.data.items;
    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => e.status === 'in_progress').length;
    const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
    const averageProgress = enrollments.length > 0
      ? enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) / enrollments.length
      : 0;

    return {
      success: true,
      data: {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        averageProgress,
      },
      timestamp: new Date(),
    };
  }
}

// Export singleton instance
export const enrollmentService = new EnrollmentService();