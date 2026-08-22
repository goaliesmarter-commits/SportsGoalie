import { IntakeQuestion } from '@/types';

/**
 * Parent Front Door Intake Questions
 * Based on Michael's Parent Questionnaire Specification (03-parent-questionnaire-spec.md)
 *
 * 4 screens, 6 questions total
 * All selection-based (no typing required)
 */

export const PARENT_INTAKE_QUESTIONS: IntakeQuestion[] = [
  // ===========================================
  // SCREEN 1: Tell us about your goalie
  // ===========================================
  {
    id: 'parent-intake-1',
    screenNumber: 1,
    questionCode: 'Q-IN-1',
    question: 'How old is your goalie?',
    type: 'single_select',
    isRequired: true,
    order: 1,
    options: [
      { id: 'age-6-8', text: '6-8 years old', score: 1.0 },
      { id: 'age-9-11', text: '9-11 years old', score: 1.5 },
      { id: 'age-12-14', text: '12-14 years old', score: 2.0 },
      { id: 'age-15-18', text: '15-18 years old', score: 2.5 },
    ],
  },
  {
    id: 'parent-intake-2',
    screenNumber: 1,
    questionCode: 'Q-IN-2',
    question: 'How long have they been playing goalie?',
    type: 'single_select',
    isRequired: true,
    order: 2,
    options: [
      { id: 'exp-new', text: 'Brand new — just starting', score: 1.0 },
      { id: 'exp-less-1', text: 'Less than 1 season', score: 1.5 },
      { id: 'exp-1-3', text: '1-3 seasons', score: 2.5 },
      { id: 'exp-4-plus', text: '4+ seasons', score: 3.5 },
    ],
  },

  // ===========================================
  // SCREEN 2: What level are they playing at?
  // ===========================================
  {
    id: 'parent-intake-3',
    screenNumber: 2,
    questionCode: 'Q-IN-3',
    question: 'What level do they play at?',
    type: 'single_select',
    isRequired: true,
    order: 3,
    options: [
      { id: 'level-house', text: 'House league / recreational', score: 1.5 },
      { id: 'level-select', text: 'Select / competitive', score: 2.5 },
      { id: 'level-aa-aaa', text: 'AA / AAA', score: 3.0 },
      { id: 'level-elite', text: 'Elite / Junior / Pre-Junior', score: 3.5 },
    ],
  },
  {
    id: 'parent-intake-4',
    screenNumber: 2,
    questionCode: 'Q-IN-4',
    question: 'Have they ever worked with a goalie coach?',
    type: 'single_select',
    isRequired: true,
    order: 4,
    options: [
      { id: 'gc-yes-current', text: 'Yes — currently working with one', score: 4.0 },
      { id: 'gc-yes-past', text: 'Yes — in the past', score: 2.5 },
      { id: 'gc-no-never', text: 'No — never had goalie-specific coaching', score: 1.0 },
    ],
  },

  // ===========================================
  // SCREEN 3: What brought you to Smarter Goalie today?
  // ===========================================
  {
    id: 'parent-intake-5',
    screenNumber: 3,
    questionCode: 'Q-IN-5',
    // See goalie-intake-questions.ts — the screen prints "Select all that apply"
    // itself, so repeating it inline made this question read differently from the
    // identical control on the baseline questionnaires.
    question: 'What brought you to Smarter Goalie today?',
    type: 'multi_select',
    isRequired: true,
    order: 5,
    options: [
      { id: 'reason-fundamentals', text: 'I want my goalie to develop proper fundamentals' },
      { id: 'reason-understand', text: 'I want to understand the position better as a parent' },
      { id: 'reason-struggling', text: 'My goalie is struggling and I want to help' },
      { id: 'reason-structure', text: "I'm looking for structured development — not just drills" },
      { id: 'reason-no-coach', text: "My goalie's team coach doesn't focus on goalie development" },
      { id: 'reason-support', text: 'I want to support my goalie without overstepping' },
      { id: 'reason-referred', text: 'I heard about Smarter Goalie from someone' },
      { id: 'reason-exploring', text: 'Just exploring — want to see what you offer' },
    ],
  },

  // ===========================================
  // SCREEN 4: One more thing
  // ===========================================
  {
    id: 'parent-intake-6',
    screenNumber: 4,
    questionCode: 'Q-IN-6',
    question: "How involved do you want to be in your goalie's development?",
    type: 'single_select',
    isRequired: true,
    order: 6,
    options: [
      {
        id: 'involvement-very',
        text: 'Very involved — I want to understand the position so I can support my goalie',
        score: 4.0,
      },
      {
        id: 'involvement-somewhat',
        text: "Somewhat involved — keep me informed, I'll support from the sideline",
        score: 3.0,
      },
      {
        id: 'involvement-unsure',
        text: "Not sure yet — show me what's possible",
        score: 2.5,
      },
    ],
  },
];

/**
 * Get intake questions grouped by screen
 */
export function getParentIntakeQuestionsByScreen(): Map<number, IntakeQuestion[]> {
  const grouped = new Map<number, IntakeQuestion[]>();

  for (const question of PARENT_INTAKE_QUESTIONS) {
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
export function getParentTotalIntakeScreens(): number {
  const screens = new Set(PARENT_INTAKE_QUESTIONS.map(q => q.screenNumber));
  return screens.size;
}
