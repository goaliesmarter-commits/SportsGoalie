'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck, Check, Clock, Inbox, Loader2, Mail, PauseCircle, Search, X,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminRoute } from '@/components/auth/protected-route';
import { auth } from '@/lib/firebase/config';
import type {
  ApplicantSummary,
  ApplicationDecision,
  ApplicationStatus,
} from '@/types/application';

/**
 * Admin — the application queue.
 *
 * Michael's requirement: approve, waitlist or decline in one click, with
 * approval filling in the coach and the track and sending the email in the
 * same action. That is what the approve dialog is — the two fields the
 * invitation would have carried, asked for once, then written straight onto
 * the account that already exists.
 *
 * NOTE FOR MICHAEL: he wrote "if approved, the invitation goes out". Approval
 * here does not send an invitation, because the invitation flow *creates* an
 * account and the applicant already has one — sending it would give them a
 * second, empty account and lose the questionnaire. Instead approval takes
 * the wall down on their existing account and emails them the booking link,
 * which is what the invitation was carrying. Same outcome, one account.
 */

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const RED = '#f87171';
const MUTED = 'rgba(200,230,255,0.55)';
const BODY = 'rgba(200,230,255,0.84)';

const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(4,20,45,0.9)',
  border: '1px solid rgba(55,181,255,0.2)',
  borderRadius: '9px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: BLUE2,
  marginBottom: '6px',
};

export default function AdminApplicationsPage() {
  return <AdminRoute><ApplicationsContent /></AdminRoute>;
}

async function authedFetch(url: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });
}

interface Coach { id: string; name: string }

const TABS: { key: ApplicationStatus; label: string; colour: string }[] = [
  { key: 'submitted', label: 'To review', colour: BLUE },
  { key: 'applying', label: 'Unfinished', colour: MUTED },
  { key: 'waitlisted', label: 'Waiting list', colour: AMBER },
  { key: 'approved', label: 'Approved', colour: GREEN },
  { key: 'declined', label: 'Declined', colour: RED },
];

/** A decision in flight, holding the applicant and the coach/track choices. */
interface PendingDecision {
  applicant: ApplicantSummary;
  decision: ApplicationDecision;
  tier: 'automated' | 'custom';
  coachId: string;
  note: string;
}

function ApplicationsContent() {
  const [applicants, setApplicants] = useState<ApplicantSummary[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ApplicationStatus>('submitted');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch('/api/admin/applications');
      const data = (await res.json()) as {
        success: boolean; applicants?: ApplicantSummary[]; coaches?: Coach[]; error?: string;
      };
      if (!data.success) throw new Error(data.error || 'Failed to load');
      setApplicants(data.applicants ?? []);
      setCoaches(data.coaches ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Waitlist and decline go through immediately — there is nothing to fill in.
   * Approve opens the dialog, because approving without a track and (for
   * custom) a coach would leave the account open onto nothing.
   */
  function begin(applicant: ApplicantSummary, decision: ApplicationDecision) {
    if (decision === 'approve') {
      setPending({
        applicant,
        decision,
        tier: applicant.tier ?? 'automated',
        coachId: applicant.assignedCoachId ?? '',
        note: '',
      });
      return;
    }
    void submit({ applicant, decision, tier: 'automated', coachId: '', note: '' });
  }

  async function submit(p: PendingDecision) {
    if (p.decision === 'approve' && p.tier === 'custom' && !p.coachId) {
      toast.error('Pick a coach — a custom-track goalie needs one.');
      return;
    }

    setSaving(true);
    const coach = coaches.find(c => c.id === p.coachId);
    try {
      const res = await authedFetch(`/api/admin/applications/${p.applicant.id}`, {
        method: 'POST',
        body: JSON.stringify({
          decision: p.decision,
          ...(p.decision === 'approve' && { tier: p.tier }),
          ...(p.decision === 'approve' && p.coachId && { assignedCoachId: p.coachId, assignedCoachName: coach?.name }),
          ...(p.note.trim() && { note: p.note.trim() }),
        }),
      });
      const data = (await res.json()) as { success: boolean; emailSent?: boolean; error?: string };
      if (!data.success) throw new Error(data.error || 'Failed');

      const name = p.applicant.displayName;
      const done =
        p.decision === 'approve' ? `${name} is in.`
        : p.decision === 'waitlist' ? `${name} is on the waiting list.`
        : `${name} has been declined.`;

      // Whether the email actually left matters — it is the only thing the
      // applicant sees, and the approval email is what carries the booking
      // link. Say so plainly rather than reporting a clean success.
      if (data.emailSent) toast.success(done, { description: 'Email sent.' });
      else toast.warning(done, { description: 'Recorded, but the email did not send. Follow up by hand.' });

      setPending(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record the decision');
    } finally {
      setSaving(false);
    }
  }

  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () => applicants
      .filter(a => a.applicationStatus === tab)
      .filter(a => !query || a.displayName.toLowerCase().includes(query) || a.email.toLowerCase().includes(query)),
    [applicants, tab, query]
  );

  const counts = TABS.map(t => applicants.filter(a => a.applicationStatus === t.key).length);

  return (
    <div style={{ padding: '24px', maxWidth: '1180px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <ClipboardCheck size={22} style={{ color: BLUE }} />
        <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Applications</h1>
      </div>
      <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 20px', lineHeight: 1.6, maxWidth: '680px' }}>
        Everyone who applied through <strong style={{ color: BODY }}>/apply</strong>. They see nothing of the platform
        until you approve them. Approving opens their account, sets their coach and track, and emails them the booking link.
      </p>

      {/* Tabs + search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        {TABS.map((t, i) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '99px',
              border: `1px solid ${tab === t.key ? BLUE : 'rgba(55,181,255,0.2)'}`,
              background: tab === t.key ? 'rgba(55,181,255,0.15)' : 'transparent',
              color: tab === t.key ? BLUE2 : MUTED,
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t.label} <span style={{ opacity: 0.65 }}>({counts[i]})</span>
          </button>
        ))}

        <div style={{ position: 'relative', marginLeft: 'auto', minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email"
            style={{ ...inputStyle, paddingLeft: '32px' }}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ ...card, padding: '48px', textAlign: 'center', color: MUTED }}>
          <Loader2 size={22} className="animate-spin" style={{ color: BLUE, marginBottom: '10px' }} />
          <p style={{ margin: 0, fontSize: '13px' }}>Loading applications…</p>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
          <Inbox size={26} style={{ color: MUTED, marginBottom: '10px' }} />
          <p style={{ margin: 0, fontSize: '14px', color: BODY, fontWeight: 700 }}>Nothing here.</p>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: MUTED }}>
            {tab === 'submitted'
              ? 'No applications waiting on you.'
              : `No applications in "${TABS.find(t => t.key === tab)?.label.toLowerCase()}".`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visible.map(a => (
            <ApplicantRow key={a.id} applicant={a} onDecide={begin} busy={saving} />
          ))}
        </div>
      )}

      {/* Approve dialog */}
      {pending && (
        <ApproveDialog
          pending={pending}
          coaches={coaches}
          saving={saving}
          onChange={setPending}
          onCancel={() => setPending(null)}
          onConfirm={() => submit(pending)}
        />
      )}
    </div>
  );
}

// ─── One applicant ────────────────────────────────────────────────────────────

function ApplicantRow({
  applicant, onDecide, busy,
}: {
  applicant: ApplicantSummary;
  onDecide: (a: ApplicantSummary, d: ApplicationDecision) => void;
  busy: boolean;
}) {
  const a = applicant;
  const when = a.submittedAt ?? a.appliedAt;

  const facts: [string, string][] = [
    ['Score', a.overallScore !== undefined ? a.overallScore.toFixed(1) : '—'],
    ['Pacing', a.pacingLevel ?? '—'],
    ['Driver / passenger', a.driverOrPassenger ?? '—'],
    ['Age', a.ageRange ?? '—'],
    ['Experience', a.experienceLevel ?? '—'],
  ];

  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>

        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>{a.displayName}</span>
            <StatusPill status={a.applicationStatus} />
          </div>
          <a href={`mailto:${a.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: MUTED, marginTop: '4px', textDecoration: 'none' }}>
            <Mail size={12} /> {a.email}
          </a>
          {when && (
            <p style={{ fontSize: '11px', color: MUTED, margin: '4px 0 0' }}>
              {a.submittedAt ? 'Submitted' : 'Started'} {new Date(when).toLocaleDateString()}
            </p>
          )}
          {a.assignedCoachName && (
            <p style={{ fontSize: '11px', color: BODY, margin: '4px 0 0' }}>
              Coach: <strong>{a.assignedCoachName}</strong>{a.tier ? ` · ${a.tier}` : ''}
            </p>
          )}
          {a.decisionNote && (
            <p style={{ fontSize: '12px', color: BODY, margin: '8px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>
              &ldquo;{a.decisionNote}&rdquo;{a.decidedByName ? ` — ${a.decidedByName}` : ''}
            </p>
          )}
        </div>

        {/* The headline numbers, so triage does not need a second screen */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexWrap: 'wrap', gap: '14px 22px', alignSelf: 'center' }}>
          {a.hasProfile ? facts.map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED, margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>{value}</p>
            </div>
          )) : (
            <p style={{ fontSize: '12px', color: MUTED, margin: 0, fontStyle: 'italic' }}>
              Questionnaire not submitted yet — nothing to read.
            </p>
          )}
        </div>

        {/* Actions. Approve is available on any status but 'applying': there is
            nothing to judge until the questionnaire is in. */}
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', alignSelf: 'center' }}>
          {a.applicationStatus !== 'applying' && (
            <>
              {a.applicationStatus !== 'approved' && (
                <ActionButton label="Approve" icon={Check} colour={GREEN} busy={busy} onClick={() => onDecide(a, 'approve')} />
              )}
              {a.applicationStatus !== 'waitlisted' && (
                <ActionButton label="Waitlist" icon={Clock} colour={AMBER} busy={busy} onClick={() => onDecide(a, 'waitlist')} />
              )}
              {a.applicationStatus !== 'declined' && (
                <ActionButton label="Decline" icon={PauseCircle} colour={RED} busy={busy} onClick={() => onDecide(a, 'decline')} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label, icon: Icon, colour, busy, onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  colour: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', borderRadius: '9px',
        border: `1px solid ${colour}44`, background: `${colour}18`, color: colour,
        fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
        cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1,
      }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function StatusPill({ status }: { status: ApplicationStatus }) {
  const colour =
    status === 'approved' ? GREEN
    : status === 'waitlisted' ? AMBER
    : status === 'declined' ? RED
    : status === 'submitted' ? BLUE
    : MUTED;
  const label = TABS.find(t => t.key === status)?.label ?? status;

  return (
    <span style={{
      fontSize: '10px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
      color: colour, background: `${colour}1f`, border: `1px solid ${colour}44`,
      borderRadius: '99px', padding: '3px 9px',
    }}>
      {label}
    </span>
  );
}

// ─── Approve dialog ───────────────────────────────────────────────────────────

function ApproveDialog({
  pending, coaches, saving, onChange, onCancel, onConfirm,
}: {
  pending: PendingDecision;
  coaches: Coach[];
  saving: boolean;
  onChange: (p: PendingDecision) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,6,18,0.78)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ ...card, background: 'linear-gradient(135deg, #041e3a 0%, #082d52 100%)', padding: '26px', maxWidth: '440px', width: '100%' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#fff', margin: 0 }}>
            Approve {pending.applicant.displayName}
          </h2>
          <button onClick={onCancel} aria-label="Cancel" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 0, display: 'flex' }}>
            <X size={17} />
          </button>
        </div>
        <p style={{ fontSize: '12px', color: MUTED, margin: '0 0 20px', lineHeight: 1.6 }}>
          Their account opens, their questionnaire becomes their baseline, and they get the
          email with the booking link.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <span style={labelStyle}>Track</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['automated', 'custom'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...pending, tier: t })}
                style={{
                  flex: 1, padding: '10px', borderRadius: '9px',
                  border: pending.tier === t ? `1px solid ${BLUE}` : '1px solid rgba(55,181,255,0.2)',
                  background: pending.tier === t ? 'rgba(55,181,255,0.15)' : 'rgba(4,20,45,0.9)',
                  color: pending.tier === t ? '#fff' : MUTED,
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="coach" style={labelStyle}>
            Coach {pending.tier === 'custom' ? '(required)' : '(optional)'}
          </label>
          <select
            id="coach"
            value={pending.coachId}
            onChange={e => onChange({ ...pending, coachId: e.target.value })}
            style={inputStyle}
          >
            <option value="">— none —</option>
            {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label htmlFor="note" style={labelStyle}>Note (private, for your own record)</label>
          <textarea
            id="note"
            value={pending.note}
            onChange={e => onChange({ ...pending, note: e.target.value })}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '9px' }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ flex: 1, padding: '12px', borderRadius: '9px', border: '1px solid rgba(200,230,255,0.22)', background: 'transparent', color: BODY, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', borderRadius: '9px', border: 'none',
              background: saving ? 'rgba(34,197,94,0.3)' : `linear-gradient(135deg, ${GREEN}, #16a34a)`,
              color: saving ? 'rgba(255,255,255,0.6)' : '#00220e',
              fontSize: '12px', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Approving…' : 'Approve and send'}
          </button>
        </div>
      </div>
    </div>
  );
}
