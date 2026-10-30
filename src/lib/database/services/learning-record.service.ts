/**
 * The learning record — every answer a goalie gives in a Knowledge Check, on
 * every layer, kept for good.
 *
 * Collection `learning_record`. This service only adds lines and reads them back:
 * there is deliberately no update or delete here, and `firestore.rules` refuses
 * both for everyone, admin included.
 *
 * A line is checked against a schema before it is written, because a bad line
 * can never be corrected afterwards.
 */

import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { z } from 'zod';

import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import type { LearningRecordEntry, NewLearningRecordEntry } from '@/types/knowledge-layers';
import type { ApiResponse } from '@/types';

const COLLECTION = 'learning_record';

/** Long enough for any real answer, short enough that a pasted essay cannot bloat the record. */
const MAX_ANSWER_TEXT = 1000;

export const learningRecordEntrySchema = z.object({
  userId: z.string().min(1),
  videoQuizId: z.string().min(1),
  questionId: z.string().min(1),
  skillId: z.string().min(1),
  sportId: z.string().min(1),
  attemptId: z.string().min(1),
  layer: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  outcome: z.enum(['correct', 'incorrect', 'reflective']),
  answerText: z.string().max(MAX_ANSWER_TEXT),
  timeToAnswer: z.number().nonnegative(),
  answeredAt: z.number().int().positive(),
});

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date() };
}

function fail<T>(code: string, message: string, details?: unknown): ApiResponse<T> {
  return { success: false, error: { code, message, details }, timestamp: new Date() };
}

export class LearningRecordService {
  /** Adds one line. Returns the new line's id. */
  async addEntry(entry: NewLearningRecordEntry): Promise<ApiResponse<string>> {
    const parsed = learningRecordEntrySchema.safeParse({
      ...entry,
      answerText: entry.answerText.slice(0, MAX_ANSWER_TEXT),
    });
    if (!parsed.success) {
      logger.error('Refused an invalid learning record line', 'LearningRecordService', parsed.error);
      return fail('learning-record/invalid', 'The answer could not be recorded.', parsed.error.flatten());
    }

    try {
      const ref = await addDoc(collection(db, COLLECTION), {
        ...parsed.data,
        // The device clock orders lines within a sitting; the server's says when
        // the line actually arrived, which a wrong device clock cannot move.
        recordedAt: serverTimestamp(),
      });
      return ok(ref.id);
    } catch (error) {
      logger.error('Failed to add a learning record line', 'LearningRecordService', error);
      return fail('learning-record/add-failed', 'The answer could not be recorded.', error);
    }
  }

  /** A goalie's whole record, oldest first. */
  async getForUser(userId: string): Promise<ApiResponse<LearningRecordEntry[]>> {
    try {
      const snapshot = await getDocs(
        query(collection(db, COLLECTION), where('userId', '==', userId), orderBy('answeredAt', 'asc'))
      );
      const entries: LearningRecordEntry[] = [];
      for (const document of snapshot.docs) {
        const parsed = learningRecordEntrySchema.safeParse(document.data());
        if (parsed.success) entries.push({ id: document.id, ...parsed.data });
        else logger.warn(`Skipped an unreadable learning record line ${document.id}`, 'LearningRecordService');
      }
      return ok(entries);
    } catch (error) {
      logger.error('Failed to load the learning record', 'LearningRecordService', error);
      return fail('learning-record/load-failed', 'Could not load the learning record.', error);
    }
  }
}

export const learningRecordService = new LearningRecordService();
