/** Shared public 7-Pillars routing (no auth). */

export type PillarFromKey =
  | 'goalie'
  | 'team-programs'
  | 'goalie-coach'
  | 'parent-role'
  | 'organization'
  | 'who-we-are'
  | 'the-system';

export interface PillarFromContext {
  href: string;
  label: string;
}

export const PILLAR_FROM_CONTEXT: Record<PillarFromKey, PillarFromContext> = {
  goalie: { href: '/goalie', label: 'GOALIE' },
  'team-programs': { href: '/team-programs', label: 'TEAM PROGRAMS' },
  'goalie-coach': { href: '/goalie-coach', label: 'GOALIE COACH' },
  'parent-role': { href: '/parent-role', label: 'PARENT' },
  organization: { href: '/organization', label: 'ORGANIZATION' },
  'who-we-are': { href: '/who-we-are', label: 'WHO WE ARE' },
  'the-system': { href: '/the-system', label: 'THE SYSTEM' },
};

export const DEFAULT_PILLAR_FROM: PillarFromKey = 'goalie';

/**
 * The public marketing site's pillar list.
 *
 * NAMES follow Michael's approved list of 6 August 2026. NUMBERS do not, and
 * deliberately so: `id` is the /pillar/[id] URL, and every link Michael has
 * already shared points at these numbers. The in-app list treats 7AMS and the
 * 6 Zone – 7 Point System™ as two halves of Pillar 3 and so runs one number
 * ahead of this one from `04` on. Renumbering these routes, and splitting the
 * single "Game & Practice" sales page into two, both need Michael's sign-off
 * and new copy in his voice — neither is a rename we can make on our own.
 */
export const PUBLIC_PILLARS = [
  { id: 1, num: '01', label: 'MindSet', accent: '#00f2ff' },
  { id: 2, num: '02', label: 'Skating', accent: '#60cdff' },
  { id: 3, num: '03', label: '7AMS', accent: '#37b5ff' },
  { id: 4, num: '04', label: '6 Zone – 7 Point System™', accent: '#0ea5e9' },
  { id: 5, num: '05', label: 'Form', accent: '#38bdf8' },
  { id: 6, num: '06', label: 'Game & Practice', accent: '#22d3ee' },
  { id: 7, num: '07', label: 'Lifestyle', accent: '#60cdff' },
] as const;

export function resolvePillarFrom(raw: string | null | undefined): PillarFromKey {
  if (raw && raw in PILLAR_FROM_CONTEXT) return raw as PillarFromKey;
  return DEFAULT_PILLAR_FROM;
}

export function sevenPillarsHubHref(from: PillarFromKey | string) {
  const key = resolvePillarFrom(from);
  return `/7-pillars?from=${encodeURIComponent(key)}`;
}

export function pillarDetailHref(pillarId: string | number, from: PillarFromKey | string) {
  const key = resolvePillarFrom(from);
  return `/pillar/${pillarId}?from=${encodeURIComponent(key)}`;
}
