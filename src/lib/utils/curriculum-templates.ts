/**
 * Predefined curriculum templates matched to common student profiles.
 * Coaches can pick a template to jumpstart curriculum creation.
 */

import type { PillarSlug, PacingLevel } from '@/types/onboarding';
import { PILLAR_IDS } from './pillars';

export interface CurriculumTemplateItem {
  suggestedTitle: string;
  pillarSlug: PillarSlug;
  pillarId: string;
  type: 'lesson' | 'quiz';
  rationale: string;
}

export interface CurriculumTemplate {
  id: string;
  name: string;
  description: string;
  applicableWhen: {
    pacingLevel?: PacingLevel[];
    hasGapsIn?: string[];
  };
  items: CurriculumTemplateItem[];
}

export const CURRICULUM_TEMPLATES: CurriculumTemplate[] = [
  {
    id: 'mindset-foundation',
    name: 'Mindset Foundation',
    description: 'For goalies struggling with the mental game — anxiety, confidence, and resilience.',
    applicableWhen: {
      hasGapsIn: ['feelings', 'pre_game', 'post_game'],
    },
    items: [
      { suggestedTitle: 'Understanding the Goalie Mind', pillarSlug: 'mindset', pillarId: PILLAR_IDS.mindset, type: 'lesson', rationale: 'Addresses feelings gap — builds mental awareness' },
      { suggestedTitle: 'Dealing with Goals Against', pillarSlug: 'mindset', pillarId: PILLAR_IDS.mindset, type: 'lesson', rationale: 'Addresses post-game gap — resilience after setbacks' },
      { suggestedTitle: 'Pre-Game Mental Preparation', pillarSlug: 'mindset', pillarId: PILLAR_IDS.mindset, type: 'lesson', rationale: 'Addresses pre-game gap — routine building' },
      { suggestedTitle: 'Sleep & Recovery Basics', pillarSlug: 'lifestyle', pillarId: PILLAR_IDS.lifestyle, type: 'lesson', rationale: 'Supports mental health with proper recovery' },
    ],
  },
  {
    id: 'in-game-awareness',
    name: 'In-Game Awareness',
    description: 'For goalies who need help with positioning, reads, and in-game decisions.',
    applicableWhen: {
      hasGapsIn: ['in_game', 'knowledge'],
    },
    items: [
      { suggestedTitle: 'Understanding Angles', pillarSlug: 'positioning', pillarId: PILLAR_IDS.positioning, type: 'lesson', rationale: 'Addresses knowledge gap — fundamental positioning' },
      { suggestedTitle: 'Squaring to the Puck', pillarSlug: 'positioning', pillarId: PILLAR_IDS.positioning, type: 'lesson', rationale: 'Addresses in-game gap — puck tracking' },
      { suggestedTitle: 'Basic Goalie Stance', pillarSlug: 'form', pillarId: PILLAR_IDS.form, type: 'lesson', rationale: 'Addresses knowledge gap — proper form' },
      { suggestedTitle: 'Butterfly Basics', pillarSlug: 'form', pillarId: PILLAR_IDS.form, type: 'lesson', rationale: 'Addresses in-game gap — save execution' },
      { suggestedTitle: 'Basic Lateral Movement', pillarSlug: 'skating', pillarId: PILLAR_IDS.skating, type: 'lesson', rationale: 'Addresses in-game gap — crease movement' },
    ],
  },
  {
    id: 'complete-introduction',
    name: 'Complete Introduction',
    description: 'A well-rounded starter curriculum for introduction-level goalies.',
    applicableWhen: {
      pacingLevel: ['introduction'],
    },
    items: [
      { suggestedTitle: 'Understanding the Goalie Mind', pillarSlug: 'mindset', pillarId: PILLAR_IDS.mindset, type: 'lesson', rationale: 'Mental foundation for all goalies' },
      { suggestedTitle: 'Goalie Stance & Balance', pillarSlug: 'skating', pillarId: PILLAR_IDS.skating, type: 'lesson', rationale: 'Movement foundation' },
      { suggestedTitle: 'Basic Goalie Stance', pillarSlug: 'form', pillarId: PILLAR_IDS.form, type: 'lesson', rationale: 'Physical foundation' },
      { suggestedTitle: 'Understanding Angles', pillarSlug: 'positioning', pillarId: PILLAR_IDS.positioning, type: 'lesson', rationale: 'Positional foundation' },
      { suggestedTitle: 'Post Integration Basics', pillarSlug: 'seven_point', pillarId: PILLAR_IDS.seven_point, type: 'lesson', rationale: 'Below-the-line awareness' },
      { suggestedTitle: 'Practice with Purpose', pillarSlug: 'practice', pillarId: PILLAR_IDS.practice, type: 'lesson', rationale: 'Training habits' },
      { suggestedTitle: 'Sleep & Recovery Basics', pillarSlug: 'lifestyle', pillarId: PILLAR_IDS.lifestyle, type: 'lesson', rationale: 'Lifestyle foundation' },
    ],
  },
  {
    id: 'refinement-polish',
    name: 'Refinement Polish',
    description: 'For advanced goalies needing to address specific weak spots.',
    applicableWhen: {
      pacingLevel: ['refinement'],
    },
    items: [
      { suggestedTitle: 'Advanced Visualization & Imagery', pillarSlug: 'mindset', pillarId: PILLAR_IDS.mindset, type: 'lesson', rationale: 'Elite mental techniques' },
      { suggestedTitle: 'Reading the Play & Anticipatory Movement', pillarSlug: 'skating', pillarId: PILLAR_IDS.skating, type: 'lesson', rationale: 'Elite-level reads' },
      { suggestedTitle: 'Save Selection & Decision Making', pillarSlug: 'form', pillarId: PILLAR_IDS.form, type: 'lesson', rationale: 'Situational save choice' },
      { suggestedTitle: 'Odd-Man Rush Positioning', pillarSlug: 'positioning', pillarId: PILLAR_IDS.positioning, type: 'lesson', rationale: 'High-pressure positioning' },
      { suggestedTitle: 'Video Analysis & Self-Scouting', pillarSlug: 'game', pillarId: PILLAR_IDS.game, type: 'lesson', rationale: 'Self-improvement through film' },
    ],
  },
  {
    id: 'training-habits',
    name: 'Training & Lifestyle',
    description: 'For goalies with gaps in training habits, practice quality, or off-ice lifestyle.',
    applicableWhen: {
      hasGapsIn: ['training', 'learning'],
    },
    items: [
      { suggestedTitle: 'Practice with Purpose', pillarSlug: 'practice', pillarId: PILLAR_IDS.practice, type: 'lesson', rationale: 'Addresses training gap — intentional practice' },
      { suggestedTitle: 'Game Day Routine', pillarSlug: 'game', pillarId: PILLAR_IDS.game, type: 'lesson', rationale: 'Addresses training gap — consistency' },
      { suggestedTitle: 'Introduction to Charting', pillarSlug: 'game', pillarId: PILLAR_IDS.game, type: 'lesson', rationale: 'Addresses learning gap — self-tracking' },
      { suggestedTitle: 'Nutrition for Goalies', pillarSlug: 'lifestyle', pillarId: PILLAR_IDS.lifestyle, type: 'lesson', rationale: 'Supports training with proper fueling' },
      { suggestedTitle: 'Balancing Hockey & Life', pillarSlug: 'lifestyle', pillarId: PILLAR_IDS.lifestyle, type: 'lesson', rationale: 'Prevents burnout' },
    ],
  },
];

/**
 * Get templates that match a student's profile
 */
export function getApplicableTemplates(
  pacingLevel?: PacingLevel,
  gapCategorySlugs?: string[]
): CurriculumTemplate[] {
  return CURRICULUM_TEMPLATES.filter((t) => {
    // Check pacing level match
    if (t.applicableWhen.pacingLevel) {
      if (pacingLevel && t.applicableWhen.pacingLevel.includes(pacingLevel)) return true;
    }
    // Check gap match
    if (t.applicableWhen.hasGapsIn && gapCategorySlugs) {
      const hasMatchingGap = t.applicableWhen.hasGapsIn.some((g) => gapCategorySlugs.includes(g));
      if (hasMatchingGap) return true;
    }
    // If no conditions, it's always applicable
    if (!t.applicableWhen.pacingLevel && !t.applicableWhen.hasGapsIn) return true;
    return false;
  });
}
