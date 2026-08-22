'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Building2, ChevronLeft } from 'lucide-react';
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
        &ldquo;Building a system that works across every level&rdquo;
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


export default function OrganizationPage() {
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
            <Building2 size={13} color={BLUE2} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: BLUE2 }}>YOU SELECTED:</span>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: '#fff' }}>ORGANIZATION</span>
          </div>
        </div>
      </div>

      {/* ── Coming Soon Banner ── */}
      <div style={{ position: 'sticky', top: '64px', zIndex: 40, background: 'linear-gradient(90deg, rgba(2,18,44,0.97) 0%, rgba(6,35,68,0.97) 100%)', borderBottom: '1px solid rgba(96,205,255,0.35)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-3 flex items-center gap-3 flex-wrap">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(96,205,255,0.12)', border: '1px solid rgba(96,205,255,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: 800, letterSpacing: '2px', color: BLUE2, textTransform: 'uppercase', flexShrink: 0 }}>COMING SOON</span>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
            This experience is being finalized. <span style={{ color: BLUE2, fontWeight: 700 }}>Coach Mike will reveal it within 30 days of launch.</span>
          </p>
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
              <p style={{ fontSize: 'clamp(22px, 3.2vw, 38px)', fontWeight: 800, color: BLUE2, margin: '0 0 28px', letterSpacing: '-0.01em' }}>Built for your scale.</p>
              <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.75, margin: 0, maxWidth: '400px' }}>
                Coach Mike recorded this specifically for organizations who made it to this page.
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
          <h2 style={{ fontSize: 'clamp(30px, 5.8vw, 74px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 28px', maxWidth: '1100px' }}>
            YOUR ORGANIZATION DEVELOPS FORWARDS AND DEFENCE.{' '}
            <span style={{ color: BLUE2 }}>WHO DEVELOPS YOUR GOALIES?</span>
          </h2>
          <p style={{ fontSize: 'clamp(17px, 2.1vw, 24px)', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, maxWidth: '780px', margin: '0 0 28px', fontWeight: 500 }}>
            Consistent goaltending development across your entire organization. Every age group. One system. Scalable. Measurable. Built on principles that never change.
          </p>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, rgba(55,181,255,0.09), rgba(96,205,255,0.05))', border: '1px solid rgba(96,205,255,0.22)', borderLeft: `4px solid ${BLUE3}`, borderRadius: '0 12px 12px 0', padding: '16px 28px', marginBottom: '40px', boxShadow: '0 2px 16px rgba(14,165,233,0.08)' }}>
            <p style={{ fontSize: 'clamp(14px, 1.8vw, 22px)', fontWeight: 900, color: BLUE2, margin: 0, textTransform: 'uppercase' }}>One system. Every age group. No gaps.</p>
          </div>
          <br />
          <VoiceButton label="HEAR COACH MIKE: WHAT CONSISTENT ORGANIZATION-WIDE GOALTENDING DEVELOPMENT PRODUCES" />
        </div>
      </section>

      {/* ── E: The Gap ── */}
      <section style={{ ...sec, background: 'radial-gradient(circle at 30% 55%, #041525 0%, #070e1e 55%, #050912 100%)' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(80px,18vw,260px)', fontWeight: 900, color: 'rgba(55,181,255,0.055)', letterSpacing: '-8px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap' }}>GAP</div>
        <div style={{ position: 'absolute', top: '20%', left: '5%', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(255,255,255,0.008) 60px, rgba(255,255,255,0.008) 61px)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-20" style={{ alignItems: 'flex-start' }}>
            {/* LEFT */}
            <div className="w-full lg:w-auto" style={{ flex: '0 0 auto', maxWidth: '460px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '40px' }}>
                <div style={{ width: '6px', height: '80px', background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', flexShrink: 0, marginTop: '4px' }} />
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 6px' }}>The Problem</p>
                  <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 46px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>The Gap in Every<br />Organization</h2>
                </div>
              </div>
              <p style={{ fontSize: 'clamp(20px, 2.8vw, 32px)', fontWeight: 800, fontStyle: 'italic', color: BLUE2, lineHeight: 1.3, marginBottom: '28px', textShadow: `0 0 22px rgba(55,181,255,0.6), 0 0 44px rgba(55,181,255,0.3)` }}>
                &ldquo;Most organizations have a system for every player on the ice &mdash; except the most important one.&rdquo;
              </p>
              <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'rgba(200,215,230,0.85)', lineHeight: 1.8, marginBottom: '20px' }}>
                A bad habit developed at the atom level does not correct itself at peewee without a system designed to catch it. Most organizations do not have that system.
              </p>
              <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: '#fff', lineHeight: 1.8, marginBottom: '40px', fontWeight: 600 }}>
                Parents choose organizations that can demonstrate measurable goalie development. Can you demonstrate it? What data do you have?
              </p>
              <VoiceButton label="HEAR COACH MIKE: WHAT ORGANIZATIONS ARE MISSING AND WHAT IT COSTS THEM" />
            </div>
            {/* RIGHT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {([
                { accent: BLUE2, label: 'Atom / Pee-Wee Gap', desc: 'Habits form before anyone notices. Without a tracking system, bad patterns become permanent — and no one catches them in time.' },
                { accent: BLUE, label: 'The Data Gap', desc: 'Organizations cannot show parents what development looks like because they have never measured it. No data. No proof. No confidence.' },
                { accent: BLUE3, label: 'The Coach Gap', desc: 'Most coaches at the minor level were never taught to develop goalies. The gap is not talent — it is the absence of a structured coaching framework.' },
              ] as { accent: string; label: string; desc: string }[]).map((card, i) => (
                <TiltCard key={i} effect="gravitate" tiltLimit={6} scale={1.02} style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                  <div style={{ borderLeft: `4px solid ${card.accent}`, padding: '22px 24px', borderRadius: '0 12px 12px 0', backdropFilter: 'blur(10px)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: card.accent, textTransform: 'uppercase', margin: '0 0 8px' }}>Gap {String(i + 1).padStart(2, '0')}</p>
                    <h3 style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '0.5px' }}>{card.label}</h3>
                    <p style={{ fontSize: 'clamp(14px, 1.5vw, 16px)', color: 'rgba(185,210,235,0.82)', lineHeight: 1.65, margin: 0 }}>{card.desc}</p>
                  </div>
                </TiltCard>
              ))}
              <div style={{ background: 'linear-gradient(135deg, rgba(55,181,255,0.08), rgba(55,181,255,0.04))', border: '1px solid rgba(55,181,255,0.24)', borderRadius: '12px', padding: '18px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
                <p style={{ fontSize: 'clamp(14px, 1.5vw, 16px)', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.6 }}>
                  Smarter Goalie is the system that fills every gap — from first-year atom to high performance athlete.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── F: What the System Delivers ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0d2648 0%, #102c50 100%)' }}>
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          {/* Header — Development Loop style */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '44px' }}>
            <div style={{ width: '6px', height: '100px', background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 4px' }}>The System</p>
              <h2 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>What Smarter Goalie<br />Delivers</h2>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative', marginLeft: 'clamp(32px, 5vw, 48px)', marginBottom: '56px' }}>
            {/* Vertical shiny cyan line */}
            <div style={{ position: 'absolute', left: '-36px', top: '16px', width: '6px', bottom: 0, background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', zIndex: 0 }} />

            {[
              { num: '01', label: 'Foundation to Refinement', desc: 'A complete development pathway from first year goalie to high performance athlete' },
              { num: '02', label: 'Every Age Group Covered', desc: 'One consistent system adapted to the development stage — no gaps, no blind spots' },
              { num: '03', label: 'Organization-Wide Curriculum', desc: 'Every goalie in your program following the same proven framework' },
              { num: '04', label: 'Coach Education at Every Level', desc: 'Your coaches learn alongside your goalies' },
              { num: '05', label: 'Admin Visibility', desc: 'Development data for every goalie at every level across the entire program' },
              { num: '06', label: 'Measurable Results', desc: 'Factor Ratios, charting data, development timelines across cohorts' },
              { num: '07', label: 'Custom Package Model', desc: 'Built for your organization\'s size, structure, and goals' },
            ].map((item, i) => (
              <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', marginBottom: i < 6 ? '48px' : '0', zIndex: 1 }}>
                {/* Glowing cyan node */}
                <div style={{ position: 'absolute', left: '-45px', top: '28px', width: '24px', height: '24px', borderRadius: '50%', background: '#0d2648', border: `4px solid ${BLUE2}`, boxShadow: `0 0 12px ${BLUE2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: BLUE2 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', width: '100%' }}>
                  {/* Large translucent number */}
                  <span style={{ fontSize: 'clamp(40px, 8vw, 88px)', fontWeight: 800, color: 'rgba(255,255,255,0.15)', lineHeight: 1, letterSpacing: '-3px', marginTop: '-8px', minWidth: '60px', textAlign: 'center', flexShrink: 0 }}>
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
          <VoiceButton label="HEAR COACH MIKE: THE ORGANIZATION-WIDE SYSTEM AND HOW IT IS STRUCTURED" />
        </div>
      </section>

      {/* ── G: Scalability Architecture ── */}
      <section style={{ ...sec, background: 'radial-gradient(circle at 70% 25%, #041525 0%, #071120 55%, #050b18 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(70px,16vw,230px)', fontWeight: 900, color: 'rgba(55,181,255,0.055)', letterSpacing: '-8px', lineHeight: 1, userSelect: 'none', fontStyle: 'italic', whiteSpace: 'nowrap' }}>SCALE</span>
        </div>
        <div style={{ position: 'absolute', top: '15%', right: '10%', width: '550px', height: '550px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(255,255,255,0.008) 60px, rgba(255,255,255,0.008) 61px)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '6px', height: '80px', background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', flexShrink: 0, marginTop: '4px' }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 6px' }}>The Architecture</p>
              <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 46px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>The Scalability<br />Architecture</h2>
            </div>
          </div>
          <p style={{ fontSize: 'clamp(22px, 3.2vw, 40px)', fontWeight: 800, fontStyle: 'italic', color: BLUE2, lineHeight: 1.25, marginBottom: '20px', maxWidth: '700px', textShadow: `0 0 24px rgba(55,181,255,0.55), 0 0 48px rgba(55,181,255,0.25)` }}>
            &ldquo;One system. Every age group. Unlimited scale.&rdquo;
          </p>
          <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'rgba(200,220,235,0.82)', lineHeight: 1.8, marginBottom: '16px', maxWidth: '720px' }}>
            Smarter Goalie&rsquo;s architecture is built to grow with your organization. Whether you have 10 goalies or 500 &mdash; the system delivers the same consistent development framework to every one of them.
          </p>
          <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: '#fff', lineHeight: 1.8, marginBottom: '44px', maxWidth: '720px', fontWeight: 600 }}>
            Admin controls all permissions. Every goalie, parent, and coach in your program operates within the structure you define. Nothing goes unseen.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10" style={{ maxWidth: '840px' }}>
            {([{ n: '10', label: 'Goalies', sub: 'Local club' }, { n: '50', label: 'Goalies', sub: 'Regional program' }, { n: '200', label: 'Goalies', sub: 'Association' }, { n: '500+', label: 'Goalies', sub: 'Provincial / national' }] as { n: string; label: string; sub: string }[]).map((item, i) => (
              <TiltCard key={i} effect="gravitate" tiltLimit={10} scale={1.06} style={{ borderRadius: '16px', overflow: 'hidden', background: 'linear-gradient(180deg, rgba(11,23,45,0.96), rgba(10,18,36,0.98))', border: `2px solid rgba(55,181,255,0.45)`, boxShadow: `0 0 0 1px rgba(55,181,255,0.12), 0 0 24px rgba(55,181,255,0.15), 0 6px 22px rgba(0,0,0,0.3)` }}>
                <div style={{ height: '3px', background: BLUE2, boxShadow: `0 0 8px ${BLUE2}` }} />
                <div style={{ padding: '22px 16px', textAlign: 'center', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '6px', right: '10px', fontSize: '48px', fontWeight: 900, color: 'rgba(55,181,255,0.07)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>{String(i + 1).padStart(2, '0')}</div>
                  <p style={{ fontSize: 'clamp(26px,3.8vw,42px)', fontWeight: 900, color: BLUE2, lineHeight: 1, marginBottom: '6px', textShadow: `0 0 18px rgba(55,181,255,0.5)` }}>{item.n}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(96,205,255,0.7)', fontWeight: 600, letterSpacing: '0.5px', margin: '0 0 16px' }}>{item.sub}</p>
                </div>
              </TiltCard>
            ))}
          </div>
          <div style={{ maxWidth: '640px', background: 'linear-gradient(135deg, rgba(55,181,255,0.07), rgba(55,181,255,0.03))', border: '1px solid rgba(55,181,255,0.22)', borderRadius: '14px', padding: '22px 26px', marginBottom: '36px', backdropFilter: 'blur(8px)' }}>
            <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, margin: 0, fontStyle: 'italic' }}>
              &ldquo;The system does not change when the scale changes. That is the point. The framework is built to be consistent whether you are running one team or a hundred.&rdquo;
            </p>
            <p style={{ fontSize: '11px', fontWeight: 700, color: BLUE2, letterSpacing: '2px', textTransform: 'uppercase', margin: '14px 0 0' }}>— COACH MIKE</p>
          </div>
          <VoiceButton label="HEAR COACH MIKE: THE SCALABILITY ARCHITECTURE AND ADMIN CONTROLS" />
        </div>
      </section>

      {/* ── H: Custom Package ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0a1f3d 0%, #0d2648 55%, #091829 100%)' }}>
        <div style={{ position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(70px,15vw,200px)', fontWeight: 900, color: 'rgba(96,205,255,0.04)', letterSpacing: '-6px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap' }}>CUSTOM</div>
        <div style={{ position: 'absolute', top: '15%', left: '5%', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(96,205,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(255,255,255,0.008) 60px, rgba(255,255,255,0.008) 61px)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-20" style={{ alignItems: 'flex-start' }}>
            {/* LEFT */}
            <div className="w-full lg:w-auto" style={{ flex: '0 0 auto', maxWidth: '440px' }}>
              <div style={{ display: 'inline-block', border: '4px solid #00f2ff', boxShadow: '0 0 18px rgba(0,242,255,0.65), inset 0 0 12px rgba(0,242,255,0.4)', padding: '12px 20px', marginBottom: '28px' }}>
                <h2 style={{ fontSize: 'clamp(14px, 1.6vw, 18px)', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '3px', margin: 0 }}>THE CUSTOM PACKAGE</h2>
              </div>
              <h3 style={{ fontSize: 'clamp(26px, 3.8vw, 50px)', fontWeight: 900, background: `linear-gradient(135deg, #fff 40%, ${BLUE2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 20px' }}>
                Built Around<br />What You Need.
              </h3>
              <p style={{ fontSize: 'clamp(16px, 1.9vw, 21px)', fontStyle: 'italic', color: BLUE2, fontWeight: 700, lineHeight: 1.4, marginBottom: '22px', textShadow: `0 0 16px rgba(96,205,255,0.4)` }}>
                &ldquo;We do not offer one-size-fits-all.<br />We build yours.&rdquo;
              </p>
              <p style={{ fontSize: 'clamp(15px, 1.5vw, 17px)', color: 'rgba(185,215,235,0.85)', lineHeight: 1.8, marginBottom: '16px' }}>
                Every organization is different in size, structure, competitive level, and development philosophy. Your package is designed around what your organization actually needs.
              </p>
              <p style={{ fontSize: 'clamp(15px, 1.5vw, 17px)', color: '#fff', lineHeight: 1.8, marginBottom: '36px', fontWeight: 600 }}>
                The conversation starts with Coach Mike. Not a sales team. Not an automated system. Coach Mike.
              </p>
              <VoiceButton label="HEAR COACH MIKE: THE CUSTOM PACKAGE MODEL AND WHAT THE FIRST CONVERSATION LOOKS LIKE" />
            </div>
            {/* RIGHT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {([
                { accent: BLUE2, label: 'Built for Your Size', desc: 'Whether you have 3 goalies or 300 — we build a package that fits your current size and scales as you grow. No paying for what you do not use.' },
                { accent: BLUE, label: 'Built for Your Structure', desc: 'Every organization runs differently. We work around your age groups, coaching structure, and existing development framework — not against it.' },
                { accent: BLUE3, label: 'Starts with Coach Mike', desc: 'The first conversation is always personal. Coach Mike reviews your inquiry and calls you directly. You speak to the person who built the system.' },
              ] as { accent: string; label: string; desc: string }[]).map((card, i) => (
                <TiltCard key={i} effect="gravitate" tiltLimit={6} scale={1.02} style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                  <div style={{ borderLeft: `4px solid ${card.accent}`, padding: '22px 24px', borderRadius: '0 12px 12px 0', backdropFilter: 'blur(10px)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: card.accent, textTransform: 'uppercase', margin: '0 0 8px' }}>Feature {String(i + 1).padStart(2, '0')}</p>
                    <h3 style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>{card.label}</h3>
                    <p style={{ fontSize: 'clamp(14px, 1.5vw, 16px)', color: 'rgba(185,210,235,0.82)', lineHeight: 1.65, margin: 0 }}>{card.desc}</p>
                  </div>
                </TiltCard>
              ))}
              <div style={{ background: 'linear-gradient(135deg, rgba(96,205,255,0.07), rgba(96,205,255,0.03))', border: '1px solid rgba(96,205,255,0.2)', borderRadius: '12px', padding: '18px 22px', backdropFilter: 'blur(8px)' }}>
                <p style={{ fontSize: 'clamp(14px, 1.5vw, 16px)', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
                  &ldquo;This is not a product sale. It is a partnership. We are not done with you after the onboarding call.&rdquo;
                </p>
                <p style={{ fontSize: '11px', fontWeight: 700, color: BLUE2, letterSpacing: '2px', textTransform: 'uppercase', margin: '12px 0 0' }}>— COACH MIKE</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── I: Founding Partner ── */}
      <section id="package" style={{ ...sec, background: 'linear-gradient(160deg, #092038 0%, #0e2848 100%)' }}>
        <div style={{ position: 'absolute', right: '-60px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(200px, 30vw, 440px)', fontWeight: 900, color: 'rgba(255,255,255,0.02)', letterSpacing: '-20px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>100</div>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', width: '800px', height: '800px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.06) 0%, transparent 70%)', pointerEvents: 'none', transform: 'translateX(-50%)' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 text-center w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.32)', borderRadius: '50px', padding: '8px 20px', marginBottom: '28px', boxShadow: '0 2px 12px rgba(55,181,255,0.12)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: BLUE2, boxShadow: '0 0 0 3px rgba(55,181,255,0.22)', flexShrink: 0 }} />
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: BLUE2, margin: 0, textTransform: 'uppercase' }}>Founding Partner Opportunity</p>
          </div>
          <h2 style={{ fontSize: 'clamp(30px, 5vw, 66px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '24px' }}>
            THIS IS THE EXPERIENCE<br /><span style={{ color: BLUE2 }}>BUILDING PHASE</span>
          </h2>
          <p style={{ fontSize: 'clamp(16px, 2vw, 21px)', color: 'rgba(175,215,238,0.9)', lineHeight: 1.8, maxWidth: '680px', margin: '0 auto 16px' }}>
            Organizations that join during the Experience Building Phase become founding partners.
          </p>
          <p style={{ fontSize: 'clamp(14px, 1.5vw, 17px)', color: 'rgba(148,192,222,0.85)', lineHeight: 1.85, maxWidth: '640px', margin: '0 auto 52px' }}>
            The relationship we build with you during this phase shapes how Smarter Goalie serves organizations at every level for years to come.
          </p>
          <ApplicationSteps
            borderColor="rgba(55,181,255,0.28)"
            steps={[
              // The "organization inquiry form" is /contact — its role list has
              // Organisation / Association Executive.
              { num: '01', text: 'Complete the organization inquiry form — 5 minutes', href: '/contact', action: 'Open the form' },
              { num: '02', text: 'Coach Mike personally reviews your inquiry' },
              { num: '03', text: "Coach Mike calls you personally to discuss your organization's needs", href: '/contact', action: 'Set up the call' },
            ]}
          />
          <button
            onClick={() => router.push('/auth/register')}
            style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE3} 100%)`, color: '#fff', border: 'none', padding: 'clamp(16px,2vw,22px) clamp(32px,4vw,56px)', borderRadius: '12px', fontSize: 'clamp(13px,1.5vw,16px)', fontWeight: 900, letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 8px 32px rgba(55,181,255,0.38)', transition: 'all 0.2s', display: 'inline-block', marginBottom: '36px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 44px rgba(55,181,255,0.58)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(55,181,255,0.38)'; }}
          >
            BUILD A PACKAGE →
          </button>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <VoiceButton label="HEAR COACH MIKE: WHAT THE FOUNDING ORGANIZATION RELATIONSHIP LOOKS LIKE" />
          </div>
        </div>
      </section>

      <SevenPillarsCTA from="organization" eyebrow="For The Organization" />

      <Footer7 />
    </div>
  );
}
