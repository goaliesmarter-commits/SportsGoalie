/**
 * Pre-launch gate — the path rules.
 *
 * Kept here, out of proxy.ts, so the decision that matters most (what a
 * logged-out stranger can still reach while the site is closed) is a pure
 * function with tests around it. See src/__tests__/lib/pre-launch-gate.test.ts.
 */

export const PREVIEW_COOKIE = 'sg_preview';
export const PREVIEW_PARAM = 'preview';
export const PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
export const HOLDING_PAGE = '/coming-soon';

/**
 * The only paths a visitor without the preview cookie may reach.
 *
 * This is an allowlist of exact names, deliberately. The first version of this
 * function asked "does the path contain a dot?" and treated anything that did
 * as a static file — which handed the whole app away: /pillar/1.2 and
 * /pillars/x.y contain dots, are real dynamic routes, and rendered the live
 * site straight through the closed gate. Nothing is inferred here any more.
 *
 * Next's own build output (/_next/static, /_next/image) is already excluded by
 * the matcher in proxy.ts; the /_next/ prefix below covers the rest, including
 * the dev-server HMR endpoint.
 *
 * Nothing else in /public is served while the site is closed. If the holding
 * page ever needs an image, add its exact path here on purpose.
 */
const OPEN_PATHS = new Set([
  HOLDING_PAGE,
  '/favicon.ico',
  '/favicon.svg',
  '/icon-192.svg',
  '/manifest.json',
  '/robots.txt',
]);

const OPEN_PREFIXES = ['/_next/'];

export function isAlwaysReachable(pathname: string): boolean {
  if (OPEN_PATHS.has(pathname)) return true;
  return OPEN_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/**
 * The gate engages only when it is switched on AND there is a way back in.
 * A closed site with no key would lock out the people who closed it.
 */
export function isGateEngaged(siteClosed: string | undefined, previewKey: string | undefined): boolean {
  return siteClosed === 'true' && typeof previewKey === 'string' && previewKey.length > 0;
}
