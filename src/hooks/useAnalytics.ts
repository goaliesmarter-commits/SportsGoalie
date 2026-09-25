'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { videoQuizService } from '@/lib/database';
import { VideoQuizProgress } from '@/types/video-quiz';
import { PILLARS } from '@/types';
import { getPillarSlugFromDocId } from '@/lib/utils/pillars';

export interface DailyProgress {
  date: string;
  quizzes: number;
  timeSpent: number; // minutes
  avgScore: number;
}

export interface PillarBreakdown {
  pillarName: string;
  pillarId: string;
  attempts: number;
  avgScore: number;
  timeSpent: number; // minutes
  bestScore: number;
  color: string;
}

export interface RecentAttempt {
  id: string;
  quizId: string;
  /** Name of the Knowledge Check. Empty only if the check itself has been deleted. */
  quizTitle: string;
  skillId: string;
  sportId: string;
  pillarName: string;
  percentage: number;
  timeSpent: number;
  submittedAt: Date;
}

export interface LearningConsistency {
  thisWeekDays: number;
  thisMonthDays: number;
  daysInCurrentWeek: number;
  daysInCurrentMonth: number;
}

export interface AnalyticsData {
  // Raw attempts
  attempts: VideoQuizProgress[];
  // Aggregated
  dailyProgress: DailyProgress[];
  pillarBreakdown: PillarBreakdown[];
  recentAttempts: RecentAttempt[];
  consistency: LearningConsistency;
  // Computed metrics
  totalTimeMinutes: number;
  totalQuizzes: number;
  uniqueSkills: number;
  avgScore: number;
  bestScore: number;
  currentStreak: number;
  longestStreak: number;
  avgSessionTime: number; // minutes per quiz
  completionRate: number; // % of quizzes scored >= 70
}

const PILLAR_COLORS: Record<string, string> = {
  mindset: '#2563eb',
  skating: '#3b82f6',
  form: '#0ea5e9',
  positioning: '#1d4ed8',
  seven_point: '#ef4444',
  training: '#dc2626',
  lifestyle: '#f43f5e',
};

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
}

function dateStr(d: Date): string {
  const t = d.getTime();
  if (!t || isNaN(t)) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Fills in the Knowledge Check name on attempts that were taken before the title was
 * stored alongside the attempt. Mutates in place.
 *
 * Only the rows actually on screen are looked up, one read per distinct check rather
 * than per attempt, and the quiz service caches them — so a goalie who has retaken the
 * same check ten times still costs a single read.
 */
async function fillInMissingTitles(recentAttempts: RecentAttempt[]): Promise<void> {
  const missingIds = [
    ...new Set(recentAttempts.filter(a => !a.quizTitle && a.quizId).map(a => a.quizId)),
  ];
  if (missingIds.length === 0) return;

  const titles = new Map<string, string>();
  await Promise.all(
    missingIds.map(async quizId => {
      try {
        const result = await videoQuizService.getVideoQuiz(quizId);
        if (result.success && result.data?.title) {
          titles.set(quizId, result.data.title);
        }
      } catch {
        // A deleted check just keeps its fallback label.
      }
    })
  );

  for (const attempt of recentAttempts) {
    if (!attempt.quizTitle) {
      attempt.quizTitle = titles.get(attempt.quizId) || '';
    }
  }
}

export function useAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        // Fetch ALL completed attempts (up to 2000)
        const result = await videoQuizService.getUserVideoQuizAttempts(user.id, {
          completed: true,
          limit: 2000,
        });

        if (cancelled) return;

        if (!result.success || !result.data) {
          setError('Failed to load analytics data');
          return;
        }

        const attempts = result.data.items;
        const analytics = aggregateAnalytics(attempts);
        await fillInMissingTitles(analytics.recentAttempts);
        if (cancelled) return;
        setData(analytics);
        setError(null);
      } catch (err) {
        console.error('useAnalytics load error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { data, loading, error };
}

function aggregateAnalytics(
  attempts: VideoQuizProgress[]
): AnalyticsData {
  const totalQuizzes = attempts.length;

  // ── Basic stats ──
  const totalTimeMinutes = Math.round(
    attempts.reduce((sum, a) => sum + (a.timeSpent || a.totalTimeSpent || 0), 0) / 60
  );
  const avgScore = totalQuizzes > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalQuizzes)
    : 0;
  const bestScore = totalQuizzes > 0
    ? Math.round(Math.max(...attempts.map(a => a.percentage || 0)))
    : 0;

  const uniqueSkillIds = new Set(attempts.filter(a => a.skillId).map(a => a.skillId));
  const passedCount = attempts.filter(a => (a.percentage || 0) >= 70).length;
  const completionRate = totalQuizzes > 0 ? Math.round((passedCount / totalQuizzes) * 100) : 0;
  const avgSessionTime = totalQuizzes > 0 ? Math.round(totalTimeMinutes / totalQuizzes) : 0;

  // ── Streak calculation ──
  const attemptDates = [
    ...new Set(
      attempts
        .map(a => {
          const d = toDate(a.submittedAt || a.completedAt);
          return d.getTime() > 0 ? dateStr(d) : null;
        })
        .filter((d): d is string => d !== null)
    ),
  ].sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  const today = dateStr(new Date());
  const yesterday = dateStr(new Date(Date.now() - 86400000));

  if (attemptDates.length > 0) {
    // Check if streak is active (today or yesterday)
    if (attemptDates[0] === today || attemptDates[0] === yesterday) {
      let streak = 1;
      for (let i = 1; i < attemptDates.length; i++) {
        const prev = new Date(attemptDates[i - 1]).getTime();
        const curr = new Date(attemptDates[i]).getTime();
        const diff = (prev - curr) / 86400000;
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
      currentStreak = streak;
    }

    // Longest streak
    let streak = 1;
    for (let i = 1; i < attemptDates.length; i++) {
      const prev = new Date(attemptDates[i - 1]).getTime();
      const curr = new Date(attemptDates[i]).getTime();
      const diff = (prev - curr) / 86400000;
      if (diff === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  // ── Daily progress (last 30 days) ──
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const dailyMap = new Map<string, { quizzes: number; totalScore: number; timeSpent: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dailyMap.set(dateStr(d), { quizzes: 0, totalScore: 0, timeSpent: 0 });
  }

  for (const a of attempts) {
    const d = toDate(a.submittedAt || a.completedAt);
    const dt = d.getTime();
    if (!dt || isNaN(dt)) continue;
    const ds = dateStr(d);
    const entry = dailyMap.get(ds);
    if (entry) {
      entry.quizzes++;
      entry.totalScore += a.percentage || 0;
      entry.timeSpent += Math.round((a.timeSpent || a.totalTimeSpent || 0) / 60);
    }
  }

  const dailyProgress: DailyProgress[] = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    quizzes: v.quizzes,
    timeSpent: v.timeSpent,
    avgScore: v.quizzes > 0 ? Math.round(v.totalScore / v.quizzes) : 0,
  }));

  // ── Pillar breakdown ──
  const pillarMap = new Map<string, { attempts: number; totalScore: number; timeSpent: number; bestScore: number }>();

  for (const a of attempts) {
    const slug = a.sportId ? getPillarSlugFromDocId(a.sportId) : null;
    // Ignore custom/non-pillar quizzes like coach-custom in pillar analytics.
    if (!slug) continue;

    const existing = pillarMap.get(slug) || { attempts: 0, totalScore: 0, timeSpent: 0, bestScore: 0 };
    existing.attempts++;
    existing.totalScore += a.percentage || 0;
    existing.timeSpent += Math.round((a.timeSpent || a.totalTimeSpent || 0) / 60);
    existing.bestScore = Math.max(existing.bestScore, a.percentage || 0);
    pillarMap.set(slug, existing);
  }

  // Always render all 7 official pillars in a stable order.
  const pillarBreakdown: PillarBreakdown[] = PILLARS.map((pillar) => {
    const v = pillarMap.get(pillar.slug) || { attempts: 0, totalScore: 0, timeSpent: 0, bestScore: 0 };

    return {
      pillarName: pillar.shortName,
      pillarId: pillar.slug,
      attempts: v.attempts,
      avgScore: v.attempts > 0 ? Math.round(v.totalScore / v.attempts) : 0,
      timeSpent: v.timeSpent,
      bestScore: Math.round(v.bestScore),
      color: PILLAR_COLORS[pillar.slug] || '#6b7280',
    };
  });

  // ── Recent attempts (last 10) ──
  const recentAttempts: RecentAttempt[] = attempts.slice(0, 10).map(a => {
    const slug = a.sportId ? getPillarSlugFromDocId(a.sportId) : null;
    const pillarInfo = slug ? PILLARS.find(p => p.slug === slug) : null;
    return {
      id: a.id,
      quizId: a.videoQuizId,
      // Filled in from the check itself for attempts saved before the title was stored.
      quizTitle: a.quizTitle?.trim() || '',
      skillId: a.skillId,
      sportId: a.sportId,
      pillarName: pillarInfo?.shortName || '',
      percentage: Math.round(a.percentage || 0),
      timeSpent: Math.round((a.timeSpent || a.totalTimeSpent || 0) / 60),
      submittedAt: toDate(a.submittedAt || a.completedAt),
    };
  });

  // ── Learning consistency ──
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const weekDays = new Set<string>();
  const monthDays = new Set<string>();

  for (const ds of attemptDates) {
    const d = new Date(ds);
    if (d >= startOfWeek) weekDays.add(ds);
    if (d >= startOfMonth) monthDays.add(ds);
  }

  const daysInCurrentWeek = now.getDay() + 1;
  const daysInCurrentMonth = now.getDate();

  const consistency: LearningConsistency = {
    thisWeekDays: weekDays.size,
    thisMonthDays: monthDays.size,
    daysInCurrentWeek,
    daysInCurrentMonth,
  };

  return {
    attempts,
    dailyProgress,
    pillarBreakdown,
    recentAttempts,
    consistency,
    totalTimeMinutes,
    totalQuizzes,
    uniqueSkills: uniqueSkillIds.size,
    avgScore,
    bestScore,
    currentStreak,
    longestStreak,
    avgSessionTime,
    completionRate,
  };
}
