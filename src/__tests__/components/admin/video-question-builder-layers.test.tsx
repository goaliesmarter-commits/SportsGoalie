import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-player', () => ({ default: () => null }));

// The builder measures the space left for the video; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import { VideoQuestionBuilder } from '@/components/admin/VideoQuestionBuilder';
import type { VideoQuizQuestion } from '@/types';

const existing = (extra: Partial<VideoQuizQuestion> = {}): VideoQuizQuestion =>
  ({
    id: 'q1',
    type: 'multiple_choice',
    question: 'Where is the shooter looking?',
    timestamp: 90,
    points: 10,
    required: true,
    options: [
      { id: 'a', text: 'Far post', isCorrect: true },
      { id: 'b', text: 'Near post', isCorrect: false },
    ],
    ...extra,
  }) as VideoQuizQuestion;

function renderBuilder(questions: VideoQuizQuestion[] = []) {
  const onChange = vi.fn();
  render(<VideoQuestionBuilder questions={questions} videoDuration={300} videoUrl="https://example.com/v.mp4" onChange={onChange} />);
  return { onChange };
}

/** Fills in a two-option multiple choice question with the first option correct. */
function fillNewQuestion(time: string) {
  fireEvent.change(screen.getByPlaceholderText('Enter your question'), { target: { value: 'Which post?' } });
  fireEvent.change(screen.getByPlaceholderText('1:30 or 90'), { target: { value: time } });
  const addOption = screen.getByRole('button', { name: /Add Option/ });
  fireEvent.click(addOption);
  fireEvent.click(addOption);
  const first = screen.getByPlaceholderText('Option 1');
  fireEvent.change(first, { target: { value: 'Far' } });
  fireEvent.change(screen.getByPlaceholderText('Option 2'), { target: { value: 'Near' } });
  fireEvent.click(within(first.parentElement as HTMLElement).getByRole('switch'));
}

describe('VideoQuestionBuilder — support layers', () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('adds a new question with its support layers', () => {
    const { onChange } = renderBuilder();
    fillNewQuestion('120');
    fireEvent.change(screen.getByLabelText('Replay starts at'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Layer 3 holds the frame at'), { target: { value: '115' } });
    fireEvent.change(screen.getByLabelText('Layer 4: the answer, in your words'), { target: { value: ' Watch the far post. ' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add Question$/ }));

    expect(toast.error).not.toHaveBeenCalled();
    const [saved] = onChange.mock.calls.at(-1)![0] as VideoQuizQuestion[];
    expect(saved.segmentStart).toBe(100);
    expect(saved.layerMedia).toEqual({ freezeAt: 115, answerText: 'Watch the far post.' });
  });

  it('adds a question with no layer fields and stores no layers', () => {
    const { onChange } = renderBuilder();
    fillNewQuestion('120');
    fireEvent.click(screen.getByRole('button', { name: /^Add Question$/ }));
    const [saved] = onChange.mock.calls.at(-1)![0] as VideoQuizQuestion[];
    expect(saved.segmentStart).toBeUndefined();
    expect(saved.layerMedia).toBeUndefined();
  });

  it('refuses a new question whose replay starts after it', () => {
    const { onChange } = renderBuilder();
    fillNewQuestion('120');
    fireEvent.change(screen.getByLabelText('Replay starts at'), { target: { value: '130' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add Question$/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('The replay has to start before the question', expect.anything());
  });

  it('refuses a new question whose Layer 3 photo is not a link', () => {
    const { onChange } = renderBuilder();
    fillNewQuestion('120');
    fireEvent.change(screen.getByLabelText('Layer 3 photo instead (link)'), { target: { value: 'photo.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add Question$/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('The Layer 3 photo link is not a web address', expect.anything());
  });

  it('gives an existing question support layers from its expanded view', () => {
    const { onChange } = renderBuilder([existing()]);
    const row = screen.getByText('Where is the shooter looking?').closest('.border') as HTMLElement;
    const buttons = within(row).getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 2]); // expand (the last one deletes)

    fireEvent.change(document.getElementById('q-q1-segmentStart')!, { target: { value: '70' } });
    fireEvent.change(document.getElementById('q-q1-layer4Answer')!, { target: { value: 'Far post.' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Apply support layers' }));

    const [updated] = onChange.mock.calls.at(-1)![0] as VideoQuizQuestion[];
    expect(updated.id).toBe('q1');
    expect(updated.question).toBe('Where is the shooter looking?');
    expect(updated.segmentStart).toBe(70);
    expect(updated.layerMedia).toEqual({ answerText: 'Far post.' });
  });

  it('offers no layers on an existing reflective question or hold', () => {
    renderBuilder([
      existing({ id: 'r1', question: 'Did it feel balanced?', reflective: true }),
      existing({ id: 'h1', question: 'Look at his stick', holdOnly: true, timestamp: 150 }),
    ]);
    for (const text of ['Did it feel balanced?', 'Look at his stick']) {
      const row = screen.getByText(text).closest('.border') as HTMLElement;
      const buttons = within(row).getAllByRole('button');
      fireEvent.click(buttons[buttons.length - 2]);
      expect(within(row).queryByRole('button', { name: 'Apply support layers' })).toBeNull();
    }
  });
});
