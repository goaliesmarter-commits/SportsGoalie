import { FormTemplate } from '@/types';

/**
 * Default Hockey Goalie Performance Tracking Template
 * This template mirrors the existing hardcoded form structure
 * and can be used as a starting point for the dynamic form system
 */
export const createDefaultHockeyGoalieTemplate = (createdBy: string): Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: 'Hockey Goalie Performance Tracker',
  description: 'Comprehensive performance tracking for hockey goalies including pre-game preparation, in-game performance, and post-game review.',
  sport: 'Hockey',
  pillar: 'combined',
  version: 1,
  isActive: true,
  isArchived: false,
  usageCount: 0,
  allowPartialSubmission: true,
  sections: [
    // ==================== PRE-GAME SECTION ====================
    {
      id: 'pre_game',
      title: 'Pre-Game',
      description: 'Track your preparation before the game',
      order: 1,
      fields: [
        // Game Readiness
        {
          id: 'well_rested',
          label: 'Well Rested',
          type: 'yesno',
          description: 'Did you get adequate rest before the game?',
          includeComments: true,
          validation: { required: true },
          analytics: {
            enabled: true,
            type: 'percentage',
            category: 'Game Readiness',
            displayName: 'Well Rested %',
            targetValue: 80,
          },
          order: 1,
        },
        {
          id: 'fueled_for_game',
          label: 'Properly Fueled',
          type: 'yesno',
          description: 'Did you eat and hydrate appropriately?',
          includeComments: true,
          validation: { required: true },
          analytics: {
            enabled: true,
            type: 'percentage',
            category: 'Game Readiness',
            displayName: 'Properly Fueled %',
            targetValue: 80,
          },
          order: 2,
        },
        // MindSet
        {
          id: 'mind_cleared',
          label: 'Mind Cleared',
          type: 'yesno',
          description: 'Is your mind clear and focused?',
          includeComments: true,
          validation: { required: true },
          analytics: {
            enabled: true,
            type: 'percentage',
            category: 'Mental Preparation',
            displayName: 'Mind Cleared %',
            targetValue: 80,
          },
          order: 3,
        },
        {
          id: 'mental_imagery',
          label: 'Mental Imagery',
          type: 'yesno',
          description: 'Did you perform mental imagery exercises?',
          includeComments: true,
          validation: { required: true },
          analytics: {
            enabled: true,
            type: 'percentage',
            category: 'Mental Preparation',
            displayName: 'Mental Imagery %',
            targetValue: 80,
          },
          order: 4,
        },
        // Pre-Game Routine
        {
          id: 'ball_exercises',
          label: 'Ball Exercises',
          type: 'yesno',
          description: 'Did you complete ball handling exercises?',
          includeComments: true,
          validation: { required: true },
          analytics: {
            enabled: true,
            type: 'percentage',
            category: 'Pre-Game Routine',
            displayName: 'Ball Exercises %',
            targetValue: 80,
          },
          order: 5,
        },
        {
          id: 'stretching',
          label: 'Stretching',
          type: 'yesno',
          description: 'Did you complete stretching routine?',
          includeComments: true,
          validation: { required: true },
          analytics: {
            enabled: true,
            type: 'percentage',
            category: 'Pre-Game Routine',
            displayName: 'Stretching %',
            targetValue: 80,
          },
          order: 6,
        },
        {
          id: 'other_prep',
          label: 'Other Preparation',
          type: 'yesno',
          description: 'Did you complete other preparation activities?',
          includeComments: true,
          validation: { required: false },
          analytics: {
            enabled: false,
            type: 'none',
          },
          order: 7,
        },
        // Warm Up
        {
          id: 'looked_engaged',
          label: 'Looked Engaged',
          type: 'yesno',
          description: 'Were you engaged during warm-up?',
          includeComments: true,
          validation: { required: true },
          analytics: {
            enabled: true,
            type: 'percentage',
            category: 'Warm Up',
            displayName: 'Engagement %',
            targetValue: 80,
          },
          order: 8,
        },
        {
          id: 'lacked_focus',
          label: 'Lacked Focus',
          type: 'yesno',
          description: 'Did you lack focus during warm-up?',
          includeComments: true,
          validation: { required: false },
          analytics: {
            enabled: true,
            type: 'percentage',
            category: 'Warm Up',
            displayName: 'Focus Issues %',
            higherIsBetter: false,
          },
          order: 9,
        },
        {
          id: 'team_warmup_needs_adjustment',
          label: 'Team Warm-Up Needs Adjustment',
          type: 'yesno',
          description: 'Does the team warm-up routine need changes?',
          includeComments: true,
          validation: { required: false },
          analytics: {
            enabled: false,
            type: 'none',
          },
          order: 10,
        },
      ],
    },

    // ==================== GAME OVERVIEW SECTION ====================
    {
      id: 'game_overview',
      title: 'Game Overview',
      description: 'Track goals and challenge level by period',
      order: 2,
      fields: [
        // Period 1 Goals
        {
          id: 'good_goals_p1',
          label: 'Good Goals - Period 1',
          type: 'numeric',
          description: 'Number of well-executed goals scored against you',
          includeComments: false,
          validation: { required: true, min: 0, max: 20 },
          analytics: {
            enabled: true,
            type: 'sum',
            category: 'Goals Against',
            displayName: 'Total Good Goals',
          },
          order: 1,
        },
        {
          id: 'bad_goals_p1',
          label: 'Bad Goals - Period 1',
          type: 'numeric',
          description: 'Number of preventable goals',
          includeComments: false,
          validation: { required: true, min: 0, max: 20 },
          analytics: {
            enabled: true,
            type: 'sum',
            category: 'Goals Against',
            displayName: 'Total Bad Goals',
            higherIsBetter: false,
          },
          order: 2,
        },
        {
          id: 'challenge_p1',
          label: 'Degree of Challenge - Period 1',
          type: 'scale',
          description: 'How challenging was this period? (1=Easy, 10=Very Difficult)',
          includeComments: false,
          validation: { required: true, min: 1, max: 10 },
          analytics: {
            enabled: true,
            type: 'average',
            category: 'Challenge Level',
            displayName: 'Avg Challenge P1',
          },
          order: 3,
        },
        // Period 2 Goals
        {
          id: 'good_goals_p2',
          label: 'Good Goals - Period 2',
          type: 'numeric',
          includeComments: false,
          validation: { required: true, min: 0, max: 20 },
          analytics: {
            enabled: true,
            type: 'sum',
            category: 'Goals Against',
          },
          order: 4,
        },
        {
          id: 'bad_goals_p2',
          label: 'Bad Goals - Period 2',
          type: 'numeric',
          includeComments: false,
          validation: { required: true, min: 0, max: 20 },
          analytics: {
            enabled: true,
            type: 'sum',
            category: 'Goals Against',
            higherIsBetter: false,
          },
          order: 5,
        },
        {
          id: 'challenge_p2',
          label: 'Degree of Challenge - Period 2',
          type: 'scale',
          includeComments: false,
          validation: { required: true, min: 1, max: 10 },
          analytics: {
            enabled: true,
            type: 'average',
            category: 'Challenge Level',
            displayName: 'Avg Challenge P2',
          },
          order: 6,
        },
        // Period 3 Goals
        {
          id: 'good_goals_p3',
          label: 'Good Goals - Period 3',
          type: 'numeric',
          includeComments: false,
          validation: { required: true, min: 0, max: 20 },
          analytics: {
            enabled: true,
            type: 'sum',
            category: 'Goals Against',
          },
          order: 7,
        },
        {
          id: 'bad_goals_p3',
          label: 'Bad Goals - Period 3',
          type: 'numeric',
          includeComments: false,
          validation: { required: true, min: 0, max: 20 },
          analytics: {
            enabled: true,
            type: 'sum',
            category: 'Goals Against',
            higherIsBetter: false,
          },
          order: 8,
        },
        {
          id: 'challenge_p3',
          label: 'Degree of Challenge - Period 3',
          type: 'scale',
          includeComments: false,
          validation: { required: true, min: 1, max: 10 },
          analytics: {
            enabled: true,
            type: 'average',
            category: 'Challenge Level',
            displayName: 'Avg Challenge P3',
          },
          order: 9,
        },
      ],
    },

    // ==================== PERIOD 1 SECTION ====================
    {
      id: 'period_1',
      title: 'Period 1 Performance',
      description: 'Detailed performance tracking for Period 1',
      order: 3,
      fields: createPeriodFields('p1', 1),
    },

    // ==================== PERIOD 2 SECTION ====================
    {
      id: 'period_2',
      title: 'Period 2 Performance',
      description: 'Detailed performance tracking for Period 2',
      order: 4,
      fields: createPeriodFields('p2', 2),
    },

    // ==================== PERIOD 3 SECTION ====================
    {
      id: 'period_3',
      title: 'Period 3 Performance',
      description: 'Detailed performance tracking for Period 3',
      order: 5,
      fields: [
        ...createPeriodFields('p3', 3),
        // Team Play (only in Period 3)
        {
          id: 'team_play_defense_p3',
          label: 'Team Play - Setting Up Defense',
          type: 'radio',
          description: 'How well did you set up the defense?',
          options: ['poor', 'improving', 'good'],
          includeComments: true,
          validation: { required: false },
          analytics: {
            enabled: true,
            type: 'distribution',
            category: 'Team Play',
            displayName: 'Defense Setup',
          },
          order: 100,
        },
        {
          id: 'team_play_forwards_p3',
          label: 'Team Play - Setting Up Forwards',
          type: 'radio',
          description: 'How well did you set up the forwards?',
          options: ['poor', 'improving', 'good'],
          includeComments: true,
          validation: { required: false },
          analytics: {
            enabled: true,
            type: 'distribution',
            category: 'Team Play',
            displayName: 'Forwards Setup',
          },
          order: 101,
        },
      ],
    },

    // ==================== OVERTIME SECTION (OPTIONAL) ====================
    {
      id: 'overtime',
      title: 'Overtime',
      description: 'Performance during overtime (if applicable)',
      order: 6,
      fields: [
        {
          id: 'ot_focus',
          label: 'Focus Quality',
          type: 'radio',
          options: ['poor', 'needs_work', 'good'],
          includeComments: true,
          validation: { required: false },
          analytics: {
            enabled: true,
            type: 'distribution',
            category: 'Overtime Performance',
          },
          order: 1,
        },
        {
          id: 'ot_decision_making',
          label: 'Decision Making',
          type: 'radio',
          options: ['needs_work', 'improving', 'strong'],
          includeComments: true,
          validation: { required: false },
          analytics: {
            enabled: true,
            type: 'distribution',
            category: 'Overtime Performance',
          },
          order: 2,
        },
        {
          id: 'ot_skating',
          label: 'Skating Performance',
          type: 'radio',
          options: ['poor', 'needs_work', 'good'],
          includeComments: true,
          validation: { required: false },
          analytics: {
            enabled: true,
            type: 'distribution',
            category: 'Overtime Performance',
          },
          order: 3,
        },
      ],
    },

    // ==================== SHOOTOUT SECTION (OPTIONAL) ====================
    {
      id: 'shootout',
      title: 'Shootout',
      description: 'Shootout performance (if applicable)',
      order: 7,
      fields: [
        {
          id: 'shootout_result',
          label: 'Result',
          type: 'radio',
          options: ['won', 'lost'],
          includeComments: false,
          validation: { required: false },
          analytics: {
            enabled: true,
            type: 'distribution',
            category: 'Shootout',
          },
          order: 1,
        },
        {
          id: 'shootout_shots_saved',
          label: 'Shots Saved',
          type: 'numeric',
          description: 'Number of shots saved (0-10)',
          includeComments: false,
          validation: { required: false, min: 0, max: 10 },
          analytics: {
            enabled: true,
            type: 'sum',
            category: 'Shootout',
          },
          order: 2,
        },
        {
          id: 'shootout_shots_scored',
          label: 'Goals Against',
          type: 'numeric',
          description: 'Number of goals scored against (0-10)',
          includeComments: false,
          validation: { required: false, min: 0, max: 10 },
          analytics: {
            enabled: true,
            type: 'sum',
            category: 'Shootout',
            higherIsBetter: false,
          },
          order: 3,
        },
        {
          id: 'shootout_comments',
          label: 'Shootout Notes',
          type: 'textarea',
          includeComments: false,
          validation: { required: false, maxLength: 500 },
          analytics: {
            enabled: false,
            type: 'none',
          },
          order: 4,
        },
      ],
    },

    // ==================== POST-GAME SECTION ====================
    {
      id: 'post_game',
      title: 'Post-Game',
      description: 'Post-game review and reflection',
      order: 8,
      fields: [
        {
          id: 'review_completed',
          label: 'Review Completed',
          type: 'yesno',
          description: 'Did you complete a post-game review?',
          includeComments: true,
          validation: { required: true },
          analytics: {
            enabled: true,
            type: 'percentage',
            category: 'Post-Game',
            displayName: 'Review Completion %',
            targetValue: 90,
          },
          order: 1,
        },
        {
          id: 'additional_comments',
          label: 'Additional Comments',
          type: 'textarea',
          description: 'Any additional notes about the game',
          includeComments: false,
          validation: { required: false, maxLength: 1000 },
          analytics: {
            enabled: false,
            type: 'none',
          },
          order: 2,
        },
      ],
    },
  ],
  createdBy,
});

/**
 * Helper function to create period-specific fields
 * Reduces code duplication for the 3 periods
 */
function createPeriodFields(periodId: string, periodNum: number) {
  return [
    // MindSet
    {
      id: `focus_consistent_${periodId}`,
      label: 'Focus - Consistent',
      type: 'yesno' as const,
      description: 'Was your focus consistent throughout this period?',
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'percentage' as const,
        category: `Period ${periodNum} MindSet`,
        displayName: 'Focus Consistency %',
        targetValue: 75,
      },
      order: 1,
    },
    {
      id: `decision_making_${periodId}`,
      label: 'Decision Making',
      type: 'radio' as const,
      options: ['needs_work', 'improving', 'strong'],
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'distribution' as const,
        category: `Period ${periodNum} MindSet`,
      },
      order: 2,
    },
    {
      id: `body_language_${periodId}`,
      label: 'Body Language',
      type: 'radio' as const,
      options: ['inconsistent', 'consistent'],
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'distribution' as const,
        category: `Period ${periodNum} MindSet`,
      },
      order: 3,
    },
    // Skating
    {
      id: `skating_${periodId}`,
      label: 'Skating Performance',
      type: 'radio' as const,
      options: ['not_in_sync', 'weak', 'improving', 'in_sync'],
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'distribution' as const,
        category: `Period ${periodNum} Skating`,
      },
      order: 4,
    },
    // Positional
    {
      id: `positional_above_${periodId}`,
      label: 'Positional - Above Icing Line',
      type: 'radio' as const,
      options: ['poor', 'improving', 'good'],
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'distribution' as const,
        category: `Period ${periodNum} Positional`,
      },
      order: 5,
    },
    {
      id: `positional_below_${periodId}`,
      label: 'Positional - Below Icing Line',
      type: 'radio' as const,
      options: ['poor', 'improving', 'good', 'strong'],
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'distribution' as const,
        category: `Period ${periodNum} Positional`,
      },
      order: 6,
    },
    // Rebound Control
    {
      id: `rebound_quality_${periodId}`,
      label: 'Rebound Control - Quality',
      type: 'radio' as const,
      options: ['poor', 'improving', 'good'],
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'distribution' as const,
        category: `Period ${periodNum} Rebound Control`,
      },
      order: 7,
    },
    {
      id: `rebound_consistency_${periodId}`,
      label: 'Rebound Control - Consistency',
      type: 'radio' as const,
      options: ['inconsistent', 'consistent'],
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'distribution' as const,
        category: `Period ${periodNum} Rebound Control`,
      },
      order: 8,
    },
    // Freezing Puck
    {
      id: `freezing_quality_${periodId}`,
      label: 'Freezing Puck - Quality',
      type: 'radio' as const,
      options: ['poor', 'improving', 'good'],
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'distribution' as const,
        category: `Period ${periodNum} Puck Control`,
      },
      order: 9,
    },
    {
      id: `freezing_consistency_${periodId}`,
      label: 'Freezing Puck - Consistency',
      type: 'radio' as const,
      options: ['inconsistent', 'consistent'],
      includeComments: true,
      validation: { required: true },
      analytics: {
        enabled: true,
        type: 'distribution' as const,
        category: `Period ${periodNum} Puck Control`,
      },
      order: 10,
    },
  ];
}
