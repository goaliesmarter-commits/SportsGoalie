'use client';

import { useState } from 'react';
import { ArrowUpRight, BarChart3, Brain, Map, type LucideIcon } from 'lucide-react';
import { TiltCard } from '@/components/ui/tilt-card';

interface ToolboxItem {
  id: string;
  number: string;
  title: string;
  tag: string;
  description: string;
  accent: string;
  accentLight: string;
  accentRgb: string;
  cardGradient: string;
  glowColor: string;
  Icon: LucideIcon;
}

const TOOLBOX_ITEMS: ToolboxItem[] = [
  {
    id: 'positional',
    number: '01',
    title: 'Goalies Positional System',
    tag: 'GPS · 7AMS · 6ZS',
    description:
      'Your most critical relationship isn\'t with a coach or your teammates or even your parents — it\'s with the net - the seven angles above the icing line and the 6 zones below the icing line... When you are aware-sensitive to the net, the crease, and the white ice, you stop guessing and start USING YOUR SPIDY SENSES.',
    accent: '#37b5ff',
    accentLight: '#7dd3fc',
    accentRgb: '55,181,255',
    cardGradient: 'linear-gradient(155deg, rgba(18,72,140,0.92) 0%, rgba(8,32,72,0.96) 48%, rgba(4,18,44,0.98) 100%)',
    glowColor: 'rgba(55,181,255,0.35)',
    Icon: Map,
  },
  {
    id: 'game-iq',
    number: '02',
    title: 'Game IQ Assessments',
    tag: 'DECISION MAKING PROCESS',
    description:
      'The decision making process can be mapped and understood by replacing and reducing over reacting mentally or not reacting in a timely manner. These recognitions give context to game situations, building a smarter framework in decision making related to the play. "INTELLIGENT ATHLETE GOALTENDING"',
    accent: '#c4b5fd',
    accentLight: '#e9d5ff',
    accentRgb: '196,181,253',
    cardGradient: 'linear-gradient(155deg, rgba(76,48,140,0.9) 0%, rgba(36,24,82,0.96) 48%, rgba(12,10,44,0.98) 100%)',
    glowColor: 'rgba(167,139,250,0.32)',
    Icon: Brain,
  },
  {
    id: 'analytics',
    number: '03',
    title: 'Performance Analytics',
    tag: 'BASELINE · GAPS · GROWTH',
    description:
      'Know what you do not know. Track your gaps, chart your growth, and build the self-awareness to coach yourself between sessions.',
    accent: '#5eead4',
    accentLight: '#99f6e4',
    accentRgb: '94,234,212',
    cardGradient: 'linear-gradient(155deg, rgba(16,100,100,0.9) 0%, rgba(10,52,68,0.96) 48%, rgba(4,22,40,0.98) 100%)',
    glowColor: 'rgba(45,212,191,0.32)',
    Icon: BarChart3,
  },
];

function ToolboxCard({
  item,
  isActive,
  onActivate,
}: {
  item: ToolboxItem;
  isActive: boolean;
  onActivate: () => void;
}) {
  const { Icon } = item;

  return (
    <TiltCard
      tiltLimit={12}
      scale={1.04}
      effect="gravitate"
      spotlight
      onClick={onActivate}
      className="group h-full cursor-pointer rounded-[22px]"
      style={{
        border: `1px solid rgba(${item.accentRgb}, ${isActive ? 0.85 : 0.5})`,
        boxShadow: isActive
          ? `0 24px 60px ${item.glowColor}, 0 0 0 1px rgba(${item.accentRgb}, 0.25), inset 0 1px 0 rgba(255,255,255,0.12)`
          : `0 16px 48px ${item.glowColor}, 0 0 0 1px rgba(${item.accentRgb}, 0.12), inset 0 1px 0 rgba(255,255,255,0.08)`,
        background: item.cardGradient,
        transition: 'border-color 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease',
      }}
    >
      <div className="relative flex h-full min-h-[320px] flex-col overflow-hidden p-7 md:p-8">
        {/* Top accent bar */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${item.accent} 35%, ${item.accentLight} 65%, transparent 100%)`,
            opacity: isActive ? 1 : 0.75,
          }}
        />

        {/* Corner shine */}
        <div
          className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full blur-2xl"
          style={{ background: `rgba(${item.accentRgb}, 0.28)` }}
        />

        {/* Large watermark icon */}
        <Icon
          size={140}
          strokeWidth={1}
          className="pointer-events-none absolute -bottom-6 -right-6 opacity-[0.07] transition-opacity duration-300 group-hover:opacity-[0.11]"
          style={{ color: item.accent }}
        />

        {/* Subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-20 mb-5 flex items-start justify-between gap-4">
          <span
            className="rounded-lg px-2.5 py-1 text-[11px] font-black tracking-[0.18em]"
            style={{
              color: item.accentLight,
              background: `rgba(${item.accentRgb}, 0.18)`,
              border: `1px solid rgba(${item.accentRgb}, 0.35)`,
              boxShadow: `0 0 20px rgba(${item.accentRgb}, 0.15)`,
            }}
          >
            {item.number}
          </span>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, rgba(${item.accentRgb}, 0.35) 0%, rgba(${item.accentRgb}, 0.08) 100%)`,
              border: `1px solid rgba(${item.accentRgb}, 0.45)`,
              boxShadow: `0 8px 24px rgba(${item.accentRgb}, 0.25)`,
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            <Icon size={26} style={{ color: item.accentLight }} />
          </div>
        </div>

        <span
          className="relative z-20 mb-3 inline-flex w-fit rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{
            color: '#fff',
            background: `linear-gradient(135deg, rgba(${item.accentRgb}, 0.35), rgba(${item.accentRgb}, 0.12))`,
            border: `1px solid rgba(${item.accentRgb}, 0.4)`,
            boxShadow: `0 4px 16px rgba(${item.accentRgb}, 0.2)`,
          }}
        >
          {item.tag}
        </span>

        <h3
          className="relative z-20 mb-3 text-xl font-extrabold md:text-[23px]"
          style={{
            color: '#fff',
            textShadow: `0 0 40px rgba(${item.accentRgb}, 0.25)`,
          }}
        >
          {item.title}
        </h3>
        <p className="relative z-20 flex-1 text-[15px] leading-relaxed text-white/80">{item.description}</p>

        <div
          className="relative z-20 mt-6 flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-300"
          style={{
            background: isActive
              ? `linear-gradient(135deg, rgba(${item.accentRgb}, 0.28), rgba(${item.accentRgb}, 0.1))`
              : `rgba(0,0,0,0.22)`,
            border: `1px solid rgba(${item.accentRgb}, ${isActive ? 0.4 : 0.2})`,
          }}
        >
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Grow your toolbox</span>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300"
            style={{
              background: isActive
                ? `linear-gradient(135deg, ${item.accentLight}, ${item.accent})`
                : `rgba(${item.accentRgb}, 0.2)`,
              color: isActive ? '#041530' : item.accentLight,
              boxShadow: isActive ? `0 6px 20px rgba(${item.accentRgb}, 0.45)` : 'none',
              transform: isActive ? 'translate(2px, -2px)' : 'translate(0, 0)',
            }}
          >
            <ArrowUpRight size={18} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </TiltCard>
  );
}

export function ToolboxSection() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: 'clamp(56px,8vw,96px) clamp(16px,3vw,24px)',
        background: 'linear-gradient(180deg, #000f28 0%, #041530 50%, #000f28 100%)',
      }}
    >
      {/* Ambient background lights */}
      <div
        className="pointer-events-none absolute left-[8%] top-[20%] h-64 w-64 rounded-full blur-[100px]"
        style={{ background: 'rgba(55,181,255,0.12)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[10%] right-[6%] h-72 w-72 rounded-full blur-[110px]"
        style={{ background: 'rgba(167,139,250,0.1)' }}
      />

      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(90%,720px)] -translate-x-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(55,181,255,0.45), transparent)' }}
      />

      <div className="relative mx-auto max-w-[1100px]">
        <div className="mb-12 md:mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-[3px] uppercase mb-3" style={{ background: 'rgba(55,181,255,0.1)', color: '#37b5ff', border: '1px solid rgba(55,181,255,0.25)' }}>THE TOOLS</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white">
            What&rsquo;s In Your Tool Box?
          </h2>
          <p className="mt-4 max-w-[560px] text-base leading-relaxed text-white/50 md:text-[17px]">
            Three systems that separate good goalies from great ones. Build each tool as you grow through the Smarter Goalie path.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 md:gap-7">
          {TOOLBOX_ITEMS.map(item => (
            <ToolboxCard
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onActivate={() => setActiveId(prev => (prev === item.id ? null : item.id))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
