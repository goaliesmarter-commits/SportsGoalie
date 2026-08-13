'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { useRouter, useParams } from 'next/navigation';
import { chartingService } from '@/lib/database';
import { Session, V2PeriodData, GoalEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Plus, X, Brain, Zap, Target, Layers, Crosshair, HelpCircle } from 'lucide-react';
import {
  ContextualHelp,
  RotatingNumberSelector,
  StarRating,
  GoalClassifier,
  VoiceRecorder,
} from '@/components/charting/inputs';
import type { StarDefinition } from '@/components/charting/inputs';
import { toast } from 'sonner';

// ─── Constants ───────────────────────────────────────────────────────────────

const MIND_CONTROL_DEFINITIONS: StarDefinition[] = [
  { rating: 1, title: 'Not in the Now', description: 'Mind was elsewhere. Thinking about school, friends, last game, or anything but the current play. Barely tracking the puck.' },
  { rating: 2, title: 'Present but Not Present', description: 'Body was there but mind was drifting. Moments of awareness mixed with stretches of distraction.' },
  { rating: 3, title: 'Developing the Off Switch', description: 'Learning to shut out distractions. Some good stretches of focus, but inconsistent. Building the habit.' },
  { rating: 4, title: 'Review Reset Reaffirm', description: 'After each play, reviewing what happened, resetting position and mind, reaffirming focus. Active mental management.' },
  { rating: 5, title: 'Command Center Operating', description: 'Fully locked in. Eyes tracking puck, reading plays before they develop, body responding automatically. In the zone.' },
];

const FACTOR_RATIO_OPTIONS = [
  { value: 1, label: '1 — Low challenge' },
  { value: 2, label: '2 — Below average' },
  { value: 3, label: '3 — Average' },
  { value: 4, label: '4 — High challenge' },
  { value: 5, label: '5 — Maximum challenge' },
];

const SKATING_DEFINITIONS: StarDefinition[] = [
  { rating: 1, title: 'Knowledge Base',        description: 'Sees and understands correct edge work, weight distribution, and the equilibrium line in motion. Knows what proper skating should look like.' },
  { rating: 2, title: 'Identify and Adjust',   description: 'Has proved they can do it — now identifying where the feet, weight, or recovery break down, and adjusting to strengthen the mind-to-body link.' },
  { rating: 3, title: 'Building Consistency',  description: 'Controlled movement repeating more often. Reads the equilibrium shift in stretches; balance holds longer under speed.' },
  { rating: 4, title: 'Owning the Tech',       description: 'Skating applied consistently and on time. Weight distributed, edges controlled, recovery on balance — under pressure.' },
  { rating: 5, title: 'Polish',                description: 'Equilibrium owned through every shift. Edges, weight, and recovery automatic in all directions. Skating is the weapon, not survival.' },
];

const SEVEN_AMS_DEFINITIONS: StarDefinition[] = [
  { rating: 1, title: 'Knowledge Base',        description: 'Understands the seven angle marks and why position on the line takes away net. Knows where to be and why.' },
  { rating: 2, title: 'Identify and Adjust',   description: 'Can find the marks — now identifying when off the line or late, and adjusting to square up earlier.' },
  { rating: 3, title: 'Building Consistency',  description: 'Hitting the right marks more often. Reads the angle before the shot in stretches; still thinking it through under pressure.' },
  { rating: 4, title: 'Owning the Tech',       description: 'Square and set on the line consistently. Trusts the marks, arrives on time, holds the angle through the play.' },
  { rating: 5, title: 'Polish',                description: 'Lives on the line. The angle is felt, not found. Shooters run out of net — positioning is automatic.' },
];

const SIX_ZS_DEFINITIONS: StarDefinition[] = [
  { rating: 1, title: 'Knowledge Base',        description: 'Understands the six zones below the icing line and the reads each demands. Knows the threats and the repositioning each zone requires.' },
  { rating: 2, title: 'Identify and Adjust',   description: 'Can recognize the zone — now identifying when chasing the puck instead of reading the play, and adjusting to anticipate.' },
  { rating: 3, title: 'Building Consistency',  description: 'Reading the zone threats more often. Anticipates the next pass in stretches; the equilibrium shift still slips in tight, fast situations.' },
  { rating: 4, title: 'Owning the Tech',       description: 'Reads options early and consistently. Positioned for the next play, controls the equilibrium shift in tight quarters.' },
  { rating: 5, title: 'Polish',                description: 'Owns the low zone. Sees the play before it forms, takes away their best option. Command below the icing line is automatic.' },
];

const FORM_DEFINITIONS: StarDefinition[] = [
  { rating: 1, title: 'Knowledge Base',        description: 'Understands the Cross Theory (stick/head aligned, glove/blocker aligned) and the equilibrium line head to toe. Knows what controlled form looks like.' },
  { rating: 2, title: 'Identify and Adjust',   description: 'Can show the form — now identifying where the cross breaks or weight misplaces under pressure, and adjusting to hold it.' },
  { rating: 3, title: 'Building Consistency',  description: 'Sound form repeating more often. Cross holds and weight distributes correctly in calmer moments; cracks under speed or traffic.' },
  { rating: 4, title: 'Owning the Tech',       description: 'Cross aligned and equilibrium held consistently. Weight distributed correctly through motion, under pressure — the form is theirs.' },
  { rating: 5, title: 'Polish',                description: 'Cross, equilibrium, and weight owned and automatic. No thought required — the body knows. Technique is refined into a weapon.' },
];

type PeriodKey = 'period1' | 'period2' | 'period3' | 'overtime';

const PERIOD_TABS: { key: PeriodKey; label: string; short: string }[] = [
  { key: 'period1', label: 'Period 1', short: 'P1' },
  { key: 'period2', label: 'Period 2', short: 'P2' },
  { key: 'period3', label: 'Period 3', short: 'P3' },
];

function createEmptyPeriod(): V2PeriodData {
  return {
    shots: 0,
    saves: 0,
    goalsAgainst: 0,
    standardSaves: 0,
    keySaves: 0,
    weakGoals: 0,
    midChallengeCount: 0,
    highChallengeCount: 0,
    goals: [],
    mindControlRating: 3,
    mindControlVoiceNote: undefined,
    // Factor Ratio starts unanswered, like the four technical Pillars. Seeding
    // it with 1 meant an untouched period saved as "low challenge" and counted
    // as real data in every average downstream.
    periodFactorRatio: undefined,
  };
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────

interface StatRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  helpText: string;
}

function StatRow({ label, value, onChange, helpText }: StatRowProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const plusBg = '#7dd3fc';

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3.5">
        <button
          type="button"
          onClick={() => setHelpOpen(v => !v)}
          className="flex items-center gap-2 text-left group"
        >
          <span className="text-sm font-semibold text-white group-hover:text-white/80 transition-colors">{label}</span>
          <HelpCircle className="w-3.5 h-3.5 text-white/25 group-hover:text-[#37b5ff] transition-colors flex-shrink-0" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(Math.max(0, value - 1))}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold text-white/60 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            aria-label={`Decrease ${label}`}
          >
            −
          </button>
          <span className="text-xl font-black text-white tabular-nums w-8 text-center leading-none">{value}</span>
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-lg font-bold transition-all active:scale-95"
            style={{ background: plusBg }}
            aria-label={`Increase ${label}`}
          >
            +
          </button>
        </div>
      </div>
      {helpOpen && (
        <div className="px-4 pb-3 -mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="text-xs text-white/55 leading-relaxed rounded-lg px-3 py-2.5" style={{ background: 'rgba(55,181,255,0.06)', border: '1px solid rgba(55,181,255,0.1)' }}>
            {helpText}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function V2PeriodsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<PeriodKey>('period1');
  const [showOvertime, setShowOvertime] = useState(false);

  const [periods, setPeriods] = useState<Record<PeriodKey, V2PeriodData>>({
    period1: createEmptyPeriod(),
    period2: createEmptyPeriod(),
    period3: createEmptyPeriod(),
    overtime: createEmptyPeriod(),
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
            const v2Periods = (myEntry as unknown as { v2Periods?: Record<PeriodKey, V2PeriodData> }).v2Periods;
            if (v2Periods) {
              setPeriods(prev => ({
                period1: v2Periods.period1 || prev.period1,
                period2: v2Periods.period2 || prev.period2,
                period3: v2Periods.period3 || prev.period3,
                overtime: v2Periods.overtime || prev.overtime,
              }));
              if (v2Periods.overtime?.mindControlRating) setShowOvertime(true);
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

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !session) return;
    setSaving(true);
    try {
      const entriesResult = await chartingService.getChartingEntriesBySession(sessionId);
      const existingEntries = entriesResult.success ? entriesResult.data || [] : [];
      const myEntry = existingEntries.find(e => e.submittedBy === user.id);

      const periodsToSave: Record<string, V2PeriodData> = {
        period1: periods.period1,
        period2: periods.period2,
        period3: periods.period3,
      };
      if (showOvertime) periodsToSave.overtime = periods.overtime;

      const entryData: Record<string, unknown> = {
        sessionId: session.id,
        studentId: session.studentId,
        submittedBy: user.id,
        submitterRole: (user.role || 'student') as 'student' | 'admin',
        v2Periods: periodsToSave,
        v2Version: 'v2',
      };

      if (myEntry) {
        const preserveFields = ['gameOverview', 'period1', 'period2', 'period3', 'overtime', 'shootout', 'postGame', 'preGame', 'v2PreGame', 'v2PostGame'] as const;
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

      toast.success('Period charting saved!');
      router.push(`/charting/sessions/${sessionId}/v2/post-game`);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  // ── Update helpers ────────────────────────────────────────────────────────
  const updatePeriod = <K extends keyof V2PeriodData>(key: K, value: V2PeriodData[K]) => {
    setPeriods(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [key]: value },
    }));
  };

  const updateGoals = (goals: GoalEntry[]) => {
    setPeriods(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], goals },
    }));
  };

  const activePeriod = periods[activeTab];
  const allTabs = showOvertime ? [...PERIOD_TABS, { key: 'overtime' as PeriodKey, label: 'Overtime', short: 'OT' }] : PERIOD_TABS;
  const isBasic = user?.chartLevel === 'basic';

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
          <Button variant="outline" onClick={() => router.push('/charting')} className="border-[rgba(55,181,255,0.3)] text-white/70 hover:text-white hover:bg-[rgba(55,181,255,0.1)]">Back to Sessions</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#041830' }}>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 backdrop-blur-md border-b" style={{ background: 'rgba(6,30,58,0.97)', borderColor: 'rgba(55,181,255,0.14)' }}>
        <div className="flex items-center justify-between px-6 h-14">
          <button
            type="button"
            onClick={() => router.push(`/charting/sessions/${sessionId}`)}
            className="flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-sm font-bold text-white">Period Charting</h1>
          <div className="w-16" />
        </div>

        {/* Period tabs */}
        <div className="px-6 pb-2">
          <div className="flex gap-1.5 max-w-md">
            {allTabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 h-8 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'text-white shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                }`}
                style={activeTab === tab.key
                  ? { background: '#37b5ff', boxShadow: '0 2px 8px rgba(55,181,255,0.25)' }
                  : { background: 'rgba(255,255,255,0.07)' }
                }
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
            {!showOvertime && (
              <button
                type="button"
                onClick={() => { setShowOvertime(true); setActiveTab('overtime'); }}
                className="h-8 px-3 rounded-lg text-xs font-medium text-white/40 hover:text-[#37b5ff] transition-colors flex items-center gap-1"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <Plus className="w-3 h-3" /> OT
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className="px-8 py-6 space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-white">
              {allTabs.find(t => t.key === activeTab)?.label}
            </h2>
            <p className="text-sm text-white/50 mt-0.5">
              Chart from memory — how did this period go?
            </p>
          </div>
          {/* OT remove option */}
          {activeTab === 'overtime' && (
            <button
              type="button"
              onClick={() => { setShowOvertime(false); setActiveTab('period3'); }}
              className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>

        {/* ── Stat Counters ────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.26)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Period Stats</p>
            <p className="text-[11px] text-white/30 mt-0.5">Tap any stat label to see its definition</p>
          </div>
          <div className="divide-y divide-white/[0.05]">
            <StatRow label="Shots" value={activePeriod.shots} onChange={(v) => updatePeriod('shots', v)} helpText="Total pucks directed on net this period — all saves and goals combined. Your primary volume number." />
            <StatRow label="Saves" value={activePeriod.saves} onChange={(v) => updatePeriod('saves', v)} helpText="Total saves made this period. Should equal Shots minus Goals Against. Your raw stop count." />
            <StatRow
              label="Goals Against"
              value={activePeriod.goalsAgainst}
              onChange={(v) => {
                updatePeriod('goalsAgainst', v);
                if (v < activePeriod.goals.length) updateGoals(activePeriod.goals.slice(0, v));
              }}
              helpText="Pucks that crossed the line this period. Classify each one as Good or Bad in the Goal Classification section below."
                         />
            <StatRow label="Standard Saves" value={activePeriod.standardSaves} onChange={(v) => updatePeriod('standardSaves', v)} helpText="Saves on shots within your positional range — controlled, no scramble. Should be automatic at your level. Tracks consistency and positioning." />
            <StatRow label="Key Saves" value={activePeriod.keySaves} onChange={(v) => updatePeriod('keySaves', v)} helpText="High-stakes saves that changed momentum or kept the game tied — breakaways, 2-on-1s, slot shots, cross-crease chances. The saves the team remembers." />
            <StatRow label="Weak Goals" value={activePeriod.weakGoals} onChange={(v) => updatePeriod('weakGoals', v)} helpText="Goals clearly within your control — positioning was off, form broke down, or focus lapsed. Honest self-assessment only. These feed your Practice Index." />
            <StatRow label="Mid-Challenge" value={activePeriod.midChallengeCount} onChange={(v) => updatePeriod('midChallengeCount', v)} helpText="Shots from mid-danger positions this period — outside edge of the slot, point shots with traffic, perimeter shots through screens." />
            <StatRow label="High-Challenge" value={activePeriod.highChallengeCount} onChange={(v) => updatePeriod('highChallengeCount', v)} helpText="Shots from high-danger positions — in-tight, in-close, slot, breakaways, cross-crease passes. These test your reads and reactions most." />
          </div>
        </div>

        {/* ── Goal Classification ───────────────────────────────────────────── */}
        {activePeriod.goalsAgainst > 0 && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.26)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <ContextualHelp
              label="Goal Classification"
              helpText="Good Goal: Correct position, correct read, correct decision — puck still went in. Not your fault. Weak Goal: Breakdown in position, read, form, or mental execution within your control."
            >
              <GoalClassifier
                goalCount={activePeriod.goalsAgainst}
                goals={activePeriod.goals}
                onChange={updateGoals}
              />
            </ContextualHelp>
          </div>
        )}

        {/* ── Period Factor Ratio — 5-Pillar only ──────────────────────────── */}
        {!isBasic && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.26)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <ContextualHelp
              label="Period Factor Ratio"
              helpText="How challenging was this period? 1 = Low challenge, easy opposition. 5 = Maximum challenge, elite opposition, constant pressure."
            >
              <RotatingNumberSelector
                value={activePeriod.periodFactorRatio}
                onChange={(val) => updatePeriod('periodFactorRatio', val as number)}
                options={FACTOR_RATIO_OPTIONS}
              />
              {/*
                Nothing is pre-selected, so say so — an empty row of buttons on
                its own reads as a rendering glitch rather than a question.
              */}
              {activePeriod.periodFactorRatio === undefined && (
                <p className="text-[11px] text-white/35 mt-2">
                  Not rated yet — leave it blank if you&apos;re not sure. Skipped periods are
                  left out of your averages rather than counted as a 1.
                </p>
              )}
            </ContextualHelp>
          </div>
        )}

        {/* ── Pillar Ratings (MindSet · Skating · 7AMS · 6 Zone · Form) ─────── */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Pillar Ratings</p>
            <p className="text-[11px] text-white/30 mt-0.5">
              {isBasic ? 'Rate your mental command this period' : 'MindSet · Skating · 7AMS · 6 Zone – 7 Point System™ · Form — tap any star to see its definition'}
            </p>
          </div>

          <div className="space-y-5">

            {/* ── MindSet (Mind Control) ──────────────────────────────────── */}
            <div className="rounded-xl p-4 space-y-3 transition-colors duration-300" style={
              activePeriod.mindControlRating <= 2
                ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }
                : { background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.26)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }
            }>
              <ContextualHelp
                label="Emotional Balance"
                helpText="Rate your mental command during this period. 1 = Not in the Now, 5 = Command Center Operating. Tap any star to see its full definition."
              >
                <StarRating
                  value={activePeriod.mindControlRating}
                  onChange={(val) => {
                    if (val > 2) {
                      setPeriods(prev => ({
                        ...prev,
                        [activeTab]: {
                          ...prev[activeTab],
                          mindControlRating: val,
                          mindControlChallengeLevel: undefined,
                          mindControlVoiceNote: undefined,
                        },
                      }));
                    } else {
                      updatePeriod('mindControlRating', val);
                    }
                  }}
                  definitions={MIND_CONTROL_DEFINITIONS}
                />
              </ContextualHelp>

              {/* ── Low-Star Specificity Flow ────────────────────────────── */}
              {activePeriod.mindControlRating <= 2 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4 pt-3 border-t" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>

                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)' }}>
                      <span className="text-[10px] font-black text-red-400">!</span>
                    </div>
                    <p className="text-xs font-semibold text-red-400">Mind breakdown flagged — let&apos;s get specific</p>
                  </div>

                  {/* Step 1 — Challenge level selector */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-white/70">
                      What was the challenge level when focus broke down?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'mid', 'high'] as const).map((level) => {
                        const isSelected = activePeriod.mindControlChallengeLevel === level;
                        const labels = { low: 'Low', mid: 'Mid', high: 'High' };
                        const descs = {
                          low: 'Easy play — no real pressure',
                          mid: 'Moderate pressure on the play',
                          high: 'High-danger, in-tight, breakaway',
                        };
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => updatePeriod('mindControlChallengeLevel', isSelected ? undefined : level)}
                            title={descs[level]}
                            className="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all duration-200"
                            style={isSelected
                              ? { background: '#ef4444', borderColor: '#ef4444', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }
                              : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(239,68,68,0.2)' }
                            }
                          >
                            <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-white/70'}`}>{labels[level]}</span>
                            <span className={`text-[9px] font-medium leading-tight ${isSelected ? 'text-red-100' : 'text-white/35'}`}>
                              {descs[level]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2 — Situation notes */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-white/70">Situation Notes</p>
                    <p className="text-[11px] text-white/45 -mt-1">What had your attention instead of the game?</p>
                    <VoiceRecorder
                      onTranscriptionComplete={(text) => updatePeriod('mindControlVoiceNote', text)}
                      initialText={activePeriod.mindControlVoiceNote}
                      placeholder="Tap to describe what distracted you..."
                    />
                  </div>

                  {/* Step 3 — Pillar connection indicator */}
                  <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                      <Brain className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Training Focus</p>
                      <p className="text-xs font-semibold text-white/70">Work on Pillar 1 — MindSet</p>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* ── Technical Pillars — 5-Pillar only ───────────────────────── */}
            {!isBasic && (
              <>

                {/* ── Skating ─────────────────────────────────────────────── */}
              <div className="rounded-xl p-4 space-y-3 transition-colors duration-300" style={
                activePeriod.skatingRating !== undefined && activePeriod.skatingRating <= 2
                  ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }
                  : { background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.26)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }
              }>
                <ContextualHelp
                  label="Skating"
                  helpText="Rate your skating command this period — edge work, weight distribution, and equilibrium in motion. The athletic foundation under every other Pillar."
                >
                  <StarRating
                    value={activePeriod.skatingRating ?? null}
                    onChange={(val) => {
                      if (val > 2) {
                        setPeriods(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], skatingRating: val, skatingVoiceNote: undefined } }));
                      } else {
                        updatePeriod('skatingRating', val);
                      }
                    }}
                    definitions={SKATING_DEFINITIONS}
                  />
                </ContextualHelp>
                {activePeriod.skatingRating !== undefined && activePeriod.skatingRating <= 2 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-3 border-t" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)' }}>
                        <span className="text-[10px] font-black text-red-400">!</span>
                      </div>
                      <p className="text-xs font-semibold text-red-400">Skating breakdown flagged — what broke down?</p>
                    </div>
                    <VoiceRecorder
                      onTranscriptionComplete={(text) => updatePeriod('skatingVoiceNote', text)}
                      initialText={activePeriod.skatingVoiceNote}
                      placeholder="Describe the skating breakdown this period..."
                    />
                    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                        <Zap className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Training Focus</p>
                        <p className="text-xs font-semibold text-white/70">Work on Skating — Athletic Foundation</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 7AMS ────────────────────────────────────────────────── */}
              <div className="rounded-xl p-4 space-y-3 transition-colors duration-300" style={
                activePeriod.sevenAMSRating !== undefined && activePeriod.sevenAMSRating <= 2
                  ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }
                  : { background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.26)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }
              }>
                <ContextualHelp
                  label="7AMS — Angle Marks"
                  helpText="Rate your positional command above the icing line — hitting the seven angle marks and taking away net on every shot."
                >
                  <StarRating
                    value={activePeriod.sevenAMSRating ?? null}
                    onChange={(val) => {
                      if (val > 2) {
                        setPeriods(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], sevenAMSRating: val, sevenAMSVoiceNote: undefined } }));
                      } else {
                        updatePeriod('sevenAMSRating', val);
                      }
                    }}
                    definitions={SEVEN_AMS_DEFINITIONS}
                  />
                </ContextualHelp>
                {activePeriod.sevenAMSRating !== undefined && activePeriod.sevenAMSRating <= 2 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-3 border-t" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)' }}>
                        <span className="text-[10px] font-black text-red-400">!</span>
                      </div>
                      <p className="text-xs font-semibold text-red-400">7AMS breakdown flagged — what broke down?</p>
                    </div>
                    <VoiceRecorder
                      onTranscriptionComplete={(text) => updatePeriod('sevenAMSVoiceNote', text)}
                      initialText={activePeriod.sevenAMSVoiceNote}
                      placeholder="Describe the angle or positioning breakdown..."
                    />
                    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                        <Target className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Training Focus</p>
                        <p className="text-xs font-semibold text-white/70">Work on 7AMS — Seven Angle-Mark System</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 6ZS ─────────────────────────────────────────────────── */}
              <div className="rounded-xl p-4 space-y-3 transition-colors duration-300" style={
                activePeriod.sixZSRating !== undefined && activePeriod.sixZSRating <= 2
                  ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }
                  : { background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.26)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }
              }>
                <ContextualHelp
                  label="6 Zone – 7 Point System™ — Zone Command"
                  helpText="Rate your command below the icing line — reading the six zones, anticipating passes, and repositioning ahead of the play."
                >
                  <StarRating
                    value={activePeriod.sixZSRating ?? null}
                    onChange={(val) => {
                      if (val > 2) {
                        setPeriods(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], sixZSRating: val, sixZSVoiceNote: undefined } }));
                      } else {
                        updatePeriod('sixZSRating', val);
                      }
                    }}
                    definitions={SIX_ZS_DEFINITIONS}
                  />
                </ContextualHelp>
                {activePeriod.sixZSRating !== undefined && activePeriod.sixZSRating <= 2 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-3 border-t" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)' }}>
                        <span className="text-[10px] font-black text-red-400">!</span>
                      </div>
                      <p className="text-xs font-semibold text-red-400">6 Zone – 7 Point System™ breakdown flagged — what broke down?</p>
                    </div>
                    <VoiceRecorder
                      onTranscriptionComplete={(text) => updatePeriod('sixZSVoiceNote', text)}
                      initialText={activePeriod.sixZSVoiceNote}
                      placeholder="Describe the zone read or positioning breakdown..."
                    />
                    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                        <Layers className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Training Focus</p>
                        <p className="text-xs font-semibold text-white/70">Work on Pillar 3 — 6 Zone – 7 Point System™</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Form ────────────────────────────────────────────────── */}
              <div className="rounded-xl p-4 space-y-3 transition-colors duration-300" style={
                activePeriod.formRating !== undefined && activePeriod.formRating <= 2
                  ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }
                  : { background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.26)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }
              }>
                <ContextualHelp
                  label="Form"
                  helpText="Rate your technical execution this period — Cross Theory alignment (stick/head, glove/blocker) and the Equilibrium Line from head to toe."
                >
                  <StarRating
                    value={activePeriod.formRating ?? null}
                    onChange={(val) => {
                      if (val > 2) {
                        setPeriods(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], formRating: val, formVoiceNote: undefined } }));
                      } else {
                        updatePeriod('formRating', val);
                      }
                    }}
                    definitions={FORM_DEFINITIONS}
                  />
                </ContextualHelp>
                {activePeriod.formRating !== undefined && activePeriod.formRating <= 2 && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-3 border-t" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)' }}>
                        <span className="text-[10px] font-black text-red-400">!</span>
                      </div>
                      <p className="text-xs font-semibold text-red-400">Form breakdown flagged — what broke down?</p>
                    </div>
                    <VoiceRecorder
                      onTranscriptionComplete={(text) => updatePeriod('formVoiceNote', text)}
                      initialText={activePeriod.formVoiceNote}
                      placeholder="Describe where the cross or equilibrium broke down..."
                    />
                    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                        <Crosshair className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Training Focus</p>
                        <p className="text-xs font-semibold text-white/70">Work on Form — Cross Theory & Equilibrium</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              </>
            )}

          </div>
        </div>

        {/* ── Bottom save ──────────────────────────────────────────────── */}
        <div className="pb-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto h-10 rounded-lg text-sm font-bold px-8 border-0"
            style={{ background: 'linear-gradient(135deg, #37b5ff, #0ea5e9)', color: '#fff', boxShadow: '0 4px 14px rgba(55,181,255,0.3)' }}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Periods</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
