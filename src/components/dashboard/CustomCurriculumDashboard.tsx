'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, PlayCircle, Lock, CheckCircle2, Trophy, Target,
  ArrowRight, Loader2, ChevronRight, MessageSquare, TrendingUp,
  Brain, Footprints, Shapes, Grid3X3, Dumbbell, Heart,
  Play, Sparkles, Zap, User as UserIcon, Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { userService, sportsService, videoQuizService, customContentService } from '@/lib/database';
import { customCurriculumService } from '@/lib/database';
import { onboardingService } from '@/lib/database';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useProgress } from '@/hooks/useProgress';
import { User, Sport, SportProgress, CustomCurriculum, CustomCurriculumItem, IntelligenceProfile, getPacingLevelDisplayText, PILLARS } from '@/types';
import { enrollmentService } from '@/lib/database/services/enrollment.service';
import { getPillarSlugFromDocId } from '@/lib/utils/pillars';
import { toast } from 'sonner';

const BLUE = '#37b5ff';
const BLUE2 = '#60a5fa';

const PILLAR_ICONS: Record<string, LucideIcon> = {
  Brain, Footprints, Shapes, Target, Grid3X3, Dumbbell, Heart,
};
const PILLAR_COLORS: Record<string, string> = {
  Brain: '#a78bfa', Footprints: '#37b5ff', Shapes: '#4ade80',
  Target: '#fb923c', Grid3X3: '#f87171', Dumbbell: '#fbbf24', Heart: '#2dd4bf',
};

interface CustomCurriculumDashboardProps {
  user: User;
}

interface ContentInfo {
  title: string;
  description?: string;
  sportName?: string;
  sportIcon?: string;
  sportColor?: string;
  contentType?: 'lesson' | 'quiz';
}

export function CustomCurriculumDashboard({ user }: CustomCurriculumDashboardProps) {
  const [curriculum, setCurriculum] = useState<CustomCurriculum | null>(null);
  const [coach, setCoach] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentInfo, setContentInfo] = useState<Record<string, ContentInfo>>({});
  const [profile, setProfile] = useState<IntelligenceProfile | null>(null);
  const [enrolledSports, setEnrolledSports] = useState<Array<{ sport: Sport; progress: SportProgress }>>([]);
  const { userProgress } = useProgress();

  useEffect(() => { loadData(); }, [user.id]);

  const loadContentDetails = async (items: CustomCurriculumItem[]) => {
    const sportCache = new Map<string, { name?: string; icon?: string; color?: string }>();
    const getSportCached = async (sportId: string) => {
      if (sportCache.has(sportId)) return sportCache.get(sportId)!;
      const result = await sportsService.getSport(sportId);
      const data = result.success && result.data
        ? { name: result.data.name, icon: result.data.icon, color: result.data.color }
        : {};
      sportCache.set(sportId, data);
      return data;
    };
    const infoEntries = await Promise.all(
      items.map(async (item): Promise<[string, ContentInfo] | null> => {
        if (item.contentId) {
          try {
            if (item.type === 'lesson') {
              const r = await sportsService.getSkill(item.contentId);
              if (r.success && r.data) {
                const sport = await getSportCached(r.data.sportId);
                return [item.contentId, { title: r.data.name, description: r.data.description, sportName: sport.name, sportIcon: sport.icon, sportColor: sport.color }];
              }
            } else if (item.type === 'quiz') {
              const r = await videoQuizService.getVideoQuiz(item.contentId);
              if (r.success && r.data) {
                const sport = await getSportCached(r.data.sportId);
                return [item.contentId, { title: r.data.title, description: r.data.description, sportName: sport.name, sportIcon: sport.icon, sportColor: sport.color }];
              }
            } else if (item.type === 'custom_lesson' || item.type === 'custom_quiz') {
              const r = await customContentService.getContent(item.contentId);
              if (r.success && r.data) {
                return [item.contentId, { title: r.data.title, description: r.data.description, sportName: 'Custom Content', sportColor: '#8b5cf6', contentType: r.data.type }];
              }
            }
          } catch { /* skip */ }
        } else if (item.customContent) {
          return [item.id, { title: item.customContent.title, description: item.customContent.description }];
        }
        return null;
      })
    );
    const info: Record<string, ContentInfo> = {};
    for (const entry of infoEntries) { if (entry) info[entry[0]] = entry[1]; }
    setContentInfo(info);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [curriculumResult, baselineSnap, evalResult, coachResult] = await Promise.all([
        customCurriculumService.getStudentCurriculum(user.id),
        getDoc(doc(db, 'studentBaselineProfiles', user.id)).catch(() => null),
        onboardingService.getEvaluation(user.id).catch(() => null),
        user.assignedCoachId ? userService.getUser(user.assignedCoachId).catch(() => null) : Promise.resolve(null),
      ]);
      const baselineProfile = baselineSnap?.exists() ? baselineSnap.data()?.intelligenceProfile : null;
      if (baselineProfile) {
        setProfile(baselineProfile as IntelligenceProfile);
      } else if (evalResult?.success && evalResult.data?.intelligenceProfile) {
        setProfile(evalResult.data.intelligenceProfile);
      }
      if (coachResult?.success && coachResult.data) setCoach(coachResult.data);
      if (curriculumResult.success && curriculumResult.data) setCurriculum(curriculumResult.data);
    } catch {
      toast.error('Failed to load your curriculum');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (curriculum?.items.length) loadContentDetails(curriculum.items); }, [curriculum]);

  useEffect(() => {
    if (!loading && user.id) {
      enrollmentService.getUserEnrolledSports(user.id).then((r) => {
        if (r.success && r.data) setEnrolledSports(r.data);
      }).catch(() => { /* non-blocking */ });
    }
  }, [loading, user.id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #000a1f 0%, #041530 40%, #071e42 100%)' }}>
        <Loader2 size={28} color={BLUE} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const totalItems = curriculum?.items.length || 0;
  const completedItems = curriculum?.items.filter(i => i.status === 'completed').length || 0;
  const unlockedItems = curriculum?.items.filter(i => i.status === 'unlocked').length || 0;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const orderedItems = curriculum ? [...curriculum.items].sort((a, b) => a.order - b.order) : [];
  const nextItem = orderedItems.find(item => item.status === 'unlocked');

  const getContentLink = (item: CustomCurriculumItem) => {
    if (item.status === 'locked') return null;
    const itemInfo = item.contentId ? contentInfo[item.contentId] : undefined;
    const derivedCustomType = itemInfo?.contentType;
    if (item.type === 'lesson' && item.contentId) return `/pillars/${item.pillarId}/skills/${item.contentId}`;
    if (item.type === 'quiz' && item.contentId) return `/quiz/video/${item.contentId}`;
    if (item.type === 'custom_lesson' && item.contentId) return derivedCustomType === 'quiz' ? `/quiz/video/${item.contentId}` : `/learn/lesson/${item.contentId}`;
    if (item.type === 'custom_quiz' && item.contentId) return derivedCustomType === 'lesson' ? `/learn/lesson/${item.contentId}` : `/quiz/video/${item.contentId}`;
    return null;
  };

  const firstName = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Goalie';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const nextLink = nextItem ? getContentLink(nextItem) : null;

  return (
    <div style={{ background: 'linear-gradient(160deg, #000a1f 0%, #041530 40%, #071e42 100%)', minHeight: '100vh' }}>
      <style>{`
        @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-15px) scale(1.04)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-15px,20px) scale(0.96)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes pulse-ring { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.03)} }
        @keyframes fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .s1{animation:fade-up .45s .05s both}
        .s2{animation:fade-up .45s .12s both}
        .s3{animation:fade-up .45s .20s both}
        .s4{animation:fade-up .45s .28s both}
        .s5{animation:fade-up .45s .36s both}
        .stat-lift{transition:transform .2s,box-shadow .2s,border-color .2s}
        .stat-lift:hover{transform:translateY(-5px)}
        .path-row{transition:background .15s,padding-left .15s}
        .path-row:hover{background:rgba(255,255,255,0.04)!important}
        .qa-btn{transition:transform .18s,box-shadow .18s,border-color .18s,background .18s}
        .qa-btn:hover{transform:translateY(-3px) scale(1.02)}
        .dash-grid{display:grid;grid-template-columns:1fr;gap:24px}
        @media(min-width:1024px){.dash-grid{grid-template-columns:1.6fr 1fr}}
        .continue-hover{transition:border-color .2s,box-shadow .2s}
        .continue-hover:hover{box-shadow:0 12px 40px rgba(0,0,0,.35)!important}
        .vault-hover{transition:border-color .2s,transform .2s}
        .vault-hover:hover{border-color:rgba(167,139,250,.45)!important;transform:translateY(-2px)}
        .shimmer-bar{background:linear-gradient(90deg,var(--c) 0%,var(--c2) 45%,var(--c) 100%);background-size:400px 100%;animation:shimmer 2.5s infinite linear}
        .hero-ring{display:none}
        @media(min-width:520px){.hero-ring{display:block}}
        .path-act{display:flex;align-items:center;gap:10px;flex-shrink:0}
        @media(max-width:540px){.path-row{flex-wrap:wrap!important;padding:12px 16px!important;gap:10px 12px!important}.path-act{flex-basis:100%;margin-left:46px}.path-row>svg{display:none}}
      `}</style>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', backgroundImage: "url('/goalie-dashboard.png')", backgroundSize: 'cover', backgroundPosition: 'center top', minHeight: '420px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(130deg,rgba(0,10,31,.95) 0%,rgba(4,21,48,.85) 50%,rgba(0,10,31,.78) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top,#000a1f,transparent)' }} />
        <div style={{ position: 'absolute', top: '5%', right: '12%', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(55,181,255,.1) 0%,transparent 70%)', animation: 'blob 7s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', right: '30%', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(167,139,250,.07) 0%,transparent 70%)', animation: 'blob2 9s ease-in-out infinite', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1280px', margin: '0 auto', padding: 'clamp(0px,2vw,0px) clamp(14px,4vw,28px) clamp(24px,5vw,44px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
          {/* Left text */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            {(userProgress?.overallStats?.currentStreak ?? 0) > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.35)',
                borderRadius: '30px', padding: '4px 12px', marginBottom: '10px',
                color: '#fb923c',
              }}>
                <Flame size={13} color="#fb923c" />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{userProgress!.overallStats.currentStreak} day streak</span>
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
              {totalItems > 0
                ? `You've completed ${completedItems} of ${totalItems} modules. ${progressPct >= 80 ? 'Almost there — finish strong!' : progressPct >= 40 ? 'Keep the momentum going!' : unlockedItems > 0 ? `${unlockedItems} module${unlockedItems > 1 ? 's' : ''} ready to learn.` : 'Great start — keep building!'}`
                : 'Your coach will assign learning materials soon. Check back or message your coach.'}
            </p>

            <div className="s4" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {nextLink && (
                <Link href={nextLink}>
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

          {/* Progress ring */}
          <div className="s4 hero-ring" style={{ flexShrink: 0 }}>
            <HeroRing pct={progressPct} completed={completedItems} total={totalItems} />
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div className="s5" style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(16px,3vw,24px) clamp(14px,4vw,28px) 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '14px' }}>
          <StatCard label="Modules Done" value={completedItems} icon={<CheckCircle2 size={16} />} color="#4ade80" delay="0s" />
          <StatCard label="Available" value={unlockedItems} icon={<PlayCircle size={16} />} color={BLUE} delay=".05s" />
          <StatCard label="Total Modules" value={totalItems} icon={<BookOpen size={16} />} color="#a78bfa" delay=".10s" />
          <StatCard label="Progress" value={`${progressPct}%`} icon={<Trophy size={16} />} color="#fb923c" delay=".15s" />
          <StatCard label="Growth Points" value={(user as { growthPoints?: number }).growthPoints ?? 0} icon={<Zap size={16} />} color="#fbbf24" delay=".20s" />
          {coach && <CoachStrip coach={coach} />}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(16px,3vw,24px) clamp(14px,4vw,28px) 64px' }}>
        <div className="dash-grid">

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Learning Path */}
            <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(55,181,255,.09)' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>Your Development Path</h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)' }}>
                    {totalItems} {totalItems === 1 ? 'module' : 'modules'} assigned by your coach
                  </p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#4ade80', fontWeight: 700, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.25)', borderRadius: '10px', padding: '6px 12px' }}>
                  {completedItems}/{totalItems} done
                </span>
              </div>

              {totalItems === 0 ? (
                <EmptyPath coach={coach} />
              ) : (
                <div>
                  {orderedItems.map((item, index) => {
                    const info = contentInfo[item.contentId || item.id];
                    const link = getContentLink(item);
                    const isLocked = item.status === 'locked';
                    const isDone = item.status === 'completed';
                    const isActive = item.status === 'unlocked' || item.status === 'in_progress';
                    const statusColor = isDone ? '#4ade80' : isActive ? BLUE : 'rgba(255,255,255,.2)';

                    return (
                      <div key={item.id} className="path-row"
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: index < orderedItems.length - 1 ? '1px solid rgba(55,181,255,.07)' : 'none', borderLeft: `4px solid ${statusColor}` }}>
                        {/* Step badge */}
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDone ? 'rgba(74,222,128,.15)' : isActive ? 'rgba(55,181,255,.12)' : 'rgba(255,255,255,.05)', border: `1px solid ${statusColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isDone
                            ? <CheckCircle2 size={16} color="#4ade80" />
                            : isLocked
                              ? <Lock size={14} color="rgba(255,255,255,.25)" />
                              : item.type === 'lesson' || item.type === 'custom_lesson'
                                ? <BookOpen size={14} color={BLUE} />
                                : <PlayCircle size={14} color={BLUE} />
                          }
                        </div>

                        {/* Content info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: isLocked ? 'rgba(255,255,255,.35)' : '#fff', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {info?.title || item.customContent?.title || `Module ${index + 1}`}
                          </p>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>
                            {info?.sportName || (item.type.includes('quiz') ? 'Knowledge Check' : 'Lesson')}
                          </p>
                        </div>

                        {/* Status + action */}
                        <div className="path-act">
                          <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}30`, borderRadius: '6px', padding: '3px 9px', letterSpacing: '.3px' }}>
                            {isDone ? 'DONE' : isActive ? 'READY' : 'LOCKED'}
                          </span>
                          {link && !isLocked && (
                            <Link href={link}>
                              <button style={{ background: 'rgba(55,181,255,.12)', border: '1px solid rgba(55,181,255,.25)', borderRadius: '8px', padding: '6px 14px', color: BLUE, fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'background .15s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(55,181,255,.2)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(55,181,255,.12)')}
                              >
                                {isDone ? 'Review' : item.type.includes('quiz') ? 'Knowledge Check' : 'Start'}
                              </button>
                            </Link>
                          )}
                        </div>
                        <ChevronRight size={15} color="rgba(255,255,255,.15)" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Next item "Continue" card */}
            {nextItem && nextLink && (
              <NextItemCard item={nextItem} link={nextLink} info={contentInfo[nextItem.contentId || nextItem.id]} />
            )}

            {/* Enrolled Pillars */}
            {enrolledSports.length > 0 && (
              <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(55,181,255,.09)' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>Your Pillars</h2>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)' }}>{enrolledSports.length} active {enrolledSports.length === 1 ? 'course' : 'courses'}</p>
                  </div>
                  <Link href="/pillars" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: BLUE, fontWeight: 700, textDecoration: 'none', background: 'rgba(55,181,255,.09)', border: '1px solid rgba(55,181,255,.2)', borderRadius: '10px', padding: '7px 13px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(55,181,255,.16)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(55,181,255,.09)'; }}
                  >
                    View all <ArrowRight size={13} />
                  </Link>
                </div>
                <div>
                  {enrolledSports.map(({ sport, progress }, idx) => {
                    const slug = getPillarSlugFromDocId(sport.id);
                    const pillarInfo = slug ? PILLARS.find(p => p.slug === slug) : null;
                    const IconComp = PILLAR_ICONS[pillarInfo?.icon || 'Target'] || Target;
                    const iconKey = pillarInfo?.icon || 'Target';
                    const accent = PILLAR_COLORS[iconKey] || BLUE;
                    const pct = Math.round(progress.progressPercentage);
                    return (
                      <Link key={sport.id} href={`/pillars/${sport.id}`} className="path-row"
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', borderBottom: idx < enrolledSports.length - 1 ? '1px solid rgba(55,181,255,.07)' : 'none', textDecoration: 'none', borderLeft: `4px solid ${accent}` }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: `${accent}1a`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <IconComp size={20} color={accent} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pillarInfo?.shortName || sport.name}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                              <div className="shimmer-bar" style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, '--c': accent, '--c2': `${accent}99` } as React.CSSProperties} />
                            </div>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', flexShrink: 0 }}>{progress.completedSkills.length}/{progress.totalSkills}</span>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <span style={{ fontSize: '20px', fontWeight: 900, color: pct >= 80 ? '#4ade80' : pct > 0 ? accent : 'rgba(255,255,255,.25)' }}>{pct}%</span>
                        </div>
                        <ChevronRight size={15} color="rgba(255,255,255,.2)" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Coach card */}
            {coach && (
              <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '20px', padding: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Your Coach</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #37b5ff, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px', fontWeight: 900, color: '#000a1f' }}>
                    {coach.displayName.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>{coach.displayName}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)' }}>Assigned coach</p>
                  </div>
                </div>
                <Link href="/messages" style={{ textDecoration: 'none' }}>
                  <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(55,181,255,.12)', border: '1px solid rgba(55,181,255,.28)', borderRadius: '10px', padding: '11px 0', color: BLUE, fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(55,181,255,.2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(55,181,255,.12)')}
                  >
                    <MessageSquare size={15} /> Message Coach
                  </button>
                </Link>
              </div>
            )}

            {/* Assessment Profile */}
            {profile && (
              <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(55,181,255,.09)' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>Assessment Profile</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>Intelligence evaluation results</p>
                </div>
                <div style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                      <span style={{ fontSize: '42px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{profile.overallScore.toFixed(1)}</span>
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,.35)', marginLeft: '4px' }}>/ 4.0</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: profile.pacingLevel === 'refinement' ? '#4ade80' : profile.pacingLevel === 'development' ? BLUE : '#f87171', background: profile.pacingLevel === 'refinement' ? 'rgba(74,222,128,.12)' : profile.pacingLevel === 'development' ? 'rgba(55,181,255,.12)' : 'rgba(248,113,113,.12)', border: `1px solid ${profile.pacingLevel === 'refinement' ? 'rgba(74,222,128,.3)' : profile.pacingLevel === 'development' ? 'rgba(55,181,255,.3)' : 'rgba(248,113,113,.3)'}`, borderRadius: '20px', padding: '4px 12px', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                      {getPacingLevelDisplayText(profile.pacingLevel)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {profile.categoryScores.slice(0, 4).map((cat) => {
                      const pct = ((cat.averageScore - 1) / 3) * 100;
                      const color = pct >= 66 ? '#4ade80' : pct >= 33 ? BLUE2 : '#f87171';
                      return (
                        <div key={cat.categorySlug}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', textTransform: 'capitalize' }}>{cat.categorySlug.replace('_', ' ')}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color }}>{cat.averageScore.toFixed(1)}</span>
                          </div>
                          <div style={{ height: '5px', background: 'rgba(255,255,255,.07)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: color, borderRadius: '99px', width: `${pct}%`, boxShadow: `0 0 6px ${color}66`, transition: 'width .5s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '20px', padding: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <QuickActionCard href="/pillars" icon={<BookOpen size={22} />} label="Pillars" sub="Browse content" color={BLUE} />
                <QuickActionCard href="/progress" icon={<TrendingUp size={22} />} label="Progress" sub="View analytics" color="#4ade80" />
                <QuickActionCard href="/achievements" icon={<Trophy size={22} />} label="Achievements" sub="Your trophies" color="#a78bfa" />
                {coach
                  ? <QuickActionCard href="/messages" icon={<MessageSquare size={22} />} label="Messages" sub="Chat with coach" color="#fb923c" />
                  : <QuickActionCard href="/charting" icon={<Target size={22} />} label="Charting" sub="Track sessions" color="#fb923c" />
                }
              </div>
            </div>

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

/* ── Sub-components ── */

function HeroRing({ pct, completed, total }: { pct: number; completed: number; total: number }) {
  const size = 148;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
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
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', marginTop: '2px' }}>{completed}/{total} modules</span>
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
      style={{ position: 'relative', background: 'rgba(2,18,44,.85)', border: `1px solid ${hovered ? color + '44' : 'rgba(55,181,255,.14)'}`, borderRadius: '16px', padding: '18px', overflow: 'hidden', boxShadow: hovered ? `0 8px 28px ${color}22` : 'none', animation: `fade-up .45s ${delay} both` }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${color}99,transparent)` }} />
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${color}1a`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color, boxShadow: hovered ? `0 0 14px ${color}44` : 'none', transition: 'box-shadow .2s' }}>
        {icon}
      </div>
      <p style={{ fontSize: '30px', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>{value}</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.38)', fontWeight: 600 }}>{label}</p>
    </div>
  );
}

function CoachStrip({ coach }: { coach: User }) {
  return (
    <div style={{ background: 'rgba(2,18,44,.85)', border: '1px solid rgba(55,181,255,.14)', borderRadius: '16px', padding: '18px', animation: 'fade-up .45s .2s both', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${BLUE}, #0ea5e9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px', fontWeight: 900, color: '#000a1f' }}>
        {coach.displayName.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '2px' }}>Coach</p>
        <p style={{ fontSize: '14px', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{coach.displayName}</p>
      </div>
    </div>
  );
}

function NextItemCard({ item, link, info }: { item: CustomCurriculumItem; link: string; info?: ContentInfo }) {
  const isQuiz = item.type === 'quiz' || item.type === 'custom_quiz';
  const color = isQuiz ? '#a78bfa' : BLUE;
  return (
    <Link href={link} style={{ textDecoration: 'none' }}>
      <div className="continue-hover" style={{ background: `linear-gradient(135deg,rgba(2,18,44,.95) 0%,${color}18 60%,${color}0a 100%)`, border: `1px solid ${color}30`, borderRadius: '20px', padding: '24px', cursor: 'pointer', boxShadow: `0 4px 24px rgba(0,0,0,.3)` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
          <div style={{ width: '58px', height: '58px', borderRadius: '18px', background: `${color}1c`, border: `1px solid ${color}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 24px ${color}33` }}>
            {isQuiz ? <PlayCircle size={26} color={color} /> : <BookOpen size={26} color={color} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color, background: `${color}18`, border: `1px solid ${color}28`, borderRadius: '20px', padding: '3px 10px', letterSpacing: '.5px', textTransform: 'uppercase', animation: 'pulse-ring 2.5s ease-in-out infinite' }}>
                <Play size={9} fill={color} /> Up Next
              </span>
            </div>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {info?.title || item.customContent?.title || 'Next Item'}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.38)' }}>
              {info?.description || (isQuiz ? 'Complete this quiz to advance' : 'Start this lesson to progress')}
            </p>
          </div>
          <ArrowRight size={18} color="rgba(255,255,255,.2)" style={{ flexShrink: 0, marginTop: '4px' }} />
        </div>
      </div>
    </Link>
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

function EmptyPath({ coach }: { coach: User | null }) {
  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(55,181,255,.09)', border: '1px solid rgba(55,181,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 0 24px ${BLUE}22` }}>
        <BookOpen size={26} color={BLUE} />
      </div>
      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>No Curriculum Assigned Yet</h3>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.35)', marginBottom: '24px', maxWidth: '260px', margin: '0 auto 24px', lineHeight: 1.5 }}>
        Your coach hasn't assigned any learning materials yet. Check back soon.
      </p>
      {coach && (
        <Link href="/messages">
          <button style={{ background: BLUE, border: 'none', borderRadius: '10px', padding: '12px 24px', color: '#000a1f', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 16px ${BLUE}44`, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <UserIcon size={16} /> Message Coach
          </button>
        </Link>
      )}
    </div>
  );
}
