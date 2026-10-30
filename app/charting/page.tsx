'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { chartingService, formTemplateService } from '@/lib/database';
import { dynamicChartingService } from '@/lib/database/services/dynamic-charting.service';
import { Session, SessionStats, DynamicChartingEntry, ChartingEntry, FormTemplate, PILLARS } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Calendar, X, ArrowRight, BarChart2,
  Brain, Footprints, Shapes, Target, Grid3X3, Dumbbell, Heart,
} from 'lucide-react';
import { SkeletonBannerLight, SkeletonStatCards, SkeletonChart } from '@/components/ui/skeletons';
import { format } from 'date-fns';
import { calculateActivityStreak } from '@/lib/utils/streak';
import { CalendarHeatmap } from '@/components/charting/CalendarHeatmap';
import { NewSessionModal } from '@/components/charting/NewSessionModal';
import { chartTitle } from '@/lib/templates/chart-title';
import { isV2GameEntry, v2GameProgress } from '@/lib/charting/v2-sections';

const CYAN   = '#37b5ff';
const MINT   = '#34d399';
const VIOLET = '#7dd3fc';
const CORAL  = '#f87171';
const MUTED  = 'rgba(255,255,255,0.38)';
const LABEL  = 'rgba(255,255,255,0.55)';

const PILLAR_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Brain, Footprints, Shapes, Target, Grid3X3, Dumbbell, Heart,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === 'function') return candidate.toDate();
  }
  return null;
};

const calculateSessionStats = (sessions: Session[]): SessionStats => {
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const gameSessions     = sessions.filter(s => s.type === 'game');
  const practiceSessions = sessions.filter(s => s.type === 'practice');
  const now = new Date();
  const oneWeekAgo  = new Date(now.getTime() - 7 * DAY_MS);
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisWeekSessions  = sessions.filter(s => { const d = toDate(s.date); return d ? d >= oneWeekAgo : false; }).length;
  const thisMonthSessions = sessions.filter(s => { const d = toDate(s.date); return d ? d >= monthStart : false; }).length;
  return {
    totalSessions: sessions.length, completedSessions: completedSessions.length,
    gameSessions: gameSessions.length, practiceSessions: practiceSessions.length,
    completionRate: sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0,
    averageSessionsPerWeek: thisWeekSessions, averageSessionsPerMonth: thisMonthSessions,
    thisWeekSessions, thisMonthSessions,
  };
};

const calculateCurrentStreak = (sessions: Session[], chartingEntries: ChartingEntry[], dynamicEntries: DynamicChartingEntry[]): number => {
  const activityDates = [
    ...sessions.filter(s => s.status === 'completed').map(s => toDate(s.date)),
    ...chartingEntries.map(e => toDate(e.submittedAt)),
    ...dynamicEntries.map(e => toDate(e.submittedAt)),
  ].filter((date): date is Date => date !== null);
  return calculateActivityStreak(activityDates).currentStreak;
};

export default function ChartingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions,        setSessions]        = useState<Session[]>([]);
  const [chartingEntries, setChartingEntries] = useState<ChartingEntry[]>([]);
  const [dynamicEntries,  setDynamicEntries]  = useState<DynamicChartingEntry[]>([]);
  const [pillarTemplates, setPillarTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const stats         = useMemo<SessionStats>(() => calculateSessionStats(sessions), [sessions]);
  const currentStreak = useMemo(() => calculateCurrentStreak(sessions, chartingEntries, dynamicEntries), [sessions, chartingEntries, dynamicEntries]);

  // A V2 game only counts as charted once Pre-Game, Periods and Post-Game all
  // hold answers; one with only some of them is partial. Legacy and practice
  // entries have no such sections, so having an entry is enough for them.
  const { chartedSessionIds, partialSessionIds } = useMemo(() => {
    const charted = new Set<string>();
    const partial = new Set<string>();
    chartingEntries.forEach(e => {
      if (!isV2GameEntry(e)) { charted.add(e.sessionId); return; }
      const progress = v2GameProgress(e);
      if (progress === 'complete') charted.add(e.sessionId);
      else if (progress === 'partial') partial.add(e.sessionId);
    });
    dynamicEntries.forEach(e => { if (e.sessionId) charted.add(e.sessionId); });
    charted.forEach(id => partial.delete(id));
    return { chartedSessionIds: charted, partialSessionIds: partial };
  }, [chartingEntries, dynamicEntries]);

  const chartingStats = useMemo(() => {
    const totalSessions   = sessions.length;
    const chartedSessions = sessions.reduce((n, s) => n + (chartedSessionIds.has(s.id) ? 1 : 0), 0);
    return { totalSessions, chartedSessions, completionRate: totalSessions > 0 ? Math.round((chartedSessions / totalSessions) * 100) : 0 };
  }, [sessions, chartedSessionIds]);

  const [selectedDate,        setSelectedDate]        = useState<Date | null>(null);
  const [selectedDaySessions, setSelectedDaySessions] = useState<Session[]>([]);
  const [showNewSession,      setShowNewSession]      = useState(false);

  useEffect(() => { if (!authLoading && !user) router.push('/auth/login'); }, [user, authLoading, router]);
  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [sR, eR, dR, pR] = await Promise.all([
        chartingService.getSessionsByStudent(user.id, { limit: 500, orderBy: 'date', orderDirection: 'desc' }),
        chartingService.getChartingEntriesByStudent(user.id),
        dynamicChartingService.getDynamicEntriesByStudent(user.id),
        formTemplateService.getActiveTemplatesForSport('Hockey'),
      ]);
      if (sR.success && sR.data) setSessions(sR.data);
      if (eR.success && eR.data) setChartingEntries(eR.data);
      if (dR.success && dR.data) setDynamicEntries(dR.data);
      // A failure here silently hides the Pillar Check-Ins section, so log it rather than
      // letting "query broke" look the same as "no pillar templates exist".
      if (!pR.success) console.error('Failed to load pillar templates:', pR.error);
      else if (pR.data) setPillarTemplates(pR.data.filter(t => t.pillar !== 'combined'));
    } catch (err) { console.error('Failed to load data:', err); }
    finally { setLoading(false); }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': case 'charted': return 'default';
      case 'in-progress': case 'partial': return 'secondary';
      default: return 'outline';
    }
  };

  const getDisplayStatus = (session: Session) => {
    // A session marked completed before the chart was finished still reads as partial.
    if (partialSessionIds.has(session.id)) return 'partial';
    if (session.status === 'completed') return 'completed';
    return chartedSessionIds.has(session.id) ? 'charted' : session.status;
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <SkeletonBannerLight />
        <SkeletonStatCards count={4} />
        <SkeletonChart />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      <style>{`
        .charting-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; }
        .metric-card-ch { transition: border-color .2s, transform .2s; }
        .metric-card-ch:hover { transform: translateY(-2px); }
      `}</style>

      {/* ── HEADER CARD ── */}
      <div style={{ position: 'relative', borderRadius: '16px', background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.18)', overflow: 'hidden' }}>
        {/* cyan top line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent 0%, ${CYAN} 35%, ${MINT} 65%, transparent 100%)` }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', padding: 'clamp(20px,3vw,32px) clamp(18px,3vw,28px)' }}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'stretch' }}>
            {/* accent bar */}
            <div style={{ width: '4px', borderRadius: '99px', background: `linear-gradient(180deg, ${CYAN}, ${MINT})`, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '11px', color: LABEL, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Performance Tracking
              </p>
              <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: '-.03em', lineHeight: 1, marginBottom: '12px' }}>
                Chart Every <span style={{ color: CYAN, textShadow: `0 0 20px rgba(55,181,255,0.4)` }}>Session</span>
              </h1>
              <p style={{ fontSize: '14px', color: MUTED, lineHeight: 1.6, maxWidth: '380px' }}>
                {stats.totalSessions > 0
                  ? `${stats.totalSessions} total sessions · ${chartingStats.completionRate}% charted · ${currentStreak} day charting streak`
                  : 'Start charting your game and practice sessions to track your progress.'}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowNewSession(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: `linear-gradient(135deg, ${CYAN}, ${MINT})`, border: 'none', borderRadius: '9px', padding: '9px 18px', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 18px rgba(55,181,255,0.35)` }}
                >
                  <Plus size={13} /> New Session
                </button>
                <button
                  onClick={() => router.push('/charting/analytics')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.14)', borderRadius: '9px', padding: '9px 18px', color: 'rgba(255,255,255,.75)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <BarChart2 size={13} /> View Analytics
                </button>
              </div>
            </div>
          </div>

          {/* Donut ring */}
          <div style={{ flexShrink: 0 }}>
            <ChartingRing pct={chartingStats.completionRate} charted={chartingStats.chartedSessions} total={chartingStats.totalSessions} />
          </div>
        </div>
      </div>

      {/* ── METRICS STRIP ── */}
      <div className="charting-metrics">
        <MetricCard label="Total Sessions"  value={stats.totalSessions}           sub="all time"             icon={<IconSessions color={CYAN}   />} accent={CYAN} />
        <MetricCard label="Games"           value={stats.gameSessions}            sub="game sessions"        icon={<IconGames    color={CORAL}  />} accent={CORAL} />
        <MetricCard label="Practices"       value={stats.practiceSessions}        sub="practice sessions"    icon={<IconPractice color={MINT}   />} accent={MINT} />
        <MetricCard label="This Month"      value={stats.thisMonthSessions || 0}  sub="sessions logged"      icon={<IconMonth    color={VIOLET} />} accent={VIOLET} />
      </div>

      {/* ── PILLAR CHECK-INS ── */}
      {pillarTemplates.length > 0 && (
        <div style={{ position: 'relative', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent 0%, #37b5ff 40%, #34d399 70%, transparent 100%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '18px 22px 16px', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>Pillar Check-Ins</h3>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', fontWeight: 500, marginTop: '1px' }}>Rate yourself anytime — no session needed</p>
            </div>
            {/* Pillar charts live in their own area — these cards are a shortcut
                into the form, not the place to read your history back. */}
            <button
              type="button"
              onClick={() => router.push('/charting/pillars')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '9px', padding: '7px 13px', color: 'rgba(255,255,255,0.78)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              View Charts
              <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ padding: '18px 22px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            {pillarTemplates.map(template => {
              const info = PILLARS.find(p => p.slug === template.pillar);
              if (!info) return null;
              const IconComponent = PILLAR_ICONS[info.icon] || Target;
              // The chart's own name leads, so a goalie hunting for "the
              // tournament chart" finds that word; the pillar sits under it.
              const heading = chartTitle(template.name, info.shortName);
              return (
                <div
                  key={template.id}
                  onClick={() => router.push(`/charting/pillars/${template.pillar}`)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(55,181,255,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(55,181,255,0.14)'; }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconComponent size={16} color={CYAN} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>{heading.title}</span>
                    {heading.pillarLabel && (
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: MUTED, marginTop: '2px' }}>{heading.pillarLabel}</span>
                    )}
                  </div>
                  <ArrowRight size={13} color="rgba(255,255,255,0.3)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ACTIVITY CALENDAR ── */}
      <div style={{ position: 'relative', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent 0%, #37b5ff 40%, #34d399 70%, transparent 100%)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={15} color={CYAN} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>Activity Calendar</h3>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', fontWeight: 500, marginTop: '1px' }}>Tap any day to view sessions</p>
            </div>
          </div>
          {currentStreak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '99px', padding: '5px 12px' }}>
              <span style={{ fontSize: '14px' }}>🔥</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#7dd3fc' }}>{currentStreak} day charting streak</span>
            </div>
          )}
        </div>
        <div style={{ padding: '22px 22px 18px' }}>
          <CalendarHeatmap
            sessions={sessions}
            chartingEntries={chartingEntries}
            dynamicEntries={dynamicEntries}
            colorScheme="blue"
            onDayClick={(date, daySessions) => { setSelectedDate(date); setSelectedDaySessions(daySessions); }}
          />
        </div>
      </div>

      {/* ── DAY CLICK MODAL ── */}
      {selectedDate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}
          onClick={() => { setSelectedDate(null); setSelectedDaySessions([]); }}
        >
          <div
            style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.22)', borderRadius: '20px', maxWidth: '560px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: LABEL }}>
                  {format(selectedDate, 'EEEE')}
                </p>
                <button
                  onClick={() => { setSelectedDate(null); setSelectedDaySessions([]); }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <p style={{ fontSize: '13px', color: MUTED, marginTop: '4px' }}>
                {selectedDaySessions.length} session{selectedDaySessions.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div style={{ padding: '16px 24px 24px' }}>
              {selectedDaySessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Calendar size={20} color="rgba(255,255,255,0.3)" />
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>No sessions on this day</p>
                  <p style={{ fontSize: '12px', color: MUTED }}>Tap &quot;New Session&quot; to create one</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedDaySessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => router.push(`/charting/sessions/${session.id}`)}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(55,181,255,0.35)`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(55,181,255,0.14)`; }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                            {session.type === 'game' ? '🥅 Game' : '🏒 Practice'}
                            {session.opponent && ` vs ${session.opponent}`}
                          </h4>
                          <Badge variant={getStatusBadgeVariant(getDisplayStatus(session))}>
                            {getDisplayStatus(session)}
                          </Badge>
                        </div>
                        {session.location && (
                          <p style={{ fontSize: '12px', color: MUTED }}>{session.location}</p>
                        )}
                        {session.tags && session.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {session.tags.map(tag => (
                              <span key={tag} style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(55,181,255,0.8)', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.22)', borderRadius: '99px', padding: '2px 8px' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginLeft: '12px' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Session Modal */}
      <NewSessionModal open={showNewSession} onClose={() => setShowNewSession(false)} />
    </div>
  );
}

/* ─── Metric Icons ───────────────────────────────────────── */

function IconSessions({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1.5" y="12" width="5" height="8.5" rx="1.5" fill={color} opacity="0.4"/>
      <rect x="8.5" y="7" width="5" height="13.5" rx="1.5" fill={color} opacity="0.7"/>
      <rect x="15.5" y="2" width="5" height="18.5" rx="1.5" fill={color}/>
    </svg>
  );
}

function IconGames({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9" stroke={color} strokeWidth="1.5" opacity="0.35"/>
      <circle cx="11" cy="11" r="5.5" stroke={color} strokeWidth="1.5" opacity="0.65"/>
      <circle cx="11" cy="11" r="2.5" fill={color}/>
    </svg>
  );
}

function IconPractice({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M13.5 2L4 13.5h6.5L8 20l10-11H12L13.5 2z" fill={color}/>
    </svg>
  );
}

function IconMonth({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="18" height="15" rx="3" fill={color} opacity="0.2"/>
      <rect x="2" y="5" width="18" height="6.5" rx="3" fill={color} opacity="0.55"/>
      <rect x="2" y="8" width="18" height="3.5" fill={color} opacity="0.55"/>
      <rect x="7" y="2.5" width="2.5" height="5" rx="1.25" fill={color}/>
      <rect x="12.5" y="2.5" width="2.5" height="5" rx="1.25" fill={color}/>
      <circle cx="7.5" cy="15.5" r="1.5" fill={color}/>
      <circle cx="11" cy="15.5" r="1.5" fill={color}/>
      <circle cx="14.5" cy="15.5" r="1.5" fill={color}/>
    </svg>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function ChartingRing({ pct, charted, total }: { pct: number; charted: number; total: number }) {
  const size   = 108;
  const stroke = 7;
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="chart-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={CYAN} />
              <stop offset="60%" stopColor={MINT} />
              <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#chart-ring-grad)" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: '10px', color: MUTED, fontWeight: 600, letterSpacing: '.04em' }}>charted</span>
        </div>
      </div>
      <p style={{ fontSize: '11px', color: MUTED, textAlign: 'center' }}>{charted}/{total} sessions</p>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, accent }: { label: string; value: string | number; sub: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="metric-card-ch" style={{
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)',
      border: `1px solid ${accent}40`,
      padding: '20px 20px 18px',
      boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 0 ${accent}`,
    }}>
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${accent} 40%, ${accent}55 70%, transparent 100%)` }} />
      {/* Subtle corner glow */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle at top right, ${accent}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: `linear-gradient(135deg, ${accent}22, ${accent}0d)`,
          border: `1px solid ${accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent, marginBottom: '16px',
          boxShadow: `0 4px 16px ${accent}25, inset 0 1px 0 ${accent}30`,
        }}>
          {icon}
        </div>
        <p style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: '6px', letterSpacing: '-.03em' }}>{value}</p>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,.8)', marginBottom: '3px' }}>{label}</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>{sub}</p>
      </div>
    </div>
  );
}
