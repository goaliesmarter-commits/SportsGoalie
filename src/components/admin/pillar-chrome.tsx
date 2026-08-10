'use client';

import { Brain, Footprints, Shapes, Target, Grid3X3, Dumbbell, Heart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Shared visual language for the admin pillar area (`/admin/pillars/**`).
 *
 * The pillar list and the per-pillar skills page had drifted into two different
 * looks: a wide navy card grid with blue accents on one, a narrower column with a
 * purple gradient header, larger type and icon-only buttons on the other. Each
 * page carried its own copy of the palette and control CSS, so they could never
 * stay in step. Both now draw from here.
 */

export const BLUE = '#37b5ff';
export const RED = '#f87171';
export const GREEN = '#22c55e';

export const PILLAR_ICONS: Record<string, LucideIcon> = {
  Brain, Footprints, Shapes, Target, Grid3X3, Dumbbell, Heart,
};

/** The standard admin card. */
export const card: React.CSSProperties = {
  background: 'rgba(2,18,44,0.85)',
  border: '1px solid rgba(55,181,255,0.14)',
  borderRadius: '16px',
};

/** 2px gradient hairline across the top of a card. */
export const accentLineStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '2px',
  background: `linear-gradient(90deg, transparent, ${BLUE}66, transparent)`,
};

/**
 * Page-level vertical rhythm — every admin pillar page stacks sections the same way.
 * Pair it with `className="pl-page"` for the matching side margins, which have to
 * live in CSS to stay responsive.
 */
export const pageStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

/** Card grid — two up, collapsing to one under 768px (see `.pl-grid`). */
export const cardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '24px',
};

/** Blue uppercase pill: "PILLAR 01", "SKILL 03". */
export const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'rgba(55,181,255,0.12)',
  color: BLUE,
  border: '1px solid rgba(55,181,255,0.2)',
  padding: '2px 10px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

/** Rounded square that fronts a pillar with its icon. */
export const iconChipStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '12px',
  background: 'rgba(55,181,255,0.1)',
  border: '1px solid rgba(55,181,255,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

/** Muted pill for a secondary label, e.g. a difficulty tier. */
export function tierBadgeStyle(color: string): React.CSSProperties {
  return {
    background: `${color}1f`,
    color,
    border: `1px solid ${color}33`,
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'capitalize',
  };
}

export const TIER_COLORS: Record<string, string> = {
  introduction: GREEN,
  development: BLUE,
  refinement: RED,
};

/**
 * Control CSS shared by both pages. Injected once per page in a <style> tag —
 * consistent with how the rest of this admin area styles itself.
 */
export const adminPillarCss = `
  /* Side margins on top of the admin shell's own p-3/md:p-6, so cards aren't
     pinned to the edges of a wide monitor. Stays near zero on phones. */
  .pl-page { padding: 0 4px; }
  @media (min-width: 768px) { .pl-page { padding: 0 24px; } }
  @media (min-width: 1280px) { .pl-page { padding: 0 48px; } }
  /* Three up where there's room. A pillar holds many more skills than there are
     pillars, so these cards run narrower than the ones on the pillar list. */
  .pl-grid-3 { grid-template-columns: repeat(3, 1fr) !important; }
  @media (max-width: 1279px) { .pl-grid-3 { grid-template-columns: 1fr 1fr !important; } }
  @media (max-width: 767px) { .pl-grid-3 { grid-template-columns: 1fr !important; } }
  .pl-card { position: relative; transition: all 0.25s !important; }
  .pl-card:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.3) !important; border-color: rgba(55,181,255,0.25) !important; }
  .pl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
  .pl-btn-sm { padding: 5px 8px !important; font-size: 12px !important; gap: 4px !important; }
  .pl-edit:hover { background: rgba(55,181,255,0.12) !important; color: ${BLUE} !important; border-color: rgba(55,181,255,0.3) !important; }
  .pl-skills:hover { background: rgba(34,197,94,0.1) !important; color: ${GREEN} !important; border-color: rgba(34,197,94,0.3) !important; }
  .pl-del:hover { background: rgba(248,113,113,0.12) !important; color: ${RED} !important; border-color: rgba(248,113,113,0.3) !important; }
  .pl-save { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: ${BLUE}; color: #000f28; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; opacity: 1; transition: opacity 0.2s; }
  .pl-save:hover { filter: brightness(1.1); }
  .pl-save:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }
  .pl-inp { background: rgba(2,18,44,0.6) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 8px !important; padding: 9px 12px !important; width: 100% !important; font-size: 13px !important; outline: none !important; font-family: inherit !important; }
  .pl-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
  .pl-inp::placeholder { color: rgba(255,255,255,0.3); }
  .pl-ta { background: rgba(2,18,44,0.6) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 8px !important; padding: 9px 12px !important; width: 100% !important; font-size: 13px !important; outline: none !important; resize: vertical !important; min-height: 80px !important; font-family: inherit !important; }
  .pl-ta:focus { border-color: rgba(55,181,255,0.45) !important; }
  .pl-ta::placeholder { color: rgba(255,255,255,0.3); }
  .pl-sel { background: rgba(2,18,44,0.6) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: rgba(255,255,255,0.7) !important; border-radius: 8px !important; padding: 9px 12px !important; width: 100% !important; font-size: 13px !important; outline: none !important; }
  .pl-sel:focus { border-color: rgba(55,181,255,0.45) !important; }
  .pl-sel option { background: #0a1628; color: #fff; }
  @media (max-width: 768px) { .pl-grid { grid-template-columns: 1fr !important; } }
`;
