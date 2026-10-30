'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { chartingService, dynamicChartingService, userService } from '@/lib/database';
import { ChartingEntry, DynamicChartingEntry, Session, User } from '@/types';
import { AdminRoute } from '@/components/auth/protected-route';
import { ArrowLeft, ArrowRight, Search, Users, Activity, CheckCircle2, Clock, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { tallyByStudent } from '@/lib/charting/check-ins';

const BLUE = '#37b5ff';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

type SortKey = 'completion' | 'sessions' | 'recent' | 'name';

interface GoalieSummary {
  studentId: string;
  name: string;
  email?: string;
  avatar?: string;
  totalSessions: number;
  completeSessions: number;
  partialSessions: number;
  chartedSessions: number;
  completionRate: number;
  lastActive: Date | null;
  /** Pillar check-ins saved on their own, with no logged session behind them. */
  checkIns: number;
  lastCheckIn: Date | null;
}

export default function AdminChartingGoaliesPage() {
  return <AdminRoute><GoaliesContent /></AdminRoute>;
}

function GoaliesContent() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entries, setEntries] = useState<ChartingEntry[]>([]);
  const [dynamicEntries, setDynamicEntries] = useState<DynamicChartingEntry[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('completion');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsResult, entriesResult, dynamicResult] = await Promise.all([
        chartingService.getAllSessions({ limit: 1000 }),
        chartingService.getAllChartingEntries({ limit: 1000 }),
        dynamicChartingService.getAllDynamicEntries({ limit: 1000 }),
      ]);
      const sessionsData = sessionsResult.success ? sessionsResult.data || [] : [];
      const entriesData = entriesResult.success ? entriesResult.data || [] : [];
      const dynamicData = dynamicResult.success ? dynamicResult.data || [] : [];
      setSessions(sessionsData);
      setEntries(entriesData);
      setDynamicEntries(dynamicData);
      const uniqueStudentIds = Array.from(new Set([...entriesData.map(e => e.studentId), ...dynamicData.map(e => e.studentId), ...sessionsData.map(s => s.studentId)]));
      const userMap = new Map<string, User>();
      await Promise.all(uniqueStudentIds.map(async (studentId) => {
        const userResult = await userService.getUser(studentId);
        if (userResult.success && userResult.data) userMap.set(studentId, userResult.data);
      }));
      setUsers(userMap);
    } catch (error) {
      console.error('Failed to load goalies:', error);
      toast.error('Failed to load goalies');
    } finally {
      setLoading(false);
    }
  };

  const isLegacyEntryComplete = (entry: ChartingEntry | undefined) => {
    if (!entry) return false;
    return !!(entry.preGame && entry.gameOverview && entry.period1 && entry.period2 && entry.period3 && entry.postGame);
  };

  const getBestDynamicEntry = (items: DynamicChartingEntry[]): DynamicChartingEntry | undefined => {
    if (items.length === 0) return undefined;
    const complete = items.filter(i => i.isComplete);
    const pool = complete.length > 0 ? complete : items;
    return [...pool].sort((a, b) => (b.submittedAt?.toDate?.()?.getTime() || 0) - (a.submittedAt?.toDate?.()?.getTime() || 0))[0];
  };

  const getStatus = (legacy?: ChartingEntry, dynamic?: DynamicChartingEntry): 'complete' | 'partial' | 'not_charted' => {
    const legacyStatus: 'complete' | 'partial' | 'not_charted' = legacy ? (isLegacyEntryComplete(legacy) ? 'complete' : 'partial') : 'not_charted';
    const dynamicStatus: 'complete' | 'partial' | 'not_charted' = dynamic ? (dynamic.isComplete ? 'complete' : dynamic.completionPercentage > 0 ? 'partial' : 'not_charted') : 'not_charted';
    const rank = { not_charted: 0, partial: 1, complete: 2 } as const;
    return rank[dynamicStatus] >= rank[legacyStatus] ? dynamicStatus : legacyStatus;
  };

  const legacyBySession = new Map(entries.map(e => [e.sessionId, e]));
  const dynamicBySession = dynamicEntries.reduce((acc, e) => {
    if (!e.sessionId) return acc;
    const existing = acc.get(e.sessionId) || [];
    existing.push(e);
    acc.set(e.sessionId, existing);
    return acc;
  }, new Map<string, DynamicChartingEntry[]>());

  // Standalone pillar check-ins have no session, so the session counts below never see them.
  const checkInTallies = tallyByStudent(dynamicEntries.filter(e => !e.sessionId));

  const buildGoalieSummary = (studentId: string): GoalieSummary => {
    const studentSessions = sessions.filter(s => s.studentId === studentId);
    let complete = 0, partial = 0;
    let lastActive: Date | null = null;
    studentSessions.forEach(session => {
      const status = getStatus(legacyBySession.get(session.id), getBestDynamicEntry(dynamicBySession.get(session.id) || []));
      if (status === 'complete') complete++;
      if (status === 'partial') partial++;
      const sessionDate = session.date?.toDate?.() ?? null;
      if (sessionDate && (!lastActive || sessionDate > lastActive)) lastActive = sessionDate;
    });
    const user = users.get(studentId);
    const completion = studentSessions.length > 0 ? (complete / studentSessions.length) * 100 : 0;
    const tally = checkInTallies.get(studentId);
    return { studentId, name: user?.displayName || user?.email || `Student ${studentId.slice(-6)}`, email: user?.email, avatar: user?.profileImage, totalSessions: studentSessions.length, completeSessions: complete, partialSessions: partial, chartedSessions: complete + partial, completionRate: completion, lastActive, checkIns: tally?.count ?? 0, lastCheckIn: tally?.latest ?? null };
  };

  const uniqueStudentIds = Array.from(new Set([...entries.map(e => e.studentId), ...dynamicEntries.map(e => e.studentId), ...sessions.map(s => s.studentId)]));
  const goalies: GoalieSummary[] = uniqueStudentIds.filter(id => users.has(id)).map(buildGoalieSummary).filter(g => g.chartedSessions > 0 || g.totalSessions > 0 || g.checkIns > 0);
  const filtered = goalies.filter(g => !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.email?.toLowerCase().includes(searchQuery.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'completion': return b.completionRate - a.completionRate;
      case 'sessions': return b.totalSessions - a.totalSessions;
      case 'recent': return Math.max(b.lastActive?.getTime() || 0, b.lastCheckIn?.getTime() || 0) - Math.max(a.lastActive?.getTime() || 0, a.lastCheckIn?.getTime() || 0);
      case 'name': return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  const totalGoalies = goalies.length;
  const totalSessionsAcross = goalies.reduce((sum, g) => sum + g.totalSessions, 0);
  const totalChartedAcross = goalies.reduce((sum, g) => sum + g.chartedSessions, 0);
  const totalCheckInsAcross = goalies.reduce((sum, g) => sum + g.checkIns, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Loading goalies…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .cg-inp { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 10px !important; padding: 10px 12px 10px 36px !important; width: 100% !important; font-size: 15px !important; outline: none !important; box-sizing: border-box !important; }
        .cg-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
        .cg-inp::placeholder { color: rgba(255,255,255,0.25) !important; }
        .cg-card:hover { border-color: rgba(55,181,255,0.3) !important; transform: translateY(-2px); }
        @media (max-width: 1024px) { .cg-stats { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .cg-stats { grid-template-columns: repeat(1, 1fr) !important; } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Back link + header */}
        <div>
          <Link href="/admin/charting" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', marginBottom: '12px' }}>
            <ArrowLeft size={13} /> Back to Charting Analytics
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>Goalies with Charting Activity</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Select a goalie to view their full charting performance and progress.</p>
        </div>

        {/* Summary strip */}
        <div className="cg-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Active Goalies', value: totalGoalies, icon: Users, color: BLUE },
            { label: 'Total Sessions', value: totalSessionsAcross, icon: Activity, color: AMBER },
            { label: 'Charted Sessions', value: totalChartedAcross, icon: CheckCircle2, color: GREEN },
            { label: 'Pillar Check-ins', value: totalCheckInsAcross, icon: ClipboardCheck, color: BLUE },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ position: 'relative', ...card, padding: '18px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={`${color}bb`} />
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                  <p style={{ color: '#fff', fontWeight: 800, fontSize: '26px' }}>{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + sort */}
        <div style={{ position: 'relative', ...card, padding: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="cg-inp" placeholder="Search by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {([{ key: 'completion', label: 'Top completion' }, { key: 'sessions', label: 'Most sessions' }, { key: 'recent', label: 'Recently active' }, { key: 'name', label: 'Name' }] as { key: SortKey; label: string }[]).map(opt => (
                <button key={opt.key} onClick={() => setSortBy(opt.key)} style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${sortBy === opt.key ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.1)'}`, background: sortBy === opt.key ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.04)', color: sortBy === opt.key ? '#f87171' : 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Goalies list */}
        {sorted.length === 0 ? (
          <div style={{ position: 'relative', ...card, padding: '64px', textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
            <Users size={44} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '17px', marginBottom: '6px' }}>No goalies found</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>{searchQuery ? 'Try adjusting your search.' : 'No goalies have charted a session or a pillar check-in yet.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
            {sorted.map(goalie => {
              const initials = goalie.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={goalie.studentId} className="cg-card" style={{ position: 'relative', ...card, padding: '20px', overflow: 'hidden', transition: 'all 0.2s' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}44, transparent)` }} />

                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${BLUE}33, rgba(14,165,233,0.2))`, border: `1px solid rgba(55,181,255,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: BLUE, flexShrink: 0, overflow: 'hidden' }}>
                      {goalie.avatar ? <img src={goalie.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goalie.name}</p>
                      {goalie.email && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goalie.email}</p>}
                    </div>
                  </div>

                  {/* Completion bar */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600 }}>Completion rate</span>
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: '17px' }}>{goalie.totalSessions === 0 ? '—' : `${goalie.completionRate.toFixed(0)}%`}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(goalie.completionRate, 100)}%`, background: `linear-gradient(90deg, ${BLUE}, #0ea5e9)`, borderRadius: '3px', transition: 'width 0.5s' }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    {[['Total', goalie.totalSessions], ['Complete', goalie.completeSessions], ['Partial', goalie.partialSessions], ['Check-ins', goalie.checkIns]].map(([label, value]) => (
                      <div key={String(label)} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 6px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{label}</p>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Last active */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px 12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {goalie.lastActive && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}><Clock size={12} /> Last session {goalie.lastActive.toLocaleDateString()}</span>}
                    {goalie.lastCheckIn && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}><ClipboardCheck size={12} /> Last check-in {goalie.lastCheckIn.toLocaleDateString()}</span>}
                    {goalie.chartedSessions === 0 && goalie.checkIns === 0 && <span style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>No entries yet</span>}
                  </div>

                  {/* CTA */}
                  <Link href={`/admin/users/${goalie.studentId}?tab=charting`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: `linear-gradient(135deg, #f87171 0%, #dc2626 100%)`, color: '#fff', padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
                    View Performance <ArrowRight size={15} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
