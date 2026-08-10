'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { useRouter, useParams } from 'next/navigation';
import { chartingService } from '@/lib/database';
import { Session, V2PostGameData, V2PeriodData } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Brain, Vault, ClipboardList, Flag, ChevronDown, ArrowRight } from 'lucide-react';
import { getPillarUrl } from '@/lib/utils/pillars';
import type { PillarSlug } from '@/types';
import {
  ContextualHelp,
  RotatingNumberSelector,
  VoiceRecorder,
} from '@/components/charting/inputs';
import { toast } from 'sonner';
import { growthPointsService } from '@/lib/firebase/growth-points.service';
import { GROWTH_POINTS } from '@/lib/config/growth-points';
import { generatePracticeIndex } from '@/lib/scoring/practice-index-generator';

// ─── Constants ───────────────────────────────────────────────────────────────

const GAME_FACTOR_OPTIONS = [
  { value: 1, label: '1 — Low challenge' },
  { value: 2, label: '2 — Below average' },
  { value: 3, label: '3 — Average' },
  { value: 4, label: '4 — High challenge' },
  { value: 5, label: '5 — Maximum challenge' },
];

const GAME_RETENTION_OPTIONS = [
  { value: 1, label: '1 — Very fuzzy' },
  { value: 2, label: '2 — Mostly unclear' },
  { value: 3, label: '3 — Some parts clear' },
  { value: 4, label: '4 — Mostly clear' },
  { value: 5, label: '5 — Crystal clear' },
];

const IMPROVEMENT_FOCUS_OPTIONS = [
  { value: 'mind_control',         label: 'Emotional Balance',        detail: 'Stay in the now, period by period',        pillar: 'Mindset' },
  { value: 'pre_game_routine',     label: 'Pre-Game Routine',        detail: 'Preparation & mental activation',          pillar: 'Mindset' },
  { value: 'positioning',          label: '7AMS',                    detail: 'Angle play, depth & reads',                pillar: '7AMS' },
  { value: 'form',                 label: 'Form & Structure',        detail: 'Mechanics, technique & fundamentals',      pillar: 'Form' },
  { value: 'skating',              label: 'Skating',                 detail: 'Edge work, recovery & movement',           pillar: 'Skating' },
  { value: 'seven_point',          label: '6 Zone – 7 Point System™', detail: 'Below icing line — angles & reads',        pillar: '6 Zone – 7 Point System™' },
  { value: 'game_retention',       label: 'Game Retention',          detail: 'Recall, replay & self-review',             pillar: 'Mindset' },
  { value: 'pressure_performance', label: 'Pressure Performance',    detail: 'High-challenge, breakaway, 2-on-1',        pillar: 'Mindset' },
  { value: 'goal_decisions',       label: 'Reading the Play',        detail: 'Read → position → execute under pressure', pillar: '7AMS' },
  { value: 'training',             label: 'Training Quality',        detail: 'Designated training & intentional reps',   pillar: 'Training' },
  { value: 'lifestyle',            label: 'Lifestyle Foundations',   detail: 'Sleep, fuel & recovery habits',            pillar: 'Lifestyle' },
];

interface PriorityArea {
  label: string;
  pillarLabel: string;
  pillarSlug: PillarSlug;
  reason: string;
  urgency: 'critical' | 'high' | 'moderate';
}

function derivePriorityArea(
  mindControlAvg: number,
  badGoals: number,
  goodGoals: number,
  gameRetentionRating: number,
  overallGameFactorRating: number,
): PriorityArea | null {
  // Only run when we have meaningful data
  if (mindControlAvg === 0 && badGoals === 0 && goodGoals === 0 && gameRetentionRating === 0) return null;

  const candidates: Array<{ score: number } & PriorityArea> = [];

  // Mind control signal (lower avg = worse)
  if (mindControlAvg > 0) {
    const pct = (mindControlAvg / 5) * 100;
    candidates.push({
      score: pct,
      label: 'Emotional Balance',
      pillarLabel: 'Pillar 1 — MindSet',
      pillarSlug: 'mindset',
      reason: `Emotional balance averaged ${mindControlAvg.toFixed(1)}/5 across periods`,
      urgency: mindControlAvg <= 2 ? 'critical' : mindControlAvg <= 3 ? 'high' : 'moderate',
    });
  }

  // Goal decision signal (higher bad% = worse)
  const totalGoals = badGoals + goodGoals;
  if (totalGoals > 0) {
    const goodPct = (goodGoals / totalGoals) * 100;
    candidates.push({
      score: goodPct,
      label: 'Reading the Play',
      pillarLabel: 'Positioning — Positional Systems',
      pillarSlug: 'positioning',
      reason: `${badGoals} weak goal${badGoals !== 1 ? 's' : ''} — ${(100 - goodPct).toFixed(0)}% error rate on goals`,
      urgency: goodPct < 40 ? 'critical' : goodPct < 70 ? 'high' : 'moderate',
    });
  }

  // Game retention signal (lower = worse)
  if (gameRetentionRating > 0) {
    const pct = (gameRetentionRating / 5) * 100;
    candidates.push({
      score: pct,
      label: 'Game Retention',
      pillarLabel: 'Pillar 1 — MindSet',
      pillarSlug: 'mindset',
      reason: `Game retention rated ${gameRetentionRating}/5 — game memory is unclear`,
      urgency: gameRetentionRating <= 2 ? 'critical' : gameRetentionRating <= 3 ? 'high' : 'moderate',
    });
  }

  // High pressure + low mind control cross-signal
  if (overallGameFactorRating >= 4 && mindControlAvg > 0 && mindControlAvg <= 3) {
    candidates.push({
      score: (mindControlAvg / 5) * 40,
      label: 'Pressure Performance',
      pillarLabel: 'Pillar 1 — MindSet',
      pillarSlug: 'mindset',
      reason: `Mind broke down (${mindControlAvg.toFixed(1)}/5) in a ${overallGameFactorRating}/5 challenge game`,
      urgency: 'critical',
    });
  }

  if (candidates.length === 0) return null;

  // Return lowest score = worst performance
  const worst = candidates.reduce((w, c) => (c.score < w.score ? c : w));
  return { label: worst.label, pillarLabel: worst.pillarLabel, pillarSlug: worst.pillarSlug, reason: worst.reason, urgency: worst.urgency };
}

type PeriodKey = 'period1' | 'period2' | 'period3' | 'overtime';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function V2PostGamePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [periodData, setPeriodData] = useState<Record<PeriodKey, V2PeriodData | null>>({
    period1: null, period2: null, period3: null, overtime: null,
  });

  const [formData, setFormData] = useState<V2PostGameData>({
    overallFeeling: '',
    overallGameFactorRating: 1,
    overallGameFactorVoiceNote: undefined,
    mindControlAverage: 0,
    goodGoalCount: 0,
    badGoalCount: 0,
    goodDecisionRate: 0,
    gameRetentionRating: 1,
    gameRetentionVoiceNote: undefined,
    mindVaultEntry: '',
    factorRatioSummary: 0,
    priorityImprovementArea: undefined,
    improvementFocus: undefined,
    whatWillYouDoDifferently: undefined,
  });

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !sessionId) return;
    const load = async () => {
      setLoading(true);
      try {
        const sessionResult = await chartingService.getSession(sessionId);
        if (sessionResult.success && sessionResult.data) setSession(sessionResult.data);

        const entriesResult = await chartingService.getChartingEntriesBySession(sessionId);
        if (entriesResult.success && entriesResult.data) {
          const myEntry = entriesResult.data.find(e => e.submittedBy === user.id);
          if (myEntry) {
            // Load period data for auto-calculations
            const v2Periods = (myEntry as unknown as { v2Periods?: Record<PeriodKey, V2PeriodData> }).v2Periods;
            if (v2Periods) {
              setPeriodData({
                period1: v2Periods.period1 || null,
                period2: v2Periods.period2 || null,
                period3: v2Periods.period3 || null,
                overtime: v2Periods.overtime || null,
              });
            }

            // Load existing post-game data
            const v2PostGame = (myEntry as unknown as { v2PostGame?: V2PostGameData }).v2PostGame;
            if (v2PostGame) {
              setFormData(v2PostGame);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load:', error);
        toast.error('Failed to load session data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, sessionId]);

  // ── Auto-calculations ─────────────────────────────────────────────────────
  const calculations = useMemo(() => {
    const activePeriods = Object.values(periodData).filter((p): p is V2PeriodData => p !== null);

    // Mind Control Average
    const mindControlAvg = activePeriods.length > 0
      ? activePeriods.reduce((sum, p) => sum + (p.mindControlRating || 0), 0) / activePeriods.length
      : 0;

    // Good / Bad Goal totals
    let goodGoals = 0;
    let badGoals = 0;
    for (const period of activePeriods) {
      for (const goal of period.goals || []) {
        if (goal.isGoodGoal) goodGoals++;
        else badGoals++;
      }
    }
    const totalGoals = goodGoals + badGoals;
    const goodDecisionRate = totalGoals > 0 ? Math.round((goodGoals / totalGoals) * 100) : 0;

    // Factor Ratio Summary
    const factorRatioAvg = activePeriods.length > 0
      ? activePeriods.reduce((sum, p) => sum + (p.periodFactorRatio || 0), 0) / activePeriods.length
      : 0;

    // Per-period factor ratios for visual breakdown
    const periodFactorRatios: { label: string; value: number }[] = [];
    if (periodData.period1) periodFactorRatios.push({ label: 'P1', value: periodData.period1.periodFactorRatio || 0 });
    if (periodData.period2) periodFactorRatios.push({ label: 'P2', value: periodData.period2.periodFactorRatio || 0 });
    if (periodData.period3) periodFactorRatios.push({ label: 'P3', value: periodData.period3.periodFactorRatio || 0 });
    if (periodData.overtime) periodFactorRatios.push({ label: 'OT', value: periodData.overtime.periodFactorRatio || 0 });

    return { mindControlAvg, goodGoals, badGoals, goodDecisionRate, factorRatioAvg, periodFactorRatios };
  }, [periodData]);

  // ── Priority Improvement Area (auto-derived from available signals) ────────
  const priorityArea = useMemo(() => derivePriorityArea(
    calculations.mindControlAvg,
    calculations.badGoals,
    calculations.goodGoals,
    formData.gameRetentionRating,
    formData.overallGameFactorRating,
  ), [calculations, formData.gameRetentionRating, formData.overallGameFactorRating]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !session) return;
    setSaving(true);
    try {
      // Merge auto-calculations into form data
      const postGameData: V2PostGameData = {
        ...formData,
        mindControlAverage: Math.round(calculations.mindControlAvg * 10) / 10,
        goodGoalCount: calculations.goodGoals,
        badGoalCount: calculations.badGoals,
        goodDecisionRate: calculations.goodDecisionRate,
        factorRatioSummary: Math.round(calculations.factorRatioAvg * 10) / 10,
        priorityImprovementArea: priorityArea?.label,
      };

      const entriesResult = await chartingService.getChartingEntriesBySession(sessionId);
      const existingEntries = entriesResult.success ? entriesResult.data || [] : [];
      const myEntry = existingEntries.find(e => e.submittedBy === user.id);

      // Generate practice index from period + post-game data
      const activePeriods = Object.fromEntries(
        Object.entries(periodData).filter(([, p]) => p !== null)
      ) as Record<string, V2PeriodData>;
      const v2PracticeIndex = generatePracticeIndex(activePeriods, postGameData, sessionId);

      const entryData: Record<string, unknown> = {
        sessionId: session.id,
        studentId: session.studentId,
        submittedBy: user.id,
        submitterRole: (user.role || 'student') as 'student' | 'admin',
        v2PostGame: postGameData,
        v2PracticeIndex,
        v2Version: 'v2',
      };

      if (myEntry) {
        const preserveFields = ['gameOverview', 'period1', 'period2', 'period3', 'overtime', 'shootout', 'postGame', 'preGame', 'v2PreGame', 'v2Periods'] as const;
        for (const field of preserveFields) {
          const val = (myEntry as unknown as Record<string, unknown>)[field];
          if (val) entryData[field] = val;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await chartingService.updateChartingEntry(myEntry.id, entryData as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await chartingService.createChartingEntry(entryData as any);
      }

      await chartingService.updateSession(sessionId, { status: 'completed' });
      growthPointsService.awardPointsOnce(
        user!.id, 'CHART_LOGGED', GROWTH_POINTS.CHART_LOGGED, 'Chart Logged', `chart_${sessionId}`
      ).catch(() => {});

      toast.success('Post-Game section saved!');
      router.push(`/charting/sessions/${sessionId}`);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  // ── Update helper ─────────────────────────────────────────────────────────
  const update = <K extends keyof V2PostGameData>(key: K, value: V2PostGameData[K]) => {
    setFormData((prev: V2PostGameData) => ({ ...prev, [key]: value }));
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ background: '#041830' }}>
        <SkeletonContentPage />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#041830' }}>
        <div className="text-center space-y-3">
          <p className="text-white/60">Session not found</p>
          <Button variant="outline" onClick={() => router.push('/charting')} className="border-[rgba(255,107,107,0.3)] text-white/70 hover:text-white hover:bg-[rgba(255,107,107,0.1)]">Back to Sessions</Button>
        </div>
      </div>
    );
  }

  const hasPeriodData = Object.values(periodData).some(p => p !== null);
  const isBasic = user?.chartLevel === 'basic';

  return (
    <div className="min-h-screen" style={{ background: '#041830' }}>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 backdrop-blur-md border-b" style={{ background: 'rgba(6,30,58,0.97)', borderColor: 'rgba(255,107,107,0.14)' }}>
        <div className="flex items-center justify-between px-6 h-16">
          <button
            type="button"
            onClick={() => router.push(`/charting/sessions/${sessionId}`)}
            className="flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-[#FF6B6B] to-white bg-clip-text text-transparent">
            Post-Game
          </h1>
          <div className="w-16" />
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className="px-8 py-6 space-y-8">

        <div>
          <h2 className="text-3xl font-black text-white">Post-Game Review</h2>
          <p className="text-sm text-white/50 mt-0.5">
            First quiet moment after the game. Be honest. Before the feelings fade.
          </p>
        </div>

        {/* ── All 8 Fields ────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* #1 Overall Game Feeling — Voice Only */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(255,107,107,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <ContextualHelp
              label="#1 — Overall Game Feeling"
              helpText="First instinct. No prompts. No multiple choice. Raw and unfiltered. System captures it. Later cross-referenced with actual data. Builds self-evaluation accuracy over time."
            >
              <VoiceRecorder
                onTranscriptionComplete={(text) => update('overallFeeling', text)}
                initialText={formData.overallFeeling}
                placeholder="Tap the mic and share your honest first feeling..."
              />
            </ContextualHelp>
          </div>

          {/* #2 Overall Game Factor Rating — 5-Pillar only */}
          {!isBasic && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(255,107,107,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
              <ContextualHelp
                label="#2 — Overall Game Factor Rating"
                helpText="How challenging was this game overall? 1=Low challenge, weak opposition. 3=Average. 5=Maximum challenge, elite opposition. If 4 or 5 triggers voice follow-up. Cross-references with per-period Factor Ratios."
              >
                <RotatingNumberSelector
                  value={formData.overallGameFactorRating}
                  onChange={(val) => update('overallGameFactorRating', val as number)}
                  options={GAME_FACTOR_OPTIONS}
                />
              </ContextualHelp>

              {formData.overallGameFactorRating >= 4 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t" style={{ borderColor: 'rgba(255,107,107,0.1)' }}>
                  <p className="text-xs text-white/60 mb-2 italic">
                    What made this game most demanding?
                  </p>
                  <VoiceRecorder
                    onTranscriptionComplete={(text) => update('overallGameFactorVoiceNote', text)}
                    initialText={formData.overallGameFactorVoiceNote}
                    placeholder="Tap to describe what made it challenging..."
                  />
                </div>
              )}
            </div>
          )}

          {/* #3 and #4 — Side-by-side circular gauges — 5-Pillar only */}
          {!isBasic && (
            <div className="grid grid-cols-2 gap-3">

              {/* #3 Mind Control Average */}
              <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold text-white">#3 — Emotional Balance</p>
                {hasPeriodData ? (
                  <>
                    <div className="flex justify-center">
                      {(() => {
                        const r = 46;
                        const circ = 2 * Math.PI * r;
                        const pct = calculations.mindControlAvg / 5;
                        return (
                          <div className="relative" style={{ width: 100, height: 100 }}>
                            <svg viewBox="0 0 108 108" width="100" height="100">
                              <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
                              <circle
                                cx="54" cy="54" r={r}
                                fill="none"
                                stroke="#37b5ff"
                                strokeWidth="7"
                                strokeLinecap="round"
                                strokeDasharray={circ}
                                strokeDashoffset={circ * (1 - pct)}
                                transform="rotate(-90 54 54)"
                                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <p className="text-2xl font-black text-white leading-none">
                                {calculations.mindControlAvg.toFixed(1)}<span className="text-xs font-bold text-white/45">/5</span>
                              </p>
                              <p className="text-[11px] font-bold mt-0.5" style={{ color: '#37b5ff' }}>
                                {Math.round(pct * 100)}%
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] text-white/35 text-center leading-relaxed">
                      System calculates average of per-period Emotional Balance ratings automatically.
                    </p>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-6">
                    <p className="text-[10px] text-white/25 text-center">Complete Period Charting<br />to calculate</p>
                  </div>
                )}
              </div>

              {/* #4 Good / Bad Goal Ratio */}
              <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold text-white">#4 — Goal Ratio</p>
                {hasPeriodData ? (
                  <>
                    <div className="flex justify-center">
                      {(() => {
                        const r = 46;
                        const circ = 2 * Math.PI * r;
                        const pct = calculations.goodDecisionRate / 100;
                        return (
                          <div className="relative" style={{ width: 100, height: 100 }}>
                            <svg viewBox="0 0 108 108" width="100" height="100">
                              <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
                              <circle
                                cx="54" cy="54" r={r}
                                fill="none"
                                stroke="#37b5ff"
                                strokeWidth="7"
                                strokeLinecap="round"
                                strokeDasharray={circ}
                                strokeDashoffset={circ * (1 - pct)}
                                transform="rotate(-90 54 54)"
                                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                              <p className="text-sm font-black text-white text-center leading-tight">
                                {calculations.goodGoals} Good,<br />{calculations.badGoals} Weak
                              </p>
                              <p className="text-[11px] font-bold" style={{ color: '#37b5ff' }}>
                                {calculations.goodDecisionRate}%
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] text-white/35 text-center leading-relaxed">
                      {calculations.goodDecisionRate}% Good Decision Factor this game
                    </p>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-6">
                    <p className="text-[10px] text-white/25 text-center">Complete Period Charting<br />to calculate</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* #5 Game Retention Check — 5-Pillar only */}
          {!isBasic && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(255,107,107,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
              <ContextualHelp
                label="#5 — Game Retention Check"
                helpText="How clearly do you remember each period? 1=Very fuzzy. 5=Crystal clear. If 1-2 triggers voice. Game Retention is a skill that builds over time through curriculum."
              >
                <RotatingNumberSelector
                  value={formData.gameRetentionRating}
                  onChange={(val) => update('gameRetentionRating', val as number)}
                  options={GAME_RETENTION_OPTIONS}
                />
              </ContextualHelp>

              {formData.gameRetentionRating <= 2 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t" style={{ borderColor: 'rgba(255,107,107,0.1)' }}>
                  <p className="text-xs text-white/60 mb-2 italic">
                    What do you remember most clearly?
                  </p>
                  <VoiceRecorder
                    onTranscriptionComplete={(text) => update('gameRetentionVoiceNote', text)}
                    initialText={formData.gameRetentionVoiceNote}
                    placeholder="Tap to share what stands out from this game..."
                  />
                </div>
              )}
            </div>
          )}

          {/* #6 One Thing for Mind Vault */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(255,107,107,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <ContextualHelp
              label="#6 — One Thing for Mind Vault"
              helpText="What goes in your Mind Vault from this game? One thing. Could be a save you owned, a reset that worked, a lesson learned. Feeds Mind Vault directly. Every game adds something."
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <Vault className="w-3.5 h-3.5 text-white/60" />
                </div>
                <span className="text-xs text-white/40">Stored in your Mind Vault</span>
              </div>
              <VoiceRecorder
                onTranscriptionComplete={(text) => update('mindVaultEntry', text)}
                initialText={formData.mindVaultEntry}
                placeholder="Tap to record one thing worth keeping..."
              />
            </ContextualHelp>
          </div>

          {/* #7 Practice Index Auto-Generation — 5-Pillar only */}
          {!isBasic && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.12)' }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,107,107,0.1)' }}>
                  <ClipboardList className="w-4 h-4 text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-1">#7 — Practice Index</p>
                  <p className="text-sm font-bold text-white mb-1">Auto-generated on save</p>
                  <p className="text-xs text-white/40 leading-relaxed">
                    System flags items for your Practice Chart: <span className="font-semibold text-red-400">Immediate Development</span> (broke down),{' '}
                    <span className="font-semibold" style={{ color: '#FF6B6B' }}>Refinement</span> (growing),{' '}
                    <span className="font-semibold text-white/50">Maintenance</span> (keep sharp).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* #8 Factor Ratio Summary — 5-Pillar only */}
          {!isBasic && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(255,107,107,0.28)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-semibold text-white">#8 — Factor Ratio Summary</p>
              {hasPeriodData && calculations.periodFactorRatios.length > 0 ? (() => {
                const avg = calculations.periodFactorRatios.reduce((s, r) => s + r.value, 0) / calculations.periodFactorRatios.length;
                return (
                  <div className="space-y-2.5">
                    {calculations.periodFactorRatios.map((pr) => {
                      const trend = pr.value > avg + 0.25 ? 'up' : pr.value < avg - 0.25 ? 'down' : 'flat';
                      return (
                        <div key={pr.label} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-white/50 w-10 flex-shrink-0">{pr.label}</span>
                          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${(pr.value / 5) * 100}%`, background: 'linear-gradient(90deg, #ef4444 0%, #f97316 55%, #fbbf24 100%)' }}
                            />
                          </div>
                          <div className="flex items-center gap-0.5 w-12 justify-end flex-shrink-0">
                            <span className="text-xs font-bold text-white">{pr.value.toFixed(1)}</span>
                            <span className="text-xs font-black leading-none" style={{ color: trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : 'rgba(255,255,255,0.25)' }}>
                              {trend === 'up' ? ' ↗' : trend === 'down' ? ' ↘' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-3 pt-2.5 border-t" style={{ borderColor: 'rgba(255,107,107,0.15)' }}>
                      <span className="text-xs font-bold w-10 flex-shrink-0" style={{ color: '#FF6B6B' }}>Overall</span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,107,107,0.14)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(formData.overallGameFactorRating / 5) * 100}%`, background: 'linear-gradient(90deg, #ef4444 0%, #f97316 55%, #fbbf24 100%)' }}
                        />
                      </div>
                      <div className="flex items-center gap-0.5 w-12 justify-end flex-shrink-0">
                        <span className="text-xs font-bold" style={{ color: '#FF6B6B' }}>{formData.overallGameFactorRating.toFixed(1)}</span>
                        <span className="text-xs font-black leading-none" style={{ color: formData.overallGameFactorRating >= 3 ? '#4ade80' : '#f87171' }}>
                          {formData.overallGameFactorRating >= 3 ? ' ↗' : ' ↘'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <p className="text-xs text-white/35">Complete Period Charting to see visual breakdown.</p>
              )}
            </div>
          )}

        </div>

        {/* ── Priority Improvement Area — 5-Pillar only ────────────────── */}
        {!isBasic && priorityArea ? (
          <div className="rounded-2xl p-5" style={
            priorityArea.urgency === 'critical'
              ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.32)', boxShadow: '0 2px 20px rgba(239,68,68,0.1)' }
              : priorityArea.urgency === 'high'
              ? { background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.32)', boxShadow: '0 2px 20px rgba(249,115,22,0.1)' }
              : { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 2px 20px rgba(245,158,11,0.08)' }
          }>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={
                  priorityArea.urgency === 'critical' ? { background: 'rgba(239,68,68,0.22)' }
                  : priorityArea.urgency === 'high' ? { background: 'rgba(249,115,22,0.22)' }
                  : { background: 'rgba(245,158,11,0.18)' }
                }>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5L14.5 13H1.5L8 1.5Z"
                      stroke={priorityArea.urgency === 'critical' ? '#f87171' : priorityArea.urgency === 'high' ? '#fb923c' : '#fbbf24'}
                      strokeWidth="1.4" strokeLinejoin="round" fill="none"
                    />
                    <line x1="8" y1="6" x2="8" y2="9.5"
                      stroke={priorityArea.urgency === 'critical' ? '#f87171' : priorityArea.urgency === 'high' ? '#fb923c' : '#fbbf24'}
                      strokeWidth="1.4" strokeLinecap="round"
                    />
                    <circle cx="8" cy="11.5" r="0.8"
                      fill={priorityArea.urgency === 'critical' ? '#f87171' : priorityArea.urgency === 'high' ? '#fb923c' : '#fbbf24'}
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                    priorityArea.urgency === 'critical' ? 'text-red-400' : priorityArea.urgency === 'high' ? 'text-orange-400' : 'text-amber-400'
                  }`}>
                    Priority Improvement Area
                  </p>
                  <p className="text-xl font-black text-white leading-tight">{priorityArea.label}</p>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{priorityArea.reason}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(getPillarUrl(priorityArea.pillarSlug))}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:opacity-80 active:scale-[0.97] whitespace-nowrap self-center"
                style={
                  priorityArea.urgency === 'critical'
                    ? { background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.38)', color: '#fca5a5' }
                    : priorityArea.urgency === 'high'
                    ? { background: 'rgba(249,115,22,0.18)', border: '1px solid rgba(249,115,22,0.38)', color: '#fdba74' }
                    : { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#fcd34d' }
                }
              >
                Go to {priorityArea.pillarLabel.split('—')[0].trim()} Pillar
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : !isBasic && !hasPeriodData ? (
          <div className="rounded-2xl p-5 text-center border border-dashed" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,107,107,0.1)' }}>
            <Flag className="w-5 h-5 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/30">Priority Improvement Area generates once Period Charting is complete.</p>
          </div>
        ) : null}

        {/* ── Improvement Focus + What will you do differently — 5-Pillar only ── */}
        {!isBasic && <div className="rounded-2xl p-5 space-y-4" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(255,107,107,0.28)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
          <div>
            <h3 className="text-sm font-semibold text-white">Your Commitment</h3>
            <p className="text-xs text-white/40 mt-0.5">Choose your focus and state what changes next game.</p>
          </div>

          {/* Improvement Focus dropdown */}
          <div className="space-y-2">
            <div className="relative">
              <select
                value={formData.improvementFocus ?? ''}
                onChange={(e) => update('improvementFocus', e.target.value || undefined)}
                className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', color: formData.improvementFocus ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}
              >
                <option value="" style={{ background: '#041830' }}>Select your focus area…</option>
                {IMPROVEMENT_FOCUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ background: '#041830' }}>
                    {opt.label} — {opt.detail}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
            {formData.improvementFocus && (() => {
              const selected = IMPROVEMENT_FOCUS_OPTIONS.find(o => o.value === formData.improvementFocus);
              return selected ? (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.15)' }}>
                  <Brain className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#FF6B6B' }} />
                  <span className="text-[11px] font-semibold" style={{ color: '#FF6B6B' }}>{selected.pillar} Pillar</span>
                </div>
              ) : null;
            })()}
          </div>

          {/* What will you do differently */}
          <div className="space-y-1.5">
            <p className="text-xs text-white/40">One concrete change. Specific, not vague. Before the feeling fades.</p>
            <VoiceRecorder
              onTranscriptionComplete={(text) => update('whatWillYouDoDifferently', text)}
              initialText={formData.whatWillYouDoDifferently}
              placeholder="Tap to state your commitment for next game…"
            />
          </div>
        </div>}

        {/* ── Bottom save ──────────────────────────────────────────────── */}
        <div className="pb-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto h-10 text-white rounded-lg text-sm font-bold px-8 border-0"
            style={{ background: '#FF6B6B', boxShadow: '0 4px 14px rgba(255,107,107,0.25)' }}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Post-Game</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
