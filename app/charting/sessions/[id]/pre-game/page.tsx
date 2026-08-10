'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { useRouter, useParams } from 'next/navigation';
import { chartingService } from '@/lib/database';
import { Session, ChartingEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { YesNoField, createEmptyYesNo } from '@/components/charting/YesNoField';
import { toast } from 'sonner';

export default function PreGamePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [existingEntry, setExistingEntry] = useState<ChartingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    gameReadiness: {
      wellRested: createEmptyYesNo(),
      fueledForGame: createEmptyYesNo(),
    },
    mindSet: {
      mindCleared: createEmptyYesNo(),
      mentalImagery: createEmptyYesNo(),
    },
    preGameRoutine: {
      ballExercises: createEmptyYesNo(),
      stretching: createEmptyYesNo(),
      other: createEmptyYesNo(),
    },
    warmUp: {
      lookedEngaged: createEmptyYesNo(),
      lackedFocus: createEmptyYesNo(),
      teamWarmUpNeedsAdjustment: createEmptyYesNo(),
    },
  });

  useEffect(() => {
    loadData();
  }, [sessionId, user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [sessionResult, entriesResult] = await Promise.all([
        chartingService.getSession(sessionId),
        chartingService.getChartingEntriesBySession(sessionId),
      ]);

      if (sessionResult.success && sessionResult.data) {
        setSession(sessionResult.data);
      }

      if (entriesResult.success && entriesResult.data) {
        const myEntry = entriesResult.data.find((e) => e.submittedBy === user.id);
        if (myEntry) {
          setExistingEntry(myEntry);
          if (myEntry.preGame) {
            setFormData(myEntry.preGame);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !session) return;

    try {
      setSaving(true);

      const entryData: any = {
        sessionId: session.id,
        studentId: session.studentId,
        submittedBy: user.id,
        submitterRole: (user.role || 'student') as 'student' | 'admin',
        preGame: formData,
      };

      // Preserve existing data from other sections
      if (existingEntry) {
        if (existingEntry.gameOverview) entryData.gameOverview = existingEntry.gameOverview;
        if (existingEntry.period1) entryData.period1 = existingEntry.period1;
        if (existingEntry.period2) entryData.period2 = existingEntry.period2;
        if (existingEntry.period3) entryData.period3 = existingEntry.period3;
        if (existingEntry.overtime) entryData.overtime = existingEntry.overtime;
        if (existingEntry.shootout) entryData.shootout = existingEntry.shootout;
        if (existingEntry.postGame) entryData.postGame = existingEntry.postGame;
        if (existingEntry.additionalComments) entryData.additionalComments = existingEntry.additionalComments;

        await chartingService.updateChartingEntry(existingEntry.id, entryData);
        toast.success('Pre-Game section saved successfully!');
        router.push(`/charting/sessions/${sessionId}/periods`);
      } else {
        const result = await chartingService.createChartingEntry(entryData);
        if (result.success && result.data) {
          const newEntryResult = await chartingService.getChartingEntry(result.data.id);
          if (newEntryResult.success && newEntryResult.data) {
            setExistingEntry(newEntryResult.data);
          }
        }
        toast.success('Pre-Game section created successfully!');
        router.push(`/charting/sessions/${sessionId}/periods`);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section: string, field: string, key: 'value' | 'comments', value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: {
          ...(prev[section as keyof typeof prev] as any)[field],
          [key]: value,
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <SkeletonContentPage />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p>Session not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push(`/charting/sessions/${sessionId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pre-Game Checklist</h1>
              <p className="text-gray-600">
                {session.type === 'game' ? '🥅 Game' : '🏒 Practice'}
                  {session.opponent && (session.type === 'game' ? ` vs ${session.opponent}` : ` - ${session.opponent}`)}
              </p>
            </div>
          </div>
        </div>

        {/* Game Readiness */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Game Readiness</h2>
          <div className="space-y-4">
            <YesNoField
              label="Well Rested"
              value={formData.gameReadiness.wellRested.value}
              comments={formData.gameReadiness.wellRested.comments}
              onChange={(k, v) => updateField('gameReadiness', 'wellRested', k, v)}
            />
            <YesNoField
              label="Fueled for Game"
              value={formData.gameReadiness.fueledForGame.value}
              comments={formData.gameReadiness.fueledForGame.comments}
              onChange={(k, v) => updateField('gameReadiness', 'fueledForGame', k, v)}
            />
          </div>
        </Card>

        {/* MindSet */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">MindSet</h2>
          <div className="space-y-4">
            <YesNoField
              label="Mind Cleared"
              value={formData.mindSet.mindCleared.value}
              comments={formData.mindSet.mindCleared.comments}
              onChange={(k, v) => updateField('mindSet', 'mindCleared', k, v)}
            />
            <YesNoField
              label="Mental Imagery"
              value={formData.mindSet.mentalImagery.value}
              comments={formData.mindSet.mentalImagery.comments}
              onChange={(k, v) => updateField('mindSet', 'mentalImagery', k, v)}
            />
          </div>
        </Card>

        {/* Pre-Game Routine */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pre-Game Routine</h2>
          <div className="space-y-4">
            <YesNoField
              label="Ball Exercises"
              value={formData.preGameRoutine.ballExercises.value}
              comments={formData.preGameRoutine.ballExercises.comments}
              onChange={(k, v) => updateField('preGameRoutine', 'ballExercises', k, v)}
            />
            <YesNoField
              label="Stretching"
              value={formData.preGameRoutine.stretching.value}
              comments={formData.preGameRoutine.stretching.comments}
              onChange={(k, v) => updateField('preGameRoutine', 'stretching', k, v)}
            />
            <YesNoField
              label="Other"
              value={formData.preGameRoutine.other.value}
              comments={formData.preGameRoutine.other.comments}
              onChange={(k, v) => updateField('preGameRoutine', 'other', k, v)}
            />
          </div>
        </Card>

        {/* Warm-Up */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Warm-Up</h2>
          <div className="space-y-4">
            <YesNoField
              label="Looked Engaged"
              value={formData.warmUp.lookedEngaged.value}
              comments={formData.warmUp.lookedEngaged.comments}
              onChange={(k, v) => updateField('warmUp', 'lookedEngaged', k, v)}
            />
            <YesNoField
              label="Lacked Focus"
              value={formData.warmUp.lackedFocus.value}
              comments={formData.warmUp.lackedFocus.comments}
              onChange={(k, v) => updateField('warmUp', 'lackedFocus', k, v)}
            />
            <YesNoField
              label="Team Warm-Up Needs Adjustment"
              value={formData.warmUp.teamWarmUpNeedsAdjustment.value}
              comments={formData.warmUp.teamWarmUpNeedsAdjustment.comments}
              onChange={(k, v) => updateField('warmUp', 'teamWarmUpNeedsAdjustment', k, v)}
            />
          </div>
        </Card>

        {/* Save Button Footer */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Save Pre-Game
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
