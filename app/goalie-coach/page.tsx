'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Target, Check, ChevronLeft } from 'lucide-react';
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
        &ldquo;Why we don&apos;t compete with what you do — we complete it&rdquo;
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

export default function GoalieCoachPage() {
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
            <Target size={13} color={BLUE2} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: BLUE2 }}>YOU SELECTED:</span>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '3px', color: '#fff' }}>GOALIE COACH</span>
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
              <p style={{ fontSize: 'clamp(22px, 3.2vw, 38px)', fontWeight: 800, color: BLUE2, margin: '0 0 28px', letterSpacing: '-0.01em' }}>Peer to peer.</p>
              <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.75, margin: 0, maxWidth: '400px' }}>
                Coach Mike recorded this specifically for goalie coaches who made it to this page.
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
          <h2 style={{ fontSize: 'clamp(34px, 6.2vw, 84px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', color: RED, margin: '0 0 28px', maxWidth: '1000px' }}>
            YOU CHOSE THE TOUGHEST JOB IN HOCKEY.
          </h2>
          <p style={{ fontSize: 'clamp(20px, 3vw, 38px)', fontWeight: 900, color: '#fff', lineHeight: 1.2, maxWidth: '820px', margin: '0 0 20px', textTransform: 'uppercase' }}>
            HOW GOES THE GOALIE — HOW GOES THE TEAM.{' '}
            <span style={{ color: BLUE2 }}>You are an influencer who creates starters.</span>
          </p>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, rgba(55,181,255,0.09), rgba(96,205,255,0.05))', border: '1px solid rgba(96,205,255,0.22)', borderLeft: `4px solid ${BLUE3}`, borderRadius: '0 12px 12px 0', padding: '16px 28px', marginBottom: '40px', boxShadow: '0 2px 16px rgba(14,165,233,0.08)' }}>
            <p style={{ fontSize: 'clamp(15px, 1.9vw, 22px)', fontWeight: 700, color: BLUE2, margin: 0 }}>
              Smarter Goalie does not compete with what you do. It completes it.
            </p>
          </div>
          <br />
          <VoiceButton label="HEAR COACH MIKE: THE GOALIE COACH'S ROLE AND WHY IT MATTERS MORE THAN ANY OTHER COACHING POSITION" />
        </div>
      </section>

      {/* ── E: Respect Factor & Feel Factor ── */}
      <section style={{ ...sec, background: 'radial-gradient(circle at 25% 35%, #0d1a2d 0%, #050b18 100%)', justifyContent: 'space-between' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 10px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(160px, 28vw, 420px)', fontWeight: 900, fontStyle: 'italic', color: 'rgba(255,255,255,0.025)', letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>FEEL</div>
        <div style={{ position: 'absolute', top: '-10%', left: '30%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(0,242,255,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Top: glow-border header */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', border: '5px solid #00f2ff', boxShadow: '0 0 20px rgba(0,242,255,0.7), inset 0 0 15px rgba(0,242,255,0.5)', padding: '14px 20px', marginBottom: '22px' }}>
            <h2 style={{ fontSize: 'clamp(18px, 2.4vw, 30px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#fff', textTransform: 'uppercase', margin: 0 }}>
              THE RESPECT FACTOR<br />&amp; THE FEEL FACTOR
            </h2>
          </div>
          <p style={{ fontSize: 'clamp(15px, 1.7vw, 19px)', color: 'rgba(200,225,242,0.72)', fontStyle: 'italic', lineHeight: 1.7, maxWidth: '460px', margin: 0 }}>
            Two things your goalies must develop that most programs never address directly.
          </p>
        </div>

        {/* Center: big italic cyan statement */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 20px' }}>
          <h3 style={{ fontSize: 'clamp(32px, 5.5vw, 74px)', fontWeight: 900, fontStyle: 'italic', color: '#00f2ff', textShadow: '0 0 15px rgba(0,242,255,0.8), 0 0 35px rgba(0,242,255,0.4)', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 22px' }}>
            &ldquo;How many of your<br />goalies can self-coach?&rdquo;
          </h3>
          <p style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 400, color: 'rgba(220,235,248,0.9)', lineHeight: 1.6, margin: '0 0 14px' }}>
            The Respect Factor is earned through consistency.<br />The Feel Factor is built through honest self-evaluation.
          </p>
          <p style={{ fontSize: 'clamp(14px, 1.8vw, 19px)', fontWeight: 600, color: '#fff', lineHeight: 1.6, margin: 0 }}>
            Smarter Goalie builds that capacity deliberately.
          </p>
        </div>

        {/* Bottom: VoiceButton */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <VoiceButton label="HEAR COACH MIKE: THE RESPECT FACTOR AND THE FEEL FACTOR" />
        </div>
      </section>

      {/* ── F: Mathematical Framework ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0a1f3d 0%, #0d2648 50%, #091829 100%)' }}>
        <div style={{ position: 'absolute', right: '-2%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(80px, 14vw, 220px)', fontWeight: 900, color: 'rgba(192,0,0,0.04)', letterSpacing: '-0.04em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}>MATH</div>
        <div style={{ position: 'absolute', top: '5%', left: '40%', width: '700px', height: '700px', background: 'radial-gradient(ellipse, rgba(0,242,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col lg:flex-row gap-14 lg:gap-20 items-start">

            {/* Left */}
            <div style={{ flex: '1 1 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '28px' }}>
                <div style={{ width: '4px', alignSelf: 'stretch', minHeight: '72px', background: 'linear-gradient(to bottom, #00f2ff, #0ea5e9)', borderRadius: '2px', boxShadow: '0 0 14px rgba(0,242,255,0.8)', flexShrink: 0 }} />
                <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 46px)', fontWeight: 800, lineHeight: 1.1, background: 'linear-gradient(to bottom, #ffffff 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
                  THE MATHEMATICAL<br />FRAMEWORK
                </h2>
              </div>
              <p style={{ fontSize: 'clamp(18px, 2.6vw, 28px)', fontWeight: 900, fontStyle: 'italic', color: RED, textShadow: '0 0 16px rgba(192,0,0,0.55)', marginBottom: '24px', lineHeight: 1.2 }}>
                CAN YOUR CURRENT SYSTEM<br />SURVIVE FOUR FILTERS?
              </p>
              <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(148,212,240,0.85)', fontWeight: 300, lineHeight: 1.9, marginBottom: '22px' }}>
                Smarter Goalie is built on six decades of original IP. Every principle has been stress-tested against four filters. Not one has failed.
              </p>
              <p style={{ fontSize: 'clamp(15px, 1.9vw, 18px)', color: '#fff', lineHeight: 1.85, marginBottom: '40px', fontWeight: 600 }}>
                The 7 Angle-Mark System. The 6 Zone – 7 Point System™. The Feel Factor. The Mind&rsquo;s Eye. The Development Loop. These are not philosophies. They are systems with mathematical foundations.
              </p>
              <VoiceButton label="HEAR COACH MIKE: THE MATHEMATICAL FRAMEWORK BEHIND THE SMARTER GOALIE SYSTEM" />
            </div>

            {/* Right — 4 filter TiltCards */}
            <div className="w-full lg:w-auto" style={{ flex: '0 0 auto', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {([
                { num: '01', label: 'Logic', desc: 'Every principle must be logically sound before it enters the system', accent: '#00f2ff', icon: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>) },
                { num: '02', label: 'Common Sense', desc: "If it doesn't work in a real game environment at game speed, it fails", accent: '#a78bfa', icon: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>) },
                { num: '03', label: 'Math', desc: 'Measurable and trackable. Every Factor Ratio has a mathematical basis', accent: '#34d399', icon: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>) },
                { num: '04', label: 'Science', desc: 'Biomechanics, psychology, and motor learning — all validated', accent: '#fbbf24', icon: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-4 7h14l-4-7V3"/></svg>) },
              ] as { num: string; label: string; desc: string; accent: string; icon: React.ReactNode }[]).map((item, i) => (
                <TiltCard key={i} effect="gravitate" tiltLimit={8} scale={1.04}
                  style={{ border: `1px solid ${item.accent}80`, borderRadius: '14px', boxShadow: `0 0 35px ${item.accent}22, inset 0 0 25px ${item.accent}10` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '13px', padding: '20px 22px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: `linear-gradient(135deg, ${item.accent}25, ${item.accent}10)`, border: `1.5px solid ${item.accent}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 22px ${item.accent}45, inset 0 0 18px ${item.accent}20` }}>
                      {item.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: item.accent, letterSpacing: '2.5px', textTransform: 'uppercase', margin: '0 0 4px' }}>{item.num}</p>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px', margin: '0 0 6px', textTransform: 'uppercase' }}>{item.label}</p>
                      <p style={{ fontSize: '13px', color: 'rgba(200,225,242,0.7)', margin: 0, lineHeight: 1.55 }}>{item.desc}</p>
                    </div>
                  </div>
                </TiltCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── G: Goalie Coach Welcome Mat ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0d2648 0%, #0b2240 100%)' }}>
        <div style={{ position: 'absolute', top: '10%', left: '-5%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(80px, 13vw, 200px)', fontWeight: 900, color: 'rgba(255,255,255,0.018)', letterSpacing: '-6px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}>PEER</div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col lg:flex-row gap-14 lg:gap-20 items-start">

            {/* Left */}
            <div style={{ flex: '1 1 0' }}>
              <div style={{ display: 'inline-block', border: '4px solid #00f2ff', boxShadow: '0 0 18px rgba(0,242,255,0.65), inset 0 0 12px rgba(0,242,255,0.4)', padding: '12px 20px', marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 900, letterSpacing: '-0.01em', color: '#fff', textTransform: 'uppercase', margin: 0 }}>
                  THE GOALIE COACH WELCOME MAT
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '22px' }}>
                <div style={{ width: '4px', alignSelf: 'stretch', minHeight: '52px', background: 'linear-gradient(to bottom, #00f2ff, #0ea5e9)', borderRadius: '2px', boxShadow: '0 0 14px rgba(0,242,255,0.8)', flexShrink: 0 }} />
                <h3 style={{ fontSize: 'clamp(20px, 3vw, 38px)', fontWeight: 800, lineHeight: 1.2, background: 'linear-gradient(to bottom, #ffffff 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
                  Built for the goalie coach profession.
                </h3>
              </div>
              <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', fontStyle: 'italic', color: '#00f2ff', textShadow: '0 0 14px rgba(0,242,255,0.5)', marginBottom: '22px', lineHeight: 1.4, fontWeight: 700 }}>
                Volunteer, part-time, or full-time.
              </p>
              <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(148,212,240,0.85)', fontWeight: 300, lineHeight: 1.9, marginBottom: '22px' }}>
                Smarter Goalie has created a welcome mat for goalie coaches at every level of the profession.
              </p>
              <p style={{ fontSize: 'clamp(15px, 1.9vw, 18px)', color: '#fff', lineHeight: 1.85, marginBottom: '40px', fontWeight: 600 }}>
                One of our goals is to help goalie coach entrepreneurs grow. We share knowledge. We build the profession together. We raise the standard of goaltending development at every level.
              </p>
              <VoiceButton label="HEAR COACH MIKE: THE GOALIE COACH COMMUNITY AND WHAT WE ARE BUILDING TOGETHER" />
            </div>

            {/* Right: 2 insight cards + quote */}
            <div className="w-full lg:w-auto" style={{ flex: '0 0 auto', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {([
                { tag: 'KNOWLEDGE SHARING', accent: '#00f2ff', symbol: '▲', quote: '"We share what works. The profession grows when coaches teach coaches."', desc: 'Access to methodology, frameworks, and systems — shared openly within the Smarter Goalie network.' },
                { tag: 'ENTREPRENEUR SUPPORT', accent: '#34d399', symbol: '◆', quote: '"Build your practice on the same foundation the best use."', desc: 'Resources to grow your coaching business alongside your coaching knowledge and methodology.' },
              ] as { tag: string; accent: string; symbol: string; quote: string; desc: string }[]).map((card, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${card.accent}40`, borderLeft: `4px solid ${card.accent}`, borderRadius: '0 16px 16px 0', padding: '22px 24px', boxShadow: `0 0 30px ${card.accent}14, inset 0 0 20px ${card.accent}08` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `${card.accent}18`, border: `1.5px solid ${card.accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: card.accent }}>{card.symbol}</span>
                    </div>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: card.accent, letterSpacing: '2.5px', textTransform: 'uppercase', margin: 0 }}>{card.tag}</p>
                  </div>
                  <p style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', fontStyle: 'italic', color: 'rgba(220,235,248,0.92)', lineHeight: 1.55, marginBottom: '10px' }}>{card.quote}</p>
                  <p style={{ fontSize: '13px', color: 'rgba(148,195,228,0.65)', lineHeight: 1.65, margin: 0 }}>{card.desc}</p>
                </div>
              ))}
              <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(96,205,255,0.3)', borderRadius: '14px', boxShadow: '0 0 28px rgba(96,205,255,0.12), inset 0 0 22px rgba(96,205,255,0.06)' }}>
                <p style={{ fontSize: '14px', color: 'rgba(200,228,248,0.75)', margin: 0, lineHeight: 1.8, fontStyle: 'italic' }}>
                  &ldquo;We raise the standard of goaltending development at every level — together.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── H: What Smarter Goalie Gives the Goalie Coach ── */}
      <section style={{ ...sec, background: 'linear-gradient(135deg, #0d2648 0%, #0b2240 100%)' }}>
        <div style={{ position: 'absolute', top: '15%', left: '-5%', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(255,255,255,0.011) 60px, rgba(255,255,255,0.011) 61px)', pointerEvents: 'none' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <SectionLabel text="What You Receive" />
          <h2 className="pl-0 sm:pl-14" style={{ fontSize: 'clamp(24px, 3.6vw, 46px)', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 40px' }}>What Smarter Goalie gives the Goalie Coach:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5" style={{ gap: '14px', alignItems: 'stretch', width: '100%', maxWidth: '1400px', marginBottom: '40px' }}>
            {[
              { label: 'Complete 7 Pillar System', desc: 'Access to the deepest goaltending curriculum available' },
              { label: 'Charting Architecture', desc: 'Factor Ratios, Development Loop, cross-reference engine — all accessible' },
              { label: "Feel Factor & Mind's Eye Frameworks", desc: 'Trainable. Most programs do not train them at all.' },
              { label: 'A Peer Conversation with Coach Mike', desc: 'Not a student relationship. Coach Mike speaks to you as a peer.' },
              { label: 'Self-Coaching Tools', desc: 'Tools to help your goalies self-coach — the highest level of development' },
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
                  <div>
                    <p style={{ fontWeight: 800, color: BLUE2, fontSize: 'clamp(12px, 1.3vw, 14px)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>{item.label}</p>
                    <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: '#dde8f0', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
          <VoiceButton label="HEAR COACH MIKE: THE TOOLS AVAILABLE TO THE GOALIE COACH" />
        </div>
      </section>

      {/* ── I: Founding Member ── */}
      <section id="enquire" style={{ ...sec, background: 'linear-gradient(160deg, #092038 0%, #0e2848 100%)' }}>
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
            Coach Mike is personally selecting one hundred founding members. The goalie coaches who join this phase become part of building the standard for the profession.
          </p>
          <ApplicationSteps
            steps={[
              { num: '01', text: 'Complete the goalie coach questionnaire — 5 minutes', href: '/auth/register', action: 'Start' },
              { num: '02', text: 'Coach Mike personally reviews your application' },
              // /contact lists Goalie Coach in its role dropdown.
              { num: '03', text: 'Coach Mike calls you personally — peer to peer', href: '/contact', action: 'Set up the call' },
            ]}
          />
          <button
            onClick={() => router.push('/auth/register')}
            style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE3} 100%)`, color: '#fff', border: 'none', padding: 'clamp(16px,2vw,22px) clamp(32px,4vw,56px)', borderRadius: '12px', fontSize: 'clamp(13px,1.5vw,16px)', fontWeight: 900, letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 8px 32px rgba(14,165,233,0.35)', transition: 'all 0.2s', display: 'inline-block', marginBottom: '36px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 44px rgba(14,165,233,0.55)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(14,165,233,0.35)'; }}
          >
            ENQUIRE →
          </button>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <VoiceButton label="HEAR COACH MIKE: THE FOUNDING MEMBER OPPORTUNITY FOR GOALIE COACHES" />
          </div>
        </div>
      </section>

      <SevenPillarsCTA from="goalie-coach" eyebrow="For The Goalie Coach" />

      <Footer7 />
    </div>
  );
}
