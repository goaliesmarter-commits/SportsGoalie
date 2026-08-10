/**
 * Maps onboarding assessment categories to content pillars.
 * This is the bridge between "what the student is weak at" and "what content to assign."
 */

import type { PillarSlug } from '@/types/onboarding';
import type { GapAnalysis } from '@/types';
import { PILLAR_IDS } from './pillars';

/**
 * Assessment category → relevant pillars.
 *
 * The keys are assessment categories, not pillars — `training` here is the
 * category a student answers questions about, and it maps to the Practice
 * pillar (with Skating and Lifestyle alongside it).
 */
const CATEGORY_PILLAR_MAP: Record<string, PillarSlug[]> = {
  feelings: ['mindset', 'lifestyle'],
  knowledge: ['form', 'positioning', 'seven_point'],
  pre_game: ['mindset', 'game', 'lifestyle'],
  in_game: ['positioning', 'skating', 'seven_point', 'form'],
  post_game: ['mindset', 'game'],
  training: ['practice', 'skating', 'lifestyle'],
  learning: ['mindset'],
};

/** Get pillar slugs for an assessment category */
export function getPillarsForCategory(categorySlug: string): PillarSlug[] {
  return CATEGORY_PILLAR_MAP[categorySlug] || [];
}

/** Get pillar Firestore IDs for an assessment category */
export function getPillarIdsForCategory(categorySlug: string): string[] {
  const slugs = getPillarsForCategory(categorySlug);
  return slugs.map((slug) => PILLAR_IDS[slug]).filter(Boolean);
}

/** Get which assessment categories relate to a pillar */
export function getCategoriesForPillar(pillarSlug: PillarSlug): string[] {
  return Object.entries(CATEGORY_PILLAR_MAP)
    .filter(([, pillars]) => pillars.includes(pillarSlug))
    .map(([category]) => category);
}

export interface PillarRecommendation {
  pillarSlug: PillarSlug;
  pillarId: string;
  priority: 'high' | 'medium' | 'low';
  reasons: string[];
}

/**
 * Aggregate gap analysis into pillar-level recommendations.
 * Multiple gaps may map to the same pillar — we take the highest priority.
 */
export function getRecommendedPillarsFromGaps(gaps: GapAnalysis[]): PillarRecommendation[] {
  const pillarMap = new Map<PillarSlug, { priority: 'high' | 'medium' | 'low'; reasons: string[] }>();

  const priorityRank = { high: 3, medium: 2, low: 1 };

  for (const gap of gaps) {
    const pillars = getPillarsForCategory(gap.categorySlug);
    for (const pillar of pillars) {
      const existing = pillarMap.get(pillar);
      const reason = `${gap.categoryName} gap (${gap.priority} priority, score: ${gap.score.toFixed(1)})`;

      if (existing) {
        existing.reasons.push(reason);
        if (priorityRank[gap.priority] > priorityRank[existing.priority]) {
          existing.priority = gap.priority;
        }
      } else {
        pillarMap.set(pillar, { priority: gap.priority, reasons: [reason] });
      }
    }
  }

  // Sort by priority (high first)
  return Array.from(pillarMap.entries())
    .map(([slug, data]) => ({
      pillarSlug: slug,
      pillarId: PILLAR_IDS[slug],
      priority: data.priority,
      reasons: data.reasons,
    }))
    .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
}
