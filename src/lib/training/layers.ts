/**
 * Knowledge Check Layers: the rules that need no database.
 *
 * Where a question's segment is, what each layer plays, and how a stored rules
 * document is made safe to use. The loop that moves a goalie between layers is
 * Phase 2 and builds on these.
 */

import {
  DEFAULT_LAYER_RULES,
  LAYER_RULE_RANGES,
  type LayerNumber,
  type LayerRules,
  type NumericLayerRule,
} from '@/types/knowledge-layers';
import type { VideoQuizQuestion } from '@/types/video-quiz';

type SegmentQuestion = Pick<VideoQuizQuestion, 'id' | 'timestamp' | 'segmentStart'>;

/** A stretch of the video, in seconds. */
export interface Segment {
  start: number;
  end: number;
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * The part of the video a question is about: from its `segmentStart` (or the
 * previous freeze point, or 0) to its own freeze point.
 *
 * A `segmentStart` at or after the freeze point would leave nothing to replay,
 * so it is ignored and the default used instead.
 */
export function questionSegment(question: SegmentQuestion, allQuestions: readonly SegmentQuestion[]): Segment {
  const end = question.timestamp;
  if (isTime(question.segmentStart) && question.segmentStart < end) {
    return { start: question.segmentStart, end };
  }

  let start = 0;
  for (const other of allQuestions) {
    if (other.id !== question.id && other.timestamp < end && other.timestamp > start) {
      start = other.timestamp;
    }
  }
  return { start, end };
}

/** What the player does on one layer of one question. */
export interface LayerPlayback {
  layer: LayerNumber;
  /** The stretch to replay. Absent on Layer 4, which shows the answer instead. */
  segment?: Segment;
  /** Playback speed for the segment. */
  speed: number;
  /** Support Layer 3: where the frame holds once the segment has played. */
  freezeAt?: number;
  /** Support Layer 3: a photo shown in place of the held frame. */
  freezeImageUrl?: string;
  /** Support Layer 4: the answer, in words. */
  answerText?: string;
  /** Support Layer 4: a photo shown with the answer. */
  answerImageUrl?: string;
}

type PlaybackQuestion = SegmentQuestion & Pick<VideoQuizQuestion, 'layerMedia' | 'explanation'>;

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** How the player presents `layer` of `question`. */
export function layerPlayback(
  question: PlaybackQuestion,
  allQuestions: readonly SegmentQuestion[],
  layer: LayerNumber,
  rules: LayerRules
): LayerPlayback {
  const media = question.layerMedia ?? {};
  const segment = questionSegment(question, allQuestions);

  switch (layer) {
    case 1:
      return { layer, segment, speed: 1 };
    case 2:
      return { layer, segment, speed: rules.layer2Speed };
    case 3: {
      // The held frame has to be inside the segment, or the player would jump.
      const freezeAt =
        isTime(media.freezeAt) && media.freezeAt >= segment.start && media.freezeAt <= segment.end
          ? media.freezeAt
          : segment.end;
      return {
        layer,
        segment,
        speed: rules.layer3Speed,
        freezeAt,
        freezeImageUrl: nonEmpty(media.freezeImageUrl),
      };
    }
    case 4:
      return {
        layer,
        speed: 1,
        answerText: nonEmpty(media.answerText) ?? nonEmpty(question.explanation),
        answerImageUrl: nonEmpty(media.answerImageUrl),
      };
  }
}

/**
 * Turns whatever is stored (or nothing) into complete, in-range rules. Every
 * field that is missing or unusable falls back to its default, so a half-written
 * or hand-edited document can never stall the loop.
 */
export function normalizeLayerRules(raw: unknown): LayerRules {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rules = { ...DEFAULT_LAYER_RULES };

  // Only a stored `true` turns the layers on: anything else leaves goalies with
  // the Knowledge Check as it always was.
  rules.enabled = source.enabled === true;

  for (const key of Object.keys(LAYER_RULE_RANGES) as NumericLayerRule[]) {
    const value = source[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const { min, max, step } = LAYER_RULE_RANGES[key];
    const clamped = Math.min(max, Math.max(min, value));
    // Snap to the step so 0.4999999 is stored and shown as 0.5.
    rules[key] = Number((Math.round(clamped / step) * step).toFixed(4));
  }

  return rules;
}

/** Why a rule as typed cannot be saved, by rule. Empty when all of them can. */
export type LayerRuleProblems = Partial<Record<NumericLayerRule, string>>;

/**
 * Checks rules as admin typed them, before anything is saved. A value outside
 * its range is refused rather than quietly pulled in, and the support layers
 * must each be slower than the one before: regular, then Layer 2, then Layer 3.
 */
export function layerRuleProblems(rules: LayerRules): LayerRuleProblems {
  const problems: LayerRuleProblems = {};

  for (const key of Object.keys(LAYER_RULE_RANGES) as NumericLayerRule[]) {
    const value = rules[key];
    const { min, max, step } = LAYER_RULE_RANGES[key];
    if (!Number.isFinite(value) || value < min || value > max) {
      problems[key] = `Use a number from ${min} to ${max}.`;
    } else if (step === 1 && !Number.isInteger(value)) {
      problems[key] = 'Use a whole number.';
    }
  }

  if (!problems.layer2Speed && rules.layer2Speed >= 1) {
    problems.layer2Speed = 'Layer 2 must replay slower than regular speed (below 1×).';
  }
  if (!problems.layer3Speed && !problems.layer2Speed && rules.layer3Speed >= rules.layer2Speed) {
    problems.layer3Speed = `Layer 3 must be slower than Layer 2 (below ${rules.layer2Speed}×).`;
  }

  return problems;
}
