import { describe, it, expect } from 'vitest';

import { isAlwaysReachable, isGateEngaged } from '@/lib/pre-launch/gate';

describe('pre-launch gate — what a stranger can still reach', () => {
  it('lets the holding page and its own chrome through', () => {
    expect(isAlwaysReachable('/coming-soon')).toBe(true);
    expect(isAlwaysReachable('/favicon.svg')).toBe(true);
    expect(isAlwaysReachable('/manifest.json')).toBe(true);
    expect(isAlwaysReachable('/robots.txt')).toBe(true);
    expect(isAlwaysReachable('/_next/static/chunks/main.js')).toBe(true);
  });

  it('closes the marketing site and the app', () => {
    for (const path of ['/', '/7-pillars', '/apply', '/founding', '/dashboard', '/admin', '/auth/login']) {
      expect(isAlwaysReachable(path), path).toBe(false);
    }
  });

  /**
   * The regression this file exists for. The first version asked "does the
   * pathname contain a dot?" and called anything that did a static asset, so
   * every one of these rendered the live site through a closed gate.
   */
  it('does not treat a dotted route segment as a static file', () => {
    for (const path of [
      '/pillar/1.2',
      '/pillars/x.y',
      '/dashboard/a.b',
      '/admin/x.y',
      '/quiz/video/a.b',
      '/charting/sessions/a.b',
      '/pillar/anything.png',
    ]) {
      expect(isAlwaysReachable(path), path).toBe(false);
    }
  });

  it('does not open /public wholesale', () => {
    expect(isAlwaysReachable('/goalie-dashboard.png')).toBe(false);
    expect(isAlwaysReachable('/images/anything.png')).toBe(false);
  });
});

describe('pre-launch gate — the switch', () => {
  it('engages only when closed AND a key exists', () => {
    expect(isGateEngaged('true', 'a-long-random-key')).toBe(true);
  });

  it('stays open when the switch is off', () => {
    expect(isGateEngaged(undefined, 'a-long-random-key')).toBe(false);
    expect(isGateEngaged('false', 'a-long-random-key')).toBe(false);
    expect(isGateEngaged('TRUE', 'a-long-random-key')).toBe(false);
  });

  /** A closed site with no key would have no door left open, including for us. */
  it('refuses to close with no way back in', () => {
    expect(isGateEngaged('true', undefined)).toBe(false);
    expect(isGateEngaged('true', '')).toBe(false);
  });
});
