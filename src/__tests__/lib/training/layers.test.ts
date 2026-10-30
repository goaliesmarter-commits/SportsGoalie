import { describe, it, expect } from 'vitest';
import { layerPlayback, normalizeLayerRules, questionSegment } from '@/lib/training/layers';
import { DEFAULT_LAYER_RULES } from '@/types/knowledge-layers';

const q = (id: string, timestamp: number, extra: Record<string, unknown> = {}) => ({ id, timestamp, ...extra });

describe('questionSegment', () => {
  const questions = [q('a', 20), q('b', 45), q('c', 90)];

  it('runs from the start of the clip to the first freeze point', () => {
    expect(questionSegment(questions[0], questions)).toEqual({ start: 0, end: 20 });
  });

  it('runs from the previous freeze point to this one', () => {
    expect(questionSegment(questions[2], questions)).toEqual({ start: 45, end: 90 });
  });

  it('does not depend on the order the questions are stored in', () => {
    const shuffled = [questions[2], questions[0], questions[1]];
    expect(questionSegment(questions[1], shuffled)).toEqual({ start: 20, end: 45 });
  });

  it('uses the segment start admin set', () => {
    const set = q('c', 90, { segmentStart: 60 });
    expect(questionSegment(set, [...questions.slice(0, 2), set])).toEqual({ start: 60, end: 90 });
  });

  it('may reach back past the previous freeze point', () => {
    const set = q('c', 90, { segmentStart: 10 });
    expect(questionSegment(set, [...questions.slice(0, 2), set])).toEqual({ start: 10, end: 90 });
  });

  it('ignores a segment start at or after the freeze point, which would leave nothing to replay', () => {
    const atEnd = q('c', 90, { segmentStart: 90 });
    const after = q('c', 90, { segmentStart: 120 });
    expect(questionSegment(atEnd, [...questions.slice(0, 2), atEnd])).toEqual({ start: 45, end: 90 });
    expect(questionSegment(after, [...questions.slice(0, 2), after])).toEqual({ start: 45, end: 90 });
  });

  it('ignores a segment start that is not a time', () => {
    const bad = q('c', 90, { segmentStart: Number.NaN });
    expect(questionSegment(bad, [...questions.slice(0, 2), bad])).toEqual({ start: 45, end: 90 });
  });

  it('treats another question at the same moment as no boundary', () => {
    const twins = [q('a', 30), q('b', 30)];
    expect(questionSegment(twins[1], twins)).toEqual({ start: 0, end: 30 });
  });
});

describe('layerPlayback', () => {
  const rules = DEFAULT_LAYER_RULES;
  const first = q('a', 20);

  it('plays Layer 1 at regular speed', () => {
    const question = q('b', 45);
    expect(layerPlayback(question, [first, question], 1, rules)).toEqual({
      layer: 1,
      segment: { start: 20, end: 45 },
      speed: 1,
    });
  });

  it('plays Support Layer 2 at the speed admin set', () => {
    const question = q('b', 45);
    expect(layerPlayback(question, [first, question], 2, { ...rules, layer2Speed: 0.6 }).speed).toBe(0.6);
  });

  it('plays Support Layer 3 slower and holds on the freeze point by default', () => {
    const question = q('b', 45);
    expect(layerPlayback(question, [first, question], 3, rules)).toEqual({
      layer: 3,
      segment: { start: 20, end: 45 },
      speed: 0.25,
      freezeAt: 45,
      freezeImageUrl: undefined,
    });
  });

  it('holds Support Layer 3 where admin set, with the photo', () => {
    const question = q('b', 45, { layerMedia: { freezeAt: 38, freezeImageUrl: ' https://x/photo.jpg ' } });
    const playback = layerPlayback(question, [first, question], 3, rules);
    expect(playback.freezeAt).toBe(38);
    expect(playback.freezeImageUrl).toBe('https://x/photo.jpg');
  });

  it('ignores a Layer 3 hold outside the segment', () => {
    const question = q('b', 45, { layerMedia: { freezeAt: 10 } });
    expect(layerPlayback(question, [first, question], 3, rules).freezeAt).toBe(45);
  });

  it('shows the answer admin wrote on Support Layer 4, with no replay', () => {
    const question = q('b', 45, {
      explanation: 'Stay square.',
      layerMedia: { answerText: 'Square to the puck.', answerImageUrl: 'https://x/a.jpg' },
    });
    expect(layerPlayback(question, [first, question], 4, rules)).toEqual({
      layer: 4,
      speed: 1,
      answerText: 'Square to the puck.',
      answerImageUrl: 'https://x/a.jpg',
    });
  });

  it('falls back to the explanation when no answer is written', () => {
    const question = q('b', 45, { explanation: 'Stay square.', layerMedia: { answerText: '   ' } });
    expect(layerPlayback(question, [first, question], 4, rules).answerText).toBe('Stay square.');
  });
});

describe('normalizeLayerRules', () => {
  it('gives the defaults when nothing is stored', () => {
    expect(normalizeLayerRules(null)).toEqual(DEFAULT_LAYER_RULES);
    expect(normalizeLayerRules('nonsense')).toEqual(DEFAULT_LAYER_RULES);
  });

  it('keeps stored values and fills the missing ones', () => {
    expect(normalizeLayerRules({ ownedSessions: 3 })).toEqual({ ...DEFAULT_LAYER_RULES, ownedSessions: 3 });
  });

  it('pulls values back into range', () => {
    const rules = normalizeLayerRules({ layer2Speed: 4, layer3AttemptsBeforeAnswer: 0, sessionGapMinutes: 1 });
    expect(rules.layer2Speed).toBe(1);
    expect(rules.layer3AttemptsBeforeAnswer).toBe(1);
    expect(rules.sessionGapMinutes).toBe(5);
  });

  it('snaps to the step, so counts stay whole and speeds stay tidy', () => {
    const rules = normalizeLayerRules({ ownedCorrectInARow: 2.6, layer3Speed: 0.2499999 });
    expect(rules.ownedCorrectInARow).toBe(3);
    expect(rules.layer3Speed).toBe(0.25);
  });

  it('ignores values that are not numbers', () => {
    const rules = normalizeLayerRules({ layer2Speed: '0.75', ownedSessions: null, buildingBlockSize: Number.NaN });
    expect(rules).toEqual(DEFAULT_LAYER_RULES);
  });
});
