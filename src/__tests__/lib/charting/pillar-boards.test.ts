import { describe, it, expect } from 'vitest';

import { countBoardCheckIns, isPillarBoardTemplate } from '@/lib/charting/pillar-boards';

/**
 * Progress said "4 submitted" while the boards added up to 3: the count took
 * every entry, including ones on templates the boards page never lists.
 */

const templates = [
  { id: 'mindset-t', pillar: 'mindset' },
  { id: 'skating-t', pillar: 'skating' },
  { id: 'combined-t', pillar: 'combined' },
  { id: 'unknown-t', pillar: 'not-a-pillar' },
  { id: 'none-t', pillar: undefined },
] as Array<{ id: string; pillar?: string }>;

describe('isPillarBoardTemplate', () => {
  it('lists real pillars only', () => {
    expect(isPillarBoardTemplate({ pillar: 'skating' } as never)).toBe(true);
    expect(isPillarBoardTemplate({ pillar: 'combined' } as never)).toBe(false);
    expect(isPillarBoardTemplate({ pillar: 'not-a-pillar' } as never)).toBe(false);
    expect(isPillarBoardTemplate({} as never)).toBe(false);
  });
});

describe('countBoardCheckIns', () => {
  it('counts only entries on a listed board', () => {
    const entries = [
      { formTemplateId: 'skating-t' },
      { formTemplateId: 'skating-t' },
      { formTemplateId: 'skating-t' },
      { formTemplateId: 'combined-t' },
      { formTemplateId: 'unknown-t' },
      { formTemplateId: 'deleted-template' },
      {},
    ];
    expect(countBoardCheckIns(templates as never, entries)).toBe(3);
  });

  it('is zero when there are no entries', () => {
    expect(countBoardCheckIns(templates as never, [])).toBe(0);
  });
});
