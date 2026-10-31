/**
 * The player running a Knowledge Check with the layers on (Phase 2), against a
 * stand-in video that reports progress only when the test says so.
 */
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// The stand-in video. The test drives it: `tick(s)` reports playback at s
// seconds, `end()` reports the clip ending. `seeks` records every seekTo.
// ---------------------------------------------------------------------------
const video = vi.hoisted(() => ({
  props: {} as Record<string, any>,
  seeks: [] as number[],
}));

vi.mock('react-player', async () => {
  const ReactLib = await import('react');
  const Player = ReactLib.forwardRef((props: Record<string, any>, ref) => {
    video.props = props;
    ReactLib.useImperativeHandle(ref, () => ({ seekTo: (s: number) => video.seeks.push(s) }));
    ReactLib.useEffect(() => {
      props.onReady?.();
      props.onDuration?.(300);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  });
  return { default: Player };
});

vi.mock('@/lib/audio/context', () => {
  const noop = () => {};
  return {
    useCoachAudio: () => ({ play: noop, pause: noop, prime: noop, enabled: false }),
    useCoachAudioClip: () => ({ clip: null, available: false, isLoading: false, isPlaying: false, wasBlocked: false, enabled: false, toggle: noop }),
  };
});

vi.mock('sonner', () => ({ toast: { warning: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const records = vi.hoisted(() => ({ lines: [] as Record<string, unknown>[] }));
vi.mock('@/lib/database/services/learning-record.service', () => ({
  learningRecordService: { addEntry: vi.fn(async (line: Record<string, unknown>) => { records.lines.push(line); return { success: true }; }) },
}));

const layerRules = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/lib/database/services/layer-rules.service', async () => {
  const { DEFAULT_LAYER_RULES } = await import('@/types/knowledge-layers');
  return {
    layerRulesService: {
      getRules: vi.fn(async () => ({ success: true, data: { ...DEFAULT_LAYER_RULES, enabled: layerRules.enabled } })),
    },
  };
});

import { StandaloneVideoQuizPlayer } from '@/components/quiz/StandaloneVideoQuizPlayer';
import type { VideoQuiz } from '@/types';

const option = (id: string, text: string, isCorrect: boolean) => ({ id, text, isCorrect });

const quiz = {
  id: 'quiz-1',
  title: 'Layers test',
  skillId: 'skill-1',
  sportId: 'sport-1',
  videoUrl: 'https://example.com/v.mp4',
  videoDuration: 300,
  settings: { showProgressBar: true },
  questions: [
    { id: 'q1', type: 'multiple_choice', question: 'Question one?', timestamp: 20, points: 10, required: true,
      options: [option('a', 'Right one', true), option('b', 'Wrong one', false)],
      explanation: 'Because one.', layerMedia: { answerText: 'Watch the far post.' } },
    { id: 'q2', type: 'multiple_choice', question: 'Question two?', timestamp: 60, points: 10, required: true,
      options: [option('c', 'Right two', true), option('d', 'Wrong two', false)] },
  ],
} as unknown as VideoQuiz;

const tick = (seconds: number) => act(() => { video.props.onProgress?.({ playedSeconds: seconds }); });
const end = () => act(() => { video.props.onEnded?.(); });
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 150)); });

async function answer(text: string) {
  fireEvent.click(await screen.findByText(text));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await flush();
}

async function startQuiz(onComplete = vi.fn()) {
  render(<StandaloneVideoQuizPlayer quiz={quiz} userId="goalie-1" onComplete={onComplete} />);
  await flush(); // the rules load
  fireEvent.click(screen.getByRole('button', { name: 'Start Quiz' }));
  await flush();
  return onComplete;
}

describe('StandaloneVideoQuizPlayer with the layers on', () => {
  beforeEach(() => {
    video.props = {};
    video.seeks = [];
    records.lines = [];
    layerRules.enabled = true;
  });

  it('replays the segment of a missed question slower and asks again, then carries on with the video', async () => {
    await startQuiz();
    await tick(0); await tick(21);
    await screen.findByText('Question one?');

    await answer('Wrong one');
    // Support Layer 2: back to the start of the segment, at half speed.
    expect(video.seeks.at(-1)).toBe(0);
    expect(video.props.playbackRate).toBe(0.5);
    expect(screen.getByText(/Watch that part again at 0.5× speed/)).toBeInTheDocument();

    // A tick from before the seek landed (past the end) must not count as the end.
    await tick(21);
    expect(screen.queryByText('Question one?')).toBeNull();
    await tick(5); await tick(20);
    expect(await screen.findByText('Support Layer 2')).toBeInTheDocument();

    await answer('Right one');
    // Settled: the video carries on from the question, at the goalie's speed.
    expect(video.seeks.at(-1)).toBe(20);
    expect(video.props.playbackRate).toBe(1);
    expect(video.props.playing).toBe(true);

    expect(records.lines.map(l => [l.questionId, l.layer, l.outcome, l.round])).toEqual([
      ['q1', 1, 'incorrect', 1],
      ['q1', 2, 'correct', 1],
    ]);
  });

  it('goes through Layer 3 twice, then shows the answer on Layer 4', async () => {
    await startQuiz();
    await tick(0); await tick(21);
    await answer('Wrong one'); // L1
    await tick(5); await tick(20);
    await answer('Wrong one'); // L2
    expect(video.props.playbackRate).toBe(0.25);
    await tick(5); await tick(20);
    expect(await screen.findByText('Support Layer 3')).toBeInTheDocument();
    await answer('Wrong one'); // L3, first try: replays again
    await tick(5); await tick(20);
    await answer('Wrong one'); // L3, second try

    expect(await screen.findByText('Support Layer 4: the answer')).toBeInTheDocument();
    expect(screen.getByText('Answer: Right one')).toBeInTheDocument();
    expect(screen.getByText('Watch the far post.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await flush();
    expect(video.seeks.at(-1)).toBe(20);
    expect(video.props.playing).toBe(true);
    expect(records.lines.map(l => l.layer)).toEqual([1, 2, 3, 3]);
  });

  it('retests every question after the video, then only the misses, then completes', async () => {
    const onComplete = await startQuiz();
    await tick(0); await tick(21);
    await answer('Wrong one'); // q1 L1 miss
    await tick(5); await tick(20);
    await answer('Right one'); // q1 right on L2: still a miss for the round
    await tick(21); await tick(61);
    await answer('Right two'); // q2 right first time
    await end();

    // Round 2: every question again, in the panel.
    expect(await screen.findByText('Retest')).toBeInTheDocument();
    expect(screen.getByText('Question one?')).toBeInTheDocument();
    await answer('Right one');
    expect(screen.getByText('Question two?')).toBeInTheDocument();
    await answer('Right two');

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const progress = onComplete.mock.calls[0][0];
    // The score is the first answer to each question, as before the layers.
    expect(progress.score).toBe(10);
    expect(progress.questionsAnswered).toHaveLength(2);
    expect(records.lines.filter(l => l.round === 2).map(l => [l.questionId, l.outcome])).toEqual([
      ['q1', 'correct'],
      ['q2', 'correct'],
    ]);
  });

  it('asks a question the goalie skipped past once the video ends', async () => {
    const onComplete = await startQuiz();
    await tick(0); await tick(10);
    // The goalie drags the seek bar past q1 (at 20s) to 30s.
    const [seekBar] = document.querySelectorAll('input[type="range"]');
    fireEvent.change(seekBar, { target: { value: '30' } });
    await tick(30); await tick(61);
    await answer('Right two');
    await end();
    // q1 was never asked; it is asked now at Layer 1 of round 1.
    expect(await screen.findByText('Question one?')).toBeInTheDocument();
    await answer('Right one');
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });
});

describe('StandaloneVideoQuizPlayer with the layers off', () => {
  beforeEach(() => {
    video.props = {};
    video.seeks = [];
    records.lines = [];
    layerRules.enabled = false;
  });

  it('plays exactly as before: a miss carries on with no replay, and it completes at the end', async () => {
    const onComplete = await startQuiz();
    await tick(0); await tick(21);
    await answer('Wrong one');
    expect(video.seeks).toEqual([]);
    expect(video.props.playbackRate).toBe(1);
    expect(video.props.playing).toBe(true);
    await tick(61);
    await answer('Right two');
    await end();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(records.lines.map(l => [l.layer, l.round])).toEqual([[1, 1], [1, 1]]);
  });
});
