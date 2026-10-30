'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, TrendingUp, Trophy, ClipboardCheck, UserPlus,
  ArrowRight, Sparkles, Eye, ChevronRight, Flame, Clock,
  CheckCircle2, AlertCircle, MessageSquare, Send,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { parentLinkService, voiceSubmissionService } from '@/lib/database';
import type { VoiceSubmission, VoiceCategory } from '@/lib/database';
import { LinkedChildSummary } from '@/types';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import { calendarDaysAgo } from '@/lib/utils/local-date';

const GREEN  = '#1D9E75';
const TEAL   = '#0ea5e9';
const BLUE   = '#37b5ff';
const PURPLE = '#a78bfa';

export default function ParentDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren]   = useState<LinkedChildSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<VoiceSubmission[]>([]);
  const [voiceCategory, setVoiceCategory] = useState<VoiceCategory>('COMPLIMENT');
  const [voiceSubject, setVoiceSubject]   = useState('');
  const [voiceBody, setVoiceBody]         = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [submitted, setSubmitted]         = useState(false);
  const [voiceError, setVoiceError]       = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
    if (!authLoading && user && user.role !== 'parent') router.push('/dashboard');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'parent') return;
    const loadData = async () => {
      try {
        setLoading(true);
        const [childrenResult, submissionsResult] = await Promise.allSettled([
          parentLinkService.getLinkedChildren(user.id),
          voiceSubmissionService.getParentSubmissions(user.id),
        ]);
        if (childrenResult.status === 'fulfilled' && childrenResult.value.success && childrenResult.value.data) {
          setChildren(childrenResult.value.data);
        } else {
          setError(childrenResult.status === 'fulfilled' ? (childrenResult.value.error?.message || 'Failed to load linked goalies') : 'Failed to load linked goalies');
        }
        if (submissionsResult.status === 'fulfilled') setSubmissions(submissionsResult.value);
      } catch { setError('Failed to load data'); }
      finally { setLoading(false); }
    };
    loadData();
  }, [user]);

  if (authLoading || loading) return <SkeletonDarkPage />;
  if (!user || user.role !== 'parent') return null;

  const firstName  = user.displayName?.split(' ')[0] || user.email?.split('@')[0];
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const totalQuizzes  = children.reduce((s, c) => s + (c.quizzesCompleted || 0), 0);
  const avgProgress   = children.length > 0 ? Math.round(children.reduce((s, c) => s + (c.progressPercentage || 0), 0) / children.length) : 0;
  const assessmentsDone = children.filter(c => c.hasCompletedAssessment).length;
  const bestStreak    = Math.max(...children.map(c => c.currentStreak || 0), 0);

  const handleVoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setVoiceError(null);
    if (!voiceSubject.trim() || !voiceBody.trim()) { setVoiceError('Please fill in all fields.'); return; }
    try {
      setSubmitting(true);
      await voiceSubmissionService.createSubmission({
        parentId: user.id,
        parentName: user.displayName || user.email || 'Parent',
        goalieId: children[0]?.childId ?? null,
        goalieName: children[0]?.displayName ?? null,
        category: voiceCategory,
        subject: voiceSubject.trim(),
        body: voiceBody.trim(),
      });
      setSubmitted(true);
      setVoiceSubject('');
      setVoiceBody('');
      setSubmissions(await voiceSubmissionService.getParentSubmissions(user.id));
    } catch { setVoiceError('Failed to send your message. Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes drift1  { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(24px,-18px) scale(1.05)} 70%{transform:translate(-10px,12px) scale(.97)} }
        @keyframes drift2  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,22px) scale(.95)} }
        @keyframes drift3  { 0%,100%{transform:translate(0,0)} 60%{transform:translate(14px,-8px)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes ring-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.06)} }
        @keyframes fade-up  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bar-in   { from{width:0} to{width:var(--w)} }
        .s1{animation:fade-up .5s .04s both}
        .s2{animation:fade-up .5s .10s both}
        .s3{animation:fade-up .5s .17s both}
        .s4{animation:fade-up .5s .25s both}
        .s5{animation:fade-up .5s .33s both}
        .card-hover{transition:transform .22s,box-shadow .22s,border-color .22s}
        .card-hover:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(29,158,117,.12)}
        .qa-card{transition:transform .18s,background .18s,border-color .18s,box-shadow .18s}
        .qa-card:hover{transform:translateY(-3px) scale(1.02)}
        .shimmer-bar{background:linear-gradient(90deg,var(--c) 0%,var(--c2) 45%,var(--c) 100%);background-size:400px 100%;animation:shimmer 2.4s infinite linear}
        .row-link{transition:background .15s,border-color .15s,transform .15s}
        .row-link:hover{background:rgba(29,158,117,.08)!important;border-color:rgba(29,158,117,.3)!important;transform:translateX(3px)}
        .dash-grid{display:grid;grid-template-columns:1fr;gap:24px}
        @media(min-width:1024px){.dash-grid{grid-template-columns:1.6fr 1fr}}
        .hero-ring{display:none}
        @media(min-width:520px){.hero-ring{display:block}}
        .tab-pill:hover{background:rgba(255,255,255,.08)!important}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,.28)!important}
        input:focus,textarea:focus{border-color:rgba(29,158,117,.5)!important;box-shadow:0 0 0 3px rgba(29,158,117,.1)!important;outline:none!important}
      `}</style>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #000f28 0%, #051e3e 45%, #062344 100%)',
        minHeight: '360px',
        display: 'flex', alignItems: 'flex-end',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(29,158,117,.15)',
      }}>
        {/* Dot grid texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

        {/* Atmospheric glow orbs */}
        <div style={{ position: 'absolute', top: '-10%', right: '8%', width: '500px', height: '500px', borderRadius: '50%', background: `radial-gradient(circle, ${GREEN}18 0%, transparent 65%)`, animation: 'drift1 10s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '5%', width: '300px', height: '300px', borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}0d 0%, transparent 70%)`, animation: 'drift2 13s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '35%', width: '200px', height: '200px', borderRadius: '50%', background: `radial-gradient(circle, ${PURPLE}0a 0%, transparent 70%)`, animation: 'drift3 8s ease-in-out infinite', pointerEvents: 'none' }} />

        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, #051e3e, transparent)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1280px', margin: '0 auto', padding: 'clamp(0px,2vw,0px) clamp(16px,4vw,32px) clamp(28px,5vw,48px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>

          {/* Left */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div className="s1" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: `${GREEN}18`, border: `1px solid ${GREEN}40`, borderRadius: '30px', padding: '5px 14px', marginBottom: '20px' }}>
              <Sparkles size={11} color={GREEN} />
              <span style={{ fontSize: '11px', color: GREEN, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase' }}>{greeting}</span>
            </div>

            <h1 className="s2" style={{ fontSize: 'clamp(40px,7vw,80px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-.04em', marginBottom: '16px' }}>
              <span style={{ display: 'block', fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,.4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Welcome back,</span>
              <span style={{ background: `linear-gradient(135deg, #fff 35%, ${GREEN} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {firstName}
              </span>
            </h1>

            <p className="s3" style={{ fontSize: '15px', color: 'rgba(255,255,255,.4)', marginBottom: '32px', maxWidth: '380px', lineHeight: 1.7 }}>
              {children.length > 0
                ? `Tracking ${children.length} goalie${children.length !== 1 ? 's' : ''} — stay updated on their progress and development.`
                : "Link your goalie's account to start tracking their progress and development."}
            </p>

            <div className="s4" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/parent/goalies">
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${GREEN} 0%, #158C64 100%)`, border: 'none', borderRadius: '12px', padding: '13px 24px', color: '#fff', fontSize: '14px', fontWeight: 800, letterSpacing: '.3px', cursor: 'pointer', boxShadow: `0 6px 24px ${GREEN}44`, transition: 'transform .15s, box-shadow .15s' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = 'translateY(-2px)'; b.style.boxShadow = `0 10px 32px ${GREEN}55`; }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = ''; b.style.boxShadow = `0 6px 24px ${GREEN}44`; }}
                >
                  <Users size={15} /> My Goalies
                </button>
              </Link>
              <Link href="/parent/perception">
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: '12px', padding: '13px 24px', color: 'rgba(255,255,255,.65)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'background .15s, border-color .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.11)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.06)'; }}
                >
                  <Eye size={15} /> Perception
                </button>
              </Link>
            </div>
          </div>

          {/* Progress ring */}
          <div className="s4 hero-ring" style={{ flexShrink: 0 }}>
            <HeroRing percentage={avgProgress} />
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div className="s5" style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(20px,3vw,28px) clamp(16px,4vw,32px) 0' }}>

        {/* Assessment prompt */}
        {!user.parentOnboardingComplete && children.length > 0 && (
          <div style={{ background: `${GREEN}0d`, border: `1px solid ${GREEN}35`, borderRadius: '14px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: `${GREEN}18`, border: `1px solid ${GREEN}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ClipboardCheck size={17} color={GREEN} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: GREEN }}>Complete Your Parent Baseline</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.45)' }}>Compare your perceptions with your goalie&apos;s self-assessment.</p>
              </div>
            </div>
            <Link href="/onboarding?role=parent">
              <button style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #158C64 100%)`, border: 'none', borderRadius: '9px', padding: '9px 18px', color: '#fff', fontSize: '11px', fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 4px 14px ${GREEN}33` }}>
                Start Now
              </button>
            </Link>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)', borderRadius: '12px', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <AlertCircle size={15} color="#f87171" />
            <p style={{ fontSize: '13px', color: '#f87171' }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '14px' }}>
          <StatCard label="Linked Goalies" value={children.length}                           icon={<Users size={15} />}       color={GREEN}    delay=".00s" />
          <StatCard label="Avg Progress"   value={avgProgress > 0 ? `${avgProgress}%` : '--'} icon={<TrendingUp size={15} />}  color={TEAL}     delay=".05s" />
          <StatCard label="Total Quizzes"  value={totalQuizzes}                               icon={<Trophy size={15} />}      color="#f87171"  delay=".10s" />
          <StatCard label="Assessments"    value={`${assessmentsDone}/${children.length||0}`} icon={<ClipboardCheck size={15}/>} color="#fb923c" delay=".15s" />
          <StatCard label="Best Streak"    value={bestStreak > 0 ? `${bestStreak}d` : '0d'}   icon={<Flame size={15} />}       color="#fbbf24"  delay=".20s" />
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(20px,3vw,28px) clamp(16px,4vw,32px) 72px' }}>
        <div className="dash-grid">

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* My Goalies */}
            <SectionCard
              accent={GREEN}
              header={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>My Goalies</h2>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)' }}>{children.length} linked {children.length === 1 ? 'goalie' : 'goalies'}</p>
                  </div>
                  {children.length > 0 && (
                    <Link href="/parent/goalies"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: GREEN, fontWeight: 700, textDecoration: 'none', background: `${GREEN}12`, border: `1px solid ${GREEN}28`, borderRadius: '10px', padding: '7px 12px', transition: 'background .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${GREEN}20`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${GREEN}12`; }}
                    >
                      View all <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              }
            >
              {children.length === 0 ? <EmptyGoalies /> : (
                <div style={{ padding: '10px' }}>
                  {children.map(child => <GoalieRow key={child.childId} child={child} />)}
                </div>
              )}
            </SectionCard>

            {/* Recent Activity */}
            {children.length > 0 && (
              <SectionCard
                accent={TEAL}
                header={
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>Recent Activity</h2>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)' }}>Latest goalie sessions</p>
                  </div>
                }
              >
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {children
                    .filter(c => c.lastActiveAt)
                    .sort((a, b) => (b.lastActiveAt?.getTime() || 0) - (a.lastActiveAt?.getTime() || 0))
                    .slice(0, 5)
                    .map(child => (
                      <div key={`act-${child.childId}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '12px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg, ${GREEN}, #158C64)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 800 }}>{child.displayName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.displayName}</p>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.38)' }}>{child.quizzesCompleted || 0} quizzes · {Math.round(child.progressPercentage || 0)}% progress</p>
                        </div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' }}>{formatDate(child.lastActiveAt)}</p>
                      </div>
                    ))}
                  {children.filter(c => c.lastActiveAt).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px' }}>
                      <Clock size={22} color="rgba(255,255,255,.12)" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>No recent activity</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Overview */}
            {children.length > 0 && (
              <SectionCard
                accent={GREEN}
                header={
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>Overview</h3>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>Across all linked goalies</p>
                  </div>
                }
              >
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <ProgressRow label="Goalies Linked"   current={children.length}   total={Math.max(children.length, 3)} color={GREEN} />
                  <ProgressRow label="Assessments Done" current={assessmentsDone}   total={children.length}              color="#fb923c" />
                  <ProgressRow label="Avg Progress"     current={avgProgress}       total={100} suffix="%" color={TEAL} />
                  <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <MetaRow label="Total Quizzes" icon={<Trophy size={12} color="#f87171" />} value={String(totalQuizzes)} />
                    <MetaRow label="Best Streak"   icon={<Flame size={12} color="#fb923c" />}  value={`${bestStreak} days`} />
                  </div>
                  {avgProgress > 0 && (
                    <div style={{ background: `${GREEN}0c`, border: `1px solid ${GREEN}25`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={13} color={GREEN} style={{ flexShrink: 0 }} />
                      <p style={{ fontSize: '12px', color: GREEN, fontWeight: 600, lineHeight: 1.4 }}>
                        {avgProgress >= 80 ? 'Your goalies are doing great!' : avgProgress >= 50 ? 'Good progress across the board!' : 'Your goalies are getting started!'}
                      </p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Quick Actions */}
            <SectionCard
              accent={PURPLE}
              header={<h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Quick Actions</h3>}
            >
              <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <QuickActionCard href="/parent/link-child"          icon={<UserPlus size={20} />}       label="Link Goalie"   sub="Add child"        color={GREEN} />
                <QuickActionCard href="/onboarding?role=parent"     icon={<ClipboardCheck size={20} />} label="Assessment"    sub="Your baseline"    color="#1D9E75" />
                <QuickActionCard href="/parent/perception"          icon={<Eye size={20} />}             label="Perception"    sub="Compare views"    color={PURPLE} />
                {children.length > 0
                  ? <QuickActionCard href={`/parent/child/${children[0].childId}`} icon={<TrendingUp size={20} />} label="Progress" sub="View details" color={TEAL} />
                  : <QuickActionCard href="/parent/goalies"         icon={<Users size={20} />}           label="My Goalies"    sub="Manage links"     color={TEAL} />
                }
              </div>
            </SectionCard>

            {/* Connect */}
            <SectionCard
              accent={BLUE}
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${BLUE}14`, border: `1px solid ${BLUE}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageSquare size={15} color={BLUE} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Connect With Us</h3>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>Coach Mike&apos;s team responds within 48h</p>
                  </div>
                </div>
              }
            >
              <div style={{ padding: '18px 22px' }}>
                {submissions.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>Your Messages</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {submissions.map(sub => (
                        <div key={sub.id} style={{ borderRadius: '10px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.85)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.subject}</p>
                            <VoiceStatusBadge status={sub.status} />
                          </div>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', marginBottom: sub.adminReply ? '8px' : 0 }}>{sub.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · {formatDate(sub.createdAt)}</p>
                          {sub.adminReply && (
                            <div style={{ marginTop: '8px', borderRadius: '8px', background: `${BLUE}0a`, border: `1px solid ${BLUE}1a`, padding: '8px 10px' }}>
                              <p style={{ fontSize: '10px', fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Coach&apos;s Reply</p>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.65)', lineHeight: 1.6 }}>{sub.adminReply}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {submitted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '24px 16px', borderRadius: '12px', background: `${GREEN}0a`, border: `1px solid ${GREEN}22`, textAlign: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `${GREEN}15`, border: `1px solid ${GREEN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={22} color={GREEN} />
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: GREEN }}>Message Sent!</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>Coach Mike&apos;s team will respond within 48 hours.</p>
                    <button onClick={() => setSubmitted(false)}
                      style={{ marginTop: '4px', background: 'transparent', border: `1px solid ${GREEN}35`, borderRadius: '7px', padding: '7px 16px', color: GREEN, fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '.5px', transition: 'border-color .15s' }}
                    >
                      Send Another
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleVoiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>Category</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {([
                          { value: 'COMPLIMENT', label: 'Win to Share' },
                          { value: 'CONCERN',    label: 'Concern' },
                          { value: 'QUESTION',   label: 'Question' },
                        ] as { value: VoiceCategory; label: string }[]).map(({ value, label }) => (
                          <button key={value} type="button" onClick={() => setVoiceCategory(value)} className="tab-pill"
                            style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: voiceCategory === value ? `1.5px solid ${GREEN}` : '1.5px solid rgba(255,255,255,.1)', background: voiceCategory === value ? `${GREEN}20` : 'transparent', color: voiceCategory === value ? GREEN : 'rgba(255,255,255,.4)', transition: 'all .15s' }}
                          >{label}</button>
                        ))}
                      </div>
                    </div>
                    <input type="text" value={voiceSubject} onChange={e => setVoiceSubject(e.target.value.slice(0, 80))} placeholder="What's on your mind?" maxLength={80} required
                      style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '9px', padding: '10px 13px', color: '#fff', fontSize: '13px', transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box' }}
                    />
                    <div>
                      <textarea value={voiceBody} onChange={e => setVoiceBody(e.target.value.slice(0, 1000))} placeholder="Share your thoughts with Coach Mike's team..." maxLength={1000} required rows={4}
                        style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '9px', padding: '10px 13px', color: '#fff', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', transition: 'border-color .15s, box-shadow .15s', boxSizing: 'border-box' }}
                      />
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,.2)', textAlign: 'right', marginTop: '3px' }}>{voiceBody.length}/1000</p>
                    </div>
                    {voiceError && <p style={{ fontSize: '12px', color: '#f87171' }}>{voiceError}</p>}
                    <button type="submit" disabled={submitting}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: submitting ? `${GREEN}50` : `linear-gradient(135deg, ${GREEN} 0%, #158C64 100%)`, border: 'none', borderRadius: '9px', padding: '11px 20px', color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '.5px', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'opacity .15s', boxShadow: submitting ? 'none' : `0 4px 16px ${GREEN}33` }}
                    >
                      <Send size={13} /> {submitting ? 'Sending…' : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Layout ─────────────────────────────────── */

function SectionCard({ children, header, accent = GREEN }: { children: React.ReactNode; header: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: 'rgba(2,18,44,.75)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '20px', overflow: 'hidden', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
      {/* Top accent line */}
      <div style={{ height: '1px', background: `linear-gradient(90deg, transparent 0%, ${accent}60 40%, ${accent}60 60%, transparent 100%)` }} />
      {/* Header */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        {header}
      </div>
      {children}
    </div>
  );
}

function MetaRow({ label, icon, value }: { label: string; icon: React.ReactNode; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.75)', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {icon} {value}
      </span>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────── */

function HeroRing({ percentage }: { percentage: number }) {
  const size = 152, stroke = 8, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r, offset = circ - (percentage / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', background: `radial-gradient(circle, ${GREEN}1a 0%, transparent 70%)`, animation: 'ring-pulse 3.5s ease-in-out infinite' }} />
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={GREEN} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${GREEN}88)`, transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
        <span style={{ fontSize: '32px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{percentage}%</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.38)', fontWeight: 600, letterSpacing: '.4px', textTransform: 'uppercase' }}>Avg Progress</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, delay }: { label: string; value: string | number; icon: React.ReactNode; color: string; delay: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="card-hover"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ position: 'relative', background: 'rgba(2,18,44,.7)', border: `1px solid ${hov ? color+'40' : 'rgba(255,255,255,.07)'}`, borderRadius: '16px', padding: '18px', overflow: 'hidden', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: hov ? `0 12px 32px ${color}1a` : '0 2px 12px rgba(0,0,0,.15)', animation: `fade-up .48s ${delay} both`, transition: 'border-color .2s, box-shadow .2s' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }} />
      <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${color}16`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color, transition: 'box-shadow .2s', boxShadow: hov ? `0 0 16px ${color}40` : 'none' }}>
        {icon}
      </div>
      <p style={{ fontSize: '28px', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: '5px', letterSpacing: '-.02em' }}>{value}</p>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</p>
    </div>
  );
}

function GoalieRow({ child }: { child: LinkedChildSummary }) {
  const pct = Math.round(child.progressPercentage || 0);
  return (
    <Link href={`/parent/child/${child.childId}`} className="row-link"
      style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 14px', borderRadius: '13px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', textDecoration: 'none', borderLeft: `3px solid ${GREEN}60` }}
    >
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${GREEN}, #158C64)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${GREEN}33` }}>
        <span style={{ color: '#fff', fontSize: '16px', fontWeight: 800 }}>{child.displayName.charAt(0).toUpperCase()}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{child.displayName}</h4>
          {child.pacingLevel && (
            <span style={{ fontSize: '9px', fontWeight: 800, color: GREEN, background: `${GREEN}14`, border: `1px solid ${GREEN}28`, borderRadius: '20px', padding: '1px 8px', textTransform: 'uppercase', letterSpacing: '.5px' }}>{child.pacingLevel}</span>
          )}
          {child.hasCompletedAssessment
            ? <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
            : <Clock size={12} color="#fbbf24" style={{ flexShrink: 0 }} />}
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,.06)', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
          <div className="shimmer-bar" style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, '--c': GREEN, '--c2': '#158C64' } as React.CSSProperties} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.38)' }}>{pct}%</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.38)', display: 'flex', alignItems: 'center', gap: '3px' }}><Trophy size={10} /> {child.quizzesCompleted || 0}</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.38)', display: 'flex', alignItems: 'center', gap: '3px' }}><Flame size={10} /> {child.currentStreak || 0}</span>
        </div>
      </div>
      <ChevronRight size={14} color="rgba(255,255,255,.25)" style={{ flexShrink: 0 }} />
    </Link>
  );
}

function EmptyGoalies() {
  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${GREEN}12`, border: `1px solid ${GREEN}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 0 24px ${GREEN}1a` }}>
        <Users size={24} color={GREEN} />
      </div>
      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>No linked goalies yet</h3>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.35)', marginBottom: '24px', maxWidth: '240px', margin: '0 auto 24px', lineHeight: 1.6 }}>
        Link your goalie&apos;s account to track their progress and support their development.
      </p>
      <Link href="/parent/link-child">
        <button style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #158C64 100%)`, border: 'none', borderRadius: '10px', padding: '11px 22px', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 16px ${GREEN}33`, display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
          <UserPlus size={14} /> Link Your Goalie
        </button>
      </Link>
    </div>
  );
}

function ProgressRow({ label, current, total, suffix = '', color = GREEN }: { label: string; current: number; total: number; suffix?: string; color?: string }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>{current}{suffix} / {total}{suffix}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,.06)', borderRadius: '99px', overflow: 'hidden' }}>
        <div className="shimmer-bar" style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, '--c': color, '--c2': color + 'bb' } as React.CSSProperties} />
      </div>
    </div>
  );
}

function QuickActionCard({ href, icon, label, sub, color }: { href: string; icon: React.ReactNode; label: string; sub: string; color: string }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="qa-card" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ padding: '16px 13px', borderRadius: '14px', background: hov ? `${color}1a` : `${color}0d`, border: `1px solid ${hov ? color+'45' : color+'1f'}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', boxShadow: hov ? `0 8px 24px ${color}1a` : 'none', transition: 'background .18s, border-color .18s, box-shadow .18s' }}>
        <div style={{ color, opacity: hov ? 1 : .8, transition: 'opacity .18s' }}>{icon}</div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>{label}</p>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,.32)', letterSpacing: '.2px' }}>{sub}</p>
        </div>
      </div>
    </Link>
  );
}

function VoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    NEW:         { label: 'New',         color: 'rgba(255,255,255,.45)', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.1)' },
    IN_PROGRESS: { label: 'In Progress', color: '#38bdf8',               bg: 'rgba(56,189,248,.08)', border: 'rgba(56,189,248,.2)' },
    ANSWERED:    { label: 'Answered',    color: GREEN,                   bg: `${GREEN}10`,            border: `${GREEN}28` },
    ARCHIVED:    { label: 'Archived',    color: 'rgba(255,255,255,.3)',   bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)' },
    ESCALATED:   { label: 'Escalated',   color: '#fb923c',               bg: 'rgba(251,146,60,.08)', border: 'rgba(251,146,60,.2)' },
  };
  const s = map[status] || map.NEW;
  return (
    <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: '20px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function formatDate(date: Date | undefined): string {
  if (!date) return 'Never';
  const days = calendarDaysAgo(date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
