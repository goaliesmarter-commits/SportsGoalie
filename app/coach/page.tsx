'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, BookOpen, GraduationCap, ArrowRight,
  ChevronRight, ClipboardList, Target,
  CheckCircle2, Clock, UserCheck, BarChart2,
  AlertCircle, Layers, ShieldCheck, BookMarked, Timer, Activity,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { userService, customCurriculumService } from '@/lib/database';

const STEEL   = '#5b8db8';
const GOLD    = '#D4A93B';
const GREEN   = '#34d399';
const PURPLE  = '#a78bfa';
const CORAL   = '#f87171';
const TEAL    = '#2dd4bf';
const MUTED   = 'rgba(255,255,255,.38)';

interface StudentSummary {
  id: string;
  displayName: string;
  email: string;
  progress: number;
  curriculumItems: number;
  completedItems: number;
  hasCurriculum: boolean;
}

export default function CoachDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [stats, setStats] = useState({ totalStudents: 0, studentsWithCurriculum: 0, totalCurriculumItems: 0, averageProgress: 0 });

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const allUsersResult = await userService.getAllUsers({ role: 'student', limit: 200 });
      if (!allUsersResult.success || !allUsersResult.data) return;

      const assigned = allUsersResult.data.items.filter(
        u => u.workflowType === 'custom' && (user?.role === 'admin' || u.assignedCoachId === user?.id)
      );

      let withCurriculum = 0, totalItems = 0, totalProgress = 0;
      const summaries: StudentSummary[] = [];

      for (const student of assigned) {
        const r = await customCurriculumService.getStudentCurriculum(student.id);
        if (r.success && r.data && r.data.items.length > 0) {
          withCurriculum++;
          const completed = r.data.items.filter(i => i.status === 'completed').length;
          const pct = Math.round((completed / r.data.items.length) * 100);
          totalItems += r.data.items.length;
          totalProgress += pct;
          summaries.push({ id: student.id, displayName: student.displayName || student.email, email: student.email, progress: pct, curriculumItems: r.data.items.length, completedItems: completed, hasCurriculum: true });
        } else {
          summaries.push({ id: student.id, displayName: student.displayName || student.email, email: student.email, progress: 0, curriculumItems: 0, completedItems: 0, hasCurriculum: false });
        }
      }

      setStudents(summaries);
      setStats({
        totalStudents: assigned.length,
        studentsWithCurriculum: withCurriculum,
        totalCurriculumItems: totalItems,
        averageProgress: assigned.length > 0 ? Math.round(totalProgress / assigned.length) : 0,
      });
    } catch (err) { console.error('Failed to load coach stats:', err); }
    finally { setLoading(false); }
  };

  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Coach';
  const greeting = 'Welcome back';
  const pendingCurriculum = stats.totalStudents - stats.studentsWithCurriculum;

  return (
    <div>
      <style>{`
        @keyframes fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .s1{animation:fade-up .35s .04s both}
        .s2{animation:fade-up .35s .10s both}
        .s3{animation:fade-up .35s .16s both}
        .s4{animation:fade-up .35s .22s both}
        .s5{animation:fade-up .35s .28s both}
        .metric-card{transition:border-color .2s,transform .2s}
        .metric-card:hover{transform:translateY(-2px)}
        .row-link{transition:background .15s}
        .row-link:hover{background:rgba(91,141,184,.07)!important}
        .action-tile{transition:background .18s,border-color .18s,transform .18s}
        .action-tile:hover{transform:translateY(-2px)}
        .coach-grid{display:grid;grid-template-columns:1fr;gap:24px}
        @media(min-width:1024px){.coach-grid{grid-template-columns:1.7fr 1fr}}
      `}</style>

      {/* ── GREETING / HERO ── */}
      <div className="s1" style={{ position: 'relative', borderRadius: '16px', background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 55%, #041830 100%)', border: '1px solid rgba(55,181,255,0.16)', overflow: 'hidden', marginBottom: '32px' }}>
        {/* gold top rule */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent 0%, ${GOLD} 40%, ${TEAL} 70%, transparent 100%)` }} />
        {/* glow blobs */}
        <div style={{ position: 'absolute', top: '-40px', right: '-20px', width: '280px', height: '280px', borderRadius: '50%', background: `radial-gradient(circle, rgba(212,169,59,.1) 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-30px', left: '30%', width: '200px', height: '200px', borderRadius: '50%', background: `radial-gradient(circle, rgba(45,212,191,.06) 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', padding: 'clamp(20px,3vw,32px) clamp(18px,3vw,28px)' }}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'stretch' }}>
            {/* gold accent bar */}
            <div style={{ width: '4px', borderRadius: '99px', background: `linear-gradient(180deg,${GOLD},${TEAL})`, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '11px', color: GOLD, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
                {greeting}
              </p>
              <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: '-.03em', lineHeight: 1, marginBottom: '12px' }}>
                Coach <span style={{ color: GOLD }}>{firstName}</span>
              </h1>
              <p style={{ fontSize: '14px', color: MUTED, lineHeight: 1.6, maxWidth: '380px' }}>
                {stats.totalStudents > 0
                  ? `${stats.totalStudents} goalie${stats.totalStudents !== 1 ? 's' : ''} in your program · ${stats.averageProgress}% average completion`
                  : 'No goalies assigned yet. Goalies appear here once linked through admin.'}
              </p>
              {/* quick nav buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                <Link href="/coach/students">
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: `linear-gradient(135deg,${GOLD},#B8891E)`, border: 'none', borderRadius: '9px', padding: '9px 18px', color: '#0c0800', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 14px rgba(212,169,59,.3)` }}>
                    <Users size={13} /> View Goalies
                  </button>
                </Link>
                <Link href="/coach/content">
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.14)', borderRadius: '9px', padding: '9px 18px', color: 'rgba(255,255,255,.75)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    <BookOpen size={13} /> Content Library
                  </button>
                </Link>
              </div>
            </div>
          </div>

          <div className="s2" style={{ flexShrink: 0 }}>
            <CoachRing pct={stats.averageProgress} total={stats.totalStudents} withCurriculum={stats.studentsWithCurriculum} />
          </div>
        </div>
      </div>

      {/* ── METRICS STRIP ── */}
      <div className="s3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '24px' }}>
        <MetricCard
          label="Total Goalies"    value={stats.totalStudents}
          sub="on your roster"     icon={<ShieldCheck size={22} />}
          accent={GOLD}
        />
        <MetricCard
          label="On Curriculum"    value={stats.studentsWithCurriculum}
          sub="actively enrolled"  icon={<BookMarked size={22} />}
          accent={GOLD}
        />
        <MetricCard
          label="Pending Setup"    value={pendingCurriculum}
          sub="need curriculum"    icon={<Timer size={22} />}
          accent={GOLD}
        />
        <MetricCard
          label="Avg Completion"   value={`${stats.averageProgress}%`}
          sub="across all goalies"  icon={<Activity size={22} />}
          accent={GOLD}
        />
      </div>

      {/* ── MAIN GRID ── */}
      <div className="coach-grid">

        {/* LEFT — Athlete roster */}
        <div className="s4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(91,141,184,.16)', borderRadius: '14px', overflow: 'hidden' }}>

            {/* Roster header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(91,141,184,.1)' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '.01em', marginBottom: '2px' }}>Goalie Roster</h2>
                <p style={{ fontSize: '12px', color: MUTED }}>
                  {loading ? 'Loading…' : `${stats.totalStudents} assigned`}
                </p>
              </div>
              <Link href="/coach/students" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: GOLD, fontWeight: 700, textDecoration: 'none', background: 'rgba(212,169,59,.1)', border: `1px solid rgba(212,169,59,.28)`, borderRadius: '8px', padding: '6px 12px' }}>
                Full Roster <ArrowRight size={12} />
              </Link>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 56px', padding: '8px 20px', borderBottom: '1px solid rgba(91,141,184,.07)', background: 'rgba(91,141,184,.04)' }}>
              {['Goalie', 'Progress', 'Pct'].map(h => (
                <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.22)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: h === 'Pct' ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : students.length === 0 ? (
              <EmptyRoster />
            ) : (
              <div>
                {students.slice(0, 8).map((student, idx) => {
                  const bar = student.hasCurriculum
                    ? (student.progress >= 80 ? '#4ade80' : student.progress >= 50 ? STEEL : GOLD)
                    : 'rgba(255,255,255,.12)';
                  return (
                    // No page exists at /coach/students/[studentId] — only its sub-routes
                    // (curriculum, charting, videos, evaluation). Link straight to curriculum,
                    // which is the landing view the students list already treats as primary.
                    <Link key={student.id} href={`/coach/students/${student.id}/curriculum`} className="row-link"
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 110px 56px',
                        alignItems: 'center',
                        padding: '13px 20px',
                        borderBottom: idx < students.slice(0, 8).length - 1 ? '1px solid rgba(91,141,184,.07)' : 'none',
                        textDecoration: 'none',
                        borderLeft: `3px solid ${bar}`,
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(91,141,184,.14)', border: '1px solid rgba(91,141,184,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: STEEL, fontSize: '13px', fontWeight: 800 }}>{(student.displayName || 'S').charAt(0).toUpperCase()}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{student.displayName}</p>
                          <p style={{ fontSize: '11px', color: MUTED }}>{student.hasCurriculum ? `${student.completedItems}/${student.curriculumItems} modules` : 'No curriculum'}</p>
                        </div>
                      </div>
                      <div style={{ paddingRight: '14px' }}>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,.07)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${student.progress}%`, background: bar, borderRadius: '99px' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        {student.hasCurriculum
                          ? <span style={{ fontSize: '13px', fontWeight: 700, color: bar }}>{student.progress}%</span>
                          : <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.2)' }}>—</span>}
                        <ChevronRight size={12} color="rgba(255,255,255,.18)" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Program readiness */}
          <ProgramHealthCard stats={stats} />
        </div>

        {/* RIGHT — Tools + overview */}
        <div className="s5" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Coach tools */}
          <div style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(91,141,184,.16)', borderRadius: '14px', padding: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '12px' }}>TEAM Tools</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <ToolTile href="/coach/students"  icon={<Users size={17} />}         label="Roster"    sub="Manage goalies"  accent={TEAL}   />
              <ToolTile href="/coach/content"   icon={<BookOpen size={17} />}      label="Library"   sub="Browse content"  accent={GOLD}   />
              <ToolTile href="/coach/students"  icon={<ClipboardList size={17} />} label="Curricula" sub="Build programs"  accent={PURPLE} />
              <ToolTile href="/coach/students"  icon={<BarChart2 size={17} />}     label="Analytics" sub="Track results"   accent={GREEN}  />
            </div>
          </div>

          {/* Program status */}
          <div style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(91,141,184,.16)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(91,141,184,.1)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Layers size={13} color={GOLD} />
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: GOLD }}>Program Status</h3>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              {[
                { label: 'On Curriculum',    value: stats.studentsWithCurriculum,                       total: stats.totalStudents, accent: GREEN,  icon: <CheckCircle2 size={12} color={GREEN}  /> },
                { label: 'Needs Setup',      value: stats.totalStudents - stats.studentsWithCurriculum, total: stats.totalStudents, accent: CORAL,  icon: <AlertCircle  size={12} color={CORAL}  /> },
                { label: 'Avg Completion',   value: stats.averageProgress,                              total: 100,                 accent: TEAL,  icon: <UserCheck    size={12} color={TEAL}   />, suffix: '%' },
                { label: 'Content Assigned', value: stats.totalCurriculumItems,                         total: null,                accent: PURPLE,icon: <Target       size={12} color={PURPLE} /> },
              ].map((row) => (
                <div key={row.label}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {row.icon}
                      <span style={{ fontSize: '12px', color: MUTED, fontWeight: 600 }}>{row.label}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{row.value}{row.suffix || ''}</span>
                  </div>
                  {row.total !== null && (
                    <div style={{ height: '3px', background: 'rgba(255,255,255,.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${row.total > 0 ? Math.round((row.value / row.total) * 100) : 0}%`, background: row.accent, borderRadius: '99px', transition: 'width .5s' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content library CTA */}
          <Link href="/coach/content" style={{ textDecoration: 'none' }}>
            <div className="action-tile" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: `1px solid rgba(212,169,59,.28)`, borderRadius: '14px', padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={18} color={GOLD} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Content Library</p>
                <p style={{ fontSize: '12px', color: 'rgba(201,168,76,.55)', lineHeight: 1.4 }}>Create and assign lessons to goalies</p>
              </div>
              <ArrowRight size={14} color={GOLD} />
            </div>
          </Link>

          {/* Evaluation notice */}
          <div style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(91,141,184,.12)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(91,141,184,.1)', border: '1px solid rgba(91,141,184,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
              <Clock size={13} color={STEEL} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Evaluation Reviews</p>
              <p style={{ fontSize: '12px', color: MUTED, lineHeight: 1.5 }}>Review pending goalie evaluations and set pacing levels from the full roster.</p>
              <Link href="/coach/students" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '12px', color: STEEL, fontWeight: 700, textDecoration: 'none' }}>
                Review roster <ChevronRight size={11} />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ──────────────────── Sub-components ──────────────────── */

function CoachRing({ pct, total, withCurriculum }: { pct: number; total: number; withCurriculum: number }) {
  const size = 108;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={GOLD} />
              <stop offset="100%" stopColor={TEAL} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: '10px', color: MUTED, fontWeight: 600, letterSpacing: '.04em' }}>avg</span>
        </div>
      </div>
      <p style={{ fontSize: '11px', color: MUTED, textAlign: 'center' }}>{withCurriculum}/{total} active</p>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, accent }: { label: string; value: string | number; sub: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="metric-card" style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: `1px solid ${accent}38`, padding: '18px 18px 16px' }}>
      {/* top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />
      {/* corner glow */}
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* icon */}
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `linear-gradient(135deg, ${accent}28, ${accent}10)`, border: `1px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, marginBottom: '14px', boxShadow: `0 4px 16px ${accent}22` }}>
        {icon}
      </div>

      {/* value */}
      <p style={{ fontSize: '32px', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: '5px', letterSpacing: '-.02em' }}>{value}</p>

      {/* label */}
      <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,.75)', marginBottom: '3px' }}>{label}</p>

      {/* sub */}
      <p style={{ fontSize: '11px', color: MUTED, fontWeight: 500 }}>{sub}</p>
    </div>
  );
}

function ToolTile({ href, icon, label, sub, accent }: { href: string; icon: React.ReactNode; label: string; sub: string; accent: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="action-tile" style={{ padding: '13px', borderRadius: '10px', background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: `1px solid ${accent}38`, display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>{icon}</div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '1px' }}>{label}</p>
          <p style={{ fontSize: '11px', color: MUTED }}>{sub}</p>
        </div>
      </div>
    </Link>
  );
}

function ProgramHealthCard({ stats }: { stats: { totalStudents: number; studentsWithCurriculum: number; averageProgress: number } }) {
  const readyPct = stats.totalStudents > 0 ? Math.round((stats.studentsWithCurriculum / stats.totalStudents) * 100) : 0;
  return (
    <div style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(91,141,184,.28)', borderRadius: '14px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
        <BarChart2 size={13} color={GOLD} />
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: GOLD }}>Program Readiness</h3>
      </div>
      <div style={{ display: 'flex', gap: '3px', height: '8px', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ width: `${readyPct}%`, background: `linear-gradient(90deg,${TEAL},${GREEN})`, borderRadius: '99px 0 0 99px', transition: 'width .6s' }} />
        <div style={{ flex: 1, background: 'rgba(255,255,255,.07)', borderRadius: '0 99px 99px 0' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '12px', color: MUTED }}>{stats.studentsWithCurriculum} of {stats.totalStudents} goalies have curricula assigned</p>
        <span style={{ fontSize: '13px', fontWeight: 700, color: GREEN }}>{readyPct}%</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 56px', alignItems: 'center', padding: '13px 20px', borderBottom: i < 3 ? '1px solid rgba(91,141,184,.07)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
            <div>
              <div style={{ width: '100px', height: '10px', borderRadius: '4px', background: 'rgba(255,255,255,.05)', marginBottom: '6px' }} />
              <div style={{ width: '65px', height: '8px', borderRadius: '4px', background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)' }} />
            </div>
          </div>
          <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,.05)' }} />
          <div style={{ width: '30px', height: '11px', borderRadius: '4px', background: 'rgba(255,255,255,.05)', marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  );
}

function EmptyRoster() {
  return (
    <div style={{ textAlign: 'center', padding: '44px 24px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(91,141,184,.08)', border: '1px solid rgba(91,141,184,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <Users size={20} color={STEEL} />
      </div>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>No goalies assigned</h3>
      <p style={{ fontSize: '12px', color: MUTED, maxWidth: '220px', margin: '0 auto', lineHeight: 1.5 }}>
        Goalies will appear here once assigned by an admin.
      </p>
    </div>
  );
}
