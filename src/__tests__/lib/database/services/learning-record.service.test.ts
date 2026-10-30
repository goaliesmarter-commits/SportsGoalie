import { beforeEach, describe, it, expect, vi } from 'vitest';

const { addDoc } = vi.hoisted(() => ({ addDoc: vi.fn() }));

vi.mock('@/lib/firebase/config', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc,
  collection: vi.fn(() => 'learning_record'),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIME'),
  where: vi.fn(),
}));

import { learningRecordService } from '@/lib/database/services/learning-record.service';
import type { NewLearningRecordEntry } from '@/types/knowledge-layers';

const entry: NewLearningRecordEntry = {
  userId: 'goalie-1',
  videoQuizId: 'quiz-1',
  questionId: 'q-1',
  skillId: 'skill-1',
  sportId: 'sport-1',
  attemptId: 'attempt_goalie-1_quiz-1_1',
  layer: 1,
  outcome: 'incorrect',
  answerText: 'Left pad',
  timeToAnswer: 6,
  answeredAt: 1_761_700_000_000,
};

describe('learningRecordService.addEntry', () => {
  beforeEach(() => {
    addDoc.mockReset();
    addDoc.mockResolvedValue({ id: 'line-1' });
  });

  it('adds the line with the time it reached the server', async () => {
    const result = await learningRecordService.addEntry(entry);
    expect(result).toMatchObject({ success: true, data: 'line-1' });
    expect(addDoc).toHaveBeenCalledWith('learning_record', { ...entry, recordedAt: 'SERVER_TIME' });
  });

  it('refuses a line on a layer that does not exist, since it could never be corrected', async () => {
    const result = await learningRecordService.addEntry({ ...entry, layer: 5 as never });
    expect(result.success).toBe(false);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('refuses a line with no attempt to belong to', async () => {
    const result = await learningRecordService.addEntry({ ...entry, attemptId: '' });
    expect(result.success).toBe(false);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('shortens an overlong answer rather than losing the line', async () => {
    await learningRecordService.addEntry({ ...entry, answerText: 'x'.repeat(5000) });
    expect(addDoc.mock.calls[0][1].answerText).toHaveLength(1000);
  });

  it('reports a failed write instead of throwing into the player', async () => {
    addDoc.mockRejectedValue(new Error('offline'));
    const result = await learningRecordService.addEntry(entry);
    expect(result.success).toBe(false);
  });
});
