/**
 * Knowledge Check Layers (Build 1, Schedule A): the shapes behind the layers.
 *
 * A goalie is not marked down for a missed question. The question's own segment
 * of the video plays again, slower each time, until it clicks:
 *
 *   Layer 1          regular speed
 *   Support Layer 2  half speed
 *   Support Layer 3  quarter speed, ending on a held frame or a photo
 *   Support Layer 4  the answer is shown
 *
 * Phase 1 (Foundation) lays down three things the later phases build on: where
 * each question's segment is and what its slow layers show, the rules as admin
 * settings, and a learning record that keeps every attempt.
 */

/** 1 is the regular question; 2 to 4 are the support layers. */
export type LayerNumber = 1 | 2 | 3 | 4;

export const LAYER_NUMBERS: readonly LayerNumber[] = [1, 2, 3, 4];

/**
 * What the slow layers show for one question, set by admin on the question.
 * Everything is optional: an absent field falls back to something sensible (see
 * `layerPlayback` in `lib/training/layers.ts`).
 */
export interface QuestionLayerMedia {
  /**
   * Where Support Layer 3 holds the frame, in seconds. Absent holds on the
   * question's own freeze point.
   */
  freezeAt?: number;
  /** A photo shown on Support Layer 3 instead of the held frame. */
  freezeImageUrl?: string;
  /** What Support Layer 4 says. Absent falls back to the question's explanation. */
  answerText?: string;
  /** A photo shown with the answer on Support Layer 4. */
  answerImageUrl?: string;
}

/**
 * The layer rules, as Michael sets them from admin. Every number in the brief is
 * here so none of them is fixed in code.
 *
 * One document, `knowledge_check_settings/layers`.
 */
export interface LayerRules {
  /**
   * Whether goalies get the layers at all. Off until Michael turns it on, so the
   * loop can be shipped and tried by admin before any goalie meets it. Off means
   * a Knowledge Check plays exactly as it did before the layers.
   */
  enabled: boolean;
  /** Playback speed of Support Layer 2. */
  layer2Speed: number;
  /** Playback speed of Support Layer 3. */
  layer3Speed: number;
  /** Misses on Support Layer 2 before the goalie is taken straight to the answer (Layer 4). */
  layer2AttemptsBeforeAnswer: number;
  /** Misses on Support Layer 3 before the answer (Layer 4) opens. */
  layer3AttemptsBeforeAnswer: number;
  /** A question is owned when it is right this many times in a row... */
  ownedCorrectInARow: number;
  /** ...across at least this many different sessions. */
  ownedSessions: number;
  /** Minutes of no activity after which the next answer starts a new session. */
  sessionGapMinutes: number;
  /** Building Blocks: how many new steps are added at a time. */
  buildingBlockSize: number;
}

export const DEFAULT_LAYER_RULES: LayerRules = {
  enabled: false,
  layer2Speed: 0.5,
  layer3Speed: 0.25,
  layer2AttemptsBeforeAnswer: 3,
  layer3AttemptsBeforeAnswer: 2,
  ownedCorrectInARow: 2,
  ownedSessions: 2,
  sessionGapMinutes: 60,
  buildingBlockSize: 2,
};

/** The rules that are numbers, which is all of them but the switch. */
export type NumericLayerRule = Exclude<keyof LayerRules, 'enabled'>;

/** What admin may set each number to. Anything outside is pulled back in. */
export const LAYER_RULE_RANGES: Record<NumericLayerRule, { min: number; max: number; step: number }> = {
  layer2Speed: { min: 0.25, max: 0.95, step: 0.05 },
  layer3Speed: { min: 0.1, max: 0.9, step: 0.05 },
  layer2AttemptsBeforeAnswer: { min: 1, max: 10, step: 1 },
  layer3AttemptsBeforeAnswer: { min: 1, max: 10, step: 1 },
  ownedCorrectInARow: { min: 1, max: 10, step: 1 },
  ownedSessions: { min: 1, max: 10, step: 1 },
  sessionGapMinutes: { min: 5, max: 7 * 24 * 60, step: 5 },
  buildingBlockSize: { min: 1, max: 10, step: 1 },
};

/** How a single attempt went. Reflective questions have no right answer. */
export type AttemptOutcome = 'correct' | 'incorrect' | 'reflective';

/**
 * One line of the learning record: one answer to one question, on one layer.
 *
 * Collection `learning_record`. Lines are only ever added: the Firestore rules
 * refuse every update and delete, admin included, so the record of how a goalie
 * learned is never rewritten. Sessions, owned status, the Focus List and every
 * view in Phase 5 are worked out from these lines rather than stored beside them.
 */
export interface LearningRecordEntry {
  id: string;
  userId: string;
  videoQuizId: string;
  questionId: string;
  skillId: string;
  sportId: string;
  /** The `video_quiz_progress` attempt this answer belongs to. */
  attemptId: string;
  layer: LayerNumber;
  outcome: AttemptOutcome;
  /** The answer in words, as the goalie saw it. */
  answerText: string;
  /** Seconds from the question showing to the answer. */
  timeToAnswer: number;
  /** Milliseconds since the epoch, from the goalie's device. */
  answeredAt: number;
  /**
   * Which round of the loop: 1 is the first pass with the video, 2 the retest
   * of every question, 3 on the misses only. Absent on lines written before the
   * loop existed, which were all round 1.
   */
  round?: number;
}

/** A learning record line as it is written, before Firestore gives it an id. */
export type NewLearningRecordEntry = Omit<LearningRecordEntry, 'id'>;
