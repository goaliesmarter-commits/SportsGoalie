'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  V2GameChartEntry,
  V2PeriodData,
  ParentChartEntry,
  ParentPeriodRatings,
  CoachChartEntry,
  CoachPeriodData,
} from '@/types/charting';
import { ArrowLeft, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';

const CYAN   = '#37b5ff';   // Goalie
const MINT   = '#34d399';   // Parent
const VIOLET = '#7dd3fc';   // Coach
const GOLD   = '#FFD166';   // Goalie Coach (future)
const CORAL  = '#FF6B6B';   // Gaps

// ─── Factor mapping ───────────────────────────────────────────────────────────

interface Factor {
  key: string;
  label: string;
  getGoalie: (p: V2PeriodData) => number | null | undefined;
  getParent:  ((p: ParentPeriodRatings) => number) | null;
  getCoach:   ((p: CoachPeriodData)    => number) | null;
}

const FACTORS: Factor[] = [
  {
    key: 'mindComposure',
    label: 'Mind / Composure',
    getGoalie: p => p.mindControlRating,
    getParent:  p => p.emotionalControlRating,
    getCoach:   p => p.mentalComposureRating,
  },
  {
    key: 'skating',
    label: 'Skating',
    getGoalie: p => p.skatingRating,
    getParent:  p => p.skatingInSyncRating,
    getCoach:   p => p.skatingInSyncRating,
  },
  {
    key: 'positioning',
    label: 'Positioning (7AMS)',
    getGoalie: p => p.sevenAMSRating,
    getParent:  p => p.positioningRating,
    getCoach:   p => p.positioningRating,
  },
  {
    key: 'belowLine',
    label: 'Below the Line (6Z-7PS)',
    getGoalie: p => p.sixZSRating,
    getParent:  null,
    getCoach:   p => p.belowLineRating,
  },
  {
    key: 'form',
    label: 'Form',
    getGoalie: p => p.formRating,
    getParent:  null,
    getCoach:   p => p.formRating,
  },
  {
    key: 'overall',
    label: 'Overall Impression',
    getGoalie: p => p.periodFactorRatio,
    getParent:  p => p.overallImpressionRating,
    getCoach:   null,
  },
];

// ─── Conversation starter generator ──────────────────────────────────────────

function conversationStarter(
  label: string,
  goalieRating: number,
  observerRating: number,
  role: 'Parent' | 'Coach'
): string {
  const diff = goalieRating - observerRating;
  const factor = label.toLowerCase();
  if (diff > 0) {
    return `Your Goalie felt their ${factor} was stronger (${goalieRating}★) than the ${role} observed (${observerRating}★). That gap is worth a conversation — not to correct, but to understand what each of you was seeing.`;
  }
  return `The ${role} rated ${factor} higher (${observerRating}★) than the Goalie rated themselves (${goalieRating}★). Your Goalie may be harder on themselves than the evidence shows — this is worth celebrating.`;
}

// ─── Star dots display ────────────────────────────────────────────────────────

function StarDots({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0,
            background: i <= value ? color : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginLeft: '4px' }}>{value}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<string, string> = {
  period1: 'P1',
  period2: 'P2',
  period3: 'P3',
};

export default function CrossReferencePage() {
  const router  = useRouter();
  const params  = useParams();
  const { user } = useAuth();
  const sessionId = params.id as string;

  const [goalieEntry, setGoalieEntry] = useState<V2GameChartEntry | null>(null);
  const [parentEntry, setParentEntry] = useState<ParentChartEntry | null>(null);
  const [coachEntry,  setCoachEntry]  = useState<CoachChartEntry  | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [activePeriod, setActivePeriod] = useState<'period1' | 'period2' | 'period3'>('period1');

  useEffect(() => {
    if (!sessionId || !user?.id) return;
    (async () => {
      try {
        const [goalieSnap, parentSnap, coachSnap] = await Promise.all([
          getDocs(query(collection(db, 'v2_chart_entries'),         where('sessionId', '==', sessionId))),
          getDocs(query(collection(db, 'parent_charting_entries'),  where('sessionId', '==', sessionId))),
          getDocs(query(collection(db, 'coach_charting_entries'),   where('sessionId', '==', sessionId))),
        ]);
        if (!goalieSnap.empty) setGoalieEntry({ id: goalieSnap.docs[0].id, ...goalieSnap.docs[0].data() } as V2GameChartEntry);
        if (!parentSnap.empty) setParentEntry({ id: parentSnap.docs[0].id, ...parentSnap.docs[0].data() } as ParentChartEntry);
        if (!coachSnap.empty)  setCoachEntry({ id: coachSnap.docs[0].id,  ...coachSnap.docs[0].data() }  as CoachChartEntry);
      } catch { /* silently fail */ } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, user?.id]);

  const goaliePeriod = goalieEntry?.periods?.[activePeriod] ?? null;
  const parentPeriod = parentEntry?.periods?.[activePeriod] ?? null;
  const coachPeriod  = coachEntry?.periods?.[activePeriod]  ?? null;

  // ── Compute gaps ────────────────────────────────────────────────────────────
  interface GapRow {
    factorLabel:    string;
    goalieRating:   number;
    observerRating: number;
    observerRole:   'Parent' | 'Coach';
    diff:           number;
    starter:        string;
  }

  const gaps: GapRow[] = [];

  if (goaliePeriod) {
    FACTORS.forEach(f => {
      const gVal = f.getGoalie(goaliePeriod);
      if (!gVal) return;

      if (f.getParent && parentPeriod) {
        const pVal = f.getParent(parentPeriod);
        if (pVal && Math.abs(gVal - pVal) >= 2) {
          gaps.push({
            factorLabel:    f.label,
            goalieRating:   gVal,
            observerRating: pVal,
            observerRole:   'Parent',
            diff:           gVal - pVal,
            starter:        conversationStarter(f.label, gVal, pVal, 'Parent'),
          });
        }
      }

      if (f.getCoach && coachPeriod) {
        const cVal = f.getCoach(coachPeriod);
        if (cVal && Math.abs(gVal - cVal) >= 2) {
          gaps.push({
            factorLabel:    f.label,
            goalieRating:   gVal,
            observerRating: cVal,
            observerRole:   'Coach',
            diff:           gVal - cVal,
            starter:        conversationStarter(f.label, gVal, cVal, 'Coach'),
          });
        }
      }
    });
  }

  const hasObservers    = !!parentEntry || !!coachEntry;
  const periodCompleted = !!goaliePeriod;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
        <button
          type="button"
          onClick={() => router.push(`/charting/sessions/${sessionId}`)}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} /> Back
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <Eye style={{ width: '16px', height: '16px', color: VIOLET }} />
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 800 }}>Cross-Reference View</h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
            Side-by-side alignment of all perspectives on this game
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading…</div>
      ) : (
        <>
          {/* ── Perspective legend ───────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { label: 'Goalie',       color: CYAN,   available: !!goalieEntry },
              { label: 'Parent',       color: MINT,   available: !!parentEntry },
              { label: 'Coach',        color: VIOLET, available: !!coachEntry  },
              { label: 'Goalie Coach', color: GOLD,   available: false         },
            ].map(({ label, color, available }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: available ? color : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                <span style={{ color: available ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: 600 }}>
                  {label}
                  {!available && <span style={{ fontSize: '10px', marginLeft: '4px', color: 'rgba(255,255,255,0.2)' }}>—</span>}
                </span>
              </div>
            ))}
          </div>

          {/* ── Period tabs ──────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {(['period1', 'period2', 'period3'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setActivePeriod(p)}
                style={{
                  padding: '8px 20px', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  border: '1px solid', transition: 'all 0.15s',
                  ...(activePeriod === p
                    ? { background: CYAN,                      borderColor: CYAN,                       color: '#041830' }
                    : { background: 'rgba(255,255,255,0.04)',  borderColor: 'rgba(255,255,255,0.1)',   color: 'rgba(255,255,255,0.45)' }
                  ),
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* ── Factor comparison table ──────────────────────────────────────── */}
          {!goalieEntry ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              No goalie chart found for this session.
            </div>
          ) : !periodCompleted ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              Goalie hasn&apos;t completed {PERIOD_LABELS[activePeriod]} yet.
            </div>
          ) : (
            <div style={{ marginBottom: '24px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '10px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Factor</span>
                <span style={{ color: CYAN,   fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>Goalie</span>
                <span style={{ color: MINT,   fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>Parent</span>
                <span style={{ color: VIOLET, fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>Coach</span>
              </div>

              {FACTORS.map((factor, i) => {
                const gVal = goaliePeriod ? (factor.getGoalie(goaliePeriod) ?? null) : null;
                const pVal = (factor.getParent && parentPeriod) ? factor.getParent(parentPeriod) : null;
                const cVal = (factor.getCoach  && coachPeriod)  ? factor.getCoach(coachPeriod)   : null;

                const pGap = gVal != null && pVal != null && Math.abs(gVal - pVal) >= 2;
                const cGap = gVal != null && cVal != null && Math.abs(gVal - cVal) >= 2;
                const rowHasGap = pGap || cGap;

                return (
                  <div
                    key={factor.key}
                    style={{
                      display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                      padding: '13px 16px', alignItems: 'center',
                      borderBottom: i < FACTORS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      background: rowHasGap ? 'rgba(255,107,107,0.04)' : 'transparent',
                    }}
                  >
                    {/* Factor label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {rowHasGap && <AlertTriangle style={{ width: '11px', height: '11px', color: CORAL, flexShrink: 0 }} />}
                      <span style={{ color: rowHasGap ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: rowHasGap ? 600 : 400 }}>
                        {factor.label}
                      </span>
                    </div>

                    {/* Goalie */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {gVal ? <StarDots value={gVal} color={CYAN} /> : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>—</span>}
                    </div>

                    {/* Parent */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {factor.getParent === null
                        ? <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '11px' }}>n/a</span>
                        : pVal
                          ? <StarDots value={pVal} color={pGap ? CORAL : MINT} />
                          : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>—</span>
                      }
                    </div>

                    {/* Coach */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {factor.getCoach === null
                        ? <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '11px' }}>n/a</span>
                        : cVal
                          ? <StarDots value={cVal} color={cGap ? CORAL : VIOLET} />
                          : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>—</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Gap conversation starters ────────────────────────────────────── */}
          {gaps.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Conversation Starters — {PERIOD_LABELS[activePeriod]} · {gaps.length} gap{gaps.length !== 1 ? 's' : ''} found
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {gaps.map((gap, i) => (
                  <div key={i} style={{ borderRadius: '12px', background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.2)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <p style={{ color: CORAL, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {gap.factorLabel} · vs {gap.observerRole}
                      </p>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                        {Math.abs(gap.diff)}★ gap
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '10px' }}>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginBottom: '4px' }}>Goalie</p>
                        <StarDots value={gap.goalieRating} color={CYAN} />
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginBottom: '4px' }}>{gap.observerRole}</p>
                        <StarDots value={gap.observerRating} color={gap.observerRole === 'Parent' ? MINT : VIOLET} />
                      </div>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontStyle: 'italic' }}>
                      &ldquo;{gap.starter}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Strong alignment state ───────────────────────────────────────── */}
          {periodCompleted && hasObservers && gaps.length === 0 && (
            <div style={{ marginBottom: '24px', padding: '24px', borderRadius: '12px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', textAlign: 'center' }}>
              <CheckCircle2 style={{ width: '20px', height: '20px', color: '#34d399', margin: '0 auto 8px' }} />
              <p style={{ color: '#34d399', fontSize: '14px', fontWeight: 700 }}>Strong alignment in {PERIOD_LABELS[activePeriod]}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>
                No gaps of 2+ stars between perspectives. Where they align, that confirms the read.
              </p>
            </div>
          )}

          {/* ── No observers yet ─────────────────────────────────────────────── */}
          {periodCompleted && !hasObservers && (
            <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Waiting for Observer Charts</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
                When a Parent or Coach charts this game, their ratings appear here side-by-side with yours. Gaps of 2+ stars surface as conversation starters — never to show who was wrong, only to open the right coaching conversation.
              </p>
            </div>
          )}

          {/* ── Goalie Coach placeholder ──────────────────────────────────────── */}
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ color: `${GOLD}66`, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Goalie Coach Perspective</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
              The Goalie Coach&apos;s all-Pillar read is the technical anchor this view is measured against. Coming when the Goalie Coach panel is live.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
