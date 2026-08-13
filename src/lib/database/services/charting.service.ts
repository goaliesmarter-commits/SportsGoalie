import { BaseDatabaseService } from '../base.service';
import {
  Session,
  ChartingEntry,
  SessionStats,
  StreakData,
  GoalsAnalytics,
  CategoryPerformance,
  PreGameRoutineAdherence,
  PeriodPerformanceAnalytics,
  ShootoutAnalytics,
  V2GameAnalytics,
  V2PeriodAverage,
  V2PracticeAnalytics,
  V2PreGameData,
  V2PeriodData,
  V2PostGameData,
  V2PracticeChartEntry,
  StudentChartingAnalytics,
  StudentSummary,
  CohortAnalytics,
  ChartingQueryOptions,
  ApiResponse,
} from '@/types';
import { Timestamp, query, where, orderBy, limit as firestoreLimit, getDocs, collection, doc, setDoc } from 'firebase/firestore';
import { logger } from '../../utils/logger';
import { db } from '../../firebase/config';

/**
 * Service for managing goaltending charting system including sessions and charting entries.
 *
 * This service provides functionality for:
 * - Session management (games and practices)
 * - Charting entry operations
 * - Analytics and statistics calculation
 * - Student progress tracking
 * - Admin dashboard data
 *
 * @example
 * ```typescript
 * // Create a new session
 * const session = await chartingService.createSession({
 *   studentId: 'student123',
 *   type: 'game',
 *   date: new Date(),
 *   opponent: 'Team ABC',
 *   location: 'Home Arena'
 * });
 *
 * // Create a charting entry
 * const entry = await chartingService.createChartingEntry({
 *   sessionId: session.data.id,
 *   studentId: 'student123',
 *   submittedBy: 'admin123',
 *   submitterRole: 'admin',
 *   preGame: { ... }
 * });
 * ```
 */
export class ChartingService extends BaseDatabaseService {
  private readonly SESSIONS_COLLECTION = 'sessions';
  private readonly CHARTING_ENTRIES_COLLECTION = 'charting_entries';
  private readonly DYNAMIC_CHARTING_ENTRIES_COLLECTION = 'dynamic_charting_entries';
  private readonly MIND_VAULT_ENTRIES_COLLECTION = 'mind_vault_entries';
  private readonly VIDEO_QUIZ_PROGRESS_COLLECTION = 'video_quiz_progress';
  private readonly ANALYTICS_COLLECTION = 'charting_analytics';

  private getErrorCode(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return String((error as { code?: unknown }).code ?? '');
    }
    return '';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return '';
  }

  private isPermissionDeniedError(error: unknown): boolean {
    const code = this.getErrorCode(error).toLowerCase();
    const message = this.getErrorMessage(error).toLowerCase();
    return code.includes('permission-denied') || message.includes('missing or insufficient permissions');
  }

  // ==================== SESSION OPERATIONS ====================

  /**
   * Creates a new session (game or practice)
   */
  async createSession(
    sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<{ id: string }>> {
    logger.database('create', this.SESSIONS_COLLECTION, undefined, {
      type: sessionData.type,
      studentId: sessionData.studentId
    });

    // Remove undefined fields to avoid Firestore errors
    const cleanedData: any = {
      studentId: sessionData.studentId,
      type: sessionData.type,
      date: sessionData.date,
      status: sessionData.status || 'scheduled',
      createdBy: sessionData.createdBy,
      tags: sessionData.tags || [],
    };

    // Only add optional fields if they're defined
    if (sessionData.opponent !== undefined) cleanedData.opponent = sessionData.opponent;
    if (sessionData.location !== undefined) cleanedData.location = sessionData.location;
    if (sessionData.result !== undefined) cleanedData.result = sessionData.result;

    const result = await this.create<Session>(this.SESSIONS_COLLECTION, cleanedData);

    if (result.success) {
      logger.info('Session created successfully', 'ChartingService', {
        sessionId: result.data!.id,
        type: sessionData.type,
        studentId: sessionData.studentId
      });
    }

    return result;
  }

  /**
   * Retrieves a session by ID
   */
  async getSession(sessionId: string): Promise<ApiResponse<Session | null>> {
    logger.database('read', this.SESSIONS_COLLECTION, sessionId);
    return await this.getById<Session>(this.SESSIONS_COLLECTION, sessionId);
  }

  /**
   * Updates a session
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Omit<Session, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<ApiResponse<void>> {
    logger.database('update', this.SESSIONS_COLLECTION, sessionId, updates);
    return await this.update(this.SESSIONS_COLLECTION, sessionId, updates);
  }

  /**
   * Deletes a session and all associated charting entries
   */
  async deleteSession(sessionId: string): Promise<ApiResponse<void>> {
    logger.database('delete', this.SESSIONS_COLLECTION, sessionId);

    // First, delete all charting entries for this session
    const entries = await this.getChartingEntriesBySession(sessionId);
    if (entries.success && entries.data) {
      for (const entry of entries.data) {
        await this.deleteChartingEntry(entry.id);
      }
    }

    return await this.delete(this.SESSIONS_COLLECTION, sessionId);
  }

  /**
   * Gets all sessions for a student
   */
  async getSessionsByStudent(
    studentId: string,
    options?: ChartingQueryOptions
  ): Promise<ApiResponse<Session[]>> {
    logger.database('query', this.SESSIONS_COLLECTION, undefined, { studentId });

    try {
      let q = query(
        collection(db, this.SESSIONS_COLLECTION),
        where('studentId', '==', studentId)
      );

      // Apply filters
      if (options?.sessionType) {
        q = query(q, where('type', '==', options.sessionType));
      }

      if (options?.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (options?.dateFrom) {
        q = query(q, where('date', '>=', Timestamp.fromDate(options.dateFrom)));
      }

      if (options?.dateTo) {
        q = query(q, where('date', '<=', Timestamp.fromDate(options.dateTo)));
      }

      // Apply ordering
      const orderByField = options?.orderBy || 'date';
      const orderDirection = options?.orderDirection || 'desc';
      q = query(q, orderBy(orderByField, orderDirection));

      // Apply limit
      if (options?.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Session));

      return {
        success: true,
        data: sessions,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get sessions by student', 'ChartingService', error);
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve sessions',
          details: error
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Gets upcoming sessions for a student
   */
  async getUpcomingSessions(studentId: string, limitCount: number = 10): Promise<ApiResponse<Session[]>> {
    logger.database('query', this.SESSIONS_COLLECTION, undefined, { studentId, type: 'upcoming' });

    try {
      const now = Timestamp.now();
      const q = query(
        collection(db, this.SESSIONS_COLLECTION),
        where('studentId', '==', studentId),
        where('date', '>=', now),
        where('status', 'in', ['scheduled', 'pre-game', 'in-progress']),
        orderBy('date', 'asc'),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Session));

      return {
        success: true,
        data: sessions,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get upcoming sessions', 'ChartingService', error);
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve upcoming sessions',
          details: error
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Gets all sessions across all students (Admin only)
   */
  async getAllSessions(options?: ChartingQueryOptions): Promise<ApiResponse<Session[]>> {
    logger.database('query', this.SESSIONS_COLLECTION, undefined, { type: 'admin-all' });

    try {
      let q = query(collection(db, this.SESSIONS_COLLECTION));

      // Apply filters
      if (options?.sessionType) {
        q = query(q, where('type', '==', options.sessionType));
      }

      if (options?.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (options?.dateFrom) {
        q = query(q, where('date', '>=', Timestamp.fromDate(options.dateFrom)));
      }

      if (options?.dateTo) {
        q = query(q, where('date', '<=', Timestamp.fromDate(options.dateTo)));
      }

      // Apply ordering
      const orderByField = options?.orderBy || 'date';
      const orderDirection = options?.orderDirection || 'desc';
      q = query(q, orderBy(orderByField, orderDirection));

      // Apply limit
      if (options?.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Session));

      return {
        success: true,
        data: sessions,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get all sessions', 'ChartingService', error);
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve all sessions',
          details: error
        },
        timestamp: new Date()
      };
    }
  }

  // ==================== CHARTING ENTRY OPERATIONS ====================

  /**
   * Creates a new charting entry
   */
  async createChartingEntry(
    entryData: Omit<ChartingEntry, 'id' | 'submittedAt' | 'lastUpdatedAt'>
  ): Promise<ApiResponse<{ id: string }>> {
    logger.database('create', this.CHARTING_ENTRIES_COLLECTION, undefined, {
      sessionId: entryData.sessionId,
      studentId: entryData.studentId,
      submitterRole: entryData.submitterRole
    });

    // Build data object with only defined fields
    const data: any = {
      sessionId: entryData.sessionId,
      studentId: entryData.studentId,
      submittedBy: entryData.submittedBy,
      submitterRole: entryData.submitterRole,
      submittedAt: Timestamp.now(),
      lastUpdatedAt: Timestamp.now(),
    };

    // Only add optional section fields if they're defined
    if (entryData.preGame !== undefined) data.preGame = entryData.preGame;
    if (entryData.gameOverview !== undefined) data.gameOverview = entryData.gameOverview;
    if (entryData.period1 !== undefined) data.period1 = entryData.period1;
    if (entryData.period2 !== undefined) data.period2 = entryData.period2;
    if (entryData.period3 !== undefined) data.period3 = entryData.period3;
    if (entryData.overtime !== undefined) data.overtime = entryData.overtime;
    if (entryData.shootout !== undefined) data.shootout = entryData.shootout;
    if (entryData.postGame !== undefined) data.postGame = entryData.postGame;
    if (entryData.additionalComments !== undefined) data.additionalComments = entryData.additionalComments;

    // V2 chart sections — persist first-time creates (kept as any so types don't need schema change)
    const raw = entryData as unknown as Record<string, unknown>;
    for (const key of ['v2PreGame', 'v2Periods', 'v2PostGame', 'v2Practice', 'v2Version']) {
      if (raw[key] !== undefined) data[key] = raw[key];
    }

    const result = await this.create<ChartingEntry>(this.CHARTING_ENTRIES_COLLECTION, data);

    if (result.success) {
      logger.info('Charting entry created successfully', 'ChartingService', {
        entryId: result.data!.id,
        sessionId: entryData.sessionId,
        studentId: entryData.studentId
      });

      // Update session status if it's the first entry
      await this.updateSession(entryData.sessionId, { status: 'in-progress' });

      // Trigger analytics recalculation (async, don't wait)
      this.recalculateStudentAnalytics(entryData.studentId).catch(err =>
        logger.error('Failed to recalculate analytics', 'ChartingService', err)
      );
    }

    return result;
  }

  /**
   * Retrieves a charting entry by ID
   */
  async getChartingEntry(entryId: string): Promise<ApiResponse<ChartingEntry | null>> {
    logger.database('read', this.CHARTING_ENTRIES_COLLECTION, entryId);
    return await this.getById<ChartingEntry>(this.CHARTING_ENTRIES_COLLECTION, entryId);
  }

  /**
   * Updates a charting entry
   */
  async updateChartingEntry(
    entryId: string,
    updates: Partial<Omit<ChartingEntry, 'id' | 'submittedAt' | 'sessionId' | 'studentId'>>
  ): Promise<ApiResponse<void>> {
    logger.database('update', this.CHARTING_ENTRIES_COLLECTION, entryId, updates);

    const data = {
      ...updates,
      lastUpdatedAt: Timestamp.now(),
    };

    const result = await this.update(this.CHARTING_ENTRIES_COLLECTION, entryId, data);

    if (result.success) {
      // Get the entry to find studentId for analytics recalculation
      const entry = await this.getChartingEntry(entryId);
      if (entry.success && entry.data) {
        this.recalculateStudentAnalytics(entry.data.studentId).catch(err =>
          logger.error('Failed to recalculate analytics', 'ChartingService', err)
        );
      }
    }

    return result;
  }

  /**
   * Deletes a charting entry
   */
  async deleteChartingEntry(entryId: string): Promise<ApiResponse<void>> {
    logger.database('delete', this.CHARTING_ENTRIES_COLLECTION, entryId);

    // Get the entry to find studentId before deletion
    const entry = await this.getChartingEntry(entryId);
    const result = await this.delete(this.CHARTING_ENTRIES_COLLECTION, entryId);

    if (result.success && entry.success && entry.data) {
      this.recalculateStudentAnalytics(entry.data.studentId).catch(err =>
        logger.error('Failed to recalculate analytics', 'ChartingService', err)
      );
    }

    return result;
  }

  /**
   * Gets all charting entries for a session
   */
  async getChartingEntriesBySession(sessionId: string): Promise<ApiResponse<ChartingEntry[]>> {
    logger.database('query', this.CHARTING_ENTRIES_COLLECTION, undefined, { sessionId });

    try {
      const q = query(
        collection(db, this.CHARTING_ENTRIES_COLLECTION),
        where('sessionId', '==', sessionId),
        orderBy('submittedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChartingEntry));

      return {
        success: true,
        data: entries,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get charting entries by session', 'ChartingService', error);
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve charting entries',
          details: error
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Gets all charting entries for a student
   */
  async getChartingEntriesByStudent(
    studentId: string,
    limitCount?: number
  ): Promise<ApiResponse<ChartingEntry[]>> {
    logger.database('query', this.CHARTING_ENTRIES_COLLECTION, undefined, { studentId });

    try {
      let q = query(
        collection(db, this.CHARTING_ENTRIES_COLLECTION),
        where('studentId', '==', studentId),
        orderBy('submittedAt', 'desc')
      );

      if (limitCount) {
        q = query(q, firestoreLimit(limitCount));
      }

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChartingEntry));

      return {
        success: true,
        data: entries,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get charting entries by student', 'ChartingService', error);
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve charting entries',
          details: error
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Gets all charting entries across all students (Admin only)
   */
  async getAllChartingEntries(options?: ChartingQueryOptions): Promise<ApiResponse<ChartingEntry[]>> {
    logger.database('query', this.CHARTING_ENTRIES_COLLECTION, undefined, { type: 'admin-all' });

    try {
      let q = query(
        collection(db, this.CHARTING_ENTRIES_COLLECTION),
        orderBy('submittedAt', 'desc')
      );

      if (options?.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChartingEntry));

      return {
        success: true,
        data: entries,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get all charting entries', 'ChartingService', error);
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: 'Failed to retrieve all charting entries',
          details: error
        },
        timestamp: new Date()
      };
    }
  }

  // ==================== ANALYTICS OPERATIONS ====================

  /**
   * Calculates and stores comprehensive analytics for a student
   */
  async recalculateStudentAnalytics(studentId: string): Promise<ApiResponse<StudentChartingAnalytics>> {
    logger.info('Recalculating student analytics', 'ChartingService', { studentId });

    try {
      // Get all sessions and entries for the student
      const sessionsResult = await this.getSessionsByStudent(studentId);
      const entriesResult = await this.getChartingEntriesByStudent(studentId);

      if (!sessionsResult.success || !entriesResult.success) {
        throw new Error('Failed to fetch student data');
      }

      const sessions = sessionsResult.data || [];
      const entries = entriesResult.data || [];

      // Calculate analytics
      const analytics: StudentChartingAnalytics = {
        studentId,
        sessionStats: this.calculateSessionStats(sessions),
        streak: await this.calculateStreak(studentId, sessions),
        goalsAnalytics: this.calculateGoalsAnalytics(entries),
        categoryPerformances: this.calculateCategoryPerformances(entries),
        preGameRoutineAdherence: this.calculatePreGameRoutineAdherence(entries),
        periodPerformance: this.calculatePeriodPerformance(entries),
        shootoutAnalytics: this.calculateShootoutAnalytics(entries),
        v2GameAnalytics: this.calculateV2GameAnalytics(entries),
        v2PracticeAnalytics: this.calculateV2PracticeAnalytics(entries),
        lastCalculated: Timestamp.now(),
      };

      // Store analytics (create or update using setDoc with merge)
      const analyticsRef = doc(db, this.ANALYTICS_COLLECTION, studentId);
      try {
        await setDoc(analyticsRef, analytics, { merge: true });
      } catch (writeError) {
        // Users may not have permission to persist analytics snapshots.
        // Return computed analytics so UI can still function without noisy hard failures.
        if (this.isPermissionDeniedError(writeError)) {
          logger.warn('Analytics write skipped due to permissions; returning in-memory analytics', 'ChartingService', {
            studentId,
            errorCode: this.getErrorCode(writeError),
            error: this.getErrorMessage(writeError),
          });
          return {
            success: true,
            data: analytics,
            timestamp: new Date()
          };
        }

        throw writeError;
      }

      return {
        success: true,
        data: analytics,
        timestamp: new Date()
      };
    } catch (error) {
      if (this.isPermissionDeniedError(error)) {
        logger.warn('Insufficient permissions while recalculating analytics', 'ChartingService', {
          studentId,
          errorCode: this.getErrorCode(error),
          error: this.getErrorMessage(error),
        });
      } else {
        logger.error('Failed to recalculate student analytics', 'ChartingService', error);
      }
      return {
        success: false,
        error: {
          code: 'ANALYTICS_CALCULATION_FAILED',
          message: 'Failed to calculate student analytics',
          details: error
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Gets analytics for a student
   */
  async getStudentAnalytics(studentId: string): Promise<ApiResponse<StudentChartingAnalytics | null>> {
    const recalcResult = await this.recalculateStudentAnalytics(studentId);
    if (recalcResult.success) {
      return recalcResult;
    }

    const recalcError = recalcResult.error?.details ?? recalcResult.error;
    if (this.isPermissionDeniedError(recalcError)) {
      logger.warn('Using read-only charting analytics fallback due to permissions', 'ChartingService', {
        studentId,
        recalcErrorCode: this.getErrorCode(recalcError),
      });
      return await this.getStudentAnalyticsReadOnly(studentId);
    }

    logger.warn('Falling back to stored charting analytics after recalculation failure', 'ChartingService', {
      studentId,
      recalcError: recalcResult.error,
    });

    logger.database('read', this.ANALYTICS_COLLECTION, studentId);
    return await this.getById<StudentChartingAnalytics>(this.ANALYTICS_COLLECTION, studentId);
  }

  private async getStudentAnalyticsReadOnly(studentId: string): Promise<ApiResponse<StudentChartingAnalytics>> {
    try {
      const [sessionsResult, entriesResult] = await Promise.all([
        this.getSessionsByStudent(studentId),
        this.getChartingEntriesByStudent(studentId),
      ]);

      const sessions = sessionsResult.success && sessionsResult.data ? sessionsResult.data : [];
      const entries = entriesResult.success && entriesResult.data ? entriesResult.data : [];

      const analytics: StudentChartingAnalytics = {
        studentId,
        sessionStats: this.calculateSessionStats(sessions),
        streak: await this.calculateStreak(studentId, sessions),
        goalsAnalytics: this.calculateGoalsAnalytics(entries),
        categoryPerformances: this.calculateCategoryPerformances(entries),
        preGameRoutineAdherence: this.calculatePreGameRoutineAdherence(entries),
        periodPerformance: this.calculatePeriodPerformance(entries),
        shootoutAnalytics: this.calculateShootoutAnalytics(entries),
        lastCalculated: Timestamp.now(),
      };

      return {
        success: true,
        data: analytics,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.warn('Read-only charting analytics fallback failed; returning empty analytics snapshot', 'ChartingService', {
        studentId,
        errorCode: this.getErrorCode(error),
        error: this.getErrorMessage(error),
      });

      const emptyAnalytics: StudentChartingAnalytics = {
        studentId,
        sessionStats: this.calculateSessionStats([]),
        streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: Timestamp.now(), streakDates: [] },
        goalsAnalytics: this.calculateGoalsAnalytics([]),
        categoryPerformances: this.calculateCategoryPerformances([]),
        preGameRoutineAdherence: this.calculatePreGameRoutineAdherence([]),
        periodPerformance: this.calculatePeriodPerformance([]),
        shootoutAnalytics: this.calculateShootoutAnalytics([]),
        v2GameAnalytics: this.calculateV2GameAnalytics([]),
        v2PracticeAnalytics: this.calculateV2PracticeAnalytics([]),
        lastCalculated: Timestamp.now(),
      };

      return {
        success: true,
        data: emptyAnalytics,
        timestamp: new Date(),
      };
    }
  }

  // ==================== ANALYTICS CALCULATION HELPERS ====================

  private calculateSessionStats(sessions: Session[]): SessionStats {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const gameSessions = sessions.filter(s => s.type === 'game');
    const practiceSessions = sessions.filter(s => s.type === 'practice');

    // Calculate sessions per week/month
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sessionsThisWeek = sessions.filter((s) => {
      const d = this.toDate((s as unknown as { date?: unknown }).date);
      return d ? d >= oneWeekAgo : false;
    }).length;

    const sessionsThisMonth = sessions.filter((s) => {
      const d = this.toDate((s as unknown as { date?: unknown }).date);
      return d ? d >= oneMonthAgo : false;
    }).length;

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      gameSessions: gameSessions.length,
      practiceSessions: practiceSessions.length,
      completionRate: sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0,
      averageSessionsPerWeek: sessionsThisWeek > 0 ? sessionsThisWeek / 1 : 0,
      averageSessionsPerMonth: sessionsThisMonth > 0 ? sessionsThisMonth / 1 : 0,
    };
  }

  private async calculateStreak(studentId: string, sessions: Session[]): Promise<StreakData> {
    const activityDateKeys = new Set<string>();

    // Completed charting sessions
    sessions
      .filter((s) => s.status === 'completed')
      .forEach((s) => {
        const key = this.toDateKey(s.date);
        if (key) activityDateKeys.add(key);
      });

    const [chartingEntriesResult, dynamicEntriesResult, mindVaultEntriesResult, quizProgressResult] = await Promise.all([
      this.query<{ submittedAt?: unknown }>(this.CHARTING_ENTRIES_COLLECTION, {
        where: [{ field: 'studentId', operator: '==', value: studentId }],
        limit: 2000,
        useCache: false,
      }),
      this.query<{ submittedAt?: unknown }>(this.DYNAMIC_CHARTING_ENTRIES_COLLECTION, {
        where: [{ field: 'studentId', operator: '==', value: studentId }],
        limit: 2000,
        useCache: false,
      }),
      this.query<{ createdAt?: unknown }>(this.MIND_VAULT_ENTRIES_COLLECTION, {
        where: [{ field: 'studentId', operator: '==', value: studentId }],
        limit: 2000,
        useCache: false,
      }),
      this.query<{ isCompleted?: boolean; submittedAt?: unknown; completedAt?: unknown }>(this.VIDEO_QUIZ_PROGRESS_COLLECTION, {
        where: [{ field: 'userId', operator: '==', value: studentId }],
        limit: 2000,
        useCache: false,
      }),
    ]);

    if (chartingEntriesResult.success && chartingEntriesResult.data) {
      chartingEntriesResult.data.items.forEach((entry) => {
        const key = this.toDateKey(entry.submittedAt);
        if (key) activityDateKeys.add(key);
      });
    }

    if (dynamicEntriesResult.success && dynamicEntriesResult.data) {
      dynamicEntriesResult.data.items.forEach((entry) => {
        const key = this.toDateKey(entry.submittedAt);
        if (key) activityDateKeys.add(key);
      });
    }

    if (mindVaultEntriesResult.success && mindVaultEntriesResult.data) {
      mindVaultEntriesResult.data.items.forEach((entry) => {
        const key = this.toDateKey(entry.createdAt);
        if (key) activityDateKeys.add(key);
      });
    }

    if (quizProgressResult.success && quizProgressResult.data) {
      quizProgressResult.data.items.forEach((attempt) => {
        if (!attempt.isCompleted && !attempt.completedAt && !attempt.submittedAt) {
          return;
        }
        const key = this.toDateKey(attempt.completedAt || attempt.submittedAt);
        if (key) activityDateKeys.add(key);
      });
    }

    const streakDates = Array.from(activityDateKeys).sort((a, b) => b.localeCompare(a));

    if (streakDates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: Timestamp.now(),
        streakDates: [],
      };
    }

    const currentStreak = this.calculateCurrentStreak(streakDates);
    const longestStreak = this.calculateLongestStreak(streakDates);

    return {
      currentStreak,
      longestStreak,
      lastActiveDate: Timestamp.fromDate(new Date(streakDates[0])),
      streakDates,
    };
  }

  private calculateCurrentStreak(sortedDateKeysDesc: string[]): number {
    if (sortedDateKeysDesc.length === 0) return 0;

    const today = this.toDateKey(new Date());
    const yesterday = this.toDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    if (!today || !yesterday) return 0;

    // Current streak is active only if last activity is today or yesterday
    if (sortedDateKeysDesc[0] !== today && sortedDateKeysDesc[0] !== yesterday) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < sortedDateKeysDesc.length; i++) {
      const prev = new Date(sortedDateKeysDesc[i - 1]).getTime();
      const curr = new Date(sortedDateKeysDesc[i]).getTime();
      const dayDiff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateLongestStreak(sortedDateKeysDesc: string[]): number {
    if (sortedDateKeysDesc.length === 0) return 0;

    let longest = 1;
    let running = 1;

    for (let i = 1; i < sortedDateKeysDesc.length; i++) {
      const prev = new Date(sortedDateKeysDesc[i - 1]).getTime();
      const curr = new Date(sortedDateKeysDesc[i]).getTime();
      const dayDiff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        running++;
      } else {
        longest = Math.max(longest, running);
        running = 1;
      }
    }

    return Math.max(longest, running);
  }

  private toDateKey(value: unknown): string | null {
    const date = this.toDate(value);
    if (!date) return null;
    return date.toISOString().split('T')[0];
  }

  private toDate(value: unknown): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'object' && value !== null) {
      const maybeTimestamp = value as { toDate?: () => Date };
      if (typeof maybeTimestamp.toDate === 'function') {
        const d = maybeTimestamp.toDate();
        return Number.isNaN(d.getTime()) ? null : d;
      }
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    return null;
  }

  private calculateGoalsAnalytics(entries: ChartingEntry[]): GoalsAnalytics {
    let totalGoodGoals = 0;
    let totalBadGoals = 0;
    const goalsByPeriod = {
      period1: { good: 0, bad: 0 },
      period2: { good: 0, bad: 0 },
      period3: { good: 0, bad: 0 },
    };
    let totalChallenge = 0;
    let challengeCount = 0;

    entries.forEach(entry => {
      if (entry.gameOverview) {
        const { goodGoals, badGoals, degreeOfChallenge } = entry.gameOverview;

        totalGoodGoals += goodGoals.period1 + goodGoals.period2 + goodGoals.period3;
        totalBadGoals += badGoals.period1 + badGoals.period2 + badGoals.period3;

        goalsByPeriod.period1.good += goodGoals.period1;
        goalsByPeriod.period1.bad += badGoals.period1;
        goalsByPeriod.period2.good += goodGoals.period2;
        goalsByPeriod.period2.bad += badGoals.period2;
        goalsByPeriod.period3.good += goodGoals.period3;
        goalsByPeriod.period3.bad += badGoals.period3;

        totalChallenge += degreeOfChallenge.period1 + degreeOfChallenge.period2 + degreeOfChallenge.period3;
        challengeCount += 3;
      }
    });

    return {
      totalGoodGoals,
      totalBadGoals,
      goodBadRatio: totalBadGoals > 0 ? totalGoodGoals / totalBadGoals : totalGoodGoals,
      goalsByPeriod,
      averageDegreeOfChallenge: challengeCount > 0 ? totalChallenge / challengeCount : 0,
    };
  }

  private calculateCategoryPerformances(_entries: ChartingEntry[]): CategoryPerformance[] {
    // Placeholder - implement detailed category analysis
    return [];
  }

  private calculatePreGameRoutineAdherence(entries: ChartingEntry[]): PreGameRoutineAdherence {
    let wellRestedCount = 0;
    let fueledCount = 0;
    let mentalImageryCount = 0;
    let ballExercisesCount = 0;
    let stretchingCount = 0;
    let totalEntries = 0;

    entries.forEach(entry => {
      if (entry.preGame) {
        totalEntries++;
        if (entry.preGame.gameReadiness.wellRested.value) wellRestedCount++;
        if (entry.preGame.gameReadiness.fueledForGame.value) fueledCount++;
        if (entry.preGame.mindSet.mentalImagery.value) mentalImageryCount++;
        if (entry.preGame.preGameRoutine.ballExercises.value) ballExercisesCount++;
        if (entry.preGame.preGameRoutine.stretching.value) stretchingCount++;
      }
    });

    const total = totalEntries || 1;
    return {
      wellRestedPercentage: (wellRestedCount / total) * 100,
      properlyFueledPercentage: (fueledCount / total) * 100,
      mentalImageryPercentage: (mentalImageryCount / total) * 100,
      ballExercisesPercentage: (ballExercisesCount / total) * 100,
      stretchingPercentage: (stretchingCount / total) * 100,
      overallPrepScore: ((wellRestedCount + fueledCount + mentalImageryCount + ballExercisesCount + stretchingCount) / (total * 5)) * 100,
    };
  }

  private calculatePeriodPerformance(_entries: ChartingEntry[]): PeriodPerformanceAnalytics {
    // Placeholder - implement detailed period analysis
    return {
      bestPeriod: 2,
      worstPeriod: 1,
      period1Consistency: 0,
      period2Consistency: 0,
      period3Consistency: 0,
    };
  }

  private calculateShootoutAnalytics(entries: ChartingEntry[]): ShootoutAnalytics {
    let totalShootouts = 0;
    let wins = 0;
    let totalShotsSaved = 0;
    let totalShotsScored = 0;
    let totalDekesSaved = 0;
    let totalDekesScored = 0;

    entries.forEach(entry => {
      if (entry.shootout) {
        totalShootouts++;
        if (entry.shootout.result === 'won') wins++;
        totalShotsSaved += entry.shootout.shotsSaved;
        totalShotsScored += entry.shootout.shotsScored;
        totalDekesSaved += entry.shootout.dekesSaved;
        totalDekesScored += entry.shootout.dekesScored;
      }
    });

    const totalShots = totalShotsSaved + totalShotsScored;
    const totalDekes = totalDekesSaved + totalDekesScored;

    return {
      totalShootouts,
      winRate: totalShootouts > 0 ? (wins / totalShootouts) * 100 : 0,
      shotSavePercentage: totalShots > 0 ? (totalShotsSaved / totalShots) * 100 : 0,
      dekeSavePercentage: totalDekes > 0 ? (totalDekesSaved / totalDekes) * 100 : 0,
      totalSaves: totalShotsSaved + totalDekesSaved,
      totalGoalsAgainst: totalShotsScored + totalDekesScored,
    };
  }

  // ==================== V2 ANALYTICS CALCULATORS ====================

  /**
   * Reads v2 chart fields from a ChartingEntry. These fields live on the
   * same doc as legacy v1 data but are not typed on the ChartingEntry
   * interface, so we extract them with a narrow cast here.
   */
  private extractV2(entry: ChartingEntry): {
    preGame?: V2PreGameData;
    periods?: {
      period1?: V2PeriodData;
      period2?: V2PeriodData;
      period3?: V2PeriodData;
      overtime?: V2PeriodData;
    };
    postGame?: V2PostGameData;
    practice?: Omit<
      V2PracticeChartEntry,
      'id' | 'sessionId' | 'studentId' | 'version' | 'createdAt' | 'updatedAt'
    >;
  } {
    const raw = entry as unknown as Record<string, unknown>;
    return {
      preGame: raw.v2PreGame as V2PreGameData | undefined,
      periods: raw.v2Periods as {
        period1?: V2PeriodData;
        period2?: V2PeriodData;
        period3?: V2PeriodData;
        overtime?: V2PeriodData;
      } | undefined,
      postGame: raw.v2PostGame as V2PostGameData | undefined,
      practice: raw.v2Practice as Omit<
        V2PracticeChartEntry,
        'id' | 'sessionId' | 'studentId' | 'version' | 'createdAt' | 'updatedAt'
      > | undefined,
    };
  }

  private safeAvg(total: number, count: number): number {
    return count > 0 ? total / count : 0;
  }

  private calculateV2GameAnalytics(entries: ChartingEntry[]): V2GameAnalytics {
    // Mind Management aggregation
    let mindSample = 0;
    let routineCompleted = 0;
    let anxietyPresent = 0;
    let targetStateAchieved = 0;
    let mentalStateSum = 0;

    // Period aggregation
    type PeriodKey = 'period1' | 'period2' | 'period3' | 'overtime';
    // `factorCount` is tracked separately from `count`: Factor Ratio is optional,
    // so dividing its sum by the period count would score every unrated period
    // as a zero and pull the average below the scale's own floor of 1.
    const periodAgg: Record<PeriodKey, {
      count: number;
      mindSum: number;
      factorSum: number;
      factorCount: number;
      goalsAgainst: number;
      good: number;
      bad: number;
    }> = {
      period1: { count: 0, mindSum: 0, factorSum: 0, factorCount: 0, goalsAgainst: 0, good: 0, bad: 0 },
      period2: { count: 0, mindSum: 0, factorSum: 0, factorCount: 0, goalsAgainst: 0, good: 0, bad: 0 },
      period3: { count: 0, mindSum: 0, factorSum: 0, factorCount: 0, goalsAgainst: 0, good: 0, bad: 0 },
      overtime: { count: 0, mindSum: 0, factorSum: 0, factorCount: 0, goalsAgainst: 0, good: 0, bad: 0 },
    };

    // Post-Game aggregation
    let postSample = 0;
    let overallFactorSum = 0;
    let retentionSum = 0;
    let goodDecisionSum = 0;
    let mindVaultCount = 0;

    let totalV2Games = 0;

    entries.forEach((entry) => {
      const v2 = this.extractV2(entry);
      const hasAnyGameV2 = !!v2.preGame || !!v2.periods || !!v2.postGame;
      if (!hasAnyGameV2) return;
      totalV2Games++;

      if (v2.preGame) {
        mindSample++;
        if (v2.preGame.routineCompleted) routineCompleted++;
        if (v2.preGame.anxietyPresent) anxietyPresent++;
        if (v2.preGame.targetStateAchieved) targetStateAchieved++;
        mentalStateSum += v2.preGame.mentalStateRating || 0;
      }

      if (v2.periods) {
        (Object.keys(periodAgg) as PeriodKey[]).forEach((key) => {
          const p = v2.periods?.[key];
          if (!p) return;
          const agg = periodAgg[key];
          agg.count++;
          agg.mindSum += p.mindControlRating || 0;
          if (typeof p.periodFactorRatio === 'number') {
            agg.factorSum += p.periodFactorRatio;
            agg.factorCount++;
          }
          agg.goalsAgainst += p.goalsAgainst || 0;
          const goods = p.goals?.filter((g) => g.isGoodGoal).length || 0;
          const bads = (p.goals?.length || 0) - goods;
          agg.good += goods;
          agg.bad += bads;
        });
      }

      if (v2.postGame) {
        postSample++;
        overallFactorSum += v2.postGame.overallGameFactorRating || 0;
        retentionSum += v2.postGame.gameRetentionRating || 0;
        goodDecisionSum += v2.postGame.goodDecisionRate || 0;
        if (v2.postGame.mindVaultEntry && v2.postGame.mindVaultEntry.trim().length > 0) {
          mindVaultCount++;
        }
      }
    });

    const periods: V2PeriodAverage[] = (Object.keys(periodAgg) as PeriodKey[]).map((key) => {
      const a = periodAgg[key];
      return {
        period: key,
        sampleSize: a.count,
        avgMindControl: this.safeAvg(a.mindSum, a.count),
        avgFactorRatio: this.safeAvg(a.factorSum, a.factorCount),
        totalGoalsAgainst: a.goalsAgainst,
        totalGoodGoals: a.good,
        totalBadGoals: a.bad,
      };
    });

    const sampledPeriods = periods.filter((p) => p.sampleSize > 0);
    const overallAvgMindControl =
      sampledPeriods.length > 0
        ? sampledPeriods.reduce((s, p) => s + p.avgMindControl, 0) / sampledPeriods.length
        : 0;
    // A rated Factor Ratio is always 1-5, so a zero average means that period
    // had no ratings at all — exclude it rather than let it drag the overall down.
    const factorRatedPeriods = sampledPeriods.filter((p) => p.avgFactorRatio > 0);
    const overallAvgFactorRatio =
      factorRatedPeriods.length > 0
        ? factorRatedPeriods.reduce((s, p) => s + p.avgFactorRatio, 0) / factorRatedPeriods.length
        : 0;

    const totalGoalsAgainst = periods.reduce((s, p) => s + p.totalGoalsAgainst, 0);
    const totalGoodGoals = periods.reduce((s, p) => s + p.totalGoodGoals, 0);
    const totalBadGoals = periods.reduce((s, p) => s + p.totalBadGoals, 0);

    return {
      totalV2Games,
      mindManagement: {
        sampleSize: mindSample,
        routineCompletedRate: this.safeAvg(routineCompleted, mindSample) * 100,
        anxietyPresentRate: this.safeAvg(anxietyPresent, mindSample) * 100,
        targetStateAchievedRate: this.safeAvg(targetStateAchieved, mindSample) * 100,
        avgMentalStateRating: this.safeAvg(mentalStateSum, mindSample),
      },
      periods,
      overallAvgMindControl,
      overallAvgFactorRatio,
      totalGoalsAgainst,
      totalGoodGoals,
      totalBadGoals,
      goodBadRatio: totalBadGoals > 0 ? totalGoodGoals / totalBadGoals : totalGoodGoals,
      postGame: {
        sampleSize: postSample,
        avgOverallGameFactor: this.safeAvg(overallFactorSum, postSample),
        avgGameRetention: this.safeAvg(retentionSum, postSample),
        avgGoodDecisionRate: this.safeAvg(goodDecisionSum, postSample),
        mindVaultEntriesCaptured: mindVaultCount,
      },
    };
  }

  private calculateV2PracticeAnalytics(entries: ChartingEntry[]): V2PracticeAnalytics {
    let totalV2Practices = 0;
    let practiceValueSum = 0;
    let technicalEyeSum = 0;
    let designatedTrainingCount = 0;
    let designatedMinutesSum = 0;
    let designatedMinutesCount = 0;
    let videoCapturedCount = 0;

    const indexCounts = {
      immediate_development: 0,
      refinement: 0,
      maintenance: 0,
    };
    let totalIndexItemsWorkedOn = 0;

    let improvementSum = 0;
    let improvementCount = 0;
    let mindVaultCount = 0;

    entries.forEach((entry) => {
      const { practice } = this.extractV2(entry);
      if (!practice) return;

      totalV2Practices++;
      practiceValueSum += practice.practiceValueRating || 0;
      technicalEyeSum += practice.technicalEyeDevelopmentRating || 0;

      if (practice.designatedTrainingReceived) {
        designatedTrainingCount++;
        if (typeof practice.designatedTrainingDuration === 'number') {
          designatedMinutesSum += practice.designatedTrainingDuration;
          designatedMinutesCount++;
        }
      }

      if (practice.videoCaptured) videoCapturedCount++;

      (practice.practiceIndex || []).forEach((item) => {
        if (item.category in indexCounts) {
          indexCounts[item.category as keyof typeof indexCounts]++;
        }
      });

      totalIndexItemsWorkedOn += (practice.indexItemsWorkedOn || []).length;

      (practice.improvementRatings || []).forEach((r) => {
        improvementSum += r.rating || 0;
        improvementCount++;
      });

      if (practice.mindVaultEntry && practice.mindVaultEntry.trim().length > 0) {
        mindVaultCount++;
      }
    });

    return {
      totalV2Practices,
      avgPracticeValue: this.safeAvg(practiceValueSum, totalV2Practices),
      avgTechnicalEye: this.safeAvg(technicalEyeSum, totalV2Practices),
      designatedTrainingRate: this.safeAvg(designatedTrainingCount, totalV2Practices) * 100,
      totalDesignatedTrainingMinutes: designatedMinutesSum,
      avgDesignatedTrainingMinutes: this.safeAvg(designatedMinutesSum, designatedMinutesCount),
      videoCapturedRate: this.safeAvg(videoCapturedCount, totalV2Practices) * 100,
      indexCounts,
      totalIndexItemsWorkedOn,
      avgImprovementRating: this.safeAvg(improvementSum, improvementCount),
      improvementRatingsCount: improvementCount,
      mindVaultEntriesCaptured: mindVaultCount,
    };
  }

  // ==================== ADMIN OPERATIONS ====================

  /**
   * Gets all students with their summary stats for admin dashboard
   */
  async getAllStudentsSummary(): Promise<ApiResponse<StudentSummary[]>> {
    // This would need to be implemented with proper admin permissions
    // Placeholder for now
    return {
      success: true,
      data: [],
      timestamp: new Date()
    };
  }

  /**
   * Gets cohort-wide analytics for admin dashboard
   */
  async getCohortAnalytics(): Promise<ApiResponse<CohortAnalytics>> {
    // Placeholder for cohort analytics
    return {
      success: true,
      data: {
        totalStudents: 0,
        activeStudents: 0,
        averageCompletionRate: 0,
        totalSessionsThisWeek: 0,
        totalSessionsThisMonth: 0,
        topPerformers: [],
        needsAttention: [],
      },
      timestamp: new Date()
    };
  }
}

// Export singleton instance
export const chartingService = new ChartingService();
