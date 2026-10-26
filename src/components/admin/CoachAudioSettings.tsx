'use client';

/**
 * The two admin forms behind /admin/coach-audio (Audio Part 2):
 *
 *   AddRecordingForm  — brings a recording into the library that is not in the
 *                       catalogue, by its id (2.1).
 *   ClipSettingsPanel — the words shown with a recording (2.4), its button
 *                       words, and the places on the site it plays (2.2).
 *
 * Styled to match the screen they sit on, which uses inline styles throughout.
 */

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { ALL_SLOTS, slotKey } from '@/lib/audio/slots';
import type { CoachAudioSettingsUpdate } from '@/lib/database/services/coach-audio.service';
import type { CoachAudioSettings } from '@/types/coach-audio';

const BLUE = '#37b5ff';
const MUTED = 'rgba(255,255,255,0.45)';
const FAINT = 'rgba(255,255,255,0.3)';

const card = {
  background: 'rgba(2,18,44,0.82)',
  border: '1px solid rgba(55,181,255,0.14)',
  borderRadius: '16px',
} as const;

const field = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  color: '#fff',
  // 16px keeps an iPhone from zooming into the field on focus.
  fontSize: '16px',
  padding: '9px 11px',
} as const;

const fieldLabel = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '1px',
  color: FAINT,
  marginBottom: '5px',
} as const;

function primaryButton(disabled: boolean) {
  return {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.8px',
    color: '#fff',
    background: disabled ? '#334155' : `linear-gradient(135deg, ${BLUE}, #0ea5e9)`,
    border: 'none',
    borderRadius: '8px',
    padding: '9px 16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  } as const;
}

const quietButton = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.8px',
  color: MUTED,
  background: 'none',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '9px 16px',
  cursor: 'pointer',
} as const;

/* ─── Add a recording ──────────────────────────────────────────────────────── */

export function AddRecordingForm({
  onAdd,
}: {
  onAdd: (id: string, title: string, text: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = id.trim() !== '' && title.trim() !== '' && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    const added = await onAdd(id, title, text);
    setSaving(false);
    if (added) {
      setId('');
      setTitle('');
      setText('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...quietButton, color: BLUE, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '22px' }}
      >
        <Plus size={14} /> ADD A RECORDING
      </button>
    );
  }

  return (
    <div style={{ ...card, padding: '18px', marginBottom: '22px' }}>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
        Add a recording
      </div>
      <div style={{ color: MUTED, fontSize: '13px', marginBottom: '14px' }}>
        For a new gem or answer that is not on the list below. Then upload its file on its row,
        or drop a file named with its id (SG_VOICE_G-01.mp3).
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '12px' }}>
        <label>
          <span style={fieldLabel}>ID</span>
          <input
            value={id}
            onChange={event => setId(event.target.value.toUpperCase())}
            placeholder="G-01"
            style={field}
          />
        </label>
        <label>
          <span style={fieldLabel}>TITLE</span>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="The car ride home"
            style={field}
          />
        </label>
      </div>
      <label style={{ display: 'block', marginTop: '12px' }}>
        <span style={fieldLabel}>WORDS (OPTIONAL)</span>
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          rows={3}
          placeholder="What Coach Mike says, for anyone who reads rather than listens."
          style={{ ...field, resize: 'vertical' }}
        />
      </label>

      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button type="button" onClick={() => void submit()} disabled={!canSave} style={primaryButton(!canSave)}>
          {saving ? 'ADDING…' : 'ADD'}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={quietButton}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

/* ─── One recording's settings ─────────────────────────────────────────────── */

export function ClipSettingsPanel({
  id,
  catalogueText,
  settings,
  isBusy,
  onSave,
  onCancel,
}: {
  id: string;
  catalogueText: string;
  settings: CoachAudioSettings;
  isBusy: boolean;
  onSave: (update: CoachAudioSettingsUpdate) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(settings.text ?? '');
  const [label, setLabel] = useState(settings.label ?? '');
  const [slots, setSlots] = useState<Set<string>>(new Set(settings.slots ?? []));
  const [filter, setFilter] = useState('');

  // Grouped by page so 80-odd places read as a short list of pages.
  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const byPage = new Map<string, { pageName: string; items: { key: string; label: string }[] }>();
    for (const slot of ALL_SLOTS) {
      const key = slotKey(slot.page, slot.label);
      if (needle && !`${slot.pageName} ${slot.label}`.toLowerCase().includes(needle) && !slots.has(key)) {
        continue;
      }
      const group = byPage.get(slot.page) ?? { pageName: slot.pageName, items: [] };
      group.items.push({ key, label: slot.label });
      byPage.set(slot.page, group);
    }
    return [...byPage.entries()];
  }, [filter, slots]);

  const toggleSlot = (key: string) =>
    setSlots(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div style={{ padding: '4px 14px 16px 56px' }}>
      <label style={{ display: 'block' }}>
        <span style={fieldLabel}>WORDS SHOWN WITH {id}</span>
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          rows={3}
          placeholder={catalogueText}
          style={{ ...field, resize: 'vertical' }}
        />
        <span style={{ display: 'block', color: FAINT, fontSize: '11px', marginTop: '4px' }}>
          Leave empty to use the words on file (shown faintly above).
        </span>
      </label>

      <label style={{ display: 'block', marginTop: '12px' }}>
        <span style={fieldLabel}>BUTTON WORDS (OPTIONAL)</span>
        <input
          value={label}
          onChange={event => setLabel(event.target.value)}
          placeholder="Leave empty to keep the words each page already uses"
          style={field}
        />
      </label>

      <div style={{ marginTop: '14px' }}>
        <span style={fieldLabel}>
          WHERE IT PLAYS · {slots.size} PLACE{slots.size === 1 ? '' : 'S'}
        </span>
        <input
          value={filter}
          onChange={event => setFilter(event.target.value)}
          placeholder="Find a page or button"
          style={{ ...field, marginBottom: '8px' }}
        />
        <div
          style={{
            maxHeight: '260px',
            overflowY: 'auto',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '8px 10px',
          }}
        >
          {groups.length === 0 && (
            <div style={{ color: FAINT, fontSize: '13px' }}>Nothing matches.</div>
          )}
          {groups.map(([page, group]) => (
            <div key={page} style={{ marginBottom: '8px' }}>
              <div style={{ color: BLUE, fontSize: '11px', fontWeight: 800, letterSpacing: '1px', margin: '4px 0' }}>
                {group.pageName.toUpperCase()} <span style={{ color: FAINT, fontWeight: 600 }}>{page}</span>
              </div>
              {group.items.map(item => (
                <label
                  key={item.key}
                  style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '4px 0', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={slots.has(item.key)}
                    onChange={() => toggleSlot(item.key)}
                    style={{ marginTop: '3px', width: '16px', height: '16px', flexShrink: 0 }}
                  />
                  <span style={{ color: '#fff', fontSize: '13px' }}>{item.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button
          type="button"
          disabled={isBusy}
          onClick={() =>
            void onSave({
              text: text.trim() === '' ? null : text,
              label: label.trim() === '' ? null : label,
              slots: [...slots],
            })
          }
          style={primaryButton(isBusy)}
        >
          SAVE
        </button>
        <button type="button" onClick={onCancel} style={quietButton}>
          CANCEL
        </button>
      </div>
    </div>
  );
}
