'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { chartingService } from '@/lib/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup } from '@/components/ui/radio-group';
import { X, Save, Trophy, Dumbbell, MapPin, CalendarDays, Users, Tag } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Session } from '@/types';
import { toDateSafe } from '@/lib/utils/timestamp';
import { toLocalDateTimeInputValue } from '@/lib/utils/local-date';

const BLUE  = '#37b5ff';
const MUTED = 'rgba(255,255,255,0.38)';
const LABEL = 'rgba(255,255,255,0.55)';

interface NewSessionModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this session instead of creating a new one. */
  session?: Session;
  /** Called after an edit has been saved, so the page can reload the session. */
  onSaved?: () => void;
}

function formFor(session?: Session) {
  if (!session) {
    return {
      type: 'game' as 'game' | 'practice',
      date: toLocalDateTimeInputValue(),
      opponent: '',
      location: '',
      tags: [] as string[],
    };
  }
  return {
    type: session.type as 'game' | 'practice',
    date: toLocalDateTimeInputValue(toDateSafe(session.date) ?? new Date()),
    opponent: session.opponent ?? '',
    location: session.location ?? '',
    tags: session.tags ?? [],
  };
}

export function NewSessionModal({ open, onClose, session, onSaved }: NewSessionModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const isEdit = !!session;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => formFor(session));

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset form when opening, so the date is the time it is now (not when the
  // page loaded) and an edit starts from the saved values. Keyed on `open` only:
  // the session page reloads its session when the window regains focus, and that
  // must not wipe what is being typed.
  useEffect(() => {
    if (open) setFormData(formFor(session));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoading(true);

      if (session) {
        // Cleared fields are saved as empty strings: an undefined value is
        // stripped before the write, so the old text would otherwise stay.
        const saved = await chartingService.updateSession(session.id, {
          date: Timestamp.fromDate(new Date(formData.date)),
          opponent: formData.opponent.trim(),
          location: formData.location.trim(),
          tags: formData.tags,
        });
        if (saved.success) {
          onSaved?.();
          onClose();
        } else {
          alert('Failed to save changes');
        }
        return;
      }

      const result = await chartingService.createSession({
        studentId: user.id,
        type: formData.type,
        date: Timestamp.fromDate(new Date(formData.date)),
        opponent: formData.opponent || undefined,
        location: formData.location || undefined,
        tags: formData.tags,
        status: 'scheduled' as const,
        createdBy: user.id,
      });
      if (result.success && result.data) {
        onClose();
        router.push(`/charting/sessions/${result.data.id}`);
      } else {
        alert('Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'white',
    height: '38px',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 100 }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(640px, calc(100vw - 32px))',
          background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)',
          border: '1px solid rgba(55,181,255,0.22)',
          borderRadius: '18px', overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          zIndex: 101,
          animation: 'modal-in 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Blue top line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent 0%, ${BLUE} 40%, rgba(255,255,255,0.5) 70%, transparent 100%)` }} />
        {/* Glow */}
        <div style={{ position: 'absolute', top: '-40px', right: '-20px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(55,181,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '3px', height: '32px', borderRadius: '99px', background: `linear-gradient(180deg, ${BLUE}, rgba(255,255,255,0.3))`, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '10px', color: LABEL, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '2px' }}>Charting</p>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1 }}>
                {isEdit ? 'Edit' : 'New'} <span style={{ color: BLUE }}>Session</span>
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,80,80,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {/* Session Type — fixed once a session exists, since its chart is tied to the type */}
          {!isEdit && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: LABEL, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Session Type</p>
            <RadioGroup
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v as 'game' | 'practice' })}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { value: 'game',     label: 'Game',     desc: 'Competitive match', Icon: Trophy   },
                { value: 'practice', label: 'Practice', desc: 'Training session',  Icon: Dumbbell },
              ].map(({ value, label, desc, Icon }) => {
                const active = formData.type === value;
                return (
                  <div
                    key={value}
                    onClick={() => setFormData({ ...formData, type: value as 'game' | 'practice' })}
                    style={{ border: `2px solid ${active ? BLUE : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(55,181,255,0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <div style={{ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(55,181,255,0.18)' : 'rgba(255,255,255,0.07)', flexShrink: 0 }}>
                      <Icon size={16} color={active ? BLUE : 'rgba(255,255,255,0.35)'} />
                    </div>
                    <div>
                      <input type="radio" value={value} checked={active} onChange={() => setFormData({ ...formData, type: value as 'game' | 'practice' })} className="sr-only" />
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '1px' }}>{label}</p>
                      <p style={{ fontSize: '11px', color: MUTED }}>{desc}</p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
          )}

          {/* Details grid */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: LABEL, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <Label htmlFor="modal-date" style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CalendarDays size={11} color={BLUE} /> Date & Time <span style={{ color: BLUE }}>*</span>
                </Label>
                <Input id="modal-date" type="datetime-local" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="focus-visible:ring-blue-500 text-sm" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <Label htmlFor="modal-location" style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={11} color={BLUE} /> Location
                </Label>
                <Input id="modal-location" type="text" placeholder="Arena or rink" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="focus-visible:ring-blue-500 placeholder:text-white/25 text-sm" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1' }}>
                <Label htmlFor="modal-opponent" style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {formData.type === 'game'
                    ? <><Users size={11} color={BLUE} /> Opponent</>
                    : <><Tag size={11} color={BLUE} /> Practice Name</>}
                </Label>
                <Input id="modal-opponent" type="text" placeholder={formData.type === 'game' ? 'Opponent team name' : 'Practice session name'} value={formData.opponent} onChange={(e) => setFormData({ ...formData, opponent: e.target.value })} className="focus-visible:ring-blue-500 placeholder:text-white/25 text-sm" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: LABEL, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Tags</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {['Home', 'Away', 'Tournament', 'League', 'Playoff'].map((tag) => {
                const isSelected = formData.tags.includes(tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const tags = isSelected
                        ? formData.tags.filter((t) => t !== tag.toLowerCase())
                        : [...formData.tags, tag.toLowerCase()];
                      setFormData({ ...formData, tags });
                    }}
                    style={isSelected
                      ? { background: BLUE, color: '#fff', border: 'none', borderRadius: '99px', padding: '5px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(55,181,255,0.3)' }
                      : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '99px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '9px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 20px', background: BLUE, border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(55,181,255,0.3)' }}
            >
              {loading ? (
                <>
                  <div style={{ width: '13px', height: '13px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                  {isEdit ? 'Saving…' : 'Creating…'}
                </>
              ) : (
                <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Session'}</>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes modal-in { from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
      `}</style>
    </>
  );
}
