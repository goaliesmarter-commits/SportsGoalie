'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Users, Check, ChevronLeft } from 'lucide-react';
import { Footer7 } from '@/components/footer-7';
import { PublicPageNav } from '@/components/PublicPageNav';
import { TiltCard } from '@/components/ui/tilt-card';
import { FloatingPaths } from '@/components/ui/background-paths';
import { Boxes } from '@/components/ui/background-boxes';
import { SevenPillarsCTA } from '@/components/SevenPillarsCTA';
import { ApplicationSteps } from '@/components/ApplicationSteps';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const BLUE3 = '#0ea5e9';
const RED = '#C00000';

function VoiceButton({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => on && setPlaying(p => !p)}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', background: on ? 'linear-gradient(135deg, rgba(55,181,255,0.14), rgba(96,205,255,0.07))' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? 'rgba(96,205,255,0.32)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '50px', padding: '9px 18px 9px 10px', color: on ? BLUE2 : '#475569', fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', cursor: on ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: on ? '0 2px 10px rgba(55,181,255,0.12)' : 'none' }}
      >
        <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: on ? `linear-gradient(135deg, ${BLUE}, ${BLUE3})` : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {playing ? <Pause size={10} color="#fff" /> : <Play size={10} color="#fff" fill="#fff" />}
        </span>
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">HEAR COACH MIKE</span>
      </button>
      <button onClick={() => { setOn(v => !v); if (on) setPlaying(false); }} style={{ fontSize: '10px', color: on ? BLUE2 : '#475569', letterSpacing: '1.5px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>
        VOICE {on ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

function AutoVoicePlayer() {
  const [playing, setPlaying] = useState(false);
  const [on, setOn] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => { const t = setTimeout(() => setPlaying(true), 900); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!playing || progress >= 100) return;
    const iv = setInterval(() => setProgress(p => Math.min(100, p + 0.222)), 450);
    return () => clearInterval(iv);
  }, [playing, progress]);
  useEffect(() => { if (progress >= 100) setPlaying(false); }, [progress]);

  const fmt = (pct: number) => { const s = Math.round((pct / 100) * 225); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const waveform = [0.3,0.5,0.8,0.4,0.95,0.6,0.35,0.75,1,0.55,0.4,0.85,0.65,0.3,0.9,0.7,0.45,0.5,0.8,0.35,0.6,1,0.4,0.7,0.5,0.9,0.3,0.65,0.85,0.4,0.75,0.5,1,0.35,0.8,0.6,0.45,0.9,0.5,0.3,0.7,0.55,0.8,0.35,0.65,0.95,0.4,0.7,0.5,0.85];

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.45)', animation: 'player-float 6s ease-in-out infinite' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,240,255,0.06))', border: '1.5px solid rgba(0,240,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 14px rgba(0,240,255,0.2)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(0,240,255,0.65)', letterSpacing: '2.5px', textTransform: 'uppercase', margin: '0 0 3px' }}>AUTO-PLAYING: COACH MIKE&apos;S PERSONAL MESSAGE FOR THE GOALIE</p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>Coach Mike</p>
        </div>
        <div style={{ background: playing ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${playing ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '20px', padding: '4px 10px', transition: 'all 0.3s', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: playing ? '#4ade80' : 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>{playing ? 'LIVE' : '3:45'}</span>
        </div>
      </div>
      <p style={{ fontSize: '13px', color: 'rgba(148,163,184,0.65)', margin: '0 0 18px', fontStyle: 'italic', lineHeight: 1.55 }}>
        &ldquo;What it means to truly support your goalie&rdquo;
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5px', height: '52px', marginBottom: '8px', cursor: 'pointer' }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setProgress(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))); }}>
        {waveform.map((h, i) => { const isPast = (i / waveform.length) * 100 < progress; return (<div key={i} style={{ flex: 1, height: `${h * 100}%`, background: isPast ? '#00f0ff' : 'rgba(255,255,255,0.14)', borderRadius: '2px', transition: 'background 0.08s', boxShadow: isPast ? '0 0 4px rgba(0,240,255,0.4)' : 'none' }} />); })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(100,116,139,0.8)' }}>{fmt(progress)}</span>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(100,116,139,0.8)' }}>3:45</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
        <button onClick={() => setProgress(p => Math.max(0, p - 8))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.55)', display: 'flex', padding: '4px' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg></button>
        <button onClick={() => setPlaying(p => !p)} style={{ width: '60px', height: '60px', borderRadius: '50%', background: playing ? 'rgba(0,240,255,0.12)' : '#00f0ff', border: playing ? '2px solid #00f0ff' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: playing ? '0 0 0 8px rgba(0,240,255,0.1), 0 0 24px rgba(0,240,255,0.3)' : '0 0 20px rgba(0,240,255,0.4)', transition: 'all 0.25s' }}>
          {playing ? <Pause size={24} color="#00f0ff" /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="#051125"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <button onClick={() => setProgress(p => Math.min(100, p + 8))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.55)', display: 'flex', padding: '4px' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
      </div>
      <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { setOn(v => !v); if (on) setPlaying(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: on ? '#00f0ff' : 'rgba(100,116,139,0.4)', letterSpacing: '3px', textTransform: 'uppercase' }}>VOICE {on ? 'ON' : 'OFF'}</button>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
          {[12, 20, 8, 16, 10].map((h, i) => (<div key={i} style={{ width: '3px', height: `${playing ? h : Math.round(h * 0.45)}px`, background: i === 1 ? '#00f0ff' : `rgba(0,240,255,${0.35 + i * 0.1})`, borderRadius: '1.5px', transition: `height ${0.2 + i * 0.05}s ease` }} />))}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
      <div style={{ width: '3px', height: '42px', background: `linear-gradient(180deg, ${BLUE2}, ${BLUE3}, rgba(14,165,233,0.1))`, borderRadius: '2px', flexShrink: 0 }} />
      <p style={{ fontSize: 'clamp(18px, 2.2vw, 27px)', fontWeight: 800, color: BLUE2, textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>{text}</p>
    </div>
  );
}

export default function ParentRolePage() {
  const router = useRouter();

  const sec: React.CSSProperties = { position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(80px,10vw,130px) 0' };

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: '#fff' }}>

      <PublicPageNav />

      {/* Role bar */}
      <div style={{ background: '#0e2448', borderBottom: '1px solid rgba(96,205,255,0.22)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/explain')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '5px 10px', color: 'rgba(255,255,255,0.75)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(55,181,255,0.12)'; el.style.borderColor = 'rgba(55,181,255,0.4)'; el.style.color = '#fff'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.06)'; el.style.borderColor = 'rgba(255,255,255,0.15)'; el.style.color = 'rgba(255,255,255,0.75)'; }}
          >
            <ChevronLeft size={12} />
            Back to Roles
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={13} color={BLUE2} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: BLUE2 }}>YOU SELECTED:</span>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: '#fff' }}>PARENT</span>
          </div>
        </div>
      </div>

      {/* ── C: Voice Player ── */}
      <section style={{ ...sec, background: 'linear-gradient(145deg, #1e5ec4 0%, #1850b4 58%, #0f3d9e 100%)' }}>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes player-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }` }} />
        <div style={{ position: 'absolute', top: '-10%', right: '-8%', width: '55vw', height: '55vw', maxWidth: '680px', maxHeight: '680px', background: 'radial-gradient(ellipse, rgba(96,205,255,0.14) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <FloatingPaths position={1} color="rgba(96,205,255,1)" />
        <FloatingPaths position={-1} color="rgba(96,205,255,1)" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-14 lg:gap-20">
            <div style={{ flex: '1 1 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                <div style={{ width: '48px', height: '2px', background: `linear-gradient(90deg, ${BLUE2}, rgba(96,205,255,0.2))`, flexShrink: 0 }} />
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '4px', color: BLUE2, margin: 0, textTransform: 'uppercase' }}>COACH MIKE IS WAITING FOR YOU</p>
              </div>
              <h1 style={{ fontSize: 'clamp(40px, 6.5vw, 80px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.03em', margin: '0 0 16px', color: '#fff' }}>A personal<br />message.</h1>
              <p style={{ fontSize: 'clamp(22px, 3.2vw, 38px)', fontWeight: 800, color: BLUE2, margin: '0 0 28px', letterSpacing: '-0.01em' }}>Just for you.</p>
              <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.75, margin: 0, maxWidth: '400px' }}>
                Coach Mike recorded this specifically for THE GOALIE.
              </p>
            </div>
            <div style={{ flex: '1 1 0', maxWidth: '520px', width: '100%' }}><AutoVoicePlayer /></div>
          </div>
        </div>
      </section>

      {/* ── D: Opening Statement ── */}
      <section style={{ ...sec, background: 'linear-gradient(155deg, #0d2848 0%, #133050 65%, #0b2242 100%)' }}>
        <Boxes />
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 25%, #0d2848 72%)' }} />
        <div style={{ position: 'absolute', bottom: '-25%', right: '-5%', width: '700px', height: '700px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: 'clamp(30px, 5.8vw, 74px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 28px', maxWidth: '1000px' }}>
            HOW TO BE THAT GOALIE PARENT WHO{' '}
            <span style={{ color: BLUE2 }}>TRULY UNDERSTANDS AND SUPPORTS THEIR GOALIE.</span>
          </h2>
          <p style={{ fontSize: 'clamp(17px, 2.1vw, 24px)', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, maxWidth: '680px', margin: '0 0 28px', fontWeight: 500 }}>
            Smarter Goalie is your support system. Coach Mike is your tour guide.
          </p>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, rgba(55,181,255,0.09), rgba(96,205,255,0.05))', border: '1px solid rgba(96,205,255,0.22)', borderLeft: `4px solid ${BLUE3}`, borderRadius: '0 12px 12px 0', padding: '16px 28px', marginBottom: '40px', boxShadow: '0 2px 16px rgba(14,165,233,0.08)' }}>
            <p style={{ fontSize: 'clamp(14px, 1.8vw, 22px)', fontWeight: 900, color: BLUE2, margin: 0, textTransform: 'uppercase', letterSpacing: '0.01em' }}>
              You do not need to know the position. You need to know your goalie.
            </p>
          </div>
          <br />
          <VoiceButton label="HEAR COACH MIKE: WHAT THE GOALIE PARENT'S ROLE ACTUALLY IS" />
        </div>
      </section>

      {/* ── E: The Car Ride Home ── */}
      <section style={{ ...sec, background: 'radial-gradient(circle at 25% 40%, #0d1a2d 0%, #050b18 100%)' }}>
        {/* Diagonal texture overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.008) 0px, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 12px)', pointerEvents: 'none', zIndex: 0 }} />
        {/* Giant ghost "20" */}
        <div style={{ position: 'absolute', right: '-2%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(220px, 38vw, 580px)', fontWeight: 900, fontStyle: 'italic', color: 'rgba(0,242,255,0.045)', letterSpacing: '-0.06em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>
          20
        </div>
        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '10%', left: '-5%', width: '700px', height: '700px', background: 'radial-gradient(ellipse, rgba(0,242,255,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col lg:flex-row gap-14 lg:gap-20 items-start">

            {/* Left column */}
            <div style={{ flex: '1 1 0' }}>
              {/* Glow-border title box — Feel Factor style */}
              <div style={{ display: 'inline-block', border: '4px solid #00f2ff', boxShadow: '0 0 18px rgba(0,242,255,0.65), inset 0 0 12px rgba(0,242,255,0.4)', padding: '12px 20px', marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'clamp(18px, 2.2vw, 28px)', fontWeight: 900, letterSpacing: '-0.01em', color: '#fff', textTransform: 'uppercase', margin: 0 }}>
                  THE CAR RIDE HOME
                </h2>
              </div>

              {/* "20 MINUTES" hero number */}
              <div style={{ marginBottom: '28px' }}>
                <p style={{ fontSize: 'clamp(10px, 1.1vw, 13px)', fontWeight: 800, letterSpacing: '4.5px', color: 'rgba(0,242,255,0.6)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  THE MOST INFLUENTIAL
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', lineHeight: 1 }}>
                  <span style={{ fontSize: 'clamp(72px, 12vw, 152px)', fontWeight: 900, fontStyle: 'italic', color: '#00f2ff', textShadow: '0 0 22px rgba(0,242,255,0.85), 0 0 55px rgba(0,242,255,0.35)', letterSpacing: '-0.04em', lineHeight: 0.9 }}>
                    20
                  </span>
                  <span style={{ fontSize: 'clamp(24px, 4vw, 52px)', fontWeight: 900, fontStyle: 'italic', color: '#00f2ff', textShadow: '0 0 14px rgba(0,242,255,0.6)', letterSpacing: '-0.01em', paddingBottom: 'clamp(6px,1vw,14px)' }}>
                    MINUTES
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 'clamp(16px, 1.9vw, 21px)', color: 'rgba(220,235,248,0.82)', lineHeight: 1.75, maxWidth: '440px', marginBottom: '10px' }}>
                In your goalie&rsquo;s development week.
              </p>
              <p style={{ fontSize: 'clamp(14px, 1.5vw, 17px)', fontStyle: 'italic', color: 'rgba(148,195,228,0.5)', lineHeight: 1.7, maxWidth: '400px', marginBottom: '40px' }}>
                Not the practice. Not the game.<br />The 20 minutes after.
              </p>

              <VoiceButton label="HEAR COACH MIKE: THE CAR RIDE HOME AND WHY IT MATTERS MORE THAN THE PRACTICE" />
            </div>

            {/* Right column — 3 insight cards */}
            <div style={{ flex: '0 0 auto', width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {([
                {
                  tag: 'BEFORE YOU SPEAK',
                  quote: '"What did you feel was your best moment tonight?"',
                  desc: 'Lead with curiosity. Start with a question, not an observation.',
                  accent: '#00f2ff',
                  symbol: '?',
                },
                {
                  tag: 'WHAT NEVER TO SAY',
                  quote: '"You need to stop more pucks."',
                  desc: 'Outcome language in a developing mind creates fear, not growth.',
                  accent: RED,
                  symbol: '✕',
                },
                {
                  tag: 'THE KEY CLOSE',
                  quote: '"What are you proud of tonight?"',
                  desc: 'Every car ride ends with something to build on — not to tear down.',
                  accent: '#34d399',
                  symbol: '✓',
                },
              ] as { tag: string; quote: string; desc: string; accent: string; symbol: string }[]).map((card, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${card.accent}40`,
                  borderLeft: `4px solid ${card.accent}`,
                  borderRadius: '0 16px 16px 0',
                  padding: '22px 24px',
                  boxShadow: `0 0 30px ${card.accent}18, inset 0 0 20px ${card.accent}08`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `${card.accent}18`, border: `1.5px solid ${card.accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: card.accent }}>{card.symbol}</span>
                    </div>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: card.accent, letterSpacing: '2.5px', textTransform: 'uppercase', margin: 0 }}>{card.tag}</p>
                  </div>
                  <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', fontStyle: 'italic', color: 'rgba(220,235,248,0.92)', lineHeight: 1.55, marginBottom: '10px' }}>{card.quote}</p>
                  <p style={{ fontSize: '13px', color: 'rgba(148,195,228,0.65)', lineHeight: 1.65, margin: 0 }}>{card.desc}</p>
                </div>
              ))}

              {/* Closing callout */}
              <div style={{ padding: '18px 22px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(0,242,255,0.18)', borderRadius: '12px' }}>
                <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', fontWeight: 700, color: '#fff', lineHeight: 1.65, margin: 0 }}>
                  Nobody taught you this. Nobody gave you the language.{' '}
                  <span style={{ color: '#00f2ff' }}>Smarter Goalie does.</span>
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── F: The Honest Truth About Goalie Development ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0d2648 0%, #102c50 100%)' }}>
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(120px, 18vw, 260px)', fontWeight: 900, color: 'rgba(255,255,255,0.022)', letterSpacing: '-8px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}>TRUTH</div>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <SectionLabel text="The Honest Truth About Goalie Development" />
          <div style={{ maxWidth: '820px' }}>
            <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: 'rgba(184,212,232,0.9)', lineHeight: 1.9, marginBottom: '22px' }}>Most goalie parents want to help but have never been given the tools to do it effectively.</p>
            <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: 'rgba(184,212,232,0.9)', lineHeight: 1.9, marginBottom: '22px' }}>A parent who understands the position produces a goalie who is easier to coach, more resilient under pressure, and more self-aware for life.</p>
            <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: '#fff', lineHeight: 1.9, marginBottom: '40px', fontWeight: 600 }}>This is not about knowing the technical details. It is about knowing how to support the person in the pads.</p>
          </div>
          <VoiceButton label="HEAR COACH MIKE: WHAT THE BEST GOALIE PARENTS DO DIFFERENTLY" />
        </div>
      </section>

      {/* ── G: What You Receive ── */}
      <section style={{ ...sec, background: 'linear-gradient(140deg, #1b3c7c 0%, #143270 100%)' }}>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(96,205,255,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          {/* Header — Development Loop style */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '44px' }}>
            <div style={{ width: '6px', height: '100px', background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 4px' }}>What You Receive</p>
              <h2 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>As a Smarter Goalie<br />Parent You Receive:</h2>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative', marginLeft: '48px', marginBottom: '56px' }}>
            {/* Vertical shiny cyan line */}
            <div style={{ position: 'absolute', left: '-36px', top: '16px', width: '6px', bottom: 0, background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', zIndex: 0 }} />

            {[
              { num: '01', label: 'Self-Directed Dashboard', desc: 'A 7 Pillar dashboard — learn about every aspect of your goalie\'s development at your own pace' },
              { num: '02', label: 'The Language', desc: 'The language to have the right conversation after every game and every practice' },
              { num: '03', label: 'Parent Observation Chart', desc: 'A structured way to watch your goalie with educated eyes' },
              { num: '04', label: 'Coach Mike as Your Guide', desc: 'Through every stage of your goalie\'s development' },
              { num: '05', label: 'Direct Connection', desc: 'Access to your goalie\'s progress, charts, and milestones' },
              { num: '06', label: 'Car Ride Home Framework', desc: 'What to say, what not to say, and why it matters' },
            ].map((item, i) => (
              <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', marginBottom: i < 5 ? '48px' : '0', zIndex: 1 }}>
                {/* Glowing cyan node */}
                <div style={{ position: 'absolute', left: '-45px', top: '28px', width: '24px', height: '24px', borderRadius: '50%', background: '#143270', border: `4px solid ${BLUE2}`, boxShadow: `0 0 12px ${BLUE2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: BLUE2 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', width: '100%' }}>
                  {/* Large translucent number */}
                  <span style={{ fontSize: 'clamp(56px, 8vw, 88px)', fontWeight: 800, color: 'rgba(255,255,255,0.15)', lineHeight: 1, letterSpacing: '-3px', marginTop: '-8px', minWidth: '80px', textAlign: 'center', flexShrink: 0 }}>
                    {item.num}
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px', marginTop: '8px' }}>
                      {item.label}
                    </h3>
                    <p style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: 'rgba(150,200,232,0.85)', lineHeight: 1.65, margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginLeft: '48px' }}><VoiceButton label="HEAR COACH MIKE: THE PARENT DASHBOARD AND HOW IT WORKS" /></div>
        </div>
      </section>

      {/* ── H: Parent Observation Chart ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0a1f3d 0%, #0d2648 50%, #091829 100%)' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes obs-scan {
            0%   { opacity: 0.018; transform: translateX(-4px); }
            50%  { opacity: 0.032; transform: translateX(4px); }
            100% { opacity: 0.018; transform: translateX(-4px); }
          }
        `}} />
        {/* Ghost word */}
        <div style={{ position: 'absolute', left: '-2%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(100px, 16vw, 240px)', fontWeight: 900, color: 'rgba(255,255,255,0.022)', letterSpacing: '-0.04em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase', animation: 'obs-scan 8s ease-in-out infinite' }}>OBSERVE</div>
        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '10%', left: '40%', width: '700px', height: '700px', background: 'radial-gradient(ellipse, rgba(0,242,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col lg:flex-row gap-14 lg:gap-20 items-start">

            {/* Left column */}
            <div style={{ flex: '1 1 0' }}>
              {/* Glow-border title box */}
              <div style={{ display: 'inline-block', border: '4px solid #00f2ff', boxShadow: '0 0 18px rgba(0,242,255,0.65), inset 0 0 12px rgba(0,242,255,0.4)', padding: '12px 20px', marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'clamp(18px, 2.2vw, 26px)', fontWeight: 900, letterSpacing: '-0.01em', color: '#fff', textTransform: 'uppercase', margin: 0 }}>
                  THE PARENT OBSERVATION CHART
                </h2>
              </div>

              {/* Gradient title with left bar — goalie Section F style */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '4px', alignSelf: 'stretch', minHeight: '60px', background: 'linear-gradient(to bottom, #00f2ff, #0ea5e9)', borderRadius: '2px', boxShadow: '0 0 14px rgba(0,242,255,0.8)', flexShrink: 0 }} />
                <h3 style={{ fontSize: 'clamp(22px, 3.2vw, 40px)', fontWeight: 800, lineHeight: 1.15, background: 'linear-gradient(to bottom, #ffffff 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
                  You are already<br />watching every game.
                </h3>
              </div>

              {/* Big italic cyan statement */}
              <p style={{ fontSize: 'clamp(20px, 2.8vw, 34px)', fontWeight: 900, fontStyle: 'italic', color: '#00f2ff', textShadow: '0 0 16px rgba(0,242,255,0.6)', marginBottom: '28px', lineHeight: 1.2 }}>
                Now you watch with a purpose.
              </p>

              <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(148,212,240,0.85)', fontWeight: 300, lineHeight: 1.9, marginBottom: '24px' }}>
                The Parent Observation Chart gives you a structured framework to observe your goalie&rsquo;s development across three levels.
              </p>

              <p style={{ fontSize: 'clamp(15px, 1.9vw, 19px)', color: '#fff', lineHeight: 1.85, maxWidth: '440px', marginBottom: '40px', fontWeight: 600 }}>
                You do not need to be a hockey expert. You need to be present, consistent, and honest.
              </p>

              <VoiceButton label="HEAR COACH MIKE: THE PARENT OBSERVATION CHART AND WHAT IT REVEALS" />
            </div>

            {/* Right column — 3 Level TiltCards */}
            <div style={{ flex: '0 0 auto', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {([
                {
                  level: 1,
                  label: 'Foundation',
                  desc: 'The base layer — understanding what you are watching and why it matters',
                  accent: '#00f2ff',
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                  ),
                },
                {
                  level: 2,
                  label: 'Educated',
                  desc: 'Developing the eye — seeing what the coach sees, not just the outcome',
                  accent: '#a78bfa',
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  ),
                },
                {
                  level: 3,
                  label: 'Cross-Reference',
                  desc: 'Connecting game observations to practice sessions and development goals',
                  accent: '#34d399',
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
                    </svg>
                  ),
                },
              ] as { level: number; label: string; desc: string; accent: string; icon: React.ReactNode }[]).map((item, i) => (
                <TiltCard
                  key={i}
                  effect="gravitate"
                  tiltLimit={8}
                  scale={1.04}
                  style={{
                    border: `1px solid ${item.accent}80`,
                    borderRadius: '14px',
                    boxShadow: `0 0 35px ${item.accent}22, inset 0 0 25px ${item.accent}10`,
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '18px',
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderRadius: '13px',
                    padding: '20px 22px',
                  }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '12px',
                      background: `linear-gradient(135deg, ${item.accent}25, ${item.accent}10)`,
                      border: `1.5px solid ${item.accent}60`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      boxShadow: `0 0 22px ${item.accent}45, inset 0 0 18px ${item.accent}20`,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: item.accent, letterSpacing: '2.5px', textTransform: 'uppercase', margin: '0 0 4px' }}>LEVEL {item.level}</p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px', margin: '0 0 6px', textTransform: 'uppercase' }}>{item.label}</p>
                      <p style={{ fontSize: '13px', color: 'rgba(200,225,242,0.7)', margin: 0, lineHeight: 1.55 }}>{item.desc}</p>
                    </div>
                  </div>
                </TiltCard>
              ))}

              {/* Quote box */}
              <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(0,242,255,0.3)', borderRadius: '14px', boxShadow: '0 0 28px rgba(0,242,255,0.12), inset 0 0 22px rgba(0,242,255,0.06)' }}>
                <p style={{ fontSize: '14px', color: 'rgba(200,228,248,0.75)', margin: 0, lineHeight: 1.8, fontStyle: 'italic' }}>
                  &ldquo;The parent who watches with educated eyes produces a goalie who feels truly seen.&rdquo;
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── I: What Your Goalie Is Building ── */}
      <section style={{ ...sec, background: 'linear-gradient(140deg, #1b3e80 0%, #163276 100%)' }}>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(96,205,255,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(255,255,255,0.011) 60px, rgba(255,255,255,0.011) 61px)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(20px, 3vw, 38px)', fontWeight: 900, lineHeight: 1.3, maxWidth: '900px', letterSpacing: '-0.01em', marginBottom: '44px' }}>
            YOUR CHILD IS NOT JUST LEARNING HOW TO STOP A PUCK.{' '}
            <span style={{ color: RED }}>THEY ARE LEARNING HOW TO PERFORM UNDER PRESSURE FOR THE REST OF THEIR LIFE.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '14px', alignItems: 'stretch', width: '100%', maxWidth: '1400px', marginBottom: '44px' }}>
            {[
              'How to perform under pressure with a calm mind',
              'How to self-evaluate honestly and grow from every game',
              'How to lead — goalies are natural leaders. This system builds that deliberately.',
              'How to recover from failure and compete at game speed',
              'Self-awareness that lasts a lifetime — in hockey, in school, and in everything that follows',
            ].map((item, i) => (
              <TiltCard
                key={i}
                effect="gravitate"
                tiltLimit={8}
                scale={1.04}
                style={{
                  border: '2px solid rgba(96,205,255,0.78)',
                  borderRadius: '16px',
                  boxShadow: '0 0 0 1px rgba(96,205,255,0.16), 0 0 22px rgba(96,205,255,0.26), 0 8px 24px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.05)',
                  minWidth: '180px',
                  background: 'linear-gradient(180deg, rgba(11,23,45,0.96), rgba(10,18,36,0.98))',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '14px', background: 'rgba(17, 30, 56, 0.9)', borderRadius: '14px', padding: '16px 20px', minHeight: '100%', backdropFilter: 'blur(10px)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(55,181,255,0.28), rgba(96,205,255,0.16))', border: '1px solid rgba(170,236,255,0.62)', boxShadow: '0 0 0 1px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <Check size={12} color={BLUE2} strokeWidth={3} />
                  </div>
                  <p style={{ fontSize: 'clamp(15px, 1.7vw, 18px)', color: '#dde8f0', lineHeight: 1.7, margin: 0 }}>{item}</p>
                </div>
              </TiltCard>
            ))}
          </div>
          <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: '#fff', lineHeight: 1.85, maxWidth: '720px', marginBottom: '40px', fontWeight: 600 }}>These are not hockey skills. These are life skills. Smarter Goalie builds both simultaneously.</p>
          <VoiceButton label="HEAR COACH MIKE: WHAT YOUR GOALIE IS ACTUALLY BECOMING" />
        </div>
      </section>

      {/* ── J: Founding Member ── */}
      <section id="apply" style={{ ...sec, background: 'linear-gradient(160deg, #092038 0%, #0e2848 100%)' }}>
        <div style={{ position: 'absolute', right: '-60px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(200px, 30vw, 440px)', fontWeight: 900, color: 'rgba(255,255,255,0.02)', letterSpacing: '-20px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>100</div>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', width: '800px', height: '800px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.06) 0%, transparent 70%)', pointerEvents: 'none', transform: 'translateX(-50%)' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 text-center w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(96,205,255,0.26)', borderRadius: '50px', padding: '8px 20px', marginBottom: '28px', boxShadow: '0 2px 12px rgba(55,181,255,0.1)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: RED, boxShadow: '0 0 0 3px rgba(192,0,0,0.2)', flexShrink: 0 }} />
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: BLUE2, margin: 0, textTransform: 'uppercase' }}>Limited Availability</p>
          </div>
          <h2 style={{ fontSize: 'clamp(30px, 5vw, 66px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '24px' }}>
            THIS IS THE EXPERIENCE<br /><span style={{ color: BLUE2 }}>BUILDING PHASE</span>
          </h2>
          <p style={{ fontSize: 'clamp(16px, 2vw, 21px)', color: 'rgba(175,215,238,0.9)', lineHeight: 1.8, maxWidth: '680px', margin: '0 auto 16px' }}>
            Coach Mike is personally selecting one hundred founding members to join the Smarter Goalie BUILD experience.
          </p>
          <p style={{ fontSize: 'clamp(14px, 1.5vw, 17px)', color: 'rgba(148,192,222,0.85)', lineHeight: 1.85, maxWidth: '640px', margin: '0 auto 52px' }}>
            Not open to the general public. Founding members help build what Smarter Goalie becomes. In return &mdash; Coach Mike&rsquo;s personal attention, direct access, and a founding member rate locked in forever.
          </p>
          <ApplicationSteps
            steps={[
              // Registering as a Parent is what opens the parent questionnaire —
              // the account has to exist first, so say so rather than implying the
              // questionnaire is the first thing they meet. The "5 minutes" claim
              // was removed on 26 August: the baseline profile is far longer than
              // that and the promise was not one the page could keep.
              { num: '01', text: 'Create your parent account, then complete the parent questionnaire', href: '/auth/register', action: 'Start' },
              { num: '02', text: 'Coach Mike personally reviews your application — no automation, no filter' },
              // Live as of 26 August: 'Parent' is now in the /contact role list.
              { num: '03', text: 'Coach Mike calls you personally', href: '/contact', action: 'Set up the call' },
            ]}
          />
          <button
            onClick={() => router.push('/auth/register')}
            style={{ background: RED, color: '#fff', border: 'none', padding: 'clamp(16px,2vw,22px) clamp(32px,4vw,56px)', borderRadius: '12px', fontSize: 'clamp(13px,1.5vw,16px)', fontWeight: 900, letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 8px 32px rgba(192,0,0,0.35)', transition: 'all 0.2s', display: 'inline-block', marginBottom: '36px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 44px rgba(192,0,0,0.5)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(192,0,0,0.35)'; }}
          >
            APPLY TO JOIN THE EXPERIENCE →
          </button>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <VoiceButton label="HEAR COACH MIKE: WHAT IT MEANS TO BE A FOUNDING MEMBER PARENT" />
          </div>
        </div>
      </section>

      <SevenPillarsCTA from="parent-role" eyebrow="For The Parent" />

      <Footer7 />
    </div>
  );
}
