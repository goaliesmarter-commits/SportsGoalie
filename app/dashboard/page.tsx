'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy, BookOpen, Target, Flame, Brain, Footprints, Shapes,
  Grid3X3, Dumbbell, Heart, ArrowRight, TrendingUp, Play,
  ChevronRight, Zap, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SkeletonDashboard } from '@/components/ui/skeletons';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { useProgress } from '@/hooks/useProgress';
import { useEnrollment } from '@/hooks/useEnrollment';
import { useRecentQuizzes } from '@/hooks/useRecentQuizzes';
import { CustomCurriculumDashboard } from '@/components/dashboard/CustomCurriculumDashboard';
import { PILLARS } from '@/types';
import { getPillarSlugFromDocId, getPillarByDocId } from '@/lib/utils/pillars';
import { scaleToPercentage } from '@/lib/scoring/scale-score';
import { useGrowthPoints } from '@/hooks/useGrowthPoints';

const BLUE = '#37b5ff';
const BLUE2 = '#60a5fa';

const PILLAR_ICONS: Record<string, LucideIcon> = {
  Brain, Footprints, Shapes, Target, Grid3X3, Dumbbell, Heart,
};
const PILLAR_COLORS: Record<string, string> = {
  Brain: '#a78bfa', Footprints: '#37b5ff', Shapes: '#4ade80',
  Target: '#fb923c', Grid3X3: '#f87171', Dumbbell: '#fbbf24', Heart: '#2dd4bf',
};
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function DashboardPage() {
  return <ProtectedRoute><DashboardContent /></ProtectedRoute>;
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => {
    if (user?.role === 'student' && !user?.onboardingCompleted) router.push('/onboarding');
  }, [user, router]);
  if (user?.role === 'student' && !user?.onboardingCompleted) return <SkeletonDashboard />;
  if (user?.role === 'student' && user?.workflowType === 'custom') return <CustomCurriculumDashboard user={user} />;
  return <StandardDashboard />;
}

type BaselineIntelligenceProfile = {
  overallScore: number;
  pacingLevel: string;
  identifiedStrengths: Array<{ categoryName: string; score: number }>;
  identifiedGaps: Array<{ categoryName: string; score: number; priority?: string }>;
};

function StandardDashboard() {
  const { user } = useAuth();
  const { userProgress, loading } = useProgress();
  const { enrolledSports, loading: enrollmentsLoading, error: enrollmentsError } = useEnrollment();
  const { quizzes: recentQuizzes, loading: quizzesLoading } = useRecentQuizzes(14);
  const { currentPoints } = useGrowthPoints();
  const [baselineProfile, setBaselineProfile] = useState<BaselineIntelligenceProfile | null>(null);

  useEffect(() => {
    if (!user?.id || !user?.onboardingCompleted) return;
    getDoc(doc(db, 'studentBaselineProfiles', user.id))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.intelligenceProfile) setBaselineProfile(data.intelligenceProfile as BaselineIntelligenceProfile);
        }
      })
      .catch(() => {});
  }, [user?.id, user?.onboardingCompleted]);

  if (loading || enrollmentsLoading) return <SkeletonDashboard />;

  const stats = userProgress?.overallStats;
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Goalie';
  const totalSkills = enrolledSports.reduce((sum, e) => sum + e.progress.totalSkills, 0);
  const completedSkills = enrolledSports.reduce((sum, e) => sum + e.progress.completedSkills.length, 0);
  const overallPct = totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const activePillar = enrolledSports.find((e) => e.progress.status === 'in_progress') || enrolledSports[0];

  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (6 - i)); return d; });
  const activeDayStrings = new Set(recentQuizzes.map((q) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (q as any).completedAt;
      return (raw?.toDate ? raw.toDate() : new Date(raw)).toDateString();
    } catch { return ''; }
  }));

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-15px) scale(1.04)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-15px,20px) scale(0.96)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes pulse-ring { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.03)} }
        @keyframes fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin-slow { from{transform:rotate(-90deg)} to{transform:rotate(270deg)} }
        .s1{animation:fade-up .45s .05s both}
        .s2{animation:fade-up .45s .12s both}
        .s3{animation:fade-up .45s .20s both}
        .s4{animation:fade-up .45s .28s both}
        .s5{animation:fade-up .45s .36s both}
        .stat-lift{transition:transform .2s,box-shadow .2s,border-color .2s}
        .stat-lift:hover{transform:translateY(-5px)}
        .pillar-row{transition:background .15s,padding-left .15s}
        .pillar-row:hover{background:rgba(255,255,255,0.04)!important;padding-left:26px!important}
        .qa-btn{transition:transform .18s,box-shadow .18s,border-color .18s,background .18s}
        .qa-btn:hover{transform:translateY(-3px) scale(1.02)}
        .dash-grid{display:grid;grid-template-columns:1fr;gap:24px}
        @media(min-width:1024px){.dash-grid{grid-template-columns:1.6fr 1fr}}
        .hero-ring{display:none}
        @media(min-width:520px){.hero-ring{display:block}}
        .continue-hover{transition:border-color .2s,box-shadow .2s}
        .continue-hover:hover{box-shadow:0 12px 40px rgba(0,0,0,.35)!important}
        .vault-hover{transition:border-color .2s,transform .2s}
        .vault-hover:hover{border-color:rgba(167,139,250,.45)!important;transform:translateY(-2px)}
        .shimmer-bar{background:linear-gradient(90deg,var(--c) 0%,var(--c2) 45%,var(--c) 100%);background-size:400px 100%;animation:shimmer 2.5s infinite linear}
      `}</style>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', backgroundImage: "url('/goalie-dashboard.png')", backgroundSize: 'cover', backgroundPosition: 'center top', minHeight: '420px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        {/* overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(130deg,rgba(0,10,31,.95) 0%,rgba(4,21,48,.85) 50%,rgba(0,10,31,.78) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top,#000a1f,transparent)' }} />

        {/* animated glow blobs */}
        <div style={{ position: 'absolute', top: '5%', right: '12%', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(55,181,255,.1) 0%,transparent 70%)', animation: 'blob 7s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', right: '30%', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(167,139,250,.07) 0%,transparent 70%)', animation: 'blob2 9s ease-in-out infinite', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1280px', margin: '0 auto', padding: 'clamp(0px,2vw,0px) clamp(14px,4vw,28px) clamp(24px,5vw,44px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>

          {/* Left text block */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            {stats?.currentStreak != null && stats.currentStreak > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.35)',
                borderRadius: '30px', padding: '4px 12px', marginBottom: '10px',
                color: '#fb923c',
              }}>
                <Flame size={13} color="#fb923c" />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{stats.currentStreak} day streak</span>
              </div>
            )}
            <div className="s1" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(55,181,255,.12)', border: '1px solid rgba(55,181,255,.28)', borderRadius: '30px', padding: '5px 14px', marginBottom: '18px' }}>
              <Sparkles size={12} color={BLUE} />
              <span style={{ fontSize: '12px', color: BLUE, fontWeight: 700, letterSpacing: '.5px' }}>{greeting}</span>
            </div>

            <h1 className="s2" style={{ fontSize: 'clamp(44px,8vw,84px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-.04em', marginBottom: '14px' }}>
              <span style={{ display: 'block', fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.02em', marginBottom: '4px' }}>Welcome back,</span>
              <span style={{ background: `linear-gradient(135deg, #fff 30%, ${BLUE} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {firstName}
              </span>
            </h1>

            <p className="s3" style={{ fontSize: '15px', color: 'rgba(255,255,255,.45)', marginBottom: '28px', maxWidth: '380px', lineHeight: 1.6 }}>
              {stats?.quizzesCompleted
                ? `You're ${overallPct}% through your course. ${overallPct >= 80 ? 'Almost there — finish strong!' : overallPct >= 40 ? 'Keep the momentum going!' : 'Great start — keep building!'}`
                : 'Start your goalie training journey by exploring the pillars below.'}
            </p>

            <div className="s4" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {activePillar && (
                <Link href={`/pillars/${activePillar.sport.id}`}>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', background: BLUE, border: 'none', borderRadius: '12px', padding: '14px 26px', color: '#000a1f', fontSize: '14px', fontWeight: 900, letterSpacing: '.3px', cursor: 'pointer', boxShadow: `0 6px 24px ${BLUE}55`, transition: 'transform .15s,box-shadow .15s' }}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = 'translateY(-2px)'; b.style.boxShadow = `0 10px 30px ${BLUE}66`; }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = ''; b.style.boxShadow = `0 6px 24px ${BLUE}55`; }}
                  >
                    <Play size={15} fill="#000a1f" /> Continue Learning
                  </button>
                </Link>
              )}
              <Link href="/progress">
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: '12px', padding: '14px 26px', color: 'rgba(255,255,255,.7)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'background .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.13)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.08)'; }}
                >
                  <TrendingUp size={15} /> Analytics
                </button>
              </Link>
            </div>
          </div>

          {/* Progress ring (right side) */}
          <div className="s4 hero-ring" style={{ flexShrink: 0 }}>
            <HeroRing pct={overallPct} completed={completedSkills} total={totalSkills} />
          </div>
        </div>
      </section>

      {/* ── STATS + ACTIVITY STRIP ── */}
      <div className="s5" style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(16px,3vw,24px) clamp(14px,4vw,28px) 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '14px' }}>
          <StatCard label="Knowledge Checks" value={stats?.quizzesCompleted ?? 0} icon={<Trophy size={16} />} color={BLUE} delay="0s" />
          <StatCard label="Skills Done" value={stats?.skillsCompleted ?? 0} icon={<BookOpen size={16} />} color="#a78bfa" delay=".05s" />
          <StatCard label="Avg Grasp Level" value={stats?.averageQuizScore ? `${Math.round(stats.averageQuizScore)}%` : '--'} icon={<Target size={16} />} color="#4ade80" delay=".10s" />
          <StatCard label="Streak" value={stats?.currentStreak ? `${stats.currentStreak}d` : '0d'} icon={<Flame size={16} />} color="#fb923c" delay=".15s" />
          <StatCard label="Growth Points" value={currentPoints} icon={<Zap size={16} />} color="#fbbf24" delay=".20s" />
          <ActivityDots days={last7} active={activeDayStrings} today={today.toDateString()} />
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(16px,3vw,24px) clamp(14px,4vw,28px) 64px' }}>
        <div className="dash-grid">

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Your Pillars */}
            <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(55,181,255,.09)' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>Your Pillars</h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)' }}>
                    {enrolledSports.length} active {enrolledSports.length === 1 ? 'course' : 'courses'}
                  </p>
                </div>
                <Link href="/pillars" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: BLUE, fontWeight: 700, textDecoration: 'none', background: 'rgba(55,181,255,.09)', border: '1px solid rgba(55,181,255,.2)', borderRadius: '10px', padding: '7px 13px', transition: 'background .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(55,181,255,.16)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(55,181,255,.09)'; }}
                >
                  View all <ArrowRight size={13} />
                </Link>
              </div>

              {enrollmentsError ? (
                <p style={{ color: '#f87171', fontSize: '14px', textAlign: 'center', padding: '36px' }}>{enrollmentsError}</p>
              ) : enrolledSports.length === 0 ? (
                <EmptyPillars />
              ) : (
                <div>
                  {enrolledSports.map(({ sport, progress }, idx) => {
                    const slug = getPillarSlugFromDocId(sport.id);
                    const info = slug ? PILLARS.find(p => p.slug === slug) : null;
                    const IconComp = PILLAR_ICONS[info?.icon || 'Target'] || Target;
                    const iconKey = info?.icon || 'Target';
                    const accent = PILLAR_COLORS[iconKey] || BLUE;
                    const pct = Math.round(progress.progressPercentage);
                    const scoreColor = pct >= 80 ? '#4ade80' : pct > 0 ? accent : 'rgba(255,255,255,.25)';

                    return (
                      <Link key={sport.id} href={`/pillars/${sport.id}`} className="pillar-row"
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', paddingLeft: '20px', borderBottom: idx < enrolledSports.length - 1 ? '1px solid rgba(55,181,255,.07)' : 'none', textDecoration: 'none', borderLeft: `4px solid ${accent}` }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: `${accent}1a`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 16px ${accent}22` }}>
                          <IconComp size={20} color={accent} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {info?.shortName || sport.name}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                              <div className="shimmer-bar" style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, '--c': accent, '--c2': `${accent}99` } as React.CSSProperties} />
                            </div>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', flexShrink: 0 }}>
                              {progress.completedSkills.length}/{progress.totalSkills}
                            </span>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <span style={{ fontSize: '20px', fontWeight: 900, color: scoreColor, display: 'block' }}>{pct}%</span>
                          {pct >= 100 && <span style={{ fontSize: '9px', color: '#4ade80', fontWeight: 800, letterSpacing: '.5px' }}>DONE ✓</span>}
                        </div>
                        <ChevronRight size={15} color="rgba(255,255,255,.2)" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Continue Learning */}
            {activePillar && <ContinueLearningCard pillar={activePillar} />}

            {/* MY MIND-VAULT — Coming Soon */}
            <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(2,18,44,0.95) 55%, rgba(109,40,217,0.08) 100%)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(167,139,250,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Brain size={18} color="#a78bfa" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>MY MIND-VAULT</h2>
                    <p style={{ fontSize: '12px', color: 'rgba(167,139,250,0.6)', margin: 0 }}>Your personal performance foundation</p>
                  </div>
                </div>
                <div style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.32)', borderRadius: '20px', padding: '5px 14px', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#a78bfa', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Coming Soon</span>
                </div>
              </div>
              <div style={{ padding: '36px 24px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 28px rgba(167,139,250,0.18)' }}>
                  <Brain size={28} color="#a78bfa" />
                </div>
                <h3 style={{ fontSize: '19px', fontWeight: 900, color: '#fff', marginBottom: '10px' }}>Building Your Personal Vault</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, maxWidth: '340px', margin: '0 auto 24px' }}>
                  Your MIND-VAULT is where only the most valuable foundational thoughts and behaviors are stored — for game performance and for life.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['Mental Filters', 'Acceptance List', 'Focus Protocol'].map((item) => (
                    <div key={item} style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '20px', padding: '6px 14px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(167,139,250,0.7)', fontWeight: 600 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Performance */}
            <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(55,181,255,.09)' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>Performance</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>Recent Knowledge Check results</p>
                </div>
                <Link href="/quizzes" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: BLUE, fontWeight: 700, textDecoration: 'none' }}>
                  All <ArrowRight size={11} />
                </Link>
              </div>

              {quizzesLoading ? (
                <div style={{ padding: '12px' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,.02)', marginBottom: '6px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,.05)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,.05)', marginBottom: '8px', width: '65%' }} />
                        <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,.05)' }} />
                      </div>
                      <div style={{ width: '40px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,.05)' }} />
                    </div>
                  ))}
                </div>
              ) : recentQuizzes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                  <Trophy size={28} color="rgba(255,255,255,.1)" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.28)' }}>No results yet</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.16)', marginTop: '4px' }}>Complete a Knowledge Check to see your Grasp Levels here</p>
                </div>
              ) : (
                <div style={{ padding: '10px' }}>
                  {recentQuizzes.slice(0, 5).map((quiz) => {
                    const pillarInfo = getPillarByDocId(quiz.sportId);
                    const pct = Math.round(quiz.percentage);
                    const scoreColor = pct >= 80 ? '#4ade80' : pct >= 60 ? BLUE2 : '#f87171';
                    const iconKey = pillarInfo?.icon || 'Target';
                    const pillarColor = PILLAR_COLORS[iconKey] || BLUE;
                    const IconComp = PILLAR_ICONS[iconKey] || Target;
                    return (
                      <QuizRow key={quiz.id} pct={pct} scoreColor={scoreColor} pillarColor={pillarColor} name={pillarInfo?.shortName || 'Quiz'} IconComp={IconComp} />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '20px', padding: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <QuickActionCard href="/pillars" icon={<BookOpen size={22} />} label="Pillars" sub="Browse content" color={BLUE} />
                <QuickActionCard href="/quizzes" icon={<Trophy size={22} />} label="Knowledge Checks" sub="Test yourself" color="#4ade80" />
                <QuickActionCard href="/progress" icon={<TrendingUp size={22} />} label="Progress" sub="View analytics" color="#a78bfa" />
                <QuickActionCard href="/charting" icon={<Target size={22} />} label="Charting" sub="Track sessions" color="#fb923c" />
              </div>
            </div>

            {/* Baseline Profile */}
            {baselineProfile && <GoalieProfileCard profile={baselineProfile} />}

            {/* Mind Vault */}
            <Link href="/mind-vault" style={{ textDecoration: 'none' }}>
              <div className="vault-hover" style={{ background: 'linear-gradient(135deg,rgba(167,139,250,.14) 0%,rgba(2,18,44,.92) 55%,rgba(109,40,217,.1) 100%)', border: '1px solid rgba(167,139,250,.22)', borderRadius: '20px', padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(167,139,250,.15)', border: '1px solid rgba(167,139,250,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 20px rgba(167,139,250,.2)' }}>
                  <Brain size={24} color="#a78bfa" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>Mind Vault</p>
                  <p style={{ fontSize: '13px', color: 'rgba(167,139,250,.6)', lineHeight: 1.4 }}>Mental performance &amp; focus tools</p>
                </div>
                <div style={{ background: 'rgba(167,139,250,.15)', border: '1px solid rgba(167,139,250,.25)', borderRadius: '8px', padding: '6px' }}>
                  <Zap size={16} color="#a78bfa" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ──────────────────── Sub-components ──────────────────── */

function HeroRing({ pct, completed, total }: { pct: number; completed: number; total: number }) {
  const size = 148;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* outer glow ring */}
      <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', background: `radial-gradient(circle,${BLUE}20 0%,transparent 70%)`, animation: 'pulse-ring 3s ease-in-out infinite' }} />
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BLUE} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${BLUE}88)`, transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
        <span style={{ fontSize: '34px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', fontWeight: 600, letterSpacing: '.3px' }}>Progress</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', marginTop: '2px' }}>{completed}/{total} skills</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, delay }: { label: string; value: string | number; icon: React.ReactNode; color: string; delay: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="stat-lift"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', background: 'rgba(2,18,44,.85)', border: `1px solid ${hovered ? color + '44' : 'rgba(55,181,255,.14)'}`, borderRadius: '16px', padding: '18px', overflow: 'hidden',
        boxShadow: hovered ? `0 8px 28px ${color}22` : 'none',
        animation: `fade-up .45s ${delay} both`,
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${color}99,transparent)` }} />
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${color}1a`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color, boxShadow: hovered ? `0 0 14px ${color}44` : 'none', transition: 'box-shadow .2s' }}>
        {icon}
      </div>
      <p style={{ fontSize: '30px', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>{value}</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.38)', fontWeight: 600 }}>{label}</p>
    </div>
  );
}

function ActivityDots({ days, active, today }: { days: Date[]; active: Set<string>; today: string }) {
  return (
    <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fade-up .45s .2s both' }}>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.38)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px' }}>This Week</p>
      <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
        {days.map((d, i) => {
          const isToday = d.toDateString() === today;
          const done = active.has(d.toDateString());
          const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '100%', aspectRatio: '1', borderRadius: '7px', background: done ? BLUE : isToday ? 'rgba(55,181,255,.14)' : 'rgba(255,255,255,.05)', border: isToday ? `1.5px solid rgba(55,181,255,.45)` : '1px solid transparent', boxShadow: done ? `0 0 10px ${BLUE}66` : 'none', transition: 'all .2s' }} />
              <span style={{ fontSize: '9px', color: isToday ? BLUE : 'rgba(255,255,255,.22)', fontWeight: isToday ? 800 : 400 }}>{WEEK_LABELS[dayIdx]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContinueLearningCard({ pillar }: { pillar: { sport: { id: string; name: string }; progress: { completedSkills: string[]; totalSkills: number; progressPercentage: number } } }) {
  const slug = getPillarSlugFromDocId(pillar.sport.id);
  const info = slug ? PILLARS.find(p => p.slug === slug) : null;
  const Icon = PILLAR_ICONS[info?.icon || 'Target'] || Target;
  const iconKey = info?.icon || 'Target';
  const color = PILLAR_COLORS[iconKey] || BLUE;
  const pct = Math.round(pillar.progress.progressPercentage);

  return (
    <Link href={`/pillars/${pillar.sport.id}`} style={{ textDecoration: 'none' }}>
      <div className="continue-hover" style={{ background: `linear-gradient(135deg,rgba(2,18,44,.95) 0%,${color}18 60%,${color}0a 100%)`, border: `1px solid ${color}30`, borderRadius: '20px', padding: '24px', cursor: 'pointer', boxShadow: `0 4px 24px rgba(0,0,0,.3)` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
          <div style={{ width: '58px', height: '58px', borderRadius: '18px', background: `${color}1c`, border: `1px solid ${color}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 24px ${color}33` }}>
            <Icon size={26} color={color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color, background: `${color}18`, border: `1px solid ${color}28`, borderRadius: '20px', padding: '3px 10px', letterSpacing: '.5px', textTransform: 'uppercase', animation: 'pulse-ring 2.5s ease-in-out infinite' }}>
                <Play size={9} fill={color} /> In Progress
              </span>
              <span style={{ fontSize: '22px', fontWeight: 900, color }}>{pct}%</span>
            </div>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
              {info?.name || pillar.sport.name}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.38)', marginBottom: '14px' }}>
              {pillar.progress.completedSkills.length} of {pillar.progress.totalSkills} skills completed
            </p>
            <div style={{ height: '8px', background: 'rgba(255,255,255,.08)', borderRadius: '99px', overflow: 'hidden' }}>
              <div className="shimmer-bar" style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, '--c': color, '--c2': `${color}88`, boxShadow: `0 0 10px ${color}55` } as React.CSSProperties} />
            </div>
          </div>
          <ArrowRight size={18} color="rgba(255,255,255,.2)" style={{ flexShrink: 0, marginTop: '4px' }} />
        </div>
      </div>
    </Link>
  );
}

function QuizRow({ pct, scoreColor, pillarColor, name, IconComp }: { pct: number; scoreColor: string; pillarColor: string; name: string; IconComp: LucideIcon }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', marginBottom: '4px', background: hovered ? 'rgba(255,255,255,.04)' : 'transparent', transition: 'background .15s' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: `${pillarColor}18`, border: `1px solid ${pillarColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IconComp size={16} color={pillarColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>{name}</p>
        <div style={{ height: '5px', background: 'rgba(255,255,255,.07)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: scoreColor, borderRadius: '99px', width: `${pct}%`, boxShadow: `0 0 6px ${scoreColor}88`, transition: 'width .5s' }} />
        </div>
      </div>
      <span style={{ fontSize: '15px', fontWeight: 900, color: scoreColor, minWidth: '42px', textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function QuickActionCard({ href, icon, label, sub, color }: { href: string; icon: React.ReactNode; label: string; sub: string; color: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="qa-btn" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{ padding: '18px 14px', borderRadius: '14px', background: hovered ? `${color}18` : `${color}0c`, border: `1px solid ${hovered ? color + '40' : color + '20'}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', boxShadow: hovered ? `0 6px 20px ${color}22` : 'none' }}>
        <div style={{ color }}>{icon}</div>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>{label}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)' }}>{sub}</p>
        </div>
      </div>
    </Link>
  );
}

function GoalieProfileCard({ profile }: { profile: BaselineIntelligenceProfile }) {
  const GREEN = '#4ade80';
  const YELLOW = '#fbbf24';

  const PACING_META: Record<string, { color: string; label: string }> = {
    introduction: { color: YELLOW, label: 'Introduction' },
    development: { color: BLUE, label: 'Development' },
    refinement: { color: GREEN, label: 'Refinement' },
  };

  const pm = PACING_META[profile.pacingLevel] || PACING_META.introduction;
  const barPct = scaleToPercentage(profile.overallScore, 4, 1) ?? 0;
  const topStrength = profile.identifiedStrengths?.[0];
  const topGap = profile.identifiedGaps?.[0];

  return (
    <div style={{ position: 'relative', background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '20px', padding: '20px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${pm.color}88,transparent)` }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: `${pm.color}1a`, border: `1px solid ${pm.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={15} color={pm.color} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: 0 }}>Your Goalie Profile</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', margin: 0 }}>Baseline Assessment</p>
          </div>
        </div>
        <span style={{ background: `${pm.color}18`, border: `1px solid ${pm.color}30`, color: pm.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
          {pm.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '10px' }}>
        <span style={{ fontSize: '38px', fontWeight: 900, color: pm.color, lineHeight: 1 }}>{profile.overallScore.toFixed(1)}</span>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>/4.0</span>
      </div>

      <div style={{ height: '6px', background: 'rgba(255,255,255,.07)', borderRadius: '99px', overflow: 'hidden', marginBottom: '5px' }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: pm.color, borderRadius: '99px', boxShadow: `0 0 8px ${pm.color}55`, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,.2)', fontWeight: 600, marginBottom: '12px' }}>
        <span>Intro</span><span>Development</span><span>Refinement</span>
      </div>

      {(topStrength || topGap) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          {topStrength && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.45)' }}>
                Strength: <strong style={{ color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>{topStrength.categoryName}</strong>
              </span>
            </div>
          )}
          {topGap && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: YELLOW, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.45)' }}>
                Focus area: <strong style={{ color: 'rgba(255,255,255,.75)', fontWeight: 600 }}>{topGap.categoryName}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyPillars() {
  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(55,181,255,.09)', border: '1px solid rgba(55,181,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 0 24px ${BLUE}22` }}>
        <BookOpen size={26} color={BLUE} />
      </div>
      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>No courses yet</h3>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.35)', marginBottom: '24px', maxWidth: '260px', margin: '0 auto 24px', lineHeight: 1.5 }}>
        Start your journey by exploring the fundamental goalie pillars.
      </p>
      <Link href="/pillars">
        <button style={{ background: BLUE, border: 'none', borderRadius: '10px', padding: '12px 24px', color: '#000a1f', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 16px ${BLUE}44` }}>
          Explore Pillars
        </button>
      </Link>
    </div>
  );
}
