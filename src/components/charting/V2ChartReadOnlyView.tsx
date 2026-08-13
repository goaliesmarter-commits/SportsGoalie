'use client';

import {
  ChartingEntry, Session,
  V2PreGameData, V2PeriodData, V2PostGameData, V2PracticeChartEntry,
  MindManagementStartTime, PracticeIndexCategory,
} from '@/types';
import {
  Timer, BarChart3, MessageSquare, ClipboardList,
  Flame, Sparkles, ShieldCheck, Brain, Eye, Video,
  CheckCircle2, XCircle, Target, Mic, Flag, Pencil, Star,
  Zap, Layers, Crosshair,
} from 'lucide-react';
import { FIVE_STAR_SCALE, stageForScore, starsFromScore } from '@/lib/scale/five-star';

const BLUE = '#37b5ff';
const PURPLE = '#7dd3fc';

type V2Fields = {
  v2PreGame?: V2PreGameData;
  v2Periods?: { period1?: V2PeriodData; period2?: V2PeriodData; period3?: V2PeriodData; overtime?: V2PeriodData };
  v2PostGame?: V2PostGameData;
  v2Practice?: Omit<V2PracticeChartEntry, 'id' | 'sessionId' | 'studentId' | 'version' | 'createdAt' | 'updatedAt'>;
};

const START_TIME_LABELS: Record<MindManagementStartTime, string> = {
  at_the_rink: 'At the rink',
  '1_hour_before': '1 hour before',
  '2_hours_before': '2 hours before',
  '3_plus_hours_before': '3+ hours before',
  wake_up_thinking: 'Wake up thinking about it',
};

const CATEGORY_META: Record<PracticeIndexCategory, { label: string; color: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  immediate_development: { label: 'Immediate Development', color: '#f87171', icon: Flame },
  refinement: { label: 'Refinement', color: BLUE, icon: Sparkles },
  maintenance: { label: 'Maintenance', color: 'rgba(255,255,255,0.5)', icon: ShieldCheck },
};

/* ── Primitives ── */

function Stat({ label, value, suffix }: { label: string; value: React.ReactNode; suffix?: string }) {
  return (
    <div style={{ borderRadius: '10px', background: 'rgba(55,181,255,0.05)', border: '1px solid rgba(55,181,255,0.12)', padding: '12px' }}>
      <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
        {value}
        {suffix && <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>{suffix}</span>}
      </p>
    </div>
  );
}

/**
 * A recorded rating, read back to the coach.
 *
 * `stars` puts it on the 5-Star development scale, so the coach sees the same
 * row of stars and the same stage name the goalie tapped instead of a bar the
 * goalie never saw. It's opt-in because only some of these numbers are
 * development ratings — Factor Ratio, Overall Game Factor and Game Retention
 * measure how the game went, not what stage the goalie is at, and
 * "Self-Coaching" would be nonsense on them. Those keep the bar.
 *
 * Colours are literal rather than themed: this view is dark by inline style,
 * not inside the `.surface-dark` token scope.
 */
function RatingBar({ value, max = 5, stars = false }: { value: number; max?: number; stars?: boolean }) {
  if (stars) {
    const filled = starsFromScore(value, max);
    const stage = stageForScore(value, max);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
        <span
          role="img"
          aria-label={stage ? `${stage.name}, ${value} out of ${max}` : `${value} out of ${max}`}
          style={{ display: 'inline-flex', gap: '2px' }}
        >
          {FIVE_STAR_SCALE.map(({ stars: position }) => {
            const on = position <= filled;
            return (
              <Star
                key={position}
                size={13}
                strokeWidth={1.5}
                color={on ? '#f87171' : 'rgba(255,255,255,0.22)'}
                fill={on ? '#f87171' : 'none'}
              />
            );
          })}
        </span>
        {stage && <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{stage.name}</span>}
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{value}/{max}</span>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const barColor = pct >= 70 ? '#4ade80' : pct >= 40 ? BLUE : '#fb923c';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: barColor, boxShadow: `0 0 6px ${barColor}66`, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', minWidth: '28px', textAlign: 'right' }}>{value}/{max}</span>
    </div>
  );
}

/** A voice note the goalie recorded, usually against a rating they flagged. */
function VoiceNote({ text }: { text: string }) {
  return (
    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'flex-start', gap: '5px', borderRadius: '7px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', padding: '6px 8px' }}>
      <Mic size={10} color="rgba(248,113,113,0.5)" style={{ flexShrink: 0, marginTop: '1px' }} />
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

/**
 * One of the four technical Pillars, as the goalie rated it for that period.
 *
 * They rate Skating, 7AMS, the 6 Zone – 7 Point System™ and Form every period
 * on the 5-Pillar chart, and this read-back used to skip straight past all four
 * — recorded, stored, never shown to the coach.
 *
 * Every field is optional because the basic chart doesn't collect them, so an
 * unrated Pillar is left out rather than drawn as a zero.
 */
function PillarRating({
  label,
  icon: Icon,
  value,
  voice,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  value?: number;
  voice?: string;
}) {
  if (typeof value !== 'number') return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
        <Icon size={10} color="rgba(255,255,255,0.3)" />
        <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      </div>
      <RatingBar value={value} stars />
      {voice && <VoiceNote text={voice} />}
    </div>
  );
}

function YesNoLine({ label, value, voice }: { label: string; value: boolean; voice?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{label}</p>
        {voice && (
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'flex-start', gap: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '7px 10px' }}>
            <Mic size={11} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{voice}</p>
          </div>
        )}
      </div>
      <span style={{
        flexShrink: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
        padding: '3px 10px', borderRadius: '20px',
        color: value ? '#4ade80' : 'rgba(255,255,255,0.4)',
        background: value ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.06)',
        border: value ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.1)',
      }}>
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number; color?: string }>; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${BLUE}15`, border: `1px solid ${BLUE}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={BLUE} />
      </div>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>{title}</h3>
        {subtitle && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px' }}>
      <ClipboardList size={28} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 8px' }} />
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{message}</p>
    </div>
  );
}

/**
 * The frame around one section of the chart.
 *
 * Two callers, two very different surroundings. On its own admin page this view
 * sits on the bare page background, so each section needs a frame to read as a
 * unit. Inside the session-history drawer it is already three surfaces deep
 * (page card → session row → drawer) and a fourth outline there just stacks
 * concentric boxes that all look alike — the "container in a container in a
 * container" effect. `flat` keeps the header and drops the box, leaving a
 * hairline rule (see the root's `<style>`) to do the separating.
 */
function Section({ flat, children, style }: { flat?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={
        flat
          ? style
          : { background: 'rgba(2,18,44,0.6)', border: '1px solid rgba(55,181,255,0.12)', borderRadius: '14px', padding: '16px', ...style }
      }
    >
      {children}
    </div>
  );
}

/* ── Section renderers ── */

function PreGameSection({ data, flat }: { data: V2PreGameData; flat?: boolean }) {
  return (
    <Section flat={flat}>
      <SectionHeader icon={Timer} title="Pre-Game · Mind Management" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div style={{ borderRadius: '10px', background: 'rgba(55,181,255,0.05)', border: '1px solid rgba(55,181,255,0.12)', padding: '12px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>Personal Start Time</p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{START_TIME_LABELS[data.personalStartTime] ?? data.personalStartTime}</p>
        </div>
        <div style={{ borderRadius: '10px', background: 'rgba(55,181,255,0.05)', border: '1px solid rgba(55,181,255,0.12)', padding: '12px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>Mental State</p>
          <RatingBar value={data.mentalStateRating} />
          {data.mentalStateVoiceNote && <p style={{ marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>&ldquo;{data.mentalStateVoiceNote}&rdquo;</p>}
        </div>
      </div>
      <div style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '4px 12px' }}>
        <YesNoLine label="Routine completed" value={data.routineCompleted} voice={data.routineVoiceNote} />
        <YesNoLine label="Pre-Game Stress" value={data.anxietyPresent} voice={data.anxietyVoiceNote} />
        <div style={{ borderBottom: 'none' }}>
          <YesNoLine label="Target state achieved" value={data.targetStateAchieved} voice={data.targetStateVoiceNote} />
        </div>
      </div>
    </Section>
  );
}

function PeriodsSection({ periods, flat }: { periods: NonNullable<V2Fields['v2Periods']>; flat?: boolean }) {
  const labels: Array<[keyof typeof periods, string]> = [['period1', 'P1'], ['period2', 'P2'], ['period3', 'P3'], ['overtime', 'OT']];
  const filled = labels.filter(([key]) => !!periods[key]);
  if (filled.length === 0) return null;

  return (
    <Section flat={flat}>
      <SectionHeader icon={BarChart3} title="Periods" subtitle="Post-game, charted from memory" />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${filled.length}, 1fr)`, gap: '8px' }}>
        {filled.map(([key, label]) => {
          const p = periods[key]!;
          const goalsAgainst = p.goalsAgainst ?? 0;
          return (
            <div key={key} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(55,181,255,0.1)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{label}</p>

              {/*
                One recessed well holding all eight counters, rather than eight
                individually outlined tiles inside the period card inside the
                section. Darker-than-parent reads as inset where another light
                border would just have been a third concentric frame.
              */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 4px', borderRadius: '9px', background: 'rgba(0,10,26,0.35)', padding: '9px 6px' }}>
                {[
                  { label: 'Shots', value: p.shots ?? 0, color: 'rgba(255,255,255,0.6)' },
                  { label: 'Saves', value: p.saves ?? 0, color: '#4ade80' },
                  { label: 'GA', value: goalsAgainst, color: '#f87171' },
                  { label: 'Std Saves', value: p.standardSaves ?? 0, color: 'rgba(255,255,255,0.6)' },
                  { label: 'Key Saves', value: p.keySaves ?? 0, color: '#4ade80' },
                  { label: 'Weak GA', value: p.weakGoals ?? 0, color: '#f87171' },
                  { label: 'Emph. Applied', value: p.midChallengeCount ?? 0, color: 'rgba(255,255,255,0.6)' },
                  { label: 'Align. Owned', value: p.highChallengeCount ?? 0, color: '#fb923c' },
                ].map(({ label: sl, value: sv, color }) => (
                  <div key={sl} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '3px', letterSpacing: '0.5px' }}>{sl}</p>
                    <p style={{ fontSize: '16px', fontWeight: 900, color, lineHeight: 1 }}>{sv}</p>
                  </div>
                ))}
              </div>

              {/* Ratings */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)' }}>Emotional Balance</p>
                  {p.mindControlChallengeLevel && (() => {
                    const levelMap: Record<string, { label: string; bg: string; border: string; color: string }> = {
                      low:  { label: 'Balance Issue',    bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', color: '#f87171' },
                      mid:  { label: 'Emphasis Applied', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.3)',  color: '#fbbf24' },
                      high: { label: 'Alignment Owned',  bg: 'rgba(74,222,128,0.15)',  border: 'rgba(74,222,128,0.3)',  color: '#4ade80' },
                    };
                    const lvl = levelMap[p.mindControlChallengeLevel] ?? { label: p.mindControlChallengeLevel, bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', color: '#f87171' };
                    return (
                      <span style={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '2px 6px', borderRadius: '20px', background: lvl.bg, border: `1px solid ${lvl.border}`, color: lvl.color }}>
                        {lvl.label}
                      </span>
                    );
                  })()}
                </div>
                {/* Set with the star row on the period screen — read back the same way. */}
                <RatingBar value={p.mindControlRating} stars />
                {p.mindControlVoiceNote && <VoiceNote text={p.mindControlVoiceNote} />}
              </div>

              {/*
                The other four Pillars, kept next to Emotional Balance because
                that is how the goalie rates them — one block of five, same five
                stages. Absent on the basic chart, which only asks for MindSet.
              */}
              {[p.skatingRating, p.sevenAMSRating, p.sixZSRating, p.formRating].some(
                (r) => typeof r === 'number'
              ) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.3)' }}>Technical Pillars</p>
                  <PillarRating label="Skating" icon={Zap} value={p.skatingRating} voice={p.skatingVoiceNote} />
                  <PillarRating label="7AMS" icon={Target} value={p.sevenAMSRating} voice={p.sevenAMSVoiceNote} />
                  <PillarRating label="6 Zone – 7 Point System™" icon={Layers} value={p.sixZSRating} voice={p.sixZSVoiceNote} />
                  <PillarRating label="Form" icon={Crosshair} value={p.formRating} voice={p.formVoiceNote} />
                </div>
              )}

              {/*
                Only shown when the goalie actually rated it. This used to render
                unconditionally, so a basic chart — which never asks the question —
                still reported "Factor Ratio 1/5" to the coach, and on a five-pillar
                chart a skipped question was indistinguishable from a low score.
              */}
              {typeof p.periodFactorRatio === 'number' && (
                <div>
                  <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '5px' }}>Factor Ratio</p>
                  <RatingBar value={p.periodFactorRatio} />
                </div>
              )}

              {/* Goal classification */}
              {p.goals && p.goals.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>Goals</p>
                  {p.goals.map((g) => (
                    <div key={g.goalNumber} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      {g.isGoodGoal
                        ? <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0, marginTop: '1px' }} />
                        : <XCircle size={12} color="#f87171" style={{ flexShrink: 0, marginTop: '1px' }} />}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Goal {g.goalNumber} · {g.isGoodGoal ? 'Good' : 'Weak'}</p>
                        {g.voiceNote && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>&ldquo;{g.voiceNote}&rdquo;</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function PostGameSection({ data, flat }: { data: V2PostGameData; flat?: boolean }) {
  return (
    <Section flat={flat}>
      <SectionHeader icon={MessageSquare} title="Post-Game Review" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <Stat label="Good Goals" value={data.goodGoalCount} />
        <Stat label="Weak Goals" value={data.badGoalCount} />
        <Stat label="Good Decision Factor" value={`${(data.goodDecisionRate ?? 0).toFixed(0)}`} suffix="%" />
        <Stat label="Weak Decision Factor" value={`${(100 - (data.goodDecisionRate ?? 0)).toFixed(0)}`} suffix="%" />
        <Stat label="Emotional Balance Avg" value={(data.mindControlAverage ?? 0).toFixed(1)} suffix="/ 5" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ borderRadius: '10px', background: 'rgba(55,181,255,0.05)', border: '1px solid rgba(55,181,255,0.12)', padding: '12px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>Overall Game Factor</p>
          <RatingBar value={data.overallGameFactorRating} />
          {data.overallGameFactorVoiceNote && <p style={{ marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>&ldquo;{data.overallGameFactorVoiceNote}&rdquo;</p>}
        </div>
        <div style={{ borderRadius: '10px', background: 'rgba(55,181,255,0.05)', border: '1px solid rgba(55,181,255,0.12)', padding: '12px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>Game Retention</p>
          <RatingBar value={data.gameRetentionRating} />
          {data.gameRetentionVoiceNote && <p style={{ marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>&ldquo;{data.gameRetentionVoiceNote}&rdquo;</p>}
        </div>
        {data.overallFeeling && (
          <div style={{ gridColumn: '1 / -1', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '12px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>Overall Feeling</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.overallFeeling}</p>
          </div>
        )}
        {data.mindVaultEntry && (
          <div style={{ gridColumn: '1 / -1', borderRadius: '10px', background: `${PURPLE}0a`, border: `1px solid ${PURPLE}25`, padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Brain size={13} color={PURPLE} />
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: PURPLE }}>Mind Vault</p>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.mindVaultEntry}</p>
          </div>
        )}

        {/* Priority Improvement Area */}
        {data.priorityImprovementArea && (
          <div style={{ gridColumn: '1 / -1', borderRadius: '10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Flag size={12} color="#f87171" />
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#f87171' }}>Priority Improvement Area</p>
            </div>
            <p style={{ fontSize: '14px', fontWeight: 900, color: '#fff', marginBottom: '2px' }}>{data.priorityImprovementArea}</p>
          </div>
        )}

        {/* Improvement focus + commitment */}
        {(data.improvementFocus || data.whatWillYouDoDifferently) && (
          <div style={{ gridColumn: '1 / -1', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Pencil size={12} color="rgba(255,255,255,0.35)" />
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)' }}>Commitment</p>
            </div>
            {data.improvementFocus && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '3px' }}>Focus Area</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                  {({
                    mind_control: 'Emotional Balance',
                    goal_decisions: 'Reading the Play',
                    seven_point: '6ZS',
                  } as Record<string, string>)[data.improvementFocus]
                    ?? data.improvementFocus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </p>
              </div>
            )}
            {data.whatWillYouDoDifferently && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '3px' }}>What will you do differently?</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>&ldquo;{data.whatWillYouDoDifferently}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function PracticeSection({ data, flat }: { data: NonNullable<V2Fields['v2Practice']>; flat?: boolean }) {
  const workedOnItems = data.practiceIndex?.filter(i => data.indexItemsWorkedOn?.includes(i.id));

  return (
    <Section flat={flat} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader icon={Target} title="Practice Chart" subtitle="Index-driven reflection · New Practice Revolution" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        <Stat label="Practice Value" value={data.practiceValueRating ?? '—'} suffix="/ 5" />
        <Stat label="Technical Eye" value={data.technicalEyeDevelopmentRating ?? '—'} suffix="/ 5" />
        <Stat label="Designated Training"
          value={data.designatedTrainingReceived ? (data.designatedTrainingDuration ? `${data.designatedTrainingDuration}` : 'Yes') : 'No'}
          suffix={data.designatedTrainingReceived && data.designatedTrainingDuration ? 'min' : undefined}
        />
        <Stat label="Video Captured" value={data.videoCaptured ? 'Yes' : 'No'} />
      </div>

      {data.practiceIndex && data.practiceIndex.length > 0 && (
        <div>
          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>Practice Index</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {(['immediate_development', 'refinement', 'maintenance'] as PracticeIndexCategory[]).map(cat => {
              const items = data.practiceIndex.filter(i => i.category === cat);
              if (items.length === 0) return null;
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${meta.color}25`, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <Icon size={12} color={meta.color} />
                    <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: meta.color }}>{meta.label}</span>
                  </div>
                  {items.map(item => {
                    const worked = data.indexItemsWorkedOn?.includes(item.id);
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        {worked
                          ? <CheckCircle2 size={11} color={BLUE} style={{ flexShrink: 0, marginTop: '1px' }} />
                          : <span style={{ width: '11px', height: '11px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0, marginTop: '1px', display: 'inline-block' }} />}
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '11px', color: worked ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)', fontWeight: worked ? 600 : 400, lineHeight: 1.4 }}>{item.label}</span>
                          {item.pillarSlug && (
                            <span style={{ display: 'block', marginTop: '2px', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '1px 5px', width: 'fit-content' }}>
                              {item.pillarSlug.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {workedOnItems && workedOnItems.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Eye size={12} color={BLUE} />
            <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)' }}>Did it improve?</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {workedOnItems.map(item => {
              const rating = data.improvementRatings?.find(r => r.itemId === item.id)?.rating ?? 0;
              return (
                <div key={item.id} style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '10px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</p>
                  <RatingBar value={rating} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.mindVaultEntry && (
        <div style={{ borderRadius: '10px', background: `${PURPLE}0a`, border: `1px solid ${PURPLE}25`, padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Brain size={13} color={PURPLE} />
            <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: PURPLE }}>Mind Vault</p>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.mindVaultEntry}</p>
        </div>
      )}

      {data.videoCaptured && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
          <Video size={13} color="rgba(255,255,255,0.3)" />
          Practice was filmed{data.videoUrl ? ' · Video uploaded' : ' · Upload pending'}
        </div>
      )}
    </Section>
  );
}

/* ── Main ── */

interface V2ChartReadOnlyViewProps {
  entry: ChartingEntry;
  session: Session;
  /**
   * `framed` (default) gives each section its own card — right when this view
   * sits directly on a page. `flat` drops those cards for callers that have
   * already put the view inside a card of their own, so the sections don't read
   * as yet another box in the stack.
   */
  variant?: 'framed' | 'flat';
}

export function V2ChartReadOnlyView({ entry, session, variant = 'framed' }: V2ChartReadOnlyViewProps) {
  const v2 = entry as unknown as ChartingEntry & V2Fields;
  const hasV2 = !!v2.v2PreGame || !!v2.v2Periods || !!v2.v2PostGame || !!v2.v2Practice;
  const flat = variant === 'flat';

  if (!hasV2) return <EmptyState message="No v2 chart data was submitted for this session yet." />;

  return (
    <>
      {/*
        Sections are conditional, so the divider between them is a CSS sibling
        rule rather than an index check — whichever section renders first stays
        rule-free. The tag sits outside the flex container on purpose: `<style>`
        is display:none but still an element sibling, so inside it would hand
        the first real section a border it shouldn't have.
      */}
      {flat && (
        <style>{`
          .v2-chart-flat > * + * {
            border-top: 1px solid rgba(255,255,255,0.07);
            padding-top: 16px;
            margin-top: 4px;
          }
        `}</style>
      )}
      <div className={flat ? 'v2-chart-flat' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {session.type === 'practice' ? (
          v2.v2Practice
            ? <PracticeSection data={v2.v2Practice} flat={flat} />
            : <EmptyState message="No practice chart submitted for this session." />
        ) : (
          <>
            {v2.v2PreGame && <PreGameSection data={v2.v2PreGame} flat={flat} />}
            {v2.v2Periods && <PeriodsSection periods={v2.v2Periods} flat={flat} />}
            {v2.v2PostGame && <PostGameSection data={v2.v2PostGame} flat={flat} />}
          </>
        )}
      </div>
    </>
  );
}
