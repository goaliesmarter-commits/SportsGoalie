import type React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { cleanLayerMedia, QuestionLayerEditor, supportLayerProblem } from '@/components/admin/SupportLayerFields';

describe('cleanLayerMedia', () => {
  it('stores nothing for a question whose layer fields were left alone', () => {
    expect(cleanLayerMedia(undefined)).toBeUndefined();
    expect(cleanLayerMedia({})).toBeUndefined();
    expect(cleanLayerMedia({ answerText: '   ', freezeImageUrl: '' })).toBeUndefined();
  });

  it('keeps what was filled in, trimmed', () => {
    expect(
      cleanLayerMedia({ freezeAt: 38, answerText: ' Stay square. ', answerImageUrl: ' https://x/a.jpg ' })
    ).toEqual({ freezeAt: 38, answerText: 'Stay square.', answerImageUrl: 'https://x/a.jpg' });
  });

  it('keeps a hold at 0 seconds', () => {
    expect(cleanLayerMedia({ freezeAt: 0 })).toEqual({ freezeAt: 0 });
  });

  it('drops a hold time that is not a number', () => {
    expect(cleanLayerMedia({ freezeAt: Number.NaN, answerText: 'x' })).toEqual({ answerText: 'x' });
  });
});

describe('supportLayerProblem', () => {
  it('passes a question with no layer fields', () => {
    expect(supportLayerProblem(90, undefined, undefined)).toBeNull();
  });

  it('passes sensible values', () => {
    expect(
      supportLayerProblem(90, 60, { freezeAt: 85, freezeImageUrl: 'https://x/p.jpg', answerImageUrl: 'http://x/a.png' })
    ).toBeNull();
  });

  it('refuses a replay that starts at or after the question', () => {
    expect(supportLayerProblem(90, 90, undefined)?.title).toMatch(/replay has to start before/);
    expect(supportLayerProblem(90, 120, undefined)?.title).toMatch(/replay has to start before/);
  });

  it('refuses a Layer 3 hold outside the replay', () => {
    expect(supportLayerProblem(90, 60, { freezeAt: 30 })?.title).toMatch(/inside the replay/);
    expect(supportLayerProblem(90, undefined, { freezeAt: 95 })?.title).toMatch(/inside the replay/);
  });

  it('accepts a hold exactly at either end of the replay', () => {
    expect(supportLayerProblem(90, 60, { freezeAt: 60 })).toBeNull();
    expect(supportLayerProblem(90, 60, { freezeAt: 90 })).toBeNull();
  });

  it('refuses a photo link that is not a web address', () => {
    expect(supportLayerProblem(90, undefined, { freezeImageUrl: 'photo.jpg' })?.title).toMatch(/Layer 3 photo/);
    expect(supportLayerProblem(90, undefined, { answerImageUrl: 'javascript:alert(1)' })?.title).toMatch(/Layer 4 photo/);
  });

  it('ignores an empty photo box', () => {
    expect(supportLayerProblem(90, undefined, { freezeImageUrl: '   ' })).toBeNull();
  });
});

describe('QuestionLayerEditor', () => {
  const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const parse = (raw: string) => (/^\d+$/.test(raw.trim()) ? Number(raw) : null);

  const setup = (props: Partial<React.ComponentProps<typeof QuestionLayerEditor>> = {}) => {
    const onApply = vi.fn();
    const onProblem = vi.fn();
    render(
      <QuestionLayerEditor
        timestamp={90}
        segmentStart={undefined}
        layerMedia={undefined}
        onApply={onApply}
        onProblem={onProblem}
        formatTimestamp={format}
        parseTimestampInput={parse}
        idPrefix="q-1-"
        {...props}
      />
    );
    return { onApply, onProblem };
  };

  it('shows what the question already has', () => {
    setup({ segmentStart: 60, layerMedia: { answerText: 'Stay square.' } });
    expect(screen.getByLabelText('Replay starts at')).toHaveValue('1:00');
    expect(screen.getByLabelText('Layer 4: the answer, in your words')).toHaveValue('Stay square.');
  });

  it('applies the edited, tidied values', () => {
    const { onApply, onProblem } = setup();
    fireEvent.change(screen.getByLabelText('Replay starts at'), { target: { value: '45' } });
    fireEvent.change(screen.getByLabelText('Layer 4: the answer, in your words'), { target: { value: '  Square up. ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply support layers' }));
    expect(onProblem).not.toHaveBeenCalled();
    expect(onApply).toHaveBeenCalledWith({ segmentStart: 45, layerMedia: { answerText: 'Square up.' } });
  });

  it('clears the layers when every box is emptied', () => {
    const { onApply } = setup({ segmentStart: 60, layerMedia: { answerText: 'x' } });
    fireEvent.change(screen.getByLabelText('Replay starts at'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Layer 4: the answer, in your words'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply support layers' }));
    expect(onApply).toHaveBeenCalledWith({ segmentStart: undefined, layerMedia: undefined });
  });

  it('refuses to apply a replay that starts after the question, and says why', () => {
    const { onApply, onProblem } = setup();
    fireEvent.change(screen.getByLabelText('Replay starts at'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply support layers' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onProblem).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/start before/) }));
  });

  it('gives its fields their own ids, so two editors on one page do not clash', () => {
    setup();
    expect(document.getElementById('q-1-segmentStart')).not.toBeNull();
    expect(document.getElementById('segmentStart')).toBeNull();
  });
});
