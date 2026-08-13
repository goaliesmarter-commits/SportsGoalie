'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formTemplateService } from '@/lib/database/services/form-template.service';
import { FormTemplate, PILLARS } from '@/types';
import { ArrowLeft, CheckCircle2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const BLUE = '#37b5ff';
const GREEN = '#22c55e';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTemplate(); }, [templateId]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const result = await formTemplateService.getTemplate(templateId);
      if (result.success && result.data) {
        setTemplate(result.data);
      } else {
        toast.error('Failed to load template');
        router.push('/admin/form-templates');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Error loading template');
      router.push('/admin/form-templates');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Loading template…</p>
      </div>
    );
  }

  if (!template) return null;

  const totalFields = template.sections.reduce((sum, section) => sum + section.fields.length, 0);
  const analyticsEnabledFields = template.sections.reduce(
    (sum, section) => sum + section.fields.filter((f) => f.analytics.enabled).length, 0
  );

  const pillarLabel = template.pillar === 'combined'
    ? 'Combined (All Pillars)'
    : PILLARS.find(p => p.slug === template.pillar)?.name || template.pillar || 'Not specified';

  const metaItems = [
    { label: 'Sport', value: template.sport || 'Not specified' },
    { label: 'Pillar', value: pillarLabel },
    { label: 'Version', value: `v${template.version}` },
    { label: 'Sections', value: String(template.sections.length) },
    { label: 'Total Fields', value: String(totalFields) },
    { label: 'Analytics Fields', value: String(analyticsEnabledFields) },
    { label: 'Usage Count', value: `${template.usageCount || 0} entries` },
    { label: 'Status', value: template.isArchived ? 'Archived' : template.isActive ? 'Active' : 'Inactive' },
    { label: 'Partial Submission', value: template.allowPartialSubmission ? 'Allowed' : 'Not allowed' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <Link href="/admin/form-templates" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '8px 14px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>
          <ArrowLeft size={15} /> Back to Templates
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {template.isActive && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(34,197,94,0.12)', color: GREEN, padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              <CheckCircle2 size={12} /> Active
            </span>
          )}
          {/*
            An archived template is not editable in place: saving an edit writes
            a live new version, which would pull it back out of the archive
            without saying so. Restore it from the templates list first.
          */}
          {template.isArchived ? (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Archived — restore it from the templates list to edit.</span>
          ) : (
            <Link href={`/admin/form-templates/${template.id}/edit`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#fff', padding: '9px 16px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}>
              <Pencil size={14} /> Edit Template
            </Link>
          )}
        </div>
      </div>

      {/* Template Info */}
      <div style={{ position: 'relative', ...card, padding: '24px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
        <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '24px', marginBottom: '6px' }}>{template.name}</h1>
        {template.description && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginBottom: '24px' }}>{template.description}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {metaItems.map(({ label, value }) => (
            <div key={label}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '4px' }}>{label}</p>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '4px' }}>Created</p>
            <p style={{ color: '#fff', fontSize: '15px' }}>{template.createdAt?.toDate?.().toLocaleString() || 'Unknown'}</p>
          </div>
          {template.updatedAt && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '4px' }}>Last Updated</p>
              <p style={{ color: '#fff', fontSize: '15px' }}>{template.updatedAt?.toDate?.().toLocaleString() || 'Unknown'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '20px' }}>Sections &amp; Fields</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {template.sections.sort((a, b) => a.order - b.order).map((section, sectionIndex) => (
          <div key={section.id} style={{ position: 'relative', ...card, padding: '20px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}66, transparent)` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `rgba(55,181,255,0.15)`, border: `1px solid rgba(55,181,255,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: BLUE, flexShrink: 0 }}>
                {sectionIndex + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '17px' }}>{section.title}</p>
                {section.description && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '2px' }}>{section.description}</p>}
              </div>
              <span style={{ background: 'rgba(55,181,255,0.1)', color: BLUE, padding: '2px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>{section.fields.length} fields</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {section.fields.sort((a, b) => a.order - b.order).map((field, fieldIndex) => (
                <div key={field.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(55,181,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: BLUE, flexShrink: 0 }}>
                    {fieldIndex + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{field.label}</p>
                      <span style={{ background: 'rgba(55,181,255,0.1)', color: BLUE, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{field.type}</span>
                      {field.validation?.required && <span style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Required</span>}
                      {field.analytics.enabled && <span style={{ background: 'rgba(34,197,94,0.12)', color: GREEN, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Analytics: {field.analytics.type}</span>}
                    </div>
                    {field.description && <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginBottom: '4px' }}>{field.description}</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {field.options && field.options.length > 0 && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Options: {field.options.join(', ')}</span>}
                      {field.validation?.min !== undefined && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Min: {field.validation.min}</span>}
                      {field.validation?.max !== undefined && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Max: {field.validation.max}</span>}
                      {field.includeComments && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Includes comments</span>}
                      {field.analytics.category && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Category: {field.analytics.category}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
