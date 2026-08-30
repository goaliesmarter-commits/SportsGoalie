'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Shield, Check, ChevronLeft } from 'lucide-react';
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
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: on ? 'linear-gradient(135deg, rgba(55,181,255,0.14), rgba(96,205,255,0.07))' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${on ? 'rgba(96,205,255,0.32)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '50px', padding: '9px 18px 9px 10px',
          color: on ? BLUE2 : '#475569', fontSize: '11px', fontWeight: 700,
          letterSpacing: '1.2px', cursor: on ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
          boxShadow: on ? '0 2px 10px rgba(55,181,255,0.12)' : 'none',
        }}
      >
        <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: on ? `linear-gradient(135deg, ${BLUE}, ${BLUE3})` : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {playing ? <Pause size={10} color="#fff" /> : <Play size={10} color="#fff" fill="#fff" />}
        </span>
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">HEAR COACH MIKE</span>
      </button>
      <button
        onClick={() => { setOn(v => !v); if (on) setPlaying(false); }}
        style={{ fontSize: '10px', color: on ? BLUE2 : '#475569', letterSpacing: '1.5px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}
      >
        VOICE {on ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

function AutoVoicePlayer({ autoPlay = true }: { autoPlay?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [on, setOn] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!autoPlay) return;
    const t = setTimeout(() => setPlaying(true), 900);
    return () => clearTimeout(t);
  }, [autoPlay]);

  useEffect(() => {
    if (!playing || progress >= 100) return;
    const iv = setInterval(() => setProgress(p => Math.min(100, p + 0.222)), 450);
    return () => clearInterval(iv);
  }, [playing, progress]);

  useEffect(() => {
    if (progress >= 100) setPlaying(false);
  }, [progress]);

  const fmt = (pct: number) => {
    const s = Math.round((pct / 100) * 225);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const waveform = [0.3,0.5,0.8,0.4,0.95,0.6,0.35,0.75,1,0.55,0.4,0.85,0.65,0.3,0.9,0.7,0.45,0.5,0.8,0.35,0.6,1,0.4,0.7,0.5,0.9,0.3,0.65,0.85,0.4,0.75,0.5,1,0.35,0.8,0.6,0.45,0.9,0.5,0.3,0.7,0.55,0.8,0.35,0.65,0.95,0.4,0.7,0.5,0.85];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
      animation: 'player-float 6s ease-in-out infinite',
    }}>
      {/* Header row: mic icon + name + duration badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,240,255,0.06))', border: '1.5px solid rgba(0,240,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 14px rgba(0,240,255,0.2)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(0,240,255,0.65)', letterSpacing: '2.5px', textTransform: 'uppercase', margin: '0 0 3px' }}>VOICE MESSAGE</p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>Coach Mike</p>
        </div>
        <div style={{ background: playing ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${playing ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '20px', padding: '4px 10px', transition: 'all 0.3s', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: playing ? '#4ade80' : 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>{playing ? 'LIVE' : '3:45'}</span>
        </div>
      </div>

      {/* Quote */}
      <p style={{ fontSize: '13px', color: 'rgba(148,163,184,0.65)', margin: '0 0 18px', fontStyle: 'italic', lineHeight: 1.55 }}>
        &ldquo;What it means to be in the right place&rdquo;
      </p>

      {/* Waveform visualizer — clickable to scrub */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '2.5px', height: '52px', marginBottom: '8px', cursor: 'pointer' }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setProgress(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
        }}
      >
        {waveform.map((h, i) => {
          const isPast = (i / waveform.length) * 100 < progress;
          return (
            <div key={i} style={{
              flex: 1,
              height: `${h * 100}%`,
              background: isPast ? '#00f0ff' : 'rgba(255,255,255,0.14)',
              borderRadius: '2px',
              transition: 'background 0.08s',
              boxShadow: isPast ? '0 0 4px rgba(0,240,255,0.4)' : 'none',
            }} />
          );
        })}
      </div>

      {/* Time stamps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(100,116,139,0.8)' }}>{fmt(progress)}</span>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(100,116,139,0.8)' }}>3:45</span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
        <button onClick={() => setProgress(p => Math.max(0, p - 8))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.55)', display: 'flex', padding: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>
        <button
          onClick={() => setPlaying(p => !p)}
          style={{ width: '60px', height: '60px', borderRadius: '50%', background: playing ? 'rgba(0,240,255,0.12)' : '#00f0ff', border: playing ? '2px solid #00f0ff' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: playing ? '0 0 0 8px rgba(0,240,255,0.1), 0 0 24px rgba(0,240,255,0.3)' : '0 0 20px rgba(0,240,255,0.4)', transition: 'all 0.25s' }}
        >
          {playing
            ? <Pause size={24} color="#00f0ff" />
            : <svg width="24" height="24" viewBox="0 0 24 24" fill="#051125"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <button onClick={() => setProgress(p => Math.min(100, p + 8))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.55)', display: 'flex', padding: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
      </div>

      {/* Footer */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => { setOn(v => !v); if (on) setPlaying(false); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: on ? '#00f0ff' : 'rgba(100,116,139,0.4)', letterSpacing: '3px', textTransform: 'uppercase' }}
        >
          VOICE {on ? 'ON' : 'OFF'}
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
          {[12, 20, 8, 16, 10].map((h, i) => (
            <div key={i} style={{ width: '3px', height: `${playing ? h : Math.round(h * 0.45)}px`, background: i === 1 ? '#00f0ff' : `rgba(0,240,255,${0.35 + i * 0.1})`, borderRadius: '1.5px', transition: `height ${0.2 + i * 0.05}s ease` }} />
          ))}
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

export default function GoaliePage() {
  const router = useRouter();
  const [ageGroup, setAgeGroup] = useState<'under18' | 'over18'>('over18');

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
            <Shield size={13} color={BLUE2} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: BLUE2 }}>YOU SELECTED:</span>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: '#fff' }}>GOALIE</span>
          </div>
        </div>
      </div>

      {/* ── C: Voice Player ── */}
      <section style={{ ...sec, background: 'linear-gradient(145deg, #1e5ec4 0%, #1850b4 58%, #0f3d9e 100%)' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes player-float {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-10px); }
          }
          @keyframes cover-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(0,240,255,0.0); }
            50%       { box-shadow: 0 0 0 12px rgba(0,240,255,0.08); }
          }
        `}} />
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
              <h1 style={{ fontSize: 'clamp(40px, 6.5vw, 80px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.03em', margin: '0 0 16px', color: '#fff' }}>
                A personal<br />message.
              </h1>
              <p style={{ fontSize: 'clamp(22px, 3.2vw, 38px)', fontWeight: 800, color: BLUE2, margin: '0 0 28px', letterSpacing: '-0.01em' }}>Just for you.</p>
              <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.75, margin: 0, maxWidth: '400px' }}>
                Coach Mike recorded this specifically for goalies who made it to this page.
              </p>
            </div>
            <div style={{ flex: '1 1 0', maxWidth: '400px', width: '100%' }}>
              <AutoVoicePlayer autoPlay={true} />
            </div>
          </div>
        </div>
      </section>

      {/* ── D: Opening Statement ── */}
      <section style={{ ...sec, background: 'linear-gradient(155deg, #0d2848 0%, #133050 65%, #0b2242 100%)' }}>
        {/* Background boxes grid */}
        <Boxes />
        {/* Radial vignette — fades boxes toward edges so content stays readable */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 25%, #0d2848 72%)' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: 'clamp(48px, 8vw, 110px)', fontWeight: 900, lineHeight: 0.92, letterSpacing: '-0.03em', color: '#fff', margin: '0 0 40px', maxWidth: '1100px' }}>
            YOU ARE IN<br />THE RIGHT<br />PLACE.
          </h2>
          <p style={{ fontSize: 'clamp(17px, 2.1vw, 24px)', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, maxWidth: '680px', margin: '0 0 36px', fontWeight: 400 }}>
            The knowledge, the skill development, and the support that sets you apart is here. All you need is an open mind.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
            <div style={{ height: '2px', width: '48px', background: `linear-gradient(90deg, ${BLUE2}, rgba(96,205,255,0.2))`, flexShrink: 0 }} />
            <p style={{ fontSize: 'clamp(13px, 1.6vw, 17px)', fontWeight: 900, color: BLUE2, margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>
              FAILURE IS NOT IN OUR VOCABULARY.
            </p>
          </div>
          <VoiceButton label="HEAR COACH MIKE: WHAT IT MEANS TO BE IN THE RIGHT PLACE" />
        </div>
      </section>

      {/* ── E: The Honest Truth ── */}
      <section style={{ ...sec, background: 'linear-gradient(140deg, #1b3c7c 0%, #143270 100%)' }}>
        <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(120px, 19vw, 280px)', fontWeight: 900, color: 'rgba(255,255,255,0.022)', letterSpacing: '-8px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}>
          TRUTH
        </div>
        <div style={{ position: 'absolute', top: '-10%', right: '15%', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(96,205,255,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <SectionLabel text="The Honest Truth" />
          <div style={{ maxWidth: '820px' }}>
            <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: 'rgba(184,212,232,0.9)', lineHeight: 1.9, marginBottom: '22px' }}>
              Most goalies practice the wrong way for years... and never know it. Not because they don&rsquo;t work hard. Because nobody ever gave them the system.
            </p>
            <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: 'rgba(184,212,232,0.9)', lineHeight: 1.9, marginBottom: '22px' }}>
              Your set crouch. Your game. Not someone else&rsquo;s template forced onto your body.
            </p>
            <p style={{ fontSize: 'clamp(17px, 2.1vw, 22px)', color: '#fff', lineHeight: 1.9, marginBottom: '32px', fontWeight: 600 }}>
              Smarter Goalie does not dictate your game. Together, we discover it. What happens next is astounding.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <div style={{ height: '2px', width: '48px', background: `linear-gradient(90deg, ${BLUE2}, rgba(96,205,255,0.2))`, flexShrink: 0 }} />
            <p style={{ fontSize: 'clamp(13px, 1.6vw, 17px)', fontWeight: 900, color: BLUE2, margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>
              BUILT NOT BORN &middot; SIX DECADES &middot; ONE SYSTEM.
            </p>
          </div>
          <VoiceButton label="HEAR COACH MIKE: DISCOVERING YOUR GAME, NOT COPYING SOMEONE ELSE'S" />
        </div>
      </section>

      {/* ── F: Knowledge and Skill ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0a1f3d 0%, #0d2648 50%, #091829 100%)' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes knowledge-pulse {
            0%   { box-shadow: 0 0 20px rgba(0,242,255,0.2); transform: scale(0.98); }
            50%  { box-shadow: 0 0 50px rgba(0,242,255,0.4); transform: scale(1); }
            100% { box-shadow: 0 0 20px rgba(0,242,255,0.2); transform: scale(0.98); }
          }
          @keyframes knowledge-wave {
            0%, 100% { transform: scaleY(0.4); }
            50%       { transform: scaleY(1); }
          }
        `}} />
        <div style={{ position: 'absolute', top: '10%', left: '40%', width: '700px', height: '700px', background: 'radial-gradient(ellipse, rgba(0,242,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col lg:flex-row gap-14 lg:gap-20 items-start">

            {/* Left column */}
            <div style={{ flex: '1 1 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '28px' }}>
                <div style={{ width: '4px', alignSelf: 'stretch', minHeight: '72px', background: 'linear-gradient(to bottom, #00f2ff, #0ea5e9)', borderRadius: '2px', boxShadow: '0 0 14px rgba(0,242,255,0.8)', flexShrink: 0 }} />
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, lineHeight: 1.1, background: 'linear-gradient(to bottom, #ffffff 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
                  KNOWLEDGE<br />AND SKILL
                </h2>
              </div>
              <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(148,212,240,0.85)', fontWeight: 300, lineHeight: 1.9, marginBottom: '22px' }}>
                Knowledge tells you what to do. Skill is what happens when you execute it under pressure at game speed.
              </p>
              <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(148,212,240,0.85)', fontWeight: 300, lineHeight: 1.9, marginBottom: '40px' }}>
                Smarter Goalie builds both simultaneously. The sub-conscious mind runs at game speed. The conscious mind doesn&rsquo;t. We train the right one.
              </p>

              {/* Fancy audio player */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,242,255,0.25)', borderRadius: '50px', maxWidth: '480px', padding: '10px 20px 10px 10px', cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0, animation: 'knowledge-pulse 2.2s ease-in-out infinite' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', border: '2px solid rgba(0,242,255,0.2)' }} />
                  <div style={{ position: 'absolute', top: '7px', right: '7px', bottom: '7px', left: '7px', borderRadius: '50%', border: '1.5px solid rgba(0,242,255,0.4)' }} />
                  <div style={{ position: 'absolute', top: '14px', right: '14px', bottom: '14px', left: '14px', borderRadius: '50%', background: 'linear-gradient(135deg, #00f2ff, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0,242,255,0.6)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                      <polygon points="6,3 20,12 6,21" />
                    </svg>
                  </div>
                </div>
                <div style={{ flex: 1, paddingLeft: '16px', paddingRight: '14px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 800, color: '#00f2ff', letterSpacing: '1.8px', textTransform: 'uppercase', margin: '0 0 4px' }}>HEAR COACH MIKE</p>
                  <p style={{ fontSize: '11px', color: 'rgba(180,220,240,0.75)', margin: 0, lineHeight: 1.4 }}>The Sub-Conscious &amp; Why It Changes Everything</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  {[0.35,0.65,1,0.75,0.45,0.85,0.55,0.9,0.4,0.7].map((h, i) => (
                    <div key={i} style={{ width: '3px', height: `${20 * h}px`, background: 'rgba(0,242,255,0.55)', borderRadius: '2px', animation: `knowledge-wave ${0.7 + i * 0.09}s ease-in-out infinite`, animationDelay: `${i * 0.07}s`, transformOrigin: 'center' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="w-full lg:w-auto" style={{ flex: '0 0 auto', maxWidth: '420px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                {([
                  {
                    label: 'KNOWLEDGE',
                    desc: 'What to do and why — the cognitive foundation of the high performance goalie',
                    accent: '#00f2ff',
                    icon: (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                        <path d="M6 12v5c3.333 1.667 7.667 1.667 12 0v-5"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'SKILL',
                    desc: 'Execution under pressure at full game speed — automatic and reliable',
                    accent: '#a78bfa',
                    icon: (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                    ),
                  },
                  {
                    label: 'BOTH TOGETHER',
                    desc: 'Built simultaneously, never separately — the Smarter Goalie method',
                    accent: '#34d399',
                    icon: (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                        <polyline points="2 17 12 22 22 17"/>
                        <polyline points="2 12 12 17 22 12"/>
                      </svg>
                    ),
                  },
                ] as { label: string; desc: string; accent: string; icon: React.ReactNode }[]).map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '18px',
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${item.accent}80`,
                    borderRadius: '14px',
                    padding: '20px 22px',
                    boxShadow: `0 0 35px ${item.accent}40, inset 0 0 25px ${item.accent}20`,
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
                      <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '1.5px', margin: '0 0 6px', textTransform: 'uppercase' }}>{item.label}</p>
                      <p style={{ fontSize: '13px', color: 'rgba(200,225,242,0.7)', margin: 0, lineHeight: 1.55 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quote box */}
              <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,242,255,0.3)', borderRadius: '14px', boxShadow: '0 0 28px rgba(0,242,255,0.12), inset 0 0 22px rgba(0,242,255,0.06)' }}>
                <p style={{ fontSize: '14px', color: 'rgba(200,228,248,0.75)', margin: 0, lineHeight: 1.8, fontStyle: 'italic' }}>
                  &ldquo;The sub-conscious mind runs at game speed. The conscious mind doesn&rsquo;t. Train the right one.&rdquo;
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── G: Feel Factor ── */}
      <section style={{ ...sec, background: 'radial-gradient(circle at 30% 30%, #0d1a2d 0%, #050b18 100%)', justifyContent: 'space-between' }}>
        {/* Diagonal texture overlay */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 10px)', pointerEvents: 'none', zIndex: 0 }} />
        {/* Ghost FEEL text */}
        <div style={{ position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(160px, 28vw, 420px)', fontWeight: 900, fontStyle: 'italic', color: 'rgba(255,255,255,0.025)', letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>
          FEEL
        </div>

        {/* Top: glow-border header + first quote */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', border: '5px solid #00f2ff', boxShadow: '0 0 20px rgba(0,242,255,0.7), inset 0 0 15px rgba(0,242,255,0.5)', padding: '14px 20px', marginBottom: '22px' }}>
            <h2 style={{ fontSize: 'clamp(22px, 3.2vw, 40px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#fff', textTransform: 'uppercase', margin: 0 }}>
              THE FEEL FACTOR<br />&amp; THE MIND&rsquo;S EYE
            </h2>
          </div>
          <p style={{ fontSize: 'clamp(15px, 1.7vw, 19px)', color: 'rgba(200,225,242,0.72)', fontStyle: 'italic', lineHeight: 1.7, maxWidth: '460px', margin: 0 }}>
            &ldquo;Do you have the Feel Factor? Where&rsquo;s your Feel Factor?<br />How&rsquo;s your Feel Factor?&rdquo;
          </p>
        </div>

        {/* Center: big cyan italic quote */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 20px' }}>
          <h3 style={{ fontSize: 'clamp(38px, 6.5vw, 84px)', fontWeight: 900, fontStyle: 'italic', color: '#00f2ff', textShadow: '0 0 15px rgba(0,242,255,0.8), 0 0 35px rgba(0,242,255,0.4)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 22px' }}>
            &ldquo;What&rsquo;s in your<br />Mind&rsquo;s Eye?&rdquo;
          </h3>
          <p style={{ fontSize: 'clamp(17px, 2vw, 23px)', fontWeight: 300, color: 'rgba(220,235,248,0.9)', lineHeight: 1.6, letterSpacing: '0.01em', margin: 0 }}>
            &ldquo;The Feel Factor is connected to a Mind&rsquo;s Eye<br />that can scan the form.&rdquo;
          </p>
        </div>

        {/* Bottom: audio pill player */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '8px 20px 8px 8px', width: 'fit-content', maxWidth: '100%' }}>
            <button style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#00f2ff', boxShadow: '0 0 20px rgba(0,242,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <span className="hidden sm:inline" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              HEAR COACH MIKE: THE FEEL FACTOR AND THE MIND&rsquo;S EYE
            </span>
            <span className="sm:hidden" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
              HEAR COACH MIKE
            </span>
            <span className="hidden sm:inline" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              VOICE ON
            </span>
          </div>
        </div>
      </section>

      {/* ── H: The System / Development Loop ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0d2648 0%, #0b2240 100%)' }}>
        <div style={{ position: 'absolute', top: '15%', right: '-8%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          {/* Header with cyan bar */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '44px' }}>
            <div style={{ width: '6px', height: '100px', background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', flexShrink: 0, marginTop: '0px' }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 4px' }}>The System</p>
              <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>Your Development Loop</h1>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative', marginLeft: 'clamp(32px, 5vw, 48px)' }}>
            {/* Vertical cyan line */}
            <div style={{ position: 'absolute', left: '-36px', top: '16px', width: '6px', bottom: 0, background: BLUE2, boxShadow: `0 0 15px ${BLUE2}`, borderRadius: '3px', zIndex: 0 }} />

            {[
              { num: '01', label: 'Game Charting', desc: 'Period by period, learning to self-evaluate, identifying strengths and weaknesses' },
              { num: '02', label: 'Practice Charting', desc: 'Designated training, what was worked, did it improve, Maintenance Program' },
              { num: '03', label: 'Self-Evaluation Charting', desc: 'Technical Eye and Feel Factor: feel during execution and observe through video review' },
              { num: '04', label: 'Skill Charting', desc: 'Strong Side / Weak Side: both built simultaneously' },
              { num: '05', label: 'Development Loop', desc: 'Game Chart → Practice Index → Practice Chart → Next Game Chart' },
            ].map((item, i) => (
              <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', marginBottom: i < 4 ? '48px' : '0', zIndex: 1 }}>
                {/* Cyan node */}
                <div style={{ position: 'absolute', left: '-45px', top: '28px', width: '24px', height: '24px', borderRadius: '50%', background: '#0b2240', border: `4px solid ${BLUE2}`, boxShadow: `0 0 12px ${BLUE2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: BLUE2 }} />
                </div>

                {/* Content */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', width: '100%' }}>
                  {/* Large translucent number */}
                  <span style={{ fontSize: 'clamp(40px, 8vw, 88px)', fontWeight: 800, color: 'rgba(255, 255, 255, 0.15)', lineHeight: 1, letterSpacing: '-3px', marginTop: '-8px', minWidth: '60px', textAlign: 'center', flexShrink: 0 }}>
                    {item.num}
                  </span>

                  {/* Text content */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 'clamp(16px, 1.8vw, 20px)', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px', marginTop: '8px' }}>
                      {item.label}
                    </h3>
                    <p style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: 'rgba(150, 200, 232, 0.85)', lineHeight: 1.65, margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Flow diagram for step 5 */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#fff', textTransform: 'uppercase' }}>GAME CHART</span>
              <svg style={{ width: '16px', height: '16px', color: BLUE2 }} fill="currentColor" viewBox="0 0 20 20">
                <path clipRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" fillRule="evenodd" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#fff', textTransform: 'uppercase' }}>PRACTICE INDEX</span>
              <svg style={{ width: '16px', height: '16px', color: BLUE2 }} fill="currentColor" viewBox="0 0 20 20">
                <path clipRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" fillRule="evenodd" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#fff', textTransform: 'uppercase' }}>PRACTICE CHART</span>
              <svg style={{ width: '16px', height: '16px', color: BLUE2 }} fill="currentColor" viewBox="0 0 20 20">
                <path clipRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" fillRule="evenodd" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#fff', textTransform: 'uppercase' }}>NEXT GAME CHART</span>
            </div>
          </div>

          {/* Voice button */}
          <div style={{ marginTop: '56px' }}>
            <VoiceButton label="HEAR COACH MIKE: THE DEVELOPMENT LOOP AND WHY NOTHING IS EVER LOST" />
          </div>
        </div>
      </section>

      {/* ── I: What Smarter Goalie Builds ── */}
      <section style={{ ...sec, background: 'linear-gradient(140deg, #1b3e80 0%, #163276 100%)' }}>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(96,205,255,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(255,255,255,0.011) 60px, rgba(255,255,255,0.011) 61px)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(20px, 3vw, 38px)', fontWeight: 900, lineHeight: 1.3, maxWidth: '1200px', letterSpacing: '-0.01em', marginBottom: '32px' }}>
            WE DON&rsquo;T JUST BUILD GOALIES.{' '}
            <span style={{ color: RED }}>We build Intelligent Athletic Goaltenders. Starters. Leaders...</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5" style={{ gap: '14px', alignItems: 'stretch', width: '100%', maxWidth: '1400px', marginBottom: '44px' }}>
            {[
              'The Intelligent Athletic Goaltender: technically sound, positionally precise, and self-coaching',
              'Knowledge AND Skill: built together, never separately',
              'Character is built from day one and baked into every Pillar and every session',
              'Leadership: goalies are natural leaders. This system builds that deliberately.',
              'Self-awareness that lasts a lifetime: in hockey, in school, and in everything that follows',
            ].map((item, i) => (
              <TiltCard
                key={i}
                effect="gravitate"
                tiltLimit={8}
                scale={1.04}
                style={{
                  border: '2px solid rgba(96,205,255,0.78)',
                  borderRadius: '16px',
                  boxShadow:
                    '0 0 0 1px rgba(96,205,255,0.16), 0 0 22px rgba(96,205,255,0.26), 0 8px 24px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.05)',
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
          <VoiceButton label="HEAR COACH MIKE: WHAT SMARTER GOALIE ACTUALLY BUILDS IN A GOALIE" />
        </div>
      </section>

      {/* ── 7 Pillars (public hub) ── */}
      <SevenPillarsCTA from="goalie" eyebrow="For The Goalie" />

      {/* ── J: Age Routing ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0a2040 0%, #0c2444 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(96,205,255,0.033) 1px, transparent 1px), linear-gradient(90deg, rgba(96,205,255,0.033) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(96,205,255,0.14)', borderRadius: '24px', padding: 'clamp(32px,5vw,56px)', maxWidth: '580px', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3.5px', color: 'rgba(96,205,255,0.6)', textTransform: 'uppercase', marginBottom: '20px' }}>SELECT YOUR SITUATION</p>
            <div style={{ display: 'flex', marginBottom: '28px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
              {(['under18', 'over18'] as const).map((group) => {
                const isActive = ageGroup === group;
                return (
                  <button
                    key={group}
                    onClick={() => setAgeGroup(group)}
                    style={{
                      padding: '10px 28px', fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px',
                      background: isActive ? `linear-gradient(135deg, ${BLUE}, ${BLUE3})` : 'transparent',
                      color: isActive ? '#fff' : '#475569',
                      border: 'none', borderRadius: '9px', cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: isActive ? '0 2px 14px rgba(14,165,233,0.4)' : 'none',
                    }}
                  >
                    {group === 'under18' ? 'UNDER 18' : 'OVER 18'}
                  </button>
                );
              })}
            </div>

            {ageGroup === 'under18' ? (
              <>
                <p style={{ fontSize: 'clamp(18px, 2.2vw, 22px)', color: '#fff', lineHeight: 1.6, fontWeight: 600, marginBottom: '14px' }}>
                  Under 18? Show this page to your parent or guardian.
                </p>
                <p style={{ fontSize: '16px', color: 'rgba(148,195,228,0.9)', lineHeight: 1.75, marginBottom: '28px' }}>
                  Have them complete the parent questionnaire. You become the reason they make the call.
                </p>
                <button
                  onClick={() => router.push('/parent')}
                  style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE3})`, color: '#fff', border: 'none', padding: '14px 30px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}
                >
                  GO TO PARENT PAGE →
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 'clamp(18px, 2.2vw, 22px)', color: '#fff', lineHeight: 1.6, fontWeight: 600, marginBottom: '14px' }}>
                  Ready to apply? Coach Mike is reviewing applications now.
                </p>
                <p style={{ fontSize: '16px', color: 'rgba(148,195,228,0.9)', lineHeight: 1.75, marginBottom: '28px' }}>
                  Scroll down. The questionnaire takes 5 minutes.
                </p>
                <a
                  href="#apply"
                  style={{ display: 'inline-block', background: `linear-gradient(135deg, ${BLUE}, ${BLUE3})`, color: '#fff', textDecoration: 'none', padding: '14px 30px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}
                >
                  APPLY NOW →
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── K: Founding Member ── */}
      <section id="apply" style={{ ...sec, background: 'linear-gradient(160deg, #092038 0%, #0e2848 100%)' }}>
        <div style={{ position: 'absolute', right: '-60px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(200px, 30vw, 440px)', fontWeight: 900, color: 'rgba(255,255,255,0.02)', letterSpacing: '-20px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
          100
        </div>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', width: '800px', height: '800px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.06) 0%, transparent 70%)', pointerEvents: 'none', transform: 'translateX(-50%)' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 text-center w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(96,205,255,0.26)', borderRadius: '50px', padding: '8px 20px', marginBottom: '28px', boxShadow: '0 2px 12px rgba(55,181,255,0.1)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: RED, boxShadow: '0 0 0 3px rgba(192,0,0,0.2)', flexShrink: 0 }} />
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: BLUE2, margin: 0, textTransform: 'uppercase' }}>Limited Availability</p>
          </div>

          <h2 style={{ fontSize: 'clamp(30px, 5vw, 66px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '24px' }}>
            THIS IS THE EXPERIENCE<br />
            <span style={{ color: BLUE2 }}>BUILDING PHASE</span>
          </h2>
          <p style={{ fontSize: 'clamp(16px, 2vw, 21px)', color: 'rgba(175,215,238,0.9)', lineHeight: 1.8, maxWidth: '680px', margin: '0 auto 16px' }}>
            Coach Mike is personally selecting one hundred founding members to join the Smarter Goalie BUILD experience.
          </p>
          <p style={{ fontSize: 'clamp(14px, 1.5vw, 17px)', color: 'rgba(148,192,222,0.85)', lineHeight: 1.85, maxWidth: '640px', margin: '0 auto 52px' }}>
            Not open to the general public. Founding members help build what Smarter Goalie becomes. Their feedback shapes the final product. In return, Coach Mike&rsquo;s personal attention, direct access, and a founding member rate are locked in forever.
          </p>

          <ApplicationSteps
            steps={[
              // Was /auth/register until 26 August, which was a dead end: goalies
              // are invitation-only by Michael's decision, so the sign-up page
              // offers Parent and Coach and nothing else. Anyone following this
              // step hit a wall. /contact now lists 'Goalie' first and reaches him
              // directly — the interim request-to-join path until the application-
              // by-questionnaire flow ships.
              { num: '01', text: 'Tell Coach Mike about yourself — 5 minutes', href: '/contact', action: 'Start' },
              { num: '02', text: 'Coach Mike personally reviews your application, with no automation and no filter' },
              // Live as of 26 August: 'Goalie' is now in the /contact role list.
              { num: '03', text: 'Coach Mike calls you personally', href: '/contact', action: 'Set up the call' },
            ]}
          />

          <button
            onClick={() => router.push('/contact')}
            style={{
              background: RED, color: '#fff', border: 'none',
              padding: 'clamp(16px,2vw,22px) clamp(32px,4vw,56px)',
              borderRadius: '12px', fontSize: 'clamp(13px,1.5vw,16px)',
              fontWeight: 900, letterSpacing: '2px', cursor: 'pointer',
              textTransform: 'uppercase', boxShadow: '0 8px 32px rgba(192,0,0,0.35)',
              transition: 'all 0.2s', display: 'inline-block', marginBottom: '36px',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 44px rgba(192,0,0,0.5)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(192,0,0,0.35)'; }}
          >
            APPLY TO JOIN THE EXPERIENCE →
          </button>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <VoiceButton label="HEAR COACH MIKE: WHAT IT MEANS TO BE A FOUNDING MEMBER" />
          </div>
        </div>
      </section>

      <Footer7 />
    </div>
  );
}
