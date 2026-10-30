import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/database/base.service', () => ({
  BaseDatabaseService: class {
    query = vi.fn();
  },
}));
vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), database: vi.fn() },
}));
vi.mock('@/lib/database/services/user.service', () => ({ userService: {} }));
vi.mock('@/lib/database/services/sports.service', () => ({ sportsService: {} }));

import { AnalyticsService, isKnowledgeCheckAttempt } from '@/lib/database/services/analytics.service';

const ok = <T,>(items: T[]) => ({ success: true, data: { items }, timestamp: new Date() });
const at = (d: Date) => ({ toDate: () => d });

describe('isKnowledgeCheckAttempt', () => {
  it('keeps a real check and drops the record a finished lesson leaves behind', () => {
    expect(isKnowledgeCheckAttempt({ videoQuizId: 'vq1' })).toBe(true);
    expect(isKnowledgeCheckAttempt({ videoQuizId: 'lesson_skill0' })).toBe(false);
    expect(isKnowledgeCheckAttempt({})).toBe(true);
  });
});

describe('AnalyticsService engagement', () => {
  let service: AnalyticsService;
  let query: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new AnalyticsService();
    query = (service as unknown as { query: ReturnType<typeof vi.fn> }).query;
  });

  it('counts finished knowledge checks from the live collection, not the retired one', async () => {
    query.mockImplementation(async (collection: string) => {
      if (collection === 'video_quiz_progress') {
        return ok([
          { userId: 'a', videoQuizId: 'vq1', percentage: 100, completedAt: at(new Date()) },
          { userId: 'b', videoQuizId: 'vq1', percentage: 50, completedAt: at(new Date()) },
          { userId: 'a', videoQuizId: 'lesson_s1', percentage: 100, completedAt: at(new Date()) },
        ]);
      }
      if (collection === 'sport_progress') return ok([]);
      return ok([]);
    });

    const result = await (service as unknown as { getEngagementAnalytics: () => Promise<{ data: { totalQuizAttempts: number; averageQuizScore: number } }> }).getEngagementAnalytics();

    expect(query).toHaveBeenCalledWith('video_quiz_progress', expect.anything());
    expect(query).not.toHaveBeenCalledWith('quiz_attempts', expect.anything());
    expect(result.data.totalQuizAttempts).toBe(2);
    expect(result.data.averageQuizScore).toBe(75);
  });

  it('counts a goalie once however many pillars they touched today', async () => {
    const now = at(new Date());
    query.mockImplementation(async (collection: string) => {
      if (collection === 'sport_progress') {
        return ok([
          { userId: 'a', sportId: 'p1', lastAccessedAt: now },
          { userId: 'a', sportId: 'p2', lastAccessedAt: now },
          { userId: 'a', sportId: 'p3', lastAccessedAt: now },
          { userId: 'b', sportId: 'p1', lastAccessedAt: now },
          { userId: 'c', sportId: 'p1', lastAccessedAt: at(new Date(2020, 0, 1)) },
        ]);
      }
      return ok([]);
    });

    const result = await (service as unknown as { getEngagementAnalytics: () => Promise<{ data: { activeUsersToday: number } }> }).getEngagementAnalytics();

    expect(result.data.activeUsersToday).toBe(2);
  });

  it('puts a finished check on the day it was completed in the 14-day chart', async () => {
    const today = new Date();
    query.mockImplementation(async (collection: string) => {
      if (collection === 'video_quiz_progress') {
        return ok([{ userId: 'a', videoQuizId: 'vq1', percentage: 80, completedAt: at(today) }]);
      }
      return ok([]);
    });

    const result = await service.getUserEngagementData(3);
    const last = result.data![result.data!.length - 1];

    expect(last.quizAttempts).toBe(1);
    expect(last.averageScore).toBe(80);
    expect(last.activeUsers).toBe(1);
  });
});
