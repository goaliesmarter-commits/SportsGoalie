'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import { chartingService, userService } from '@/lib/database';
import { ChartingEntry, Session, User } from '@/types';
import { AdminRoute } from '@/components/auth/protected-route';
import { CalendarHeatmap } from '@/components/charting/CalendarHeatmap';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Download,
  Eye,
  Search,
  RefreshCw,
  Target,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { startOfWeek, startOfMonth, subMonths, isAfter, format } from 'date-fns';

const BLUE  = '#37b5ff';
const RED   = '#f87171';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';

const card = {
  background: 'rgba(2,18,44,0.85)',
  border: '1px solid rgba(55,181,255,0.14)',
  borderRadius: '16px',
} as const;

type TimeRange = 'week' | 'month' | '3months' | 'all';

export default function AdminChartingPage() {
  return (
    <AdminRoute>
      <AdminChartingContent />
    </AdminRoute>
  );
}

function AdminChartingContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [allEntries, setAllEntries] = useState<ChartingEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<ChartingEntry[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'entries'>('overview');

  const [entriesTabStudent, setEntriesTabStudent] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateSessions, setSelectedDateSessions] = useState<Session[]>([]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [timeRange, searchQuery, selectedStudent, allEntries]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsResult, entriesResult] = await Promise.all([
        chartingService.getAllSessions({ limit: 1000 }),
        chartingService.getAllChartingEntries({ limit: 1000 }),
      ]);

      if (sessionsResult.success && sessionsResult.data) setAllSessions(sessionsResult.data);

      if (entriesResult.success && entriesResult.data) {
        setAllEntries(entriesResult.data);
        setFilteredEntries(entriesResult.data);

        const uniqueStudentIds = Array.from(new Set(entriesResult.data.map(e => e.studentId)));
        const userMap = new Map<string, User>();
        await Promise.all(
          uniqueStudentIds.map(async studentId => {
            const userResult = await userService.getUser(studentId);
            if (userResult.success && userResult.data) userMap.set(studentId, userResult.data);
          })
        );
        setUsers(userMap);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load charting data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allEntries];
    if (selectedStudent !== 'all') filtered = filtered.filter(e => e.studentId === selectedStudent);

    if (timeRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case 'week':     startDate = startOfWeek(now); break;
        case 'month':    startDate = startOfMonth(now); break;
        case '3months':  startDate = subMonths(now, 3); break;
        default:         startDate = new Date(0);
      }
      filtered = filtered.filter(entry => {
        const entryDate = entry.submittedAt?.toDate?.() ?? new Date();
        return isAfter(entryDate, startDate);
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => {
        const session = allSessions.find(s => s.id === entry.sessionId);
        return (
          session?.opponent?.toLowerCase().includes(query) ||
          session?.location?.toLowerCase().includes(query) ||
          entry.additionalComments?.toLowerCase().includes(query)
        );
      });
    }
    setFilteredEntries(filtered);
  };

  const uniqueStudents = Array.from(new Set(allEntries.map(e => e.studentId)));

  const getStudentName = (studentId: string): string => {
    const user = users.get(studentId);
    if (user) return user.displayName || user.email || `Student ${studentId.slice(-6)}`;
    return `Student ${studentId.slice(-6)}`;
  };

  const getEntriesTabData = () => {
    if (!entriesTabStudent) return { sessions: [], entries: [] };
    return {
      sessions: allSessions.filter(s => s.studentId === entriesTabStudent),
      entries:  allEntries.filter(e => e.studentId === entriesTabStudent),
    };
  };

  const handleDayClick = (date: Date, sessions: Session[]) => {
    setSelectedDate(date);
    setSelectedDateSessions(sessions);
  };

  // ---- Stats Calculators (unchanged logic) ----
  const calculateGoalsStats = () => {
    const withOverview = filteredEntries.filter(e => e.gameOverview);
    if (withOverview.length === 0) return null;
    const totalGoodGoals = withOverview.reduce((sum, e) =>
      sum + (e.gameOverview?.goodGoals.period1 || 0) + (e.gameOverview?.goodGoals.period2 || 0) + (e.gameOverview?.goodGoals.period3 || 0), 0);
    const totalBadGoals = withOverview.reduce((sum, e) =>
      sum + (e.gameOverview?.badGoals.period1 || 0) + (e.gameOverview?.badGoals.period2 || 0) + (e.gameOverview?.badGoals.period3 || 0), 0);
    const avgGoodGoals = totalGoodGoals / withOverview.length;
    const avgBadGoals = totalBadGoals / withOverview.length;
    const mid = Math.floor(withOverview.length / 2);
    const firstHalf = withOverview.slice(0, mid);
    const secondHalf = withOverview.slice(mid);
    const firstHalfBad = firstHalf.reduce((sum, e) => sum + (e.gameOverview?.badGoals.period1 || 0) + (e.gameOverview?.badGoals.period2 || 0) + (e.gameOverview?.badGoals.period3 || 0), 0) / (firstHalf.length || 1);
    const secondHalfBad = secondHalf.reduce((sum, e) => sum + (e.gameOverview?.badGoals.period1 || 0) + (e.gameOverview?.badGoals.period2 || 0) + (e.gameOverview?.badGoals.period3 || 0), 0) / (secondHalf.length || 1);
    const improvement = ((firstHalfBad - secondHalfBad) / (firstHalfBad || 1)) * 100;
    return { avgGoodGoals: avgGoodGoals.toFixed(1), avgBadGoals: avgBadGoals.toFixed(1), totalGames: withOverview.length, improvement: improvement.toFixed(0), trend: improvement > 5 ? 'up' : improvement < -5 ? 'down' : 'stable' };
  };

  const calculateChallengeStats = () => {
    const withOverview = filteredEntries.filter(e => e.gameOverview);
    if (withOverview.length === 0) return null;
    const avgChallenge = withOverview.reduce((sum, e) => sum + ((e.gameOverview?.degreeOfChallenge.period1 || 0) + (e.gameOverview?.degreeOfChallenge.period2 || 0) + (e.gameOverview?.degreeOfChallenge.period3 || 0)) / 3, 0) / withOverview.length;
    const challenges = withOverview.map(e => ((e.gameOverview?.degreeOfChallenge.period1 || 0) + (e.gameOverview?.degreeOfChallenge.period2 || 0) + (e.gameOverview?.degreeOfChallenge.period3 || 0)) / 3);
    const variance = challenges.reduce((sum, c) => sum + Math.pow(c - avgChallenge, 2), 0) / challenges.length;
    const stdDev = Math.sqrt(variance);
    return { avgChallenge: avgChallenge.toFixed(1), consistency: stdDev < 1 ? 'High' : stdDev < 2 ? 'Medium' : 'Low', stdDev: stdDev.toFixed(1) };
  };

  const calculateFocusConsistency = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periods = [...filteredEntries.flatMap(e => [e.period1, e.period2, e.period3]).filter(Boolean)] as any[];
    if (periods.length === 0) return null;
    const consistentCount = periods.filter(p => p?.mindSet?.focusConsistent?.value).length;
    const inconsistentCount = periods.filter(p => p?.mindSet?.focusInconsistent?.value).length;
    const total = consistentCount + inconsistentCount;
    const percentage = total > 0 ? (consistentCount / total) * 100 : 0;
    const mid = Math.floor(periods.length / 2);
    const firstHalf = periods.slice(0, mid);
    const secondHalf = periods.slice(mid);
    const fhC = firstHalf.filter(p => p?.mindSet?.focusConsistent?.value).length / (firstHalf.length || 1);
    const shC = secondHalf.filter(p => p?.mindSet?.focusConsistent?.value).length / (secondHalf.length || 1);
    const trend = shC > fhC + 0.1 ? 'up' : shC < fhC - 0.1 ? 'down' : 'stable';
    return { percentage: percentage.toFixed(0), consistentCount, inconsistentCount, trend };
  };

  const calculateSkatingPerformance = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periods = [...filteredEntries.flatMap(e => [e.period1, e.period2, e.period3]).filter(Boolean)] as any[];
    if (periods.length === 0) return null;
    const inSyncCount = periods.filter(p => p?.skating?.inSync?.value).length;
    const notInSyncCount = periods.filter(p => p?.skating?.notInSync?.value).length;
    const total = inSyncCount + notInSyncCount;
    const percentage = total > 0 ? (inSyncCount / total) * 100 : 0;
    const mid = Math.floor(periods.length / 2);
    const fhIs = periods.slice(0, mid).filter(p => p?.skating?.inSync?.value).length / (mid || 1);
    const shIs = periods.slice(mid).filter(p => p?.skating?.inSync?.value).length / ((periods.length - mid) || 1);
    const trend = shIs > fhIs + 0.1 ? 'up' : shIs < fhIs - 0.1 ? 'down' : 'stable';
    return { percentage: percentage.toFixed(0), inSyncCount, notInSyncCount, trend };
  };

  const calculatePositionalPerformance = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periods = [...filteredEntries.flatMap(e => [e.period1, e.period2, e.period3]).filter(Boolean)] as any[];
    if (periods.length === 0) return null;
    const goodCount = periods.filter(p => p?.positionalAboveIcing?.good?.value || p?.positionalBelowIcing?.good?.value || p?.positionalBelowIcing?.strong?.value).length;
    const needsWorkCount = periods.filter(p => p?.positionalAboveIcing?.poor?.value || p?.positionalAboveIcing?.improving?.value || p?.positionalBelowIcing?.poor?.value || p?.positionalBelowIcing?.improving?.value).length;
    const total = goodCount + needsWorkCount;
    return { percentage: (total > 0 ? (goodCount / total) * 100 : 0).toFixed(0), goodCount, needsWorkCount };
  };

  const calculateTeamPlay = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const period3s = filteredEntries.map(e => e.period3).filter(Boolean) as any[];
    if (period3s.length === 0) return null;
    const defG = period3s.filter(p => p?.teamPlay?.settingUpDefense?.good?.value).length;
    const defI = period3s.filter(p => p?.teamPlay?.settingUpDefense?.improving?.value).length;
    const defP = period3s.filter(p => p?.teamPlay?.settingUpDefense?.poor?.value).length;
    const fwdG = period3s.filter(p => p?.teamPlay?.settingUpForwards?.good?.value).length;
    const fwdI = period3s.filter(p => p?.teamPlay?.settingUpForwards?.improving?.value).length;
    const fwdP = period3s.filter(p => p?.teamPlay?.settingUpForwards?.poor?.value).length;
    const defT = defG + defI + defP; const fwdT = fwdG + fwdI + fwdP;
    return { defensePercentage: (defT > 0 ? (defG / defT) * 100 : 0).toFixed(0), forwardsPercentage: (fwdT > 0 ? (fwdG / fwdT) * 100 : 0).toFixed(0), defenseGoodCount: defG, defenseImprovingCount: defI, defensePoorCount: defP, forwardsGoodCount: fwdG, forwardsImprovingCount: fwdI, forwardsPoorCount: fwdP };
  };

  const calculateDecisionMaking = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periods = [...filteredEntries.flatMap(e => [e.period1, e.period2, e.period3]).filter(Boolean)] as any[];
    if (periods.length === 0) return null;
    const strongCount = periods.filter(p => p?.mindSet?.decisionMakingStrong?.value).length;
    const improvingCount = periods.filter(p => p?.mindSet?.decisionMakingImproving?.value).length;
    const needsWorkCount = periods.filter(p => p?.mindSet?.decisionMakingNeedsWork?.value).length;
    const total = strongCount + improvingCount + needsWorkCount;
    return { strongPercentage: total > 0 ? ((strongCount / total) * 100).toFixed(0) : '0', improvingPercentage: total > 0 ? ((improvingCount / total) * 100).toFixed(0) : '0', needsWorkPercentage: total > 0 ? ((needsWorkCount / total) * 100).toFixed(0) : '0', strongCount, improvingCount, needsWorkCount, total };
  };

  const calculateBodyLanguage = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periods = [...filteredEntries.flatMap(e => [e.period1, e.period2, e.period3]).filter(Boolean)] as any[];
    if (periods.length === 0) return null;
    const consistentCount = periods.filter(p => p?.mindSet?.bodyLanguageConsistent?.value).length;
    const inconsistentCount = periods.filter(p => p?.mindSet?.bodyLanguageInconsistent?.value).length;
    const total = consistentCount + inconsistentCount;
    return { consistentPercentage: total > 0 ? ((consistentCount / total) * 100).toFixed(0) : '0', inconsistentPercentage: total > 0 ? ((inconsistentCount / total) * 100).toFixed(0) : '0', consistentCount, inconsistentCount, total };
  };

  const calculateReboundControl = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periods = [...filteredEntries.flatMap(e => [e.period1, e.period2, e.period3]).filter(Boolean)] as any[];
    if (periods.length === 0) return null;
    const poorQ = periods.filter(p => p?.reboundControl?.poor?.value).length;
    const improvQ = periods.filter(p => p?.reboundControl?.improving?.value).length;
    const goodQ = periods.filter(p => p?.reboundControl?.good?.value).length;
    const qualityTotal = poorQ + improvQ + goodQ;
    const consistentCount = periods.filter(p => p?.reboundControl?.consistent?.value).length;
    const inconsistentCount = periods.filter(p => p?.reboundControl?.inconsistent?.value).length;
    const consistencyTotal = consistentCount + inconsistentCount;
    return { qualityGood: (qualityTotal > 0 ? (goodQ / qualityTotal) * 100 : 0).toFixed(0), consistencyPercentage: (consistencyTotal > 0 ? (consistentCount / consistencyTotal) * 100 : 0).toFixed(0), goodCount: goodQ, consistentCount, totalQuality: qualityTotal, totalConsistency: consistencyTotal };
  };

  const calculateFreezingPuck = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periods = [...filteredEntries.flatMap(e => [e.period1, e.period2, e.period3]).filter(Boolean)] as any[];
    if (periods.length === 0) return null;
    const poorQ = periods.filter(p => p?.freezingPuck?.poor?.value).length;
    const improvQ = periods.filter(p => p?.freezingPuck?.improving?.value).length;
    const goodQ = periods.filter(p => p?.freezingPuck?.good?.value).length;
    const qualityTotal = poorQ + improvQ + goodQ;
    const consistentCount = periods.filter(p => p?.freezingPuck?.consistent?.value).length;
    const inconsistentCount = periods.filter(p => p?.freezingPuck?.inconsistent?.value).length;
    const consistencyTotal = consistentCount + inconsistentCount;
    return { qualityGood: (qualityTotal > 0 ? (goodQ / qualityTotal) * 100 : 0).toFixed(0), consistencyPercentage: (consistencyTotal > 0 ? (consistentCount / consistencyTotal) * 100 : 0).toFixed(0), goodCount: goodQ, consistentCount, totalQuality: qualityTotal, totalConsistency: consistencyTotal };
  };

  const calculatePreGameStats = () => {
    const preGames = filteredEntries.filter(e => e.preGame).map(e => e.preGame!);
    if (preGames.length === 0) return null;
    const equipmentReady = preGames.filter(p => p.gameReadiness?.wellRested?.value && p.gameReadiness?.fueledForGame?.value).length;
    const mentalPrep = preGames.filter(p => p.mindSet?.mindCleared?.value && p.mindSet?.mentalImagery?.value).length;
    const warmup = preGames.filter(p => p.warmUp?.lookedEngaged?.value && !p.warmUp?.lackedFocus?.value).length;
    const physical = preGames.filter(p => p.preGameRoutine?.ballExercises?.value && p.preGameRoutine?.stretching?.value).length;
    return { equipment: ((equipmentReady / preGames.length) * 100).toFixed(0), mental: ((mentalPrep / preGames.length) * 100).toFixed(0), warmup: ((warmup / preGames.length) * 100).toFixed(0), physical: ((physical / preGames.length) * 100).toFixed(0), total: preGames.length };
  };

  const calculatePostGameStats = () => {
    const postGames = filteredEntries.filter(e => e.postGame);
    if (postGames.length === 0) return null;
    const completed = postGames.filter(e => e.postGame?.reviewCompleted?.value).length;
    return { completionRate: ((completed / postGames.length) * 100).toFixed(0), completed, total: postGames.length };
  };

  const goalsStats     = calculateGoalsStats();
  const challengeStats = calculateChallengeStats();
  const focusStats     = calculateFocusConsistency();
  const skatingStats   = calculateSkatingPerformance();
  const positionalStats = calculatePositionalPerformance();
  const teamPlayStats  = calculateTeamPlay();
  const decisionMaking = calculateDecisionMaking();
  const bodyLanguage   = calculateBodyLanguage();
  const reboundControl = calculateReboundControl();
  const freezingPuck   = calculateFreezingPuck();
  const preGameStats   = calculatePreGameStats();
  const postGameStats  = calculatePostGameStats();

  const totalSessions  = new Set(filteredEntries.map(e => e.sessionId)).size;
  const completeEntries = filteredEntries.filter(e => e.preGame && e.gameOverview && e.period1 && e.period2 && e.period3 && e.postGame).length;
  const completionRate  = filteredEntries.length > 0 ? (completeEntries / filteredEntries.length) * 100 : 0;

  const getTrendIcon = (trend: string) => {
    if (trend === 'up')   return <TrendingUp  size={18} color={GREEN} />;
    if (trend === 'down') return <TrendingDown size={18} color={RED} />;
    return <Minus size={18} color="rgba(255,255,255,0.4)" />;
  };

  // ---- Dark progress bar helper ----
  const ProgressBar = ({ value, color }: { value: string | number; color: string }) => (
    <div style={{ width: '100%', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '4px', transition: 'width 0.5s' }} />
    </div>
  );

  // ---- Dark metric panel ----
  const MetricPanel = ({ title, value, label, color, detail, trend }: { title: string; value: string; label: string; color: string; detail: string; trend?: string }) => (
    <div style={{ background: `${color}0d`, border: `1px solid ${color}30`, borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: 600, margin: 0 }}>{title}</p>
        {trend && getTrendIcon(trend)}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '10px' }}>
        <p style={{ fontSize: '36px', fontWeight: 700, color, margin: 0 }}>{value}</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '4px' }}>{label}</p>
      </div>
      <ProgressBar value={value} color={color} />
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '6px' }}>{detail}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <SkeletonDarkPage />
      </div>
    );
  }

  const TABS = [
    { id: 'overview' as const,     label: 'Overview' },
    { id: 'performance' as const,  label: 'Performance Metrics' },
    { id: 'entries' as const,      label: 'All Entries' },
  ];

  return (
    <>
      <style>{`
        .ach-search::placeholder { color: rgba(255,255,255,0.3); }
        .ach-search { color: #fff; background: rgba(255,255,255,0.05); border: 1px solid rgba(55,181,255,0.18); border-radius: 10px; padding: 10px 12px 10px 36px; width: 100%; outline: none; }
        .ach-search:focus { border-color: rgba(55,181,255,0.45); }
        .ach-sel { color: #fff; background: rgba(255,255,255,0.05); border: 1px solid rgba(55,181,255,0.18); border-radius: 10px; padding: 10px 12px; outline: none; width: 100%; }
        .ach-sel:focus { border-color: rgba(55,181,255,0.45); }
        .ach-sel option { background: #0a1628; color: #fff; }
        .ach-btn:hover { background: rgba(55,181,255,0.15) !important; }
        .ach-btn-outline:hover { background: rgba(255,255,255,0.08) !important; }
        .ach-row:hover { border-color: rgba(55,181,255,0.35) !important; background: rgba(55,181,255,0.04) !important; }
        .ach-view-btn:hover { background: rgba(55,181,255,0.18) !important; }
      `}</style>

      <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: 0 }}>Charting Analytics</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: '6px', fontSize: '15px' }}>Comprehensive charting statistics and student performance data</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="ach-btn" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(55,181,255,0.25)', background: 'rgba(55,181,255,0.08)', color: BLUE, fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <RefreshCw size={14} /> Refresh
              </button>
              <button className="ach-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <Download size={14} /> Export Data
              </button>
            </div>
          </div>

          {/* Filters Card */}
          <div style={{ ...card, padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student</label>
                <select className="ach-sel" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                  <option value="all">All Students ({uniqueStudents.length})</option>
                  {uniqueStudents.map(sid => <option key={sid} value={sid}>{getStudentName(sid)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Period</label>
                <select className="ach-sel" value={timeRange} onChange={e => setTimeRange(e.target.value as TimeRange)}>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                  <input className="ach-search" placeholder="Search by opponent, location, or comments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Buttons */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === tab.id ? BLUE : 'rgba(255,255,255,0.45)', fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '15px', borderBottom: activeTab === tab.id ? `2px solid ${BLUE}` : '2px solid transparent', marginBottom: '-1px', transition: 'all 0.2s' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px' }}>
                {[
                  { label: 'Total Sessions', value: totalSessions, sub: `${filteredEntries.length} charting entries`, icon: <Calendar size={16} />, color: BLUE },
                  { label: 'Completion Rate', value: `${completionRate.toFixed(1)}%`, sub: `${completeEntries} complete entries`, icon: <Activity size={16} />, color: GREEN },
                  goalsStats ? { label: 'Avg Goals/Game', value: `${goalsStats.avgGoodGoals}/${goalsStats.avgBadGoals}`, sub: 'Good / Bad', icon: <Target size={16} />, color: AMBER } : null,
                  goalsStats ? { label: 'Improvement', value: `${goalsStats.improvement}%`, sub: 'Bad goals reduction', icon: getTrendIcon(goalsStats.trend), color: goalsStats.trend === 'up' ? GREEN : goalsStats.trend === 'down' ? RED : 'rgba(255,255,255,0.4)' } : null,
                ].filter(Boolean).map((s, i) => s && (
                  <div key={i} style={{ ...card, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${s.color}66,transparent)` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0 }}>{s.label}</p>
                      <span style={{ color: s.color, opacity: 0.7 }}>{s.icon}</span>
                    </div>
                    <p style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{s.value}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Goals Performance */}
              {goalsStats && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Goals Performance</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px' }}>
                    <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '16px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 6px' }}>Avg Good Goals/Game</p>
                      <p style={{ fontSize: '32px', fontWeight: 700, color: GREEN, margin: '0 0 4px' }}>{goalsStats.avgGoodGoals}</p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>Across {goalsStats.totalGames} games</p>
                    </div>
                    <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>Avg Bad Goals/Game</p>
                        {getTrendIcon(goalsStats.trend)}
                      </div>
                      <p style={{ fontSize: '32px', fontWeight: 700, color: RED, margin: '0 0 4px' }}>{goalsStats.avgBadGoals}</p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>{goalsStats.improvement}% vs earlier period</p>
                    </div>
                    <div style={{ background: `rgba(55,181,255,0.08)`, border: `1px solid rgba(55,181,255,0.2)`, borderRadius: '12px', padding: '16px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 6px' }}>Good/Bad Ratio</p>
                      <p style={{ fontSize: '32px', fontWeight: 700, color: BLUE, margin: '0 0 4px' }}>
                        {(parseFloat(goalsStats.avgGoodGoals) / parseFloat(goalsStats.avgBadGoals) || 0).toFixed(2)}:1
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>
                        {parseFloat(goalsStats.avgGoodGoals) > parseFloat(goalsStats.avgBadGoals) ? '✓ More good than bad' : '⚠ Work on reducing bad goals'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Challenge & Consistency */}
              {challengeStats && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Challenge Level & Consistency</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>
                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '16px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 6px' }}>Average Challenge Rating</p>
                      <p style={{ fontSize: '32px', fontWeight: 700, color: '#818cf8', margin: '0 0 4px' }}>{challengeStats.avgChallenge}<span style={{ fontSize: '15px' }}>/10</span></p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>
                        {parseFloat(challengeStats.avgChallenge) < 4 ? 'Easier games' : parseFloat(challengeStats.avgChallenge) < 7 ? 'Moderate difficulty' : 'High difficulty games'}
                      </p>
                    </div>
                    <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px', padding: '16px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 6px' }}>Challenge Consistency</p>
                      <p style={{ fontSize: '32px', fontWeight: 700, color: '#c084fc', margin: '0 0 4px' }}>{challengeStats.consistency}</p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>σ = {challengeStats.stdDev} (standard deviation)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* MindSet Performance */}
              {focusStats && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>MindSet Performance</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>
                    <MetricPanel title="Focus Consistency" value={focusStats.percentage} label="consistent" color="#14b8a6" detail={`${focusStats.consistentCount} consistent / ${focusStats.inconsistentCount} inconsistent periods`} trend={focusStats.trend} />
                    {skatingStats && (
                      <MetricPanel title="Skating In Sync" value={skatingStats.percentage} label="in sync" color="#06b6d4" detail={`${skatingStats.inSyncCount} in sync / ${skatingStats.notInSyncCount} not in sync periods`} trend={skatingStats.trend} />
                    )}
                  </div>
                </div>
              )}

              {/* Positional Performance */}
              {positionalStats && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Positional Performance</h2>
                  <MetricPanel title="Strong Positioning" value={positionalStats.percentage} label="good/strong" color={AMBER} detail={`${positionalStats.goodCount} good/strong / ${positionalStats.needsWorkCount} needs work periods`} />
                </div>
              )}

              {/* Pre-Game Preparation */}
              {preGameStats && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Pre-Game Preparation</h2>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '20px' }}>Adherence rates across {preGameStats.total} sessions</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px' }}>
                    {[
                      { label: 'Equipment Ready', value: preGameStats.equipment, color: BLUE },
                      { label: 'Mental Prep',     value: preGameStats.mental,    color: '#a78bfa' },
                      { label: 'Warm-Up',         value: preGameStats.warmup,    color: AMBER },
                      { label: 'Physical',        value: preGameStats.physical,  color: GREEN },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, margin: 0 }}>{item.label}</p>
                          <span style={{ background: `${item.color}1a`, color: item.color, border: `1px solid ${item.color}40`, borderRadius: '10px', padding: '1px 8px', fontSize: '12px', fontWeight: 600 }}>{item.value}%</span>
                        </div>
                        <ProgressBar value={item.value} color={item.color} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Post-Game Review */}
              {postGameStats && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Post-Game Review</h2>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', marginBottom: '4px' }}>Review Completion Rate</p>
                      <p style={{ fontSize: '36px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{postGameStats.completionRate}%</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: 0 }}>{postGameStats.completed} of {postGameStats.total} sessions reviewed</p>
                    </div>
                    <div style={{ width: '100px', height: '100px' }}>
                      <svg width="100" height="100" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.07)" strokeWidth="8" fill="none" />
                        <circle cx="64" cy="64" r="56" stroke={BLUE} strokeWidth="8" fill="none"
                          strokeDasharray={`${(parseFloat(postGameStats.completionRate) / 100) * 352} 352`} strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== PERFORMANCE METRICS TAB ===== */}
          {activeTab === 'performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(decisionMaking || bodyLanguage) && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Decision Making & Body Language</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>
                    {decisionMaking && <MetricPanel title="Decision Making — Strong" value={decisionMaking.strongPercentage} label="strong" color="#10b981" detail={`${decisionMaking.strongCount} strong / ${decisionMaking.improvingCount} improving / ${decisionMaking.needsWorkCount} needs work`} />}
                    {bodyLanguage && <MetricPanel title="Body Language" value={bodyLanguage.consistentPercentage} label="consistent" color="#84cc16" detail={`${bodyLanguage.consistentCount} consistent / ${bodyLanguage.inconsistentCount} inconsistent`} />}
                  </div>
                </div>
              )}

              {reboundControl && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Rebound Control</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>
                    <MetricPanel title="Quality" value={reboundControl.qualityGood} label="good" color="#8b5cf6" detail={`${reboundControl.goodCount} good / ${reboundControl.totalQuality} total`} />
                    <MetricPanel title="Consistency" value={reboundControl.consistencyPercentage} label="consistent" color="#d946ef" detail={`${reboundControl.consistentCount} consistent / ${reboundControl.totalConsistency} total`} />
                  </div>
                </div>
              )}

              {freezingPuck && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Freezing Puck</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>
                    <MetricPanel title="Quality" value={freezingPuck.qualityGood} label="good" color="#ec4899" detail={`${freezingPuck.goodCount} good / ${freezingPuck.totalQuality} total`} />
                    <MetricPanel title="Consistency" value={freezingPuck.consistencyPercentage} label="consistent" color="#f43f5e" detail={`${freezingPuck.consistentCount} consistent / ${freezingPuck.totalConsistency} total`} />
                  </div>
                </div>
              )}

              {teamPlayStats && (
                <div style={{ ...card, padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Team Play (Period 3)</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>
                    <MetricPanel title="Setting Up Defense" value={teamPlayStats.defensePercentage} label="good" color="#0ea5e9" detail={`${teamPlayStats.defenseGoodCount} good / ${teamPlayStats.defenseImprovingCount} improving / ${teamPlayStats.defensePoorCount} poor`} />
                    <MetricPanel title="Setting Up Forwards" value={teamPlayStats.forwardsPercentage} label="good" color="#64748b" detail={`${teamPlayStats.forwardsGoodCount} good / ${teamPlayStats.forwardsImprovingCount} improving / ${teamPlayStats.forwardsPoorCount} poor`} />
                  </div>
                </div>
              )}

              {!decisionMaking && !bodyLanguage && !reboundControl && !freezingPuck && !teamPlayStats && (
                <div style={{ ...card, padding: '64px', textAlign: 'center' }}>
                  <BarChart3 size={48} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>No performance data available for the selected filters.</p>
                </div>
              )}
            </div>
          )}

          {/* ===== ALL ENTRIES TAB ===== */}
          {activeTab === 'entries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Select Student */}
              <div style={{ ...card, padding: '24px' }}>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Select Student</h2>
                <div style={{ maxWidth: '400px' }}>
                  <select className="ach-sel" value={entriesTabStudent} onChange={e => setEntriesTabStudent(e.target.value)}>
                    <option value="">Choose a student to view their sessions...</option>
                    {uniqueStudents.map(sid => <option key={sid} value={sid}>{getStudentName(sid)}</option>)}
                  </select>
                </div>
              </div>

              {entriesTabStudent && (
                <>
                  {/* Calendar Heatmap */}
                  <div style={{ ...card, padding: '24px' }}>
                    <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
                      Session Calendar — {getStudentName(entriesTabStudent)}
                    </h2>
                    <CalendarHeatmap
                      sessions={getEntriesTabData().sessions}
                      chartingEntries={getEntriesTabData().entries}
                      onDayClick={handleDayClick}
                    />
                  </div>

                  {/* Sessions for Selected Date */}
                  {selectedDate && selectedDateSessions.length > 0 && (
                    <div style={{ ...card, padding: '24px' }}>
                      <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
                        Sessions on {format(selectedDate, 'MMMM d, yyyy')}
                      </h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedDateSessions.map(session => {
                          const entry = allEntries.find(e => e.sessionId === session.id);
                          const isComplete = entry && !!(entry.preGame && entry.gameOverview && entry.period1 && entry.period2 && entry.period3 && entry.postGame);
                          return (
                            <div key={session.id} className="ach-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', transition: 'all 0.2s', cursor: 'default' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                  <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: 0 }}>
                                    {session.type === 'game' ? '🥅' : '🏒'} {session.opponent || 'Practice Session'}
                                  </h3>
                                  {entry ? (
                                    <span style={{ background: isComplete ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.07)', color: isComplete ? GREEN : 'rgba(255,255,255,0.5)', border: `1px solid ${isComplete ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '10px', padding: '1px 8px', fontSize: '12px', fontWeight: 600 }}>
                                      {isComplete ? 'Complete' : 'Partial'}
                                    </span>
                                  ) : (
                                    <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '1px 8px', fontSize: '12px' }}>Not Charted</span>
                                  )}
                                  {entry?.submitterRole === 'admin' && (
                                    <span style={{ background: `rgba(55,181,255,0.1)`, color: BLUE, border: `1px solid rgba(55,181,255,0.25)`, borderRadius: '10px', padding: '1px 8px', fontSize: '12px' }}>Admin Entry</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                  {session.location && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>📍 {session.location}</span>}
                                  {entry && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Submitted {entry.submittedAt?.toDate ? entry.submittedAt.toDate().toLocaleDateString() : 'Unknown'}</span>}
                                </div>
                                {entry?.gameOverview && (
                                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                                    <span style={{ color: GREEN, fontSize: '13px' }}>✅ Good Goals: {(entry.gameOverview.goodGoals.period1 || 0) + (entry.gameOverview.goodGoals.period2 || 0) + (entry.gameOverview.goodGoals.period3 || 0)}</span>
                                    <span style={{ color: RED, fontSize: '13px' }}>❌ Bad Goals: {(entry.gameOverview.badGoals.period1 || 0) + (entry.gameOverview.badGoals.period2 || 0) + (entry.gameOverview.badGoals.period3 || 0)}</span>
                                  </div>
                                )}
                              </div>
                              {entry && (
                                <button className="ach-view-btn" onClick={() => router.push(`/admin/charting/entries/${entry.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: `1px solid rgba(55,181,255,0.25)`, background: `rgba(55,181,255,0.08)`, color: BLUE, fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                                  <Eye size={14} /> View Details
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedDate && selectedDateSessions.length === 0 && (
                    <div style={{ ...card, padding: '64px', textAlign: 'center' }}>
                      <Calendar size={48} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
                      <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No Sessions</h3>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', margin: 0 }}>No sessions found for {format(selectedDate, 'MMMM d, yyyy')}</p>
                    </div>
                  )}

                  {!selectedDate && (
                    <div style={{ ...card, padding: '64px', textAlign: 'center' }}>
                      <Calendar size={48} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
                      <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Select a Date</h3>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', margin: 0 }}>Click on a day in the calendar above to view sessions for that date</p>
                    </div>
                  )}
                </>
              )}

              {!entriesTabStudent && (
                <div style={{ ...card, padding: '64px', textAlign: 'center' }}>
                  <BarChart3 size={48} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
                  <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Get Started</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', margin: 0 }}>Select a student above to view their charting calendar and sessions</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
