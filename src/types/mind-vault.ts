import { Timestamp } from 'firebase/firestore';

// ─── Mind Vault Categories ───────────────────────────────────────────

export type MindVaultCategory =
  | 'acceptance'
  | 'cannot_accept'
  | 'past_challenges'
  | 'what_has_worked'
  | 'personal_mantras'
  | 'self_coaching'
  | 'curriculum_anchors'
  | 'hockey_challenges'
  | 'lifestyle_challenges';

export type AcceptanceSubCategory =
  | 'game'
  | 'practice'
  | 'coaching'
  | 'teammate'
  | 'personal_mental'
  | 'lifestyle';

export type CannotAcceptSubCategory =
  | 'mental_surrender'
  | 'identity_threats'
  | 'focus_killers'
  | 'growth_blockers';

// ─── Mind Vault Entry ────────────────────────────────────────────────

export interface MindVaultEntry {
  id: string;
  studentId: string;
  category: MindVaultCategory;
  subcategory?: AcceptanceSubCategory | CannotAcceptSubCategory | string;
  content: string;
  isVoiceEntry: boolean;
  sessionId?: string;
  source: 'manual' | 'pre_game' | 'post_game' | 'practice';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateMindVaultEntryData {
  studentId: string;
  category: MindVaultCategory;
  subcategory?: string;
  content: string;
  isVoiceEntry: boolean;
  sessionId?: string;
  source: 'manual' | 'pre_game' | 'post_game' | 'practice';
}

// ─── Category Metadata ───────────────────────────────────────────────

export interface MindVaultCategoryInfo {
  slug: MindVaultCategory;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
}

export const MIND_VAULT_CATEGORIES: MindVaultCategoryInfo[] = [
  {
    slug: 'acceptance',
    name: 'Acceptance List',
    shortName: 'Acceptance',
    description: 'What you have made peace with — your foundation of mental strength.',
    icon: 'Heart',
    color: 'emerald',
  },
  {
    slug: 'cannot_accept',
    name: 'Cannot Accept List',
    shortName: 'Cannot Accept',
    description: 'Your psychological firewall — what you consciously refuse to surrender to.',
    icon: 'ShieldAlert',
    color: 'red',
  },
  {
    slug: 'past_challenges',
    name: 'Past Challenges Overcome',
    shortName: 'Challenges',
    description: 'Your own proof of resilience — moments you got through.',
    icon: 'Mountain',
    color: 'amber',
  },
  {
    slug: 'what_has_worked',
    name: 'What Has Worked',
    shortName: 'What Works',
    description: 'Mental strategies, routines, and self-talk that have proven effective.',
    icon: 'Lightbulb',
    color: 'yellow',
  },
  {
    slug: 'personal_mantras',
    name: 'Personal Mantras',
    shortName: 'Mantras',
    description: 'Your own words in your own voice — the phrases that anchor you.',
    icon: 'Quote',
    color: 'purple',
  },
  {
    slug: 'self_coaching',
    name: 'Self-Coaching Tools',
    shortName: 'Self-Coaching',
    description: 'Specific techniques you use to reset, refocus, and recover.',
    icon: 'Wrench',
    color: 'blue',
  },
  {
    slug: 'curriculum_anchors',
    name: 'Curriculum Anchors',
    shortName: 'Anchors',
    description: 'Lessons that landed deeply and you keep close.',
    icon: 'Anchor',
    color: 'indigo',
  },
  {
    slug: 'hockey_challenges',
    name: 'Hockey Challenges',
    shortName: 'Hockey',
    description: 'Specific game situations you logged and resolved.',
    icon: 'Trophy',
    color: 'cyan',
  },
  {
    slug: 'lifestyle_challenges',
    name: 'Lifestyle Challenges',
    shortName: 'Lifestyle',
    description: 'Family, school, social, time management — how you navigated them.',
    icon: 'Users',
    color: 'pink',
  },
];

export function getMindVaultCategoryInfo(slug: MindVaultCategory): MindVaultCategoryInfo | undefined {
  return MIND_VAULT_CATEGORIES.find((c) => c.slug === slug);
}

// ─── Category Prompts ────────────────────────────────────────────────
//
// Tap-to-add suggestions, the same mechanic the Acceptance and Cannot Accept
// lists use — those two keep their own subcategorised sets below. Michael
// reported the suggestion button "missing" from the other categories; the
// button was never the problem, these lists have simply never had any
// suggestions written for them.
//
// Each entry needs to be Michael's wording, not ours, so they stay empty until
// he supplies them. A category with no prompts hides the section entirely
// rather than showing an empty one.
export const CATEGORY_PROMPTS: Partial<Record<MindVaultCategory, string[]>> = {
  past_challenges: [],
  what_has_worked: [],
  personal_mantras: [],
  self_coaching: [],
  curriculum_anchors: [],
  hockey_challenges: [],
  lifestyle_challenges: [],
};

export function getCategoryPrompts(slug: MindVaultCategory): string[] {
  return CATEGORY_PROMPTS[slug] ?? [];
}

// ─── Acceptance List Prompts ─────────────────────────────────────────

export interface AcceptancePrompt {
  id: string;
  subcategory: AcceptanceSubCategory | CannotAcceptSubCategory;
  text: string;
}

export interface AcceptanceSubCategoryInfo {
  slug: AcceptanceSubCategory;
  name: string;
  description: string;
}

export interface CannotAcceptSubCategoryInfo {
  slug: CannotAcceptSubCategory;
  name: string;
  description: string;
}

export const ACCEPTANCE_SUBCATEGORIES: AcceptanceSubCategoryInfo[] = [
  { slug: 'game', name: 'Game Challenges', description: 'Accepting the realities of competition' },
  { slug: 'practice', name: 'Practice Challenges', description: 'Accepting the nature of growth' },
  { slug: 'coaching', name: 'Coaching Challenges', description: 'Accepting coaching dynamics' },
  { slug: 'teammate', name: 'Teammate Challenges', description: 'Accepting what you cannot control' },
  { slug: 'personal_mental', name: 'Personal & Mental', description: 'Accepting your human side' },
  { slug: 'lifestyle', name: 'Lifestyle Challenges', description: 'Accepting the full picture' },
];

export const CANNOT_ACCEPT_SUBCATEGORIES: CannotAcceptSubCategoryInfo[] = [
  { slug: 'mental_surrender', name: 'Mental Surrender', description: 'Never giving up' },
  { slug: 'identity_threats', name: 'Identity Threats', description: 'Protecting your worth' },
  { slug: 'focus_killers', name: 'Focus Killers', description: 'Guarding your focus' },
  { slug: 'growth_blockers', name: 'Growth Blockers', description: 'Refusing complacency' },
];

export const ACCEPTANCE_PROMPTS: AcceptancePrompt[] = [
  // Game Challenges
  { id: 'a-game-1', subcategory: 'game', text: 'I accept that as a team we may lose games.' },
  { id: 'a-game-2', subcategory: 'game', text: 'I accept that I am the last line of defense.' },
  { id: 'a-game-3', subcategory: 'game', text: 'I accept that I will get scored on.' },
  { id: 'a-game-4', subcategory: 'game', text: 'I accept that some games will be harder than others.' },
  { id: 'a-game-5', subcategory: 'game', text: 'I accept that I cannot control every shot.' },
  { id: 'a-game-6', subcategory: 'game', text: 'I accept that some goals will be fluky and unfair.' },
  { id: 'a-game-7', subcategory: 'game', text: 'I accept that the score does not define my performance.' },
  // Practice Challenges
  { id: 'a-practice-1', subcategory: 'practice', text: 'I accept that some practice sessions will feel wrong.' },
  { id: 'a-practice-2', subcategory: 'practice', text: 'I accept that I will get scored on in practice.' },
  { id: 'a-practice-3', subcategory: 'practice', text: 'I accept that growth is not always visible in the moment.' },
  { id: 'a-practice-4', subcategory: 'practice', text: 'I accept that it is my responsibility to manage my time during practices.' },
  { id: 'a-practice-5', subcategory: 'practice', text: 'I accept that I will give every practice my best effort.' },
  // Coaching Challenges
  { id: 'a-coaching-1', subcategory: 'coaching', text: 'I accept that not every coach will fully understand my position.' },
  { id: 'a-coaching-2', subcategory: 'coaching', text: 'I accept that I will listen to my coaches and follow their guidance.' },
  { id: 'a-coaching-3', subcategory: 'coaching', text: 'I accept that I will communicate my point of view respectfully.' },
  { id: 'a-coaching-4', subcategory: 'coaching', text: 'I accept that I will deal with lack of support by focusing on what I can control.' },
  { id: 'a-coaching-5', subcategory: 'coaching', text: 'I accept that my development is ultimately my responsibility.' },
  // Teammate Challenges
  { id: 'a-teammate-1', subcategory: 'teammate', text: 'I accept that I cannot control what happens in front of me.' },
  { id: 'a-teammate-2', subcategory: 'teammate', text: 'I accept that I will encourage and support my teammates.' },
  { id: 'a-teammate-3', subcategory: 'teammate', text: 'I accept that I will not blame my team for weaknesses or lack of support.' },
  { id: 'a-teammate-4', subcategory: 'teammate', text: 'I accept that I will lead by example.' },
  { id: 'a-teammate-5', subcategory: 'teammate', text: 'I accept that I will motivate myself through self-coaching.' },
  // Personal & Mental
  { id: 'a-personal-1', subcategory: 'personal_mental', text: 'I accept that fear is a normal part of this position.' },
  { id: 'a-personal-2', subcategory: 'personal_mental', text: 'I accept that pressure is part of being a goaltender.' },
  { id: 'a-personal-3', subcategory: 'personal_mental', text: 'I accept that it is my responsibility to never quit.' },
  { id: 'a-personal-4', subcategory: 'personal_mental', text: 'I accept that I will always compete with my best effort.' },
  { id: 'a-personal-5', subcategory: 'personal_mental', text: 'I accept that some days my best will look different than other days.' },
  { id: 'a-personal-6', subcategory: 'personal_mental', text: 'I accept that I will motivate myself when no one else does.' },
  // Lifestyle Challenges
  { id: 'a-lifestyle-1', subcategory: 'lifestyle', text: 'I accept that balancing hockey, school, family, and personal life is challenging.' },
  { id: 'a-lifestyle-2', subcategory: 'lifestyle', text: 'I accept that rest and recovery are part of my preparation.' },
  { id: 'a-lifestyle-3', subcategory: 'lifestyle', text: 'I accept that what I do off the ice affects what I do on the ice.' },
  { id: 'a-lifestyle-4', subcategory: 'lifestyle', text: 'I accept that my lifestyle choices are within my control.' },
];

export const CANNOT_ACCEPT_PROMPTS: AcceptancePrompt[] = [
  // Mental Surrender
  { id: 'ca-surrender-1', subcategory: 'mental_surrender', text: 'I cannot accept giving up — on a play, on a period, on a game, on myself.' },
  { id: 'ca-surrender-2', subcategory: 'mental_surrender', text: 'I cannot accept letting my emotions control my performance.' },
  { id: 'ca-surrender-3', subcategory: 'mental_surrender', text: 'I cannot accept negative self-talk winning.' },
  { id: 'ca-surrender-4', subcategory: 'mental_surrender', text: 'I cannot accept fear making decisions instead of skill.' },
  { id: 'ca-surrender-5', subcategory: 'mental_surrender', text: 'I cannot accept anxiety controlling my body.' },
  { id: 'ca-surrender-6', subcategory: 'mental_surrender', text: 'I cannot accept doubt replacing preparation.' },
  // Identity Threats
  { id: 'ca-identity-1', subcategory: 'identity_threats', text: 'I cannot accept one bad goal defining my worth as a goaltender.' },
  { id: 'ca-identity-2', subcategory: 'identity_threats', text: 'I cannot accept one bad game defining my season.' },
  { id: 'ca-identity-3', subcategory: 'identity_threats', text: 'I cannot accept allowing mistakes to define who I am.' },
  { id: 'ca-identity-4', subcategory: 'identity_threats', text: 'I cannot accept comparing myself to other goaltenders.' },
  { id: 'ca-identity-5', subcategory: 'identity_threats', text: 'I cannot accept worrying about what others think of my performance.' },
  { id: 'ca-identity-6', subcategory: 'identity_threats', text: 'I cannot accept my value being determined by a win or a loss.' },
  // Focus Killers
  { id: 'ca-focus-1', subcategory: 'focus_killers', text: 'I cannot accept dwelling on goals scored against me.' },
  { id: 'ca-focus-2', subcategory: 'focus_killers', text: 'I cannot accept focusing on things outside my control.' },
  { id: 'ca-focus-3', subcategory: 'focus_killers', text: 'I cannot accept the bench affecting my next save.' },
  { id: 'ca-focus-4', subcategory: 'focus_killers', text: "I cannot accept a coach's frustration becoming my identity." },
  { id: 'ca-focus-5', subcategory: 'focus_killers', text: 'I cannot accept distraction winning over preparation.' },
  // Growth Blockers
  { id: 'ca-growth-1', subcategory: 'growth_blockers', text: 'I cannot accept being complacent with my current level of skill.' },
  { id: 'ca-growth-2', subcategory: 'growth_blockers', text: 'I cannot accept quitting when things get tough.' },
  { id: 'ca-growth-3', subcategory: 'growth_blockers', text: 'I cannot accept allowing injuries or setbacks to derail my progress permanently.' },
  { id: 'ca-growth-4', subcategory: 'growth_blockers', text: 'I cannot accept neglecting my mental and physical well-being.' },
  { id: 'ca-growth-5', subcategory: 'growth_blockers', text: 'I cannot accept the easy path when the right path is harder.' },
];

// ─── Category Summary (for dashboard) ────────────────────────────────

export interface MindVaultCategorySummary {
  category: MindVaultCategory;
  entryCount: number;
  lastUpdated: Timestamp | null;
}
