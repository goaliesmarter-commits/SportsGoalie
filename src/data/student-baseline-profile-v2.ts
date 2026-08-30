// ─── Types ───────────────────────────────────────────────────────────────────

export type V2InputType =
  | 'text'
  | 'email_phone'
  | 'location'
  | 'radio'
  | 'multi_select'
  | 'scale'
  | 'scale_3'
  | 'open_text';

export interface V2QuestionOption {
  id: string;
  text: string;
  hasOpenText?: boolean;
  isSkip?: boolean;
  isPreferNot?: boolean;
}

export interface V2SubQuestion {
  id: string;
  question: string;
  showWhenParentValues: string[];
}

export interface V2Question {
  id: string;
  section: SectionKey;
  inputType: V2InputType;
  question: string;
  subLabel?: string;
  note?: string;
  tooltip?: string;
  options?: V2QuestionOption[];
  scaleLeft?: string;
  scaleRight?: string;
  scaleMid?: string;
  required?: boolean;
  evolutionEligible?: boolean;
  conditionalLogic?: {
    parentId: string;
    showWhenIncludes: string[];
  };
  subQuestion?: V2SubQuestion;
}

export interface V2Section {
  key: SectionKey;
  title: string;
  categoryLabel: string;
  intro?: string;
  questions: V2Question[];
}

export type SectionKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

// ─── Sections ────────────────────────────────────────────────────────────────

export const STUDENT_BASELINE_SECTIONS: V2Section[] = [
  // ── SECTION A ──────────────────────────────────────────────────────────────
  {
    key: 'A',
    title: "TELL US WHO YOU ARE & WHY YOU'RE HERE",
    categoryLabel: 'Identity / Demographics / Entry Context',
    questions: [
      {
        id: 'A1',
        section: 'A',
        inputType: 'text',
        question: 'Your full name.',
        required: true,
      },
      {
        id: 'A2',
        section: 'A',
        inputType: 'radio',
        question: 'Your age.',
        required: true,
        options: [
          { id: 'A2-1', text: '7–9' },
          { id: 'A2-2', text: '10–12' },
          { id: 'A2-3', text: '13–15' },
          { id: 'A2-4', text: '16–18' },
          { id: 'A2-5', text: '19–21' },
          { id: 'A2-6', text: 'Adult' },
          { id: 'A2-7', text: 'Masters' },
        ],
      },
      {
        id: 'A3',
        section: 'A',
        inputType: 'email_phone',
        question: 'Email and phone — for Smarter Goalie to reach you directly.',
        required: true,
      },
      {
        id: 'A4',
        section: 'A',
        inputType: 'location',
        question: 'Where you live — city, state or province, country.',
        required: true,
      },
      {
        id: 'A5',
        section: 'A',
        inputType: 'text',
        question: 'Your team and league this season, if applicable.',
        required: false,
      },
      {
        id: 'A6',
        section: 'A',
        inputType: 'radio',
        question: 'How many teams have you played on in your goaltending journey?',
        required: true,
        options: [
          { id: 'A6-1', text: '1' },
          { id: 'A6-2', text: '2–3' },
          { id: 'A6-3', text: '4–5' },
          { id: 'A6-4', text: '6–10' },
          { id: 'A6-5', text: '10+' },
          { id: 'A6-6', text: 'Not sure' },
        ],
      },
      {
        id: 'A7',
        section: 'A',
        inputType: 'radio',
        question: 'Are you considered the starter on your current team?',
        note: 'At AA, AAA, and beyond, the starter — or No. 1 — is considered the stronger of the two goalies. Please be open and honest. We have your back.',
        required: true,
        options: [
          { id: 'A7-starter', text: 'Yes — I am the starter / No. 1' },
          { id: 'A7-shared', text: 'I share the role with another goalie' },
          { id: 'A7-backup', text: 'I am the backup' },
          { id: 'A7-only', text: 'I am the only goalie on the team' },
          { id: 'A7-none', text: 'Not currently on a team' },
        ],
      },
      {
        id: 'A8',
        section: 'A',
        inputType: 'radio',
        question: 'What season did you become the starter?',
        conditionalLogic: {
          parentId: 'A7',
          showWhenIncludes: ['A7-starter', 'A7-shared'],
        },
        options: [
          { id: 'A8-1', text: 'This season' },
          { id: 'A8-2', text: 'Last season' },
          { id: 'A8-3', text: '2–3 seasons ago' },
          { id: 'A8-4', text: 'Many seasons' },
          { id: 'A8-5', text: 'Not sure' },
        ],
      },
      {
        id: 'A9',
        section: 'A',
        inputType: 'radio',
        question: 'How do you feel about being the backup?',
        evolutionEligible: true,
        conditionalLogic: {
          parentId: 'A7',
          showWhenIncludes: ['A7-backup'],
        },
        options: [
          { id: 'A9-1', text: 'I am okay with it — I am still developing' },
          { id: 'A9-2', text: 'I want to compete with myself to become the starter' },
          { id: 'A9-3', text: 'It is hard but I am working through it' },
          { id: 'A9-4', text: 'I am not sure yet' },
          { id: 'A9-open', text: 'Other — tell us in your own words', hasOpenText: true },
        ],
      },
      {
        id: 'A10',
        section: 'A',
        inputType: 'radio',
        question: 'How did you hear about Smarter Goalie?',
        required: true,
        options: [
          { id: 'A10-1', text: 'A parent' },
          { id: 'A10-2', text: 'A coach' },
          { id: 'A10-3', text: 'A teammate' },
          { id: 'A10-4', text: 'Found online' },
          { id: 'A10-5', text: 'Social media' },
          { id: 'A10-6', text: 'Other' },
        ],
      },
      {
        id: 'A11',
        section: 'A',
        inputType: 'open_text',
        question: 'What spoke to you on our website?',
        evolutionEligible: true,
        options: [{ id: 'A11-skip', text: "I'm still looking around", isSkip: true }],
      },
      {
        id: 'A12',
        section: 'A',
        inputType: 'radio',
        question: 'Was anything overwhelming?',
        note: 'Not to worry. We guide you at your speed — and we believe you will learn quickly with the right motivation. We always have your back.',
        required: true,
        evolutionEligible: true,
        options: [
          { id: 'A12-1', text: 'No — it felt clear' },
          { id: 'A12-2', text: 'A little — but I want to keep going' },
          { id: 'A12-3', text: 'Yes — it was a lot to take in' },
          { id: 'A12-4', text: "I'm still figuring it out" },
        ],
      },
    ],
  },

  // ── SECTION B ──────────────────────────────────────────────────────────────
  {
    key: 'B',
    title: 'YOUR ATHLETIC FOUNDATION',
    categoryLabel: 'Whole-Athlete View / Mental Math / Athletic Transfer',
    intro: 'Goaltending does not begin in net. Every athlete brings something with them — from other sports, from family, from how they grew up moving. We want to know what you bring.',
    questions: [
      {
        id: 'B1',
        section: 'B',
        inputType: 'multi_select',
        question: 'What other sports have you played — current or past?',
        note: 'These are examples. If you played something we did not list — tell us.',
        options: [
          { id: 'B1-baseball', text: 'Baseball / Softball' },
          { id: 'B1-soccer', text: 'Soccer' },
          { id: 'B1-basketball', text: 'Basketball' },
          { id: 'B1-football', text: 'Football' },
          { id: 'B1-lacrosse', text: 'Lacrosse' },
          { id: 'B1-tennis', text: 'Tennis' },
          { id: 'B1-golf', text: 'Golf' },
          { id: 'B1-volleyball', text: 'Volleyball' },
          { id: 'B1-swimming', text: 'Swimming' },
          { id: 'B1-track', text: 'Track & Field' },
          { id: 'B1-martial', text: 'Martial Arts' },
          { id: 'B1-gymnastics', text: 'Gymnastics' },
          { id: 'B1-other', text: 'Other — tell us', hasOpenText: true },
          { id: 'B1-hockey', text: 'Hockey only' },
        ],
      },
      {
        id: 'B2',
        section: 'B',
        inputType: 'open_text',
        question: 'Which positions did you play in those sports?',
        note: 'Were they principal positions — like pitcher or catcher in baseball, quarterback in football, striker in soccer? Tell us what you played.',
        evolutionEligible: true,
      },
      {
        id: 'B3',
        section: 'B',
        inputType: 'radio',
        question: 'Would you consider yourself a factor on those teams — a contributor, a staple, someone the team relied on?',
        tooltip: 'Factor = made a difference in games. Contributor = added value through play, effort, attitude. Staple = team depended on you week in and week out.',
        evolutionEligible: true,
        options: [
          { id: 'B3-1', text: 'Yes — I was a key player' },
          { id: 'B3-2', text: 'Most of the time, yes' },
          { id: 'B3-3', text: 'Sometimes — depending on the sport or team' },
          { id: 'B3-4', text: 'No — I was still developing' },
          { id: 'B3-5', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'B4',
        section: 'B',
        inputType: 'scale',
        question: 'Math is a part of every sport. The brain is the central onboard computer — it learns, tracks, and improves with proper instruction and experience. How much do you feel you have trained your brain through sport — tracking plays, reading the game, making quick decisions?',
        scaleLeft: "I'm still building this",
        scaleRight: 'My brain reads the game well',
        evolutionEligible: true,
      },
      {
        id: 'B5',
        section: 'B',
        inputType: 'radio',
        question: 'Do you come from an athletic family?',
        note: 'Athletic families pass down more than just genes. They pass down movement, discipline, and the language of sport.',
        options: [
          { id: 'B5-1', text: 'Yes — many in my family played sports at a high level' },
          { id: 'B5-2', text: 'Yes — one or two played at a high level' },
          { id: 'B5-3', text: 'Some played recreationally' },
          { id: 'B5-4', text: 'Not really' },
          { id: 'B5-5', text: "I'm not sure" },
        ],
      },
      {
        id: 'B6',
        section: 'B',
        inputType: 'open_text',
        question: 'Briefly — who in your family played, and what sport / level?',
        subLabel: 'A few words is plenty.',
        evolutionEligible: true,
      },
      {
        id: 'B7',
        section: 'B',
        inputType: 'radio',
        question: 'Have you ever been selected to play UP an age group — playing with older athletes because of your ability?',
        note: 'This is not bragging. It is a data point. Being selected to play up means someone saw something in you.',
        options: [
          { id: 'B7-1', text: 'Yes — once' },
          { id: 'B7-2', text: 'Yes — more than once' },
          { id: 'B7-3', text: 'No' },
          { id: 'B7-4', text: "I'm not sure" },
        ],
      },
      {
        id: 'B8',
        section: 'B',
        inputType: 'radio',
        question: 'Overall — where would you place yourself as an athlete?',
        tooltip: 'Average = solid effort, contributes, still developing. Above Average = stands out from most teammates. Strong/Standout = recognized as one of the better athletes on the team.',
        evolutionEligible: true,
        options: [
          { id: 'B8-1', text: 'Average — still developing' },
          { id: 'B8-2', text: 'Above Average' },
          { id: 'B8-3', text: 'Strong / Standout' },
          { id: 'B8-4', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'B9',
        section: 'B',
        inputType: 'open_text',
        question: 'Looking back — what is one thing from another sport that you carry into the crease with you?',
        evolutionEligible: true,
      },
      {
        id: 'B10',
        section: 'B',
        inputType: 'radio',
        question: 'Are you currently playing any sport besides hockey?',
        options: [
          { id: 'B10-1', text: 'Yes — actively playing another sport' },
          { id: 'B10-2', text: 'Yes — but only seasonally / casually' },
          { id: 'B10-3', text: 'No — hockey only right now' },
          { id: 'B10-4', text: 'No — but I plan to play another sport again' },
        ],
      },
      {
        id: 'B11',
        section: 'B',
        inputType: 'radio',
        question: 'Do you train physically off the ice?',
        note: 'Examples — strength training, mobility work, yoga, agility, running, biking. Whatever you do to stay athletic outside of hockey.',
        options: [
          { id: 'B11-1', text: 'Yes — regular structured training' },
          { id: 'B11-2', text: 'Yes — but inconsistent' },
          { id: 'B11-3', text: 'Some — light or occasional' },
          { id: 'B11-4', text: 'Not yet' },
          { id: 'B11-5', text: "I'm not sure what counts" },
        ],
        subQuestion: {
          id: 'B11-sub',
          question: 'Briefly tell us what you do.',
          showWhenParentValues: ['B11-1', 'B11-2', 'B11-3'],
        },
      },
    ],
  },

  // ── SECTION C ──────────────────────────────────────────────────────────────
  {
    key: 'C',
    title: 'YOUR GOALTENDING JOURNEY',
    categoryLabel: 'History / Experience Baseline',
    questions: [
      {
        id: 'C1',
        section: 'C',
        inputType: 'radio',
        question: 'How long have you been playing the goaltender position?',
        required: true,
        options: [
          { id: 'C1-1', text: 'This is my first season' },
          { id: 'C1-2', text: '1–2 seasons' },
          { id: 'C1-3', text: '3–5 seasons' },
          { id: 'C1-4', text: '6–10 seasons' },
          { id: 'C1-5', text: '10+ seasons' },
        ],
      },
      {
        id: 'C2',
        section: 'C',
        inputType: 'open_text',
        question: 'Take us through your playing history — level by level.',
        note: 'We want to understand your journey — what level you started at, what levels you have played at since, and where you are now. Just a brief list, in order if you can.',
      },
      {
        id: 'C3',
        section: 'C',
        inputType: 'scale',
        question: 'How would you rate yourself as a goalie so far?',
        scaleLeft: 'Still finding my game',
        scaleRight: 'I know what I can do',
        evolutionEligible: true,
      },
      {
        id: 'C4',
        section: 'C',
        inputType: 'radio',
        question: 'Are you a better goalie than when you started?',
        evolutionEligible: true,
        options: [
          { id: 'C4-1', text: 'Yes — a lot better' },
          { id: 'C4-2', text: 'Yes — some growth' },
          { id: 'C4-3', text: 'About the same' },
          { id: 'C4-4', text: 'Honestly, I have struggled' },
          { id: 'C4-5', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'C5',
        section: 'C',
        inputType: 'open_text',
        question: 'What has been your biggest improvement so far?',
        evolutionEligible: true,
      },
      {
        id: 'C6',
        section: 'C',
        /*
          Michael, 21 Aug: on his third pass through this question he wanted to
          pick four or five areas, not one — a goalie working on their mental
          game is usually working on their skating too. The renderer prints
          "Select all that apply" for multi_select, so the note below does not
          repeat it.
        */
        inputType: 'multi_select',
        question: 'Of the following — which areas do you feel need the most work right now?',
        note: 'These are examples to help you think. If your answer is something we did not list — tell us in your own words. We do not want to lead you.',
        evolutionEligible: true,
        options: [
          { id: 'C6-1', text: 'MindSet — confidence, focus, mental game' },
          { id: 'C6-2', text: 'Skating — balance, coordination, execution, recovery' },
          { id: 'C6-3', text: 'Positional Play — angles, depth, reads' },
          { id: 'C6-4', text: 'Form — set-crouches, execution, recovery' },
          { id: 'C6-5', text: 'Game Performance — consistency in performance under pressure' },
          { id: 'C6-6', text: 'Lifestyle — preparation, rest, nutrition, training' },
          { id: 'C6-open', text: 'Something else — tell us in your own words', hasOpenText: true },
          { id: 'C6-7', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'C7',
        section: 'C',
        inputType: 'radio',
        question: 'Are you open to changing things in your game — even things you currently believe in — if it leads to growth?',
        note: 'To grow, a goalie must have an open mind. The fact that you believe something today does not mean it is the best way for you tomorrow. The willingness to change is the door to development.',
        evolutionEligible: true,
        options: [
          { id: 'C7-1', text: 'Yes — I am open to whatever helps me grow' },
          { id: 'C7-2', text: 'Mostly yes — but I trust what is already working for me' },
          { id: 'C7-3', text: 'I am open, but it takes me time to change' },
          { id: 'C7-4', text: 'Honestly, I struggle with change' },
          { id: 'C7-5', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'C8',
        section: 'C',
        inputType: 'scale',
        question: 'Can you self-evaluate your game honestly — including the parts that need work?',
        note: 'If you cannot yet — you will, with Smarter Goalie. We promise.',
        scaleLeft: 'I cannot yet',
        scaleRight: 'I can review my game honestly',
        evolutionEligible: true,
      },
      {
        id: 'C9',
        section: 'C',
        inputType: 'radio',
        question: 'When you reflect on your own game — are you harder on yourself than you should be, fair, or too easy?',
        evolutionEligible: true,
        options: [
          { id: 'C9-1', text: 'Very hard on myself' },
          { id: 'C9-2', text: 'Sometimes hard on myself' },
          { id: 'C9-3', text: 'Fair — I see what I did well and what I did not' },
          { id: 'C9-4', text: 'Probably too easy on myself' },
          { id: 'C9-5', text: "I'm not sure yet" },
        ],
      },
    ],
  },

  // ── SECTION D ──────────────────────────────────────────────────────────────
  {
    key: 'D',
    title: 'INSIDE YOUR GAME',
    categoryLabel: 'Mental Pre-Game / Style of Play / Self-Awareness',
    intro: 'Every goalie has an inner world that nobody sees. The thoughts before warm-up. The voice between shots. The feeling when the puck drops. We want to understand yours.',
    questions: [
      {
        id: 'D1',
        section: 'D',
        inputType: 'scale',
        question: 'How confident do you feel before most games?',
        scaleLeft: 'Not sure yet',
        scaleRight: 'Very confident',
        evolutionEligible: true,
      },
      {
        id: 'D2',
        section: 'D',
        inputType: 'radio',
        question: 'How would you describe your style of play right now?',
        note: 'These are examples. If your style is different — tell us in your own words.',
        evolutionEligible: true,
        options: [
          { id: 'D2-1', text: 'Aggressive — I come out to challenge' },
          { id: 'D2-2', text: 'Patient — I let the play come to me' },
          { id: 'D2-3', text: 'Reactive — I read and react quickly' },
          { id: 'D2-4', text: 'Calm — I stay composed and centered' },
          { id: 'D2-5', text: 'Active — I move a lot, never still' },
          { id: 'D2-6', text: 'Mixed — depends on the situation' },
          { id: 'D2-open', text: 'Something else — tell us', hasOpenText: true },
          { id: 'D2-7', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'D3',
        section: 'D',
        inputType: 'open_text',
        question: 'What is going on in your head from the moment you step on the ice for warm-up to the moment the puck drops?',
        evolutionEligible: true,
      },
      {
        id: 'D4',
        section: 'D',
        inputType: 'radio',
        question: 'How often do you replay mistakes in your head DURING the game?',
        note: 'This is about what happens IN the moment — after a goal, after a tough shift — not what you think about hours later.',
        evolutionEligible: true,
        options: [
          { id: 'D4-1', text: 'I quickly process the goal — take what I can and move on' },
          { id: 'D4-2', text: 'Sometimes it sticks for a shift or two' },
          { id: 'D4-3', text: 'It causes tension that affects my next save' },
          { id: 'D4-4', text: 'It throws me off the rest of the game' },
          { id: 'D4-5', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'D4B',
        section: 'D',
        inputType: 'scale',
        question: 'How often do you replay mistakes in your head AFTER the game — driving home, that night, the next day?',
        scaleLeft: 'Rarely',
        scaleRight: 'All the time',
        evolutionEligible: true,
      },
      {
        id: 'D5',
        section: 'D',
        inputType: 'scale',
        question: 'How well do you feel you read the play right now?',
        note: "Reading the play means seeing the player with the puck's options.",
        scaleLeft: 'Still learning',
        scaleRight: 'I read the play well',
        evolutionEligible: true,
      },
      {
        id: 'D6',
        section: 'D',
        inputType: 'radio',
        question: 'When the game is on the line — last minute, tied game, one-goal lead — what shows up in you?',
        evolutionEligible: true,
        options: [
          { id: 'D6-1', text: 'Calm — I want the puck on net' },
          { id: 'D6-2', text: 'Focused — I lock in tighter' },
          { id: 'D6-3', text: 'Nervous but ready' },
          { id: 'D6-4', text: 'Anxious — it can shake me' },
          { id: 'D6-5', text: 'Mixed — depends on the night' },
          { id: 'D6-open', text: 'Something else — tell us', hasOpenText: true },
          { id: 'D6-6', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'D7',
        section: 'D',
        inputType: 'open_text',
        question: 'When you walk into the arena — can you describe how you feel?',
        note: 'Is it a good feeling or a challenging one? Take a moment to think on it — then tell us in your own words.',
        evolutionEligible: true,
      },
      {
        id: 'D8',
        section: 'D',
        inputType: 'radio',
        question: 'When do you start preparing for your next start?',
        options: [
          { id: 'D8-1', text: 'The night before' },
          { id: 'D8-2', text: 'The morning of' },
          { id: 'D8-3', text: 'A few hours before puck drop' },
          { id: 'D8-4', text: 'Once I am at the rink' },
          { id: 'D8-5', text: "I don't have a set routine yet" },
          { id: 'D8-open', text: 'Something else — tell us', hasOpenText: true },
        ],
      },
      {
        id: 'D9',
        section: 'D',
        inputType: 'open_text',
        question: 'What do you do to prepare for your start MENTALLY?',
        evolutionEligible: true,
      },
      {
        id: 'D10',
        section: 'D',
        inputType: 'open_text',
        question: 'What do you do to prepare for your start PHYSICALLY?',
        evolutionEligible: true,
      },
    ],
  },

  // ── SECTION E ──────────────────────────────────────────────────────────────
  {
    key: 'E',
    title: 'HOW YOU SEE YOURSELF',
    categoryLabel: 'Strengths and Gaps Self-Discovery',
    intro: "Knowing yourself is the foundation of every goalie's growth. What you are good at. What needs work. Where you are honest with yourself — and where you might be fooling yourself a little. There are no wrong answers here. Only honest ones.",
    questions: [
      {
        id: 'E1',
        section: 'E',
        inputType: 'scale',
        question: 'How well do you feel you know your own game?',
        scaleLeft: 'Still discovering it',
        scaleRight: 'I know my game very clearly',
        evolutionEligible: true,
      },
      {
        id: 'E2',
        section: 'E',
        inputType: 'open_text',
        question: 'What is your biggest strength as a goalie right now?',
        evolutionEligible: true,
      },
      {
        id: 'E3',
        section: 'E',
        inputType: 'open_text',
        question: 'What is one area you know you need to work on?',
        evolutionEligible: true,
      },
      {
        id: 'E4',
        section: 'E',
        inputType: 'open_text',
        question: 'Are there any parts of your game you have been avoiding working on — even though you know you should?',
        note: 'Avoiding something does not make us weak — it makes us human. Naming it is the first step.',
        evolutionEligible: true,
      },
      {
        id: 'E5',
        section: 'E',
        inputType: 'open_text',
        question: 'Has anyone — a coach, a parent, a teammate — pointed something out about your game that you did not want to hear at first, but later realized was true?',
        evolutionEligible: true,
      },
      {
        id: 'E6',
        section: 'E',
        inputType: 'open_text',
        question: 'How would your teammates describe you as a goalie?',
        evolutionEligible: true,
      },
      {
        id: 'E7',
        section: 'E',
        inputType: 'open_text',
        question: 'How would your coach describe you as a goalie?',
        evolutionEligible: true,
      },
    ],
  },

  // ── SECTION F ──────────────────────────────────────────────────────────────
  {
    key: 'F',
    title: 'WHEN THE GAME GETS HARD',
    categoryLabel: 'Character Discovery / Internal Dialogue / Adversity / The Two Voices',
    intro: "Every goalie carries two voices in their head. One supports them — \"you got this, shake it off.\" The other tries to break them — \"you're not good enough, you let them down.\" This section is about getting honest with the voices you hear. There are no wrong answers — only honest ones. Take your time.",
    questions: [
      {
        id: 'F1',
        section: 'F',
        inputType: 'radio',
        question: 'When things get tough during a game — a soft goal, a tight loss, a mistake you can\'t shake — what is the first voice you hear in your head?',
        evolutionEligible: true,
        options: [
          { id: 'F1-1', text: '"You got this — shake it off."' },
          { id: 'F1-2', text: '"It\'s okay, the next save is yours."' },
          { id: 'F1-3', text: '"You\'re letting the team down."' },
          { id: 'F1-4', text: '"You\'re not good enough today."' },
          { id: 'F1-5', text: '"You suck."' },
          { id: 'F1-6', text: 'Both voices — depends on the moment' },
          { id: 'F1-open', text: 'Something else — tell us in your own words', hasOpenText: true },
          { id: 'F1-7', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'F2',
        section: 'F',
        inputType: 'scale_3',
        question: 'Which voice tends to be louder for you overall?',
        scaleLeft: 'The negative voice is louder',
        scaleMid: 'Both are equal',
        scaleRight: 'The supportive voice is louder',
        evolutionEligible: true,
      },
      {
        id: 'F3',
        section: 'F',
        inputType: 'open_text',
        question: 'When the negative voice shows up — how do you usually handle it?',
        evolutionEligible: true,
      },
      {
        id: 'F4',
        section: 'F',
        inputType: 'open_text',
        question: 'Describe a moment in goaltending that taught you something about yourself — good or hard.',
        evolutionEligible: true,
      },
      {
        id: 'F5',
        section: 'F',
        inputType: 'radio',
        question: 'Have you ever been BENCHED?',
        options: [
          { id: 'F5-yes', text: 'Yes' },
          { id: 'F5-no', text: 'No' },
          { id: 'F5-ns', text: 'Not sure' },
        ],
      },
      {
        id: 'F6',
        section: 'F',
        inputType: 'radio',
        question: 'Have you ever been SELECTED LATE OR LAST for a team?',
        options: [
          { id: 'F6-yes', text: 'Yes' },
          { id: 'F6-no', text: 'No' },
          { id: 'F6-ns', text: 'Not sure' },
        ],
      },
      {
        id: 'F7',
        section: 'F',
        inputType: 'radio',
        question: 'Have you ever been CUT from a team?',
        options: [
          { id: 'F7-yes', text: 'Yes' },
          { id: 'F7-no', text: 'No' },
          { id: 'F7-ns', text: 'Not sure' },
        ],
      },
      {
        id: 'F8',
        section: 'F',
        inputType: 'open_text',
        question: 'If yes to any of the above — what did you learn about yourself?',
        evolutionEligible: true,
        options: [{ id: 'F8-pref', text: 'Prefer not to answer', isPreferNot: true }],
      },
      {
        id: 'F9',
        section: 'F',
        inputType: 'open_text',
        question: 'Can you describe how you handled it?',
        evolutionEligible: true,
        options: [{ id: 'F9-pref', text: 'Prefer not to answer', isPreferNot: true }],
      },
      {
        id: 'F10',
        section: 'F',
        inputType: 'radio',
        question: 'Do you see yourself as a quitter?',
        evolutionEligible: true,
        options: [
          { id: 'F10-no', text: 'No' },
          { id: 'F10-some', text: 'Sometimes' },
          { id: 'F10-yes', text: 'Yes' },
          { id: 'F10-ns', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'F11',
        section: 'F',
        inputType: 'radio',
        question: 'Do you see yourself as someone who realizes a task is daunting — but gives it a go anyway?',
        tooltip: 'Daunting = something that feels big, intimidating, or hard. The kind of challenge that makes you question whether you can do it — but you take it on anyway.',
        evolutionEligible: true,
        options: [
          { id: 'F11-1', text: "Yes — that's me" },
          { id: 'F11-2', text: 'Most of the time, yes' },
          { id: 'F11-3', text: 'Sometimes — depends on what it is' },
          { id: 'F11-4', text: 'Honestly, not really' },
          { id: 'F11-5', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'F12',
        section: 'F',
        inputType: 'open_text',
        question: 'If you can think of an example — when did you face something daunting and give it a go anyway?',
        evolutionEligible: true,
      },
      {
        id: 'F13',
        section: 'F',
        inputType: 'radio',
        question: 'When something goes wrong — in a game, in practice, in life — who do you typically turn to for support?',
        evolutionEligible: true,
        options: [
          { id: 'F13-1', text: 'A parent' },
          { id: 'F13-2', text: 'A coach' },
          { id: 'F13-3', text: 'A teammate / friend' },
          { id: 'F13-4', text: 'A goalie coach or mentor' },
          { id: 'F13-5', text: 'I usually work through it alone' },
          { id: 'F13-open', text: 'Other — tell us', hasOpenText: true },
          { id: 'F13-6', text: "I'm not sure yet" },
        ],
      },
    ],
  },

  // ── SECTION G ──────────────────────────────────────────────────────────────
  {
    key: 'G',
    title: 'WHAT DRIVES YOU',
    categoryLabel: 'Motivation / Internal Drive / Vision of Success',
    intro: 'Every goalie has a reason. Something that pulls them back into the crease — game after game, season after season, even on the hardest days. We want to understand what drives you.',
    questions: [
      {
        id: 'G1',
        section: 'G',
        inputType: 'open_text',
        question: 'Why do you play this position?',
        evolutionEligible: true,
      },
      {
        id: 'G2',
        section: 'G',
        inputType: 'open_text',
        question: 'What does success look like to you this season?',
        evolutionEligible: true,
      },
      {
        id: 'G3',
        section: 'G',
        inputType: 'open_text',
        question: 'If you could change one thing about your game right now — what would it be?',
        evolutionEligible: true,
      },
      {
        id: 'G4',
        section: 'G',
        inputType: 'radio',
        question: 'Where do you want goaltending to take you?',
        note: 'There are no wrong answers. All paths are honored here.',
        evolutionEligible: true,
        options: [
          { id: 'G4-1', text: 'Be the best I can be at my current level' },
          { id: 'G4-2', text: 'Move up a level next season' },
          { id: 'G4-3', text: 'Play high school / varsity' },
          { id: 'G4-4', text: 'Play college, university, or junior' },
          { id: 'G4-5', text: 'Play professionally one day' },
          { id: 'G4-6', text: 'I just love playing — no specific destination' },
          { id: 'G4-open', text: 'Something else — tell us', hasOpenText: true },
          { id: 'G4-7', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'G5',
        section: 'G',
        inputType: 'open_text',
        question: 'Who or what motivates you the most?',
        evolutionEligible: true,
      },
      {
        id: 'G6',
        section: 'G',
        inputType: 'radio',
        question: 'Is your motivation coming more from inside you — or from someone or something around you?',
        tooltip: 'Internal motivation = comes from within. External motivation = comes from outside (wanting to make someone proud, beat a rival, prove someone wrong, earn something).',
        evolutionEligible: true,
        options: [
          { id: 'G6-1', text: 'Mostly internal — comes from me' },
          { id: 'G6-2', text: 'Mostly external — comes from outside' },
          { id: 'G6-3', text: 'A mix of both' },
          { id: 'G6-4', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'G7',
        section: 'G',
        inputType: 'scale',
        question: 'How committed are you to your own development as a goalie?',
        scaleLeft: 'Still figuring it out',
        scaleRight: 'Fully committed',
        evolutionEligible: true,
      },
    ],
  },

  // ── SECTION H ──────────────────────────────────────────────────────────────
  {
    key: 'H',
    title: 'WHAT YOU WANT FROM SMARTER GOALIE',
    categoryLabel: 'Goals / Commitment / Expectations / Open Door',
    intro: 'You have shared a lot with us. Thank you. This last section is about what you want from us. Your answers shape how we guide you from here.',
    questions: [
      {
        id: 'H1',
        section: 'H',
        inputType: 'multi_select',
        question: 'What would be the most valuable thing Smarter Goalie could give you right now?',
        note: 'Pick anything that fits. And if there is something we did not list — something we missed — tell us in your own words. Your insight makes Smarter Goalie better.',
        options: [
          { id: 'H1-1', text: 'A clear teaching system I can work through on my own' },
          { id: 'H1-2', text: 'A way to connect my games and practices' },
          { id: 'H1-3', text: 'Tools to evaluate my own performance' },
          { id: 'H1-4', text: 'Real data I can share with my coach or parents' },
          { id: 'H1-5', text: 'Recognition and progress markers when I improve' },
          { id: 'H1-6', text: 'A place to grow my MindSet and confidence' },
          { id: 'H1-7', text: 'Connection to other goalies who think like I do' },
          { id: 'H1-open', text: 'Something we missed — tell us in your own words', hasOpenText: true },
        ],
      },
      {
        id: 'H2',
        section: 'H',
        inputType: 'radio',
        question: 'How much time can you commit to working on your game outside of team practice?',
        options: [
          { id: 'H2-1', text: '15–30 minutes a few times a week' },
          { id: 'H2-2', text: '30–60 minutes a few times a week' },
          { id: 'H2-3', text: '1–2 hours most days' },
          { id: 'H2-4', text: "Whatever it takes — I'm all in" },
          { id: 'H2-5', text: "I'm not sure yet" },
        ],
      },
      {
        id: 'H3',
        section: 'H',
        inputType: 'open_text',
        question: 'A year from now — what is one thing you would love to be able to say about yourself as a goalie that you cannot say today?',
        note: 'This becomes a goal we hold with you. Something to build toward together.',
        evolutionEligible: true,
      },
      {
        id: 'H4',
        section: 'H',
        inputType: 'open_text',
        question: 'Is there anything else you want Coach Mike and the Smarter Goalie team to know about you?',
        note: 'This is your open door. Anything we missed. Anything you want us to hear.',
        options: [{ id: 'H4-skip', text: 'Nothing else right now', isSkip: true }],
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getAllQuestions(): V2Question[] {
  return STUDENT_BASELINE_SECTIONS.flatMap((s) => s.questions);
}

export function getActiveQuestions(
  section: V2Section,
  responses: Record<string, string | string[]>
): V2Question[] {
  return section.questions.filter((q) => {
    if (!q.conditionalLogic) return true;
    const val = responses[q.conditionalLogic.parentId];
    if (!val) return false;
    const arr = Array.isArray(val) ? val : [val];
    return arr.some((v) => q.conditionalLogic!.showWhenIncludes.includes(v));
  });
}
