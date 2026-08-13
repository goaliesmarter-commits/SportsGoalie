'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { formTemplateService, dynamicChartingService } from '@/lib/database';
import { FormTemplate, DynamicChartingEntry, PILLARS, PillarInfo } from '@/types';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { ArrowLeft, ClipboardList, AlertCircle, BarChart3, PenLine, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toDateSafe } from '@/lib/utils/timestamp';
import {
  CYAN,
  MINT,
  PILLAR_ICONS,
  panelStyle,
  headerPanelStyle,
  accentLineStyle,
} from '@/components/charting/pillar-chrome';

/**
 * Pillar Charts — the goalie's own view of the check-in forms they've filled in.
 *
 * Deliberately its own area rather than another tab on `/charting`: that page is
 * about game and practice *sessions*, which are a different mental model from a
 * self-rated pillar check-in. Mixing them was the confusion this route removes.
 */

interface PillarCard {
  template: FormTemplate;
  info: PillarInfo;
  entryCount: number;
  lastDate: Date | null;
  /** Mean of every numeric answer in the newest entry, or null if it has none. */
  latestAverage: number | null;
}

/** Flattens a submitted entry down to just its numeric answers. */
function numericAnswers(entry: DynamicChartingEntry): number[] {
  const values: number[] = [];

  const collect = (section: Record<string, { value: unknown }>) => {
    Object.values(section).forEach((response) => {
      if (response && typeof response.value === 'number' && !isNaN(response.value)) {
        values.push(response.value);
      }
    });
  };

  Object.values(entry.responses || {}).forEach((section) => {
    if (Array.isArray(section)) section.forEach((instance) => collect(instance as never));
    else if (section) collect(section as never);
  });

  return values;
}

export default function PillarChartsIndexPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [cards, setCards] = useState<PillarCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setLoadFailed(false);

      const templatesResult = await formTemplateService.getActiveTemplatesForSport('Hockey');
      if (!templatesResult.success || !templatesResult.data) {
        console.error('Failed to load pillar templates:', templatesResult.error);
        setLoadFailed(true);
        setCards([]);
        return;
      }

      // 'combined' is the full Hockey game/practice tracker — it belongs to the
      // session flow on /charting, not here.
      const pillarTemplates = templatesResult.data.filter((t) => t.pillar && t.pillar !== 'combined');

      const built = await Promise.all(
        pillarTemplates.map(async (template): Promise<PillarCard | null> => {
          const info = PILLARS.find((p) => p.slug === template.pillar);
          if (!info) return null;

          const entriesResult = await dynamicChartingService.getDynamicEntriesByStudent(
            user.id,
            template.id
          );
          const entries = entriesResult.success && entriesResult.data ? entriesResult.data : [];
          const newest = entries[0];
          const numbers = newest ? numericAnswers(newest) : [];

          return {
            template,
            info,
            entryCount: entries.length,
            lastDate: toDateSafe(newest?.submittedAt),
            latestAverage: numbers.length
              ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length
              : null,
          };
        })
      );

      // Keep the taxonomy's own order so the list doesn't reshuffle between
      // visits as templates get activated.
      const order = PILLARS.map((p) => p.slug);
      setCards(
        built
          .filter((c): c is PillarCard => c !== null)
          .sort((a, b) => order.indexOf(a.info.slug) - order.indexOf(b.info.slug))
      );
    } catch (error) {
      console.error('Failed to load pillar charts:', error);
      setLoadFailed(true);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: '980px', margin: '0 auto', width: '100%' }}>
        <SkeletonContentPage />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className="surface-dark"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '980px', margin: '0 auto', width: '100%' }}
    >
      {/* ── HEADER PANEL ── */}
      <div style={headerPanelStyle}>
        <div style={{ ...accentLineStyle, height: '3px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 22px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => router.push('/charting')}
            aria-label="Back to charting"
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(55,181,255,0.2)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(55,181,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <ArrowLeft size={16} />
          </button>

          <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChart3 size={20} color={CYAN} />
          </div>

          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Pillar Charts
            </h1>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.62)', fontWeight: 500, marginTop: '5px' }}>
              Your check-ins and how each pillar has moved since your baseline
            </p>
          </div>
        </div>
      </div>

      {loadFailed ? (
        <div style={{ ...panelStyle, padding: '40px 24px', textAlign: 'center' }}>
          <div style={accentLineStyle} />
          <AlertCircle size={36} color="#f87171" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            Couldn&apos;t load your pillar charts
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
      ) : cards.length === 0 ? (
        <div style={{ ...panelStyle, padding: '40px 24px', textAlign: 'center' }}>
          <div style={accentLineStyle} />
          <ClipboardList size={36} color="rgba(255,255,255,0.25)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            No pillar check-ins yet
          </h3>
          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.42)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            Your coach hasn&apos;t activated any pillar check-ins for you yet. Once one is live it
            will show up here with your history and progress.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', paddingBottom: '24px' }}>
          {cards.map((card) => {
            const IconComponent = PILLAR_ICONS[card.info.icon] || Target;
            const hasEntries = card.entryCount > 0;

            return (
              <div key={card.template.id} style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
                <div style={accentLineStyle} />

                <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconComponent size={18} color={CYAN} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                      {card.info.name}
                    </h3>
                    <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginTop: '3px', lineHeight: 1.45 }}>
                      {card.info.description}
                    </p>
                  </div>
                </div>

                {/* Two numbers, deliberately: how often they've checked in, and
                    where they landed last time. Everything deeper lives on the
                    history page rather than being crammed into a card. */}
                <div style={{ display: 'flex', gap: '10px', padding: '0 18px 14px' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '19px', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                      {card.entryCount}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginTop: '2px' }}>
                      check-in{card.entryCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '19px', fontWeight: 800, color: card.latestAverage === null ? 'rgba(255,255,255,0.3)' : MINT, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                      {card.latestAverage === null ? '–' : card.latestAverage.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginTop: '2px' }}>
                      latest average
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', fontWeight: 500, padding: '0 18px 14px' }}>
                  {!hasEntries
                    ? 'Not started — your first check-in sets your baseline'
                    : card.lastDate
                      ? `Last check-in ${formatDistanceToNow(card.lastDate, { addSuffix: true })}`
                      : 'Last check-in date unavailable'}
                </p>

                <div style={{ display: 'flex', gap: '8px', padding: '0 18px 18px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/charting/pillars/${card.info.slug}`)}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: `linear-gradient(135deg, ${CYAN}, ${MINT})`, border: 'none', borderRadius: '9px', padding: '9px 12px', color: '#fff', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(55,181,255,0.28)' }}
                  >
                    <PenLine size={13} />
                    {hasEntries ? 'New Check-In' : 'Start'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/charting/pillars/${card.info.slug}/history`)}
                    disabled={!hasEntries}
                    title={hasEntries ? undefined : 'Submit a check-in first'}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '9px', padding: '9px 12px', color: hasEntries ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)', fontSize: '12.5px', fontWeight: 700, cursor: hasEntries ? 'pointer' : 'not-allowed' }}
                  >
                    <BarChart3 size={13} />
                    View Charts
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
