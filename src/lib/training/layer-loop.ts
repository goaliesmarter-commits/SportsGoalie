/**
 * Knowledge Check Layers, Phase 2: the loop.
 *
 * What happens after each answer, as plain rules with no screen in them, so the
 * player only has to show whatever step this returns.
 *
 *   - A right answer moves on to the next question.
 *   - A miss sends the goalie into that question's own segment: Support Layer 2
 *     (half speed), then Support Layer 3 (quarter speed, ending on a held frame)
 *     as many times as admin allows, then Support Layer 4 (the answer is shown).
 *   - When every question in the round is done, a retest round asks all of them
 *     again at Layer 1. After that, each round asks only the questions missed in
 *     the round before, until a round has no misses.
 *
 * A miss is any answer that is not right first time at Layer 1 in that round:
 * getting it right on Layer 2 or 3, or being shown it on Layer 4, all count, so
 * the question comes back in the next round.
 *
 * Only questions with a right answer belong here. Holds ask nothing and
 * reflective questions have no right answer, so the player leaves them out.
 *
 * The state is a plain object that is replaced, never changed in place.
 */

import type { LayerRules } from '@/types/knowledge-layers';

/** A layer on which a question is asked. Layer 4 shows the answer instead. */
export type AskLayer = 1 | 2 | 3;

export type LoopStep =
  /** Ask the question. On layers 2 and 3, replay its segment first. */
  | { kind: 'ask'; questionId: string; layer: AskLayer; round: number }
  /** Show the answer (Support Layer 4); the goalie then carries on. */
  | { kind: 'answer'; questionId: string; round: number }
  /** Every question was right first time in the last round. */
  | { kind: 'done'; rounds: number };

export interface LoopState {
  /** 1 is the first pass with the video; 2 is the retest of all; 3 on, the misses only. */
  round: number;
  /** The questions this round still has to ask, in order, the current one first. */
  queue: readonly string[];
  /** Where the current question stands. Null once the loop is done. */
  current: { questionId: string; layer: AskLayer | 4; layer3Tries: number } | null;
  /** Questions missed so far in this round, in the order they were missed. */
  missed: readonly string[];
  /** Every question in the Knowledge Check, in order; the retest round asks all of them. */
  all: readonly string[];
}

function begin(round: number, queue: readonly string[], all: readonly string[]): LoopState {
  const [first] = queue;
  return {
    round,
    queue,
    current: first === undefined ? null : { questionId: first, layer: 1, layer3Tries: 0 },
    missed: [],
    all,
  };
}

/** The loop at its start, for the questions in the order the video reaches them. */
export function startLoop(questionIds: readonly string[]): LoopState {
  const all = [...new Set(questionIds)];
  return begin(1, all, all);
}

/** What the player should do now. */
export function currentStep(state: LoopState): LoopStep {
  if (!state.current) return { kind: 'done', rounds: state.round };
  const { questionId, layer } = state.current;
  return layer === 4
    ? { kind: 'answer', questionId, round: state.round }
    : { kind: 'ask', questionId, layer, round: state.round };
}

/** Moves to the next question in the round, or to the next round when this one is over. */
function nextQuestion(state: LoopState, missed: readonly string[]): LoopState {
  const queue = state.queue.slice(1);
  if (queue.length > 0) {
    return { ...state, queue, current: { questionId: queue[0], layer: 1, layer3Tries: 0 }, missed };
  }
  if (missed.length === 0) return { ...state, queue: [], current: null, missed };
  // Round 1 is followed by a retest of everything; later rounds only by the misses.
  const nextQueue = state.round === 1 ? state.all : missed;
  return begin(state.round + 1, nextQueue, state.all);
}

function withMiss(state: LoopState, questionId: string): readonly string[] {
  return state.missed.includes(questionId) ? state.missed : [...state.missed, questionId];
}

/**
 * The goalie answered the current question. Ignored unless the current step is
 * an `ask`, so a late or doubled answer cannot move the loop twice.
 */
export function answerQuestion(state: LoopState, correct: boolean, rules: LayerRules): LoopState {
  const current = state.current;
  if (!current || current.layer === 4) return state;

  if (correct) {
    // Right first time at Layer 1 keeps it out of the next round; right after
    // a miss still brings it back.
    const missed = current.layer === 1 ? state.missed : withMiss(state, current.questionId);
    return nextQuestion(state, missed);
  }

  const missed = withMiss(state, current.questionId);
  switch (current.layer) {
    case 1:
      return { ...state, missed, current: { ...current, layer: 2 } };
    case 2:
      return { ...state, missed, current: { ...current, layer: 3, layer3Tries: 0 } };
    case 3: {
      const layer3Tries = current.layer3Tries + 1;
      const layer = layer3Tries >= rules.layer3AttemptsBeforeAnswer ? 4 : 3;
      return { ...state, missed, current: { ...current, layer, layer3Tries } };
    }
  }
}

/** The goalie has seen the answer on Support Layer 4 and carries on. */
export function acknowledgeAnswer(state: LoopState): LoopState {
  if (!state.current || state.current.layer !== 4) return state;
  return nextQuestion(state, withMiss(state, state.current.questionId));
}
