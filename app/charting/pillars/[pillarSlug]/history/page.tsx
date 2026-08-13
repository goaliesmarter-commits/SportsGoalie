'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter, useParams } from 'next/navigation';
import { formTemplateService, dynamicChartingService } from '@/lib/database';
import { dynamicAnalyticsService } from '@/lib/database/services/dynamic-analytics.service';
import {
  FormTemplate,
  FormField,
  FieldResponse,
  DynamicChartingEntry,
  DynamicStudentAnalytics,
  FieldAnalyticsResult,
  PILLARS,
} from '@/types';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import {
  ArrowLeft,
  AlertCircle,
  ClipboardList,
  PenLine,
  ChevronDown,
  ChevronRight,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, subMonths } from 'date-fns';
import { toDateSafe } from '@/lib/utils/timestamp';
import { scaleToPercentage } from '@/lib/scoring/scale-score';
import { isStarScale } from '@/lib/scale/five-star';
import { StarScaleReadout } from '@/components/charting/StarScale';
import {
  CYAN,
  MINT,
  CORAL,
  PILLAR_ICONS,
  panelStyle,
  headerPanelStyle,
  accentLineStyle,
  formatResponseValue,
} from '@/components/charting/pillar-chrome';

/**
 * The goalie's read-only view of one pillar: every check-in they've submitted,
 * plus the progress board comparing where they are now against their baseline.
 *
 * Separate from the check-in form at `../` on purpose — filling a chart in and
 * reading it back are different jobs, and the form clears itself on submit.
 */

type RangeKey = 'week' | 'month' | 'quarter' | 'all';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: '3 Months' },
  { key: 'all', label: 'All Time' },
];

/** `undefined` for All Time — the services read that as "no lower bound". */
function rangeStart(range: RangeKey): Date | undefined {
  switch (range) {
    case 'week': return subDays(new Date(), 7);
    case 'month': return subMonths(new Date(), 1);
    case 'quarter': return subMonths(new Date(), 3);
    case 'all': return undefined;
  }
}

/**
 * Where a value sits on its field's own scale, as a 0-100 bar percentage.
 * Uses the app-wide rule so 7 out of 10 fills 70% of the bar here and reads 70%
 * everywhere else.
 */
function scalePercent(value: number, field: FormField | undefined): number {
  const min = field?.validation?.min ?? 1;
  const max = field?.validation?.max ?? 10;
  return scaleToPercentage(value, max, min) ?? 0;
}

function GrowthChip({ growth }: { growth: number }) {
  const rounded = Math.round(growth * 10) / 10;
  const [color, bg, Icon] =
    rounded > 0 ? [MINT, 'rgba(52,211,153,0.12)', TrendingUp]
    : rounded < 0 ? [CORAL, 'rgba(248,113,113,0.12)', TrendingDown]
    : ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.06)', Minus];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: bg, borderRadius: '99px', padding: '3px 8px', fontSize: '11px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
      <Icon size={11} />
      {rounded > 0 ? '+' : ''}{rounded}
    </span>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ flex: '1 1 130px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '11px', padding: '13px 15px' }}>
      <div style={{ fontSize: '21px', fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginTop: '3px' }}>
        {label}
      </div>
    </div>
  );
}

/**
 * One checkpoint's bar: a cyan fill to where the goalie is now, plus a tick
 * showing where they started. The tick is what makes this a growth chart rather
 * than just a score — without it "6/10" says nothing about direction.
 */
function CheckpointBar({
  result,
  field,
}: {
  result: FieldAnalyticsResult;
  field: FormField | undefined;
}) {
  const current = result.latestValue ?? result.average;
  if (typeof current !== 'number') return null;

  const min = field?.validation?.min ?? 1;
  const max = field?.validation?.max ?? 10;
  const currentPct = scalePercent(current, field);
  const hasBaseline =
    typeof result.baselineValue === 'number' && result.dataPoints > 1;
  const baselinePct = hasBaseline ? scalePercent(result.baselineValue as number, field) : 0;
  const growth = hasBaseline ? current - (result.baselineValue as number) : null;

  return (
    <div style={{ padding: '14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '9px' }}>
        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.35, minWidth: 0 }}>
          {result.fieldLabel}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px', flexShrink: 0 }}>
          {growth !== null && <GrowthChip growth={growth} />}
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(current * 10) / 10}
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>/{max}</span>
          </span>
        </span>
      </div>

      {/* The same stars the goalie taps on the check-in, reading back what they
          recorded. Half-filled where the number sits between two rungs — an
          average across a month rarely lands exactly on one. */}
      {field?.type === 'scale' && isStarScale(min, max) && (
        <div style={{ marginBottom: '8px' }}>
          <StarScaleReadout score={current} max={max} />
        </div>
      )}

      <div style={{ position: 'relative', height: '9px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${currentPct}%`, background: `linear-gradient(90deg, ${CYAN}, ${MINT})`, borderRadius: '99px', transition: 'width 0.3s ease' }} />
        {hasBaseline && (
          <div
            title={`Baseline ${result.baselineValue}`}
            style={{ position: 'absolute', top: 0, bottom: 0, left: `${baselinePct}%`, width: '2px', background: 'rgba(255,255,255,0.85)', transform: 'translateX(-1px)' }}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.38)' }}>
        <span>Weak ({min})</span>
        {hasBaseline && <span>Baseline {result.baselineValue}</span>}
        <span>Strong ({max})</span>
      </div>
    </div>
  );
}

/** One submitted check-in, rendered for reading. */
function EntryCard({
  entry,
  template,
  expanded,
  onToggle,
}: {
  entry: DynamicChartingEntry;
  template: FormTemplate;
  expanded: boolean;
  onToggle: () => void;
}) {
  const date = toDateSafe(entry.submittedAt);
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '11px', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <Chevron size={15} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
            {date ? format(date, 'MMM d, yyyy') : 'Date unavailable'}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', fontWeight: 500, marginTop: '2px' }}>
            {date ? format(date, 'h:mm a') : `Version ${entry.formTemplateVersion}`}
          </div>
        </div>
        <span style={{ fontSize: '10.5px', fontWeight: 800, borderRadius: '99px', padding: '3px 9px', flexShrink: 0, color: entry.isComplete ? MINT : 'rgba(255,255,255,0.55)', background: entry.isComplete ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)' }}>
          {entry.isComplete ? 'Complete' : `${Math.round(entry.completionPercentage || 0)}%`}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 18px 46px' }}>
          {[...template.sections]
            .sort((a, b) => a.order - b.order)
            .map((section) => {
              const sectionData = entry.responses?.[section.id];
              if (!sectionData || Array.isArray(sectionData)) return null;

              const answered = [...section.fields]
                .sort((a, b) => a.order - b.order)
                .map((field) => ({
                  field,
                  response: (sectionData as Record<string, FieldResponse>)[field.id],
                }))
                .filter(({ response }) => formatResponseValue(response?.value) !== null || response?.comments);

              if (answered.length === 0) return null;

              return (
                <div key={section.id} style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(55,181,255,0.75)', marginBottom: '8px' }}>
                    {section.title}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {answered.map(({ field, response }) => {
                      const display = formatResponseValue(response?.value);
                      return (
                        <div key={field.id}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px' }}>
                            <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, minWidth: 0 }}>
                              {field.label}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                              {display ?? '—'}
                              {display !== null && typeof response?.value === 'number' && (
                                <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                                  /{field.validation?.max ?? 10}
                                </span>
                              )}
                            </span>
                          </div>
                          {field.type === 'scale' &&
                            typeof response?.value === 'number' &&
                            isStarScale(field.validation?.min ?? 1, field.validation?.max ?? 10) && (
                              <div style={{ marginTop: '3px' }}>
                                <StarScaleReadout
                                  score={response.value}
                                  max={field.validation?.max ?? 10}
                                />
                              </div>
                            )}
                          {response?.comments && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', lineHeight: 1.5 }}>
                              <MessageSquare size={11} style={{ flexShrink: 0, marginTop: '3px' }} />
                              <span>{response.comments}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {entry.additionalComments && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', padding: '10px 12px' }}>
              <h4 style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: '5px' }}>
                Additional Notes
              </h4>
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>
                {entry.additionalComments}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PillarHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pillarSlug = params.pillarSlug as string;
  const pillarInfo = PILLARS.find((p) => p.slug === pillarSlug);

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [entries, setEntries] = useState<DynamicChartingEntry[]>([]);
  const [analytics, setAnalytics] = useState<DynamicStudentAnalytics | null>(null);
  const [range, setRange] = useState<RangeKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    if (!user || !pillarInfo) return;
    try {
      setLoading(true);
      setLoadFailed(false);

      const templateResult = await formTemplateService.getActiveTemplate({
        sport: 'Hockey',
        pillar: pillarInfo.slug,
      });

      if (!templateResult.success) {
        console.error('Failed to load pillar template:', templateResult.error);
        setLoadFailed(true);
        setTemplate(null);
        return;
      }

      if (!templateResult.data) {
        setTemplate(null);
        setEntries([]);
        setAnalytics(null);
        return;
      }

      setTemplate(templateResult.data);
      const templateId = templateResult.data.id;
      const dateFrom = rangeStart(range);

      const [entriesResult, analyticsResult] = await Promise.all([
        dynamicChartingService.getDynamicEntriesByStudent(user.id, templateId),
        // `recalculate` is required, not an optimisation: creating an entry
        // doesn't refresh the cached analytics doc, so a plain read would show
        // stale numbers — or nothing at all on a student who has never had
        // analytics computed.
        dynamicAnalyticsService.getStudentAnalytics(user.id, templateId, {
          recalculate: true,
          dateFrom,
        }),
      ]);

      setEntries(entriesResult.success && entriesResult.data ? entriesResult.data : []);
      // A missing analytics doc is normal (no complete entries yet) — the board
      // shows its own empty state rather than the page reporting a failure.
      setAnalytics(analyticsResult.success && analyticsResult.data ? analyticsResult.data : null);
    } catch (error) {
      console.error('Failed to load pillar history:', error);
      setLoadFailed(true);
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [user, pillarInfo, range]);

  useEffect(() => {
    load();
  }, [load]);

  /** fieldId → definition, so analytics rows can find their own 1-10 endpoints. */
  const fieldsById = useMemo(() => {
    const map = new Map<string, FormField>();
    template?.sections.forEach((section) =>
      section.fields.forEach((field) => map.set(field.id, field))
    );
    return map;
  }, [template]);

  // Memoised because rangeStart() builds a fresh Date every call, which would
  // otherwise invalidate the filter below on every single render.
  const dateFrom = useMemo(() => rangeStart(range), [range]);
  const visibleEntries = useMemo(() => {
    if (!dateFrom) return entries;
    return entries.filter((entry) => {
      const date = toDateSafe(entry.submittedAt);
      // Undated entries stay visible: hiding a check-in the student really did
      // submit is worse than showing one slightly out of range.
      return !date || date >= dateFrom;
    });
  }, [entries, dateFrom]);

  /**
   * "Focus follows the gaps" — lowest raw score first, so the checkpoint that
   * needs work is the first thing on screen rather than buried mid-list.
   */
  const checkpoints = useMemo(() => {
    if (!analytics) return [];
    return Object.values(analytics.fieldAnalytics || {})
      .filter((r) => typeof (r.latestValue ?? r.average) === 'number' && r.dataPoints > 0)
      .sort((a, b) => (a.latestValue ?? a.average ?? 0) - (b.latestValue ?? b.average ?? 0));
  }, [analytics]);

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <SkeletonContentPage />
      </div>
    );
  }

  if (!user) return null;

  if (!pillarInfo) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', ...panelStyle, padding: '48px 24px', textAlign: 'center' }}>
        <div style={accentLineStyle} />
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginBottom: '16px' }}>Unknown pillar</p>
        <button
          type="button"
          onClick={() => router.push('/charting/pillars')}
          style={{ background: `linear-gradient(135deg, ${CYAN}, ${MINT})`, border: 'none', borderRadius: '9px', padding: '9px 18px', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
        >
          Back to Pillar Charts
        </button>
      </div>
    );
  }

  const IconComponent = PILLAR_ICONS[pillarInfo.icon] || Target;
  const lastEntryDate = toDateSafe(entries[0]?.submittedAt);
  const countLabel = `${entries.length} check-in${entries.length === 1 ? '' : 's'}`;
  const headerSubtitle = entries.length === 0
    ? 'No check-ins submitted yet'
    : lastEntryDate
      ? `${countLabel} · last ${formatDistanceToNow(lastEntryDate, { addSuffix: true })}`
      : countLabel;

  return (
    <div
      className="surface-dark"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto', width: '100%' }}
    >
      {/* ── HEADER PANEL ── */}
      <div style={headerPanelStyle}>
        <div style={{ ...accentLineStyle, height: '3px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 22px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => router.push('/charting/pillars')}
            aria-label="Back to pillar charts"
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(55,181,255,0.2)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(55,181,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <ArrowLeft size={16} />
          </button>

          <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconComponent size={20} color={CYAN} />
          </div>

          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {pillarInfo.shortName} Charts
            </h1>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.62)', fontWeight: 500, marginTop: '5px' }}>
              {headerSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/charting/pillars/${pillarInfo.slug}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: `linear-gradient(135deg, ${CYAN}, ${MINT})`, border: 'none', borderRadius: '9px', padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 18px rgba(55,181,255,0.35)', flexShrink: 0 }}
          >
            <PenLine size={13} />
            New Check-In
          </button>
        </div>
      </div>

      {loadFailed ? (
        <div style={{ ...panelStyle, padding: '40px 24px', textAlign: 'center' }}>
          <div style={accentLineStyle} />
          <AlertCircle size={36} color={CORAL} style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            Couldn&apos;t load your charts
          </h3>
          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.42)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>
            Something went wrong reaching the server. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => load()}
            style={{ marginTop: '18px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '9px', padding: '9px 18px', color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      ) : !template ? (
        <div style={{ ...panelStyle, padding: '40px 24px', textAlign: 'center' }}>
          <div style={accentLineStyle} />
          <ClipboardList size={36} color="rgba(255,255,255,0.25)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            Not set up yet
          </h3>
          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.42)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>
            {pillarInfo.name} check-ins haven&apos;t been activated for you yet.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ ...panelStyle, padding: '40px 24px', textAlign: 'center' }}>
          <div style={accentLineStyle} />
          <ClipboardList size={36} color="rgba(255,255,255,0.25)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            Nothing to show yet
          </h3>
          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.42)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            Once you submit your first {pillarInfo.shortName} check-in it becomes your baseline,
            and every check-in after that is measured against it.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/charting/pillars/${pillarInfo.slug}`)}
            style={{ marginTop: '18px', display: 'inline-flex', alignItems: 'center', gap: '7px', background: `linear-gradient(135deg, ${CYAN}, ${MINT})`, border: 'none', borderRadius: '9px', padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
          >
            <PenLine size={13} />
            Start your baseline
          </button>
        </div>
      ) : (
        <>
          {/* ── RANGE FILTER ── */}
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
            {RANGES.map((option) => {
              const active = option.key === range;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  style={{ borderRadius: '99px', padding: '7px 15px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s', color: active ? '#04213f' : 'rgba(255,255,255,0.62)', background: active ? CYAN : 'rgba(255,255,255,0.06)', border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.12)'}` }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* ── PROGRESS BOARD ── */}
          <div style={panelStyle}>
            <div style={accentLineStyle} />
            <div style={{ padding: '18px 20px 15px', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                Progress Board
              </h3>
              <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginTop: '2px' }}>
                Lowest scores first — that&apos;s where the work is
              </p>
            </div>

            {checkpoints.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.6, padding: '28px 20px', textAlign: 'center' }}>
                No scored checkpoints in this range yet. Progress is calculated from completed
                check-ins, so finish one all the way through to see your bars.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '16px 20px 4px' }}>
                  <StatTile label="check-ins in range" value={String(visibleEntries.length)} accent="#fff" />
                  <StatTile label="checkpoints tracked" value={String(checkpoints.length)} accent={CYAN} />
                  <StatTile
                    label="overall score"
                    value={`${Math.round(analytics?.overallPerformanceScore ?? 0)}%`}
                    accent={MINT}
                  />
                  <StatTile
                    label="current streak"
                    value={String(analytics?.streak?.currentStreak ?? 0)}
                    accent="#fbbf24"
                  />
                </div>

                <div style={{ padding: '6px 20px 18px' }}>
                  {checkpoints.map((result, index) => (
                    <div
                      key={result.fieldId}
                      style={index > 0 ? { borderTop: '1px solid rgba(255,255,255,0.07)' } : undefined}
                    >
                      <CheckpointBar result={result} field={fieldsById.get(result.fieldId)} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── SUBMITTED CHECK-INS ── */}
          <div style={{ ...panelStyle, marginBottom: '24px' }}>
            <div style={accentLineStyle} />
            <div style={{ padding: '18px 20px 15px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                Your Check-Ins
              </h3>
              <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginTop: '2px' }}>
                Tap any date to read back exactly what you submitted
              </p>
            </div>

            {visibleEntries.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.6, padding: '10px 20px 28px', textAlign: 'center' }}>
                No check-ins in this range. Try a wider one.
              </p>
            ) : (
              visibleEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  template={template}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
