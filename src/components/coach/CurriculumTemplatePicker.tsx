'use client';

import { BookOpen, Sparkles, FileText } from 'lucide-react';
import type { CurriculumTemplate } from '@/lib/utils/curriculum-templates';
import { getPillarByDocId } from '@/lib/utils/pillars';

const BLUE = '#37b5ff';
const PURPLE = '#a78bfa';

interface Props {
  templates: CurriculumTemplate[];
  onSelectTemplate: (template: CurriculumTemplate) => void;
  onStartFromScratch: () => void;
}

export function CurriculumTemplatePicker({ templates, onSelectTemplate, onStartFromScratch }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Recommended Templates */}
      {templates.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Sparkles size={14} color={PURPLE} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Recommended Templates
            </p>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>(based on student profile)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t)}
                style={{ textAlign: 'left', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '14px', padding: '18px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'rgba(167,139,250,0.1)';
                  b.style.borderColor = 'rgba(167,139,250,0.4)';
                  b.style.transform = 'translateY(-2px)';
                  b.style.boxShadow = '0 6px 24px rgba(167,139,250,0.15)';
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'rgba(167,139,250,0.05)';
                  b.style.borderColor = 'rgba(167,139,250,0.18)';
                  b.style.transform = 'translateY(0)';
                  b.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{t.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: 1.5 }}>{t.description}</p>
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={14} color={PURPLE} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                  {t.items.slice(0, 4).map((item, i) => {
                    const pillar = getPillarByDocId(item.pillarId);
                    return (
                      <span key={i} style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px 8px' }}>
                        {pillar?.shortName || item.pillarSlug}
                      </span>
                    );
                  })}
                  {t.items.length > 4 && (
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2px 8px' }}>
                      +{t.items.length - 4} more
                    </span>
                  )}
                </div>

                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{t.items.length} items total</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start from Scratch */}
      <div style={{ textAlign: 'center', paddingTop: templates.length > 0 ? '8px' : '0', borderTop: templates.length > 0 ? '1px solid rgba(55,181,255,0.08)' : 'none' }}>
        {templates.length > 0 && (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginBottom: '14px' }}>or</p>
        )}
        <button
          onClick={onStartFromScratch}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: 'rgba(55,181,255,0.08)', border: `1px solid rgba(55,181,255,0.2)`, color: BLUE, fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = 'rgba(55,181,255,0.15)';
            b.style.borderColor = 'rgba(55,181,255,0.4)';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = 'rgba(55,181,255,0.08)';
            b.style.borderColor = 'rgba(55,181,255,0.2)';
          }}
        >
          <BookOpen size={15} /> Start from Scratch
        </button>
      </div>

    </div>
  );
}
