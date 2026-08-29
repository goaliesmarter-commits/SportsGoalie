/**
 * Pillar Utilities
 *
 * Utilities for working with the 8 Ice Hockey Goalie pillars.
 * These replace the generic "sports" concept with a fixed pillar structure.
 */

import { PillarSlug, StoredPillarSlug, PILLARS, PillarInfo, resolvePillarSlug } from '@/types/onboarding';

/**
 * Fixed pillar document IDs in Firestore
 */
export const PILLAR_IDS = {
  mindset: 'pillar_mindset',
  skating: 'pillar_skating',
  positioning: 'pillar_positioning',
  seven_point: 'pillar_seven_point',
  form: 'pillar_form',
  game: 'pillar_game',
  practice: 'pillar_practice',
  lifestyle: 'pillar_lifestyle',
} as const;

/**
 * The document ID of the retired combined Game/Practice/Off-Ice pillar.
 * Skills still filed under it are moved by scripts/split-training-pillar.ts.
 */
export const LEGACY_TRAINING_PILLAR_ID = 'pillar_training';

export type PillarId = typeof PILLAR_IDS[keyof typeof PILLAR_IDS];

/**
 * Map pillar color names to Tailwind CSS class combinations
 */
export const PILLAR_COLOR_CLASSES: Record<string, {
  bg: string;
  bgLight: string;
  text: string;
  border: string;
  gradient: string;
}> = {
  purple: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    gradient: 'from-purple-500 to-purple-700',
  },
  blue: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    gradient: 'from-blue-500 to-blue-700',
  },
  green: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    gradient: 'from-green-500 to-green-700',
  },
  orange: {
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    gradient: 'from-orange-500 to-orange-700',
  },
  red: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    gradient: 'from-red-500 to-red-700',
  },
  cyan: {
    bg: 'bg-cyan-500',
    bgLight: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
    gradient: 'from-cyan-500 to-cyan-700',
  },
  teal: {
    bg: 'bg-teal-500',
    bgLight: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800',
    gradient: 'from-teal-500 to-teal-700',
  },
  pink: {
    bg: 'bg-pink-500',
    bgLight: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-800',
    gradient: 'from-pink-500 to-pink-700',
  },
};

/**
 * Get the fixed Firestore document ID for a pillar slug.
 * Retired slugs resolve to the pillar that replaced them.
 */
export function getPillarDocId(slug: StoredPillarSlug): PillarId {
  const resolved = resolvePillarSlug(slug);
  if (!resolved) throw new Error(`Unknown pillar slug: ${slug}`);
  return PILLAR_IDS[resolved];
}

/**
 * Get the app URL for a pillar slug
 * Used by charting pages to navigate from low-score badges → Pillar content
 */
export function getPillarUrl(slug: StoredPillarSlug): string {
  return `/pillars/${getPillarDocId(slug)}`;
}

/**
 * Get pillar info by Firestore document ID
 */
export function getPillarByDocId(docId: string): PillarInfo | null {
  const slug = getPillarSlugFromDocId(docId);
  if (!slug) return null;
  return PILLARS.find(p => p.slug === slug) || null;
}

/**
 * Get pillar slug from document ID.
 * Documents still filed under the retired combined training pillar resolve to Practice.
 *
 * This is the forgiving lookup: use it when a stray reference just needs somewhere
 * sensible to land. When a document is being *identified* — a title, a number, an
 * edit form — use `getExactPillarSlug` instead, or `pillar_training` will wear the
 * name and number of the pillar that replaced it.
 */
export function getPillarSlugFromDocId(docId: string): PillarSlug | null {
  if (docId === LEGACY_TRAINING_PILLAR_ID) return resolvePillarSlug('training');
  return getExactPillarSlug(docId);
}

/**
 * The pillar slug for a document ID, matched exactly.
 *
 * Returns null for anything that is not one of the eight — including the retired
 * `pillar_training`, which is the whole point of having this alongside the
 * resolving version above.
 */
export function getExactPillarSlug(docId: string): PillarSlug | null {
  const entry = Object.entries(PILLAR_IDS).find(([, id]) => id === docId);
  return entry ? entry[0] as PillarSlug : null;
}

/**
 * The name to print for a `sports` document.
 *
 * Pillar names are identity, not data: they are printed across the marketing site
 * and spoken in Coach Mike's audio, and Michael has revised them twice by telling
 * us rather than by opening the admin form. So the code list wins and the stored
 * `name` is only a fallback — otherwise every screen shows whatever string the
 * seeds left in Firestore, and the eight pillars drift apart from the dropdowns.
 *
 * This is not hypothetical tidiness. As of 22 August the live database has the
 * names of pillars 3, 4 and 5 rotated by one against the document IDs — the
 * lessons under each are correct, the stored labels are not — so the code list is
 * currently the only thing printing them right.
 */
export function pillarDisplayName(docId: string, storedName: string): string {
  const slug = getExactPillarSlug(docId);
  if (!slug) return storedName;
  return PILLARS.find(p => p.slug === slug)?.name ?? storedName;
}

/**
 * The name to print for a `sports` document that has already been fetched.
 *
 * Same rule as `pillarDisplayName` — this is the shape the analytics services hold,
 * where a sport is a whole document or a lookup that came back empty, not an
 * id/name pair. They were printing `sport.name` straight from Firestore, which is
 * why pillars 3, 4 and 5 came out wearing each other's names on /admin/analytics
 * and /progress long after every dropdown had been corrected.
 *
 * `fallback` is returned when the lookup found nothing, so the caller does not have
 * to repeat `|| 'Unknown Sport'` and accidentally skip the resolution step.
 */
export function sportDisplayName(
  sport: { id?: string; name?: string } | null | undefined,
  fallback = 'Unknown Sport'
): string {
  if (!sport?.name) return fallback;
  return sport.id ? pillarDisplayName(sport.id, sport.name) : sport.name;
}

/**
 * Check if a document ID is a valid pillar ID
 */
export function isPillarDocId(id: string): id is PillarId {
  return Object.values(PILLAR_IDS).includes(id as PillarId);
}

/**
 * Get color classes for a pillar
 */
export function getPillarColorClasses(colorName: string) {
  return PILLAR_COLOR_CLASSES[colorName] || PILLAR_COLOR_CLASSES.blue;
}

/**
 * Get all pillar IDs as an array
 */
export function getAllPillarIds(): PillarId[] {
  return Object.values(PILLAR_IDS);
}

/**
 * Get all pillars with their document IDs
 */
export function getAllPillarsWithIds(): Array<PillarInfo & { docId: PillarId }> {
  return PILLARS.map(pillar => ({
    ...pillar,
    docId: PILLAR_IDS[pillar.slug],
  }));
}

// Re-export PILLARS for convenience
export { PILLARS };
