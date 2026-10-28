'use client';

/**
 * Knowledge Check Layers — the rules (Build 1, Phase 1).
 *
 * Every number in the layers brief is set here rather than in code: how slow the
 * support layers play, how many misses open the answer, what "owned" means, how
 * long a break starts a new session, and how many steps a Building Block adds.
 *
 * Saving writes one document, `knowledge_check_settings/layers`. The screen shows
 * back what was stored, so a value pulled into range is visible straight away.
 */

import { useEffect, useState } from 'react';
import { Layers, Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';

import { AdminRoute } from '@/components/auth/protected-route';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import { useAuth } from '@/lib/auth/context';
import { layerRulesService } from '@/lib/database/services/layer-rules.service';
import { DEFAULT_LAYER_RULES, LAYER_RULE_RANGES, type LayerRules } from '@/types/knowledge-layers';

/* ─── Style constants, matching the other admin screens ────────────────────── */

const BLUE = '#37b5ff';
const MUTED = 'rgba(255,255,255,0.45)';

const card = {
  background: 'rgba(2,18,44,0.82)',
  border: '1px solid rgba(55,181,255,0.14)',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '16px',
} as const;

const input = {
  width: '120px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(55,181,255,0.25)',
  borderRadius: '8px',
  color: '#fff',
  padding: '8px 10px',
  fontSize: '14px',
} as const;

/* ─── What each rule means, in the words of the brief ─────────────────────── */

interface RuleField {
  key: keyof LayerRules;
  label: string;
  help: string;
  /** Shown after the box. */
  unit: string;
}

const SECTIONS: { title: string; fields: RuleField[] }[] = [
  {
    title: 'Support layers',
    fields: [
      { key: 'layer2Speed', label: 'Support Layer 2 speed', help: 'The missed part of the video replays at this speed. 0.5 is half speed.', unit: '× speed' },
      { key: 'layer3Speed', label: 'Support Layer 3 speed', help: 'Replays slower again, then holds on a frame or photo. 0.25 is quarter speed.', unit: '× speed' },
      { key: 'layer2AttemptsBeforeAnswer', label: 'Misses on Layer 2 before the answer', help: 'After this many misses on Layer 2, he goes straight to the answer (Layer 4).', unit: 'misses' },
      { key: 'layer3AttemptsBeforeAnswer', label: 'Misses on Layer 3 before the answer', help: 'After this many misses on Layer 3, the answer (Layer 4) opens.', unit: 'misses' },
    ],
  },
  {
    title: 'Owned',
    fields: [
      { key: 'ownedCorrectInARow', label: 'Right this many times in a row', help: 'A question is owned when he gets it right this many times running...', unit: 'times' },
      { key: 'ownedSessions', label: '...across this many sessions', help: '...in at least this many different sessions, so it is remembered, not just repeated.', unit: 'sessions' },
      { key: 'sessionGapMinutes', label: 'A new session starts after', help: 'A break this long between answers counts as a new session.', unit: 'minutes' },
    ],
  },
  {
    title: 'Building Blocks',
    fields: [
      { key: 'buildingBlockSize', label: 'Steps added at a time', help: 'Each Building Block adds this many new steps, newest first, on top of the ones before.', unit: 'steps' },
    ],
  },
];

function KnowledgeLayersAdminPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState<LayerRules>(DEFAULT_LAYER_RULES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    layerRulesService.getRules().then(result => {
      if (cancelled) return;
      if (result.success && result.data) setRules(result.data);
      else toast.error('Could not load the layer rules', { description: 'Showing the defaults.' });
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setRule = (key: keyof LayerRules, raw: string) => {
    const value = Number(raw);
    // An emptied box keeps its last value rather than becoming 0; the save
    // pulls anything out of range back in.
    if (raw.trim() === '' || !Number.isFinite(value)) return;
    setRules(current => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!user?.id) {
      toast.error('Could not save the layer rules');
      return;
    }
    setIsSaving(true);
    const result = await layerRulesService.saveRules(rules, user.id);
    setIsSaving(false);
    if (result.success && result.data) {
      setRules(result.data);
      toast.success('Layer rules saved');
    } else {
      toast.error('Could not save the layer rules');
    }
  };

  if (isLoading) return <SkeletonDarkPage />;

  return (
    <div style={{ padding: '24px', maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Layers size={24} style={{ color: BLUE }} />
          Knowledge Check Layers
        </h1>
        <p style={{ color: MUTED, fontSize: '14px', margin: '6px 0 0', lineHeight: 1.6 }}>
          A missed question is never marked down. Its part of the video replays, slower each
          time, until it clicks. These are the rules that run it.
        </p>
      </div>

      {SECTIONS.map(section => (
        <section key={section.title} style={card}>
          <h2 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: BLUE, margin: '0 0 14px' }}>
            {section.title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {section.fields.map(field => {
              const range = LAYER_RULE_RANGES[field.key];
              return (
                <div key={field.key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <label htmlFor={field.key} style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                      {field.label}
                    </label>
                    <p style={{ color: MUTED, fontSize: '12px', margin: '2px 0 0', lineHeight: 1.5 }}>{field.help}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      id={field.key}
                      type="number"
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={rules[field.key]}
                      onChange={e => setRule(field.key, e.target.value)}
                      style={input}
                    />
                    <span style={{ color: MUTED, fontSize: '12px', width: '64px' }}>{field.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => setRules(DEFAULT_LAYER_RULES)}
          disabled={isSaving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(55,181,255,0.3)', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          <RotateCcw size={16} />
          Back to the defaults
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: BLUE, color: '#000f28', fontWeight: 800, cursor: isSaving ? 'wait' : 'pointer' }}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save rules
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AdminRoute>
      <KnowledgeLayersAdminPage />
    </AdminRoute>
  );
}
