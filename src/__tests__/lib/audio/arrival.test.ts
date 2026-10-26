import { afterEach, describe, expect, it } from 'vitest';

import { ARRIVAL_WINDOW_MS, clearRoleArrival, hasRoleArrival, markRoleArrival } from '@/lib/audio/arrival';

afterEach(clearRoleArrival);

describe('arriving from the role choice', () => {
  it('counts on the page the visitor chose', () => {
    markRoleArrival('/parent-role', 1_000);
    expect(hasRoleArrival('/parent-role', 2_000)).toBe(true);
  });

  it('does not count on any other page', () => {
    markRoleArrival('/parent-role', 1_000);
    expect(hasRoleArrival('/goalie', 2_000)).toBe(false);
  });

  it('does not count for a visitor who came some other way', () => {
    expect(hasRoleArrival('/goalie')).toBe(false);
  });

  it('runs out, so a page opened much later does not start talking', () => {
    markRoleArrival('/goalie', 0);
    expect(hasRoleArrival('/goalie', ARRIVAL_WINDOW_MS)).toBe(true);
    expect(hasRoleArrival('/goalie', ARRIVAL_WINDOW_MS + 1)).toBe(false);
  });

  it('survives being read twice, and is gone once cleared', () => {
    markRoleArrival('/goalie', 0);
    expect(hasRoleArrival('/goalie', 10)).toBe(true);
    expect(hasRoleArrival('/goalie', 20)).toBe(true);
    clearRoleArrival();
    expect(hasRoleArrival('/goalie', 30)).toBe(false);
  });
});
