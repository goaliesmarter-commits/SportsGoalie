'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter, useParams } from 'next/navigation';
import { formTemplateService, dynamicChartingService } from '@/lib/database';
import { FormTemplate, FormResponses, DynamicChartingEntry, PILLARS } from '@/types';
import { DynamicFormRenderer } from '@/components/charting/DynamicFormRenderer';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import {
  ArrowLeft,
  Save,
  Loader2,
  ClipboardList,
  AlertCircle,
  BarChart3,
  Target,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
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
 * Labels of every required field the goalie hasn't answered yet.
 *
 * Mirrors the "is this entry complete?" rule the service applies when it decides
 * whether an entry counts toward analytics (all required fields present), so the
 * two can't disagree about what a finished check-in is.
 */
function missingRequiredLabels(template: FormTemplate, responses: FormResponses): string[] {
  const missing: string[] = [];

  const isAnswered = (value: unknown) =>
    value !== undefined && value !== null && value !== '' &&
    !(Array.isArray(value) && value.length === 0);

  [...template.sections]
    .sort((a, b) => a.order - b.order)
    .forEach((section) => {
      const sectionData = responses[section.id];
      // Repeatable sections check their first instance, matching the service.
      const instance = Array.isArray(sectionData) ? sectionData[0] : sectionData;

      [...section.fields]
        .sort((a, b) => a.order - b.order)
        .forEach((field) => {
          if (!field.validation?.required) return;
          if (!isAnswered(instance?.[field.id]?.value)) missing.push(field.label.trim());
        });
    });

  return missing;
}

function SubmitButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        background: `linear-gradient(135deg, ${CYAN}, ${MINT})`,
        border: 'none',
        borderRadius: '9px',
        padding: '10px 20px',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 800,
        cursor: saving ? 'not-allowed' : 'pointer',
        opacity: saving ? 0.55 : 1,
        boxShadow: '0 4px 18px rgba(55,181,255,0.35)',
        flexShrink: 0,
        transition: 'opacity 0.15s',
      }}
    >
      {saving ? (
        <>
          <Loader2 size={13} className="animate-spin" />
          Submitting...
        </>
      ) : (
        <>
          <Save size={13} />
          Submit Check-In
        </>
      )}
    </button>
  );
}

export default function PillarCheckInPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pillarSlug = params.pillarSlug as string;
  const pillarInfo = PILLARS.find((p) => p.slug === pillarSlug);

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [entries, setEntries] = useState<DynamicChartingEntry[]>([]);
  const [responses, setResponses] = useState<FormResponses>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Separate from `template === null`: the lookup failed rather than finding nothing.
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  const loadTemplateAndHistory = useCallback(async () => {
    if (!user || !pillarInfo) return;
    try {
      setLoading(true);
      setLoadFailed(false);

      const templateResult = await formTemplateService.getActiveTemplate({
        sport: 'Hockey',
        pillar: pillarInfo.slug,
      });

      if (!templateResult.success) {
        // Broken query, not an unconfigured pillar. Don't tell the student it isn't set up.
        console.error('Failed to load pillar template:', templateResult.error);
        setLoadFailed(true);
        setTemplate(null);
        setEntries([]);
        return;
      }

      if (!templateResult.data) {
        setTemplate(null);
        setEntries([]);
        return;
      }

      setTemplate(templateResult.data);

      const entriesResult = await dynamicChartingService.getDynamicEntriesByStudent(
        user.id,
        templateResult.data.id
      );
      setEntries(entriesResult.success && entriesResult.data ? entriesResult.data : []);
    } catch (error) {
      console.error('Failed to load pillar check-in:', error);
      setLoadFailed(true);
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [user, pillarInfo]);

  useEffect(() => {
    loadTemplateAndHistory();
  }, [loadTemplateAndHistory]);

  const handleSubmit = async () => {
    if (!user || !template) return;

    // Nothing was stopping a half-filled check-in from being submitted. It saved
    // fine and showed up in the goalie's history, but analytics only counts
    // entries where every required field is answered — so the check-in silently
    // never appeared on their Progress Board. Better to catch it here and say
    // which ratings are missing than to accept work that quietly doesn't count.
    const missing = missingRequiredLabels(template, responses);
    if (missing.length > 0) {
      const shown = missing.slice(0, 3).join(', ');
      toast.error(
        missing.length === 1
          ? `Rate "${shown}" before submitting`
          : `${missing.length} ratings still missing: ${shown}${missing.length > 3 ? '…' : ''}`
      );
      return;
    }

    try {
      setSaving(true);

      const result = await dynamicChartingService.createDynamicEntry({
        studentId: user.id,
        submittedBy: user.id,
        submitterRole: 'student',
        formTemplateId: template.id,
        formTemplateVersion: template.version,
        responses,
      });

      if (result.success) {
        toast.success('Check-in submitted');
        setResponses({});
        loadTemplateAndHistory();
      } else {
        toast.error(result.message || 'Failed to submit check-in');
      }
    } catch (error) {
      console.error('Error submitting check-in:', error);
      toast.error('An error occurred while submitting');
    } finally {
      setSaving(false);
    }
  };

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
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginBottom: '16px' }}>
          Unknown pillar
        </p>
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
  const isBaseline = entries.length === 0;

  // `submittedAt` is typed as a Timestamp but isn't reliably one on older
  // entries — see toDateSafe. When there's no usable date, show the count on its
  // own rather than crashing the page or printing "Invalid Date".
  const lastEntryDate = toDateSafe(entries[0]?.submittedAt);
  const countLabel = `${entries.length} check-in${entries.length === 1 ? '' : 's'}`;
  const headerSubtitle = !template
    ? pillarInfo.description
    : entries.length === 0
      ? 'Rate yourself to set your baseline'
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
              {pillarInfo.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
              {template && isBaseline && (
                <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: MINT, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.28)', borderRadius: '99px', padding: '3px 9px' }}>
                  Baseline
                </span>
              )}
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.62)', fontWeight: 500 }}>
                {headerSubtitle}
              </p>
            </div>
          </div>

          {/* The form clears itself on submit, so without this the goalie has no
              way back to what they've already sent in. Only offered once there
              is something to read. */}
          {template && entries.length > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/charting/pillars/${pillarInfo.slug}/history`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '9px', padding: '10px 16px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              <BarChart3 size={13} />
              View Charts
            </button>
          )}

          {template && <SubmitButton saving={saving} onClick={handleSubmit} />}
        </div>
      </div>

      {loadFailed ? (
        <div style={{ ...panelStyle, padding: '40px 24px', textAlign: 'center' }}>
          <div style={accentLineStyle} />
          <AlertCircle size={36} color="#f87171" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            Couldn&apos;t load this check-in
          </h3>
          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.42)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>
            Something went wrong reaching the server. This isn&apos;t a setup problem, so please
            try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => loadTemplateAndHistory()}
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
            {pillarInfo.name} check-ins haven&apos;t been activated for you yet. Check back soon.
          </p>
        </div>
      ) : (
        <>
          <DynamicFormRenderer
            template={template}
            initialValues={responses}
            onChange={setResponses}
            showSectionNumbers={true}
            collapsibleSections={true}
            // The page header already names the pillar and the section card
            // carries the course title — a third heading just repeats them.
            showFormHeader={false}
            // Pillar check-ins are the development engine, so they read on the
            // 5-Star scale. The value written is still 1-10 — the stars are how
            // it's said, not what's stored. The Weak/Strong anchors stay as the
            // fallback for any checkpoint whose range doesn't split into five.
            scaleDisplay="stars"
            scaleAnchors={{ low: 'Weak', high: 'Strong' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '24px' }}>
            <SubmitButton saving={saving} onClick={handleSubmit} />
          </div>
        </>
      )}
    </div>
  );
}
