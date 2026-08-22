'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { formTemplateService } from '@/lib/database/services/form-template.service';
import { initializeDefaultTemplates, checkDefaultTemplatesExist } from '@/lib/templates/init-templates';
import { FormTemplate, PILLARS, pillarOptionLabel } from '@/types';
import { Loader2, Plus, CheckCircle2, AlertCircle, RefreshCw, Pencil, Archive, ArchiveRestore, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const BLUE = '#37b5ff';
const RED = '#f87171';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

/** Which destructive action is awaiting confirmation, and on which template. */
type PendingAction = { templateId: string; kind: 'archive' | 'restore' | 'delete' };

export default function FormTemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [templatesExist, setTemplatesExist] = useState({ hockeyGoalie: false });
  /** The archive is a separate view rather than a filter, so a live list is never mixed with retired ones. */
  const [showArchived, setShowArchived] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { loadTemplates(); }, [showArchived]);
  useEffect(() => { checkTemplates(); }, []);

  // Group by pillar so concurrently-active templates read as expected, not like a bug.
  const pillarGroups = useMemo(() => {
    const order: { key: string; label: string }[] = [
      { key: 'combined', label: 'Combined (All Pillars)' },
      ...PILLARS.map(p => ({ key: p.slug as string, label: pillarOptionLabel(p) })),
    ];
    const groups = order
      .map(({ key, label }) => ({ key, label, items: templates.filter(t => t.pillar === key) }))
      .filter(g => g.items.length > 0);
    // Legacy docs written before `pillar` existed have no value to group by.
    const ungrouped = templates.filter(t => !order.some(o => o.key === t.pillar));
    if (ungrouped.length > 0) groups.push({ key: '_unassigned', label: 'No Pillar Assigned', items: ungrouped });
    return groups;
  }, [templates]);

  const loadTemplates = async () => {
    setLoading(true);
    setPending(null);
    try {
      const result = await formTemplateService.getTemplates({ isArchived: showArchived, orderBy: 'updatedAt', orderDirection: 'desc' });
      if (result.success && result.data) setTemplates(result.data);
      else toast.error('Failed to load templates');
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error loading templates');
    } finally {
      setLoading(false);
    }
  };

  const checkTemplates = async () => {
    const exists = await checkDefaultTemplatesExist();
    setTemplatesExist(exists);
  };

  const handleInitializeTemplates = async () => {
    if (!user) { toast.error('You must be logged in'); return; }
    setInitializing(true);
    try {
      const result = await initializeDefaultTemplates(user.id);
      if (result.success) {
        toast.success(result.message);
        await loadTemplates();
        await checkTemplates();
      } else {
        toast.error(result.message);
        if (result.errors && result.errors.length > 0) result.errors.forEach(e => toast.error(e));
      }
    } catch (error) {
      console.error('Error initializing templates:', error);
      toast.error('Failed to initialize templates');
    } finally {
      setInitializing(false);
    }
  };

  const handleActivateTemplate = async (templateId: string) => {
    try {
      const result = await formTemplateService.activateTemplate(templateId);
      if (result.success) {
        toast.success('Template activated successfully');
        await loadTemplates();
      } else {
        toast.error(result.message || 'Failed to activate template');
      }
    } catch (error) {
      console.error('Error activating template:', error);
      toast.error('Error activating template');
    }
  };

  /**
   * Runs the confirmed archive / restore / delete.
   *
   * Archiving is the reversible one and is what the UI steers towards: the
   * template stops being offered for new entries but every entry recorded
   * against it keeps resolving. Deleting removes the document outright, which is
   * why the service refuses it once anything has been filled in — the entries
   * would survive pointing at a template that no longer exists.
   */
  const runPendingAction = async (template: FormTemplate, kind: PendingAction['kind']) => {
    setPending(null);
    setBusyId(template.id);
    try {
      const result =
        kind === 'archive' ? await formTemplateService.archiveTemplate(template.id)
        : kind === 'restore' ? await formTemplateService.restoreTemplate(template.id)
        : await formTemplateService.deleteTemplate(template.id);

      if (result.success) {
        toast.success(
          kind === 'archive' ? `"${template.name}" archived`
          : kind === 'restore' ? `"${template.name}" restored — activate it when you are ready`
          : `"${template.name}" deleted`
        );
        await loadTemplates();
      } else {
        toast.error(result.message || `Failed to ${kind} template`);
      }
    } catch (error) {
      console.error(`Error running ${kind} on template:`, error);
      toast.error(`Error trying to ${kind} template`);
    } finally {
      setBusyId(null);
    }
  };

  /** What each confirmation strip says, so the consequence is stated before the click. */
  const confirmCopy = (template: FormTemplate, kind: PendingAction['kind']) => {
    const entries = template.usageCount || 0;
    if (kind === 'archive') {
      return `Archive "${template.name}"? It stops being offered for new check-ins. ${entries > 0 ? `The ${entries} ${entries === 1 ? 'entry' : 'entries'} already recorded against it are kept and still chart normally.` : 'Nothing has been recorded against it yet.'} You can restore it later.`;
    }
    if (kind === 'restore') {
      return `Restore "${template.name}"? It returns to the live list as inactive — activate it when you want it used.`;
    }
    return `Permanently delete "${template.name}"? This removes the template itself and cannot be undone. Archive it instead if you may want it back.`;
  };

  const emptyStateCopy = showArchived
    ? { title: 'Nothing Archived', body: 'Templates you archive will be kept here, and can be restored at any time.' }
    : { title: 'No Templates Found', body: 'Initialize default templates to get started' };

  const tabStyle = (selected: boolean) => ({
    padding: '8px 16px',
    borderRadius: '9px',
    border: `1px solid ${selected ? 'rgba(55,181,255,0.35)' : 'rgba(255,255,255,0.1)'}`,
    background: selected ? 'rgba(55,181,255,0.12)' : 'transparent',
    color: selected ? BLUE : 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  }) as const;

  return (
    <>
      <style>{`
        .ft-btn:hover { opacity: 0.85 !important; }
        .ft-card:hover { border-color: rgba(55,181,255,0.25) !important; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>Form Templates</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Manage dynamic form templates for charting sessions</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={loadTemplates} disabled={loading} className="ft-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <Link href="/admin/form-templates/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, color: '#fff', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
              <Plus size={14} /> Create Template
            </Link>
          </div>
        </div>

        {/* Live / archived switch */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowArchived(false)} style={tabStyle(!showArchived)}>Live Templates</button>
          <button onClick={() => setShowArchived(true)} style={tabStyle(showArchived)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Archive size={13} /> Archived</span>
          </button>
        </div>

        {/* Initialize alert */}
        {!showArchived && !templatesExist.hockeyGoalie && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '14px', padding: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertCircle size={18} color={RED} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Initialize Default Templates</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>No default templates found. Click to create the default Hockey Goalie Performance Tracker template.</p>
              </div>
            </div>
            <button onClick={handleInitializeTemplates} disabled={initializing} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: initializing ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: initializing ? 0.7 : 1 }}>
              {initializing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Initializing…</> : <><Plus size={14} /> Initialize Templates</>}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px' }}>
            <Loader2 size={32} color={BLUE} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : templates.length === 0 ? (
          <div style={{ position: 'relative', ...card, padding: '64px', textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {showArchived ? <Archive size={26} color="rgba(55,181,255,0.4)" /> : <Plus size={28} color="rgba(55,181,255,0.4)" />}
            </div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>{emptyStateCopy.title}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '20px' }}>{emptyStateCopy.body}</p>
            {!showArchived && (
              <button onClick={handleInitializeTemplates} disabled={initializing} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: initializing ? 'not-allowed' : 'pointer', opacity: initializing ? 0.7 : 1 }}>
                {initializing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Initializing…</> : <><Plus size={14} /> Initialize Default Templates</>}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {pillarGroups.map((group) => (
              <div key={group.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '17px' }}>{group.label}</h2>
                  <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', padding: '1px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                    {group.items.length}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {group.items.map((template) => {
              const entries = template.usageCount || 0;
              // The service refuses to delete a template that holds entries, since
              // those entries would outlive it. Say so on the button rather than
              // letting the click fail.
              const canDelete = entries === 0;
              const isBusy = busyId === template.id;
              const pendingHere = pending?.templateId === template.id ? pending.kind : null;

              return (
              <div key={template.id} className="ft-card" style={{ position: 'relative', ...card, padding: '20px', overflow: 'hidden', transition: 'border-color 0.2s', opacity: isBusy ? 0.55 : 1 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${template.isActive ? GREEN : BLUE}66, transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>{template.name}</p>
                    {template.description && <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>{template.description}</p>}
                  </div>
                  {template.isArchived ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(251,191,36,0.12)', color: AMBER, padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, flexShrink: 0, marginLeft: '8px' }}>
                      <Archive size={11} /> Archived
                    </span>
                  ) : template.isActive ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(34,197,94,0.12)', color: GREEN, padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, flexShrink: 0, marginLeft: '8px' }}>
                      <CheckCircle2 size={11} /> Active
                    </span>
                  ) : null}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { label: 'Version', value: `v${template.version}` },
                    { label: 'Sport', value: template.sport || '—' },
                    { label: 'Sections', value: String(template.sections.length) },
                    { label: 'Usage', value: `${entries} entries` },
                    { label: 'Status', value: template.isArchived ? 'Archived' : template.isActive ? 'Active' : 'Inactive' },
                    { label: 'Total Fields', value: String(template.sections.reduce((sum, s) => sum + s.fields.length, 0)) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>{label}</p>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Primary actions */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {!template.isArchived && !template.isActive && (
                    <button onClick={() => handleActivateTemplate(template.id)} disabled={isBusy} style={{ flex: '1 1 90px', padding: '8px', borderRadius: '8px', border: `1px solid rgba(34,197,94,0.3)`, background: 'rgba(34,197,94,0.08)', color: GREEN, fontSize: '13px', fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer' }}>Activate</button>
                  )}
                  {/*
                    No Edit on an archived template. Saving an edit writes a live
                    new version, so editing from here would quietly bring the
                    template back out of the archive. Restore it first.
                  */}
                  {!template.isArchived && (
                    <Link href={`/admin/form-templates/${template.id}/edit`} style={{ flex: '1 1 90px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(55,181,255,0.3)', background: 'rgba(55,181,255,0.12)', color: BLUE, fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                      <Pencil size={12} /> Edit
                    </Link>
                  )}
                  <Link href={`/admin/form-templates/${template.id}`} style={{ flex: '1 1 90px', display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px', border: '1px solid rgba(55,181,255,0.2)', background: 'rgba(55,181,255,0.07)', color: BLUE, fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>View Details</Link>
                </div>

                {/* Archive / restore / delete */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {template.isArchived ? (
                    <button onClick={() => setPending({ templateId: template.id, kind: 'restore' })} disabled={isBusy} style={{ flex: '1 1 120px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.28)', background: 'rgba(34,197,94,0.07)', color: GREEN, fontSize: '13px', fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
                      <ArchiveRestore size={12} /> Restore
                    </button>
                  ) : (
                    <button onClick={() => setPending({ templateId: template.id, kind: 'archive' })} disabled={isBusy} style={{ flex: '1 1 120px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.28)', background: 'rgba(251,191,36,0.07)', color: AMBER, fontSize: '13px', fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer' }}>
                      <Archive size={12} /> Archive
                    </button>
                  )}
                  <button
                    onClick={() => setPending({ templateId: template.id, kind: 'delete' })}
                    disabled={!canDelete || isBusy}
                    title={canDelete ? 'Permanently delete this template' : `${entries} ${entries === 1 ? 'entry has' : 'entries have'} been recorded against this template — archive it instead`}
                    style={{ flex: '1 1 120px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', border: `1px solid rgba(248,113,113,${canDelete ? 0.28 : 0.1})`, background: `rgba(248,113,113,${canDelete ? 0.07 : 0.03})`, color: canDelete ? RED : 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: 700, cursor: canDelete && !isBusy ? 'pointer' : 'not-allowed' }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>

                {!canDelete && !template.isArchived && (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', lineHeight: 1.5, marginBottom: '12px' }}>
                    Delete is off because {entries} {entries === 1 ? 'entry has' : 'entries have'} been recorded against this template. Archiving keeps that history intact.
                  </p>
                )}

                {/* Inline confirmation — states the consequence before the action runs */}
                {pendingHere && (
                  <div style={{ marginBottom: '12px', padding: '14px 16px', borderRadius: '10px', background: pendingHere === 'delete' ? 'rgba(248,113,113,0.07)' : 'rgba(251,191,36,0.07)', border: `1px solid ${pendingHere === 'delete' ? 'rgba(248,113,113,0.25)' : 'rgba(251,191,36,0.25)'}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <AlertTriangle size={15} color={pendingHere === 'delete' ? RED : AMBER} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: 1.55 }}>{confirmCopy(template, pendingHere)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setPending(null)} style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={() => runPendingAction(template, pendingHere)} style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', background: pendingHere === 'delete' ? `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)` : pendingHere === 'restore' ? `linear-gradient(135deg, ${GREEN} 0%, #16a34a 100%)` : `linear-gradient(135deg, ${AMBER} 0%, #d97706 100%)`, color: pendingHere === 'archive' ? '#1a1405' : '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {pendingHere === 'delete' ? <><Trash2 size={12} /> Delete</> : pendingHere === 'restore' ? <><ArchiveRestore size={12} /> Restore</> : <><Archive size={12} /> Archive</>}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>Created: {template.createdAt?.toDate?.().toLocaleDateString() || 'Unknown'}</p>
                  {template.updatedAt && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>Updated: {template.updatedAt?.toDate?.().toLocaleDateString() || 'Unknown'}</p>}
                </div>
              </div>
              );
            })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
