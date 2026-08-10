'use client';

import { useState } from 'react';
import {
  Brain,
  Footprints,
  Map,
  Grid3X3,
  Target,
  BarChart3,
  Heart,
  type LucideIcon,
} from 'lucide-react';
import { TiltCard } from '@/components/ui/tilt-card';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const BLUE3 = '#0ea5e9';

/** Same palettes as landing "What's In YOUR Tool Box?" cards — cycled across 7 pillars */
const TOOLBOX_PALETTES = [
  {
    accent: '#37b5ff',
    accentLight: '#7dd3fc',
    accentRgb: '55,181,255',
    cardGradient: 'linear-gradient(155deg, rgba(18,72,140,0.92) 0%, rgba(8,32,72,0.96) 48%, rgba(4,18,44,0.98) 100%)',
    glowColor: 'rgba(55,181,255,0.35)',
  },
  {
    accent: '#c4b5fd',
    accentLight: '#e9d5ff',
    accentRgb: '196,181,253',
    cardGradient: 'linear-gradient(155deg, rgba(76,48,140,0.9) 0%, rgba(36,24,82,0.96) 48%, rgba(12,10,44,0.98) 100%)',
    glowColor: 'rgba(167,139,250,0.32)',
  },
  {
    accent: '#5eead4',
    accentLight: '#99f6e4',
    accentRgb: '94,234,212',
    cardGradient: 'linear-gradient(155deg, rgba(16,100,100,0.9) 0%, rgba(10,52,68,0.96) 48%, rgba(4,22,40,0.98) 100%)',
    glowColor: 'rgba(45,212,191,0.32)',
  },
] as const;

interface PillarDef {
  num: string;
  name: string;
  subtitle: string;
  desc: string;
  Icon: LucideIcon;
  foundation?: boolean;
  accent: string;
  accentLight: string;
  accentRgb: string;
  cardGradient: string;
  glowColor: string;
}

const PILLARS: PillarDef[] = [
  {
    num: '1',
    name: 'MINDSET',
    subtitle: 'The Foundation',
    desc: 'The sub-conscious. V.M.P. Character and leadership built from day one. Every other Pillar is built on this foundation.',
    Icon: Brain,
    foundation: true,
    ...TOOLBOX_PALETTES[0],
  },
  {
    num: '2',
    name: 'SKATING',
    subtitle: 'Movement Command',
    desc: 'M.E.T. Your skating style. Game Sync. Movement command before the play moves.',
    Icon: Footprints,
    ...TOOLBOX_PALETTES[1],
  },
  {
    num: '3',
    name: '7AMS',
    subtitle: "The Goalie's GPS",
    desc: 'Seven markers. The Feel Factor. Positional certainty at all times.',
    Icon: Map,
    ...TOOLBOX_PALETTES[2],
  },
  {
    num: '4',
    name: '6 ZONE – 7 POINT SYSTEM™',
    subtitle: 'Net Management',
    desc: 'Below the icing line. Wraparounds. Net management made complete.',
    Icon: Grid3X3,
    ...TOOLBOX_PALETTES[0],
  },
  {
    num: '5',
    name: 'FORM',
    subtitle: 'Technical Precision',
    desc: 'Your set crouch. Maximum coverage. Minimal movement. Technical precision.',
    Icon: Target,
    ...TOOLBOX_PALETTES[1],
  },
  // Numbers here follow the public marketing list (see PUBLIC_PILLARS in
  // src/lib/pillar-public-routes.ts), which counts 7AMS and the 6 Zone – 7 Point
  // System™ as pillars 3 and 4. In the app they are the two halves of Pillar 3,
  // and Game and Practice are separate pillars. Renumbering this card set and
  // splitting this entry in two both need Michael's sign-off and new copy.
  {
    num: '6',
    name: 'GAME & PRACTICE',
    subtitle: 'The Development Loop',
    desc: 'Reading the play. The Development Loop. Charting everything.',
    Icon: BarChart3,
    ...TOOLBOX_PALETTES[2],
  },
  {
    num: '7',
    name: 'LIFESTYLE',
    subtitle: 'Off-Ice as Performance',
    desc: 'Off-ice as performance. Mental preparation. Balance. The Maintenance Program.',
    Icon: Heart,
    ...TOOLBOX_PALETTES[0],
  },
];

function PillarCard({
  pillar,
  isActive,
  onHover,
}: {
  pillar: PillarDef;
  isActive: boolean;
  onHover: () => void;
}) {
  const { Icon } = pillar;
  const numLabel = `0${pillar.num}`;
  const { accent, accentLight, accentRgb, cardGradient, glowColor } = pillar;

  return (
    <TiltCard
      tiltLimit={8}
      scale={1.03}
      effect="gravitate"
      spotlight
      onClick={onHover}
      className="group h-full cursor-default rounded-[16px]"
      style={{
        border: `1px solid rgba(${accentRgb}, ${isActive ? 0.75 : 0.45})`,
        boxShadow: isActive
          ? `0 16px 40px ${glowColor}, 0 0 0 1px rgba(${accentRgb}, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)`
          : `0 8px 28px ${glowColor}, 0 0 0 1px rgba(${accentRgb}, 0.1), inset 0 1px 0 rgba(255,255,255,0.06)`,
        background: cardGradient,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      <div
        className="relative flex h-full min-h-[180px] flex-col overflow-hidden p-5 md:p-6"
        onMouseEnter={onHover}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accent} 35%, ${accentLight} 65%, transparent 100%)`,
            opacity: isActive ? 1 : 0.7,
          }}
        />

        <div
          className="pointer-events-none absolute -left-6 -top-6 h-28 w-28 rounded-full blur-2xl"
          style={{ background: `rgba(${accentRgb}, 0.22)` }}
        />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <Icon
          size={56}
          strokeWidth={1}
          className="pointer-events-none absolute -bottom-3 -right-3 opacity-[0.07] transition-opacity duration-300 group-hover:opacity-[0.1]"
          style={{ color: accent }}
        />

        <div
          className="pointer-events-none absolute right-0 bottom-0 font-black leading-none select-none"
          style={{
            fontSize: 'clamp(48px, 8vw, 64px)',
            color: `rgba(${accentRgb}, 0.1)`,
            letterSpacing: '-3px',
          }}
        >
          {numLabel}
        </div>

        <div className="relative z-10 flex h-full flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <div
              className="flex shrink-0 items-center justify-center rounded-lg"
              style={{
                width: 38,
                height: 38,
                background: `linear-gradient(135deg, rgba(${accentRgb}, 0.3) 0%, rgba(${accentRgb}, 0.08) 100%)`,
                border: `1px solid rgba(${accentRgb}, 0.4)`,
                boxShadow: `0 4px 14px rgba(${accentRgb}, 0.2)`,
              }}
            >
              <Icon size={18} color={accentLight} strokeWidth={2} />
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: accentLight,
                letterSpacing: '2.5px',
                textTransform: 'uppercase',
              }}
            >
              Pillar {numLabel}
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                background: `linear-gradient(135deg, rgba(${accentRgb}, 0.3), rgba(${accentRgb}, 0.1))`,
                border: `1px solid rgba(${accentRgb}, 0.35)`,
                borderRadius: 20,
                padding: '4px 10px',
              }}
            >
              {pillar.subtitle}
            </span>
            {pillar.foundation && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#041530',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  background: `linear-gradient(135deg, ${accentLight}, ${accent})`,
                  borderRadius: 20,
                  padding: '4px 10px',
                  boxShadow: `0 0 10px ${glowColor}`,
                }}
              >
                Foundation
              </span>
            )}
          </div>

          <h3
            style={{
              fontSize: 'clamp(16px, 2vw, 19px)',
              fontWeight: 800,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              margin: '0 0 10px',
              lineHeight: 1.2,
              textShadow: `0 0 24px rgba(${accentRgb}, 0.25)`,
            }}
          >
            {pillar.name}
          </h3>

          <p
            style={{
              fontSize: 'clamp(13px, 1.5vw, 15px)',
              color: 'rgba(255,255,255,0.78)',
              lineHeight: 1.65,
              margin: 0,
              marginTop: 'auto',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {pillar.desc}
          </p>
        </div>
      </div>
    </TiltCard>
  );
}

interface PillarsArchitectureSectionProps {
  voiceButton: React.ReactNode;
}

export function PillarsArchitectureSection({ voiceButton }: PillarsArchitectureSectionProps) {
  const [activeNum, setActiveNum] = useState<string | null>(null);

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(80px,10vw,130px) 0',
        background: 'linear-gradient(160deg, #000f28 0%, #041530 55%, #060d1a 100%)',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pillar-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pillar-node-glow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
      `}} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(96,205,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(96,205,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(90vw, 900px)',
          height: '500px',
          background: 'radial-gradient(ellipse, rgba(55,181,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '-4%',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 'clamp(280px, 48vw, 680px)',
          fontWeight: 900,
          color: 'rgba(55,181,255,0.025)',
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
          letterSpacing: '-20px',
        }}
      >
        7
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10 mb-14 md:mb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 mb-5">
              <div style={{ width: 36, height: 1.5, background: BLUE2, opacity: 0.6 }} />
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '4px',
                  color: BLUE2,
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                The Architecture
              </p>
              <div style={{ width: 36, height: 1.5, background: BLUE2, opacity: 0.6 }} />
            </div>

            <h2
              style={{
                fontSize: 'clamp(32px, 5vw, 58px)',
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '-0.03em',
                margin: '0 0 16px',
                lineHeight: 1.0,
              }}
            >
              THE{' '}
              <span
                style={{
                  background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE2} 50%, ${BLUE3} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 24px rgba(55,181,255,0.35))',
                }}
              >
                7 PILLARS
              </span>
            </h2>

            <p
              style={{
                fontSize: 'clamp(14px, 1.6vw, 17px)',
                color: 'rgba(148,195,228,0.8)',
                margin: 0,
                maxWidth: 520,
                lineHeight: 1.7,
              }}
            >
              Each Pillar connects to the next. Nothing operates in isolation — one complete system built layer by layer.
            </p>
          </div>

          <div className="hidden md:flex flex-col items-center shrink-0" style={{ minWidth: 140 }}>
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              <div
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  border: '1px dashed rgba(96,205,255,0.25)',
                  animation: 'pillar-ring-spin 24s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(55,181,255,0.15) 0%, transparent 70%)',
                  border: '1px solid rgba(96,205,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(55,181,255,0.15), inset 0 0 30px rgba(55,181,255,0.08)',
                }}
              >
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    background: `linear-gradient(135deg, ${BLUE}, ${BLUE3})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  7
                </span>
              </div>
              {PILLARS.map((p, i) => {
                const angle = (i / 7) * 2 * Math.PI - Math.PI / 2;
                const x = 50 + 46 * Math.cos(angle);
                const y = 50 + 46 * Math.sin(angle);
                return (
                  <div
                    key={p.num}
                    style={{
                      position: 'absolute',
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: p.accent,
                      boxShadow: `0 0 10px ${p.glowColor}`,
                      animation: 'pillar-node-glow 2.4s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                      opacity: activeNum === null || activeNum === p.num ? 1 : 0.35,
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                );
              })}
            </div>
            <p
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '2.5px',
                color: 'rgba(96,205,255,0.55)',
                textTransform: 'uppercase',
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              One Connected System
            </p>
          </div>
        </div>

        <div className="mb-10 flex flex-col gap-5">
          <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {PILLARS.slice(0, 4).map((p) => (
              <PillarCard
                key={p.num}
                pillar={p}
                isActive={activeNum === null || activeNum === p.num}
                onHover={() => setActiveNum(p.num)}
              />
            ))}
          </div>

          {/* 3 pillars centered under the row of 4 — each card = 25% of full width */}
          <div className="mx-auto grid w-full grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:w-3/4 xl:grid-cols-3">
            {PILLARS.slice(4).map((p) => (
              <PillarCard
                key={p.num}
                pillar={p}
                isActive={activeNum === null || activeNum === p.num}
                onHover={() => setActiveNum(p.num)}
              />
            ))}
          </div>
        </div>

        {voiceButton}
      </div>
    </section>
  );
}
