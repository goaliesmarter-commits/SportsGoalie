import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { BaseDatabaseService } from '../base.service';
import type {
  MindVaultEntry,
  CreateMindVaultEntryData,
  MindVaultCategory,
  MindVaultCategorySummary,
} from '@/types/mind-vault';
import type { ApiResponse } from '@/types';

export class MindVaultService extends BaseDatabaseService {
  private readonly COLLECTION = 'mind_vault_entries';

  private normalizeError(error: unknown, fallbackCode: string): { code: string; message: string; details?: unknown } {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || fallbackCode)
        : fallbackCode;

    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Unknown error';

    return {
      code,
      message,
      details: error,
    };
  }

  /**
   * Sorts entries newest-first by createdAt. Done in-memory so the query
   * itself can rely only on auto-created single-field indexes and avoid a
   * required Firestore composite index.
   */
  private sortByCreatedAtDesc(entries: MindVaultEntry[]): MindVaultEntry[] {
    return [...entries].sort((a, b) => {
      const aMs = a.createdAt?.toMillis?.() ?? 0;
      const bMs = b.createdAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
  }

  /**
   * Get all entries for a student
   */
  async getEntriesByStudent(studentId: string): Promise<ApiResponse<MindVaultEntry[]>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('studentId', '==', studentId)
      );
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MindVaultEntry[];

      return { success: true, data: this.sortByCreatedAtDesc(entries), timestamp: new Date() };
    } catch (error) {
      console.warn('[MindVaultService] getEntriesByStudent failed:', error);
      return {
        success: false,
        error: this.normalizeError(error, 'FETCH_ERROR'),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get entries for a specific category
   */
  async getEntriesByCategory(
    studentId: string,
    category: MindVaultCategory
  ): Promise<ApiResponse<MindVaultEntry[]>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('studentId', '==', studentId),
        where('category', '==', category)
      );
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MindVaultEntry[];

      return { success: true, data: this.sortByCreatedAtDesc(entries), timestamp: new Date() };
    } catch (error) {
      console.warn('[MindVaultService] getEntriesByCategory failed:', error);
      return {
        success: false,
        error: this.normalizeError(error, 'FETCH_ERROR'),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Add a new entry to the Mind Vault
   */
  async addEntry(data: CreateMindVaultEntryData): Promise<ApiResponse<{ id: string }>> {
    console.log('[MindVaultService] addEntry called with:', { category: data.category, subcategory: data.subcategory });
    try {
      const result = await this.create<MindVaultEntry>(this.COLLECTION, data);
      console.log('[MindVaultService] addEntry result:', { success: result.success, error: result.error });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.error?.code || 'CREATE_ERROR',
            message: result.error?.message || result.message || 'Failed to add entry',
            details: result.error?.details,
          },
          message: result.error?.message || result.message || 'Failed to add entry',
          timestamp: new Date(),
        };
      }

      return result;
    } catch (error) {
      const normalizedError = this.normalizeError(error, 'CREATE_ERROR');
      console.warn(
        `[MindVaultService] addEntry failed (code=${normalizedError.code}): ${normalizedError.message}`,
        normalizedError.details
      );
      return {
        success: false,
        error: normalizedError,
        message: normalizedError.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Put the one thing a goalie wants to keep from a game into the vault.
   *
   * The post-game page can be saved more than once, so the entry gets one fixed
   * id per game: saving again rewrites the same entry instead of adding a
   * second copy, and the entry keeps the date it was first made.
   */
  async saveGameEntry(data: {
    studentId: string;
    sessionId: string;
    content: string;
    isVoiceEntry: boolean;
  }): Promise<ApiResponse<{ id: string }>> {
    const id = `post_game_${data.sessionId}`;
    try {
      const existing = await this.getById<MindVaultEntry>(this.COLLECTION, id, { useCache: false });
      if (existing.success && existing.data) {
        const updated = await this.updateEntry(id, { content: data.content });
        if (!updated.success) {
          return { success: false, error: updated.error, timestamp: new Date() };
        }
        return { success: true, data: { id }, timestamp: new Date() };
      }

      const created: CreateMindVaultEntryData = {
        studentId: data.studentId,
        category: 'hockey_challenges',
        content: data.content,
        isVoiceEntry: data.isVoiceEntry,
        sessionId: data.sessionId,
        source: 'post_game',
      };
      return await this.createWithId<MindVaultEntry>(this.COLLECTION, id, created);
    } catch (error) {
      const normalizedError = this.normalizeError(error, 'CREATE_ERROR');
      console.warn(`[MindVaultService] saveGameEntry failed (code=${normalizedError.code}): ${normalizedError.message}`);
      return { success: false, error: normalizedError, message: normalizedError.message, timestamp: new Date() };
    }
  }

  /**
   * Update an existing entry
   */
  async updateEntry(
    id: string,
    updates: Partial<Pick<MindVaultEntry, 'content' | 'subcategory'>>
  ): Promise<ApiResponse<void>> {
    return this.update<MindVaultEntry>(this.COLLECTION, id, updates);
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<ApiResponse<void>> {
    return this.delete(this.COLLECTION, id);
  }

  /**
   * Get summary counts per category for dashboard
   */
  async getCategorySummary(studentId: string): Promise<ApiResponse<MindVaultCategorySummary[]>> {
    try {
      const result = await this.getEntriesByStudent(studentId);
      if (!result.success || !result.data) {
        return { success: true, data: [], timestamp: new Date() };
      }

      const entries = result.data;
      const categoryMap = new Map<MindVaultCategory, { count: number; lastUpdated: Timestamp | null }>();

      for (const entry of entries) {
        const existing = categoryMap.get(entry.category);
        if (existing) {
          existing.count++;
          if (entry.createdAt && (!existing.lastUpdated || entry.createdAt.toMillis() > existing.lastUpdated.toMillis())) {
            existing.lastUpdated = entry.createdAt;
          }
        } else {
          categoryMap.set(entry.category, {
            count: 1,
            lastUpdated: entry.createdAt || null,
          });
        }
      }

      const summaries: MindVaultCategorySummary[] = [];
      categoryMap.forEach((value, key) => {
        summaries.push({
          category: key,
          entryCount: value.count,
          lastUpdated: value.lastUpdated,
        });
      });

      return { success: true, data: summaries, timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: (error as Error).message },
        timestamp: new Date(),
      };
    }
  }
}

export const mindVaultService = new MindVaultService();
