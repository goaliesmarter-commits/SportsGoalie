'use client';

import { useState, useEffect } from 'react';
import { Sport, PILLARS } from '@/types';
import { sportsService } from '@/lib/database/services/sports.service';
import { getExactPillarSlug, getPillarSlugFromDocId, pillarDisplayName } from '@/lib/utils/pillars';
import { SkeletonPillarsPage } from '@/components/ui/skeletons';
import Link from 'next/link';
import {
  ArrowRight, Brain, Footprints, Shapes, Target, Grid3X3, Dumbbell, Heart, Trophy, RefreshCw, BookOpen,
} from 'lucide-react';

const BLUE = '#37b5ff';

// Every icon named in PILLARS (src/types/onboarding.ts) has to appear here or the
// card silently falls back to Target — which is Pillar 3's icon, so the miss reads
// as a duplicate rather than as a missing entry.
const PILLAR_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
  Brain, Footprints, Shapes, Target, Grid3X3, Trophy, Dumbbell, Heart,
};

const PILLAR_DESCRIPTIONS: Record<string, string> = {
  mindset:     'Build your mental fortress. Learn why your brain does what it does and how to redirect anxiety into performance energy.',
  skating:     'Move with precision and purpose. Master edgework, lateral speed, and efficiency of movement in sync with the play.',
  form:        'Perfect your physical foundation. Stance, paddle control, and body mechanics — the blueprint of every great save.',
  positioning: 'See the ice geometrically. The 7 Angle-Mark System gives you a mathematical grid to always be in the right spot.',
  seven_point: 'Own the danger zone. The 6 Zone – 7 Point System™ addresses below-the-icing-line positioning — the most dangerous area on ice.',
  // Keyed by the slugs getPillarSlugFromDocId can actually return. The retired
  // `training` slug resolves to `practice` before it ever reaches this map, so its
  // old combined copy is split across the two pillars that replaced it.
  game:        'Chart what actually happened. Game-day routine, in-game management, and the post-game review that turns one night into a pattern you can train against.',
  practice:    'Make every rep count. Plan with intent, aim at the weakness your charts found, and build practices that ask what a game asks.',
  lifestyle:   'Train the whole athlete. Off-ice habits, nutrition, recovery, and sleep are the foundation your on-ice game builds on.',
};

interface PillarsPageState { pillars: Sport[]; loading: boolean; error: string | null; }

export default function PillarsPage() {
  const [state, setState] = useState<PillarsPageState>({ pillars: [], loading: true, error: null });

  const loadPillars = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // 100, not 10. Eight pillars plus the retired combined document is nine
      // today, and a page that silently drops a pillar when a tenth row appears
      // is the same failure that hid Pillar 6 — better to over-fetch a list this
      // small than to cap it one row above its current size.
      const result = await sportsService.getAllSports({ limit: 100 });
      if (result.success && result.data) {
        setState({ pillars: result.data.items.sort((a, b) => a.order - b.order), loading: false, error: null });
      } else {
        setState({ pillars: [], loading: false, error: result.error?.message || 'Failed to load pillars' });
      }
    } catch {
      setState({ pillars: [], loading: false, error: 'An unexpected error occurred' });
    }
  };

  useEffect(() => { loadPillars(); }, []);

  if (state.loading) return <SkeletonPillarsPage />;

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: 'clamp(48px,8vw,96px) 24px clamp(32px,5vw,56px)', maxWidth: '720px', margin: '0 auto' }}>
        <p style={{ fontSize: '10px', letterSpacing: '4px', color: BLUE, fontWeight: 700, textTransform: 'uppercase', marginBottom: '16px' }}>
          YOUR TRAINING PATH
        </p>
        <h1 style={{ fontSize: 'clamp(28px,5vw,56px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '18px' }}>
          The Architecture of a<br />
          <span style={{ color: BLUE }}>Complete Goalie</span>
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, maxWidth: '520px', margin: '0 auto' }}>
          Every pillar connects to every other. Master all eight and you master the game — physically, mentally, and technically.
        </p>
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(14px,4vw,24px) 64px' }}>

        {/* ── Error ── */}
        {state.error && (
          <div style={{ maxWidth: '480px', margin: '0 auto 32px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
            <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{state.error}</p>
            <button
              onClick={loadPillars}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f87171', border: 'none', borderRadius: '8px', padding: '9px 18px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              <RefreshCw size={13} /> Try Again
            </button>
          </div>
        )}

        {/* ── Empty ── */}
        {!state.error && state.pillars.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <BookOpen size={40} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Pillars coming soon</h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>The curriculum is being built. Check back shortly.</p>
          </div>
        )}

        {/* ── Pillar Cards ── */}
        {state.pillars.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
            {state.pillars.map((pillar) => {
              const slug = getPillarSlugFromDocId(pillar.id);
              const info = slug ? PILLARS.find(p => p.slug === slug) : null;
              // The resolving `slug` above is right for the icon and the blurb —
              // a stray document is better off borrowing Practice's artwork than
              // showing none. Identity is stricter: the retired combined pillar
              // keeps its own name and shows no number, so a goalie doesn't meet
              // two cards both calling themselves Pillar 07.
              const exact = getExactPillarSlug(pillar.id);
              const IconComponent = PILLAR_ICONS[info?.icon || pillar.icon || 'Target'] || Target;
              const description = (slug && PILLAR_DESCRIPTIONS[slug]) ?? pillar.description;

              return (
                <Link key={pillar.id} href={`/pillars/${pillar.id}`} style={{ textDecoration: 'none' }}>
                  <article
                    style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '20px', padding: '28px', display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease', cursor: 'pointer', boxSizing: 'border-box' }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = '0 20px 48px rgba(55,181,255,0.12)'; el.style.borderColor = 'rgba(55,181,255,0.45)'; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; el.style.borderColor = 'rgba(55,181,255,0.18)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(55,181,255,0.12)', border: '1px solid rgba(55,181,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconComponent size={22} color={BLUE} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: BLUE, background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '20px', padding: '3px 10px' }}>
                        {/* The taxonomy's number, not the row's `order`. Admin can
                            reorder these cards from /admin/pillars, and a goalie's
                            "Pillar 03" has to keep matching the site and the audio. */}
                        {exact && info ? `Pillar ${String(info.pillarNumber).padStart(2, '0')}` : 'Bonus'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '12px', lineHeight: 1.2 }}>
                      {pillarDisplayName(pillar.id, pillar.name)}
                    </h3>

                    <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, flex: 1, marginBottom: '24px', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {description}
                    </p>

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: BLUE }}>
                      Explore Pillar <ArrowRight size={15} />
                    </span>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
