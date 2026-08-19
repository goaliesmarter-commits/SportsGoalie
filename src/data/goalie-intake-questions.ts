import { IntakeQuestion, GoalieAgeRange } from '@/types';

/**
 * Goalie Front Door Intake Questions
 * Based on Michael's Goalie Questionnaire Specification (02-goalie-questionnaire-spec.md)
 *
 * 4 screens, 7 questions total
 * All selection-based (no typing required)
 * Age-appropriate language speaks directly to the goalie
 */

export const GOALIE_INTAKE_QUESTIONS: IntakeQuestion[] = [
  // ===========================================
  // SCREEN 1: Tell us about you
  // ===========================================
  {
    id: 'goalie-intake-1',
    screenNumber: 1,
    questionCode: 'Q-IN-1',
    question: 'How old are you?',
    type: 'single_select',
    isRequired: true,
    order: 1,
    tooltip: 'This helps us show you content in a way that makes sense for your age.',
    options: [
      {
        id: 'age-8-10',
        text: '8-10 years old',
        triggersFlow: 'under_13_pipeda', // Requires parent consent
      },
      {
        id: 'age-11-13',
        text: '11-13 years old',
        triggersFlow: 'under_13_pipeda', // Requires parent consent for under 13
      },
      {
        id: 'age-14-16',
        text: '14-16 years old',
      },
      {
        id: 'age-17-18',
        text: '17-18 years old',
      },
    ],
  },
  {
    id: 'goalie-intake-2',
    screenNumber: 1,
    questionCode: 'Q-IN-2',
    question: 'How long have you been playing goalie?',
    type: 'single_select',
    isRequired: true,
    order: 2,
    options: [
      {
        id: 'exp-new',
        text: "I'm just starting — this is my first season or I haven't started yet",
        score: 1.0,
      },
      {
        id: 'exp-less-1',
        text: 'Less than 1 full season',
        score: 1.5,
      },
      {
        id: 'exp-1-3',
        text: '1-3 seasons',
        score: 2.5,
      },
      {
        id: 'exp-4-plus',
        text: '4+ seasons',
        score: 3.5,
      },
    ],
  },

  // ===========================================
  // SCREEN 2: Where are you playing?
  // ===========================================
  {
    id: 'goalie-intake-3',
    screenNumber: 2,
    questionCode: 'Q-IN-3',
    question: 'What level do you play at?',
    type: 'single_select',
    isRequired: true,
    order: 3,
    options: [
      {
        id: 'level-house',
        text: 'House league / recreational',
        score: 1.5,
      },
      {
        id: 'level-select',
        text: 'Select / competitive',
        score: 2.5,
      },
      {
        id: 'level-aa-aaa',
        text: 'AA / AAA',
        score: 3.0,
      },
      {
        id: 'level-elite',
        text: 'Elite / Junior / Pre-Junior',
        score: 3.5,
      },
    ],
  },
  {
    id: 'goalie-intake-4',
    screenNumber: 2,
    questionCode: 'Q-IN-4',
    question: 'Do you currently work with a goalie coach?',
    type: 'single_select',
    isRequired: true,
    order: 4,
    tooltip: 'A goalie coach is someone who works specifically with goalies on their position.',
    options: [
      {
        id: 'gc-yes-regular',
        text: 'Yes — I work with one regularly',
        score: 4.0,
      },
      {
        id: 'gc-yes-occasional',
        text: 'Yes — but only occasionally (camps, clinics)',
        score: 2.5,
      },
      {
        id: 'gc-no-never',
        text: "No — I've never worked with a goalie coach",
        score: 1.0,
      },
      {
        id: 'gc-no-used-to',
        text: 'No — but I used to',
        score: 2.0,
      },
    ],
  },

  // ===========================================
  // SCREEN 3: What brought you to Smarter Goalie today?
  // ===========================================
  {
    id: 'goalie-intake-5',
    screenNumber: 3,
    questionCode: 'Q-IN-5',
    // No "(Select all that apply)" in the question text — the screen already prints
    // that line above the options for every multi-select. Baseline questions never
    // carried it inline, so having it here made the same control look like two
    // different controls depending on which question you were on.
    question: 'What brought you to Smarter Goalie today?',
    type: 'multi_select',
    isRequired: true,
    order: 5,
    options: [
      {
        id: 'reason-get-better',
        text: "I want to get better — I just don't know where to start",
      },
      {
        id: 'reason-learn-right',
        text: 'I want to learn the right way to play the position',
      },
      {
        id: 'reason-struggling',
        text: "I'm struggling with my game and I want help",
      },
      {
        id: 'reason-structure',
        text: 'I want to train on my own but I need structure',
      },
      {
        id: 'reason-understand',
        text: "I want to understand what I'm doing right and what I need to work on",
      },
      {
        id: 'reason-referred',
        text: 'My parent or coach told me about Smarter Goalie',
      },
      {
        id: 'reason-next-level',
        text: 'I love being a goalie and I want to take it to the next level',
      },
      {
        id: 'reason-exploring',
        text: 'Just checking it out — want to see what this is about',
      },
    ],
  },

  // ===========================================
  // SCREEN 4: One more thing
  // ===========================================
  {
    id: 'goalie-intake-6',
    screenNumber: 4,
    questionCode: 'Q-IN-6',
    question: 'Do you currently do any training or skill work on your own outside of team practice?',
    type: 'single_select',
    isRequired: true,
    order: 6,
    options: [
      {
        id: 'training-structured',
        text: 'Yes — I follow a structured program or work with a goalie coach',
        score: 4.0,
      },
      {
        id: 'training-some',
        text: "Somewhat — I do some stuff on my own but I'm not sure if it's the right stuff",
        score: 2.5,
      },
      {
        id: 'training-none',
        text: 'No — I only work on my game during team practice and games',
        score: 1.5,
      },
      {
        id: 'training-unknown',
        text: "No — I wouldn't know what to work on by myself",
        score: 1.0,
      },
    ],
  },
  {
    id: 'goalie-intake-7',
    screenNumber: 4,
    questionCode: 'Q-IN-7',
    question: 'Did you know you can do meaningful goalie training on your own — no coach, no partner, no ice required?',
    type: 'single_select',
    isRequired: true,
    order: 7,
    tooltip: 'Smarter Goalie will show you how to train effectively on your own time.',
    options: [
      {
        id: 'aware-yes',
        text: 'Yes — I already do some independent training',
        score: 3.5,
      },
      {
        id: 'aware-heard',
        text: "I've heard of it but I don't know what to do",
        score: 2.0,
      },
      {
        id: 'aware-no',
        text: "No — I didn't know that was possible",
        score: 1.0,
      },
      {
        id: 'aware-interested',
        text: 'That sounds interesting — tell me more',
        score: 1.5,
      },
    ],
  },
];

/**
 * Get intake questions grouped by screen
 */
export function getIntakeQuestionsByScreen(): Map<number, IntakeQuestion[]> {
  const grouped = new Map<number, IntakeQuestion[]>();

  for (const question of GOALIE_INTAKE_QUESTIONS) {
    const existing = grouped.get(question.screenNumber) || [];
    existing.push(question);
    grouped.set(question.screenNumber, existing);
  }

  // Sort each screen's questions by order
  for (const [screen, questions] of grouped) {
    questions.sort((a, b) => a.order - b.order);
    grouped.set(screen, questions);
  }

  return grouped;
}

/**
 * Get total number of intake screens
 */
export function getTotalIntakeScreens(): number {
  const screens = new Set(GOALIE_INTAKE_QUESTIONS.map(q => q.screenNumber));
  return screens.size;
}

/**
 * Extract age range from intake response
 */
export function extractAgeRange(responses: Array<{ questionId: string; value: string }>): GoalieAgeRange | undefined {
  const ageResponse = responses.find(r => r.questionId === 'goalie-intake-1');
  if (!ageResponse) return undefined;

  const ageMapping: Record<string, GoalieAgeRange> = {
    'age-8-10': '8-10',
    'age-11-13': '11-13',
    'age-14-16': '14-16',
    'age-17-18': '17-18',
  };

  return ageMapping[ageResponse.value];
}

/**
 * Check if PIPEDA parental consent is required based on age
 */
export function requiresParentalConsent(ageOptionId: string): boolean {
  // Under 13 requires parental consent per PIPEDA
  return ageOptionId === 'age-8-10' || ageOptionId === 'age-11-13';
}

/**
 * Extract experience level from intake response
 */
export function extractExperienceLevel(responses: Array<{ questionId: string; value: string }>): string | undefined {
  const expResponse = responses.find(r => r.questionId === 'goalie-intake-2');
  if (!expResponse) return undefined;

  const expMapping: Record<string, string> = {
    'exp-new': 'new',
    'exp-less-1': 'less_than_1_season',
    'exp-1-3': '1_to_3_seasons',
    'exp-4-plus': '4_plus_seasons',
  };

  return expMapping[expResponse.value];
}

/**
 * Extract playing level from intake response
 */
export function extractPlayingLevel(responses: Array<{ questionId: string; value: string }>): string | undefined {
  const levelResponse = responses.find(r => r.questionId === 'goalie-intake-3');
  if (!levelResponse) return undefined;

  const levelMapping: Record<string, string> = {
    'level-house': 'house_league',
    'level-select': 'select',
    'level-aa-aaa': 'aa_aaa',
    'level-elite': 'elite',
  };

  return levelMapping[levelResponse.value];
}

/**
 * Extract goalie coach status from intake response
 */
export function extractGoalieCoachStatus(responses: Array<{ questionId: string; value: string }>): boolean | undefined {
  const gcResponse = responses.find(r => r.questionId === 'goalie-intake-4');
  if (!gcResponse) return undefined;

  return gcResponse.value === 'gc-yes-regular' || gcResponse.value === 'gc-yes-occasional';
}

/**
 * Extract primary reasons from intake response (multi-select)
 */
export function extractPrimaryReasons(responses: Array<{ questionId: string; value: string | string[] }>): string[] {
  const reasonResponse = responses.find(r => r.questionId === 'goalie-intake-5');
  if (!reasonResponse) return [];

  // Multi-select returns array
  if (Array.isArray(reasonResponse.value)) {
    return reasonResponse.value;
  }

  return [reasonResponse.value];
}
