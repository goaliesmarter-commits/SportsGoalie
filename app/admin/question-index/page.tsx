'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Inbox, Library, Plus, Search, Trash2, X } from 'lucide-react';
import { AdminRoute } from '@/components/auth/protected-route';
import { auth } from '@/lib/firebase/config';
import type { QAEntry, QASubmission } from '@/types/qa';
import { toast } from 'sonner';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const RED = '#f87171';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

/**
 * Admin — the question index.
 *
 * Two tabs. Library: every stored answer, add/edit/publish/delete. Queue:
 * visitor questions nothing matched; answering one emails the visitor and
 * publishes the reply into the library in the same action.
 */
export default function AdminQuestionIndexPage() {
  return <AdminRoute><QuestionIndexContent /></AdminRoute>;
}

async function authedFetch(url: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });
}

function QuestionIndexContent() {
  const [tab, setTab] = useState<'library' | 'queue'>('library');
  const [entries, setEntries] = useState<QAEntry[]>([]);

  // The "new question" notification email links here with ?tab=queue. Read it
  // from window rather than useSearchParams so the page needs no Suspense boundary.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'queue') setTab('queue');
  }, []);
  const [submissions, setSubmissions] = useState<QASubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, submissionsRes] = await Promise.all([
        authedFetch('/api/admin/qa/entries'),
        authedFetch('/api/admin/qa/submissions'),
      ]);
      const entriesData = await entriesRes.json();
      const submissionsData = await submissionsRes.json();
      if (entriesData.success) setEntries(entriesData.entries);
      else toast.error(entriesData.error || 'Failed to load the answer library');
      if (submissionsData.success) setSubmissions(submissionsData.submissions);
      else toast.error(submissionsData.error || 'Failed to load the question queue');
    } catch {
      toast.error('Failed to load the question index');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const newCount = submissions.filter(s => s.status === 'new').length;
  const publishedCount = entries.filter(e => e.status === 'published').length;

  return (
    <>
      <style>{`
        .qi-inp { background: rgba(2,18,44,0.7); border: 1px solid rgba(55,181,255,0.18); color: #fff; border-radius: 10px; padding: 10px 12px; width: 100%; font-size: 13px; outline: none; font-family: inherit; box-sizing: border-box; }
        .qi-inp:focus { border-color: rgba(55,181,255,0.45); }
        .qi-inp::placeholder { color: rgba(255,255,255,0.25); }
        .qi-row:hover { background: rgba(55,181,255,0.04); }
        .qi-btn { transition: opacity .15s; } .qi-btn:hover { opacity: .85; }
        .qi-tab { transition: all .2s; cursor: pointer; }
      `}</style>

      <div style={{ maxWidth: '980px' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Question Index</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0 }}>
            The public question box serves these answers word for word — it never writes its own.
            {publishedCount > 0 && <> {publishedCount} published answer{publishedCount === 1 ? '' : 's'}.</>}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {([
            { id: 'library' as const, label: 'Answer Library', icon: Library, badge: 0 },
            { id: 'queue' as const, label: 'Question Queue', icon: Inbox, badge: newCount },
          ]).map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)} className="qi-tab"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, border: tab === id ? '1px solid rgba(55,181,255,0.4)' : '1px solid rgba(55,181,255,0.12)', background: tab === id ? 'rgba(55,181,255,0.15)' : 'transparent', color: tab === id ? BLUE : 'rgba(255,255,255,0.5)' }}>
              <Icon size={15} />
              {label}
              {badge > 0 && (
                <span style={{ background: RED, color: '#fff', borderRadius: '99px', fontSize: '11px', fontWeight: 800, padding: '1px 7px' }}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ ...card, padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Loading…</div>
        ) : tab === 'library' ? (
          <LibraryTab entries={entries} reload={load} />
        ) : (
          <QueueTab submissions={submissions} reload={load} />
        )}
      </div>
    </>
  );
}

/* ── Library ── */

function LibraryTab({ entries, reload }: { entries: QAEntry[]; reload: () => void }) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = entries.filter(e => {
    const s = search.toLowerCase();
    return !s || e.question.toLowerCase().includes(s) || e.answer.toLowerCase().includes(s);
  });

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input className="qi-inp" style={{ paddingLeft: '36px' }} placeholder="Search questions and answers…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setAdding(a => !a)} className="qi-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: adding ? 'rgba(55,181,255,0.15)' : BLUE, color: adding ? BLUE : '#fff', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          {adding ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add answer</>}
        </button>
      </div>

      {adding && <EntryForm onDone={() => { setAdding(false); reload(); }} />}

      {filtered.length === 0 ? (
        <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>
            {entries.length === 0
              ? 'No answers yet. Add the first one — the public box has nothing to serve until you do.'
              : 'Nothing matches that search.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(entry => <EntryRow key={entry.id} entry={entry} reload={reload} />)}
        </div>
      )}
    </>
  );
}

function EntryForm({ entry, onDone }: { entry?: QAEntry; onDone: () => void }) {
  const [question, setQuestion] = useState(entry?.question ?? '');
  const [answer, setAnswer] = useState(entry?.answer ?? '');
  const [saving, setSaving] = useState(false);

  async function save(status: 'published' | 'draft') {
    if (question.trim().length < 3) { toast.error('Write the question first'); return; }
    if (answer.trim().length < 1) { toast.error('Write the answer first'); return; }
    setSaving(true);
    try {
      const res = entry
        ? await authedFetch(`/api/admin/qa/entries/${entry.id}`, { method: 'PATCH', body: JSON.stringify({ question: question.trim(), answer: answer.trim(), status }) })
        : await authedFetch('/api/admin/qa/entries', { method: 'POST', body: JSON.stringify({ question: question.trim(), answer: answer.trim(), status }) });
      const data = await res.json();
      if (data.success) { toast.success(status === 'published' ? 'Published' : 'Saved as draft'); onDone(); }
      else toast.error(data.error || 'Failed to save');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ ...card, padding: '16px', marginBottom: '14px', border: '1px solid rgba(55,181,255,0.3)' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BLUE2, marginBottom: '6px' }}>Question — as you&apos;d write it</label>
      <input className="qi-inp" style={{ marginBottom: '12px' }} value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. How much does Smarter Goalie cost?" maxLength={500} />
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BLUE2, marginBottom: '6px' }}>Answer — served word for word</label>
      <textarea className="qi-inp" style={{ minHeight: '120px', resize: 'vertical', marginBottom: '12px' }} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Exactly what the visitor should read." maxLength={10000} />
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => save('published')} disabled={saving} className="qi-btn" style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Publish'}
        </button>
        <button onClick={() => save('draft')} disabled={saving} className="qi-btn" style={{ background: 'transparent', color: AMBER, border: `1px solid rgba(251,191,36,0.4)`, borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          Save as draft
        </button>
      </div>
    </div>
  );
}

function EntryRow({ entry, reload }: { entry: QAEntry; reload: () => void }) {
  const [openRow, setOpenRow] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function remove() {
    setConfirmDelete(false);
    try {
      const res = await authedFetch(`/api/admin/qa/entries/${entry.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success('Entry deleted'); reload(); }
      else toast.error(data.error || 'Failed to delete');
    } catch { toast.error('Failed to delete'); }
  }

  async function toggleStatus() {
    const next = entry.status === 'published' ? 'draft' : 'published';
    try {
      const res = await authedFetch(`/api/admin/qa/entries/${entry.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      const data = await res.json();
      if (data.success) { toast.success(next === 'published' ? 'Published' : 'Unpublished — now a draft'); reload(); }
      else toast.error(data.error || 'Failed to update');
    } catch { toast.error('Failed to update'); }
  }

  const published = entry.status === 'published';

  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      <button onClick={() => setOpenRow(o => !o)} className="qi-row"
        style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', borderRadius: '99px', padding: '3px 10px', background: published ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)', color: published ? GREEN : AMBER }}>
          {published ? 'Live' : 'Draft'}
        </span>
        <span style={{ flex: 1, color: '#fff', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.question}</span>
        <span style={{ flexShrink: 0, color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
          {entry.timesServed > 0 && `served ${entry.timesServed}×`}
        </span>
        {openRow ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />}
      </button>

      {openRow && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(55,181,255,0.1)' }}>
          <div style={{ paddingTop: '14px' }}>
            <EntryForm entry={entry} onDone={() => { setOpenRow(false); reload(); }} />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={toggleStatus} className="qi-btn" style={{ background: 'transparent', color: BLUE2, border: '1px solid rgba(55,181,255,0.3)', borderRadius: '10px', padding: '9px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                {published ? 'Unpublish' : 'Publish now'}
              </button>
              {confirmDelete ? (
                <>
                  <span style={{ color: RED, fontSize: '12px', fontWeight: 600 }}>Delete permanently?</span>
                  <button onClick={remove} className="qi-btn" style={{ background: RED, color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Yes, delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="qi-btn" style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '9px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="qi-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: RED, border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '9px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  <Trash2 size={13} /> Delete
                </button>
              )}
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                {entry.source === 'visitor-question' ? 'From a visitor question · ' : ''}updated {new Date(entry.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Queue ── */

function QueueTab({ submissions, reload }: { submissions: QASubmission[]; reload: () => void }) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? submissions : submissions.filter(s => s.status === 'new');

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0, flex: 1 }}>
          Questions the box couldn&apos;t answer. Your reply is emailed to the visitor and published into the library in one step.
        </p>
        <button onClick={() => setShowAll(a => !a)} className="qi-btn"
          style={{ background: 'transparent', color: BLUE2, border: '1px solid rgba(55,181,255,0.25)', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {showAll ? 'Show waiting only' : 'Show all'}
        </button>
      </div>

      {visible.length === 0 ? (
        <div style={{ ...card, padding: '40px', textAlign: 'center' }}>
          <CheckCircle2 size={22} style={{ color: GREEN, marginBottom: '8px' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>
            {showAll ? 'No questions have come in yet.' : 'Nothing waiting — every question has been handled.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {visible.map(submission => <SubmissionRow key={submission.id} submission={submission} reload={reload} />)}
        </div>
      )}
    </>
  );
}

function SubmissionRow({ submission, reload }: { submission: QASubmission; reload: () => void }) {
  const [openRow, setOpenRow] = useState(false);
  const [question, setQuestion] = useState(submission.question);
  const [answer, setAnswer] = useState('');
  const [working, setWorking] = useState(false);

  const isNew = submission.status === 'new';

  async function publishAnswer() {
    if (answer.trim().length < 1) { toast.error('Write the answer first'); return; }
    setWorking(true);
    try {
      const res = await authedFetch(`/api/admin/qa/submissions/${submission.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'answer', question: question.trim(), answer: answer.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.emailSent) toast.success('Published and emailed to the visitor');
        else toast.warning('Published to the library, but the email to the visitor failed — you may want to reply by hand');
        reload();
      } else toast.error(data.error || 'Failed to publish');
    } catch { toast.error('Failed to publish'); }
    finally { setWorking(false); }
  }

  async function dismiss() {
    setWorking(true);
    try {
      const res = await authedFetch(`/api/admin/qa/submissions/${submission.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'dismiss' }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Dismissed'); reload(); }
      else toast.error(data.error || 'Failed to dismiss');
    } catch { toast.error('Failed to dismiss'); }
    finally { setWorking(false); }
  }

  const statusPill = {
    new: { label: 'Waiting', bg: 'rgba(248,113,113,0.12)', color: RED },
    answered: { label: 'Answered', bg: 'rgba(34,197,94,0.12)', color: GREEN },
    dismissed: { label: 'Dismissed', bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' },
  }[submission.status];

  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      <button onClick={() => setOpenRow(o => !o)} className="qi-row"
        style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', borderRadius: '99px', padding: '3px 10px', background: statusPill.bg, color: statusPill.color }}>
          {statusPill.label}
        </span>
        <span style={{ flex: 1, color: '#fff', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{submission.question}</span>
        <span style={{ flexShrink: 0, color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
          {new Date(submission.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
        {openRow ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />}
      </button>

      {openRow && (
        <div style={{ padding: '14px 16px 16px', borderTop: '1px solid rgba(55,181,255,0.1)' }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '0 0 12px' }}>
            From <span style={{ color: BLUE2 }}>{submission.email}</span>
          </p>

          {isNew ? (
            <>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BLUE2, marginBottom: '6px' }}>
                Question for the library — reword it if you want
              </label>
              <input className="qi-inp" style={{ marginBottom: '12px' }} value={question} onChange={e => setQuestion(e.target.value)} maxLength={500} />
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: BLUE2, marginBottom: '6px' }}>
                Your answer — emailed to them, published for everyone
              </label>
              <textarea className="qi-inp" style={{ minHeight: '120px', resize: 'vertical', marginBottom: '12px' }} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write it once — the visitor gets it by email, and the library serves it from then on." maxLength={10000} />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={publishAnswer} disabled={working} className="qi-btn" style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  {working ? 'Working…' : 'Publish & email visitor'}
                </button>
                <button onClick={dismiss} disabled={working} className="qi-btn" style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Dismiss
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
              {submission.status === 'answered'
                ? <>Answered {submission.answeredAt ? new Date(submission.answeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} — the reply lives in the Answer Library now.</>
                : 'Dismissed without a reply.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
