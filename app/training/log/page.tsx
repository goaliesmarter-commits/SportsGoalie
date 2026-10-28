'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { db } from '@/lib/firebase/config';
import {
  collection, query, where, getDocs, doc,
  setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import {
  TrainingLogEntry, TrainingItemLog, TrainingCategory, VMPRating, LIndexItem,
} from '@/types/charting';
import { VMPSelector } from '@/components/training/VMPSelector';
import { StarRating } from '@/components/charting/inputs/StarRating';
import { computeTrainingAnalytics } from '@/lib/training/analytics';
import { triggerMilestoneNotifications } from '@/lib/training/milestones';
import { useEventVoice } from '@/hooks/useEventVoice';
import { masteryMilestoneCrossed } from '@/lib/audio/learning-moments';
import { ArrowLeft, CheckCircle2, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const BLUE = '#37b5ff';
const MINT = '#34d399';

type TopCat = TrainingCategory;

const FIXED_ITEMS: { id: string; label: string; category: TopCat }[] = [
  { id: 'ice_session',         label: 'Ice Session',         category: 'ice' },
  { id: 'puck_machine_session',label: 'Puck Machine Session',category: 'puck_machine' },
  // Land / Conditioning
  { id: 'strength_training',   label: 'Strength Training',   category: 'land_conditioning' },
  // Lifestyle Foundations
  { id: 'recovery_rest',       label: 'Recovery & Rest',     category: 'lifestyle_foundations' },
  // Games & Tourneys
  { id: 'game_entry',          label: 'Game / Scrimmage',    category: 'games_tourneys' },
  { id: 'tournament_entry',    label: 'Tournament',          category: 'games_tourneys' },
];

const CATEGORY_META: Record<TopCat, { label: string; color: string }> = {
  ice:                  { label: 'Ice',                  color: BLUE },
  puck_machine:         { label: 'Puck Machine',         color: MINT },
  land_conditioning:    { label: 'Land / Conditioning',  color: '#a78bfa' },
  lifestyle_foundations:{ label: 'Lifestyle Foundations',color: '#fbbf24' },
  games_tourneys:       { label: 'Games / Tourneys',     color: '#f87171' },
};

const CATEGORY_ORDER: TopCat[] = ['ice', 'puck_machine', 'land_conditioning', 'lifestyle_foundations', 'games_tourneys'];
const LAST_CATEGORY = CATEGORY_ORDER[CATEGORY_ORDER.length - 1];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─── Item Card ────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: TrainingItemLog;
  label: string;
  onChange: (updated: TrainingItemLog) => void;
}

function ItemCard({ item, label, onChange }: ItemCardProps) {
  return (
    <div style={{
      borderRadius: '16px',
      background: 'linear-gradient(135deg, rgba(4,33,63,0.92) 0%, rgba(10,45,82,0.92) 100%)',
      border: '1px solid rgba(55,181,255,0.18)',
      padding: '28px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      {/* Title */}
      <h3 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '26px' }}>
        {label}
      </h3>

      {/* Consistency stars */}
      <div style={{ marginBottom: '22px' }}>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: '12px' }}>
          Consistency (Star Rating)&nbsp;&nbsp;{item.consistencyRating ?? 0}/5
        </p>
        <StarRating
          value={item.consistencyRating ?? 0}
          onChange={v => onChange({ ...item, consistencyRating: v })}
        />
      </div>

      {/* VMP Rating */}
      <div style={{ marginBottom: '22px' }}>
        <VMPSelector
          value={item.vmpRating}
          onChange={v => onChange({ ...item, vmpRating: v as VMPRating })}
        />
      </div>

      {/* Notes */}
      <textarea
        value={item.textNote ?? ''}
        onChange={e => onChange({ ...item, textNote: e.target.value })}
        placeholder="Any notes about this session..."
        rows={3}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '10px', padding: '12px 14px',
          color: 'rgba(255,255,255,0.7)', fontSize: '13px',
          resize: 'none', outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
        onFocus={e  => { e.currentTarget.style.borderColor = 'rgba(55,181,255,0.3)'; }}
        onBlur={e   => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
      />
    </div>
  );
}

// ─── Suggest Modal ────────────────────────────────────────────────────────────

interface SuggestModalProps {
  defaultCategory: TopCat;
  goalieId: string;
  goalieDisplayName?: string;
  onClose: () => void;
}

function SuggestModal({ defaultCategory, goalieId, goalieDisplayName, onClose }: SuggestModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TopCat>(defaultCategory);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const inp: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px', padding: '11px 14px', color: '#fff', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px',
  };

  const handleSubmit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const ref = doc(collection(db, 'l_index_suggestions'));
      await setDoc(ref, {
        id: ref.id, goalieId,
        goalieDisplayName: goalieDisplayName ?? null,
        suggestedName: name.trim(), suggestedCategory: category,
        description: reason.trim() || null, status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Suggestion submitted — your coach will review it!');
      onClose();
    } catch {
      toast.error('Failed to submit suggestion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 60%)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '560px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 800, marginBottom: '3px' }}>Suggest a Training Item</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Your coach will review and add it to the catalogue.</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: '8px', padding: '6px', display: 'flex', flexShrink: 0 }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Item name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Box Jumps" style={inp} />
          </div>
          <div>
            <label style={lbl}>Training area</label>
            <select value={category} onChange={e => setCategory(e.target.value as TopCat)} style={{ ...inp, background: '#04213f', cursor: 'pointer' }}>
              {CATEGORY_ORDER.map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Why add it? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe what it is and why it would help…" rows={2} style={{ ...inp, resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={!name.trim() || saving} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: name.trim() ? 'rgba(55,181,255,0.85)' : 'rgba(55,181,255,0.2)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: !name.trim() || saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Submitting…' : 'Submit Suggestion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrainingLogPage() {
  const router = useRouter();
  const say = useEventVoice();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const dateParam = searchParams.get('date');
  const categoryParam = searchParams.get('category') as TopCat | null;
  const targetDate = dateParam || todayStr();
  const isToday = targetDate === todayStr();

  const [lIndexItems, setLIndexItems] = useState<LIndexItem[]>([]);
  const [items, setItems] = useState<TrainingItemLog[]>([]);
  const [existingLogId, setExistingLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TopCat>(categoryParam || 'ice');
  const [showSuggest, setShowSuggest] = useState(false);

  const getLabelForItem = useCallback((itemId: string): string => {
    const fixed = FIXED_ITEMS.find(f => f.id === itemId);
    if (fixed) return fixed.label;
    const li = lIndexItems.find(l => l.id === itemId);
    return li?.name ?? itemId;
  }, [lIndexItems]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const liSnap = await getDocs(query(collection(db, 'l_index_items'), where('isActive', '==', true)));
        const allItems = liSnap.docs.map(d => ({ id: d.id, ...d.data() } as LIndexItem));
        const livingIndex: string[] = (user as { livingIndex?: string[] }).livingIndex ?? [];
        const activeItems = livingIndex.length > 0 ? allItems.filter(i => livingIndex.includes(i.id)) : allItems;
        setLIndexItems(activeItems);

        const logSnap = await getDocs(
          query(collection(db, 'training_logs'), where('goalieId', '==', user.id), where('date', '==', targetDate))
        );

        if (!logSnap.empty) {
          const logDoc = logSnap.docs[0];
          const logData = { id: logDoc.id, ...logDoc.data() } as TrainingLogEntry;
          setExistingLogId(logDoc.id);
          setItems(logData.items);
        } else {
          const defaultItems: TrainingItemLog[] = [
            ...FIXED_ITEMS.map(f => ({ itemId: f.id, category: f.category, done: false })),
            ...activeItems.map(li => ({ itemId: li.id, category: li.topLevelCategory as TopCat, done: false })),
          ];
          setItems(defaultItems);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, targetDate, user]);

  const updateItem = (itemId: string, updated: TrainingItemLog) => {
    setItems(prev => prev.map(i => i.itemId === itemId ? updated : i));
  };

  // Persist a specific items array to Firestore
  const persistItems = async (itemsToSave: TrainingItemLog[]) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const allLogsSnap = await getDocs(query(collection(db, 'training_logs'), where('goalieId', '==', user.id)));
      const prevLogs = allLogsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrainingLogEntry));
      const prevAnalytics = computeTrainingAnalytics(prevLogs);

      const payload = { goalieId: user.id, date: targetDate, items: itemsToSave, updatedAt: serverTimestamp() };
      if (existingLogId) {
        await updateDoc(doc(db, 'training_logs', existingLogId), payload);
      } else {
        const newRef = doc(collection(db, 'training_logs'));
        await setDoc(newRef, { ...payload, createdAt: serverTimestamp() });
        setExistingLogId(newRef.id);
      }

      const updatedLog = { id: existingLogId ?? 'new', goalieId: user.id, date: targetDate, items: itemsToSave } as unknown as TrainingLogEntry;
      const nextLogs = [...prevLogs.filter(l => l.date !== targetDate), updatedLog];
      const nextAnalytics = computeTrainingAnalytics(nextLogs);

      // Coach Mike marks a mastery milestone out loud (Audio Part 3).
      if (masteryMilestoneCrossed(prevAnalytics.masteryPercent, nextAnalytics.masteryPercent) !== null) {
        say('masteryMilestone');
      }

      triggerMilestoneNotifications({
        goalieId: user.id,
        goalieDisplayName: user.displayName ?? undefined,
        prevAnalytics,
        nextAnalytics,
      }).catch(() => { /* non-critical */ });
    } catch {
      toast.error('Failed to save');
      throw new Error('save failed');
    } finally {
      setSaving(false);
    }
  };

  // "Save Category" — mark category items as done, stay on page
  const handleSaveCategory = () => {
    setItems(prev => prev.map(i => i.category === activeCategory ? { ...i, done: true } : i));
    toast.success(`${CATEGORY_META[activeCategory].label} saved`);
  };

  // "Save Log" (last category) — mark final category done, persist, navigate home
  const handleSaveLog = async () => {
    if (saving) return;
    const finalItems = items.map(i => i.category === activeCategory ? { ...i, done: true } : i);
    setItems(finalItems);
    try {
      await persistItems(finalItems);
      toast.success('Training log saved!');
      router.push('/training');
    } catch {
      // error already shown in persistItems
    }
  };

  const itemsForCategory = (cat: TopCat) => items.filter(i => i.category === cat);
  const isCatDone = (cat: TopCat) => {
    const catItems = items.filter(i => i.category === cat);
    return catItems.length > 0 && catItems.every(i => i.done);
  };

  const doneCount = items.filter(i => i.done).length;
  const progressPct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
  const isLastCat = activeCategory === LAST_CATEGORY;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #020d1c 0%, #041830 50%, #021020 100%)',
      padding: '28px 40px 60px',
      boxSizing: 'border-box',
    }}>
      <style>{`
        .tl-tab { transition: all 0.2s ease; }
        .tl-tab:hover { color: rgba(255,255,255,0.8) !important; }
        .tl-cat-btn { transition: all 0.22s ease; }
        .tl-cat-btn:hover { opacity: 0.88; transform: translateY(-1px); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '16px', marginBottom: '36px' }}>
        <div>
          <button
            type="button"
            onClick={() => router.push('/training')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} /> Back
          </button>
        </div>

        <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', whiteSpace: 'nowrap', margin: 0 }}>
          {isToday ? "Today's Log" : formatDate(targetDate)}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600 }}>
            {doneCount} of {items.length} items done
          </span>
          <div style={{ width: '160px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg, ${BLUE}, ${MINT})`, borderRadius: '2px', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', justifyContent: 'center', marginBottom: '32px', paddingBottom: '2px' }}>
        {CATEGORY_ORDER.map(cat => {
          const active = activeCategory === cat;
          const done = isCatDone(cat);
          const col = CATEGORY_META[cat].color;
          return (
            <button
              key={cat}
              type="button"
              className="tl-tab"
              onClick={() => setActiveCategory(cat)}
              style={{
                whiteSpace: 'nowrap', padding: '8px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: 600,
                border: active ? `1.5px solid ${col}` : '1px solid rgba(255,255,255,0.1)',
                background: active ? `${col}18` : done ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)',
                color: active ? col : done ? MINT : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                boxShadow: active ? `0 0 14px ${col}40` : 'none',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {done && !active && <CheckCircle2 style={{ width: '13px', height: '13px', color: MINT, flexShrink: 0 }} />}
              {CATEGORY_META[cat].label}
            </button>
          );
        })}
      </div>

      {/* ── Item Cards ── */}
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px', padding: '60px 0' }}>Loading…</p>
        ) : itemsForCategory(activeCategory).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: '14px', lineHeight: 1.8 }}>
            No items in your Living Index for this category.<br />
            <span style={{ fontSize: '12px' }}>Ask your admin to activate items for you.</span>
          </div>
        ) : (
          itemsForCategory(activeCategory).map(item => (
            <ItemCard
              key={item.itemId}
              item={item}
              label={getLabelForItem(item.itemId)}
              onChange={updated => updateItem(item.itemId, updated)}
            />
          ))
        )}

        {/* Suggest */}
        {!loading && (
          <div style={{ textAlign: 'center', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => setShowSuggest(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', background: 'rgba(55,181,255,0.05)', border: '1px solid rgba(55,181,255,0.14)', color: 'rgba(55,181,255,0.55)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus style={{ width: '12px', height: '12px' }} />
              Suggest a new training item
            </button>
          </div>
        )}

        {/* Save Category / Save Log */}
        {!loading && isToday && (
          isLastCat ? (
            <button
              type="button"
              className="tl-cat-btn"
              onClick={handleSaveLog}
              disabled={saving}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', marginTop: '8px',
                background: `linear-gradient(135deg, ${BLUE} 0%, ${MINT} 100%)`,
                border: 'none', color: '#06050f', fontSize: '15px', fontWeight: 800,
                cursor: saving ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 4px 20px rgba(55,181,255,0.32)',
              }}
            >
              <Save style={{ width: '16px', height: '16px' }} />
              {saving ? 'Saving…' : 'Save Log'}
            </button>
          ) : (
            <button
              type="button"
              className="tl-cat-btn"
              onClick={handleSaveCategory}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', marginTop: '8px',
                background: `${CATEGORY_META[activeCategory].color}18`,
                border: `1.5px solid ${CATEGORY_META[activeCategory].color}50`,
                color: CATEGORY_META[activeCategory].color,
                fontSize: '15px', fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: `0 4px 18px ${CATEGORY_META[activeCategory].color}20`,
              }}
            >
              <CheckCircle2 style={{ width: '16px', height: '16px' }} />
              Save {CATEGORY_META[activeCategory].label}
            </button>
          )
        )}
      </div>

      {showSuggest && (
        <SuggestModal
          defaultCategory={activeCategory}
          goalieId={user?.id ?? ''}
          goalieDisplayName={user?.displayName ?? undefined}
          onClose={() => setShowSuggest(false)}
        />
      )}
    </div>
  );
}
