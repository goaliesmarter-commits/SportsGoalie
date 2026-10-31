import { describe, it, expect } from 'vitest';
import {
  acknowledgeAnswer,
  answerQuestion,
  currentStep,
  moveToFront,
  startLoop,
  type LoopState,
} from '@/lib/training/layer-loop';
import { DEFAULT_LAYER_RULES } from '@/types/knowledge-layers';

const rules = DEFAULT_LAYER_RULES; // Layer 3 twice before the answer

/** Applies a list of moves: true/false answers the current question, 'seen' acknowledges Layer 4. */
function play(state: LoopState, moves: (boolean | 'seen')[]): LoopState {
  return moves.reduce(
    (s, move) => (move === 'seen' ? acknowledgeAnswer(s) : answerQuestion(s, move, rules)),
    state
  );
}

describe('the loop', () => {
  it('asks the first question at Layer 1 in round 1', () => {
    expect(currentStep(startLoop(['a', 'b']))).toEqual({ kind: 'ask', questionId: 'a', layer: 1, round: 1 });
  });

  it('is done straight away with no questions', () => {
    expect(currentStep(startLoop([]))).toEqual({ kind: 'done', rounds: 1 });
  });

  it('moves on after a right answer', () => {
    const s = play(startLoop(['a', 'b']), [true]);
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'b', layer: 1, round: 1 });
  });

  it('finishes after one round when everything is right first time', () => {
    const s = play(startLoop(['a', 'b']), [true, true]);
    expect(currentStep(s)).toEqual({ kind: 'done', rounds: 1 });
  });

  it('sends a miss to Layer 2, then Layer 3', () => {
    let s = play(startLoop(['a']), [false]);
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'a', layer: 2, round: 1 });
    s = play(s, [false]);
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'a', layer: 3, round: 1 });
  });

  it('runs Layer 3 as many times as admin allows, then shows the answer', () => {
    let s = play(startLoop(['a']), [false, false, false]); // L1, L2, first L3
    expect(currentStep(s)).toMatchObject({ kind: 'ask', layer: 3 });
    s = play(s, [false]); // second L3
    expect(currentStep(s)).toEqual({ kind: 'answer', questionId: 'a', round: 1 });
  });

  it('follows the admin setting for Layer 3 tries', () => {
    const three = { ...rules, layer3AttemptsBeforeAnswer: 3 };
    let s = startLoop(['a']);
    for (const correct of [false, false, false, false]) s = answerQuestion(s, correct, three);
    expect(currentStep(s)).toMatchObject({ kind: 'ask', layer: 3 });
    s = answerQuestion(s, false, three);
    expect(currentStep(s)).toMatchObject({ kind: 'answer' });
  });

  it('carries on to the next question once the answer has been seen', () => {
    const s = play(startLoop(['a', 'b']), [false, false, false, false, 'seen']);
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'b', layer: 1, round: 1 });
  });

  it('retests every question in round 2 after a miss in round 1', () => {
    const s = play(startLoop(['a', 'b', 'c']), [true, false, true, true]); // b missed, right on Layer 2
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'a', layer: 1, round: 2 });
    expect(s.queue).toEqual(['a', 'b', 'c']);
  });

  it('counts a question as missed even when it was right on a support layer', () => {
    const s = play(startLoop(['a']), [false, true]);
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'a', layer: 1, round: 2 });
  });

  it('asks only the questions still being missed from round 3 on', () => {
    // Round 1: b missed. Round 2 (all): a right, b right, c missed. Round 3: only c.
    const s = play(startLoop(['a', 'b', 'c']), [true, false, true, true, true, true, false, true]);
    expect(s.round).toBe(3);
    expect(s.queue).toEqual(['c']);
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'c', layer: 1, round: 3 });
  });

  it('finishes when a round has no misses', () => {
    const s = play(startLoop(['a', 'b']), [false, true, true, true, true]); // r1 a missed; r2 all right
    expect(currentStep(s)).toEqual({ kind: 'done', rounds: 2 });
  });

  it('starts every question in a new round back at Layer 1', () => {
    const s = play(startLoop(['a']), [false, false, false, false, 'seen']);
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'a', layer: 1, round: 2 });
    expect(s.current?.layer3Tries).toBe(0);
  });

  it('ignores an answer while the answer is being shown, and an acknowledgement while asking', () => {
    const atAnswer = play(startLoop(['a']), [false, false, false, false]);
    expect(answerQuestion(atAnswer, true, rules)).toBe(atAnswer);
    const asking = startLoop(['a']);
    expect(acknowledgeAnswer(asking)).toBe(asking);
  });

  it('ignores answers once done', () => {
    const done = play(startLoop(['a']), [true]);
    expect(answerQuestion(done, false, rules)).toBe(done);
  });

  it('asks each question once even if the list repeats it', () => {
    expect(startLoop(['a', 'a', 'b']).all).toEqual(['a', 'b']);
  });

  it('takes a question reached early (the goalie skipped ahead) and keeps the skipped one for later', () => {
    let s = moveToFront(startLoop(['a', 'b', 'c']), 'c');
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'c', layer: 1, round: 1 });
    s = answerQuestion(s, true, rules);
    expect(currentStep(s)).toEqual({ kind: 'ask', questionId: 'a', layer: 1, round: 1 });
    expect(s.queue).toEqual(['a', 'b']);
  });

  it('does not jump away from a question part-way through its layers', () => {
    const s = play(startLoop(['a', 'b']), [false]); // a on Layer 2
    expect(moveToFront(s, 'b')).toBe(s);
  });

  it('ignores a question that is not waiting in this round', () => {
    const s = startLoop(['a', 'b']);
    expect(moveToFront(s, 'z')).toBe(s);
  });

  it('never changes the state it was given', () => {
    const s = startLoop(['a', 'b']);
    const copy = JSON.parse(JSON.stringify(s));
    play(s, [false, false, false, false, 'seen', true]);
    expect(s).toEqual(copy);
  });
});
