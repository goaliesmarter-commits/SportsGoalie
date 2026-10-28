import { describe, it, expect } from 'vitest';
import { cleanLayerMedia } from '@/components/admin/SupportLayerFields';

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
