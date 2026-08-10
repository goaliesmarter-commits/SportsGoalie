'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { SkeletonAnalytics } from '@/components/ui/skeletons';
import { chartingService } from '@/lib/database';
import { Session, ChartingEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Brain,
  Target,
  Video,
  Eye,
  Flame,
  Sparkles,
  ShieldCheck,
  Timer,
  Dumbbell,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { startOfWeek, startOfMonth, subMonths } from 'date-fns';

type TimeRange = 'week' | 'month' | '3months' | 'all';

// ── style helpers — match charting page ──────────────────────────────────────
const CYAN   = '#37b5ff';
const MINT   = '#34d399';
const VIOLET = '#7dd3fc';
const CORAL  = '#f87171';
const MUTED  = 'rgba(255,255,255,0.38)';
const LABEL  = 'rgba(255,255,255,0.55)';
const innerCard = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as const;
const divider = { borderColor: 'rgba(255,255,255,0.07)' } as const;

export default function ChartingAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [entries, setEntries] = useState<ChartingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [openV2Game, setOpenV2Game] = useState(false);
  const [openV2Practice, setOpenV2Practice] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [sessionsResult, allEntriesResult] = await Promise.all([
        chartingService.getSessionsByStudent(user.id, { limit: 500, orderBy: 'date', orderDirection: 'desc' }),
        chartingService.getChartingEntriesByStudent(user.id),
      ]);
      if (sessionsResult.success && sessionsResult.data) setSessions(sessionsResult.data);
      if (allEntriesResult.success && allEntriesResult.data) setEntries(allEntriesResult.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSessions = () => {
    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case 'week': startDate = startOfWeek(now); break;
      case 'month': startDate = startOfMonth(now); break;
      case '3months': startDate = subMonths(now, 3); break;
      default: return sessions;
    }
    return sessions.filter((s) => {
      const sessionDate = toDateSafe((s as unknown as { date?: unknown }).date);
      return sessionDate ? sessionDate >= startDate : false;
    });
  };

  const getFilteredEntries = () => {
    const filteredSessions = getFilteredSessions();
    const sessionIds = new Set(filteredSessions.map((s) => s.id));
    return entries.filter((e) => sessionIds.has(e.sessionId));
  };

  const calculateGoalsStats = () => {
    const filtered = getFilteredEntries();
    const withOverview = filtered.filter((e) => e.gameOverview);
    if (withOverview.length === 0) return null;
    const totalGoodGoals = withOverview.reduce((sum, e) => sum + (e.gameOverview?.goodGoals.period1 || 0) + (e.gameOverview?.goodGoals.period2 || 0) + (e.gameOverview?.goodGoals.period3 || 0), 0);
    const totalBadGoals = withOverview.reduce((sum, e) => sum + (e.gameOverview?.badGoals.period1 || 0) + (e.gameOverview?.badGoals.period2 || 0) + (e.gameOverview?.badGoals.period3 || 0), 0);
    const avgGoodGoals = totalGoodGoals / withOverview.length;
    const avgBadGoals = totalBadGoals / withOverview.length;
    const midPoint = Math.floor(withOverview.length / 2);
    const firstHalf = withOverview.slice(0, midPoint);
    const secondHalf = withOverview.slice(midPoint);
    const firstHalfBadGoals = firstHalf.reduce((sum, e) => sum + (e.gameOverview?.badGoals.period1 || 0) + (e.gameOverview?.badGoals.period2 || 0) + (e.gameOverview?.badGoals.period3 || 0), 0) / (firstHalf.length || 1);
    const secondHalfBadGoals = secondHalf.reduce((sum, e) => sum + (e.gameOverview?.badGoals.period1 || 0) + (e.gameOverview?.badGoals.period2 || 0) + (e.gameOverview?.badGoals.period3 || 0), 0) / (secondHalf.length || 1);
    const improvement = ((firstHalfBadGoals - secondHalfBadGoals) / (firstHalfBadGoals || 1)) * 100;
    return { avgGoodGoals: avgGoodGoals.toFixed(1), avgBadGoals: avgBadGoals.toFixed(1), totalGames: withOverview.length, improvement: improvement.toFixed(0), trend: improvement > 5 ? 'up' : improvement < -5 ? 'down' : 'stable' };
  };

  const calculateChallengeStats = () => {
    const filtered = getFilteredEntries();
    const withOverview = filtered.filter((e) => e.gameOverview);
    if (withOverview.length === 0) return null;
    const avgChallenge = withOverview.reduce((sum, e) => sum + ((e.gameOverview?.degreeOfChallenge.period1 || 0) + (e.gameOverview?.degreeOfChallenge.period2 || 0) + (e.gameOverview?.degreeOfChallenge.period3 || 0)) / 3, 0) / withOverview.length;
    const challenges = withOverview.map((e) => ((e.gameOverview?.degreeOfChallenge.period1 || 0) + (e.gameOverview?.degreeOfChallenge.period2 || 0) + (e.gameOverview?.degreeOfChallenge.period3 || 0)) / 3);
    const variance = challenges.reduce((sum, c) => sum + Math.pow(c - avgChallenge, 2), 0) / challenges.length;
    const stdDev = Math.sqrt(variance);
    return { avgChallenge: avgChallenge.toFixed(1), consistency: stdDev < 1 ? 'High' : stdDev < 2 ? 'Medium' : 'Low', stdDev: stdDev.toFixed(1) };
  };

  const calculateFocusConsistency = () => {
    const filtered = getFilteredEntries();
    const periods = [...filtered.flatMap((e) => [e.period1, e.period2, e.period3]).filter(Boolean)];
    if (periods.length === 0) return null;
    const consistentCount = periods.filter((p: any) => p?.mindSet?.focusConsistent?.value).length;
    const inconsistentCount = periods.filter((p: any) => p?.mindSet?.focusInconsistent?.value).length;
    const total = consistentCount + inconsistentCount;
    const percentage = total > 0 ? (consistentCount / total) * 100 : 0;
    const midPoint = Math.floor(periods.length / 2);
    const firstHalf = periods.slice(0, midPoint);
    const secondHalf = periods.slice(midPoint);
    const firstHalfConsistent = firstHalf.filter((p: any) => p?.mindSet?.focusConsistent?.value).length / (firstHalf.length || 1);
    const secondHalfConsistent = secondHalf.filter((p: any) => p?.mindSet?.focusConsistent?.value).length / (secondHalf.length || 1);
    const trend = secondHalfConsistent > firstHalfConsistent + 0.1 ? 'up' : secondHalfConsistent < firstHalfConsistent - 0.1 ? 'down' : 'stable';
    return { percentage: percentage.toFixed(0), consistentCount, inconsistentCount, trend };
  };

  const calculateSkatingPerformance = () => {
    const filtered = getFilteredEntries();
    const periods = [...filtered.flatMap((e) => [e.period1, e.period2, e.period3]).filter(Boolean)];
    if (periods.length === 0) return null;
    const inSyncCount = periods.filter((p: any) => p?.skating?.inSync?.value).length;
    const notInSyncCount = periods.filter((p: any) => p?.skating?.notInSync?.value).length;
    const total = inSyncCount + notInSyncCount;
    const percentage = total > 0 ? (inSyncCount / total) * 100 : 0;
    const midPoint = Math.floor(periods.length / 2);
    const firstHalf = periods.slice(0, midPoint);
    const secondHalf = periods.slice(midPoint);
    const firstHalfInSync = firstHalf.filter((p: any) => p?.skating?.inSync?.value).length / (firstHalf.length || 1);
    const secondHalfInSync = secondHalf.filter((p: any) => p?.skating?.inSync?.value).length / (secondHalf.length || 1);
    const trend = secondHalfInSync > firstHalfInSync + 0.1 ? 'up' : secondHalfInSync < firstHalfInSync - 0.1 ? 'down' : 'stable';
    return { percentage: percentage.toFixed(0), inSyncCount, notInSyncCount, trend };
  };

  const calculatePositionalPerformance = () => {
    const filtered = getFilteredEntries();
    const periods = [...filtered.flatMap((e) => [e.period1, e.period2, e.period3]).filter(Boolean)];
    if (periods.length === 0) return null;
    const goodCount = periods.filter((p: any) => p?.positionalAboveIcing?.good?.value || p?.positionalBelowIcing?.good?.value || p?.positionalBelowIcing?.strong?.value).length;
    const needsWorkCount = periods.filter((p: any) => p?.positionalAboveIcing?.poor?.value || p?.positionalAboveIcing?.improving?.value || p?.positionalBelowIcing?.poor?.value || p?.positionalBelowIcing?.improving?.value).length;
    const total = goodCount + needsWorkCount;
    const percentage = total > 0 ? (goodCount / total) * 100 : 0;
    return { percentage: percentage.toFixed(0), goodCount, needsWorkCount };
  };

  const calculateDecisionMaking = () => {
    const filtered = getFilteredEntries();
    const periods = [...filtered.flatMap((e) => [e.period1, e.period2, e.period3]).filter(Boolean)];
    if (periods.length === 0) return null;
    const strongCount = periods.filter((p: any) => p?.mindSet?.decisionMakingStrong?.value).length;
    const improvingCount = periods.filter((p: any) => p?.mindSet?.decisionMakingImproving?.value).length;
    const needsWorkCount = periods.filter((p: any) => p?.mindSet?.decisionMakingNeedsWork?.value).length;
    const total = strongCount + improvingCount + needsWorkCount;
    const strongPercentage = total > 0 ? (strongCount / total) * 100 : 0;
    return { strongPercentage: strongPercentage.toFixed(0), strongCount, improvingCount, needsWorkCount, total };
  };

  const calculateBodyLanguage = () => {
    const filtered = getFilteredEntries();
    const periods = [...filtered.flatMap((e) => [e.period1, e.period2, e.period3]).filter(Boolean)];
    if (periods.length === 0) return null;
    const consistentCount = periods.filter((p: any) => p?.mindSet?.bodyLanguageConsistent?.value).length;
    const inconsistentCount = periods.filter((p: any) => p?.mindSet?.bodyLanguageInconsistent?.value).length;
    const total = consistentCount + inconsistentCount;
    const percentage = total > 0 ? (consistentCount / total) * 100 : 0;
    return { percentage: percentage.toFixed(0), consistentCount, inconsistentCount };
  };

  const calculateReboundControl = () => {
    const filtered = getFilteredEntries();
    const periods = [...filtered.flatMap((e) => [e.period1, e.period2, e.period3]).filter(Boolean)];
    if (periods.length === 0) return null;
    const goodCount = periods.filter((p: any) => p?.reboundControl?.reboundQualityGood?.value).length;
    const improvingCount = periods.filter((p: any) => p?.reboundControl?.reboundQualityImproving?.value).length;
    const poorCount = periods.filter((p: any) => p?.reboundControl?.reboundQualityPoor?.value).length;
    const consistentCount = periods.filter((p: any) => p?.reboundControl?.reboundConsistencyConsistent?.value).length;
    const inconsistentCount = periods.filter((p: any) => p?.reboundControl?.reboundConsistencyInconsistent?.value).length;
    const qualityTotal = goodCount + improvingCount + poorCount;
    const consistencyTotal = consistentCount + inconsistentCount;
    return { qualityPercentage: (qualityTotal > 0 ? (goodCount / qualityTotal) * 100 : 0).toFixed(0), consistencyPercentage: (consistencyTotal > 0 ? (consistentCount / consistencyTotal) * 100 : 0).toFixed(0), goodCount, improvingCount, poorCount, consistentCount, inconsistentCount };
  };

  const toDateSafe = (value: unknown): Date | null => {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
      const converted = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(converted.getTime()) ? null : converted;
    }
    if (value && typeof value === 'object') {
      const maybeSeconds = (value as { seconds?: unknown; _seconds?: unknown }).seconds ?? (value as { seconds?: unknown; _seconds?: unknown })._seconds;
      if (typeof maybeSeconds === 'number') {
        const parsed = new Date(maybeSeconds * 1000);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const hasLegacyEntry = (sessionId: string) => entries.some((e) => e.sessionId === sessionId);
  const getSessionDisplayStatus = (session: Session): 'completed' | 'charted' | 'in-progress' | 'scheduled' => {
    if (session.status === 'completed') return 'completed';
    if (session.status === 'in-progress') return 'in-progress';
    if (session.status === 'pre-game' || session.status === 'scheduled') return 'scheduled';
    if (hasLegacyEntry(session.id)) return 'charted';
    return 'in-progress';
  };

  const calculateFreezingPuck = () => {
    const filtered = getFilteredEntries();
    const periods = [...filtered.flatMap((e) => [e.period1, e.period2, e.period3]).filter(Boolean)];
    if (periods.length === 0) return null;
    const goodCount = periods.filter((p: any) => p?.freezingPuck?.freezingQualityGood?.value).length;
    const improvingCount = periods.filter((p: any) => p?.freezingPuck?.freezingQualityImproving?.value).length;
    const poorCount = periods.filter((p: any) => p?.freezingPuck?.freezingQualityPoor?.value).length;
    const consistentCount = periods.filter((p: any) => p?.freezingPuck?.freezingConsistencyConsistent?.value).length;
    const inconsistentCount = periods.filter((p: any) => p?.freezingPuck?.freezingConsistencyInconsistent?.value).length;
    const qualityTotal = goodCount + improvingCount + poorCount;
    const consistencyTotal = consistentCount + inconsistentCount;
    return { qualityPercentage: (qualityTotal > 0 ? (goodCount / qualityTotal) * 100 : 0).toFixed(0), consistencyPercentage: (consistencyTotal > 0 ? (consistentCount / consistencyTotal) * 100 : 0).toFixed(0), goodCount, improvingCount, poorCount, consistentCount, inconsistentCount };
  };

  const calculateTeamPlay = () => {
    const filtered = getFilteredEntries();
    const period3s = filtered.map((e) => e.period3).filter(Boolean);
    if (period3s.length === 0) return null;
    const defenseGoodCount = period3s.filter((p: any) => p?.teamPlay?.settingUpDefense?.good?.value).length;
    const defenseImprovingCount = period3s.filter((p: any) => p?.teamPlay?.settingUpDefense?.improving?.value).length;
    const defensePoorCount = period3s.filter((p: any) => p?.teamPlay?.settingUpDefense?.poor?.value).length;
    const forwardsGoodCount = period3s.filter((p: any) => p?.teamPlay?.settingUpForwards?.good?.value).length;
    const forwardsImprovingCount = period3s.filter((p: any) => p?.teamPlay?.settingUpForwards?.improving?.value).length;
    const forwardsPoorCount = period3s.filter((p: any) => p?.teamPlay?.settingUpForwards?.poor?.value).length;
    const defenseTotal = defenseGoodCount + defenseImprovingCount + defensePoorCount;
    const forwardsTotal = forwardsGoodCount + forwardsImprovingCount + forwardsPoorCount;
    return { defensePercentage: (defenseTotal > 0 ? (defenseGoodCount / defenseTotal) * 100 : 0).toFixed(0), forwardsPercentage: (forwardsTotal > 0 ? (forwardsGoodCount / forwardsTotal) * 100 : 0).toFixed(0), defenseGoodCount, defenseImprovingCount, defensePoorCount, forwardsGoodCount, forwardsImprovingCount, forwardsPoorCount };
  };

  const calculatePreGameStats = () => {
    const filtered = getFilteredEntries();
    const preGameEntries = filtered.filter((e) => e.preGame);
    if (preGameEntries.length === 0) return null;
    const equipmentYes = preGameEntries.filter((e) => e.preGame?.equipment?.value).length;
    const mentalPrepYes = preGameEntries.filter((e) => e.preGame?.mentalPrep?.value).length;
    const warmupYes = preGameEntries.filter((e) => e.preGame?.warmup?.value).length;
    const physicalYes = preGameEntries.filter((e) => e.preGame?.physical?.value).length;
    const total = preGameEntries.length;
    return { equipmentPercentage: ((equipmentYes / total) * 100).toFixed(0), mentalPrepPercentage: ((mentalPrepYes / total) * 100).toFixed(0), warmupPercentage: ((warmupYes / total) * 100).toFixed(0), physicalPercentage: ((physicalYes / total) * 100).toFixed(0), total };
  };

  const calculatePostGameStats = () => {
    const filtered = getFilteredEntries();
    const postGameEntries = filtered.filter((e) => e.postGame);
    if (postGameEntries.length === 0) return null;
    const reviewCompletedYes = postGameEntries.filter((e) => e.postGame?.reviewCompleted?.value).length;
    const total = postGameEntries.length;
    return { reviewCompletionRate: ((reviewCompletedYes / total) * 100).toFixed(0), completed: reviewCompletedYes, total };
  };

  // ─── V2 Analytics ──────────────────────────────────────────────────────────

  const extractV2 = (entry: ChartingEntry) => {
    const raw = entry as unknown as Record<string, unknown>;
    return {
      preGame: raw.v2PreGame as { routineCompleted: boolean; anxietyPresent: boolean; targetStateAchieved: boolean; mentalStateRating: number } | undefined,
      periods: raw.v2Periods as Record<'period1' | 'period2' | 'period3' | 'overtime', { mindControlRating: number; periodFactorRatio: number; goalsAgainst: number; shots: number; saves: number; standardSaves: number; keySaves: number; weakGoals: number; midChallengeCount: number; highChallengeCount: number; goals?: { isGoodGoal: boolean }[] } | undefined> | undefined,
      postGame: raw.v2PostGame as { overallGameFactorRating: number; gameRetentionRating: number; goodDecisionRate: number; mindVaultEntry?: string } | undefined,
      practice: raw.v2Practice as { practiceValueRating: number; technicalEyeDevelopmentRating: number; designatedTrainingReceived: boolean; designatedTrainingDuration?: number; videoCaptured: boolean; practiceIndex?: { category: 'immediate_development' | 'refinement' | 'maintenance' }[]; indexItemsWorkedOn?: string[]; improvementRatings?: { rating: number }[]; mindVaultEntry?: string } | undefined,
    };
  };

  const calculateV2GameStats = () => {
    const filtered = getFilteredEntries();
    let totalV2 = 0, mindSample = 0, routine = 0, anxiety = 0, targetState = 0, mentalStateSum = 0;
    let periodSamples = 0, mindSum = 0, factorSum = 0, goalsAgainst = 0, goodGoals = 0, badGoals = 0;
    let totalShots = 0, totalSaves = 0, totalStandardSaves = 0, totalKeySaves = 0, totalWeakGoals = 0, totalMidChallenge = 0, totalHighChallenge = 0;
    let postSample = 0, overallFactorSum = 0, retentionSum = 0, decisionSum = 0, vaultCount = 0;

    filtered.forEach((entry) => {
      const v2 = extractV2(entry);
      if (!v2.preGame && !v2.periods && !v2.postGame) return;
      totalV2++;
      if (v2.preGame) { mindSample++; if (v2.preGame.routineCompleted) routine++; if (v2.preGame.anxietyPresent) anxiety++; if (v2.preGame.targetStateAchieved) targetState++; mentalStateSum += v2.preGame.mentalStateRating || 0; }
      if (v2.periods) {
        (['period1', 'period2', 'period3', 'overtime'] as const).forEach((key) => {
          const p = v2.periods?.[key];
          if (!p) return;
          periodSamples++;
          mindSum += p.mindControlRating || 0;
          factorSum += p.periodFactorRatio || 0;
          goalsAgainst += p.goalsAgainst || 0;
          totalShots        += p.shots             || 0;
          totalSaves        += p.saves             || 0;
          totalStandardSaves+= p.standardSaves     || 0;
          totalKeySaves     += p.keySaves          || 0;
          totalWeakGoals    += p.weakGoals         || 0;
          totalMidChallenge += p.midChallengeCount || 0;
          totalHighChallenge+= p.highChallengeCount|| 0;
          const good = p.goals?.filter((g) => g.isGoodGoal).length || 0;
          goodGoals += good;
          badGoals += (p.goals?.length || 0) - good;
        });
      }
      if (v2.postGame) { postSample++; overallFactorSum += v2.postGame.overallGameFactorRating || 0; retentionSum += v2.postGame.gameRetentionRating || 0; decisionSum += v2.postGame.goodDecisionRate || 0; if (v2.postGame.mindVaultEntry?.trim().length) vaultCount++; }
    });

    if (totalV2 === 0) return null;
    const avg = (sum: number, count: number) => (count > 0 ? sum / count : 0);
    const savePct = totalShots > 0 ? ((totalShots - goalsAgainst) / totalShots) * 100 : 0;
    return { totalV2, mindSample, routinePct: avg(routine, mindSample) * 100, anxietyPct: avg(anxiety, mindSample) * 100, targetStatePct: avg(targetState, mindSample) * 100, avgMentalState: avg(mentalStateSum, mindSample), periodSamples, avgMindControl: avg(mindSum, periodSamples), avgFactorRatio: avg(factorSum, periodSamples), goalsAgainst, goodGoals, badGoals, goodBadRatio: badGoals > 0 ? goodGoals / badGoals : goodGoals, totalShots, totalSaves, totalStandardSaves, totalKeySaves, totalWeakGoals, totalMidChallenge, totalHighChallenge, savePct, postSample, avgOverallFactor: avg(overallFactorSum, postSample), avgRetention: avg(retentionSum, postSample), avgGoodDecisionRate: avg(decisionSum, postSample), vaultCount };
  };

  const calculateV2PracticeStats = () => {
    const filtered = getFilteredEntries();
    let total = 0, valueSum = 0, eyeSum = 0, designatedCount = 0, designatedMinutes = 0, designatedMinutesCount = 0, videoCount = 0;
    const indexCounts = { immediate_development: 0, refinement: 0, maintenance: 0 };
    let workedOnTotal = 0, improvementSum = 0, improvementCount = 0, vaultCount = 0;

    filtered.forEach((entry) => {
      const { practice } = extractV2(entry);
      if (!practice) return;
      total++;
      valueSum += practice.practiceValueRating || 0;
      eyeSum += practice.technicalEyeDevelopmentRating || 0;
      if (practice.designatedTrainingReceived) { designatedCount++; if (typeof practice.designatedTrainingDuration === 'number') { designatedMinutes += practice.designatedTrainingDuration; designatedMinutesCount++; } }
      if (practice.videoCaptured) videoCount++;
      (practice.practiceIndex || []).forEach((it) => { if (it.category in indexCounts) indexCounts[it.category]++; });
      workedOnTotal += (practice.indexItemsWorkedOn || []).length;
      (practice.improvementRatings || []).forEach((r) => { improvementSum += r.rating || 0; improvementCount++; });
      if (practice.mindVaultEntry?.trim().length) vaultCount++;
    });

    if (total === 0) return null;
    const avg = (sum: number, count: number) => (count > 0 ? sum / count : 0);
    return { total, avgValue: avg(valueSum, total), avgEye: avg(eyeSum, total), designatedPct: avg(designatedCount, total) * 100, totalMinutes: designatedMinutes, avgMinutes: avg(designatedMinutes, designatedMinutesCount), videoPct: avg(videoCount, total) * 100, indexCounts, workedOnTotal, avgImprovement: avg(improvementSum, improvementCount), improvementCount, vaultCount };
  };

  // ── pre-compute ──────────────────────────────────────────────────────────────
  const v2GameStats = calculateV2GameStats();
  const v2PracticeStats = calculateV2PracticeStats();
  const goalsStats = calculateGoalsStats();
  const challengeStats = calculateChallengeStats();
  const focusStats = calculateFocusConsistency();
  const skatingStats = calculateSkatingPerformance();
  const positionalStats = calculatePositionalPerformance();
  const decisionMakingStats = calculateDecisionMaking();
  const bodyLanguageStats = calculateBodyLanguage();
  const reboundControlStats = calculateReboundControl();
  const freezingPuckStats = calculateFreezingPuck();
  const teamPlayStats = calculateTeamPlay();
  const preGameStats = calculatePreGameStats();
  const postGameStats = calculatePostGameStats();
  const filteredSessions = getFilteredSessions();

  // ── helpers ──────────────────────────────────────────────────────────────────
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-white/40" />;
    }
  };

  const getSessionDisplayStatusBadge = (status: ReturnType<typeof getSessionDisplayStatus>) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'charted': return 'text-[#37b5ff] border-[rgba(55,181,255,0.3)] bg-[rgba(55,181,255,0.08)]';
      case 'in-progress': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      default: return 'text-white/40 border-white/15 bg-white/[0.05]';
    }
  };

  const StatTile = ({ label, value, unit, sub, accent = CYAN }: { label: string; value: string | number; unit?: string; sub?: string; accent?: string }) => (
    <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: `1px solid ${accent}38`, padding: '20px', boxShadow: `0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)` }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '60px', background: `radial-gradient(circle at top right, ${accent}15 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>{label}</p>
      <p style={{ fontSize: '32px', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-.02em' } as React.CSSProperties}>
        {value}{unit && <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>{unit}</span>}
      </p>
      {sub && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>{sub}</p>}
    </div>
  );

  const ProgressRow = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-2">
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{label}</p>
        <p style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>{value}</p>
      </div>
      <div style={{ height: '7px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '99px', width: `${value}`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: `0 0 8px rgba(55,181,255,0.4)` }} />
      </div>
      {sub && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>{sub}</p>}
    </div>
  );

  const SectionCard = ({ children, accent = CYAN }: { children: React.ReactNode; accent?: string }) => (
    <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: `1px solid rgba(55,181,255,0.18)`, padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${accent} 40%, rgba(255,255,255,0.35) 70%, transparent 100%)` }} />
      {children}
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
      <div style={{ width: '3px', height: '20px', borderRadius: '99px', background: `linear-gradient(180deg, ${CYAN}, ${MINT})`, flexShrink: 0 }} />
      <p style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>{children}</p>
    </div>
  );

  if (loading) {
    return <SkeletonAnalytics />;
  }

  return (
    <div>

      {/* ── Top bar — matches LayoutShell TopBar exactly ─────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, height: '64px', background: 'rgba(6,5,15,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,255,255,0.1)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', boxShadow: '0 1px 32px rgba(0,0,0,0.5)' }}>
        <button
          type="button"
          onClick={() => router.push('/charting')}
          aria-label="Back to Charting"
          style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,255,0.08)'; e.currentTarget.style.color = '#00FFFF'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
        >
          <ArrowLeft style={{ width: '20px', height: '20px' }} />
        </button>
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>Performance Analytics</span>
        <div style={{ flex: 1 }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #00FFFF, #00FF99)', boxShadow: '0 0 10px rgba(0,255,255,0.7)', flexShrink: 0 }} />
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px', margin: '0 auto', width: '100%', padding: 'clamp(16px,2vw,24px) clamp(16px,3vw,32px)' }}>
        <style>{`.an-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; } .an-metric { transition: border-color .2s, transform .2s; } .an-metric:hover { transform: translateY(-2px); }`}</style>

        {/* ── HERO CARD ── */}
        <div style={{ position: 'relative', borderRadius: '16px', background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.18)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent 0%, ${CYAN} 35%, ${MINT} 65%, transparent 100%)` }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', padding: 'clamp(20px,3vw,32px) clamp(18px,3vw,28px)' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'stretch' }}>
              <div style={{ width: '4px', borderRadius: '99px', background: `linear-gradient(180deg, ${CYAN}, ${MINT})`, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '11px', color: LABEL, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Performance Tracking</p>
                <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: '-.03em', lineHeight: 1, marginBottom: '12px' }}>
                  Analyse Your <span style={{ color: CYAN, textShadow: `0 0 20px rgba(55,181,255,0.4)` }}>Game</span>
                </h1>
                <p style={{ fontSize: '14px', color: MUTED, lineHeight: 1.6, maxWidth: '380px' }}>
                  {sessions.length > 0
                    ? `${sessions.length} total sessions · ${entries.length} charted · select a time window below`
                    : 'Chart your sessions to unlock deep performance insights.'}
                </p>
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <AnalyticsRing charted={entries.length} total={sessions.length} />
            </div>
          </div>
        </div>

        {/* ── METRICS STRIP ── */}
        <div className="an-metrics">
          <AnMetricCard label="Total Sessions" value={sessions.length}                                    sub="all time"          color={CYAN}   icon="sessions" />
          <AnMetricCard label="Game Sessions"  value={sessions.filter(s => s.type === 'game').length}     sub="game sessions"     color={CORAL}  icon="games" />
          <AnMetricCard label="Practice"       value={sessions.filter(s => s.type === 'practice').length} sub="practice sessions" color={MINT}   icon="practice" />
          <AnMetricCard label="Charted"        value={entries.length}                                     sub="with chart data"   color={VIOLET} icon="charted" />
        </div>

        {/* ── Time Range Filter ─────────────────────────────────────────────── */}
        <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.2)', padding: '24px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${CYAN} 35%, ${MINT} 65%, transparent 100%)` }} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>Analytics Window</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>Choose the period you want to analyse.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['week', 'month', '3months', 'all'] as TimeRange[]).map((range) => {
                const labels = { week: 'This Week', month: 'This Month', '3months': 'Last 3 Months', all: 'All Time' };
                const active = timeRange === range;
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setTimeRange(range)}
                    style={active
                      ? { background: `linear-gradient(135deg, ${CYAN}, ${MINT})`, border: 'none', borderRadius: '9px', padding: '7px 14px', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 14px rgba(55,181,255,0.3)` }
                      : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '9px', padding: '7px 14px', color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
                    }
                  >
                    {labels[range]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── V2 Game Analytics ─────────────────────────────────────────────── */}
        {v2GameStats && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setOpenV2Game((p) => !p)}
              className="w-full text-left transition-all duration-200"
              style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: `1px solid rgba(248,113,113,0.28)`, padding: '22px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent 0%, ${CORAL} 40%, rgba(255,255,255,0.4) 70%, transparent 100%)` }} />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `linear-gradient(135deg, rgba(255,107,107,0.28), rgba(255,107,107,0.10))`, border: '1px solid rgba(255,107,107,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Target className="w-5 h-5" style={{ color: CORAL }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Game Chart Analytics</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                      {v2GameStats.totalV2} session{v2GameStats.totalV2 === 1 ? '' : 's'} · Mind {v2GameStats.avgMindControl.toFixed(1)}/5 · Good/Bad {v2GameStats.goodGoals}/{v2GameStats.badGoals}
                    </p>
                  </div>
                </div>
                {openV2Game ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: CORAL }} /> : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />}
              </div>
            </button>

            {openV2Game && (
              <div style={{ borderRadius: '18px', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: `1px solid rgba(248,113,113,0.18)`, padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatTile label="Emotional Balance Avg" value={v2GameStats.avgMindControl.toFixed(1)} unit="/ 5" sub={`${v2GameStats.periodSamples} periods`} accent={VIOLET} />
                  <StatTile label="Factor Ratio Avg" value={v2GameStats.avgFactorRatio.toFixed(1)} unit="/ 5" sub="Across periods" accent={CORAL} />
                  <StatTile label="Good / Weak Goals" value={`${v2GameStats.goodGoals} / ${v2GameStats.badGoals}`} sub={`Ratio ${v2GameStats.goodBadRatio.toFixed(2)}:1`} accent={MINT} />
                  <StatTile label="Goals Against" value={v2GameStats.goalsAgainst} sub="Total across sessions" accent={CORAL} />
                </div>

                {/* ── Period Stats ── */}
                {v2GameStats.totalShots > 0 && (
                  <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                    <div className="flex items-center gap-2 border-b pb-3 mb-4" style={divider}>
                      <BarChart3 className="w-4 h-4" style={{ color: CYAN }} />
                      <p className="text-sm font-bold text-white">Period Stats</p>
                      <span className="text-[11px] text-white/35">({v2GameStats.periodSamples} periods · totals)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Shots',    value: v2GameStats.totalShots,         color: 'rgba(255,255,255,0.7)' },
                        { label: 'Total Saves',    value: v2GameStats.totalSaves,         color: MINT },
                        { label: 'Goals Against',  value: v2GameStats.goalsAgainst,       color: CORAL },
                        { label: 'Save %',         value: `${v2GameStats.savePct.toFixed(1)}%`, color: CYAN },
                        { label: 'Std Saves',      value: v2GameStats.totalStandardSaves, color: 'rgba(255,255,255,0.6)' },
                        { label: 'Key Saves',      value: v2GameStats.totalKeySaves,      color: MINT },
                        { label: 'Weak Goals',     value: v2GameStats.totalWeakGoals,     color: CORAL },
                        { label: 'High-Challenge', value: v2GameStats.totalHighChallenge, color: '#fb923c' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '12px', textAlign: 'center' }}>
                          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>{label}</p>
                          <p style={{ fontSize: '22px', fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {v2GameStats.mindSample > 0 && (
                  <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                    <div className="flex items-center gap-2 border-b pb-3" style={divider}>
                      <Timer className="w-4 h-4" style={{ color: VIOLET }} />
                      <p className="text-sm font-bold text-white">Pre-Game Mind Management</p>
                      <span className="text-[11px] text-white/35">({v2GameStats.mindSample} sessions)</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                      <ProgressRow label="Routine Completed" value={`${v2GameStats.routinePct.toFixed(0)}%`} />
                      <ProgressRow label="Target State" value={`${v2GameStats.targetStatePct.toFixed(0)}%`} />
                      <ProgressRow label="Pre-Game Stress" value={`${v2GameStats.anxietyPct.toFixed(0)}%`} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Avg Mental State</p>
                        <p className="text-base font-black text-white tabular-nums">{v2GameStats.avgMentalState.toFixed(1)}<span className="text-xs font-medium text-white/40 ml-1">/ 5</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {v2GameStats.postSample > 0 && (
                  <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                    <div className="flex items-center gap-2 border-b pb-3" style={divider}>
                      <Brain className="w-4 h-4" style={{ color: CORAL }} />
                      <p className="text-sm font-bold text-white">Post-Game Review</p>
                      <span className="text-[11px] text-white/35">({v2GameStats.postSample} sessions)</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Overall Game Factor</p><p className="text-base font-black text-white tabular-nums">{v2GameStats.avgOverallFactor.toFixed(1)}<span className="text-xs text-white/40 ml-1">/ 5</span></p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Game Retention</p><p className="text-base font-black text-white tabular-nums">{v2GameStats.avgRetention.toFixed(1)}<span className="text-xs text-white/40 ml-1">/ 5</span></p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Good Decision Factor</p><p className="text-base font-black text-white tabular-nums">{v2GameStats.avgGoodDecisionRate.toFixed(0)}%</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Mind Vault Entries</p><p className="text-base font-black text-white tabular-nums">{v2GameStats.vaultCount}</p></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── V2 Practice Analytics ─────────────────────────────────────────── */}
        {v2PracticeStats && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setOpenV2Practice((p) => !p)}
              className="w-full text-left transition-all duration-200"
              style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: `1px solid rgba(52,211,153,0.28)`, padding: '22px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent 0%, ${MINT} 40%, rgba(255,255,255,0.4) 70%, transparent 100%)` }} />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `linear-gradient(135deg, rgba(52,211,153,0.28), rgba(52,211,153,0.10))`, border: `1px solid rgba(52,211,153,0.40)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Dumbbell className="w-5 h-5" style={{ color: MINT }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Practice Chart Analytics</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                      {v2PracticeStats.total} session{v2PracticeStats.total === 1 ? '' : 's'} · Value {v2PracticeStats.avgValue.toFixed(1)}/5 · Tech Eye {v2PracticeStats.avgEye.toFixed(1)}/5
                    </p>
                  </div>
                </div>
                {openV2Practice ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: MINT }} /> : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />}
              </div>
            </button>

            {openV2Practice && (
              <div style={{ borderRadius: '18px', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: `1px solid rgba(52,211,153,0.18)`, padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatTile label="Practice Value Avg" value={v2PracticeStats.avgValue.toFixed(1)} unit="/ 5" accent={MINT} />
                  <StatTile label="Technical Eye Avg" value={v2PracticeStats.avgEye.toFixed(1)} unit="/ 5" accent={CYAN} />
                  <StatTile label="Designated Training" value={`${v2PracticeStats.designatedPct.toFixed(0)}%`} sub={`${v2PracticeStats.totalMinutes} total min${v2PracticeStats.avgMinutes > 0 ? ` · avg ${v2PracticeStats.avgMinutes.toFixed(0)}m` : ''}`} accent={MINT} />
                  <div className="rounded-xl p-4" style={innerCard}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Video className="w-3 h-3 text-white/40" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Video Capture</p>
                    </div>
                    <p className="text-3xl font-black tabular-nums text-white">{v2PracticeStats.videoPct.toFixed(0)}%</p>
                  </div>
                </div>

                <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                  <div className="flex items-center gap-2 border-b pb-3" style={divider}>
                    <Target className="w-4 h-4" style={{ color: MINT }} />
                    <p className="text-sm font-bold text-white">Practice Index Breakdown</p>
                    <span className="text-[11px] text-white/35">({v2PracticeStats.workedOnTotal} items worked on)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                      <div className="flex items-center gap-1.5 mb-1"><Flame className="w-3.5 h-3.5 text-red-400" /><p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Immediate Dev</p></div>
                      <p className="text-2xl font-black text-white tabular-nums">{v2PracticeStats.indexCounts.immediate_development}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">Item occurrences</p>
                    </div>
                    <div className="rounded-xl p-3" style={innerCard}>
                      <div className="flex items-center gap-1.5 mb-1"><Sparkles className="w-3.5 h-3.5" style={{ color: CYAN }} /><p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: CYAN }}>Refinement</p></div>
                      <p className="text-2xl font-black text-white tabular-nums">{v2PracticeStats.indexCounts.refinement}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">Item occurrences</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center gap-1.5 mb-1"><ShieldCheck className="w-3.5 h-3.5 text-white/40" /><p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Maintenance</p></div>
                      <p className="text-2xl font-black text-white tabular-nums">{v2PracticeStats.indexCounts.maintenance}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">Item occurrences</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl p-4 space-y-1" style={innerCard}>
                    <div className="flex items-center gap-2 mb-2"><Eye className="w-4 h-4" style={{ color: MINT }} /><p className="text-sm font-bold text-white">Did it improve?</p></div>
                    <p className="text-3xl font-black text-white tabular-nums">{v2PracticeStats.avgImprovement.toFixed(1)}<span className="text-sm font-medium text-white/40 ml-1">/ 5 avg</span></p>
                    <p className="text-[11px] text-white/35">Across {v2PracticeStats.improvementCount} rated improvements</p>
                  </div>
                  <div className="rounded-xl p-4 space-y-1" style={innerCard}>
                    <div className="flex items-center gap-2 mb-2"><Brain className="w-4 h-4" style={{ color: VIOLET }} /><p className="text-sm font-bold text-white">Mind Vault Entries</p></div>
                    <p className="text-3xl font-black text-white tabular-nums">{v2PracticeStats.vaultCount}</p>
                    <p className="text-[11px] text-white/35">From {v2PracticeStats.total} practice session{v2PracticeStats.total === 1 ? '' : 's'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Legacy analytics (only shown if there's data) ─────────────────── */}
        {filteredSessions.length === 0 ? (
          <div style={{ borderRadius: '18px', background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.2)', padding: '64px 32px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <BarChart3 className="w-14 h-14 mx-auto mb-4" style={{ color: 'rgba(55,181,255,0.3)' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>No Sessions Found</h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '20px' }}>No sessions found for the selected time period.</p>
            <Button
              onClick={() => router.push('/charting')}
              className="h-10 px-6 text-sm font-bold rounded-xl border-0"
              style={{ background: `linear-gradient(135deg, ${CYAN}, ${MINT})`, color: '#fff', fontWeight: 800, boxShadow: '0 4px 14px rgba(55,181,255,0.3)' }}
            >
              Go to Sessions
            </Button>
          </div>
        ) : (
          <>
            {/* Goals Performance */}
            {goalsStats && (
              <SectionCard>
                <SectionTitle>Goals Performance</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <StatTile label="Avg Good Goals / Game" value={goalsStats.avgGoodGoals} sub={`Across ${goalsStats.totalGames} games`} />
                  <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Avg Weak Goals / Game</p>
                      {getTrendIcon(goalsStats.trend)}
                    </div>
                    <p className="text-3xl font-black tabular-nums text-white">{goalsStats.avgBadGoals}</p>
                    <p className="text-[11px] text-white/35 mt-1">{goalsStats.improvement}% vs earlier period</p>
                  </div>
                  <StatTile label="Good / Weak Ratio" value={`${(parseFloat(goalsStats.avgGoodGoals) / parseFloat(goalsStats.avgBadGoals) || 0).toFixed(2)}:1`} sub={parseFloat(goalsStats.avgGoodGoals) > parseFloat(goalsStats.avgBadGoals) ? 'More good than weak' : 'Work on reducing weak goals'} />
                </div>
              </SectionCard>
            )}

            {/* Challenge & Consistency */}
            {challengeStats && (
              <SectionCard>
                <SectionTitle>Challenge Level & Consistency</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <StatTile label="Average Challenge Rating" value={`${challengeStats.avgChallenge} / 10`} sub={parseFloat(challengeStats.avgChallenge) < 4 ? 'Easier games' : parseFloat(challengeStats.avgChallenge) < 7 ? 'Moderate difficulty' : 'High difficulty games'} />
                  <StatTile label="Challenge Consistency" value={challengeStats.consistency} sub={`σ = ${challengeStats.stdDev} standard deviation`} />
                </div>
              </SectionCard>
            )}

            {/* MindSet Performance */}
            {focusStats && (
              <SectionCard>
                <SectionTitle>MindSet Performance</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white">Focus Consistency</p>
                      {getTrendIcon(focusStats.trend)}
                    </div>
                    <div className="flex items-end gap-2">
                      <p className="text-5xl font-black tabular-nums text-white">{focusStats.percentage}%</p>
                      <p className="text-sm text-white/40 mb-1">consistent</p>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full" style={{ width: `${focusStats.percentage}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: '0 0 8px rgba(55,181,255,0.5)' }} />
                    </div>
                    <p className="text-[11px] text-white/35">{focusStats.consistentCount} consistent / {focusStats.inconsistentCount} inconsistent periods</p>
                  </div>
                  {skatingStats && (
                    <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-white">Skating In Sync</p>
                        {getTrendIcon(skatingStats.trend)}
                      </div>
                      <div className="flex items-end gap-2">
                        <p className="text-5xl font-black tabular-nums text-white">{skatingStats.percentage}%</p>
                        <p className="text-sm text-white/40 mb-1">in sync</p>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${skatingStats.percentage}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: '0 0 8px rgba(55,181,255,0.5)' }} />
                      </div>
                      <p className="text-[11px] text-white/35">{skatingStats.inSyncCount} in sync / {skatingStats.notInSyncCount} not in sync</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Positional Performance */}
            {positionalStats && (
              <SectionCard>
                <SectionTitle>Positional Performance</SectionTitle>
                <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                  <div className="flex items-end gap-2">
                    <p className="text-5xl font-black tabular-nums text-white">{positionalStats.percentage}%</p>
                    <p className="text-sm text-white/40 mb-1">good / strong</p>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${positionalStats.percentage}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: '0 0 8px rgba(55,181,255,0.5)' }} />
                  </div>
                  <p className="text-[11px] text-white/35">{positionalStats.goodCount} good/strong · {positionalStats.needsWorkCount} needs work</p>
                </div>
              </SectionCard>
            )}

            {/* Decision Making & Body Language */}
            {(decisionMakingStats || bodyLanguageStats) && (
              <SectionCard>
                <SectionTitle>Decision Making & Body Language</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {decisionMakingStats && (
                    <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                      <p className="text-sm font-bold text-white">Decision Making — Strong</p>
                      <div className="flex items-end gap-2">
                        <p className="text-5xl font-black tabular-nums text-white">{decisionMakingStats.strongPercentage}%</p>
                        <p className="text-sm text-white/40 mb-1">strong</p>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${decisionMakingStats.strongPercentage}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: '0 0 8px rgba(55,181,255,0.5)' }} />
                      </div>
                      <p className="text-[11px] text-white/35">{decisionMakingStats.strongCount} strong · {decisionMakingStats.improvingCount} improving · {decisionMakingStats.needsWorkCount} needs work</p>
                    </div>
                  )}
                  {bodyLanguageStats && (
                    <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                      <p className="text-sm font-bold text-white">Body Language</p>
                      <div className="flex items-end gap-2">
                        <p className="text-5xl font-black tabular-nums text-white">{bodyLanguageStats.percentage}%</p>
                        <p className="text-sm text-white/40 mb-1">consistent</p>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${bodyLanguageStats.percentage}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: '0 0 8px rgba(55,181,255,0.5)' }} />
                      </div>
                      <p className="text-[11px] text-white/35">{bodyLanguageStats.consistentCount} consistent · {bodyLanguageStats.inconsistentCount} inconsistent</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Rebound Control */}
            {reboundControlStats && (
              <SectionCard>
                <SectionTitle>Rebound Control</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['quality', 'consistency'] as const).map((type) => {
                    const pct = type === 'quality' ? reboundControlStats.qualityPercentage : reboundControlStats.consistencyPercentage;
                    const sub = type === 'quality'
                      ? `${reboundControlStats.goodCount} good · ${reboundControlStats.improvingCount} improving · ${reboundControlStats.poorCount} poor`
                      : `${reboundControlStats.consistentCount} consistent · ${reboundControlStats.inconsistentCount} inconsistent`;
                    return (
                      <div key={type} style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                        <p className="text-sm font-bold text-white capitalize">{type}</p>
                        <div className="flex items-end gap-2"><p className="text-5xl font-black tabular-nums text-white">{pct}%</p><p className="text-sm text-white/40 mb-1">{type === 'quality' ? 'good' : 'consistent'}</p></div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: '0 0 8px rgba(55,181,255,0.5)' }} /></div>
                        <p className="text-[11px] text-white/35">{sub}</p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* Freezing Puck */}
            {freezingPuckStats && (
              <SectionCard>
                <SectionTitle>Freezing Puck</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['quality', 'consistency'] as const).map((type) => {
                    const pct = type === 'quality' ? freezingPuckStats.qualityPercentage : freezingPuckStats.consistencyPercentage;
                    const sub = type === 'quality'
                      ? `${freezingPuckStats.goodCount} good · ${freezingPuckStats.improvingCount} improving · ${freezingPuckStats.poorCount} poor`
                      : `${freezingPuckStats.consistentCount} consistent · ${freezingPuckStats.inconsistentCount} inconsistent`;
                    return (
                      <div key={type} style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                        <p className="text-sm font-bold text-white capitalize">{type}</p>
                        <div className="flex items-end gap-2"><p className="text-5xl font-black tabular-nums text-white">{pct}%</p><p className="text-sm text-white/40 mb-1">{type === 'quality' ? 'good' : 'consistent'}</p></div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: '0 0 8px rgba(55,181,255,0.5)' }} /></div>
                        <p className="text-[11px] text-white/35">{sub}</p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* Team Play */}
            {teamPlayStats && (
              <SectionCard>
                <SectionTitle>Team Play (Period 3)</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Setting Up Defense', pct: teamPlayStats.defensePercentage, sub: `${teamPlayStats.defenseGoodCount} good · ${teamPlayStats.defenseImprovingCount} improving · ${teamPlayStats.defensePoorCount} poor` },
                    { label: 'Setting Up Forwards', pct: teamPlayStats.forwardsPercentage, sub: `${teamPlayStats.forwardsGoodCount} good · ${teamPlayStats.forwardsImprovingCount} improving · ${teamPlayStats.forwardsPoorCount} poor` },
                  ].map(({ label, pct, sub }) => (
                    <div key={label} style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                      <p className="text-sm font-bold text-white">{label}</p>
                      <div className="flex items-end gap-2"><p className="text-5xl font-black tabular-nums text-white">{pct}%</p><p className="text-sm text-white/40 mb-1">good</p></div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: '0 0 8px rgba(55,181,255,0.5)' }} /></div>
                      <p className="text-[11px] text-white/35">{sub}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Pre-Game Preparation */}
            {preGameStats && (
              <SectionCard>
                <SectionTitle>Pre-Game Preparation</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Equipment Check', value: preGameStats.equipmentPercentage },
                    { label: 'Mental Prep', value: preGameStats.mentalPrepPercentage },
                    { label: 'Warmup', value: preGameStats.warmupPercentage },
                    { label: 'Physical Prep', value: preGameStats.physicalPercentage },
                  ].map(({ label, value }) => (
                    <StatTile key={label} label={label} value={`${value}%`} />
                  ))}
                </div>
                <p className="text-[11px] text-white/30 mt-3 text-center">Based on {preGameStats.total} sessions with pre-game data</p>
              </SectionCard>
            )}

            {/* Post-Game Review */}
            {postGameStats && (
              <SectionCard>
                <SectionTitle>Post-Game Review</SectionTitle>
                <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                  <div className="flex items-end gap-2">
                    <p className="text-5xl font-black tabular-nums text-white">{postGameStats.reviewCompletionRate}%</p>
                    <p className="text-sm text-white/40 mb-1">completed</p>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${postGameStats.reviewCompletionRate}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, boxShadow: '0 0 8px rgba(55,181,255,0.5)' }} />
                  </div>
                  <p className="text-[11px] text-white/35">{postGameStats.completed} completed · {postGameStats.total} total sessions</p>
                </div>
              </SectionCard>
            )}

            {/* Recent Sessions */}
            <SectionCard>
              <SectionTitle>Recent Sessions ({filteredSessions.length})</SectionTitle>
              <div className="divide-y" style={divider}>
                {filteredSessions.slice(0, 10).map((session) => {
                  const entry = entries.find((e) => e.sessionId === session.id);
                  const status = getSessionDisplayStatus(session);
                  const sessionDate = toDateSafe((session as unknown as { date?: unknown }).date);
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-3 cursor-pointer hover:bg-white/[0.03] rounded-lg px-2 -mx-2 transition-colors"
                      onClick={() => router.push(`/charting/sessions/${session.id}`)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {session.type === 'game' ? '🥅' : '🏒'} {session.opponent || 'Practice'}
                        </p>
                        <p className="text-xs text-white/40">{sessionDate ? sessionDate.toLocaleDateString() : 'Date unavailable'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {entry?.gameOverview && (
                          <p className="text-xs font-semibold">
                            <span className="text-emerald-400">{(entry.gameOverview.goodGoals.period1 || 0) + (entry.gameOverview.goodGoals.period2 || 0) + (entry.gameOverview.goodGoals.period3 || 0)}</span>
                            <span className="text-white/30 mx-0.5">/</span>
                            <span className="text-red-400">{(entry.gameOverview.badGoals.period1 || 0) + (entry.gameOverview.badGoals.period2 || 0) + (entry.gameOverview.badGoals.period3 || 0)}</span>
                          </p>
                        )}
                        <Badge variant="outline" className={`text-xs capitalize border ${getSessionDisplayStatusBadge(status)}`}>{status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </>
        )}

        <div className="pb-8" />
      </div>
    </div>
  );
}

/* ─── AnalyticsRing ──────────────────────────────────────── */

function AnalyticsRing({ charted, total }: { charted: number; total: number }) {
  const CYAN = '#37b5ff';
  const MINT = '#34d399';
  const MUTED = 'rgba(255,255,255,0.38)';
  const pct    = total > 0 ? Math.round((charted / total) * 100) : 0;
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
            <linearGradient id="an-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={CYAN} />
              <stop offset="60%" stopColor={MINT} />
              <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#an-ring-grad)" strokeWidth={stroke}
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

/* ─── AnMetricCard ───────────────────────────────────────── */

function AnMetricCard({ label, value, sub, color, icon }: { label: string; value: number; sub: string; color: string; icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    sessions: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="1.5" y="12" width="5" height="8.5" rx="1.5" fill={color} opacity="0.4"/>
        <rect x="8.5" y="7" width="5" height="13.5" rx="1.5" fill={color} opacity="0.7"/>
        <rect x="15.5" y="2" width="5" height="18.5" rx="1.5" fill={color}/>
      </svg>
    ),
    games: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9" stroke={color} strokeWidth="1.5" opacity="0.35"/>
        <circle cx="11" cy="11" r="5.5" stroke={color} strokeWidth="1.5" opacity="0.65"/>
        <circle cx="11" cy="11" r="2.5" fill={color}/>
      </svg>
    ),
    practice: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M13.5 2L4 13.5h6.5L8 20l10-11H12L13.5 2z" fill={color}/>
      </svg>
    ),
    charted: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="3" fill={color} opacity="0.2"/>
        <path d="M7 11l3 3 5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return (
    <div className="an-metric" style={{
      position: 'relative', borderRadius: '16px', overflow: 'hidden',
      background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)',
      border: `1px solid ${color}40`, padding: '20px 20px 18px',
      boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)`,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${color} 40%, ${color}55 70%, transparent 100%)` }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle at top right, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `linear-gradient(135deg, ${color}22, ${color}0d)`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: `0 4px 16px ${color}25, inset 0 1px 0 ${color}30` }}>
          {icons[icon]}
        </div>
        <p style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: '6px', letterSpacing: '-.03em' }}>{value}</p>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,.8)', marginBottom: '3px' }}>{label}</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>{sub}</p>
      </div>
    </div>
  );
}
