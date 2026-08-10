'use client';

import React, { useState } from 'react';
import {
  Calendar,
  TrendingUp,
  BarChart,
  Target,
  Flame,
  CheckCircle2,
  BookOpen,
  Clock,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PieChart,
  Pie,
} from 'recharts';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { SkeletonAnalytics } from '@/components/ui/skeletons';
import { useAnalytics, type PillarBreakdown } from '@/hooks/useAnalytics';

const BLUE = '#37b5ff';
const card = { background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px' };

export default function ProgressPage() {
  return (
    <ProtectedRoute>
      <ProgressContent />
    </ProtectedRoute>
  );
}

type TabKey = 'overview' | 'pillars' | 'performance' | 'history';

function ProgressContent() {
  const { data, loading, error } = useAnalytics();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  if (loading) return <SkeletonAnalytics />;

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ ...card, padding: '48px 24px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <BarChart size={40} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Unable to load progress data</h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const weekPct = data.consistency.daysInCurrentWeek > 0
    ? Math.round((data.consistency.thisWeekDays / data.consistency.daysInCurrentWeek) * 100)
    : 0;
  const monthPct = data.consistency.daysInCurrentMonth > 0
    ? Math.round((data.consistency.thisMonthDays / data.consistency.daysInCurrentMonth) * 100)
    : 0;

  // Sort keys, matched loosely against the stored pillar name (see below), in
  // Michael's approved order. Uppercase because the comparison uppercases both sides.
  const PILLAR_ORDER = ['MINDSET', 'SKATING', '7AMS', '6 ZONE', 'FORM', 'GAME', 'PRACTICE', 'LIFESTYLE'];

  const scoreDistribution = [
    { name: '95-100 CLUB', value: data.attempts.filter(a => a.percentage >= 95).length, color: '#fbbf24' },
    { name: '80-100 CLUB', value: data.attempts.filter(a => a.percentage >= 80 && a.percentage < 95).length, color: '#60cdff' },
    { name: 'OWNING IT', value: data.attempts.filter(a => a.percentage >= 70 && a.percentage < 80).length, color: BLUE },
    { name: 'DEVELOPING', value: data.attempts.filter(a => a.percentage >= 40 && a.percentage < 70).length, color: '#93c5fd' },
    { name: 'FOUNDATION', value: data.attempts.filter(a => a.percentage < 40).length, color: '#f59e0b' },
  ].filter(s => s.value > 0);

  const sortedPillarBreakdown = [...data.pillarBreakdown].sort((a, b) => {
    const ai = PILLAR_ORDER.findIndex(p => a.pillarName.toUpperCase().includes(p) || p.includes(a.pillarName.toUpperCase()));
    const bi = PILLAR_ORDER.findIndex(p => b.pillarName.toUpperCase().includes(p) || p.includes(b.pillarName.toUpperCase()));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const radarData = sortedPillarBreakdown.map(p => ({ pillar: p.pillarName, score: p.avgScore, fullMark: 100 }));

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'pillars', label: 'Pillars' },
    { key: 'performance', label: 'Performance' },
    { key: 'history', label: 'History' },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: 'clamp(64px,9vw,108px) 24px clamp(48px,6vw,72px)', maxWidth: '720px', margin: '0 auto' }}>
          <p style={{ fontSize: '10px', letterSpacing: '4px', color: BLUE, fontWeight: 700, textTransform: 'uppercase', marginBottom: '16px' }}>
            YOUR PROGRESS
          </p>
          <h1 style={{ fontSize: 'clamp(28px,5vw,56px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '18px' }}>
            Track Your<br />
            <span style={{ color: BLUE }}>Learning Journey</span>
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, maxWidth: '520px', margin: '0 auto' }}>
            Detailed analytics and insights to measure your growth across all seven pillars.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(16px,3vw,28px) clamp(14px,4vw,24px) 48px' }}>
        <style>{`
          .progress-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          @media (min-width: 768px) { .progress-stats { grid-template-columns: repeat(4, 1fr); } }
          .progress-two-col { display: grid; grid-template-columns: 1fr; gap: 16px; }
          @media (min-width: 768px) { .progress-two-col { grid-template-columns: 1fr 1fr; } }
          .progress-perf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          @media (min-width: 640px) { .progress-perf-grid { grid-template-columns: repeat(4, 1fr); } }
          .progress-streak-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
          @media (min-width: 768px) { .progress-streak-grid { grid-template-columns: 2fr 3fr; } }
          .progress-pillar-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
          @media (min-width: 640px) { .progress-pillar-grid { grid-template-columns: 1fr 1fr; } }
          @media (min-width: 1024px) { .progress-pillar-grid { grid-template-columns: 1fr 1fr 1fr; } }
          .progress-eff-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          @media (min-width: 768px) { .progress-eff-grid { grid-template-columns: repeat(5, 1fr); } }
          .progress-hist-sum { display: grid; grid-template-columns: 1fr; gap: 10px; }
          @media (min-width: 480px) { .progress-hist-sum { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
        `}</style>

        {/* Stat Cards */}
        <div className="progress-stats" style={{ marginBottom: '28px' }}>
          <BigStatCard label="Learning Time" value={data.totalTimeMinutes >= 60 ? `${Math.round(data.totalTimeMinutes / 60)}h ${data.totalTimeMinutes % 60}m` : `${data.totalTimeMinutes}m`} sub="Total time invested" icon={<Clock size={17} color={BLUE} />} />
          <BigStatCard label="Knowledge Checks" value={data.totalQuizzes} sub={`${data.uniqueSkills} unique`} icon={<Trophy size={17} color={BLUE} />} />
          <BigStatCard label="Avg Grasp Level" value={`${data.avgScore}%`} sub={`Best: ${data.bestScore}%`} icon={<Target size={17} color={BLUE} />} />
          <BigStatCard label="Current Streak" value={`${data.currentStreak}d`} sub={`Best: ${data.longestStreak} days`} icon={<Flame size={17} color={BLUE} />} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', background: 'rgba(2,18,44,0.8)', border: '1px solid rgba(55,181,255,0.15)', borderRadius: '12px', padding: '5px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{ flex: 1, minWidth: '80px', padding: '9px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === t.key ? BLUE : 'transparent',
                color: activeTab === t.key ? '#000f28' : 'rgba(255,255,255,0.5)',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 30-Day Activity */}
            <div style={{ ...card, padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Activity size={16} color={BLUE} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>30-Day Activity</span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Your daily Grasp Levels over the last 30 days</p>
              {data.dailyProgress.some(d => d.quizzes > 0) ? (
                <div style={{ height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.dailyProgress}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} interval={4} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="avgScore" stroke={BLUE} strokeWidth={2.5} fill="url(#scoreGradient)" dot={false} activeDot={{ r: 6, strokeWidth: 2, fill: '#000f28', stroke: BLUE }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState icon={<BarChart size={40} color="rgba(255,255,255,0.15)" />} title="No activity yet" message="Complete Knowledge Checks to see your 30-day progress chart" />
              )}
            </div>

            <div className="progress-two-col">
              {/* Consistency */}
              <div style={{ ...card, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Calendar size={16} color={BLUE} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Commitment Consistency</span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>How regularly you train</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <GlowProgressBar label="This Week" current={data.consistency.thisWeekDays} total={data.consistency.daysInCurrentWeek} suffix="days" pct={weekPct} />
                  <GlowProgressBar label="This Month" current={data.consistency.thisMonthDays} total={data.consistency.daysInCurrentMonth} suffix="days" pct={monthPct} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <MiniStat label="Pass Rate" value={`${data.completionRate}%`} icon={<CheckCircle2 size={14} color={BLUE} />} />
                  <MiniStat label="Avg Time" value={data.avgSessionTime > 0 ? `${data.avgSessionTime}m` : '--'} icon={<Clock size={14} color={BLUE} />} />
                </div>
              </div>

              {/* Score Distribution */}
              <div style={{ ...card, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Target size={16} color={BLUE} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Where Your Grasp Level Lands</span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>How your Grasp Levels break down</p>
                {data.totalQuizzes > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0, margin: '0 auto' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={scoreDistribution} cx="50%" cy="50%" innerRadius={46} outerRadius={66} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {scoreDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>{data.avgScore}%</span>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Average</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { label: '95-100 CLUB (95-100%)', count: data.attempts.filter(a => a.percentage >= 95).length, color: '#fbbf24' },
                        { label: '80-100 CLUB (80-94%)', count: data.attempts.filter(a => a.percentage >= 80 && a.percentage < 95).length, color: '#60cdff' },
                        { label: 'OWNING IT (70-79%)', count: data.attempts.filter(a => a.percentage >= 70 && a.percentage < 80).length, color: BLUE },
                        { label: 'DEVELOPING (40-69%)', count: data.attempts.filter(a => a.percentage >= 40 && a.percentage < 70).length, color: '#93c5fd' },
                        { label: 'FOUNDATION (0-39%)', count: data.attempts.filter(a => a.percentage < 40).length, color: '#f59e0b' },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', flex: 1 }}>{item.label}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={<Target size={36} color="rgba(255,255,255,0.15)" />} title="No data" message="Complete Knowledge Checks to see your Grasp Level breakdown" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PILLARS TAB ── */}
        {activeTab === 'pillars' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {data.pillarBreakdown.length > 0 ? (
              <>
                <div className="progress-two-col">
                  {radarData.length >= 3 && (
                    <div style={{ ...card, padding: '22px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Zap size={16} color={BLUE} />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Skill Radar</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Your strength across pillars</p>
                      <div style={{ height: '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData} outerRadius="75%">
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                            <Radar name="Score" dataKey="score" stroke={BLUE} fill={BLUE} fillOpacity={0.12} strokeWidth={2} dot={{ r: 4, fill: BLUE, strokeWidth: 0 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  <div style={{ ...card, padding: '22px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <BarChart size={16} color={BLUE} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Performance by Pillar</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Average Grasp Level per pillar</p>
                    <div style={{ height: '280px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={sortedPillarBreakdown} margin={{ bottom: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="pillarName" fontSize={11} tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={65} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                          <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                          <Tooltip content={<PillarTooltip />} />
                          <Bar dataKey="avgScore" radius={[8, 8, 0, 0]} maxBarSize={45}>
                            {sortedPillarBreakdown.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Bar>
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="progress-pillar-grid">
                  {sortedPillarBreakdown.map(pillar => <PillarCard key={pillar.pillarId} pillar={pillar} />)}
                </div>
              </>
            ) : (
              <div style={{ ...card, padding: '64px 24px' }}>
                <EmptyState icon={<BookOpen size={48} color="rgba(255,255,255,0.12)" />} title="No pillar data yet" message="Complete Knowledge Checks across different pillars to see your breakdown" />
              </div>
            )}
          </div>
        )}

        {/* ── PERFORMANCE TAB ── */}
        {activeTab === 'performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="progress-perf-grid">
              <HighlightCard icon={<Clock size={16} color={BLUE} />} label="Avg KC Time" value={data.avgSessionTime > 0 ? `${data.avgSessionTime} min` : '--'} />
              <HighlightCard icon={<CheckCircle2 size={16} color={BLUE} />} label="Pass Rate" value={`${data.completionRate}%`} />
              <HighlightCard icon={<BookOpen size={16} color={BLUE} />} label="Skills Covered" value={data.uniqueSkills} />
              <HighlightCard icon={<Award size={16} color={BLUE} />} label="Best Score" value={`${data.bestScore}%`} />
            </div>

            <div className="progress-streak-grid">
              {/* Streak Panel */}
              <div style={{ ...card, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <Flame size={16} color={BLUE} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Streak Tracker</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '28px', fontWeight: 900, color: '#000f28' }}>{data.currentStreak}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Day Streak</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                      {data.currentStreak === 0 ? 'Start a quiz today!' : data.currentStreak >= data.longestStreak ? 'Personal best!' : `${data.longestStreak - data.currentStreak} days to beat your best`}
                    </p>
                  </div>
                </div>
                {[
                  { label: 'Longest Streak', value: `${data.longestStreak} days` },
                  { label: 'Active This Week', value: `${data.consistency.thisWeekDays}/${data.consistency.daysInCurrentWeek} days` },
                  { label: 'Active This Month', value: `${data.consistency.thisMonthDays}/${data.consistency.daysInCurrentMonth} days` },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{row.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Score Trend */}
              <div style={{ ...card, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <TrendingUp size={16} color={BLUE} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Grasp Level Trend</span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Grasp Levels over time (active days only)</p>
                {data.dailyProgress.filter(d => d.quizzes > 0).length > 0 ? (
                  <div style={{ height: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.dailyProgress.filter(d => d.quizzes > 0)}>
                        <defs>
                          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={BLUE} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                        <Tooltip content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div style={{ background: 'rgba(2,18,44,0.96)', border: '1px solid rgba(55,181,255,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
                              <p style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{label}</p>
                              <p style={{ color: 'rgba(255,255,255,0.5)' }}>Score: <span style={{ color: BLUE, fontWeight: 700 }}>{payload[0].value}%</span></p>
                            </div>
                          );
                        }} />
                        <Area type="monotone" dataKey="avgScore" stroke={BLUE} strokeWidth={2.5} fill="url(#trendGradient)" dot={{ r: 4, fill: BLUE, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#000f28', stroke: BLUE, strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={<TrendingUp size={36} color="rgba(255,255,255,0.15)" />} title="No trend data" message="Complete Knowledge Checks on multiple days to see your Grasp Level trend" />
                )}
              </div>
            </div>

            {/* Efficiency */}
            <div style={{ ...card, padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Zap size={16} color={BLUE} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Learning Efficiency</span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '18px' }}>Key metrics about how you learn</p>
              <div className="progress-eff-grid">
                <EffTile label="Total Time" value={data.totalTimeMinutes >= 60 ? `${Math.round(data.totalTimeMinutes / 60)}h ${data.totalTimeMinutes % 60}m` : `${data.totalTimeMinutes}m`} icon={<Clock size={14} color={BLUE} />} />
                <EffTile label="Avg per Quiz" value={data.avgSessionTime > 0 ? `${data.avgSessionTime}m` : '--'} icon={<Activity size={14} color={BLUE} />} />
                <EffTile label="Knowledge Checks" value={data.totalQuizzes} icon={<Trophy size={14} color={BLUE} />} />
                <EffTile label="Unique Skills" value={data.uniqueSkills} icon={<BookOpen size={14} color={BLUE} />} />
                <EffTile label="Pillars" value={data.pillarBreakdown.length} icon={<Target size={14} color={BLUE} />} />
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {data.recentAttempts.length > 0 && (
              <div className="progress-hist-sum">
                {[
                  { label: 'Total Attempts', value: data.totalQuizzes },
                  { label: 'Passed', value: data.attempts.filter(a => a.percentage >= 70).length },
                  { label: 'Best Score', value: `${data.bestScore}%` },
                ].map(s => (
                  <div key={s.label} style={{ ...card, padding: '18px', textAlign: 'center' }}>
                    <p style={{ fontSize: '32px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...card, padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <Calendar size={16} color={BLUE} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Recent Knowledge Checks</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Your latest {Math.min(data.recentAttempts.length, 10)} results</p>
                </div>
                {data.totalQuizzes > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: BLUE, background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '20px', padding: '3px 10px' }}>
                    {data.totalQuizzes} total
                  </span>
                )}
              </div>
              {data.recentAttempts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.recentAttempts.map((attempt, idx) => {
                    const passed = attempt.percentage >= 70;
                    return (
                      <div key={attempt.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${passed ? 'rgba(55,181,255,0.2)' : 'rgba(248,113,113,0.2)'}`, background: passed ? 'rgba(55,181,255,0.04)' : 'rgba(248,113,113,0.04)', transition: 'all 0.2s' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', width: '20px', textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: passed ? 'rgba(55,181,255,0.15)' : 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {passed ? <ArrowUpRight size={16} color={BLUE} /> : <ArrowDownRight size={16} color="#f87171" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attempt.pillarName}</p>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                            {attempt.submittedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {attempt.timeSpent > 0 && ` · ${attempt.timeSpent}m`}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '16px', fontWeight: 800, color: passed ? BLUE : '#f87171' }}>{attempt.percentage}%</p>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{passed ? 'Passed' : 'Retry'}</p>
                        </div>
                        <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ height: '100%', borderRadius: '99px', background: passed ? BLUE : '#f87171', width: `${attempt.percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={<Calendar size={48} color="rgba(255,255,255,0.12)" />} title="No history yet" message="Start completing Knowledge Checks to build your history" />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Sub-components ── */

function BigStatCard({ label, value, sub, icon }: { label: string; value: string | number; sub: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(55,181,255,0.12)', border: '1px solid rgba(55,181,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      </div>
      <div>
        <p style={{ fontSize: '42px', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>{value}</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{sub}</p>
      </div>
    </div>
  );
}

function GlowProgressBar({ label, current, total, suffix, pct }: { label: string; current: number; total: number; suffix: string; pct: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{current}/{total} {suffix}</span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '99px', background: BLUE, width: `${pct}%`, transition: 'width 0.7s' }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(55,181,255,0.06)', border: '1px solid rgba(55,181,255,0.12)', borderRadius: '10px', padding: '10px 12px' }}>
      {icon}
      <div>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{value}</p>
      </div>
    </div>
  );
}

function HighlightCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '14px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(55,181,255,0.12)', border: '1px solid rgba(55,181,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
        <div>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{label}</p>
          <p style={{ fontSize: '20px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function EffTile({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 12px', background: 'rgba(55,181,255,0.06)', border: '1px solid rgba(55,181,255,0.12)', borderRadius: '12px' }}>
      <div style={{ marginBottom: '6px' }}>{icon}</div>
      <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{label}</p>
    </div>
  );
}

function PillarCard({ pillar }: { pillar: PillarBreakdown }) {
  return (
    <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '14px', padding: '18px 20px', transition: 'all 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${pillar.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} style={{ color: pillar.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pillar.pillarName}</h3>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{pillar.attempts} attempts · {pillar.timeSpent}m</p>
        </div>
        <span style={{ fontSize: '20px', fontWeight: 800, color: pillar.color }}>{pillar.avgScore}%</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '99px', background: pillar.color, width: `${pillar.avgScore}%`, transition: 'width 0.7s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Best: {pillar.bestScore}%</span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: pillar.avgScore >= 95 ? '#fbbf24' : pillar.avgScore >= 80 ? '#60cdff' : pillar.avgScore >= 70 ? BLUE : pillar.avgScore >= 40 ? '#93c5fd' : '#f59e0b' }}>
          {pillar.avgScore >= 95 ? '95-100 CLUB' : pillar.avgScore >= 80 ? '80-100 CLUB' : pillar.avgScore >= 70 ? 'OWNING IT' : pillar.avgScore >= 40 ? 'DEVELOPING' : 'FOUNDATION'}
        </span>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: { quizzes: number; avgScore: number; timeSpent: number } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'rgba(2,18,44,0.96)', border: '1px solid rgba(55,181,255,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', minWidth: '140px' }}>
      <p style={{ fontWeight: 700, color: '#fff', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: 'rgba(255,255,255,0.5)' }}>Knowledge Checks</span><span style={{ color: '#fff', fontWeight: 600 }}>{d.quizzes}</span></div>
        {d.avgScore > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: 'rgba(255,255,255,0.5)' }}>Avg Grasp Level</span><span style={{ color: BLUE, fontWeight: 600 }}>{d.avgScore}%</span></div>}
        {d.timeSpent > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: 'rgba(255,255,255,0.5)' }}>Time</span><span style={{ color: '#fff', fontWeight: 600 }}>{d.timeSpent}m</span></div>}
      </div>
    </div>
  );
}

function PillarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PillarBreakdown }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'rgba(2,18,44,0.96)', border: '1px solid rgba(55,181,255,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', minWidth: '160px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, color: '#fff' }}>{d.pillarName}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[{ l: 'Avg Grasp Level', v: `${d.avgScore}%`, c: d.color }, { l: 'Best', v: `${d.bestScore}%`, c: '#fff' }, { l: 'Attempts', v: d.attempts, c: '#fff' }, { l: 'Time', v: `${d.timeSpent}m`, c: '#fff' }].map(r => (
          <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{r.l}</span>
            <span style={{ color: r.c, fontWeight: 600 }}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, message }: { icon: React.ReactNode; title?: string; message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>{icon}</div>
      {title && <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{title}</p>}
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', maxWidth: '280px', margin: '0 auto' }}>{message}</p>
    </div>
  );
}
