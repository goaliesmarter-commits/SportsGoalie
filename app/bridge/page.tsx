'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GemVoiceButton } from '@/components/audio/GemVoiceButton';
import { Footer7 } from '@/components/footer-7';
import { PublicPageNav } from '@/components/PublicPageNav';
import dynamic from 'next/dynamic';

const BeamsBackground = dynamic(
  () => import('@/components/ui/beams-background').then(m => ({ default: m.BeamsBackground })),
  { ssr: false }
);

const BLUE  = '#37b5ff';
const BLUE2 = '#60cdff';
const BLUE3 = '#0ea5e9';
const BLUE4 = '#7dd3fc';
const GOLD  = '#fbbf24';
const NAVY  = '#000f28';
const NAVY2 = '#041530';
const BODY  = 'rgba(200,230,255,0.84)';
const MUTED = 'rgba(148,192,228,0.72)';

const DOORS = [
  {
    number: 'DOOR ONE',
    title: 'The Motivated Goaltender',
    accent: GOLD,
    borderColor: `rgba(251,191,36,0.5)`,
    bg: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.03))',
    body: [
      'You want it. You feel it. And there is no support, no verification, no charting available to you today like the Smarter Goalie teaching system — anywhere.',
      'It doesn\'t matter that you have a goalie coach — being your best is not having a closed mind. Building your game is a science: knowing self, and how you relate to the game.',
      'Can you improve any aspect of your game? Shouldn\'t you want to improve ALL aspects of your game? Do you realize you can — with an open mind to know, to understand, to grow your game?',
    ],
    promise: 'Are you the best you can be? How do you measure that?',
    promiseBold: 'With Smarter Goalie — you can.',
  },
  {
    number: 'DOOR TWO',
    title: 'The Goalie Without Access',
    accent: BLUE2,
    borderColor: `rgba(96,205,255,0.4)`,
    bg: 'linear-gradient(135deg, rgba(55,181,255,0.08), rgba(14,165,233,0.04))',
    body: [
      'No goalie coach in your area. The nearest operation is hours away. The team\'s coaches mean well, but nobody speaks goaltender.',
      'You are exactly who this system was built for: the full teaching architecture — the 8 Pillars, the charting, Coach Mike\'s voice — reaches you wherever the ice is.',
    ],
    promise: null,
    promiseBold: null,
  },
  {
    number: 'DOOR THREE',
    title: 'The Goalie With a Coach',
    accent: BLUE4,
    borderColor: `rgba(125,211,252,0.3)`,
    bg: 'linear-gradient(135deg, rgba(125,211,252,0.06), rgba(55,181,255,0.03))',
    body: [
      'Keep your coach. We are not here to replace anyone — we work with goalie coaches when they\'re open to participating. A goalie can learn something from everyone.',
      'What we add is what no single coach can: the system, the verification, the charting record, and a second set of six-decade eyes on the work.',
    ],
    promise: null,
    promiseBold: null,
  },
];

const TIERS = [
  { label: 'An Experience',           color: 'rgba(55,181,255,0.25)', dot: 'rgba(55,181,255,0.35)', bold: false },
  { label: 'An OK Experience',        color: 'rgba(55,181,255,0.35)', dot: MUTED,                   bold: false },
  { label: 'A Great Experience',      color: 'rgba(55,181,255,0.45)', dot: BLUE3,                   bold: false },
  { label: 'A COMMAND Experience',    color: `rgba(251,191,36,0.12)`, dot: GOLD,                    bold: true,  border: `rgba(251,191,36,0.5)`, glow: true },
];

const KNOW_CHIPS = ['Know', 'Know YOUR Tech', 'Know YOUR Mind', 'Know YOUR Game'];

export default function BridgePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: '#fff' }}>

      <PublicPageNav />

      {/* ── HERO ── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 'clamp(80px,10vw,120px)', paddingBottom: 'clamp(60px,8vw,100px)' }}>

        <div style={{ position: 'absolute', inset: 0, background: NAVY, zIndex: 0 }} />

        {/* Blue/gold corner glows */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background:
          `radial-gradient(ellipse at 0% 0%,   rgba(55,181,255,0.14) 0%, transparent 50%),
           radial-gradient(ellipse at 100% 0%,  rgba(14,165,233,0.11) 0%, transparent 45%),
           radial-gradient(ellipse at 0% 100%,  rgba(251,191,36,0.07) 0%, transparent 45%),
           radial-gradient(ellipse at 100% 100%,rgba(55,181,255,0.09) 0%, transparent 40%)`,
          pointerEvents: 'none' }} />

        {/* Beams */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, overflow: 'hidden' }}>
          <BeamsBackground
            beamWidth={3}
            beamHeight={30}
            beamNumber={10}
            lightColor={BLUE}
            backgroundColor="transparent"
            speed={1.4}
            noiseIntensity={1.1}
            scale={0.14}
            rotation={40}
          />
        </div>

        {/* Readability overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: `linear-gradient(to bottom, rgba(0,15,40,0.4) 0%, rgba(0,15,40,0.1) 40%, rgba(0,15,40,0.5) 100%)`, pointerEvents: 'none' }} />

        {/* Ghost watermark */}
        <div style={{ position: 'absolute', right: '-3%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(80px, 16vw, 240px)', fontWeight: 900, fontStyle: 'italic', color: 'rgba(55,181,255,0.04)', letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 2, textTransform: 'uppercase' }}>
          BRIDGED
        </div>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', padding: '7px 13px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.3px', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(55,181,255,0.14)'; el.style.borderColor = 'rgba(55,181,255,0.45)'; el.style.color = '#fff'; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.08)'; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.color = 'rgba(255,255,255,0.8)'; }}
        >
          <ChevronLeft size={13} />Back
        </button>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 4 }}>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '50px', padding: '8px 20px', marginBottom: '28px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: BLUE, boxShadow: '0 0 0 3px rgba(55,181,255,0.2)', flexShrink: 0 }} />
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3.5px', color: BLUE, margin: 0, textTransform: 'uppercase' }}>SMARTER GOALIE</p>
          </div>

          {/* Color bar */}
          <div style={{ display: 'flex', height: '3px', width: '220px', borderRadius: '4px', overflow: 'hidden', marginBottom: '28px', gap: '2px' }}>
            {[BLUE, BLUE2, GOLD, BLUE3].map(c => (
              <div key={c} style={{ flex: 1, background: c, boxShadow: `0 0 8px ${c}` }} />
            ))}
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 7vw, 96px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', margin: '0 0 20px', color: '#fff' }}>
            EVERY GOALIE.<br />
            EVERY SITUATION.<br />
            <span style={{ color: BLUE2, textShadow: `0 0 40px rgba(96,205,255,0.47), 0 0 80px rgba(96,205,255,0.2)`, fontStyle: 'italic' }}>BRIDGED.</span>
          </h1>

          <p style={{ fontSize: 'clamp(15px, 1.8vw, 20px)', color: 'rgba(200,230,255,0.72)', lineHeight: 1.85, maxWidth: '580px', margin: '0 0 44px', fontStyle: 'italic' }}>
            No goalie coach near you? Have one already? Driven to be more than anyone around you can teach? You&apos;re in the right place.
          </p>

          {/* Door dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {DOORS.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.accent, boxShadow: `0 0 8px ${d.accent}99, 0 0 16px ${d.accent}44` }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: d.accent, opacity: 0.7, letterSpacing: '1.8px', textTransform: 'uppercase' as const }}>
                  {d.number}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OPENING ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(64px,9vw,110px) 0', background: `linear-gradient(160deg, ${NAVY2} 0%, #061a38 100%)` }}>
        <div style={{ position: 'absolute', right: '-5%', top: '20%', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '2px', background: `linear-gradient(90deg, ${BLUE2}, rgba(96,205,255,0.2))`, flexShrink: 0 }} />
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '4px', color: BLUE2, margin: 0, textTransform: 'uppercase' }}>THE SITUATION</p>
          </div>

          <p style={{ fontSize: 'clamp(17px, 2vw, 22px)', color: BODY, lineHeight: 1.9, maxWidth: '820px', margin: '0 0 20px', fontStyle: 'italic' }}>
            Goaltending is the most under-served position in sport. Some goalies have no goalie coach within an hour&apos;s drive. Some have a coach but hunger for more. Some are simply driven — and nothing around them matches the drive.
          </p>

          <div style={{ borderLeft: `4px solid ${BLUE}`, paddingLeft: '24px', maxWidth: '720px' }}>
            <p style={{ fontSize: 'clamp(18px, 2.4vw, 26px)', fontWeight: 900, color: '#fff', lineHeight: 1.3, margin: 0, letterSpacing: '-0.01em' }}>
              Smarter Goalie was built to bridge every one of those situations.{' '}
              <span style={{ color: BLUE2 }}>Six decades of original teaching, delivered wherever you are.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── THREE DOORS ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(64px,9vw,110px) 0', background: `linear-gradient(155deg, #071a38 0%, #0c2244 100%)` }}>
        <div style={{ position: 'absolute', left: '-10%', bottom: '10%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(251,191,36,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '-40px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(100px, 18vw, 280px)', fontWeight: 900, color: 'rgba(55,181,255,0.018)', letterSpacing: '-0.04em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}>DOORS</div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10" style={{ position: 'relative', zIndex: 1 }}>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '44px' }}>
            <div style={{ width: '6px', minHeight: '80px', background: `linear-gradient(to bottom, ${BLUE2}, ${BLUE2}55)`, boxShadow: `0 0 20px ${BLUE2}cc, 0 0 40px ${BLUE2}44`, borderRadius: '3px', flexShrink: 0, marginTop: '4px' }} />
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3.5px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 6px' }}>THREE DOORS — ONE HOUSE</p>
              <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 60px)', fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-0.025em', margin: 0 }}>
                WHICH ONE IS <span style={{ color: BLUE2, fontStyle: 'italic' }}>YOURS?</span>
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '820px' }}>
            {DOORS.map((door, i) => (
              <div key={i} style={{
                background: door.bg,
                border: `1px solid ${door.borderColor}`,
                borderRadius: '18px',
                padding: 'clamp(24px,3.5vw,36px)',
                position: 'relative',
                boxShadow: `0 4px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}>
                {/* Door label */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: door.accent, boxShadow: `0 0 8px ${door.accent}` }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: door.accent, textTransform: 'uppercase' as const }}>{door.number}</span>
                </div>

                <h3 style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.015em', fontStyle: 'italic' }}>
                  {door.title}
                </h3>

                {door.body.map((para, pi) => (
                  <p key={pi} style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: BODY, lineHeight: 1.85, margin: '0 0 12px' }}>
                    {para}
                  </p>
                ))}

                {door.promise && (
                  <div style={{ marginTop: '18px', borderTop: `1px dashed ${door.accent}35`, paddingTop: '18px', textAlign: 'center' }}>
                    <p style={{ fontSize: 'clamp(16px, 1.8vw, 19px)', fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: '0 0 6px' }}>
                      {door.promise}
                    </p>
                    <p style={{ fontSize: 'clamp(16px, 1.8vw, 19px)', fontWeight: 900, color: door.accent, margin: 0 }}>
                      {door.promiseBold}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INFORMED GOALTENDER ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(64px,9vw,110px) 0', background: `radial-gradient(circle at 70% 30%, #0d2848 0%, #050c1c 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.008) 0px, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 10px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '-40px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(100px, 18vw, 280px)', fontWeight: 900, color: 'rgba(255,255,255,0.016)', letterSpacing: '-0.04em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}>KNOW</div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10" style={{ position: 'relative', zIndex: 1 }}>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '36px' }}>
            <div style={{ width: '6px', minHeight: '80px', background: `linear-gradient(to bottom, ${GOLD}, ${GOLD}55)`, boxShadow: `0 0 20px ${GOLD}cc, 0 0 40px ${GOLD}44`, borderRadius: '3px', flexShrink: 0, marginTop: '4px' }} />
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3.5px', color: GOLD, textTransform: 'uppercase', margin: '0 0 6px' }}>THE INFORMED GOALTENDER</p>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 56px)', fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-0.025em', margin: 0 }}>
                A SMARTER GOALIE{' '}
                <span style={{ color: BLUE2, fontStyle: 'italic' }}>DOESN&apos;T GET FOOLED</span>
              </h2>
            </div>
          </div>

          {/* Know chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '32px' }}>
            {KNOW_CHIPS.map(chip => (
              <span key={chip} style={{
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontWeight: 700, fontSize: '11px', letterSpacing: '1.5px',
                border: `1px solid rgba(96,205,255,0.45)`,
                color: BLUE2, borderRadius: '99px', padding: '9px 20px',
                textTransform: 'uppercase', background: 'rgba(96,205,255,0.06)',
                boxShadow: '0 0 12px rgba(96,205,255,0.08)',
              }}>
                {chip}
              </span>
            ))}
          </div>

          <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: BODY, lineHeight: 1.85, maxWidth: '720px', margin: '0 0 24px' }}>
            An informed goaltender walks into any camp, school, or goalie operation and understands the level of knowledge being offered. They can tell the difference:
          </p>

          {/* Tier list */}
          <div style={{ maxWidth: '520px', marginBottom: '36px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TIERS.map((tier, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '14px 20px',
                border: `1px solid ${tier.border ?? 'rgba(55,181,255,0.14)'}`,
                borderRadius: '14px',
                background: tier.color,
                boxShadow: tier.glow ? `0 0 24px rgba(251,191,36,0.12)` : 'none',
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tier.dot, boxShadow: tier.glow ? `0 0 10px ${GOLD}` : 'none', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', fontWeight: tier.bold ? 900 : 600, color: tier.bold ? GOLD : 'rgba(200,230,255,0.85)', letterSpacing: tier.bold ? '0.5px' : '0' }}>
                  {tier.label}
                </span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: BODY, lineHeight: 1.85, maxWidth: '720px', margin: '0 0 14px' }}>
            And when the camp delivers a weak option — it&apos;s no mystery.{' '}
            <span style={{ color: BLUE2, fontWeight: 700 }}>You don&apos;t necessarily leave.</span>{' '}
            Polite interaction — <em>&ldquo;here&apos;s what I do,&rdquo;</em>{' '}with informed explanation — lets you use the ice time, the shooters, and the clock wisely: honing YOUR game, not getting indoctrinated into something that doesn&apos;t maximize coverage and minimize waste.
          </p>

          <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: MUTED, lineHeight: 1.85, maxWidth: '700px', margin: '0 0 36px', fontStyle: 'italic' }}>
            Over the decades, students have told us these stories again and again — and the instructor who takes the time to listen sees the logic, the common sense, the math and science in the breakdown.
          </p>

          {/* House card */}
          <div style={{
            background: `linear-gradient(135deg, rgba(55,181,255,0.09), rgba(55,181,255,0.04))`,
            border: `1px solid rgba(96,205,255,0.28)`,
            borderRadius: '18px', padding: 'clamp(24px,3.5vw,40px)',
            textAlign: 'center', maxWidth: '520px',
            boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
          }}>
            <p style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', fontStyle: 'italic', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, margin: '0 0 10px' }}>
              &ldquo;A <span style={{ color: BLUE2, fontStyle: 'normal', fontWeight: 900 }}>Smarter Goalie</span>{' '}is in the house.&rdquo;
            </p>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: MUTED, textTransform: 'uppercase', margin: 0 }}>
              Respect in the house — all around
            </p>
          </div>
        </div>
      </section>

      {/* ── VOICE ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(56px,7vw,90px) 0', background: `linear-gradient(145deg, ${NAVY} 0%, ${NAVY2} 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background:
          `radial-gradient(ellipse at 20% 50%, rgba(55,181,255,0.10) 0%, transparent 55%),
           radial-gradient(ellipse at 80% 50%, rgba(14,165,233,0.07) 0%, transparent 50%)`,
          pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '2px', background: `linear-gradient(90deg, ${BLUE2}, rgba(96,205,255,0.2))`, flexShrink: 0 }} />
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '4px', color: BLUE2, margin: 0, textTransform: 'uppercase' }}>COACH MIKE</p>
            </div>

            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 46px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
              Hear It From<br />
              <span style={{ color: BLUE2, fontStyle: 'italic' }}>Coach Mike Directly.</span>
            </h2>

            <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: BODY, lineHeight: 1.85, margin: '0 0 32px', fontStyle: 'italic' }}>
              Maybe there&apos;s no goalie coach within a hundred miles. Maybe you have a good one. Or maybe you&apos;re just driven — and nothing around you matches the drive. Coach Mike built this for every one of you.
            </p>

            <GemVoiceButton label="HEAR COACH MIKE: EVERY GOALIE. EVERY SITUATION. BRIDGED." />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(72px,10vw,120px) 0', background:
        `radial-gradient(ellipse at 85% 10%,  rgba(55,181,255,0.14) 0%, transparent 45%),
         radial-gradient(ellipse at 15% 90%,  rgba(251,191,36,0.07) 0%, transparent 45%),
         radial-gradient(ellipse at 5%  40%,  rgba(96,205,255,0.10) 0%, transparent 40%),
         linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)` }}>

        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(96,205,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(96,205,255,0.016) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '620px', margin: '0 auto', textAlign: 'center' }}>

            {/* Gold accent bar */}
            <div style={{ display: 'flex', height: '3px', width: '160px', margin: '0 auto 36px', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
              {[BLUE, BLUE2, GOLD, BLUE3].map(c => (
                <div key={c} style={{ flex: 1, background: c, boxShadow: `0 0 8px ${c}` }} />
              ))}
            </div>

            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '4px', color: GOLD, textTransform: 'uppercase', marginBottom: '16px' }}>JOIN THE FOUNDING 100</p>

            <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 56px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: '16px' }}>
              Whatever your situation —{' '}
              <span style={{ color: BLUE2, fontStyle: 'italic' }}>bridged.</span>
            </h2>

            <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: MUTED, marginBottom: '36px', lineHeight: 1.7, fontStyle: 'italic' }}>
              Coach Mike is personally selecting the first one hundred goalies to join the Smarter Goalie BUILD experience. Learn smart. Play smart.
            </p>

            {submitted ? (
              <div style={{ background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(96,205,255,0.35)', borderRadius: '16px', padding: '28px 32px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${BLUE}, ${BLUE3})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 20px rgba(55,181,255,0.4)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>You&apos;re on the list.</p>
                <p style={{ fontSize: '13px', color: MUTED, margin: 0, fontStyle: 'italic' }}>Coach Mike will be in touch personally.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '480px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="Your email address"
                  style={{
                    flex: '1 1 220px', minWidth: '0',
                    border: '1px solid rgba(55,181,255,0.28)',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    color: '#fff',
                    fontSize: '14px',
                    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: `linear-gradient(135deg, ${BLUE}, ${BLUE3})`,
                    color: NAVY, border: 'none',
                    borderRadius: '12px', padding: '14px 28px',
                    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                    fontWeight: 800, fontSize: '12px', letterSpacing: '1.5px',
                    cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    boxShadow: '0 4px 20px rgba(55,181,255,0.4)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  I&apos;M IN <ChevronRight size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer7 />

    </div>
  );
}
