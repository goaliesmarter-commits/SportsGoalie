/**
 * Knowledge Check layer rules — loads and saves the numbers Michael sets for the
 * layers (speeds, attempts, the owned rule, session gap, Building Block size).
 *
 * One document, `knowledge_check_settings/layers`. Unlike `app_settings`, every
 * signed-in goalie reads it, because the player needs the rules to run the loop;
 * only admin writes it. See `firestore.rules`.
 *
 * Everything in and out goes through `normalizeLayerRules`, so a missing
 * document, a missing field or a hand-edited value always comes back as complete,
 * in-range rules.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '@/lib/firebase/config';
import { layerRuleProblems, normalizeLayerRules } from '@/lib/training/layers';
import { logger } from '@/lib/utils/logger';
import type { LayerRules } from '@/types/knowledge-layers';
import type { ApiResponse } from '@/types';

const COLLECTION = 'knowledge_check_settings';
const DOCUMENT_ID = 'layers';

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date() };
}

function fail<T>(code: string, message: string, details?: unknown): ApiResponse<T> {
  return { success: false, error: { code, message, details }, timestamp: new Date() };
}

export class LayerRulesService {
  /** The rules in force. No document yet means the defaults, which is not an error. */
  async getRules(): Promise<ApiResponse<LayerRules>> {
    try {
      const snapshot = await getDoc(doc(db, COLLECTION, DOCUMENT_ID));
      return ok(normalizeLayerRules(snapshot.exists() ? snapshot.data() : null));
    } catch (error) {
      logger.error('Failed to load layer rules', 'LayerRulesService', error);
      return fail('layer-rules/load-failed', 'Could not load the layer rules.', error);
    }
  }

  /**
   * Writes the whole document and returns what was stored, which can differ from
   * what was typed when a value had to be pulled back into range.
   */
  async saveRules(rules: LayerRules, updatedBy: string): Promise<ApiResponse<LayerRules>> {
    // The page refuses these before Save; this stops any other caller too.
    if (Object.keys(layerRuleProblems(rules)).length > 0) {
      return fail('layer-rules/invalid', 'Some layer rules are not valid.');
    }
    const normalized = normalizeLayerRules(rules);
    try {
      await setDoc(doc(db, COLLECTION, DOCUMENT_ID), {
        ...normalized,
        updatedAt: serverTimestamp(),
        updatedBy,
      });
      return ok(normalized);
    } catch (error) {
      logger.error('Failed to save layer rules', 'LayerRulesService', error);
      return fail('layer-rules/save-failed', 'Could not save the layer rules.', error);
    }
  }
}

export const layerRulesService = new LayerRulesService();
