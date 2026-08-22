import { IntakeQuestion } from '@/types';

/**
 * Coach Front Door Intake Questions
 * Based on Michael's Coach Questionnaire Specification (04-coach-questionnaire-spec.md)
 *
 * 4 screens, 7 questions total
 * All selection-based (no typing required)
 */

export const COACH_INTAKE_QUESTIONS: IntakeQuestion[] = [
  // ===========================================
  // SCREEN 1: Tell us about your coaching
  // ===========================================
  {
    id: 'coach-intake-1',
    screenNumber: 1,
    questionCode: 'Q-IN-1',
    question: 'What level do you currently coach?',
    type: 'single_select',
    isRequired: true,
    order: 1,
    options: [
      { id: 'level-house', text: 'House league / recreational', score: 1.5 },
      { id: 'level-select', text: 'Select / competitive', score: 2.5 },
      { id: 'level-aa-aaa', text: 'AA / AAA', score: 3.0 },
      { id: 'level-elite', text: 'Elite / Junior / Pre-Junior', score: 3.5 },
      { id: 'level-none', text: "I'm not currently coaching a team", score: 2.0 },
    ],
  },
  {
    id: 'coach-intake-2',
    screenNumber: 1,
    questionCode: 'Q-IN-2',
    question: 'How long have you been coaching hockey?',
    type: 'single_select',
    isRequired: true,
    order: 2,
    options: [
      { id: 'exp-first', text: 'This is my first season', score: 1.0 },
      { id: 'exp-1-3', text: '1-3 seasons', score: 2.0 },
      { id: 'exp-4-7', text: '4-7 seasons', score: 3.0 },
      { id: 'exp-8-plus', text: '8+ seasons', score: 3.5 },
    ],
  },

  // ===========================================
  // SCREEN 2: Your team and your goalie
  // ===========================================
  {
    id: 'coach-intake-3',
    screenNumber: 2,
    questionCode: 'Q-IN-3',
    question: 'How many goalies are on your roster right now?',
    type: 'single_select',
    isRequired: true,
    order: 3,
    options: [
      { id: 'goalies-1', text: '1', score: 2.0 },
      { id: 'goalies-2', text: '2', score: 3.0 },
      { id: 'goalies-3-plus', text: '3 or more', score: 3.0 },
    ],
  },
  {
    id: 'coach-intake-4',
    screenNumber: 2,
    questionCode: 'Q-IN-4',
    question: "How would you describe your current relationship with your goalie's development?",
    type: 'single_select',
    isRequired: true,
    order: 4,
    options: [
      {
        id: 'dev-active',
        text: 'I actively work on their development during practices',
        score: 4.0,
      },
      {
        id: 'dev-want-to',
        text: "I want to help but I don't know what to do with them",
        score: 2.5,
      },
      {
        id: 'dev-team-focus',
        text: 'I focus on the team — the goalie kind of figures it out on their own',
        score: 1.5,
      },
      {
        id: 'dev-goalie-coach',
        text: 'We have a separate goalie coach who handles it',
        score: 3.0,
      },
    ],
  },

  // ===========================================
  // SCREEN 3: What brought you to Smarter Goalie today?
  // ===========================================
  {
    id: 'coach-intake-5',
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
      { id: 'reason-understand', text: 'I want to understand goaltending better so I can support my goalie' },
      { id: 'reason-structure', text: 'I want structured goalie development I can integrate into team practices' },
      { id: 'reason-struggling', text: "My goalie is struggling and I don't know how to help" },
      { id: 'reason-no-goalie-coach', text: "I don't have access to a goalie coach and need resources" },
      { id: 'reason-evaluate', text: "I want to evaluate my goalie's performance more accurately" },
      { id: 'reason-warmups', text: 'I want to learn how to design better warm-ups for my goalie' },
      { id: 'reason-referred', text: 'I heard about Smarter Goalie from someone' },
      { id: 'reason-exploring', text: 'Just exploring — want to see what you offer' },
    ],
  },

  // ===========================================
  // SCREEN 4: One more thing
  // ===========================================
  {
    id: 'coach-intake-6',
    screenNumber: 4,
    questionCode: 'Q-IN-6',
    question: 'Does your goalie currently do any designated training activities or skill development work outside of team practice?',
    type: 'single_select',
    isRequired: true,
    order: 6,
    options: [
      {
        id: 'training-structured',
        text: 'Yes — they work with a goalie coach or follow a structured program',
        score: 4.0,
      },
      {
        id: 'training-some',
        text: "Somewhat — they do some work on their own but it's not structured",
        score: 2.5,
      },
      {
        id: 'training-none',
        text: 'No — their only development comes from team practice and games',
        score: 1.5,
      },
      {
        id: 'training-unknown',
        text: "No — I wouldn't know what to suggest for them to work on",
        score: 1.0,
      },
    ],
  },
  {
    id: 'coach-intake-7',
    screenNumber: 4,
    questionCode: 'Q-IN-7',
    question: 'Are you aware that a goalie can perform meaningful training activities on their own — without a coach, partner, or ice time?',
    type: 'single_select',
    isRequired: true,
    order: 7,
    options: [
      {
        id: 'aware-yes',
        text: 'Yes — my goalie already does some independent work',
        score: 3.5,
      },
      {
        id: 'aware-heard',
        text: "I've heard of it but don't know what that looks like",
        score: 2.0,
      },
      {
        id: 'aware-no',
        text: 'No — I assumed goalie training requires a coach or ice',
        score: 1.0,
      },
      {
        id: 'aware-interested',
        text: "I'd like to learn more about this",
        score: 1.5,
      },
    ],
  },
];

/**
 * Get intake questions grouped by screen
 */
export function getCoachIntakeQuestionsByScreen(): Map<number, IntakeQuestion[]> {
  const grouped = new Map<number, IntakeQuestion[]>();

  for (const question of COACH_INTAKE_QUESTIONS) {
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
export function getCoachTotalIntakeScreens(): number {
  const screens = new Set(COACH_INTAKE_QUESTIONS.map(q => q.screenNumber));
  return screens.size;
}
