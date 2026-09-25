'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, BadgeDollarSign, CheckCircle2, Inbox, Mail, RotateCcw, Search } from 'lucide-react';
import { AdminRoute } from '@/components/auth/protected-route';
import { auth } from '@/lib/firebase/config';
import type { FoundingSignup, FoundingSignupStatus } from '@/types/founding';
import { toast } from 'sonner';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const MUTED = 'rgba(200,230,255,0.55)';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

/**
 * Admin — founding-member sign-ups.
 *
 * Every submission from /founding lands here as awaiting_payment. Michael
 * matches the goalie's name in the e-transfer message to a row and clicks
 * Mark Paid — reconciliation is manual by design (no card processing on the
 * platform). Marking paid records the moment; opening the member's account
 * stays on the invitation flow.
 */
export default function AdminFoundingPage() {
  return <AdminRoute><FoundingContent /></AdminRoute>;
}

async function authedFetch(url: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });
}

const TABS: { key: FoundingSignupStatus; label: string }[] = [
  { key: 'awaiting_payment', label: 'Awaiting Payment' },
  { key: 'paid', label: 'Paid' },
  { key: 'archived', label: 'Archived' },
];

function FoundingContent() {
  const [signups, setSignups] = useState<FoundingSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FoundingSignupStatus>('awaiting_payment');
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch('/api/admin/founding');
      const data = (await res.json()) as { success: boolean; signups?: FoundingSignup[]; error?: string };
      if (!data.success) throw new Error(data.error || 'Failed to load');
      setSignups(data.signups ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load sign-ups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: 'mark_paid' | 'mark_unpaid' | 'archive', doneMessage: string) {
    setActingId(id);
    try {
      const res = await authedFetch(`/api/admin/founding/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!data.success) throw new Error(data.error || 'Update failed');
      toast.success(doneMessage);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActingId(null);
    }
  }

  const query = search.trim().toLowerCase();
  const visible = signups
    .filter(s => s.status === tab)
    .filter(s =>
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.goalieName.toLowerCase().includes(query)
    );

  const counts = TABS.map(t => signups.filter(s => s.status === t.key).length);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <BadgeDollarSign size={22} style={{ color: BLUE }} />
        <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Founding Members</h1>
      </div>
      <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 20px', lineHeight: 1.6, maxWidth: '640px' }}>
        Sign-ups from the founding-member form. Match the goalie&apos;s name in the e-transfer message to a row, then mark it paid.
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
              letterSpacing: '.05em',
              cursor: 'pointer',
            }}
          >
            {t.label} ({counts[i]})
          </button>
        ))}
        <div style={{ position: 'relative', marginLeft: 'auto', minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, goalie…"
            style={{
              width: '100%', padding: '9px 12px 9px 34px', background: 'rgba(4,20,45,0.85)',
              border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', color: '#fff',
              fontSize: '13px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ ...card, padding: '40px', textAlign: 'center', color: MUTED, fontSize: '14px' }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
          <Inbox size={28} style={{ color: MUTED, margin: '0 auto 10px' }} />
          <p style={{ color: MUTED, fontSize: '14px', margin: 0 }}>
            {query ? 'Nothing matches that search.' : tab === 'awaiting_payment' ? 'No sign-ups waiting on payment.' : tab === 'paid' ? 'No one marked paid yet.' : 'Nothing archived.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visible.map(s => (
            <div key={s.id} style={{ ...card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>{s.name}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
                      padding: '3px 10px', borderRadius: '99px',
                      color: s.status === 'paid' ? GREEN : s.status === 'archived' ? MUTED : AMBER,
                      border: `1px solid ${s.status === 'paid' ? GREEN : s.status === 'archived' ? 'rgba(200,230,255,0.3)' : AMBER}55`,
                      background: s.status === 'paid' ? 'rgba(34,197,94,0.1)' : s.status === 'archived' ? 'rgba(200,230,255,0.06)' : 'rgba(251,191,36,0.1)',
                    }}>
                      {s.status === 'paid' ? 'Paid' : s.status === 'archived' ? 'Archived' : 'Awaiting payment'}
                    </span>
                    {!s.confirmationEmailSent && s.status === 'awaiting_payment' && (
                      <span title="The payment-instructions email did not reach them — follow up by hand." style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontSize: '10px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                        padding: '3px 10px', borderRadius: '99px', color: '#f87171',
                        border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.08)',
                      }}>
                        <Mail size={11} /> Email failed
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: BLUE2, margin: '0 0 4px', fontWeight: 600 }}>
                    Goalie: {s.goalieName}
                  </p>
                  <p style={{ fontSize: '12.5px', color: MUTED, margin: 0, lineHeight: 1.6, wordBreak: 'break-word' }}>
                    <a href={`mailto:${s.email}`} style={{ color: MUTED }}>{s.email}</a>
                    {s.phone ? ` · ${s.phone}` : ''}
                    {' · '}
                    {new Date(s.createdAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {s.status === 'paid' && s.paidAt ? ` · paid ${new Date(s.paidAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}
                  </p>
                  {s.note && (
                    <p style={{ fontSize: '12.5px', color: 'rgba(200,230,255,0.7)', margin: '8px 0 0', lineHeight: 1.6, whiteSpace: 'pre-wrap', borderLeft: `2px solid rgba(55,181,255,0.3)`, paddingLeft: '10px' }}>
                      {s.note}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {s.status === 'awaiting_payment' && (
                    <>
                      <button
                        onClick={() => act(s.id, 'mark_paid', `${s.goalieName} marked paid`)}
                        disabled={actingId === s.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                          borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${GREEN}, #16a34a)`,
                          color: '#fff', fontSize: '12px', fontWeight: 800, cursor: actingId === s.id ? 'wait' : 'pointer',
                          opacity: actingId === s.id ? 0.6 : 1,
                        }}
                      >
                        <CheckCircle2 size={14} /> Mark Paid
                      </button>
                      <button
                        onClick={() => act(s.id, 'archive', 'Sign-up archived')}
                        disabled={actingId === s.id}
                        title="Junk or duplicate — hides it from the working list"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px',
                          borderRadius: '10px', border: '1px solid rgba(200,230,255,0.25)', background: 'transparent',
                          color: MUTED, fontSize: '12px', fontWeight: 700, cursor: actingId === s.id ? 'wait' : 'pointer',
                          opacity: actingId === s.id ? 0.6 : 1,
                        }}
                      >
                        <Archive size={14} /> Archive
                      </button>
                    </>
                  )}
                  {s.status === 'paid' && (
                    <button
                      onClick={() => act(s.id, 'mark_unpaid', 'Moved back to awaiting payment')}
                      disabled={actingId === s.id}
                      title="Undo — moves the row back to Awaiting Payment"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px',
                        borderRadius: '10px', border: '1px solid rgba(200,230,255,0.25)', background: 'transparent',
                        color: MUTED, fontSize: '12px', fontWeight: 700, cursor: actingId === s.id ? 'wait' : 'pointer',
                        opacity: actingId === s.id ? 0.6 : 1,
                      }}
                    >
                      <RotateCcw size={14} /> Undo Paid
                    </button>
                  )}
                  {s.status === 'archived' && (
                    <button
                      onClick={() => act(s.id, 'mark_unpaid', 'Restored to awaiting payment')}
                      disabled={actingId === s.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px',
                        borderRadius: '10px', border: '1px solid rgba(200,230,255,0.25)', background: 'transparent',
                        color: MUTED, fontSize: '12px', fontWeight: 700, cursor: actingId === s.id ? 'wait' : 'pointer',
                        opacity: actingId === s.id ? 0.6 : 1,
                      }}
                    >
                      <RotateCcw size={14} /> Restore
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
