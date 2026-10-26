import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

import { ALL_SLOTS, BUTTON_SLOTS, isKnownSlot, slotKey } from '@/lib/audio/slots';

/**
 * Admin can only place a recording on a button it can see in its list. These
 * tests keep that list honest against the pages, so a new "Hear Coach Mike"
 * button cannot be added to a page and quietly be impossible to fill.
 */

const ROOT = join(__dirname, '..', '..', '..', '..');

const STATIC_PAGES = [
  '/goalie',
  '/parent-role',
  '/goalie-coach',
  '/team-programs',
  '/organization',
  '/bridge',
  '/the-system',
  '/who-we-are',
];

function labelsOn(file: string): string[] {
  const source = readFileSync(join(ROOT, file), 'utf-8');
  return [...source.matchAll(/<GemVoiceButton[^>]*label="([^"]+)"/g)].map(m => m[1]);
}

describe('the slot list', () => {
  it.each(STATIC_PAGES)('lists every Hear Coach Mike button on %s', page => {
    const listed = BUTTON_SLOTS.filter(s => s.page === page).map(s => s.label);
    expect(listed.sort()).toEqual(labelsOn(`app${page}/page.tsx`).sort());
  });

  it('lists every voice label in the pillar data', () => {
    const source = readFileSync(join(ROOT, 'app/pillar/[id]/page.tsx'), 'utf-8');
    const voiceLabels = [...source.matchAll(/voiceLabel: '((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'"));
    const listed = new Set(BUTTON_SLOTS.filter(s => s.page.startsWith('/pillar/')).map(s => s.label));
    expect(voiceLabels.filter(label => !listed.has(label))).toEqual([]);
  });

  it('has no two slots with the same key', () => {
    const keys = ALL_SLOTS.map(s => slotKey(s.page, s.label));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('slotKey', () => {
  it('ignores a trailing slash, so /goalie and /goalie/ are the same page', () => {
    expect(slotKey('/goalie/', 'X')).toBe(slotKey('/goalie', 'X'));
    expect(slotKey('/', 'X')).toBe('/|X');
  });

  it('knows the listed slots and nothing else', () => {
    const first = BUTTON_SLOTS[0];
    expect(isKnownSlot(slotKey(first.page, first.label))).toBe(true);
    expect(isKnownSlot('/goalie|NOT A BUTTON')).toBe(false);
  });
});
