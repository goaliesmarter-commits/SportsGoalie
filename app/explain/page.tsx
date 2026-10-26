'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Shield, Users, ClipboardList, Target, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Header7 } from '@/components/header-7';
import { useCoachAudio } from '@/lib/audio/context';
import { markRoleArrival } from '@/lib/audio/arrival';

interface Role {
  id: string;
  label: string;
  Icon: LucideIcon;
  href: string;
}

const ROLES: Role[] = [
  { id: 'goalie',       label: 'Goalie',          Icon: Shield,        href: '/goalie' },
  { id: 'parent',       label: 'Parent',           Icon: Users,         href: '/parent-role' },
  { id: 'coach',        label: 'Coach / Manager',  Icon: ClipboardList, href: '/team-programs' },
  { id: 'goaliecoach',  label: 'Goalie Coach',     Icon: Target,        href: '/goalie-coach' },
  { id: 'organization', label: 'Organization',     Icon: Building2,     href: '/organization' },
];

export default function ExplainPage() {
  const router = useRouter();
  const { prime } = useCoachAudio();

  // Choosing a role is the tap that lets Coach Mike's welcome start by itself
  // on the next page: it unlocks sound on a phone, and notes where the visitor
  // is going so only that page starts on its own (Audio Part 1, item 1.2).
  const chooseRole = (href: string) => {
    prime();
    markRoleArrival(href);
    router.push(href);
  };
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      style={{
        // min-height, not height: five role cards don't fit one phone screen, and a
        // fixed 100dvh with overflow hidden left the last role unreachable.
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#000f28',
        overflowX: 'clip',
        position: 'relative',
      }}
    >
      {/* Radial blue glow */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80vw',
          height: '60vh',
          background: 'radial-gradient(ellipse at center, rgba(14,80,180,0.32) 0%, rgba(5,30,80,0.12) 55%, transparent 75%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Navbar */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 20 }}>
        <Header7 />
      </div>

      {/* Main content — fills remaining height, centres everything */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'clamp(20px,3.5vh,44px)',
          // The header is position: fixed, so it takes no space here. Clear it
          // explicitly now the page can scroll, and leave room under the help
          // button for the footer note.
          padding: 'calc(76px + clamp(8px,1.5vh,24px)) clamp(16px,4vw,48px) 76px',
          position: 'relative',
          zIndex: 5,
        }}
      >
        {/* ── Text block ── */}
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '900px' }}>
          {/* Eyebrow */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: 'clamp(12px,1.8vh,20px)' }}>
            <div style={{ width: '36px', height: '1.5px', background: '#37b5ff', opacity: 0.6 }} />
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '4px', color: '#37b5ff', textTransform: 'uppercase', margin: 0 }}>
              THE SMARTER GOALIE DIFFERENCE
            </p>
            <div style={{ width: '36px', height: '1.5px', background: '#37b5ff', opacity: 0.6 }} />
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: 'clamp(24px,4vw,52px)',
              fontWeight: 900,
              lineHeight: 1.1,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              margin: '0 0 clamp(24px,3vh,40px)',
            }}
          >
            ONE UNIQUE SYSTEM BUILT BY A GOALIE FOR{' '}
            <span
              style={{
                color: '#37b5ff',
                textShadow: '0 0 30px rgba(55,181,255,0.6), 0 0 60px rgba(55,181,255,0.25)',
              }}
            >
              MOTIVATED GOALIES ONLY&hellip;
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 'clamp(13px,1.2vw,15px)', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
            Select your role below. Coach Mike&rsquo;s voice is waiting on the other side.
          </p>
        </div>

        {/* ── Role cards ── */}
        <div
          className="flex flex-wrap justify-center"
          style={{
            // --role-gap feeds both the gap and the per-row card widths below
            ['--role-gap' as string]: 'clamp(10px,1.5vw,20px)',
            gap: 'var(--role-gap)',
            width: '100%',
            maxWidth: '1100px',
            marginTop: 'clamp(28px,5vh,64px)',
          }}
        >
          {ROLES.map((role) => {
            const hovered = hoveredId === role.id;
            const Icon = role.Icon;
            return (
              <div
                key={role.id}
                className="min-w-0 grow-0 basis-[calc((100%_-_var(--role-gap))/2)] sm:basis-[calc((100%_-_2*var(--role-gap))/3)] lg:grow lg:basis-0"
                onClick={() => chooseRole(role.href)}
                onMouseEnter={() => setHoveredId(role.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: hovered ? 'rgba(14,60,140,0.55)' : 'rgba(8,28,72,0.45)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${hovered ? 'rgba(55,181,255,0.45)' : 'rgba(55,181,255,0.15)'}`,
                  borderRadius: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'clamp(24px,3vh,40px) 12px clamp(20px,2.5vh,32px)',
                  height: 'clamp(200px,26vh,300px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: hovered
                    ? '0 8px 40px rgba(55,181,255,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : '0 4px 20px rgba(0,0,20,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                  transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    size={52}
                    color={hovered ? '#7dd3fc' : '#37b5ff'}
                    strokeWidth={1.2}
                    style={{
                      filter: hovered
                        ? 'drop-shadow(0 0 12px rgba(55,181,255,0.7))'
                        : 'drop-shadow(0 0 6px rgba(55,181,255,0.3))',
                      transition: 'all 0.3s',
                    }}
                  />
                </div>

                {/* Label */}
                <p
                  style={{
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 'clamp(13px,1.2vw,17px)',
                    letterSpacing: '0.3px',
                    margin: 0,
                    textAlign: 'center',
                  }}
                >
                  {role.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
          EVERY DOOR LEADS TO THE SAME DESTINATION &mdash; BUILDING THE INTELLIGENT ATHLETIC GOALTENDER
        </p>
      </main>
    </div>
  );
}
