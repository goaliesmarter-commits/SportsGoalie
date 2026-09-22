/**
 * Coach Audio — Michael's recorded voice lines.
 *
 * Naming note: this codebase already uses "voice" for the parent feedback
 * feature (`parent_voice_submissions`, /admin/voice-queue). That is unrelated
 * to audio. Everything to do with Coach Mike's recordings is "coach audio".
 *
 * Two halves, deliberately kept apart:
 *
 *   COACH_AUDIO_CATALOGUE — what *should* exist. A code constant, because the
 *   IDs and the script lines are settled and are not editable data. Michael
 *   fixed these in the 9 September copy pack.
 *
 *   CoachAudioClip (Firestore) — what *has been uploaded*. One document per
 *   catalogue ID, keyed by the ID itself.
 *
 * Keeping them separate is what lets the admin screen show a clip as MISSING
 * rather than simply not showing it. On 12 September Michael sent 51 of the 59
 * files; the eight pillar intros (V-A-19 to V-A-26) were not in the folder even
 * though his pack said only MindSet was outstanding. A catalogue that lives in
 * code makes that kind of gap visible instead of silent.
 */

/** The five recording groups from Section 2 of the copy pack. */
export type CoachAudioPart =
  | 'orientation' // Part 1 · V-A-01 to V-A-05
  | 'systems' // Part 2 · V-A-06 to V-A-17
  | 'pillars' // Part 3 · V-A-18 to V-A-26
  | 'utility' // Part 4 · V-A-27 to V-A-37
  | 'triggers'; // Part 5 · V-B-01 to V-B-22

export const COACH_AUDIO_PART_LABELS: Record<CoachAudioPart, string> = {
  orientation: 'Part 1 — Orientation',
  systems: 'Part 2 — The Systems',
  pillars: 'Part 3 — The 8 Pillars',
  utility: 'Part 4 — Utility',
  triggers: 'Part 5 — Trigger messages',
};

export const COACH_AUDIO_PART_ORDER: CoachAudioPart[] = [
  'orientation',
  'systems',
  'pillars',
  'utility',
  'triggers',
];

/** One expected recording. */
export interface CoachAudioCatalogueEntry {
  /** e.g. 'V-A-01'. Also the Firestore document id and the storage filename. */
  id: string;
  part: CoachAudioPart;
  /** The words Michael reads. Used as the accessible transcript and as the admin label. */
  scriptLine: string;
  /**
   * For V-B clips only: the Block B message id this reads verbatim (B-01 ... B-22).
   * The mapping is one-to-one by design — Michael's pack says "no lookup table needed".
   */
  readsMessageId?: string;
  /** Set when the clip is known not to have been recorded yet, with the reason. */
  notYetRecorded?: string;
}

/** An uploaded recording. Firestore: `coach_audio_clips/{id}`. */
export interface CoachAudioClip {
  /** Matches a CoachAudioCatalogueEntry.id. */
  id: string;
  url: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  /** Read off the audio element at upload time. Null if the browser could not decode it. */
  durationSeconds: number | null;
  /** The name of the file as Michael sent it, kept for the audit trail. */
  originalFilename: string;
  uploadedAt: Date;
  updatedAt: Date;
}

/** A catalogue entry joined to its clip, if one has been uploaded. */
export interface CoachAudioStatus {
  entry: CoachAudioCatalogueEntry;
  clip: CoachAudioClip | null;
}

/* ─── The catalogue ──────────────────────────────────────────────────────────
 *
 * 59 entries. Script lines are transcribed from the manifest Michael supplied
 * alongside the .wav files on 12 September.
 *
 * Two deliberate divergences from the written copy pack, both his and both
 * correct:
 *
 *   V-B-18 drops the "[N] weeks running." opening — he cannot speak a number
 *   that changes, so the streak count has to be rendered as on-screen text
 *   beside the audio.
 *
 *   V-B-22 records only the banner line, not the sub-line. The sub-line was
 *   always meant to be read rather than heard.
 */

export const COACH_AUDIO_CATALOGUE: CoachAudioCatalogueEntry[] = [
  // ── Part 1 · Orientation ──────────────────────────────────────────────────
  {
    id: 'V-A-01',
    part: 'orientation',
    scriptLine:
      "Welcome in. I'm Michael. Six decades on this, and one system - and from here on you're going to hear it from me, not from a manual.",
  },
  {
    id: 'V-A-02',
    part: 'orientation',
    scriptLine:
      "This isn't a video library. Nothing here moves until you put something in. You chart, I read it, and I come back to you. That's the loop.",
  },
  {
    id: 'V-A-03',
    part: 'orientation',
    scriptLine:
      "Built Not Born. I mean that literally. Nobody handed me anything, and nobody is going to hand you anything either. What you'll have at the end of this is the thing you built.",
  },
  {
    id: 'V-A-04',
    part: 'orientation',
    scriptLine:
      "One rule that matters more than any technique I'll teach you. Chart what actually happened. A chart you shade to look good teaches me nothing, and it teaches you less.",
  },
  {
    id: 'V-A-05',
    part: 'orientation',
    scriptLine:
      "You don't need an hour. You need one honest chart and five minutes of thinking about it. Do that four times a week and you'll pass goalies who are on the ice twice as much as you.",
  },

  // ── Part 2 · The Systems ──────────────────────────────────────────────────
  {
    id: 'V-A-06',
    part: 'systems',
    scriptLine:
      'The 7 Angle-Marker System. Seven markers, above the icing line. It tells you where you stand before the puck ever tells you anything.',
  },
  {
    id: 'V-A-07',
    part: 'systems',
    scriptLine:
      'The 6 Zone, 7 Point System. Below the icing line. Six zones, seven points, and it is the part of the ice most goalies were never taught at all.',
  },
  {
    id: 'V-A-08',
    part: 'systems',
    scriptLine:
      'Learn this once and it cuts your work in half. One and seven are the same. Two and six are the same. Three and five are the same. Four is the dividing line. The only thing that truly changes side to side is the wrap-around - glove or stick.',
  },
  {
    id: 'V-A-09',
    part: 'systems',
    scriptLine:
      "The 4 Level Arch System. Level one, top of the crease. Level two, low slot. Level three, mid slot. Level four, high slot. Depth is not a feeling. It's a decision, and it has a number.",
  },
  {
    id: 'V-A-10',
    part: 'systems',
    scriptLine:
      'Three lanes on the attack. Left, center, right. A lane is information. Most goalies have it and never use it.',
  },
  {
    id: 'V-A-11',
    part: 'systems',
    scriptLine:
      'In the game, performance runs on V.M.P: Visual, Mental, Physical. You see it, your mind reads it, your body responds. That order is simple science, and understanding it is powerful.',
  },
  {
    id: 'V-A-12',
    part: 'systems',
    scriptLine:
      'No wasted movement, no wasted energy, no wasted time. Waste one and you waste all three.',
  },
  {
    id: 'V-A-13',
    part: 'systems',
    scriptLine:
      "The Factor Ratio is the number that says whether the work is working. It isn't a grade and it isn't a score. It's a mirror.",
  },
  {
    id: 'V-A-14',
    part: 'systems',
    scriptLine:
      "Your Mind-Vault. Everything you write in here is yours, permanently. Read it back in a month - you'll find your progress was written down before you ever felt it.",
  },
  {
    id: 'V-A-15',
    part: 'systems',
    scriptLine:
      "The Feel Factor is the part nobody else on your team is writing down. It's also the part that tells me the most.",
  },
  {
    id: 'V-A-16',
    part: 'systems',
    scriptLine:
      "Knowledge Acquisition Confirmation. It means you don't just know it. You can use it. That is the only kind of knowing that has ever been worth anything to a goalie.",
  },
  {
    id: 'V-A-17',
    part: 'systems',
    scriptLine:
      "Chart. Read. Change one thing. Chart again. That's the loop, and it never closes - it just gets faster.",
  },

  // ── Part 3 · The 8 Pillars ────────────────────────────────────────────────
  {
    id: 'V-A-18',
    part: 'pillars',
    scriptLine:
      'MindSet. Skating Tech. The 7 Angle-Marker System. The 6 Zone 7 Point System. Form Tech. Game Performance Charting System. Practice System. Lifestyle and Hockey.',
  },
  {
    id: 'V-A-19',
    part: 'pillars',
    scriptLine: 'Pillar 1 intro — MindSet.',
    notYetRecorded:
      'Michael has said this one is not written yet: "that one is mine to write and it is the only one outstanding."',
  },
  {
    id: 'V-A-20',
    part: 'pillars',
    scriptLine: 'Pillar 2 intro — Skating Tech.',
    notYetRecorded: 'Written per his copy pack, but not in the 12 September folder.',
  },
  {
    id: 'V-A-21',
    part: 'pillars',
    scriptLine: 'Pillar 3 intro — 7 Angle-Marker System (7AMS).',
    notYetRecorded: 'Written per his copy pack, but not in the 12 September folder.',
  },
  {
    id: 'V-A-22',
    part: 'pillars',
    scriptLine: 'Pillar 4 intro — 6 Zone – 7 Point System™ (6Z-7PS).',
    notYetRecorded: 'Written per his copy pack, but not in the 12 September folder.',
  },
  {
    id: 'V-A-23',
    part: 'pillars',
    scriptLine: 'Pillar 5 intro — Form Tech.',
    notYetRecorded: 'Written per his copy pack, but not in the 12 September folder.',
  },
  {
    id: 'V-A-24',
    part: 'pillars',
    scriptLine: 'Pillar 6 intro — Game Performance Charting System.',
    notYetRecorded: 'Written per his copy pack, but not in the 12 September folder.',
  },
  {
    id: 'V-A-25',
    part: 'pillars',
    scriptLine: 'Pillar 7 intro — Practice System.',
    notYetRecorded: 'Written per his copy pack, but not in the 12 September folder.',
  },
  {
    id: 'V-A-26',
    part: 'pillars',
    scriptLine: 'Pillar 8 intro — Lifestyle & Hockey.',
    notYetRecorded: 'Written per his copy pack, but not in the 12 September folder.',
  },

  // ── Part 4 · Utility ──────────────────────────────────────────────────────
  { id: 'V-A-27', part: 'utility', scriptLine: 'Chart saved.' },
  { id: 'V-A-28', part: 'utility', scriptLine: 'Got it.' },
  { id: 'V-A-29', part: 'utility', scriptLine: "That's in your record." },
  { id: 'V-A-30', part: 'utility', scriptLine: 'Take your time.' },
  { id: 'V-A-31', part: 'utility', scriptLine: 'Go ahead.' },
  { id: 'V-A-32', part: 'utility', scriptLine: "Let's go back one step." },
  { id: 'V-A-33', part: 'utility', scriptLine: 'Say that again for me.' },
  { id: 'V-A-34', part: 'utility', scriptLine: "I didn't catch that one." },
  { id: 'V-A-35', part: 'utility', scriptLine: "Nothing here yet. That's normal on day one." },
  { id: 'V-A-36', part: 'utility', scriptLine: "That's all for today." },
  { id: 'V-A-37', part: 'utility', scriptLine: 'Good. Next.' },

  // ── Part 5 · Trigger messages (read B-01 to B-22 verbatim) ────────────────
  {
    id: 'V-B-01',
    part: 'triggers',
    readsMessageId: 'B-01',
    scriptLine:
      "That's your first chart in - and now it means something, because I can see what you saw. Do the next one the same way: honest, even when the number isn't pretty. A chart you shade to look good teaches me nothing, and it teaches you less.",
  },
  {
    id: 'V-B-02',
    part: 'triggers',
    readsMessageId: 'B-02',
    scriptLine: "Chart's in. It's on your record. Keep the loop turning.",
  },
  {
    id: 'V-B-03',
    part: 'triggers',
    readsMessageId: 'B-03',
    scriptLine:
      "Your Factor Ratio moved the right way. That isn't luck - that's the loop working. Now don't change three things. Change nothing, run it again, and let's see if it holds.",
  },
  {
    id: 'V-B-04',
    part: 'triggers',
    readsMessageId: 'B-04',
    scriptLine:
      'Your Factor Ratio came down. Before you take that the wrong way - a drop after a good stretch almost always means you started guessing instead of reading. Go back to your angle first. Read, then move.',
  },
  {
    id: 'V-B-05',
    part: 'triggers',
    readsMessageId: 'B-05',
    scriptLine:
      "Same number, three times running. Flat isn't failure - it's a plateau, and a plateau means the work stopped asking you a question. Pick the one zone you've been avoiding and put it in front of yourself.",
  },
  {
    id: 'V-B-06',
    part: 'triggers',
    readsMessageId: 'B-06',
    scriptLine:
      "You're losing the same marker in the 7 Angle-Marker System. That's not a reflex problem - that's an angle you haven't settled yet. Stand on that marker with no puck and find your line before you ever play it live.",
  },
  {
    id: 'V-B-07',
    part: 'triggers',
    readsMessageId: 'B-07',
    scriptLine:
      "Here's something your own chart just told me. Below the icing line, 1 and 7 are the same. 2 and 6 are the same. 3 and 5 are the same. 4 is the dividing line. You're strong on one side of that line and losing on its mirror - same read, same footwork. The only thing that genuinely changes side to side is the wrap-around, glove or stick. Fix the mirror and you fix both. Waste one and you waste all three.",
  },
  {
    id: 'V-B-08',
    part: 'triggers',
    readsMessageId: 'B-08',
    scriptLine:
      "Your losses are stacking at one level of the Arch. Depth isn't a feeling - it's a decision. Top of the Crease. Low Slot. Mid Slot. High Slot. Name the level you were standing on before that shot. If you can't name it, that's your answer.",
  },
  {
    id: 'V-B-09',
    part: 'triggers',
    readsMessageId: 'B-09',
    scriptLine:
      "They're beating you out of the same lane. Left, Center, Right - a lane is information, and right now you're not using it. In your next practice, call the lane out loud before the shot comes. Out loud.",
  },
  {
    id: 'V-B-10',
    part: 'triggers',
    readsMessageId: 'B-10',
    scriptLine:
      "You've got flags in more than one place this week. That usually isn't ten problems - it's one, showing up ten ways, and it's usually tired legs or a rushed read. Don't rebuild anything. Pick the earliest thing in the sequence and fix that.",
  },
  {
    id: 'V-B-11',
    part: 'triggers',
    readsMessageId: 'B-11',
    scriptLine:
      "Seven days, no chart. I'm not chasing you - I'm telling you the loop is open. Close it with one chart.",
  },
  {
    id: 'V-B-12',
    part: 'triggers',
    readsMessageId: 'B-12',
    scriptLine:
      "Three weeks. Whatever pushed you off the ice or off this - I've seen all of it before, and none of it is the end of anything. One chart puts you back in. Start there.",
  },
  {
    id: 'V-B-13',
    part: 'triggers',
    readsMessageId: 'B-13',
    scriptLine:
      "You're back. Don't try to make up three weeks in one day - that's how a goalie gets hurt and discouraged in the same week. One chart. One zone. Today.",
  },
  {
    id: 'V-B-14',
    part: 'triggers',
    readsMessageId: 'B-14',
    scriptLine:
      "Knowledge Acquisition Confirmed. That means you don't just know it - you can use it. That's the only kind of knowing that's ever been worth anything to a goalie.",
  },
  {
    id: 'V-B-15',
    part: 'triggers',
    readsMessageId: 'B-15',
    scriptLine:
      'Not confirmed yet - and nobody is timing you. Go back through it once more, then answer it in your own words instead of mine. Your words are the test.',
  },
  {
    id: 'V-B-16',
    part: 'triggers',
    readsMessageId: 'B-16',
    scriptLine:
      "That's in your Mind-Vault now. Read it again in a month. You'll be surprised how much of your progress was written down before you ever felt it.",
  },
  {
    id: 'V-B-17',
    part: 'triggers',
    readsMessageId: 'B-17',
    scriptLine:
      "Logged. The Feel Factor is the part nobody else on your team is writing down, and it's the part that tells me the most.",
  },
  {
    id: 'V-B-18',
    part: 'triggers',
    readsMessageId: 'B-18',
    scriptLine:
      'Consistency is the rarest thing I see in this game, and right now you have it. Protect it.',
  },
  {
    id: 'V-B-19',
    part: 'triggers',
    readsMessageId: 'B-19',
    scriptLine:
      "The run stopped. It happens to everyone who has ever had one. Don't mourn it - start the next one today.",
  },
  {
    id: 'V-B-20',
    part: 'triggers',
    readsMessageId: 'B-20',
    scriptLine:
      "Your video is in. I'll watch it myself. You'll see the clock running on your account, so you know exactly what time went into it. That's how I work - you see what you're getting.",
  },
  {
    id: 'V-B-21',
    part: 'triggers',
    readsMessageId: 'B-21',
    scriptLine:
      'Your review is ready. Watch it twice. Once for what I say. Once for what you were doing before the puck ever moved.',
  },
  {
    id: 'V-B-22',
    part: 'triggers',
    readsMessageId: 'B-22',
    scriptLine: 'Michael has a message waiting.',
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const CATALOGUE_BY_ID = new Map(COACH_AUDIO_CATALOGUE.map(e => [e.id, e]));

export function getCoachAudioEntry(id: string): CoachAudioCatalogueEntry | undefined {
  return CATALOGUE_BY_ID.get(id);
}

export function isCoachAudioId(id: string): boolean {
  return CATALOGUE_BY_ID.has(id);
}

/**
 * Pull the clip id out of a filename Michael sent.
 *
 *   SG_VOICE_V-A-01.wav  ->  V-A-01
 *   sg_voice_v-b-22.mp3  ->  V-B-22
 *   V-A-07.wav           ->  V-A-07
 *
 * Returns null when the filename does not resolve to a known catalogue id, so
 * the caller can reject an unexpected file rather than storing it under a
 * guessed id.
 */
export function coachAudioIdFromFilename(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, '');
  const match = base.match(/(V[-_]?[AB][-_]?\d{2})$/i);
  if (!match) return null;

  const normalized = match[1]
    .toUpperCase()
    .replace(/_/g, '-')
    .replace(/^V-?([AB])-?(\d{2})$/, 'V-$1-$2');

  return isCoachAudioId(normalized) ? normalized : null;
}

/** The Block B message id a trigger clip reads, or null for non-trigger clips. */
export function coachAudioReadsMessage(id: string): string | null {
  return CATALOGUE_BY_ID.get(id)?.readsMessageId ?? null;
}

/** Audio formats accepted on upload. mp3 is preferred for delivery; wav is the master. */
export const COACH_AUDIO_ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
];

/** 25 MB. The longest line Michael recorded is 31 seconds, so this is generous. */
export const COACH_AUDIO_MAX_BYTES = 25 * 1024 * 1024;
