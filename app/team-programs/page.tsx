'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, ClipboardList, ChevronLeft } from 'lucide-react';
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
          <p style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(0,240,255,0.65)', letterSpacing: '2.5px', textTransform: 'uppercase', margin: '0 0 3px' }}>VOICE MESSAGE</p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>Coach Mike</p>
        </div>
        <div style={{ background: playing ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${playing ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '20px', padding: '4px 10px', transition: 'all 0.3s', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: playing ? '#4ade80' : 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>{playing ? 'LIVE' : '3:45'}</span>
        </div>
      </div>
      <p style={{ fontSize: '13px', color: 'rgba(148,163,184,0.65)', margin: '0 0 18px', fontStyle: 'italic', lineHeight: 1.55 }}>
        &ldquo;How this system changes everything for your team&rdquo;
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

function DevLoopDiagram() {
  const steps = [
    { num: '01', label: 'Game Chart', sub: 'Period by period data', accent: '#00f2ff' },
    { num: '02', label: 'Practice Index', sub: 'Targeted response', accent: BLUE2 },
    { num: '03', label: 'Practice Chart', sub: 'What improved', accent: BLUE },
    { num: '04', label: 'Next Game Chart', sub: 'Measured progress', accent: BLUE3 },
  ] as { num: string; label: string; sub: string; accent: string }[];
  return (
    <div style={{ marginBottom: '56px' }}>
      <div className="flex flex-col sm:flex-row" style={{ alignItems: 'stretch', maxWidth: '960px', gap: '0' }}>
        {steps.flatMap((step, i) => {
          const card = (
            <TiltCard
              key={`card-${i}`}
              effect="gravitate"
              tiltLimit={9}
              scale={1.05}
              style={{
                flex: '1 1 0',
                border: `1px solid ${step.accent}55`,
                borderRadius: '16px',
                boxShadow: `0 0 28px ${step.accent}14, inset 0 0 20px ${step.accent}06`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: '-6px', right: '4px',
                fontSize: '64px', fontWeight: 900,
                color: `${step.accent}12`,
                lineHeight: 1, userSelect: 'none', pointerEvents: 'none', letterSpacing: '-3px',
              }}>{step.num}</div>
              <div style={{
                padding: '26px 18px',
                background: `linear-gradient(135deg, ${step.accent}09, rgba(4,8,20,0.82))`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '15px',
                height: '100%',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: `${step.accent}18`, border: `1.5px solid ${step.accent}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 14px ${step.accent}30`,
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: step.accent }}>{step.num}</span>
                </div>
                <p style={{ fontSize: 'clamp(11px, 1.4vw, 14px)', fontWeight: 800, color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.3 }}>{step.label}</p>
                <p style={{ fontSize: '11px', color: `${step.accent}CC`, margin: 0, lineHeight: 1.5 }}>{step.sub}</p>
              </div>
            </TiltCard>
          );
          if (i < steps.length - 1) {
            const arrow = (
              <div key={`arr-${i}`} className="hidden sm:flex" style={{ alignItems: 'center', padding: '0 6px', flexShrink: 0 }}>
                <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
                  <path d="M1 6 L19 6" stroke={steps[i + 1].accent} strokeWidth="1.5" strokeOpacity="0.45" strokeDasharray="3 2" />
                  <path d="M15 3 L21 6 L15 9" stroke={steps[i + 1].accent} strokeWidth="1.5" fill="none" strokeOpacity="0.85" />
                </svg>
              </div>
            );
            return [card, arrow];
          }
          return [card];
        })}
      </div>
      {/* Continuous loop label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', maxWidth: '960px' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(96,205,255,0.22))' }} />
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <path d="M13 2 C13 2 13 5 10 7 C7 9 4 9 2 7" stroke={BLUE2} strokeWidth="1.5" fill="none" strokeOpacity="0.55" />
          <path d="M0 5 L2 7 L4 5" stroke={BLUE2} strokeWidth="1.5" fill="none" strokeOpacity="0.65" />
        </svg>
        <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '2.5px', color: 'rgba(96,205,255,0.45)', textTransform: 'uppercase' }}>CONTINUOUS LOOP</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(96,205,255,0.22), transparent)' }} />
      </div>
    </div>
  );
}

export default function TeamProgramsPage() {
  const router = useRouter();

  const sec: React.CSSProperties = { position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(80px,10vw,130px) 0' };

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: '#fff' }}>

      <PublicPageNav />

      {/* Role bar */}
      <div style={{ background: '#0e2448', borderBottom: '1px solid rgba(96,205,255,0.22)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push('/explain')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '5px 10px', color: 'rgba(255,255,255,0.75)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(55,181,255,0.12)'; el.style.borderColor = 'rgba(55,181,255,0.4)'; el.style.color = '#fff'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.06)'; el.style.borderColor = 'rgba(255,255,255,0.15)'; el.style.color = 'rgba(255,255,255,0.75)'; }}
          >
            <ChevronLeft size={12} />
            Back to Roles
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={16} color={BLUE2} style={{ flexShrink: 0 }} />
            <div className="flex items-baseline gap-3 flex-wrap">
              <span style={{ fontSize: 'clamp(13px,1.6vw,16px)', fontWeight: 900, letterSpacing: '3px', color: '#fff', textTransform: 'uppercase' }}>TEAM PROGRAMS</span>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: BLUE2, textTransform: 'uppercase' }}>TEAM</span>
            </div>
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
              <p style={{ fontSize: 'clamp(22px, 3.2vw, 38px)', fontWeight: 800, color: BLUE2, margin: '0 0 28px', letterSpacing: '-0.01em' }}>Built for your program.</p>
              <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.75, margin: 0, maxWidth: '400px' }}>
                Coach Mike recorded this specifically for coaches and managers who made it to this page.
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
        <div style={{ position: 'absolute', bottom: '-25%', left: '-5%', width: '700px', height: '700px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: 'clamp(30px, 5.8vw, 74px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 28px', maxWidth: '1100px' }}>
            HERE IS THE GOALIE DEVELOPMENT LAYER{' '}
            <span style={{ color: BLUE2 }}>YOUR PROGRAM HAS ALWAYS NEEDED.</span>
          </h2>
          <p style={{ fontSize: 'clamp(18px, 2.6vw, 30px)', fontWeight: 900, color: RED, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '20px' }}>
            STRUCTURED. MEASURABLE. REAL DATA EVERY GAME AND EVERY PRACTICE.
          </p>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, rgba(55,181,255,0.09), rgba(96,205,255,0.05))', border: '1px solid rgba(96,205,255,0.22)', borderLeft: `4px solid ${BLUE3}`, borderRadius: '0 12px 12px 0', padding: '16px 28px', marginBottom: '40px', boxShadow: '0 2px 16px rgba(14,165,233,0.08)' }}>
            <p style={{ fontSize: 'clamp(14px, 1.8vw, 22px)', fontWeight: 700, color: BLUE2, margin: 0 }}>
              Smarter Goalie does not compete with what you do. It completes it.
            </p>
          </div>
          <br />
          <VoiceButton label="HEAR COACH MIKE: HOW SMARTER GOALIE WORKS ALONGSIDE YOUR EXISTING PROGRAM" />
        </div>
      </section>

      {/* ── E: The Honest Truth ── */}
      <section style={{ ...sec, background: 'linear-gradient(140deg, #1b3c7c 0%, #143270 100%)' }}>
        <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(100px, 14vw, 200px)', fontWeight: 900, color: 'rgba(255,255,255,0.022)', letterSpacing: '-6px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}>TRUTH</div>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(96,205,255,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <SectionLabel text="The Honest Truth" />
          <div style={{ maxWidth: '820px' }}>
            <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: 'rgba(184,212,232,0.9)', lineHeight: 1.9, marginBottom: '28px' }}>
              Most hockey coaches were never taught how to develop a goaltender. That is not a criticism. It is the reality of how coaches are educated in this sport.
            </p>
            <div style={{ background: 'linear-gradient(135deg, rgba(55,181,255,0.08), rgba(96,205,255,0.04))', border: '1px solid rgba(96,205,255,0.22)', borderLeft: `4px solid ${BLUE3}`, borderRadius: '0 16px 16px 0', padding: 'clamp(20px,2.5vw,32px)', marginBottom: '40px', boxShadow: '0 3px 16px rgba(0,0,0,0.2)' }}>
              <p style={{ fontSize: 'clamp(18px, 2.4vw, 26px)', fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: '12px' }}>
                One directive per practice &mdash; done correctly &mdash; produces more goalie development than an hour of random goalie work.
              </p>
              <p style={{ fontSize: 'clamp(14px,1.8vw,18px)', color: BLUE2, fontWeight: 600, margin: 0 }}>
                Smarter Goalie gives you that directive every practice.
              </p>
            </div>
          </div>
          <VoiceButton label="HEAR COACH MIKE: THE ONE DIRECTIVE PER PRACTICE MODEL" />
        </div>
      </section>

      {/* ── F: The Data + Development Loop ── */}
      <section style={{ ...sec, background: 'radial-gradient(circle at 68% 22%, #0d1a2e 0%, #050b16 100%)' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes data-glow {
            0%, 100% { opacity: 0.025; }
            50%       { opacity: 0.045; }
          }
        `}} />
        {/* Diagonal texture */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.008) 0px, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 12px)', pointerEvents: 'none', zIndex: 0 }} />
        {/* Ghost "DATA" */}
        <div style={{ position: 'absolute', right: '-3%', bottom: '4%', fontSize: 'clamp(130px, 20vw, 320px)', fontWeight: 900, fontStyle: 'italic', color: 'rgba(96,205,255,0.03)', letterSpacing: '-0.06em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0, animation: 'data-glow 7s ease-in-out infinite' }}>DATA</div>
        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '15%', left: '-5%', width: '640px', height: '640px', background: 'radial-gradient(ellipse, rgba(0,242,255,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '25%', width: '400px', height: '400px', background: 'radial-gradient(ellipse, rgba(192,0,0,0.04) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>

          {/* Section header — Development Loop style */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '28px' }}>
            <div style={{ width: '6px', height: '100px', background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 4px' }}>Coach Charting System</p>
              <h2 style={{ fontSize: 'clamp(36px, 5vw, 62px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.05 }}>What the Data<br />Gives You</h2>
            </div>
          </div>

          {/* RED glowing statement */}
          <p style={{ fontSize: 'clamp(18px, 2.6vw, 32px)', fontWeight: 900, fontStyle: 'italic', color: RED, textShadow: '0 0 22px rgba(192,0,0,0.6)', letterSpacing: '0.01em', textTransform: 'uppercase', marginBottom: '20px', lineHeight: 1.2 }}>
            HOW GOES THE GOALIE — HOW GOES THE TEAM.
          </p>
          <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: 'rgba(184,212,232,0.9)', lineHeight: 1.9, maxWidth: '820px', marginBottom: '56px' }}>
            The Smarter Goalie charting system gives you real data on your goalie&rsquo;s performance &mdash; period by period, game by game, practice by practice.
          </p>

          {/* Development Loop sub-header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '28px' }}>
            <div style={{ width: '6px', height: '64px', background: BLUE2, boxShadow: `0 0 12px ${BLUE2}`, borderRadius: '3px', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 4px' }}>The System</p>
              <h3 style={{ fontSize: 'clamp(22px, 3vw, 38px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>The Development Loop</h3>
            </div>
          </div>
          <DevLoopDiagram />

          {/* Shiny-line timeline */}
          <div style={{ position: 'relative', marginLeft: 'clamp(32px, 5vw, 48px)', marginBottom: '56px' }}>
            {/* Vertical shiny cyan line */}
            <div style={{ position: 'absolute', left: '-36px', top: '16px', width: '6px', bottom: 0, background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', zIndex: 0 }} />
            {[
              { num: '01', label: 'Coach Observation Chart', desc: 'Structured framework for watching the goalie with educated eyes' },
              { num: '02', label: 'Game Charting Data', desc: 'Factor Ratios, good goal / bad goal analysis, V.M.P. intensity' },
              { num: '03', label: 'Practice Charting', desc: 'What was worked, what improved, what needs more attention' },
              { num: '04', label: 'Development Loop', desc: 'Game Chart → Practice Index → Practice Chart → Next Game Chart' },
              { num: '05', label: 'Cross-Reference Engine', desc: 'Compares your observations with the goalie\'s self-evaluation and parent observation' },
            ].map((item, i) => (
              <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', marginBottom: i < 4 ? '48px' : '0', zIndex: 1 }}>
                {/* Glowing node */}
                <div style={{ position: 'absolute', left: '-45px', top: '28px', width: '24px', height: '24px', borderRadius: '50%', background: '#050b16', border: `4px solid ${BLUE2}`, boxShadow: `0 0 12px ${BLUE2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: BLUE2 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', width: '100%' }}>
                  <span style={{ fontSize: 'clamp(40px, 8vw, 88px)', fontWeight: 800, color: 'rgba(255,255,255,0.15)', lineHeight: 1, letterSpacing: '-3px', marginTop: '-8px', minWidth: '60px', textAlign: 'center', flexShrink: 0 }}>{item.num}</span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px', marginTop: '8px' }}>{item.label}</h3>
                    <p style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: 'rgba(150,200,232,0.85)', lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <VoiceButton label="HEAR COACH MIKE: THE COACH OBSERVATION CHART AND WHAT IT REVEALS" />
        </div>
      </section>

      {/* ── G: 7 Pillar Dashboard ── */}
      <section style={{ ...sec, background: 'radial-gradient(circle at 28% 55%, #0d1b3a 0%, #050912 100%)' }}>
        {/* Diagonal texture */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.008) 0px, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 12px)', pointerEvents: 'none', zIndex: 0 }} />
        {/* Ghost "VII" */}
        <div style={{ position: 'absolute', right: '-2%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(180px, 28vw, 460px)', fontWeight: 900, fontStyle: 'italic', color: 'rgba(96,205,255,0.03)', letterSpacing: '-0.04em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>VII</div>
        {/* Radial glows */}
        <div style={{ position: 'absolute', top: '-8%', left: '-5%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(0,242,255,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '30%', width: '440px', height: '440px', background: 'radial-gradient(ellipse, rgba(167,139,250,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>

          {/* Header — Development Loop style */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '28px' }}>
            <div style={{ width: '6px', height: '100px', background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 4px' }}>The Smarter Goalie System</p>
              <h2 style={{ fontSize: 'clamp(36px, 5vw, 62px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.05 }}>Your 7 Pillar Dashboard</h2>
            </div>
          </div>

          {/* Description */}
          <div style={{ maxWidth: '820px', marginBottom: '40px' }}>
            <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: '#fff', lineHeight: 1.9, marginBottom: '18px', fontWeight: 600 }}>
              A self-directed learning experience across all 7 Pillars of the Smarter Goalie system.
            </p>
            <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(184,212,240,0.85)', lineHeight: 1.9 }}>
              You select what you want to understand. Coach Mike guides every topic. No linear requirement. The system meets you where you are and grows with your knowledge.
            </p>
          </div>

          {/* Quote box + VoiceButton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '680px' }}>
            <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(96,205,255,0.28)', borderRadius: '14px', boxShadow: '0 0 28px rgba(96,205,255,0.10), inset 0 0 22px rgba(96,205,255,0.05)' }}>
              <p style={{ fontSize: '14px', color: 'rgba(200,228,248,0.80)', margin: 0, lineHeight: 1.8, fontStyle: 'italic' }}>
                &ldquo;No linear requirement. Every coach brings a different level of understanding. The system meets you where you are and grows with your knowledge.&rdquo;
              </p>
            </div>
            <VoiceButton label="HEAR COACH MIKE: THE COACH DASHBOARD AND HOW IT WORKS" />
          </div>
        </div>
      </section>

      <SevenPillarsCTA from="team-programs" eyebrow="For Team Programs" />

      {/* ── H: Founding Member ── */}
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
          <p style={{ fontSize: 'clamp(16px, 2vw, 21px)', color: 'rgba(175,215,238,0.9)', lineHeight: 1.8, maxWidth: '680px', margin: '0 auto 52px' }}>
            Coach Mike is personally selecting one hundred founding members. Your program becomes part of building what Smarter Goalie delivers to every team at every level.
          </p>
          <ApplicationSteps
            steps={[
              // Registering as a Coach is what opens the coach questionnaire — the
              // account has to exist first. The "5 minutes" claim was removed on
              // 26 August; the baseline profile is much longer than that.
              { num: '01', text: 'Create your coach account, then complete the coach questionnaire', href: '/auth/register', action: 'Start' },
              { num: '02', text: 'Coach Mike personally reviews your application' },
              // /contact is the "Set Up the Call" form; its role list includes Team Manager.
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
            <VoiceButton label="HEAR COACH MIKE: THE FOUNDING MEMBER OPPORTUNITY FOR COACHES" />
          </div>
        </div>
      </section>

      <Footer7 />
    </div>
  );
}
