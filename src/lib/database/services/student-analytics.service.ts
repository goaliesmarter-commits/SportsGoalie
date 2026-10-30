import { BaseDatabaseService } from '../base.service';
import { sportsService } from './sports.service';
import { videoQuizService } from './video-quiz.service';
import { ApiResponse } from '@/types';
import { VideoQuizProgress } from '@/types/video-quiz';
import { sportDisplayName } from '@/lib/utils/pillars';
import { logger } from '../../utils/logger';
import { toLocalDateKey } from '@/lib/utils/local-date';
import { finishedTakeDate, takeStreak } from '@/lib/training/attempt-streak';
import { ownedSkillIds, quizIsOwned, skillOwnedDates } from '@/lib/training/owned';

// Type alias for backwards compatibility
type QuizAttempt = VideoQuizProgress;

export interface StudentAnalytics {
  userId: string;
  overview: {
    totalTimeSpent: number; // in minutes
    activeDays: number;
    lastActiveDate: Date | null;
    totalSportsEnrolled: number;
    totalSkillsStarted: number;
    totalQuizzesTaken: number;
  };
  performance: {
    averageQuizScore: number;
    bestQuizScore: number;
    worstQuizScore: number;
    totalQuizzesCompleted: number;
  };
  progress: {
    sportsCompleted: number;
    sportsInProgress: number;
    skillsCompleted: number;
    skillsInProgress: number;
    completionRate: number;
  };
  engagement: {
    currentStreak: number;
    longestStreak: number;
    averageSessionDuration: number; // in minutes
    studyPattern: 'morning' | 'afternoon' | 'evening' | 'night' | 'varied';
  };
  recentActivity: ActivityRecord[];
}

export interface ActivityRecord {
  id: string;
  type: 'quiz_completed' | 'skill_started' | 'skill_completed' | 'sport_enrolled' | 'achievement_unlocked';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface QuizPerformanceData {
  quizId: string;
  quizTitle: string;
  sportName: string;
  skillName: string;
  attempts: number;
  bestScore: number;
  averageScore: number;
  timeSpent: number;
  lastAttempt: Date;
  passed: boolean; // Whether the quiz is owned: every graded question got right at least once
}

export interface ProgressOverTimeData {
  date: string;
  skillsCompleted: number;
  quizzesTaken: number;
  averageScore: number;
  timeSpent: number;
}

export interface SkillPerformanceData {
  skillId: string;
  skillName: string;
  sportName: string;
  progress: number;
  timeSpent: number;
  quizScore: number | null;
  status: 'not_started' | 'in_progress' | 'completed';
  difficulty: 'introduction' | 'development' | 'refinement';
}

export interface SkillProgressDetail {
  skillId: string;
  skillName: string;
  difficulty: 'introduction' | 'development' | 'refinement';
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercentage: number;
  latestQuizScore: number | null;
  quizStatus: 'not_attempted' | 'owned' | 'open';
  lastAttemptDate: Date | null;
  timeSpent: number;
  completedAt: Date | null;
}

export interface CourseProgressDetail {
  sportId: string;
  sportName: string;
  description: string;
  enrolledAt: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercentage: number;
  totalSkills: number;
  completedSkills: number;
  averageQuizScore: number;
  lastActivityDate: Date | null;
  skills: SkillProgressDetail[];
}

export interface QuizAttemptDetail {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  sportName: string;
  skillName: string;
  startedAt: Date;
  submittedAt: Date;
  timeSpent: number;
  score: number;
  maxScore: number;
  percentage: number;
  questionsAnswered: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  attemptNumber?: number; // Which attempt this is (1st, 2nd, etc.)
}

/**
 * Service for comprehensive student analytics and reporting.
 * Provides detailed insights into student performance, progress, and engagement.
 */
export class StudentAnalyticsService extends BaseDatabaseService {
  /**
   * Get comprehensive analytics for a specific student
   */
  async getStudentAnalytics(userId: string): Promise<ApiResponse<StudentAnalytics>> {
    logger.info('Fetching student analytics', 'StudentAnalyticsService', { userId });

    try {
      // Only fetch video quiz attempts and related data
      // Note: Changed from 'quiz_attempts' to 'video_quiz_progress' to match video quiz system
      const quizAttempts = await this.query<any>('video_quiz_progress', {
        where: [
          { field: 'userId', operator: '==', value: userId },
          { field: 'status', operator: '==', value: 'submitted' }
        ]
      });

      const quizzes = quizAttempts.data?.items || [];

      // Get unique sport and skill IDs from quiz attempts
      const sportIds = new Set<string>();
      const skillIds = new Set<string>();

      quizzes.forEach(quiz => {
        if (quiz.sportId) sportIds.add(quiz.sportId);
        if (quiz.skillId) skillIds.add(quiz.skillId);
      });

      // Calculate overview metrics from video quiz data only
      // VideoQuizProgress uses 'totalTimeSpent' field
      const totalTimeSpent = quizzes.reduce((sum, q) => sum + (q.totalTimeSpent || q.timeSpent || 0), 0);
      const activeDaysSet = new Set<string>();

      // Track active days from quiz attempts
      quizzes.forEach(quiz => {
        // VideoQuizProgress uses 'completedAt' instead of 'submittedAt'
        const dateField = quiz.completedAt || quiz.submittedAt;
        if (dateField) {
          const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
          activeDaysSet.add(toLocalDateKey(date));
        }
      });

      // Find last active date
      const lastActiveDate = quizzes.length > 0
        ? new Date(Math.max(...quizzes.map(q => {
            const dateField = q.completedAt || q.submittedAt;
            const date = dateField?.toDate ? dateField.toDate() : new Date(dateField || 0);
            return date.getTime();
          })))
        : null;

      // Calculate performance metrics
      const quizScores = quizzes.map(q => q.percentage);
      const averageQuizScore = quizScores.length > 0
        ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
        : 0;
      const bestQuizScore = quizScores.length > 0 ? Math.max(...quizScores) : 0;
      const worstQuizScore = quizScores.length > 0 ? Math.min(...quizScores) : 0;
      const completedQuizzes = quizzes.filter(q => q.isCompleted).length;

      // Skills done are skills OWNED, the one rule the goalie's own pages use. This used to
      // read `quiz.passed`, a field nothing ever writes, so it was always 0 here.
      const attemptedSkillIds = new Set<string>();

      quizzes.forEach(quiz => {
        if (quiz.skillId) attemptedSkillIds.add(quiz.skillId);
      });

      const ownedSkills = ownedSkillIds(quizzes);
      const skillsCompleted = ownedSkills.size;
      const skillsInProgress = attemptedSkillIds.size - ownedSkills.size;
      const completionRate = attemptedSkillIds.size > 0
        ? Math.round((ownedSkills.size / attemptedSkillIds.size) * 100)
        : 0;

      // Calculate engagement metrics from quiz activity
      const currentStreak = this.calculateCurrentStreak(quizzes);
      const longestStreak = this.calculateLongestStreak(quizzes);
      const totalSessions = activeDaysSet.size || 1;
      // Convert seconds to minutes for average session duration
      const averageSessionDuration = Math.round((totalTimeSpent / 60) / totalSessions);

      // Determine study pattern based on quiz submission times
      const studyPattern = this.determineStudyPattern(quizzes);

      // Build recent activity from video quiz data
      const recentActivity = await this.buildRecentActivityFromQuizzes(userId, quizzes);

      const analytics: StudentAnalytics = {
        userId,
        overview: {
          totalTimeSpent: Math.round(totalTimeSpent / 60), // Convert seconds to minutes
          activeDays: activeDaysSet.size,
          lastActiveDate,
          totalSportsEnrolled: sportIds.size,  // Unique sports from quiz attempts
          totalSkillsStarted: attemptedSkillIds.size,  // Unique skills attempted
          totalQuizzesTaken: quizzes.length,
        },
        performance: {
          averageQuizScore,
          bestQuizScore,
          worstQuizScore,
          totalQuizzesCompleted: completedQuizzes,
        },
        progress: {
          sportsCompleted: 0, // We don't track sport completion in video quiz system
          sportsInProgress: sportIds.size, // All sports with attempts are in progress
          skillsCompleted,
          skillsInProgress,
          completionRate,
        },
        engagement: {
          currentStreak,
          longestStreak,
          averageSessionDuration,
          studyPattern,
        },
        recentActivity,
      };

      return {
        success: true,
        data: analytics,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch student analytics', 'StudentAnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'ANALYTICS_FETCH_FAILED',
          message: 'Failed to fetch student analytics',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get quiz performance breakdown for a student
   */
  async getQuizPerformance(userId: string): Promise<ApiResponse<QuizPerformanceData[]>> {
    logger.info('Fetching quiz performance', 'StudentAnalyticsService', { userId });

    try {
      // Use video_quiz_progress collection for video quiz data
      const attemptsResult = await this.query<any>('video_quiz_progress', {
        where: [
          { field: 'userId', operator: '==', value: userId },
          { field: 'status', operator: '==', value: 'submitted' }
        ]
      });

      const attempts = attemptsResult.data?.items || [];

      // Group attempts by quiz (VideoQuizProgress uses 'videoQuizId')
      const quizMap = new Map<string, any[]>();
      attempts.forEach(attempt => {
        const quizId = attempt.videoQuizId || attempt.quizId;
        if (!quizMap.has(quizId)) {
          quizMap.set(quizId, []);
        }
        quizMap.get(quizId)!.push(attempt);
      });

      // Build performance data
      const performanceData: QuizPerformanceData[] = [];

      for (const [quizId, quizAttempts] of quizMap.entries()) {
        // Get quiz data from attempts if video quiz lookup fails
        const firstAttempt = quizAttempts[0];

        const quiz = await videoQuizService.getVideoQuiz(quizId);

        // Use data from quiz attempts as fallback
        const skillId = quiz.data?.skillId || firstAttempt.skillId;
        const sportId = quiz.data?.sportId || firstAttempt.sportId;

        const skill = skillId ? await sportsService.getSkill(skillId) : null;
        const sport = sportId ? await sportsService.getSport(sportId) : null;

        const scores = quizAttempts.map(a => a.percentage);
        const times = quizAttempts.map(a => a.totalTimeSpent || a.timeSpent || 0);
        const lastAttempt = quizAttempts.reduce((latest, current) => {
          const currentDateField = current.completedAt || current.submittedAt;
          const latestDateField = latest.completedAt || latest.submittedAt;
          const currentDate = currentDateField?.toDate ? currentDateField.toDate() : new Date(currentDateField || 0);
          const latestDate = latestDateField?.toDate ? latestDateField.toDate() : new Date(latestDateField || 0);
          return currentDate > latestDate ? current : latest;
        });

        // Resolved once: the generated title has to go through the code list too, or a
        // quiz with no title of its own bakes a stale pillar name into the row.
        const sportName = sportDisplayName(sport?.data);

        // Better fallback for quiz title - use quiz ID as last resort
        const quizTitle = quiz.data?.title ||
                         (sport?.data?.name && skill?.data?.name ? `${sportName} - ${skill.data.name} Quiz` :
                          `Quiz ${quizId.substring(0, 8)}...`);

        performanceData.push({
          quizId,
          quizTitle,
          sportName,
          skillName: skill?.data?.name || 'Unknown Skill',
          attempts: quizAttempts.length,
          bestScore: Math.max(...scores),
          averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          timeSpent: Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60), // Convert to minutes
          lastAttempt: (() => {
            const dateField = lastAttempt.completedAt || lastAttempt.submittedAt;
            return dateField?.toDate ? dateField.toDate() : new Date(dateField || 0);
          })(),
          passed: quizIsOwned(quizAttempts),
        });
      }

      // Sort by last attempt date (most recent first)
      performanceData.sort((a, b) => b.lastAttempt.getTime() - a.lastAttempt.getTime());

      return {
        success: true,
        data: performanceData,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch quiz performance', 'StudentAnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'QUIZ_PERFORMANCE_FAILED',
          message: 'Failed to fetch quiz performance',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get progress over time data for charts using video quiz data
   */
  async getProgressOverTime(userId: string, days: number = 30): Promise<ApiResponse<ProgressOverTimeData[]>> {
    logger.info('Fetching progress over time', 'StudentAnalyticsService', { userId, days });

    try {
      // Use video_quiz_progress collection
      const quizAttemptsResult = await this.query<any>('video_quiz_progress', {
        where: [
          { field: 'userId', operator: '==', value: userId },
          { field: 'status', operator: '==', value: 'submitted' }
        ]
      });

      const quizAttempts = quizAttemptsResult.data?.items || [];

      // The day each skill became owned: the take that got its last open question right.
      // Same day keys as the rest of this chart (local days), so they compare as plain strings.
      const ownedOnDay = new Map<string, string>();
      for (const [skillId, date] of skillOwnedDates(quizAttempts)) {
        ownedOnDay.set(skillId, toLocalDateKey(date));
      }

      // Cumulative skills owned, including any owned before the window starts
      const cumulativeSkills = new Set<string>();

      // Build data for each day
      const progressData: ProgressOverTimeData[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = toLocalDateKey(date);

        // Quizzes taken on this day
        const dayQuizzes = quizAttempts.filter(q => {
          const dateField = q.completedAt || q.submittedAt;
          const attemptDate = dateField?.toDate ? dateField.toDate() : new Date(dateField || 0);
          return toLocalDateKey(attemptDate) === dateStr;
        });

        // Add any skills owned by the end of this day
        for (const [skillId, ownedDay] of ownedOnDay) {
          if (ownedDay <= dateStr) cumulativeSkills.add(skillId);
        }

        const avgScore = dayQuizzes.length > 0
          ? Math.round(dayQuizzes.reduce((sum, q) => sum + q.percentage, 0) / dayQuizzes.length)
          : 0;

        const timeSpent = dayQuizzes.reduce((sum, q) => sum + (q.totalTimeSpent || q.timeSpent || 0), 0);

        progressData.push({
          date: dateStr,
          skillsCompleted: cumulativeSkills.size,
          quizzesTaken: dayQuizzes.length,
          averageScore: avgScore,
          timeSpent: Math.round(timeSpent / 60), // Convert to minutes
        });
      }

      return {
        success: true,
        data: progressData,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch progress over time', 'StudentAnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'PROGRESS_OVER_TIME_FAILED',
          message: 'Failed to fetch progress over time',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get skill performance breakdown from video quiz data
   */
  async getSkillPerformance(userId: string): Promise<ApiResponse<SkillPerformanceData[]>> {
    logger.info('Fetching skill performance', 'StudentAnalyticsService', { userId });

    try {
      // Get all video quiz attempts
      const quizAttemptsResult = await this.query<any>('video_quiz_progress', {
        where: [
          { field: 'userId', operator: '==', value: userId },
          { field: 'status', operator: '==', value: 'submitted' }
        ]
      });

      const attempts = quizAttemptsResult.data?.items || [];

      // Group attempts by skillId
      const skillPerformanceMap = new Map<string, {
        attempts: QuizAttempt[],
        sportId: string,
      }>();

      attempts.forEach(attempt => {
        if (!attempt.skillId) return;

        if (!skillPerformanceMap.has(attempt.skillId)) {
          skillPerformanceMap.set(attempt.skillId, {
            attempts: [],
            sportId: attempt.sportId || '',
          });
        }
        skillPerformanceMap.get(attempt.skillId)!.attempts.push(attempt);
      });

      const performanceData: SkillPerformanceData[] = [];

      // Calculate performance for each skill
      for (const [skillId, data] of skillPerformanceMap.entries()) {
        const [skill, sport] = await Promise.all([
          sportsService.getSkill(skillId),
          data.sportId ? sportsService.getSport(data.sportId) : null
        ]);

        // Get latest attempt for score. Finishing a take sets `completedAt`, never `submittedAt`.
        const latestAttempt = data.attempts.sort((a, b) => {
          const dateA = finishedTakeDate(a) ?? new Date(0);
          const dateB = finishedTakeDate(b) ?? new Date(0);
          return dateB.getTime() - dateA.getTime();
        })[0];

        // Calculate total time spent
        const totalTimeSpent = data.attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);

        // Done once owned, not on a 70% pass mark
        const status = ownedSkillIds(data.attempts).has(skillId) ? 'completed' : 'in_progress';

        // Calculate progress (use best score)
        const bestScore = Math.max(...data.attempts.map(a => a.percentage || 0));

        performanceData.push({
          skillId,
          skillName: skill.data?.name || 'Unknown Skill',
          sportName: sportDisplayName(sport?.data),
          progress: bestScore,
          timeSpent: Math.round(totalTimeSpent / 60), // Convert to minutes
          quizScore: latestAttempt.percentage || null,
          status,
          difficulty: skill.data?.difficulty || 'introduction',
        });
      }

      // Sort by progress percentage (descending)
      performanceData.sort((a, b) => b.progress - a.progress);

      return {
        success: true,
        data: performanceData,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch skill performance', 'StudentAnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'SKILL_PERFORMANCE_FAILED',
          message: 'Failed to fetch skill performance',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get detailed course progress with skill scores from video quiz data
   */
  async getCourseProgressDetails(userId: string): Promise<ApiResponse<CourseProgressDetail[]>> {
    logger.info('Fetching course progress details', 'StudentAnalyticsService', { userId });

    try {
      // Get all video quiz attempts to determine which sports the user is enrolled in
      const quizAttemptsResult = await this.query<any>('video_quiz_progress', {
        where: [
          { field: 'userId', operator: '==', value: userId },
          { field: 'status', operator: '==', value: 'submitted' }
        ]
      });

      const attempts = quizAttemptsResult.data?.items || [];

      // Group attempts by sportId
      const sportAttempts = new Map<string, QuizAttempt[]>();
      attempts.forEach(attempt => {
        if (!attempt.sportId) return;
        if (!sportAttempts.has(attempt.sportId)) {
          sportAttempts.set(attempt.sportId, []);
        }
        sportAttempts.get(attempt.sportId)!.push(attempt);
      });

      const courseDetails: CourseProgressDetail[] = [];

      for (const [sportId, sportQuizAttempts] of sportAttempts.entries()) {
        const sport = await sportsService.getSport(sportId);
        if (!sport.success || !sport.data) continue;

        // Get all skills for this sport
        const skillsResult = await sportsService.getSkillsBySport(sportId);
        const skills = skillsResult.data?.items || [];

        // Get skill progress for each skill from quiz attempts
        const skillDetails: SkillProgressDetail[] = [];

        for (const skill of skills) {
          // Filter attempts for this skill
          const skillAttempts = sportQuizAttempts.filter(a => a.skillId === skill.id);

          // Get latest quiz attempt and calculate progress from video quiz attempts
          let latestQuizScore: number | null = null;
          let lastAttemptDate: Date | null = null;
          let quizStatus: 'not_attempted' | 'owned' | 'open' = 'not_attempted';
          let progressPercentage = 0;
          let timeSpent = 0;
          let completedAt: Date | null = null;
          let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';

          if (skillAttempts.length > 0) {
            // Sort by date to get latest (finishing a take sets `completedAt`, not `submittedAt`)
            const sortedAttempts = [...skillAttempts].sort((a, b) => {
              const dateA = finishedTakeDate(a) ?? new Date(0);
              const dateB = finishedTakeDate(b) ?? new Date(0);
              return dateB.getTime() - dateA.getTime();
            });

            const latestAttempt = sortedAttempts[0];
            latestQuizScore = latestAttempt.percentage;
            lastAttemptDate = finishedTakeDate(latestAttempt) ?? new Date(0);

            // Calculate best score as progress
            progressPercentage = Math.max(...skillAttempts.map(a => a.percentage || 0));

            // Owned once every graded question has been got right at least once
            const owned = ownedSkillIds(skillAttempts).has(skill.id);
            quizStatus = owned ? 'owned' : 'open';
            status = owned ? 'completed' : 'in_progress';

            // Calculate total time spent
            timeSpent = skillAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);

            // The day it became owned is the day of the take that finished the job
            if (owned) {
              completedAt = skillOwnedDates(skillAttempts).get(skill.id) ?? null;
            }
          }

          skillDetails.push({
            skillId: skill.id,
            skillName: skill.name,
            difficulty: skill.difficulty || 'introduction',
            status,
            progressPercentage,
            latestQuizScore,
            quizStatus,
            lastAttemptDate,
            timeSpent,
            completedAt
          });
        }

        // Calculate overall course progress
        const totalSkills = skillDetails.length;
        const completedSkills = skillDetails.filter(s => s.status === 'completed').length;
        const attemptedSkills = skillDetails.filter(s => s.status !== 'not_started').length;
        const averageScore = skillDetails
          .filter(s => s.latestQuizScore !== null)
          .reduce((sum, s) => sum + (s.latestQuizScore || 0), 0) /
          (skillDetails.filter(s => s.latestQuizScore !== null).length || 1);

        // Get enrollment date (first quiz attempt for this sport)
        const firstAttempt = sportQuizAttempts.sort((a, b) => {
          const dateA = a.startedAt && typeof a.startedAt === 'object' && 'toDate' in a.startedAt ? a.startedAt.toDate() : new Date(0);
          const dateB = b.startedAt && typeof b.startedAt === 'object' && 'toDate' in b.startedAt ? b.startedAt.toDate() : new Date(0);
          return dateA.getTime() - dateB.getTime();
        })[0];

        const enrolledAt = firstAttempt?.startedAt && typeof firstAttempt.startedAt === 'object' && 'toDate' in firstAttempt.startedAt
          ? firstAttempt.startedAt.toDate()
          : new Date();

        // Get last activity date (most recent quiz attempt)
        const lastAttempt = sportQuizAttempts.sort((a, b) => {
          const dateA = finishedTakeDate(a) ?? new Date(0);
          const dateB = finishedTakeDate(b) ?? new Date(0);
          return dateB.getTime() - dateA.getTime();
        })[0];

        const lastActivityDate = lastAttempt ? finishedTakeDate(lastAttempt) : null;

        // Calculate progress percentage
        const progressPercentage = totalSkills > 0
          ? Math.round((completedSkills / totalSkills) * 100)
          : 0;

        // Determine status
        const status: 'not_started' | 'in_progress' | 'completed' =
          completedSkills === totalSkills && totalSkills > 0 ? 'completed' :
          attemptedSkills > 0 ? 'in_progress' : 'not_started';

        courseDetails.push({
          sportId,
          sportName: sportDisplayName(sport.data),
          description: sport.data.description,
          enrolledAt,
          status,
          progressPercentage,
          totalSkills,
          completedSkills,
          averageQuizScore: Math.round(averageScore),
          lastActivityDate,
          skills: skillDetails
        });
      }

      // Sort by last activity date (most recent first)
      courseDetails.sort((a, b) => {
        const dateA = a.lastActivityDate?.getTime() || 0;
        const dateB = b.lastActivityDate?.getTime() || 0;
        return dateB - dateA;
      });

      return {
        success: true,
        data: courseDetails,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch course progress details', 'StudentAnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'COURSE_PROGRESS_FAILED',
          message: 'Failed to fetch course progress details',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get quiz attempt history with detailed information
   */
  async getQuizAttemptHistory(userId: string, limit: number = 50): Promise<ApiResponse<QuizAttemptDetail[]>> {
    logger.info('Fetching quiz attempt history', 'StudentAnalyticsService', { userId, limit });

    try {
      const attemptsResult = await this.query<any>('video_quiz_progress', {
        where: [
          { field: 'userId', operator: '==', value: userId },
          { field: 'status', operator: '==', value: 'submitted' }
        ],
        orderBy: [{ field: 'completedAt', direction: 'desc' }],
        limit
      });

      const attempts = attemptsResult.data?.items || [];
      const attemptDetails: QuizAttemptDetail[] = [];

      for (const attempt of attempts) {
        const quizId = attempt.videoQuizId || attempt.quizId;
        const [quiz, skill, sport] = await Promise.all([
          videoQuizService.getVideoQuiz(quizId),
          attempt.skillId ? sportsService.getSkill(attempt.skillId) : null,
          attempt.sportId ? sportsService.getSport(attempt.sportId) : null
        ]);

        const startTime = attempt.startedAt?.toDate ?
          attempt.startedAt.toDate() :
          new Date(attempt.startedAt || 0);
        const endTime = attempt.completedAt?.toDate ?
          attempt.completedAt.toDate() :
          attempt.submittedAt?.toDate ?
            attempt.submittedAt.toDate() :
            new Date(attempt.completedAt || attempt.submittedAt || 0);

        const sportName = sportDisplayName(sport?.data);

        // Better fallback for quiz title - use sport/skill names if available
        const quizTitle = quiz.data?.title ||
                         (sport?.data?.name && skill?.data?.name ? `${sportName} - ${skill.data.name} Quiz` :
                          `Quiz ${attempt.quizId.substring(0, 8)}...`);

        attemptDetails.push({
          attemptId: attempt.id,
          quizId: quizId,
          quizTitle,
          sportName,
          skillName: skill?.data?.name || 'Unknown Skill',
          startedAt: startTime,
          submittedAt: endTime,
          timeSpent: Math.round((attempt.totalTimeSpent || attempt.timeSpent || 0) / 60), // Convert to minutes
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          questionsAnswered: attempt.questionsAnswered?.length || 0,
          // A freeze point that holds the frame but asks nothing is not a question
          // and is never answered, so it is not counted here either.
          totalQuestions: quiz.data?.questions?.filter((q: { holdOnly?: boolean }) => !q.holdOnly).length || 0,
          correctAnswers: attempt.questionsAnswered?.filter((q: { isCorrect?: boolean }) => q.isCorrect).length || 0,
          incorrectAnswers: attempt.questionsAnswered?.filter((q: { isCorrect?: boolean }) => !q.isCorrect).length || 0,
        });
      }

      return {
        success: true,
        data: attemptDetails,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch quiz attempt history', 'StudentAnalyticsService', error);
      return {
        success: false,
        error: {
          code: 'QUIZ_HISTORY_FAILED',
          message: 'Failed to fetch quiz attempt history',
        },
        timestamp: new Date(),
      };
    }
  }

  // Private helper methods

  // Both streaks read the shared rule (src/lib/training/attempt-streak.ts) so a coach sees the
  // same number the goalie does. The local loops these replace dated takes by `submittedAt`,
  // which finishing a take never sets, so every student read 0 here.
  private calculateCurrentStreak(quizAttempts: QuizAttempt[]): number {
    return takeStreak(quizAttempts).currentStreak;
  }

  private calculateLongestStreak(quizAttempts: QuizAttempt[]): number {
    return takeStreak(quizAttempts).longestStreak;
  }

  private determineStudyPattern(quizAttempts: QuizAttempt[]): 'morning' | 'afternoon' | 'evening' | 'night' | 'varied' {
    if (quizAttempts.length === 0) return 'varied';

    const hourCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    quizAttempts.forEach(attempt => {
      const date = finishedTakeDate(attempt) ?? new Date(0);
      const hour = date.getHours();

      if (hour >= 6 && hour < 12) hourCounts.morning++;
      else if (hour >= 12 && hour < 17) hourCounts.afternoon++;
      else if (hour >= 17 && hour < 22) hourCounts.evening++;
      else hourCounts.night++;
    });

    const total = quizAttempts.length;
    const threshold = total * 0.5; // 50% threshold for pattern

    if (hourCounts.morning >= threshold) return 'morning';
    if (hourCounts.afternoon >= threshold) return 'afternoon';
    if (hourCounts.evening >= threshold) return 'evening';
    if (hourCounts.night >= threshold) return 'night';

    return 'varied';
  }

  private async buildRecentActivityFromQuizzes(
    _userId: string,
    quizzes: QuizAttempt[]
  ): Promise<ActivityRecord[]> {
    const activities: ActivityRecord[] = [];

    const toDate = (attempt: QuizAttempt): Date => finishedTakeDate(attempt) ?? new Date(0);

    // Add quiz completions
    const recentQuizzes = quizzes
      .sort((a, b) => {
        const dateA = toDate(a);
        const dateB = toDate(b);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);

    for (const quiz of recentQuizzes) {
      const quizData = await videoQuizService.getVideoQuiz(quiz.videoQuizId);

      let title = 'Completed Quiz';
      if (quizData.data?.title) {
        title = `Completed ${quizData.data.title}`;
      }

      activities.push({
        id: quiz.id,
        type: 'quiz_completed',
        title,
        description: `Score: ${quiz.percentage}%`,
        timestamp: toDate(quiz),
        metadata: {
          score: quiz.percentage,
          timeSpent: quiz.timeSpent,
        },
      });
    }

    return activities;
  }
}

// Export singleton instance
export const studentAnalyticsService = new StudentAnalyticsService();
