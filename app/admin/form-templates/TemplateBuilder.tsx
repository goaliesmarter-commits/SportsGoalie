'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { formTemplateService, describeValidationFailure } from '@/lib/database/services/form-template.service';
import { FormTemplate, FormSection, FormField, FieldType, AnalyticsType, PillarSlug, PILLARS, pillarOptionLabel } from '@/types';
import { Loader2, Plus, Trash2, ArrowLeft, Save, AlertCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const BLUE = '#37b5ff';
const RED = '#f87171';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

/**
 * The only analytics that mean anything for a given input type.
 *
 * Enabling analytics used to save every field as `percentage`, which counts
 * yes/no answers. On a 1-10 scale nothing is ever `true`, so those fields scored
 * a permanent 0% and dragged the chart's overall score to zero however the
 * athlete rated themselves.
 */
function defaultAnalyticsType(fieldType: FieldType): AnalyticsType {
  switch (fieldType) {
    case 'yesno':
      return 'percentage';
    case 'scale':
    case 'numeric':
      return 'average';
    case 'radio':
    case 'checkbox':
      return 'distribution';
    default:
      return 'none'; // free text and dates have nothing to measure
  }
}

/**
 * IDs used to be derived from how many sections or fields were currently in the
 * list, so deleting one and adding another handed the newcomer an ID the list
 * already held. The template validator rejects duplicate IDs, which is what
 * stopped the 7AMS template saving. Count from the highest ID in use instead, so
 * an ID is never reissued within a single build.
 */
function nextId(prefix: string, existing: (string | undefined)[]): string {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);
  const highest = existing.reduce<number>((max, id) => {
    const match = id ? pattern.exec(id) : null;
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}${highest + 1}`;
}

const BLANK_SECTION: Partial<FormSection> = {
  id: 'section_1', title: '', description: '', order: 1, fields: [],
};

interface TemplateBuilderProps {
  /** `create` writes a new template; `edit` revises `template`. */
  mode: 'create' | 'edit';
  /** The template being revised. Required when `mode` is `edit`. */
  template?: FormTemplate;
}

/**
 * The template builder, shared by the create and edit screens.
 *
 * Both screens drive the same fields, the same validation and the same save
 * path — the only differences are which service call runs on save and, when
 * editing something that already holds entries, the warning about what saving
 * does to that history.
 */
export default function TemplateBuilder({ mode, template }: TemplateBuilderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isEdit = mode === 'edit' && !!template;

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [sport, setSport] = useState(template?.sport ?? 'Hockey');
  const [pillar, setPillar] = useState<PillarSlug | 'combined'>(template?.pillar ?? 'combined');
  const [sections, setSections] = useState<Partial<FormSection>[]>(
    template?.sections?.length
      ? [...template.sections].sort((a, b) => a.order - b.order)
      : [{ ...BLANK_SECTION }]
  );
  /** Validation failures from the last save attempt, keyed by their path so each shows against its own field. */
  const [saveErrors, setSaveErrors] = useState<{ path: string; message: string }[]>([]);

  /** Entries already recorded against this template. Drives what saving an edit does. */
  const entriesRecorded = template?.usageCount ?? 0;
  const isInUse = isEdit && entriesRecorded > 0;

  const addSection = () => {
    setSections(prev => [
      ...prev,
      { id: nextId('section_', prev.map(s => s.id)), title: '', description: '', order: prev.length + 1, fields: [] },
    ]);
  };

  const removeSection = (index: number) => {
    if (sections.length === 1) { toast.error('Template must have at least one section'); return; }
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, updates: Partial<FormSection>) => {
    setSections(prev => prev.map((section, i) => (i === index ? { ...section, ...updates } : section)));
  };

  /**
   * These three updaters rebuild the section they touch instead of assigning into
   * it. `[...prev]` only copies the outer array, so `n[sectionIndex].fields = ...`
   * wrote straight through to the section object React was still holding. Strict
   * Mode runs an updater twice with the same `prev` to prove it is pure, and the
   * second run saw the first run's mutation — appending the same new field twice
   * under one ID, which is the duplicate-key crash on adding a field.
   */
  const addFieldToSection = (sectionIndex: number) => {
    setSections(prev => prev.map((section, i) => {
      if (i !== sectionIndex) return section;
      const fields = section.fields || [];
      const newField = {
        id: nextId(`${section.id}_field_`, fields.map(f => f.id)), label: '', type: 'text' as FieldType,
        description: '', includeComments: false,
        validation: { required: false },
        analytics: { enabled: false, type: 'none' as const },
        order: fields.length + 1, _optionsRaw: '',
      };
      return { ...section, fields: [...fields, newField as unknown as FormField] };
    }));
  };

  const removeFieldFromSection = (sectionIndex: number, fieldIndex: number) => {
    setSections(prev => prev.map((section, i) =>
      i === sectionIndex
        ? { ...section, fields: (section.fields || []).filter((_, fi) => fi !== fieldIndex) }
        : section
    ));
  };

  const updateField = (sectionIndex: number, fieldIndex: number, updates: Partial<FormField>) => {
    setSections(prev => prev.map((section, i) =>
      i === sectionIndex
        ? {
            ...section,
            fields: (section.fields || []).map((f, fi) => (fi === fieldIndex ? { ...f, ...updates } : f)),
          }
        : section
    ));
  };

  /**
   * Changing the input type drags its validation bounds and analytics with it —
   * left behind, they describe the field it used to be.
   */
  const changeFieldType = (sectionIndex: number, fieldIndex: number, field: FormField, nextType: FieldType) => {
    const validation = { ...field.validation };
    if (nextType === 'scale') {
      // The picker promises "Scale (1-10)", so record it rather than leaning on
      // every reader to assume the same default.
      validation.min = 1;
      validation.max = 10;
    } else if (nextType !== 'numeric') {
      delete validation.min;
      delete validation.max;
    }

    updateField(sectionIndex, fieldIndex, {
      type: nextType,
      validation,
      analytics: field.analytics.enabled
        ? { ...field.analytics, type: defaultAnalyticsType(nextType) }
        : field.analytics,
    });
  };

  /** Errors raised against a whole section, rather than one of its fields. */
  const sectionErrors = (sectionIndex: number) =>
    saveErrors.filter(e => e.path.startsWith(`sections[${sectionIndex}]`) && !e.path.includes('.fields['));

  const fieldErrors = (sectionIndex: number, fieldIndex: number) =>
    saveErrors.filter(e => e.path.startsWith(`sections[${sectionIndex}].fields[${fieldIndex}]`));

  /** Errors that belong to the template itself — its name, sport, or having no sections at all. */
  const templateErrors = () => saveErrors.filter(e => !e.path.startsWith('sections['));

  const handleSave = async () => {
    if (!user) { toast.error('You must be logged in'); return; }

    // Strip the raw options text the editor keeps alongside each field, and renumber
    // so a section deleted mid-build does not leave a gap in the ordering.
    const cleanSections = sections.map((section, index) => ({
      ...section,
      order: index + 1,
      fields: section.fields?.map((field, fieldIndex) => {
        const { _optionsRaw, ...cleanField } = field as FormField & { _optionsRaw?: string };
        return { ...cleanField, order: fieldIndex + 1 };
      }) || [],
    }));

    const draft = {
      name, description, sport: sport.trim(), pillar,
      isActive: false, isArchived: false, allowPartialSubmission: true,
      sections: cleanSections as FormSection[], createdBy: user.id,
    };

    // Validate against the same rules the save itself applies, so a template that
    // cannot be stored is reported here — next to the field at fault — rather than
    // coming back from the server as an unattributed failure.
    const errors = [...formTemplateService.validateTemplate(draft as FormTemplate).errors];
    if (!draft.sport) errors.push({ path: 'sport', message: 'Sport is required' });
    cleanSections.forEach((section, index) => {
      if (section.fields.length === 0) {
        errors.push({ path: `sections[${index}].fields`, message: 'Add at least one field to this section' });
      }
    });

    if (errors.length > 0) {
      setSaveErrors(errors);
      toast.error(describeValidationFailure(errors));
      return;
    }

    setSaveErrors([]);
    setSaving(true);
    try {
      // On an edit only the edited fields are sent. Anything the builder does not
      // expose — the chart mode, who created it, whether it is active — is left
      // to carry over untouched rather than being overwritten with a default.
      const result = isEdit
        ? await formTemplateService.updateTemplate(template!.id, {
            name,
            description,
            sport: sport.trim(),
            pillar,
            sections: cleanSections as FormSection[],
            lastModifiedBy: user.id,
          })
        : await formTemplateService.createTemplate(draft);

      if (result.success && result.data) {
        // Editing a template that holds entries writes a new document, so the
        // ID that comes back is not necessarily the one that was opened.
        toast.success(result.message || (isEdit ? 'Template saved' : 'Template created successfully'));
        router.push(`/admin/form-templates/${result.data.id}`);
      } else {
        // The server validates too. If it disagrees, show its reasons in the same places.
        const details = (result.error?.details as { path: string; message: string }[] | undefined) ?? [];
        setSaveErrors(details);
        toast.error(result.message || (isEdit ? 'Failed to save template' : 'Failed to create template'));
      }
    } catch (error) {
      console.error(isEdit ? 'Error saving template:' : 'Error creating template:', error);
      toast.error(isEdit ? 'Error saving template' : 'Error creating template');
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (text: string, required?: boolean) => (
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>
      {text} {required && <span style={{ color: RED }}>*</span>}
    </p>
  );

  /** Shows why a save was refused, against the thing that caused it. */
  const Issues = ({ issues }: { issues: { path: string; message: string }[] }) => {
    if (issues.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
        {issues.map(issue => (
          <p key={issue.path} style={{ color: RED, fontSize: '13px', lineHeight: 1.45, display: 'flex', gap: '6px' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{issue.message}</span>
          </p>
        ))}
      </div>
    );
  };

  const Toggle = ({ checked, onChange }: { checked?: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!checked)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: checked ? BLUE : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '2px', left: checked ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );

  const saveLabel = isEdit ? 'Save Changes' : 'Create Template';
  const savingLabel = isEdit ? 'Saving…' : 'Creating…';
  const backHref = isEdit ? `/admin/form-templates/${template!.id}` : '/admin/form-templates';
  const backLabel = isEdit ? 'Cancel' : 'Back to Templates';

  return (
    <>
      <style>{`
        .tb-inp { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 9px !important; padding: 9px 12px !important; width: 100% !important; font-size: 15px !important; outline: none !important; box-sizing: border-box !important; }
        .tb-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
        .tb-inp::placeholder { color: rgba(255,255,255,0.25) !important; }
        .tb-sel { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: rgba(255,255,255,0.8) !important; border-radius: 9px !important; padding: 8px 12px !important; width: 100% !important; font-size: 15px !important; outline: none !important; cursor: pointer !important; }
        .tb-ta { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 9px !important; padding: 9px 12px !important; width: 100% !important; font-size: 15px !important; outline: none !important; resize: vertical !important; box-sizing: border-box !important; }
        .tb-ta:focus, .tb-inp:focus, .tb-sel:focus { border-color: rgba(55,181,255,0.45) !important; }
        .tb-ta::placeholder { color: rgba(255,255,255,0.25) !important; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <Link href={backHref} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '8px 14px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>
            <ArrowLeft size={15} /> {backLabel}
          </Link>
          <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {savingLabel}</> : <><Save size={15} /> {saveLabel}</>}
          </button>
        </div>

        {/*
          What saving does to work already recorded. Shown before the fields
          rather than at the save button, so it is read while deciding what to
          change — not after the decision has been made.
        */}
        {isEdit && (
          isInUse ? (
            <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.28)', borderRadius: '14px', padding: '18px 20px', display: 'flex', gap: '13px', alignItems: 'flex-start' }}>
              <ShieldAlert size={18} color={AMBER} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>
                  This template is in use — {entriesRecorded} {entriesRecorded === 1 ? 'entry has' : 'entries have'} been filled in against it
                </p>
                <ul style={{ color: 'rgba(255,255,255,0.62)', fontSize: '13px', lineHeight: 1.65, paddingLeft: '18px', margin: 0, listStyle: 'disc' }}>
                  <li>Saving writes this as <strong style={{ color: 'rgba(255,255,255,0.85)' }}>version {template!.version + 1}</strong>. Version {template!.version} is <strong style={{ color: 'rgba(255,255,255,0.85)' }}>archived, not deleted</strong>.</li>
                  <li>Entries already recorded stay on the version they were answered under, so nothing already charted changes.</li>
                  <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Renaming</strong> a field keeps its history — the answers follow the field, not the wording.</li>
                  <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Deleting</strong> a field and adding it back starts that field's history over. The old answers stay with the old version and stop appearing in the trend.</li>
                  <li>The new version starts at 0 entries of its own.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(55,181,255,0.05)', border: '1px solid rgba(55,181,255,0.16)', borderRadius: '14px', padding: '14px 18px', display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
              <AlertCircle size={16} color={BLUE} style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.6 }}>
                Nothing has been filled in against this template yet, so there is no history to protect. Changes save straight onto version {template!.version} and no new version is created.
              </p>
            </div>
          )
        )}

        {/* Basic Info */}
        <div style={{ position: 'relative', ...card, padding: '24px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '20px', marginBottom: '4px' }}>Template Information</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>Basic information about the form template</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>{fieldLabel('Template Name', true)}<input className="tb-inp" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Soccer Player Performance Tracker" /></div>
            <div>{fieldLabel('Description')}<textarea className="tb-ta" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what this form is used for..." rows={3} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                {fieldLabel('Sport', true)}
                <input className="tb-inp" value={sport} onChange={e => setSport(e.target.value)} placeholder="e.g., Hockey" />
              </div>
              <div>
                {fieldLabel('Pillar', true)}
                <select className="tb-sel" value={pillar} onChange={e => setPillar(e.target.value as PillarSlug | 'combined')}>
                  <option value="combined">Combined (All Pillars)</option>
                  {PILLARS.map(p => (
                    <option key={p.slug} value={p.slug}>{pillarOptionLabel(p)}</option>
                  ))}
                </select>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '12px', lineHeight: 1.5 }}>
              One template can be active per sport + pillar pair, so a pillar chart can run alongside the combined tracker.
            </p>
            <Issues issues={templateErrors()} />
          </div>
        </div>

        {/* Sections header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '20px' }}>Sections</h2>
          <button onClick={addSection} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', color: BLUE, padding: '8px 16px', borderRadius: '9px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
            <Plus size={14} /> Add Section
          </button>
        </div>

        {/* Sections */}
        {sections.map((section, sectionIndex) => (
          <div key={section.id} style={{ position: 'relative', ...card, padding: '20px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}44, transparent)` }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '17px' }}>Section {sectionIndex + 1}</p>
              <button onClick={() => removeSection(sectionIndex)} disabled={sections.length === 1} style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.08)', color: sections.length === 1 ? 'rgba(255,255,255,0.2)' : RED, cursor: sections.length === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>{fieldLabel('Section Title', true)}<input className="tb-inp" value={section.title || ''} onChange={e => updateSection(sectionIndex, { title: e.target.value })} placeholder="e.g., Pre-Game, In-Game Performance" /></div>
              <div>{fieldLabel('Section Description')}<textarea className="tb-ta" value={section.description || ''} onChange={e => updateSection(sectionIndex, { description: e.target.value })} placeholder="Describe this section..." rows={2} /></div>
              <Issues issues={sectionErrors(sectionIndex)} />

              {/* Fields */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '15px' }}>Fields</p>
                  <button onClick={() => addFieldToSection(sectionIndex)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: GREEN, padding: '6px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                    <Plus size={12} /> Add Field
                  </button>
                </div>

                {(!section.fields || section.fields.length === 0) && (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No fields yet. Click "Add Field" to get started.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {section.fields?.map((field, fieldIndex) => (
                    <div key={field.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${fieldErrors(sectionIndex, fieldIndex).length > 0 ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                            <div>
                              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Field Label *</p>
                              <input className="tb-inp" value={field.label || ''} onChange={e => updateField(sectionIndex, fieldIndex, { label: e.target.value })} placeholder="e.g., Well Rested?" />
                            </div>
                            <div>
                              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Field Type</p>
                              <select className="tb-sel" value={field.type} onChange={e => changeFieldType(sectionIndex, fieldIndex, field, e.target.value as FieldType)}>
                                <option value="yesno">Yes/No</option>
                                <option value="radio">Radio (Single Choice)</option>
                                <option value="checkbox">Checkbox (Multiple)</option>
                                <option value="numeric">Numeric</option>
                                <option value="scale">Scale (1-10)</option>
                                <option value="text">Text</option>
                                <option value="textarea">Text Area</option>
                              </select>
                            </div>
                          </div>
                          {(field.type === 'radio' || field.type === 'checkbox') && (
                            <div>
                              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Options (comma-separated)</p>
                              <input className="tb-inp"
                                value={(field as FormField & { _optionsRaw?: string })._optionsRaw ?? field.options?.join(', ') ?? ''}
                                onChange={e => updateField(sectionIndex, fieldIndex, { _optionsRaw: e.target.value } as Partial<FormField>)}
                                onBlur={e => {
                                  const options = e.target.value.split(',').map(o => o.trim()).filter(o => o.length > 0);
                                  updateField(sectionIndex, fieldIndex, { options, _optionsRaw: e.target.value } as Partial<FormField>);
                                }}
                                placeholder="e.g., poor, improving, team work, excellent"
                              />
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            {[
                              { key: 'required', label: 'Required', get: () => field.validation?.required, set: (v: boolean) => updateField(sectionIndex, fieldIndex, { validation: { ...field.validation, required: v } }) },
                              { key: 'comments', label: 'Include Comments', get: () => field.includeComments, set: (v: boolean) => updateField(sectionIndex, fieldIndex, { includeComments: v }) },
                              { key: 'analytics', label: 'Enable Analytics', get: () => field.analytics.enabled, set: (v: boolean) => updateField(sectionIndex, fieldIndex, { analytics: { ...field.analytics, enabled: v, type: v ? defaultAnalyticsType(field.type) : 'none' } }) },
                            ].map(({ key, label, get, set }) => (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Toggle checked={get()} onChange={set} />
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{label}</p>
                              </div>
                            ))}
                          </div>
                          <Issues issues={fieldErrors(sectionIndex, fieldIndex)} />
                        </div>
                        <button onClick={() => removeFieldFromSection(sectionIndex, fieldIndex)} style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.08)', color: RED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Bottom save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {savingLabel}</> : <><Save size={15} /> {saveLabel}</>}
          </button>
        </div>
      </div>
    </>
  );
}
