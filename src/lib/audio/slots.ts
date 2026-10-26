/**
 * Every "Hear Coach Mike" button on the public site, by page.
 *
 * A button's slot is its page address plus its label, so the buttons themselves
 * need no ids: `GemVoiceButton` works its slot out from where it is drawn. Admin
 * attaches a recording to a slot from /admin/coach-audio, and the button appears
 * once that recording is uploaded (Audio Part 2, item 2.2).
 *
 * This list is what admin chooses from. It is checked against the pages by
 * src/__tests__/lib/audio/slots.test.ts, so a button added to a page without a
 * line here fails the tests rather than going missing from admin.
 *
 * Each listed page also has one extra area, drawn by `AudioSlotButtons`, where
 * admin adds new buttons without a developer (the Parent clips, new gems).
 */

export interface AudioSlot {
  /** The page address the button sits on, e.g. '/parent-role'. */
  page: string;
  /** The page as admin sees it in the picker. */
  pageName: string;
  /** The words on the button. Together with `page`, this is the slot. */
  label: string;
}

/** The label of each page's extra area, where admin adds new buttons. */
export const EXTRA_SLOT_LABEL = 'NEW BUTTONS';

export function slotKey(page: string, label: string): string {
  const path = page.length > 1 ? page.replace(/\/+$/, '') : page;
  return `${path}|${label}`;
}

export const BUTTON_SLOTS: readonly AudioSlot[] = [
  { page: '/goalie', pageName: 'Goalie', label: 'HEAR COACH MIKE: WHAT IT MEANS TO BE IN THE RIGHT PLACE' },
  { page: '/goalie', pageName: 'Goalie', label: 'HEAR COACH MIKE: DISCOVERING YOUR GAME, NOT COPYING SOMEONE ELSE\'S' },
  { page: '/goalie', pageName: 'Goalie', label: 'HEAR COACH MIKE: THE FEEL FACTOR AND THE MIND’S EYE' },
  { page: '/goalie', pageName: 'Goalie', label: 'HEAR COACH MIKE: THE DEVELOPMENT LOOP AND WHY NOTHING IS EVER LOST' },
  { page: '/goalie', pageName: 'Goalie', label: 'HEAR COACH MIKE: WHAT SMARTER GOALIE ACTUALLY BUILDS IN A GOALIE' },
  { page: '/goalie', pageName: 'Goalie', label: 'HEAR COACH MIKE: WHAT IT MEANS TO BE A FOUNDING MEMBER' },
  { page: '/parent-role', pageName: 'Parent', label: 'HEAR COACH MIKE: WHAT THE GOALIE PARENT\'S ROLE ACTUALLY IS' },
  { page: '/parent-role', pageName: 'Parent', label: 'HEAR COACH MIKE: THE CAR RIDE HOME AND WHY IT MATTERS MORE THAN THE PRACTICE' },
  { page: '/parent-role', pageName: 'Parent', label: 'HEAR COACH MIKE: WHAT THE BEST GOALIE PARENTS DO DIFFERENTLY' },
  { page: '/parent-role', pageName: 'Parent', label: 'HEAR COACH MIKE: THE PARENT DASHBOARD AND HOW IT WORKS' },
  { page: '/parent-role', pageName: 'Parent', label: 'HEAR COACH MIKE: THE PARENT OBSERVATION CHART AND WHAT IT REVEALS' },
  { page: '/parent-role', pageName: 'Parent', label: 'HEAR COACH MIKE: WHAT YOUR GOALIE IS ACTUALLY BECOMING' },
  { page: '/parent-role', pageName: 'Parent', label: 'HEAR COACH MIKE: WHAT IT MEANS TO BE A FOUNDING MEMBER PARENT' },
  { page: '/goalie-coach', pageName: 'Goalie Coach', label: 'HEAR COACH MIKE: THE GOALIE COACH\'S ROLE AND WHY IT MATTERS MORE THAN ANY OTHER COACHING POSITION' },
  { page: '/goalie-coach', pageName: 'Goalie Coach', label: 'HEAR COACH MIKE: THE RESPECT FACTOR AND THE FEEL FACTOR' },
  { page: '/goalie-coach', pageName: 'Goalie Coach', label: 'HEAR COACH MIKE: THE MATHEMATICAL FRAMEWORK BEHIND THE SMARTER GOALIE SYSTEM' },
  { page: '/goalie-coach', pageName: 'Goalie Coach', label: 'HEAR COACH MIKE: THE GOALIE COACH COMMUNITY AND WHAT WE ARE BUILDING TOGETHER' },
  { page: '/goalie-coach', pageName: 'Goalie Coach', label: 'HEAR COACH MIKE: THE TOOLS AVAILABLE TO THE GOALIE COACH' },
  { page: '/goalie-coach', pageName: 'Goalie Coach', label: 'HEAR COACH MIKE: THE FOUNDING MEMBER OPPORTUNITY FOR GOALIE COACHES' },
  { page: '/team-programs', pageName: 'Coach / Manager', label: 'HEAR COACH MIKE: HOW SMARTER GOALIE WORKS ALONGSIDE YOUR EXISTING PROGRAM' },
  { page: '/team-programs', pageName: 'Coach / Manager', label: 'HEAR COACH MIKE: THE ONE DIRECTIVE PER PRACTICE MODEL' },
  { page: '/team-programs', pageName: 'Coach / Manager', label: 'HEAR COACH MIKE: THE COACH OBSERVATION CHART AND WHAT IT REVEALS' },
  { page: '/team-programs', pageName: 'Coach / Manager', label: 'HEAR COACH MIKE: THE COACH DASHBOARD AND HOW IT WORKS' },
  { page: '/team-programs', pageName: 'Coach / Manager', label: 'HEAR COACH MIKE: THE FOUNDING MEMBER OPPORTUNITY FOR COACHES' },
  { page: '/organization', pageName: 'Organization', label: 'HEAR COACH MIKE: WHAT CONSISTENT ORGANIZATION-WIDE GOALTENDING DEVELOPMENT PRODUCES' },
  { page: '/organization', pageName: 'Organization', label: 'HEAR COACH MIKE: WHAT ORGANIZATIONS ARE MISSING AND WHAT IT COSTS THEM' },
  { page: '/organization', pageName: 'Organization', label: 'HEAR COACH MIKE: THE ORGANIZATION-WIDE SYSTEM AND HOW IT IS STRUCTURED' },
  { page: '/organization', pageName: 'Organization', label: 'HEAR COACH MIKE: THE SCALABILITY ARCHITECTURE AND ADMIN CONTROLS' },
  { page: '/organization', pageName: 'Organization', label: 'HEAR COACH MIKE: THE CUSTOM PACKAGE MODEL AND WHAT THE FIRST CONVERSATION LOOKS LIKE' },
  { page: '/organization', pageName: 'Organization', label: 'HEAR COACH MIKE: WHAT THE FOUNDING ORGANIZATION RELATIONSHIP LOOKS LIKE' },
  { page: '/bridge', pageName: 'The Bridge', label: 'HEAR COACH MIKE: EVERY GOALIE. EVERY SITUATION. BRIDGED.' },
  { page: '/the-system', pageName: 'The System', label: 'Coach Mike: The Complete System' },
  { page: '/the-system', pageName: 'The System', label: 'Coach Mike: The 8 Pillars' },
  { page: '/the-system', pageName: 'The System', label: 'Coach Mike: The Development Loop' },
  { page: '/the-system', pageName: 'The System', label: 'Coach Mike: Your Personal Companion' },
  { page: '/the-system', pageName: 'The System', label: 'Coach Mike: The Motivational Library' },
  { page: '/the-system', pageName: 'The System', label: 'Coach Mike: Your Individual Page' },
  { page: '/the-system', pageName: 'The System', label: 'Coach Mike: The Achievement Engine' },
  { page: '/the-system', pageName: 'The System', label: 'Coach Mike: The Community' },
  { page: '/the-system', pageName: 'The System', label: 'Coach Mike: Program vs. System' },
  { page: '/who-we-are', pageName: 'Who We Are', label: 'HEAR COACH MIKE TELL THIS STORY' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet', label: 'HEAR COACH MIKE: THE SUB-CONSCIOUS MIND AND WHY TRAINING IT CHANGES EVERYTHING' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet', label: 'HEAR COACH MIKE: THE GOALIE\'S RESPONSIBILITY AND WHY THE POSITION IS UNLIKE ANY OTHER IN SPORT' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet', label: 'HEAR COACH MIKE: THE FOUR SCENARIOS AND WHAT THE GOALIE\'S RESPONSIBILITY MEANS IN REAL TERMS' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet', label: 'HEAR COACH MIKE: REPUTATION, PRIDE, AND WHAT IT MEANS TO NEVER LET YOURSELF OR THOSE WHO COACH YOU DOWN' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet', label: 'HEAR COACH MIKE: V.M.P. INTENSITY AND WHY THE ORDER IS NON-NEGOTIABLE' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet', label: 'HEAR COACH MIKE: PRACTICE ATTITUDE AND WHAT IT PRODUCES OVER A FULL SEASON' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet', label: 'HEAR COACH MIKE: SELF-COACHING AND WHY IT IS THE HIGHEST LEVEL OF GOALTENDING DEVELOPMENT' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet', label: 'HEAR COACH MIKE: CHARACTER AS ARCHITECTURE AND WHAT THAT MEANS FOR THE GOALIE\'S LIFE BEYOND HOCKEY' },
  { page: '/pillar/3', pageName: 'Pillar 3 · 7AMS', label: 'HEAR COACH MIKE: THE MOST IMPORTANT RELATIONSHIP AND HOW IT TRANSFORMS YOUR ENTIRE POSITIONAL GAME' },
  { page: '/pillar/3', pageName: 'Pillar 3 · 7AMS', label: 'HEAR COACH MIKE: THE 7AMS AND HOW IT TRANSFORMS POSITIONAL AWARENESS FROM GUESSWORK TO PRECISION' },
  { page: '/pillar/3', pageName: 'Pillar 3 · 7AMS', label: 'HEAR COACH MIKE: THE ALERT SYSTEM — MATCHING YOUR POSITIONAL GAME TO THE LEVEL OF DANGER' },
  { page: '/pillar/3', pageName: 'Pillar 3 · 7AMS', label: 'HEAR COACH MIKE: THE POSITION GAME — YOURS' },
  { page: '/pillar/4', pageName: 'Pillar 4 · The 6 Zone – 7 Point System™', label: 'HEAR COACH MIKE: WHY BELOW THE ICING LINE DESERVES ITS OWN COMPLETE FRAMEWORK' },
  { page: '/pillar/4', pageName: 'Pillar 4 · The 6 Zone – 7 Point System™', label: 'HEAR COACH MIKE: THE 6 ZONE – 7 POINT SYSTEM™ AND HOW IT MAPS EVERY SITUATION BELOW THE ICING LINE' },
  { page: '/pillar/4', pageName: 'Pillar 4 · The 6 Zone – 7 Point System™', label: 'HEAR COACH MIKE: THE READ ALERT — THE PUCK, THE PLAYER, AND HOW TO KEEP THE ADVANTAGE IN YOUR HOUSE' },
  { page: '/pillar/4', pageName: 'Pillar 4 · The 6 Zone – 7 Point System™', label: 'HEAR COACH MIKE: KEEPING THE ADVANTAGE IN YOUR HOUSE' },
  { page: '/pillar/5', pageName: 'Pillar 5 · Form', label: 'HEAR COACH MIKE: TRAINED INTO EXISTENCE — HOW INTELLIGENT GOALTENDING IS BUILT' },
  { page: '/pillar/5', pageName: 'Pillar 5 · Form', label: 'HEAR COACH MIKE: THE WIDE ARRAY OF FORM SKILLS AND HOW EACH ONE IS BUILT FOR YOUR BODY' },
  { page: '/pillar/5', pageName: 'Pillar 5 · Form', label: 'HEAR COACH MIKE: THE LADDER AND HOW EVERY EXECUTION CLIMBS FROM INTRODUCTION TO REFINEMENT' },
  { page: '/pillar/5', pageName: 'Pillar 5 · Form', label: 'HEAR COACH MIKE: THE CONTROL FACTOR AND WHAT CORRECT FORM PRODUCES' },
  { page: '/pillar/6', pageName: 'Pillar 6 · Game & Practice Performance', label: 'HEAR COACH MIKE: THE BASELINE AND WHY THE TAILORED EXPERIENCE STARTS HERE' },
  { page: '/pillar/6', pageName: 'Pillar 6 · Game & Practice Performance', label: 'HEAR COACH MIKE: THE 4 TIERS AND HOW EACH ONE IS EARNED, NEVER RUSHED' },
  { page: '/pillar/6', pageName: 'Pillar 6 · Game & Practice Performance', label: 'HEAR COACH MIKE: THE DEVELOPMENT LOOP AND HOW IT TURNS EVERY GAME INTO A DEVELOPMENT ROADMAP' },
  { page: '/pillar/6', pageName: 'Pillar 6 · Game & Practice Performance', label: 'HEAR COACH MIKE: THE PERFORMANCE DIFFERENCE AND WHAT IT LOOKS LIKE AT EVERY LEVEL' },
  { page: '/pillar/7', pageName: 'Pillar 7 · Lifestyle', label: 'HEAR COACH MIKE: THE PILLAR THAT DECIDES WHAT ALL THE OTHERS ARE WORTH' },
  { page: '/pillar/7', pageName: 'Pillar 7 · Lifestyle', label: 'HEAR COACH MIKE: THE HOURS NOBODY SEES AND WHY THEY DECIDE THE HOURS EVERYONE DOES' },
  { page: '/pillar/7', pageName: 'Pillar 7 · Lifestyle', label: 'HEAR COACH MIKE: FROM PILLAR TO IDENTITY AND WHAT THE INTELLIGENT ATHLETIC GOALTENDER LOOKS LIKE' },
  { page: '/pillar/7', pageName: 'Pillar 7 · Lifestyle', label: 'HEAR COACH MIKE: THE LIFESTYLE DIFFERENCE AND WHAT IT PRODUCES FOR THE REST OF YOUR LIFE' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet', label: 'HEAR COACH MIKE: THE PUZZLE WITH NO PICTURE — WHAT IT MEANS AND WHY IT STILL APPLIES TO EVERY GOALIE TODAY' },
  { page: '/pillar/2', pageName: 'Pillar 2 · Skating', label: 'HEAR COACH MIKE EXPLAIN' },
  { page: '/pillar/2', pageName: 'Pillar 2 · Skating', label: 'HEAR COACH MIKE: THE DECISION-MAKING ENGINE' },
  { page: '/pillar/2', pageName: 'Pillar 2 · Skating', label: 'HEAR COACH MIKE: TECHNIQUE + THE TECHNICAL EYE' },
  { page: '/pillar/7', pageName: 'Pillar 7 · Lifestyle', label: 'HEAR COACH MIKE: EIGHT PILLARS, SIX DECADES, THE RECORD, AND THE INVITATION' },
];

/** Pages that carry an extra area for admin-added buttons. */
export const EXTRA_SLOT_PAGES: readonly { page: string; pageName: string }[] = [
  { page: '/goalie', pageName: 'Goalie' },
  { page: '/parent-role', pageName: 'Parent' },
  { page: '/goalie-coach', pageName: 'Goalie Coach' },
  { page: '/team-programs', pageName: 'Coach / Manager' },
  { page: '/organization', pageName: 'Organization' },
  { page: '/pillar/1', pageName: 'Pillar 1 · MindSet' },
  { page: '/pillar/2', pageName: 'Pillar 2 · Skating' },
  { page: '/pillar/3', pageName: 'Pillar 3 · 7AMS' },
  { page: '/pillar/4', pageName: 'Pillar 4 · The 6 Zone – 7 Point System™' },
  { page: '/pillar/5', pageName: 'Pillar 5 · Form' },
  { page: '/pillar/6', pageName: 'Pillar 6 · Game & Practice Performance' },
  { page: '/pillar/7', pageName: 'Pillar 7 · Lifestyle' },
];

/** Every slot admin can attach a recording to: the buttons, then the extra areas. */
export const ALL_SLOTS: readonly AudioSlot[] = [
  ...BUTTON_SLOTS,
  ...EXTRA_SLOT_PAGES.map(p => ({ page: p.page, pageName: p.pageName, label: EXTRA_SLOT_LABEL })),
];

const KNOWN = new Set(ALL_SLOTS.map(s => slotKey(s.page, s.label)));

export function isKnownSlot(key: string): boolean {
  return KNOWN.has(key);
}
