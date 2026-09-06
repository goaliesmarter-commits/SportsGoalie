'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Trophy, Loader2, Save, Eye, GitMerge, Lightbulb, Users, ArrowRight, Timer, BarChart3, MessageSquare, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { chartingService, userService } from '@/lib/database';
import { coachChartingService } from '@/lib/database/services/coach-charting.service';
import {
  Session,
  User as UserType,
  CoachChartEntry,
  CoachReadinessLevel,
  CoachPriorityFactor,
  CoachPeriodData,
  CoachPreGameData,
  CoachPostGameData,
} from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { StarRating, ContextualHelp } from '@/components/charting/inputs';
import type { StarDefinition } from '@/components/charting/inputs';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLUE  = '#37b5ff';
const GOLD  = '#D4A93B';
const GREEN = '#4ade80';
const cardBg = 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)';
const border  = '1px solid rgba(55,181,255,0.22)';

type PeriodKey  = 'period1' | 'period2' | 'period3' | 'overtime';
type SectionKey = 'preGame' | 'periods' | 'postGame';

interface PeriodFormData {
  engagedRating: number | null;
  engagedBreakdown: string;
  engagedNote: string;
  mentalComposureRating: number | null;
  mentalComposureBreakdown: string;
  mentalComposureNote: string;
  skatingInSyncRating: number | null;
  skatingBreakdown: string;
  skatingNote: string;
  positioningRating: number | null;
  positioningBreakdown: string;
  positioningNote: string;
  belowLineRating: number | null;
  belowLineBreakdown: string;
  belowLineNote: string;
  formRating: number | null;
  formBreakdown: string;
  formNote: string;
  readingPlayRating: number | null;
  readingPlayBreakdown: string;
  readingPlayNote: string;
}

const emptyPeriod = (): PeriodFormData => ({
  engagedRating: null,          engagedBreakdown: '',          engagedNote: '',
  mentalComposureRating: null,  mentalComposureBreakdown: '',  mentalComposureNote: '',
  skatingInSyncRating: null,    skatingBreakdown: '',          skatingNote: '',
  positioningRating: null,      positioningBreakdown: '',      positioningNote: '',
  belowLineRating: null,        belowLineBreakdown: '',        belowLineNote: '',
  formRating: null,             formBreakdown: '',             formNote: '',
  readingPlayRating: null,      readingPlayBreakdown: '',      readingPlayNote: '',
});

// ─── Star Definitions ─────────────────────────────────────────────────────────

const WARMUP_DEFS: StarDefinition[] = [
  { rating: 1, title: 'Scattered',             description: 'Lazy or distracted. No puck tracking, no routine purpose.' },
  { rating: 2, title: 'Going Through Motions', description: 'Present but not engaged. Missing the intent behind the warmup.' },
  { rating: 3, title: 'Adequate',              description: 'Basic tracking and movement — functional, but no real intensity.' },
  { rating: 4, title: 'Solid',                 description: 'Controlled movement, tracking pucks. Routine is present and purposeful.' },
  { rating: 5, title: 'Locked In',             description: 'Everything purposeful. Sharp tracking, consistent routine. Game ready.' },
];

const ENGAGED_DEFS: StarDefinition[] = [
  { rating: 1, title: 'Fading',      description: 'Disconnected. Not tracking the play. Mind elsewhere — body in the net.' },
  { rating: 2, title: 'Drifting',    description: 'Moments of awareness but losing the thread between plays.' },
  { rating: 3, title: 'Present',     description: 'Tracking the puck, reacting to threats. Engaged but reactive.' },
  { rating: 4, title: 'Dialled In',  description: 'Reading through the 3 Priorities. Visual, Mental, Physical channels all active.' },
  { rating: 5, title: 'Locked',      description: 'Fully competing through all three channels. In command of every shift.' },
];

const COMPOSURE_DEFS: StarDefinition[] = [
  { rating: 1, title: 'Broke Down', description: "Clear frustration visible. Head dropped. Couldn't reset after goals." },
  { rating: 2, title: 'Shaky',      description: 'Emotional response visible. Recovery was slow and incomplete.' },
  { rating: 3, title: 'Managing',   description: 'Contained, but the effort was visible. Learning the reset.' },
  { rating: 4, title: 'Composed',   description: 'Bounced back quickly. Emotional regulation holding under pressure.' },
  { rating: 5, title: 'Automatic',  description: 'Off-switch after every goal. Bench presence strong. Nothing carries over.' },
];

const SKATING_DEFS: StarDefinition[] = [
  { rating: 1, title: 'Knowledge Base',       description: 'Understands correct edge work and the equilibrium line in motion.' },
  { rating: 2, title: 'Identify and Adjust',  description: 'Identifying where feet, weight, or recovery break down and adjusting.' },
  { rating: 3, title: 'Building Consistency', description: 'Controlled movement repeating more often. Balance holds longer under speed.' },
  { rating: 4, title: 'Owning the Tech',      description: 'Skating applied consistently and on time — edges, weight, recovery under pressure.' },
  { rating: 5, title: 'Polish',               description: 'Equilibrium owned through every shift. Edges and weight automatic in all directions.' },
];

const SEVEN_AMS_DEFS: StarDefinition[] = [
  { rating: 1, title: 'Knowledge Base',       description: 'Understands the seven angle marks and why position on the line takes away net.' },
  { rating: 2, title: 'Identify and Adjust',  description: 'Can find the marks — identifying when off the line or late, and adjusting to square up earlier.' },
  { rating: 3, title: 'Building Consistency', description: 'Hitting the right marks more often. Still thinking through the angle under pressure.' },
  { rating: 4, title: 'Owning the Tech',      description: 'Square and set on the line consistently. Trusts the marks, arrives on time.' },
  { rating: 5, title: 'Polish',               description: 'Lives on the line. The angle is felt, not found. Shooters run out of net.' },
];

const SIX_ZS_DEFS: StarDefinition[] = [
  { rating: 1, title: 'Knowledge Base',       description: 'Understands the six zones below the icing line and the reads each demands.' },
  { rating: 2, title: 'Identify and Adjust',  description: "Can recognize the zone — identifying when chasing instead of reading, and adjusting to anticipate." },
  { rating: 3, title: 'Building Consistency', description: 'Reading zone threats more often. Anticipates the next pass in stretches.' },
  { rating: 4, title: 'Owning the Tech',      description: 'Reads options early and consistently. Positioned for the next play.' },
  { rating: 5, title: 'Polish',               description: 'Owns the low zone. Sees the play before it forms. Command below the icing line is automatic.' },
];

const FORM_DEFS: StarDefinition[] = [
  { rating: 1, title: 'Knowledge Base',       description: 'Understands Cross Theory (stick/head aligned, glove/blocker aligned) and the equilibrium line.' },
  { rating: 2, title: 'Identify and Adjust',  description: 'Can show the form — identifying where the cross breaks under pressure and adjusting to hold it.' },
  { rating: 3, title: 'Building Consistency', description: 'Sound form repeating more often. Holds in calm moments; cracks under speed or traffic.' },
  { rating: 4, title: 'Owning the Tech',      description: 'Cross aligned and equilibrium held consistently. Weight distributed correctly through motion.' },
  { rating: 5, title: 'Polish',               description: 'Cross, equilibrium, and weight owned and automatic. Technique is refined into a weapon.' },
];

const READING_DEFS: StarDefinition[] = [
  { rating: 1, title: 'Behind',          description: "Reactive. Seeing what just happened, not what's coming." },
  { rating: 2, title: 'Catching Up',     description: 'Occasional reads. Mostly reacting to plays that have already developed.' },
  { rating: 3, title: 'Tracking',        description: 'Following the puck through the zones. Starting to anticipate threats.' },
  { rating: 4, title: 'Anticipating',    description: 'Reading plays before they form. Shot vs pass identified early.' },
  { rating: 5, title: 'Seeing the Game', description: 'Reads through the neutral zone entry, anticipates every option. Ahead of the play.' },
];

const OVERALL_DEFS: StarDefinition[] = [
  { rating: 1, title: 'Off Night',      description: 'Multiple areas broke down. Confidence may be shaken. Targeted support needed.' },
  { rating: 2, title: 'Below Standard', description: 'Struggled in key areas. Work to do before the next game.' },
  { rating: 3, title: 'Average',        description: "Some things held, some didn't. Room to grow. Progress is there." },
  { rating: 4, title: 'Strong',         description: 'Above the line more often than not. Development is showing.' },
  { rating: 5, title: 'Exceptional',    description: 'Elevated performance. Command across the board. Build on this.' },
];

// ─── Breakdown Options ────────────────────────────────────────────────────────

const BREAKDOWN_OPTIONS: Record<string, string[]> = {
  engaged:         ['Distracted / mind elsewhere', 'Not tracking the puck', 'Passive — watching, not competing', 'Mentally checked out after a goal'],
  mentalComposure: ['Visible frustration after goals', 'Head dropped / body language shifted', "Couldn't reset between plays", 'Focus lost mid-period'],
  skatingInSync:   ['Scrambling, not controlled', 'Delayed reactions to puck', 'Looking but not moving', 'Balance / edge issues'],
  positioning:     ['Off the line / wrong angle', 'Too deep / too far out', 'Late to square', 'Wrong depth on angle shots'],
  belowLine:       ['Lost behind-net plays', 'Wrap-around vulnerabilities', 'Post integration off', 'Late repositioning on low threats'],
  form:            ['Stick / head alignment off', 'Glove / blocker out of position', 'Weight distribution uneven', 'Equilibrium lost through motion'],
  readingPlay:     ['Reacting, not anticipating', 'Missed neutral zone read', "Couldn't identify shot vs pass", 'Behind the play'],
};

// ─── Priority Factor Labels ───────────────────────────────────────────────────

const PRIORITY_FACTOR_LABELS: Record<CoachPriorityFactor, string> = {
  engaged:          'Engaged',
  mental_composure: 'Mental Composure',
  skating_in_sync:  'Skating in Sync',
  positioning_7ams: 'Positioning (7AMS)',
  below_line_6zs:   'Below the Line (6Z-7PS)',
  form:             'Form',
  reading_play:     'Reading the Play',
};

const READINESS_OPTIONS: { value: CoachReadinessLevel; label: string; color: string }[] = [
  { value: 'locked_in',            label: 'Locked In',             color: GREEN },
  { value: 'solid',                label: 'Solid',                 color: BLUE },
  { value: 'going_through_motions',label: 'Going Through Motions', color: '#fbbf24' },
  { value: 'unfocused',            label: 'Unfocused',             color: '#f97316' },
  { value: 'concerning',           label: 'Concerning',            color: '#f87171' },
];

const PERIOD_TABS: { key: PeriodKey; label: string }[] = [
  { key: 'period1',  label: 'P1' },
  { key: 'period2',  label: 'P2' },
  { key: 'period3',  label: 'P3' },
  { key: 'overtime', label: 'OT' },
];

// ─── IntroOverlay ─────────────────────────────────────────────────────────────

function IntroOverlay({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="min-h-screen flex flex-col animate-in fade-in duration-300"
      style={{ background: '#041830' }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 w-[600px] h-[600px] opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #D4A93B 0%, transparent 70%)', transform: 'translate(-50%, -30%)' }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-5 py-8 max-w-4xl mx-auto w-full">

        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
            style={{ background: 'rgba(212,169,59,0.1)', border: '1px solid rgba(212,169,59,0.2)' }}
          >
            <Eye className="w-3.5 h-3.5" style={{ color: '#D4A93B' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#D4A93B' }}>Coaching Mode</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            Before You Chart
          </h1>
          <p className="text-sm text-white/45 leading-relaxed max-w-sm mx-auto">
            Your evaluation is one of four charts that cross-reference in real time. Here's how your read feeds the system.
          </p>
        </div>

        {/* ── How the Cross-Reference Works ── */}
        <div
          className="rounded-2xl p-5 mb-4 space-y-5"
          style={{
            background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 100%)',
            border: '1px solid rgba(55,181,255,0.22)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(55,181,255,0.15)' }}>
              <GitMerge className="w-4 h-4" style={{ color: '#7dd3fc' }} />
            </div>
            <p className="text-sm font-bold text-white">How the Cross-Reference Works</p>
          </div>
          <div className="space-y-4">
            {[
              { icon: '📍', title: 'Where you align', body: "When your technical read matches the goalie's self-eval, it confirms the signal — objective data the development path acts on." },
              { icon: '⚡', title: 'Where you diverge', body: "Mismatches are the most valuable data points. They surface blind spots — technical gaps the goalie can't see yet, or self-perception that needs calibrating." },
              { icon: '🎯', title: 'Your priority shapes the path', body: "The ONE priority factor you flag in Post-Game directly determines which Pillar content Smarter Goalie serves the goalie next." },
            ].map(item => (
              <div key={item.title} className="flex gap-3.5 items-start">
                <span className="text-xl flex-shrink-0 leading-none mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white/85">{item.title}</p>
                  <p className="text-xs text-white/45 mt-1 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── What Each Section Captures + The Coach Role ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

          {/* What Each Section Captures */}
          <div
            className="rounded-2xl p-5 space-y-5"
            style={{
              background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 100%)',
              border: '1px solid rgba(55,181,255,0.22)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(125,211,252,0.1)' }}>
                <Lightbulb className="w-4 h-4" style={{ color: '#7dd3fc' }} />
              </div>
              <p className="text-sm font-bold text-white">What Each Section Captures</p>
            </div>
            <div className="space-y-4">
              {[
                { icon: <Timer className="w-4 h-4" />, label: 'Pre-Game', color: '#7dd3fc', body: "Goalie's readiness level and warmup quality — your technical read before the puck drops." },
                { icon: <BarChart3 className="w-4 h-4" />, label: 'Periods', color: '#a78bfa', body: "7-factor evaluation per period — Engagement, Composure, Skating, 7AMS, 6Z-7PS, Form, and Reading the Play." },
                { icon: <MessageSquare className="w-4 h-4" />, label: 'Post-Game', color: '#34d399', body: "Overall game read, ONE strength, and ONE priority — the flag that shapes the goalie's development path." },
              ].map(item => (
                <div key={item.label} className="flex gap-3.5 items-start">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}18`, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: item.color }}>{item.label}</p>
                    <p className="text-xs text-white/45 mt-1 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* The Coach Role */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 100%)',
              border: '1px solid rgba(55,181,255,0.22)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <Users className="w-4 h-4 text-white/50" />
              </div>
              <p className="text-sm font-bold text-white/70">The Coach Role</p>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              You're not just observing — you're evaluating. Your technical read through the Smarter Goalie framework is the most informed input in the cross-reference. Rate what you see against the system, not gut feel alone.
            </p>
            <div className="pt-2 space-y-2.5">
              {[
                { label: 'Anchor to the definitions', note: 'Each star level has a technical description — use it.' },
                { label: 'One strength. One priority.', note: 'Specificity is more powerful than broad feedback.' },
                { label: 'Your flag shapes their path', note: 'The priority you pick determines what content the goalie sees next.' },
              ].map(tip => (
                <div key={tip.label} className="flex gap-2.5 items-start">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: GOLD }} />
                  <div>
                    <span className="text-xs font-bold text-white/65">{tip.label} </span>
                    <span className="text-xs text-white/30">{tip.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── CTA ── */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-2xl text-base font-black flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #D4A93B 0%, #B8891E 100%)',
              color: '#0c0800',
              boxShadow: '0 6px 20px rgba(212,169,59,0.4)',
              height: '52px',
            }}
          >
            Start Charting
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-center text-[10px] text-white/20 tracking-wider uppercase">
            The Smarter Goalie Way™ · Four charts, one mirror
          </p>
        </div>

      </div>
    </div>
  );
}

// ─── FactorRow ────────────────────────────────────────────────────────────────

interface FactorRowProps {
  label: string;
  helpText: string;
  rating: number | null;
  onRatingChange: (v: number) => void;
  breakdown: string;
  onBreakdownChange: (v: string) => void;
  note: string;
  onNoteChange: (v: string) => void;
  breakdownKey: string;
  starDefs: StarDefinition[];
  isLast?: boolean;
}

function FactorRow({
  label, helpText, rating, onRatingChange,
  breakdown, onBreakdownChange, note, onNoteChange,
  breakdownKey, starDefs, isLast,
}: FactorRowProps) {
  const isLowStar = rating !== null && rating <= 2;
  const options = BREAKDOWN_OPTIONS[breakdownKey] ?? [];

  return (
    <div style={{ paddingTop: '16px', paddingBottom: '16px', borderBottom: isLast ? 'none' : '1px solid rgba(55,181,255,0.07)' }}>
      <ContextualHelp label={label} helpText={helpText}>
        <StarRating value={rating} onChange={onRatingChange} definitions={starDefs} />
      </ContextualHelp>

      {isLowStar && (
        <div style={{ marginTop: '12px', padding: '14px', borderRadius: '10px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(248,113,113,0.85)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            What broke down?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onBreakdownChange(breakdown === opt ? '' : opt)}
                style={{
                  padding: '5px 11px', borderRadius: '16px', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: breakdown === opt ? 'rgba(248,113,113,0.18)' : 'rgba(255,255,255,0.05)',
                  border: breakdown === opt ? '1px solid rgba(248,113,113,0.55)' : '1px solid rgba(255,255,255,0.1)',
                  color: breakdown === opt ? '#f87171' : 'rgba(255,255,255,0.5)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Add notes (optional)…"
            rows={2}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: '12px', resize: 'vertical', fontFamily: 'inherit',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── SaveButton ───────────────────────────────────────────────────────────────

function SaveButton({ saving, onClick, label }: { saving: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        padding: '10px 24px', borderRadius: '10px', background: BLUE,
        border: 'none', color: '#000f28', fontSize: '13px', fontWeight: 800,
        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {saving
        ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        : <Save size={14} />}
      {saving ? 'Saving…' : label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoachChartPage() {
  const { user } = useAuth();
  const router    = useRouter();
  const params    = useParams();
  const studentId = params.studentId as string;
  const sessionId = params.sessionId as string;

  const [session,  setSession]  = useState<Session | null>(null);
  const [student,  setStudent]  = useState<UserType | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [entryId,  setEntryId]  = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<SectionKey[]>([]);
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);

  // Pre-Game
  const [preGameReadiness, setPreGameReadiness] = useState<CoachReadinessLevel | null>(null);
  const [preGameWarmup,    setPreGameWarmup]    = useState<number | null>(null);
  const [preGameConcerns,  setPreGameConcerns]  = useState('');

  // Periods
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('period1');
  const [periods, setPeriods] = useState<Record<PeriodKey, PeriodFormData>>({
    period1: emptyPeriod(), period2: emptyPeriod(),
    period3: emptyPeriod(), overtime: emptyPeriod(),
  });

  // Post-Game
  const [overallRating,    setOverallRating]    = useState<number | null>(null);
  const [strengthNote,     setStrengthNote]     = useState('');
  const [priorityFactor,   setPriorityFactor]   = useState<CoachPriorityFactor | ''>('');
  const [nextSessionFocus, setNextSessionFocus] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId || !studentId || !user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [sessionResult, studentResult, chartResult] = await Promise.all([
          chartingService.getSession(sessionId),
          userService.getUser(studentId),
          coachChartingService.getChartBySession(sessionId, user.id),
        ]);

        if (cancelled) return;

        if (!sessionResult.success || !sessionResult.data) {
          toast.error('Session not found');
          router.push(`/coach/charting/${studentId}`);
          return;
        }
        setSession(sessionResult.data);

        if (studentResult.success && studentResult.data) {
          setStudent(studentResult.data);
        }

        if (chartResult.success && chartResult.data) {
          const entry = chartResult.data;
          setEntryId(entry.id);
          setCompletedSections((entry.completedSections ?? []) as SectionKey[]);

          if (entry.preGame) {
            setPreGameReadiness(entry.preGame.readinessLevel);
            setPreGameWarmup(entry.preGame.warmupQuality);
            setPreGameConcerns(entry.preGame.concerns ?? '');
          }

          if (entry.periods) {
            const loaded: Record<PeriodKey, PeriodFormData> = {
              period1: emptyPeriod(), period2: emptyPeriod(),
              period3: emptyPeriod(), overtime: emptyPeriod(),
            };
            (['period1', 'period2', 'period3', 'overtime'] as PeriodKey[]).forEach(pk => {
              const pd = entry.periods?.[pk];
              if (!pd) return;
              loaded[pk] = {
                engagedRating: pd.engagedRating,                   engagedBreakdown: pd.engagedBreakdown ?? '',          engagedNote: pd.engagedNote ?? '',
                mentalComposureRating: pd.mentalComposureRating,   mentalComposureBreakdown: pd.mentalComposureBreakdown ?? '', mentalComposureNote: pd.mentalComposureNote ?? '',
                skatingInSyncRating: pd.skatingInSyncRating,       skatingBreakdown: pd.skatingBreakdown ?? '',          skatingNote: pd.skatingNote ?? '',
                positioningRating: pd.positioningRating,           positioningBreakdown: pd.positioningBreakdown ?? '',  positioningNote: pd.positioningNote ?? '',
                belowLineRating: pd.belowLineRating,               belowLineBreakdown: pd.belowLineBreakdown ?? '',      belowLineNote: pd.belowLineNote ?? '',
                formRating: pd.formRating,                         formBreakdown: pd.formBreakdown ?? '',                formNote: pd.formNote ?? '',
                readingPlayRating: pd.readingPlayRating,           readingPlayBreakdown: pd.readingPlayBreakdown ?? '',  readingPlayNote: pd.readingPlayNote ?? '',
              };
            });
            setPeriods(loaded);
          }

          if (entry.postGame) {
            setOverallRating(entry.postGame.overallGameRating);
            setStrengthNote(entry.postGame.strengthNote);
            setPriorityFactor(entry.postGame.priorityFactor);
            setNextSessionFocus(entry.postGame.nextSessionFocus ?? '');
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load chart data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [sessionId, studentId, user, router]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const updatePeriod = useCallback(
    (periodKey: PeriodKey, field: keyof PeriodFormData, value: string | number | null) => {
      setPeriods(prev => ({ ...prev, [periodKey]: { ...prev[periodKey], [field]: value } }));
    },
    []
  );

  const buildPeriodData = (pd: PeriodFormData): CoachPeriodData => ({
    engagedRating:           pd.engagedRating ?? 3,
    engagedBreakdown:        pd.engagedBreakdown || undefined,
    engagedNote:             pd.engagedNote || undefined,
    mentalComposureRating:   pd.mentalComposureRating ?? 3,
    mentalComposureBreakdown:pd.mentalComposureBreakdown || undefined,
    mentalComposureNote:     pd.mentalComposureNote || undefined,
    skatingInSyncRating:     pd.skatingInSyncRating ?? 3,
    skatingBreakdown:        pd.skatingBreakdown || undefined,
    skatingNote:             pd.skatingNote || undefined,
    positioningRating:       pd.positioningRating ?? 3,
    positioningBreakdown:    pd.positioningBreakdown || undefined,
    positioningNote:         pd.positioningNote || undefined,
    belowLineRating:         pd.belowLineRating ?? 3,
    belowLineBreakdown:      pd.belowLineBreakdown || undefined,
    belowLineNote:           pd.belowLineNote || undefined,
    formRating:              pd.formRating ?? 3,
    formBreakdown:           pd.formBreakdown || undefined,
    formNote:                pd.formNote || undefined,
    readingPlayRating:       pd.readingPlayRating ?? 3,
    readingPlayBreakdown:    pd.readingPlayBreakdown || undefined,
    readingPlayNote:         pd.readingPlayNote || undefined,
  });

  const getMergedSections = (adding: SectionKey): SectionKey[] => {
    const set = new Set([...completedSections, adding]);
    return Array.from(set);
  };

  const baseChartData = () => ({
    sessionId,
    studentId,
    coachId: user!.id,
    coachName: user!.displayName ?? undefined,
  });

  // ── Save Pre-Game ─────────────────────────────────────────────────────────

  const savePreGame = async () => {
    if (!preGameReadiness || !preGameWarmup) {
      toast.error('Select readiness level and warmup quality before saving');
      return;
    }
    setSavingSection('preGame');
    try {
      const preGame: CoachPreGameData = {
        readinessLevel: preGameReadiness,
        warmupQuality:  preGameWarmup,
        concerns:       preGameConcerns || undefined,
      };
      const newSections = getMergedSections('preGame');

      if (entryId) {
        const r = await coachChartingService.updateSection(entryId, { preGame, completedSections: newSections });
        if (!r.success) throw new Error('Update failed');
      } else {
        const r = await coachChartingService.createChart({ ...baseChartData(), preGame, completedSections: newSections });
        if (!r.success) throw new Error('Create failed');
        setEntryId(r.data!.id);
      }
      setCompletedSections(newSections);
      toast.success('Pre-Game assessment saved');
    } catch {
      toast.error('Failed to save pre-game assessment');
    } finally {
      setSavingSection(null);
    }
  };

  // ── Save Periods ──────────────────────────────────────────────────────────

  const savePeriods = async () => {
    const hasAnyRating = (['period1', 'period2', 'period3'] as PeriodKey[]).some(
      pk => periods[pk].engagedRating !== null
    );
    if (!hasAnyRating) {
      toast.error('Rate at least one period before saving');
      return;
    }
    setSavingSection('periods');
    try {
      const periodsData: CoachChartEntry['periods'] = {};
      (['period1', 'period2', 'period3', 'overtime'] as PeriodKey[]).forEach(pk => {
        if (periods[pk].engagedRating !== null) {
          periodsData[pk] = buildPeriodData(periods[pk]);
        }
      });
      const newSections = getMergedSections('periods');

      if (entryId) {
        const r = await coachChartingService.updateSection(entryId, { periods: periodsData, completedSections: newSections });
        if (!r.success) throw new Error('Update failed');
      } else {
        const r = await coachChartingService.createChart({ ...baseChartData(), periods: periodsData, completedSections: newSections });
        if (!r.success) throw new Error('Create failed');
        setEntryId(r.data!.id);
      }
      setCompletedSections(newSections);
      toast.success('Period evaluations saved');
    } catch {
      toast.error('Failed to save period evaluations');
    } finally {
      setSavingSection(null);
    }
  };

  // ── Save Post-Game ────────────────────────────────────────────────────────

  const savePostGame = async () => {
    if (!overallRating || !strengthNote.trim() || !priorityFactor) {
      toast.error('Complete overall rating, strength note, and priority factor before saving');
      return;
    }
    setSavingSection('postGame');
    try {
      const postGame: CoachPostGameData = {
        overallGameRating: overallRating,
        strengthNote:      strengthNote.trim(),
        priorityFactor:    priorityFactor as CoachPriorityFactor,
        nextSessionFocus:  nextSessionFocus || undefined,
      };
      const newSections = getMergedSections('postGame');

      if (entryId) {
        const r = await coachChartingService.updateSection(entryId, { postGame, completedSections: newSections });
        if (!r.success) throw new Error('Update failed');
      } else {
        const r = await coachChartingService.createChart({ ...baseChartData(), postGame, completedSections: newSections });
        if (!r.success) throw new Error('Create failed');
        setEntryId(r.data!.id);
      }
      setCompletedSections(newSections);
      toast.success('Post-game reflection saved');
    } catch {
      toast.error('Failed to save post-game reflection');
    } finally {
      setSavingSection(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <SkeletonContentPage />;

  if (!session || session.type !== 'game') {
    return (
      <div style={{ maxWidth: '560px', margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '16px' }}>
          {!session ? 'Session not found.' : 'Coach charts are for game sessions only.'}
        </p>
        <Link
          href={`/coach/charting/${studentId}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.2)', color: BLUE, padding: '9px 18px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}
        >
          Back to Charting
        </Link>
      </div>
    );
  }

  if (showIntro) return <IntroOverlay onStart={() => setShowIntro(false)} />;

  const dateStr   = session.date?.toDate ? format(session.date.toDate(), 'EEE, MMM d, yyyy') : '';
  const initials  = (student?.displayName || 'G').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const isComplete = completedSections.length === 3;

  const sectionDone = (key: SectionKey) => completedSections.includes(key);

  const SECTION_LABELS: Record<SectionKey, string> = {
    preGame:  'Pre-Game',
    periods:  'Periods',
    postGame: 'Post-Game',
  };

  return (
    <>
      <style>{`
        .cc-back:hover { color: ${BLUE} !important; background: rgba(55,181,255,0.08) !important; }
        .cc-ptab:hover  { background: rgba(55,181,255,0.1) !important; }
        textarea:focus  { border-color: rgba(55,181,255,0.4) !important; outline: none !important; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(14px,3vw,24px) 72px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Back */}
        <Link
          href={`/coach/charting/${studentId}`}
          className="cc-back"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, borderRadius: '8px', padding: '6px 10px', width: 'fit-content', transition: 'all 0.2s' }}
        >
          <ArrowLeft size={15} /> Back to Charting
        </Link>

        {/* ── Session Header ── */}
        <div style={{ position: 'relative', borderRadius: '20px', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 50%, #0d1f40 100%)', border, boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(55,181,255,0.12)', padding: '24px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-20px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(212,169,59,0.07)', filter: 'blur(55px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${GOLD}, ${BLUE}44, transparent)` }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#0c0800', flexShrink: 0, border: '2px solid rgba(212,169,59,0.35)' }}>
              {student?.profileImage
                ? <img src={student.profileImage} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <Trophy size={13} color={GOLD} />
                <span style={{ color: GOLD, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Coach Chart</span>
                {session.result && (
                  <span style={{
                    padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                    background: session.result === 'win' ? 'rgba(74,222,128,0.14)' : session.result === 'loss' ? 'rgba(248,113,113,0.14)' : 'rgba(255,255,255,0.08)',
                    color:      session.result === 'win' ? '#4ade80'              : session.result === 'loss' ? '#f87171'              : 'rgba(255,255,255,0.4)',
                    border:     `1px solid ${session.result === 'win' ? 'rgba(74,222,128,0.3)' : session.result === 'loss' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.12)'}`,
                  }}>
                    {session.result.toUpperCase()}
                  </span>
                )}
              </div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '20px', marginBottom: '4px' }}>{student?.displayName ?? 'Goalie'}</h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                {dateStr}{session.opponent ? ` · vs ${session.opponent}` : ''}{session.location ? ` · ${session.location}` : ''}
              </p>
            </div>

            {/* Progress pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignSelf: 'flex-start', paddingTop: '2px' }}>
              {(['preGame', 'periods', 'postGame'] as SectionKey[]).map(key => {
                const done = sectionDone(key);
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: done ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${done ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                    {done && <Check size={10} color={GREEN} />}
                    <span style={{ fontSize: '10px', fontWeight: 700, color: done ? GREEN : 'rgba(255,255,255,0.35)' }}>{SECTION_LABELS[key]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {isComplete && (
            <div style={{ marginTop: '14px', padding: '9px 14px', borderRadius: '10px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.22)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={13} color={GREEN} />
              <span style={{ fontSize: '12px', color: GREEN, fontWeight: 600 }}>
                Chart complete — all three sections saved. Cross-referencing with goalie's self-chart.
              </span>
            </div>
          )}
        </div>

        {/* ══ PRE-GAME ══════════════════════════════════════════════════════════ */}
        <div style={{ background: cardBg, border, borderRadius: '16px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(55,181,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>Pre-Game Assessment</h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Goalie's state at warmup — before the game starts.</p>
            </div>
            {sectionDone('preGame') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={13} color={GREEN} />
                <span style={{ fontSize: '11px', color: GREEN, fontWeight: 600 }}>Saved</span>
              </div>
            )}
          </div>

          <div style={{ padding: '20px 20px 4px' }}>
            {/* Readiness */}
            <ContextualHelp
              label="Readiness at Warmup"
              helpText="Goalie's overall presence and mental state during warmup. Are they there to compete, or just going through the motions?"
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {READINESS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPreGameReadiness(opt.value)}
                    style={{
                      padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: preGameReadiness === opt.value ? `${opt.color}1a` : 'rgba(255,255,255,0.04)',
                      border:     preGameReadiness === opt.value ? `1.5px solid ${opt.color}` : '1px solid rgba(255,255,255,0.12)',
                      color:      preGameReadiness === opt.value ? opt.color : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </ContextualHelp>

            <div style={{ height: '1px', background: 'rgba(55,181,255,0.07)', margin: '18px 0' }} />

            {/* Warmup Quality */}
            <ContextualHelp
              label="Warmup Quality"
              helpText="Tracking pucks? Controlled movement? Consistent routine? Or scattered, lazy, distracted?"
            >
              <div style={{ marginTop: '6px' }}>
                <StarRating value={preGameWarmup} onChange={setPreGameWarmup} definitions={WARMUP_DEFS} />
              </div>
            </ContextualHelp>

            <div style={{ height: '1px', background: 'rgba(55,181,255,0.07)', margin: '18px 0' }} />

            {/* Concerns */}
            <ContextualHelp
              label="Pre-Game Concerns"
              helpText="Anything you noticed before the game that might affect performance — mood, body language, distraction. (Optional)"
            >
              <textarea
                value={preGameConcerns}
                onChange={e => setPreGameConcerns(e.target.value)}
                placeholder="Optional — note any concerns before the game…"
                rows={3}
                style={{ width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s' }}
              />
            </ContextualHelp>
          </div>

          <div style={{ padding: '16px 20px 20px', display: 'flex', justifyContent: 'flex-end' }}>
            <SaveButton saving={savingSection === 'preGame'} onClick={savePreGame} label="Save Pre-Game" />
          </div>
        </div>

        {/* ══ PERIODS ═══════════════════════════════════════════════════════════ */}
        <div style={{ background: cardBg, border, borderRadius: '16px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(55,181,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>Period Evaluation</h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Rate the goalie across 7 factors for each period. Tap a star again to read its definition.</p>
            </div>
            {sectionDone('periods') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={13} color={GREEN} />
                <span style={{ fontSize: '11px', color: GREEN, fontWeight: 600 }}>Saved</span>
              </div>
            )}
          </div>

          {/* Period Tabs */}
          <div style={{ display: 'flex', gap: '2px', padding: '10px 16px 0', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
            {PERIOD_TABS.map(tab => {
              const hasData  = periods[tab.key].engagedRating !== null;
              const isActive = activePeriod === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className="cc-ptab"
                  onClick={() => setActivePeriod(tab.key)}
                  style={{
                    position: 'relative', padding: '7px 18px', border: 'none',
                    borderRadius: '8px 8px 0 0', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: isActive ? 'rgba(55,181,255,0.12)' : 'transparent',
                    color:      isActive ? BLUE : hasData ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                    borderBottom: isActive ? `2px solid ${BLUE}` : '2px solid transparent',
                  }}
                >
                  {tab.label}
                  {hasData && !isActive && (
                    <span style={{ position: 'absolute', top: '7px', right: '7px', width: '5px', height: '5px', borderRadius: '50%', background: GREEN }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Factor Rows */}
          <div style={{ padding: '0 20px' }}>
            <FactorRow
              label="Engaged"
              helpText="Reading the play through the 3 Priorities — 1. the puck, 2. the player with the puck, 3. the player with the puck and their options. Visual, Mental, Physical channels all firing — or fading?"
              rating={periods[activePeriod].engagedRating}
              onRatingChange={v => updatePeriod(activePeriod, 'engagedRating', v)}
              breakdown={periods[activePeriod].engagedBreakdown}
              onBreakdownChange={v => updatePeriod(activePeriod, 'engagedBreakdown', v)}
              note={periods[activePeriod].engagedNote}
              onNoteChange={v => updatePeriod(activePeriod, 'engagedNote', v)}
              breakdownKey="engaged" starDefs={ENGAGED_DEFS}
            />
            <FactorRow
              label="Mental Composure"
              helpText="Recovery after goals against, focus consistency, emotional regulation in play and on the bench."
              rating={periods[activePeriod].mentalComposureRating}
              onRatingChange={v => updatePeriod(activePeriod, 'mentalComposureRating', v)}
              breakdown={periods[activePeriod].mentalComposureBreakdown}
              onBreakdownChange={v => updatePeriod(activePeriod, 'mentalComposureBreakdown', v)}
              note={periods[activePeriod].mentalComposureNote}
              onNoteChange={v => updatePeriod(activePeriod, 'mentalComposureNote', v)}
              breakdownKey="mentalComposure" starDefs={COMPOSURE_DEFS}
            />
            <FactorRow
              label="Skating in Sync"
              helpText="In sync with the flow of the game and the puck — pushes, edges, recovery, controlled vs scrambling. Delayed responses? Looking but not reacting?"
              rating={periods[activePeriod].skatingInSyncRating}
              onRatingChange={v => updatePeriod(activePeriod, 'skatingInSyncRating', v)}
              breakdown={periods[activePeriod].skatingBreakdown}
              onBreakdownChange={v => updatePeriod(activePeriod, 'skatingBreakdown', v)}
              note={periods[activePeriod].skatingNote}
              onNoteChange={v => updatePeriod(activePeriod, 'skatingNote', v)}
              breakdownKey="skatingInSync" starDefs={SKATING_DEFS}
            />
            <FactorRow
              label="Positioning (7AMS)"
              helpText="Angle management, depth, square to the puck, on the line. Where the Space & Time Principle says they should be?"
              rating={periods[activePeriod].positioningRating}
              onRatingChange={v => updatePeriod(activePeriod, 'positioningRating', v)}
              breakdown={periods[activePeriod].positioningBreakdown}
              onBreakdownChange={v => updatePeriod(activePeriod, 'positioningBreakdown', v)}
              note={periods[activePeriod].positioningNote}
              onNoteChange={v => updatePeriod(activePeriod, 'positioningNote', v)}
              breakdownKey="positioning" starDefs={SEVEN_AMS_DEFS}
            />
            <FactorRow
              label="Below the Line (6Z-7PS)"
              helpText="Zone reads below the icing line — wrap-arounds, behind-net, post integration, low-angle threats, repositioning."
              rating={periods[activePeriod].belowLineRating}
              onRatingChange={v => updatePeriod(activePeriod, 'belowLineRating', v)}
              breakdown={periods[activePeriod].belowLineBreakdown}
              onBreakdownChange={v => updatePeriod(activePeriod, 'belowLineBreakdown', v)}
              note={periods[activePeriod].belowLineNote}
              onNoteChange={v => updatePeriod(activePeriod, 'belowLineNote', v)}
              breakdownKey="belowLine" starDefs={SIX_ZS_DEFS}
            />
            <FactorRow
              label="Form"
              helpText="Cross alignment (stick/head, glove/blocker), equilibrium line, weight distribution, control through motion."
              rating={periods[activePeriod].formRating}
              onRatingChange={v => updatePeriod(activePeriod, 'formRating', v)}
              breakdown={periods[activePeriod].formBreakdown}
              onBreakdownChange={v => updatePeriod(activePeriod, 'formBreakdown', v)}
              note={periods[activePeriod].formNote}
              onNoteChange={v => updatePeriod(activePeriod, 'formNote', v)}
              breakdownKey="form" starDefs={FORM_DEFS}
            />
            <FactorRow
              label="Reading the Play"
              helpText="Tracking through the neutral zone, anticipating entries, reading shot vs pass — ahead of the play, or reacting?"
              rating={periods[activePeriod].readingPlayRating}
              onRatingChange={v => updatePeriod(activePeriod, 'readingPlayRating', v)}
              breakdown={periods[activePeriod].readingPlayBreakdown}
              onBreakdownChange={v => updatePeriod(activePeriod, 'readingPlayBreakdown', v)}
              note={periods[activePeriod].readingPlayNote}
              onNoteChange={v => updatePeriod(activePeriod, 'readingPlayNote', v)}
              breakdownKey="readingPlay" starDefs={READING_DEFS} isLast
            />
          </div>

          <div style={{ padding: '16px 20px 20px', borderTop: '1px solid rgba(55,181,255,0.07)', display: 'flex', justifyContent: 'flex-end' }}>
            <SaveButton saving={savingSection === 'periods'} onClick={savePeriods} label="Save Periods" />
          </div>
        </div>

        {/* ══ POST-GAME ══════════════════════════════════════════════════════════ */}
        <div style={{ background: cardBg, border, borderRadius: '16px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(55,181,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>Post-Game Reflection</h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Your overall read feeds the goalie's development path.</p>
            </div>
            {sectionDone('postGame') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={13} color={GREEN} />
                <span style={{ fontSize: '11px', color: GREEN, fontWeight: 600 }}>Saved</span>
              </div>
            )}
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Overall game read */}
            <ContextualHelp
              label="Overall Game Read"
              helpText="Big picture — how do you rate this game as a whole? Your holistic read feeds the development path and cross-reference."
            >
              <div style={{ marginTop: '6px' }}>
                <StarRating value={overallRating} onChange={setOverallRating} definitions={OVERALL_DEFS} />
              </div>
            </ContextualHelp>

            {/* Strength */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                ONE strength this game
              </label>
              <textarea
                value={strengthNote}
                onChange={e => setStrengthNote(e.target.value)}
                placeholder="What did they do well? Be specific — this goes directly to the goalie."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s' }}
              />
            </div>

            {/* Priority factor */}
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                ONE priority to work on
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginBottom: '10px', lineHeight: 1.5 }}>
                Your flag feeds the goalie's development path — Smarter Goalie's intuitive system serves the matching Pillar content for the priority you select.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(Object.entries(PRIORITY_FACTOR_LABELS) as [CoachPriorityFactor, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPriorityFactor(key)}
                    style={{
                      padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: priorityFactor === key ? `${BLUE}1a` : 'rgba(255,255,255,0.04)',
                      border:     priorityFactor === key ? `1.5px solid ${BLUE}` : '1px solid rgba(255,255,255,0.12)',
                      color:      priorityFactor === key ? BLUE : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Next session focus */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                Recommend a focus for next session{' '}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>(optional)</span>
              </label>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>
                Specific drill, concept, or priority for their next practice or game.
              </p>
              <textarea
                value={nextSessionFocus}
                onChange={e => setNextSessionFocus(e.target.value)}
                placeholder="e.g. Square on the line through P1 entries, post integration reads, reset after a GA…"
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <SaveButton saving={savingSection === 'postGame'} onClick={savePostGame} label="Save Post-Game" />
            </div>
          </div>
        </div>

      </div>

      {/* Floating guide button */}
      <button
        type="button"
        onClick={() => setShowIntro(true)}
        title="How this works"
        style={{
          position: 'fixed', bottom: '24px', right: '20px',
          width: '42px', height: '42px', borderRadius: '50%',
          background: 'rgba(212,169,59,0.12)', border: '1px solid rgba(212,169,59,0.3)',
          color: GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)', transition: 'all 0.2s', zIndex: 50,
        }}
      >
        <HelpCircle size={18} />
      </button>
    </>
  );
}
