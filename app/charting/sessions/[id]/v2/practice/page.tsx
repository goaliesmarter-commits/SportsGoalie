'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { useRouter, useParams } from 'next/navigation';
import { chartingService } from '@/lib/database';
import {
  Session,
  V2PracticeChartEntry,
  PracticeIndexItem,
  PracticeIndexCategory,
  ChartingEntry,
} from '@/types';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Save, Loader2, Plus, X,
  Flame, Sparkles, ShieldCheck,
  Video, Eye, Brain, Target, CheckCircle2, Clock, Info, ArrowRight,
} from 'lucide-react';
import { getPillarUrl } from '@/lib/utils/pillars';
import type { PillarSlug } from '@/types';
import {
  ContextualHelp,
  RotatingNumberSelector,
  YesNoToggle,
  VoiceRecorder,
} from '@/components/charting/inputs';
import { toast } from 'sonner';
import { useEventVoice } from '@/hooks/useEventVoice';
import { growthPointsService } from '@/lib/firebase/growth-points.service';
import { GROWTH_POINTS } from '@/lib/config/growth-points';

// ─── Options ─────────────────────────────────────────────────────────────────

const PRACTICE_VALUE_OPTIONS = [
  { value: 1, label: '1 — Wasted time' },
  { value: 2, label: '2 — Below average' },
  { value: 3, label: '3 — Some value' },
  { value: 4, label: '4 — High value' },
  { value: 5, label: '5 — Elite session' },
];

const DURATION_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: (i + 1) * 5,
  label: `${(i + 1) * 5} min`,
}));

const TECHNICAL_EYE_OPTIONS = [
  { value: 1, label: '1 — Couldn\'t evaluate' },
  { value: 2, label: '2 — Saw very little' },
  { value: 3, label: '3 — Saw some things' },
  { value: 4, label: '4 — Mostly clear' },
  { value: 5, label: '5 — Saw everything' },
];

const IMPROVEMENT_OPTIONS = [
  { value: 1, label: '1 — Got worse / no change' },
  { value: 2, label: '2 — Slight progress' },
  { value: 3, label: '3 — Noticeable improvement' },
  { value: 4, label: '4 — Strong improvement' },
  { value: 5, label: '5 — Owned it' },
];

// ─── Category Config ──────────────────────────────────────────────────────────

interface CategoryConfig {
  key: PracticeIndexCategory;
  label: string;
  description: string;
  accent: string;
  ring: string;
  chip: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'immediate_development',
    label: 'Immediate Dev',
    description: 'Broke down — needs focused work',
    accent: 'text-red-400',
    ring: 'border-red-800/40 bg-red-900/20',
    chip: 'bg-red-500/20 text-red-400',
    icon: Flame,
  },
  {
    key: 'refinement',
    label: 'Refinement',
    description: 'Getting better — keep working',
    accent: 'text-blue-400',
    ring: 'border-blue-800/40 bg-blue-900/20',
    chip: 'bg-blue-500/20 text-blue-400',
    icon: Sparkles,
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Under control — keep sharp',
    accent: 'text-slate-400',
    ring: 'border-slate-700/30 bg-slate-800/20',
    chip: 'bg-slate-500/20 text-slate-400',
    icon: ShieldCheck,
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type PracticeFormData = Omit<
  V2PracticeChartEntry,
  'id' | 'sessionId' | 'studentId' | 'version' | 'createdAt' | 'updatedAt'
>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createEmptyForm = (): PracticeFormData => ({
  practiceIndex: [],
  practiceValueRating: 1,
  designatedTrainingReceived: false,
  designatedTrainingDuration: undefined,
  indexItemsWorkedOn: [],
  videoCaptured: false,
  videoUrl: undefined,
  improvementRatings: [],
  mindVaultEntry: '',
  technicalEyeDevelopmentRating: 1,
});

const newItemId = () =>
  `pi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function V2PracticeChartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const say = useEventVoice();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PracticeFormData>(createEmptyForm());

  // Draft state for adding a new index item in each category
  const [draftLabel, setDraftLabel] = useState<Record<PracticeIndexCategory, string>>({
    immediate_development: '',
    refinement: '',
    maintenance: '',
  });

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !sessionId) return;
    const load = async () => {
      setLoading(true);
      try {
        const sessionResult = await chartingService.getSession(sessionId);
        const loadedSession = sessionResult.success ? sessionResult.data : null;
        if (loadedSession) setSession(loadedSession);

        const entriesResult = await chartingService.getChartingEntriesBySession(sessionId);
        if (entriesResult.success && entriesResult.data) {
          const myEntry = entriesResult.data.find((e) => e.submittedBy === user.id);
          if (myEntry) {
            const existing = (myEntry as unknown as { v2Practice?: PracticeFormData }).v2Practice;
            if (existing && (existing.practiceIndex ?? []).length > 0) {
              // Already has a practice index — load it as-is
              setFormData({
                ...createEmptyForm(),
                ...existing,
                practiceIndex: existing.practiceIndex ?? [],
                indexItemsWorkedOn: existing.indexItemsWorkedOn ?? [],
                improvementRatings: existing.improvementRatings ?? [],
              });
              return;
            }
          }
        }

        // Practice index is empty — try to pre-populate from most recent game entry
        if (loadedSession?.studentId) {
          const recentResult = await chartingService.getChartingEntriesByStudent(
            loadedSession.studentId,
            10,
          );
          if (recentResult.success && recentResult.data) {
            const gameEntry = recentResult.data.find((e) => {
              const typed = e as unknown as ChartingEntry & { v2PracticeIndex?: PracticeIndexItem[] };
              return typed.v2PracticeIndex && typed.v2PracticeIndex.length > 0;
            });
            if (gameEntry) {
              const autoItems = (gameEntry as unknown as { v2PracticeIndex: PracticeIndexItem[] }).v2PracticeIndex;
              setFormData((prev) => ({ ...prev, practiceIndex: autoItems }));
            }
          }
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        toast.error('Failed to load session data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, sessionId]);

  // ── Mutators ─────────────────────────────────────────────────────────────
  const update = <K extends keyof PracticeFormData>(key: K, value: PracticeFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const addIndexItem = (category: PracticeIndexCategory) => {
    const label = draftLabel[category].trim();
    if (!label) return;
    const priority =
      category === 'immediate_development' ? 1 : category === 'refinement' ? 2 : 3;
    const item: PracticeIndexItem = {
      id: newItemId(),
      label,
      category,
      priority,
    };
    setFormData((prev) => ({ ...prev, practiceIndex: [...prev.practiceIndex, item] }));
    setDraftLabel((prev) => ({ ...prev, [category]: '' }));
  };

  const removeIndexItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      practiceIndex: prev.practiceIndex.filter((i) => i.id !== id),
      indexItemsWorkedOn: prev.indexItemsWorkedOn.filter((i) => i !== id),
      improvementRatings: prev.improvementRatings.filter((r) => r.itemId !== id),
    }));
  };

  const toggleWorkedOn = (id: string) => {
    setFormData((prev) => {
      const worked = prev.indexItemsWorkedOn.includes(id);
      const nextWorked = worked
        ? prev.indexItemsWorkedOn.filter((i) => i !== id)
        : [...prev.indexItemsWorkedOn, id];
      const nextRatings = worked
        ? prev.improvementRatings.filter((r) => r.itemId !== id)
        : prev.improvementRatings.find((r) => r.itemId === id)
        ? prev.improvementRatings
        : [...prev.improvementRatings, { itemId: id, rating: 1 }];
      return { ...prev, indexItemsWorkedOn: nextWorked, improvementRatings: nextRatings };
    });
  };

  const setImprovement = (itemId: string, rating: number) => {
    setFormData((prev) => ({
      ...prev,
      improvementRatings: prev.improvementRatings.some((r) => r.itemId === itemId)
        ? prev.improvementRatings.map((r) => (r.itemId === itemId ? { ...r, rating } : r))
        : [...prev.improvementRatings, { itemId, rating }],
    }));
  };

  const groupedIndex = useMemo(() => {
    const by: Record<PracticeIndexCategory, PracticeIndexItem[]> = {
      immediate_development: [],
      refinement: [],
      maintenance: [],
    };
    formData.practiceIndex.forEach((item) => by[item.category].push(item));
    return by;
  }, [formData.practiceIndex]);

  const workedOnItems = useMemo(
    () =>
      formData.practiceIndex.filter((i) => formData.indexItemsWorkedOn.includes(i.id)),
    [formData.practiceIndex, formData.indexItemsWorkedOn]
  );

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !session) return;
    setSaving(true);
    try {
      const entriesResult = await chartingService.getChartingEntriesBySession(sessionId);
      const existingEntries = entriesResult.success ? entriesResult.data || [] : [];
      const myEntry = existingEntries.find((e) => e.submittedBy === user.id);

      const entryData: Record<string, unknown> = {
        sessionId: session.id,
        studentId: session.studentId,
        submittedBy: user.id,
        submitterRole: (user.role || 'student') as 'student' | 'admin',
        v2Practice: formData,
        v2Version: 'v2',
      };

      if (myEntry) {
        const preserveFields = [
          'gameOverview',
          'period1',
          'period2',
          'period3',
          'overtime',
          'shootout',
          'postGame',
          'preGame',
          'v2PreGame',
          'v2Periods',
          'v2PostGame',
        ] as const;
        for (const field of preserveFields) {
          const val = (myEntry as unknown as Record<string, unknown>)[field];
          if (val) entryData[field] = val;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await chartingService.updateChartingEntry(myEntry.id, entryData as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await chartingService.createChartingEntry(entryData as any);
      }

      await chartingService.updateSession(sessionId, { status: 'completed' });
      growthPointsService.awardPointsOnce(
        user!.id, 'CHART_LOGGED', GROWTH_POINTS.CHART_LOGGED, 'Chart Logged', `chart_${sessionId}`
      ).catch(() => {});

      toast.success('Practice chart saved!');
      say('chartSaved');
      router.push(`/charting/sessions/${sessionId}`);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save practice chart');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-6" style={{ background: '#041830' }}>
        <SkeletonContentPage />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#041830' }}>
        <div className="text-center space-y-3">
          <p className="text-white/60">Session not found</p>
          <Button variant="outline" onClick={() => router.push('/charting')} className="border-[rgba(55,181,255,0.3)] text-white/70 hover:text-white hover:bg-[rgba(52,211,153,0.1)]">
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  const totalIndexItems = formData.practiceIndex.length;
  const totalWorkedOn = formData.indexItemsWorkedOn.length;

  return (
    <div className="min-h-screen" style={{ background: '#041830' }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 backdrop-blur-md border-b" style={{ background: 'rgba(6,30,58,0.97)', borderColor: 'rgba(52,211,153,0.14)' }}>
        <div className="flex items-center justify-between px-4 md:px-6 h-14 md:h-16 max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => router.push(`/charting/sessions/${sessionId}`)}
            className="flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-base md:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-[#34d399] to-white bg-clip-text text-transparent">
            Practice Chart
          </h1>
          <div className="w-16" />
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Intro */}
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white">
            New Practice Revolution
          </h2>
          <p className="text-sm text-white/50 mt-1 max-w-2xl">
            The game identifies what needs work. You decide where to spend your minutes.
            Every practice is intentional.
          </p>
        </div>

        {/* ── Practice Index Dashboard ───────────────────────────────────── */}
        <section className="rounded-2xl p-4 md:p-6 space-y-4" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(52,211,153,0.14)' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,211,153,0.1)' }}>
              <Target className="w-4 h-4" style={{ color: '#34d399' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white">Practice Index</h3>
              <p className="text-xs text-white/40 mt-0.5">
                Your priority list heading into practice. Select what you worked on today.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-white/40 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Clock className="w-3.5 h-3.5" />
              20 min → pick 2 · 60 min → pick 5
            </div>
          </div>

          {totalIndexItems === 0 && (
            <div className="rounded-xl p-3 flex gap-2.5 text-xs text-white/60" style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.14)' }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#34d399' }} />
              <p className="leading-relaxed">
                No items from your last game were found. Add items manually in any category below.
                Items you select will feed into the improvement ratings further down.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const items = groupedIndex[cat.key];
              return (
                <div
                  key={cat.key}
                  className={`rounded-xl border ${cat.ring} p-3 md:p-4 flex flex-col gap-3 min-h-[200px]`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cat.accent}`} />
                    <p className={`text-xs font-bold uppercase tracking-wider ${cat.accent}`}>
                      {cat.label}
                    </p>
                    {items.length > 0 && (
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.chip}`}>
                        {items.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/35 leading-relaxed -mt-1">
                    {cat.description}
                  </p>

                  {/* Items */}
                  <div className="space-y-1.5 flex-1">
                    {items.length === 0 ? (
                      <p className="text-[11px] text-white/25 italic">No items yet.</p>
                    ) : (
                      items.map((item) => {
                        const isSelected = formData.indexItemsWorkedOn.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className="group flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors"
                            style={isSelected
                              ? { background: 'rgba(52,211,153,0.1)', borderColor: '#34d399', boxShadow: '0 0 0 1px rgba(52,211,153,0.25)' }
                              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }
                            }
                          >
                            <button
                              type="button"
                              onClick={() => toggleWorkedOn(item.id)}
                              className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-white/20 bg-transparent hover:border-[#34d399]'
                              }`}
                              aria-label={isSelected ? 'Deselect item' : 'Mark as worked on'}
                            >
                              {isSelected && (
                                <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleWorkedOn(item.id)}
                                className="w-full text-left text-xs font-medium text-white/80 leading-snug"
                              >
                                {item.label}
                              </button>
                              {item.pillarSlug && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); router.push(getPillarUrl(item.pillarSlug as PillarSlug)); }}
                                  className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-opacity hover:opacity-70"
                                  style={{ background: 'rgba(55,181,255,0.12)', color: 'rgba(125,211,252,0.8)', border: '1px solid rgba(55,181,255,0.2)' }}
                                >
                                  {item.pillarSlug.replace(/_/g, ' ')}
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeIndexItem(item.id)}
                              className="flex-shrink-0 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              aria-label="Remove item"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add draft */}
                  <div className="flex gap-1.5 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <input
                      type="text"
                      value={draftLabel[cat.key]}
                      onChange={(e) =>
                        setDraftLabel((prev) => ({ ...prev, [cat.key]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addIndexItem(cat.key);
                        }
                      }}
                      placeholder="Add item…"
                      className="flex-1 min-w-0 text-xs rounded-md px-2 py-1.5 focus:outline-none text-white/80 placeholder:text-white/25"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <button
                      type="button"
                      onClick={() => addIndexItem(cat.key)}
                      disabled={!draftLabel[cat.key].trim()}
                      className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity"
                      style={{ background: '#34d399', color: '#fff' }}
                      aria-label="Add item"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalIndexItems > 0 && (
            <div className="flex items-center justify-between text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-white/50">
                <span className="font-bold text-white">{totalWorkedOn}</span> of{' '}
                <span className="font-bold text-white">{totalIndexItems}</span>{' '}items
                selected for today&apos;s session
              </span>
              <span className="text-white/25">#3 · Index items worked on</span>
            </div>
          )}
        </section>

        {/* ── Core Fields ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* #1 Practice Value Rating */}
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(52,211,153,0.14)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: '#34d399' }}>
              #1 · Practice Value
            </span>
            <ContextualHelp
              label="How much of this practice developed you?"
              helpText="1 = Wasted time, no designated training. 3 = Some value. 5 = Highly productive, designated training, intentional work. Tracked over time this reveals practice-format patterns."
            >
              <RotatingNumberSelector
                value={formData.practiceValueRating}
                onChange={(v) => update('practiceValueRating', v as number)}
                options={PRACTICE_VALUE_OPTIONS}
              />
            </ContextualHelp>
          </div>

          {/* #2 Designated Training */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(52,211,153,0.14)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#34d399' }}>
              #2 · Designated Training
            </span>
            <ContextualHelp
              label="Did you get designated goalie training?"
              helpText="Did you get designated goalie training time today? If yes, log the duration in 5-minute increments. This data is the organizational pitch proof point."
            >
              <YesNoToggle
                value={formData.designatedTrainingReceived}
                onChange={(v) => {
                  update('designatedTrainingReceived', v);
                  if (!v) update('designatedTrainingDuration', undefined);
                }}
              />
            </ContextualHelp>

            {formData.designatedTrainingReceived && (
              <div className="pt-2 border-t space-y-2 animate-in fade-in slide-in-from-top-1 duration-200" style={{ borderColor: 'rgba(52,211,153,0.1)' }}>
                <p className="text-xs font-semibold text-white/70">
                  How long? (5-minute increments)
                </p>
                <RotatingNumberSelector
                  value={formData.designatedTrainingDuration ?? 15}
                  onChange={(v) => update('designatedTrainingDuration', v as number)}
                  options={DURATION_OPTIONS}
                />
              </div>
            )}
          </div>

          {/* #4 Video Captured */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(52,211,153,0.14)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#34d399' }}>
              #4 · Video
            </span>
            <ContextualHelp
              label="Was your practice filmed today?"
              helpText="If yes, mentor-review subscribers can upload footage for review. Standard subscribers see an upgrade prompt."
            >
              <YesNoToggle
                value={formData.videoCaptured}
                onChange={(v) => update('videoCaptured', v)}
              />
            </ContextualHelp>

            {formData.videoCaptured && (
              <div className="pt-2 border-t animate-in fade-in slide-in-from-top-1 duration-200" style={{ borderColor: 'rgba(52,211,153,0.1)' }}>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', color: '#34d399' }}>
                  <Video className="w-3.5 h-3.5" />
                  Upload flow for mentor review coming soon.
                </div>
              </div>
            )}
          </div>

          {/* #7 Technical Eye */}
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(52,211,153,0.14)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: '#34d399' }}>
              #7 · Technical Eye
            </span>
            <ContextualHelp
              label="How clearly did you see your own performance?"
              helpText="1 = Could not evaluate objectively. 3 = Saw some things clearly. 5 = Saw everything clearly — know exactly what happened and why. This is your Technical Eye developing, tracked as a MLI milestone."
            >
              <RotatingNumberSelector
                value={formData.technicalEyeDevelopmentRating}
                onChange={(v) => update('technicalEyeDevelopmentRating', v as number)}
                options={TECHNICAL_EYE_OPTIONS}
              />
            </ContextualHelp>
          </div>
        </div>

        {/* ── #5 Improvement Ratings ────────────────────────────────────── */}
        {workedOnItems.length > 0 && (
          <section className="rounded-2xl p-4 md:p-6 space-y-4" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(52,211,153,0.14)' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,211,153,0.1)' }}>
                <Eye className="w-4 h-4" style={{ color: '#34d399' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  #5 · Did it improve?
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Rate each item you worked on. Improving → Refinement. Owned →
                  Maintenance. Stuck → stays Immediate Development.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {workedOnItems.map((item) => {
                const rating =
                  formData.improvementRatings.find((r) => r.itemId === item.id)?.rating ?? 3;
                const catMeta = CATEGORIES.find((c) => c.key === item.category)!;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl p-3 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${catMeta.chip}`}>
                        {catMeta.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug">
                      {item.label}
                    </p>
                    <RotatingNumberSelector
                      value={rating}
                      onChange={(v) => setImprovement(item.id, v as number)}
                      options={IMPROVEMENT_OPTIONS}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── #6 Mind Vault ──────────────────────────────────────────────── */}
        <section className="rounded-2xl p-4 md:p-6" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(52,211,153,0.14)' }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(52,211,153,0.1)' }}>
              <Brain className="w-4 h-4" style={{ color: '#34d399' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">#6 · One thing for the Mind Vault</h3>
              <p className="text-xs text-white/40 mt-0.5">
                What did you confirm or discover today that belongs in your Mind Vault?
                Every practice adds something.
              </p>
            </div>
          </div>
          <VoiceRecorder
            onTranscriptionComplete={(text) => update('mindVaultEntry', text)}
            initialText={formData.mindVaultEntry}
            placeholder="Tap to record one thing worth keeping..."
          />
        </section>

        {/* ── Bottom save bar ────────────────────────────────────────────── */}
        <div className="pt-2 pb-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto h-11 rounded-lg text-sm font-bold px-8 border-0"
            style={{ background: 'linear-gradient(135deg, #37b5ff, #0ea5e9)', color: '#fff', boxShadow: '0 4px 14px rgba(55,181,255,0.3)' }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Practice Chart
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
