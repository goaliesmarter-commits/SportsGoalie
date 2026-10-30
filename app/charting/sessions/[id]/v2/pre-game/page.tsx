'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { useRouter, useParams } from 'next/navigation';
import { chartingService } from '@/lib/database';
import { Session, V2PreGameData, MindManagementStartTime } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import {
  ContextualHelp,
  RotatingNumberSelector,
  YesNoToggle,
  VoiceRecorder,
} from '@/components/charting/inputs';
import { toast } from 'sonner';
import { useEventVoice } from '@/hooks/useEventVoice';
import { hasPreGameAnswer } from '@/lib/charting/v2-sections';

// ─── Start Time Options ──────────────────────────────────────────────────────

const START_TIME_OPTIONS = [
  { value: 'at_the_rink' as MindManagementStartTime, label: 'At the rink' },
  { value: '1_hour_before' as MindManagementStartTime, label: '1 hour before' },
  { value: '2_hours_before' as MindManagementStartTime, label: '2 hours before' },
  { value: '3_plus_hours_before' as MindManagementStartTime, label: '3+ hours before' },
  { value: 'wake_up_thinking' as MindManagementStartTime, label: 'I wake up thinking about it' },
];

const MENTAL_STATE_OPTIONS = [
  { value: 1, label: '1 — Already anxious' },
  { value: 2, label: '2 — A bit uneasy' },
  { value: 3, label: '3 — Neutral' },
  { value: 4, label: '4 — Feeling good' },
  { value: 5, label: '5 — Calm and ready' },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function V2PreGamePage() {
  const { user } = useAuth();
  const router = useRouter();
  const say = useEventVoice();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Every answer starts blank. The form used to open with "At the rink", a
  // mental state of 1, routine and target met, and no stress already chosen, so
  // a goalie who skipped a question was recorded as having given that answer.
  const [formData, setFormData] = useState<V2PreGameData>({});

  // ── Load session & existing v2 data ──────────────────────────────────────
  useEffect(() => {
    if (!user || !sessionId) return;
    const load = async () => {
      setLoading(true);
      try {
        const sessionResult = await chartingService.getSession(sessionId);
        if (sessionResult.success && sessionResult.data) {
          setSession(sessionResult.data);
        }

        // Try to load existing v2 entry
        const entriesResult = await chartingService.getChartingEntriesBySession(sessionId);
        if (entriesResult.success && entriesResult.data) {
          const myEntry = entriesResult.data.find(e => e.submittedBy === user.id);
          if (myEntry) {
            // Check for v2 pre-game data stored in the entry
            const v2Data = (myEntry as unknown as { v2PreGame?: V2PreGameData }).v2PreGame;
            if (v2Data) {
              setFormData(v2Data);
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

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !session) return;
    if (!hasPreGameAnswer(formData)) {
      toast.error('Answer at least one question before saving.');
      return;
    }
    setSaving(true);
    try {
      // Load existing entry to preserve other sections
      const entriesResult = await chartingService.getChartingEntriesBySession(sessionId);
      const existingEntries = entriesResult.success ? entriesResult.data || [] : [];
      const myEntry = existingEntries.find(e => e.submittedBy === user.id);

      const entryData: Record<string, unknown> = {
        sessionId: session.id,
        studentId: session.studentId,
        submittedBy: user.id,
        submitterRole: (user.role || 'student') as 'student' | 'admin',
        v2PreGame: formData,
        v2Version: 'v2',
      };

      if (myEntry) {
        // Preserve existing fields
        const preserveFields = ['gameOverview', 'period1', 'period2', 'period3', 'overtime', 'shootout', 'postGame', 'preGame', 'v2Periods', 'v2PostGame'] as const;
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

      toast.success('Pre-Game section saved!');
      say('nextStep', 'pre-game');
      router.push(`/charting/sessions/${sessionId}/v2/periods`);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  // ── Update helpers ───────────────────────────────────────────────────────
  const update = <K extends keyof V2PreGameData>(key: K, value: V2PreGameData[K]) => {
    setFormData((prev: V2PreGameData) => ({ ...prev, [key]: value }));
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ background: '#041830' }}>
        <SkeletonContentPage />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#041830' }}>
        <div className="text-center space-y-3">
          <p className="text-white/60">Session not found</p>
          <Button variant="outline" onClick={() => router.push('/charting')} className="border-[rgba(55,181,255,0.35)] text-white/70 hover:text-white hover:bg-[rgba(55,181,255,0.15)]">Back to Sessions</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#041830' }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 backdrop-blur-md border-b" style={{ background: 'rgba(6,30,58,0.97)', borderColor: 'rgba(55,181,255,0.18)' }}>
        <div className="flex items-center justify-between px-6 h-16">
          <button
            type="button"
            onClick={() => router.push(`/charting/sessions/${sessionId}`)}
            className="flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-[#7dd3fc] to-white bg-clip-text text-transparent">
            Pre-Game
          </h1>
          <div className="w-16" />
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className="px-8 py-6 space-y-8">

        {/* Section header */}
        <div>
          <h2 className="text-3xl font-black text-white">Mind Management</h2>
          <p className="text-sm text-white/50 mt-1">
            Complete before leaving for the rink. Not at the rink.
          </p>
        </div>

        <div className="space-y-5">

          {/* 1. Personal Start Time */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.28)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <ContextualHelp
              label="Personal Start Time"
              helpText="When does your Mind Management begin? This tracks how early you start preparing mentally before the game."
            >
              <RotatingNumberSelector
                value={formData.personalStartTime}
                onChange={(val) => update('personalStartTime', val as MindManagementStartTime)}
                options={START_TIME_OPTIONS}
              />
            </ContextualHelp>
          </div>

          {/* 2. Mental State Check-in */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.28)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <ContextualHelp
              label="Mental State Check-in"
              helpText="Where are you arriving from mentally? Rate how you feel right now. A low rating will prompt a voice note to capture what's on your mind."
            >
              <RotatingNumberSelector
                value={formData.mentalStateRating}
                onChange={(val) => update('mentalStateRating', val as number)}
                options={MENTAL_STATE_OPTIONS}
              />
            </ContextualHelp>

            {/* Conditional voice for low ratings */}
            {formData.mentalStateRating !== undefined && formData.mentalStateRating <= 2 && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t" style={{ borderColor: 'rgba(55,181,255,0.15)' }}>
                <p className="text-xs text-white/60 mb-2 italic">What is on your mind?</p>
                <VoiceRecorder
                  onTranscriptionComplete={(text) => update('mentalStateVoiceNote', text)}
                  initialText={formData.mentalStateVoiceNote}
                  placeholder="Tap the mic to describe what's on your mind..."
                />
              </div>
            )}
          </div>

          {/* 3. Routine Completed */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.28)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <ContextualHelp
              label="Routine Completed?"
              helpText="Did you complete your pre-game routine? Your routine is your anchor — it sets the stage for how you'll perform."
            >
              <YesNoToggle
                value={formData.routineCompleted ?? null}
                onChange={(val) => update('routineCompleted', val)}
                yesVoicePrompt="How did it go? Any highlights?"
                noVoicePrompt="What got in the way?"
                onVoiceComplete={(text) => update('routineVoiceNote', text)}
                initialVoiceText={formData.routineVoiceNote}
              />
            </ContextualHelp>
          </div>

          {/* 4. Anxiety Present */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.28)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <ContextualHelp
              label="Pre-Game Stress?"
              helpText="If anxiety is present, this is normal. What matters is what you do with it. Your response feeds your Mind Vault — methods that work get stored."
            >
              <YesNoToggle
                value={formData.anxietyPresent ?? null}
                onChange={(val) => update('anxietyPresent', val)}
                yesVoicePrompt="What did you do with it?"
                noVoicePrompt="How are you feeling going into the game?"
                onVoiceComplete={(text) => update('anxietyVoiceNote', text)}
                initialVoiceText={formData.anxietyVoiceNote}
              />
            </ContextualHelp>
          </div>

          {/* 5. Target State Achieved */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.28)', boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
            <ContextualHelp
              label="Target State Achieved?"
              helpText="Excited, calm, controlled — did you get there? Your target state is the mental place you need to be before competing."
            >
              <YesNoToggle
                value={formData.targetStateAchieved ?? null}
                onChange={(val) => update('targetStateAchieved', val)}
                yesVoicePrompt="Describe your mental state right now."
                noVoicePrompt="What happened?"
                onVoiceComplete={(text) => update('targetStateVoiceNote', text)}
                initialVoiceText={formData.targetStateVoiceNote}
              />
            </ContextualHelp>
          </div>
        </div>

        {/* ── Bottom save bar ─────────────────────────────────────────────── */}
        <div className="pb-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto h-10 text-white rounded-lg text-sm font-bold px-8 border-0"
            style={{ background: '#7dd3fc', boxShadow: '0 4px 14px rgba(55,181,255,0.35)' }}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Pre-Game</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
