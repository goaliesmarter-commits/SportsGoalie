import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '@/lib/database/services/user.service';

vi.mock('@/lib/database/base.service', () => ({
  BaseDatabaseService: class {
    getById = vi.fn();
    createWithId = vi.fn();
    update = vi.fn();
    query = vi.fn();
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), database: vi.fn() },
}));

vi.mock('@/lib/database/services/video-quiz.service', () => ({
  videoQuizService: { getUserVideoQuizAttempts: vi.fn() },
}));

vi.mock('@/lib/database/services/sports.service', () => ({
  sportsService: { getSkillsBySport: vi.fn() },
}));

import { videoQuizService } from '@/lib/database/services/video-quiz.service';
import { sportsService } from '@/lib/database/services/sports.service';

const ok = <T,>(data: T) => ({ success: true, data, timestamp: new Date() });
const day = (d: number) => ({ toDate: () => new Date(2026, 9, d, 12, 0, 0) });

// One finished take of a skill, every question right.
const finishedTake = {
  id: 'a1',
  userId: 'kid1',
  sportId: 'pillar_mindset',
  skillId: 'skill0',
  videoQuizId: 'vq1',
  isCompleted: true,
  percentage: 100,
  completedAt: day(27),
  questionsAnswered: [{ questionId: 'q1', isCorrect: true }],
};

describe('UserService.getUserProgress', () => {
  let service: UserService;
  let getById: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
    getById = service.getById as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(videoQuizService.getUserVideoQuizAttempts).mockResolvedValue(
      ok({ items: [finishedTake] }) as never,
    );
    vi.mocked(sportsService.getSkillsBySport).mockResolvedValue(
      ok({ items: [{ id: 'skill0' }, { id: 'skill1' }, { id: 'skill2' }] }) as never,
    );
  });

  it('counts a goalie\'s finished checks even though no progress record was ever stored', async () => {
    getById.mockResolvedValue(ok(null));

    const result = await service.getUserProgress('kid1');

    expect(result.success).toBe(true);
    expect(result.data?.userId).toBe('kid1');
    expect(result.data?.overallStats.quizzesCompleted).toBe(1);
    expect(result.data?.overallStats.skillsCompleted).toBe(1);
    expect(result.data?.overallStats.averageQuizScore).toBe(100);
  });

  it('reads zeros for a goalie with no record and no checks, not an error', async () => {
    getById.mockResolvedValue(ok(null));
    vi.mocked(videoQuizService.getUserVideoQuizAttempts).mockResolvedValue(ok({ items: [] }) as never);

    const result = await service.getUserProgress('kid1');

    expect(result.success).toBe(true);
    expect(result.data?.overallStats.quizzesCompleted).toBe(0);
    expect(result.data?.overallStats.skillsCompleted).toBe(0);
  });

  it('keeps the stored values it does not recount', async () => {
    getById.mockResolvedValue(
      ok({
        userId: 'kid1',
        achievements: ['first_quiz_pass'],
        overallStats: { quizzesCompleted: 9, skillsCompleted: 9, longestStreak: 12, level: 3 },
      }),
    );

    const result = await service.getUserProgress('kid1');

    expect(result.data?.achievements).toEqual(['first_quiz_pass']);
    expect(result.data?.overallStats.level).toBe(3);
    expect(result.data?.overallStats.longestStreak).toBe(12);
    // Counted from the attempts, not the stored numbers.
    expect(result.data?.overallStats.quizzesCompleted).toBe(1);
  });

  it('passes a failed read on instead of answering with zeros', async () => {
    getById.mockResolvedValue({
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'nope' },
      timestamp: new Date(),
    });

    const result = await service.getUserProgress('kid1');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PERMISSION_DENIED');
  });
});

describe('UserService.updateUserProgress', () => {
  let service: UserService;
  let getById: ReturnType<typeof vi.fn>;
  let createWithId: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
    getById = service.getById as unknown as ReturnType<typeof vi.fn>;
    createWithId = service.createWithId as unknown as ReturnType<typeof vi.fn>;
    update = service.update as unknown as ReturnType<typeof vi.fn>;
    createWithId.mockResolvedValue(ok({ id: 'kid1' }));
    update.mockResolvedValue(ok(undefined));
  });

  it('creates the record first when none is stored', async () => {
    getById.mockResolvedValue(ok(null));

    await service.updateUserProgress('kid1', { achievements: ['x'] });

    expect(createWithId).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('leaves a stored record alone', async () => {
    getById.mockResolvedValue(ok({ userId: 'kid1', achievements: [], overallStats: {} }));

    await service.updateUserProgress('kid1', { achievements: ['x'] });

    expect(createWithId).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a record it simply failed to read', async () => {
    getById.mockResolvedValue({
      success: false,
      error: { code: 'UNAVAILABLE', message: 'offline' },
      timestamp: new Date(),
    });

    await service.updateUserProgress('kid1', { achievements: ['x'] });

    expect(createWithId).not.toHaveBeenCalled();
  });
});
