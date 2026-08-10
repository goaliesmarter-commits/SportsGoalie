'use client';

import { useRouter } from 'next/navigation';
import { Compass } from 'lucide-react';
import { TiltCard } from '@/components/ui/tilt-card';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const BLUE3 = '#0ea5e9';

export interface ExplorePillar {
  label: string;
  accent: string;
}

/** Names track PUBLIC_PILLARS in src/lib/pillar-public-routes.ts. */
const DEFAULT_PILLARS: ExplorePillar[] = [
  { accent: '#00f2ff', label: 'MindSet' },
  { accent: BLUE2, label: 'Skating' },
  { accent: BLUE, label: '7AMS' },
  { accent: BLUE3, label: '6 Zone – 7 Point System™' },
  { accent: '#38bdf8', label: 'Form' },
  { accent: '#22d3ee', label: 'Game & Practice' },
  { accent: BLUE2, label: 'Lifestyle' },
];

interface ExploreMoreSectionProps {
  /** e.g. "GOALIE" — shown in the section label so copy can be tailored per door */
  roleLabel?: string;
  pillars?: ExplorePillar[];
}

export function ExploreMoreSection({
  roleLabel,
  pillars = DEFAULT_PILLARS,
}: ExploreMoreSectionProps) {
  const router = useRouter();

  const sec: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: 'clamp(80px,10vw,130px) 0',
  };

  return (
    <section style={{ ...sec, background: 'radial-gradient(circle at 25% 30%, #0d1b3a 0%, #050912 100%)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.008) 0px, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 12px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '-8%', right: '-5%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(0,242,255,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '6px', height: '80px', background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 4px' }}>
              {roleLabel ? `More For The ${roleLabel}` : 'Explore More'}
            </p>
            <h2 style={{ fontSize: 'clamp(30px, 4.5vw, 54px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.05 }}>
              Go Deeper, Right Here.
            </h2>
          </div>
        </div>
        <p style={{ fontSize: 'clamp(15px, 1.7vw, 19px)', color: 'rgba(184,212,240,0.8)', lineHeight: 1.8, maxWidth: '680px', marginBottom: '48px' }}>
          Curious about the full system? Every pillar is one click away — no need to leave this page.
        </p>

        {/* 7 Pillars */}
        <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2.5px', color: 'rgba(96,205,255,0.55)', textTransform: 'uppercase', marginBottom: '14px' }}>
          The 7 Pillars
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3" style={{ maxWidth: '960px', marginBottom: '48px' }}>
          {pillars.map(({ accent, label }, i) => (
            <TiltCard
              key={label}
              effect="gravitate"
              tiltLimit={10}
              scale={1.07}
              style={{
                border: `1px solid ${accent}55`,
                borderRadius: '16px',
                boxShadow: `0 0 28px ${accent}14, inset 0 0 20px ${accent}06`,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => router.push(`/7-pillars?from=goalie`)}
            >
              <div style={{
                padding: '22px 10px 18px',
                background: `linear-gradient(160deg, ${accent}0a, rgba(4,8,20,0.88))`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '15px',
                textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              }}>
                <div style={{ width: '24px', height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44)`, borderRadius: '2px', boxShadow: `0 0 8px ${accent}55`, marginBottom: '2px' }} />
                <p style={{ fontSize: 'clamp(18px, 2.4vw, 26px)', fontWeight: 900, color: accent, lineHeight: 1, margin: 0, textShadow: `0 0 14px ${accent}60` }}>
                  {String(i + 1).padStart(2, '0')}
                </p>
                <p style={{ fontSize: '8px', color: `${accent}99`, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0, lineHeight: 1.3 }}>{label}</p>
              </div>
            </TiltCard>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '40px' }}>
          <Compass size={14} color="rgba(96,205,255,0.5)" />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(96,205,255,0.45)', textTransform: 'uppercase' }}>
            Everything stays in your door — explore freely.
          </span>
        </div>
      </div>
    </section>
  );
}
