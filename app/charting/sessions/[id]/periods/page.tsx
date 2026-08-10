'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { useRouter, useParams } from 'next/navigation';
import { chartingService } from '@/lib/database';
import { Session, ChartingEntry, PeriodData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { createEmptyYesNo } from '@/components/charting/YesNoField';
import { RadioSelectField } from '@/components/charting/RadioSelectField';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Helper functions to convert between yes/no fields and radio selection
const getSelectedOption = (fields: Record<string, { value: boolean; comments: string }>): { value: string; comments: string } => {
  const selected = Object.entries(fields).find(([_, field]) => field.value);
  return {
    value: selected ? selected[0] : '',
    comments: selected ? selected[1].comments : Object.values(fields)[0]?.comments || '',
  };
};

const updateRadioSelection = (
  fields: Record<string, { value: boolean; comments: string }>,
  selectedValue: string,
  comments: string
): Record<string, { value: boolean; comments: string }> => {
  const updated: Record<string, { value: boolean; comments: string }> = {};
  Object.keys(fields).forEach((key) => {
    updated[key] = {
      value: key === selectedValue,
      comments: key === selectedValue ? comments : '',
    };
  });
  return updated;
};

const createEmptyPeriodData = (): PeriodData => ({
  mindSet: {
    focusConsistent: createEmptyYesNo(),
    focusInconsistent: createEmptyYesNo(),
    decisionMakingStrong: createEmptyYesNo(),
    decisionMakingImproving: createEmptyYesNo(),
    decisionMakingNeedsWork: createEmptyYesNo(),
    bodyLanguageConsistent: createEmptyYesNo(),
    bodyLanguageInconsistent: createEmptyYesNo(),
  },
  skating: {
    inSyncWithPuck: createEmptyYesNo(),
    improving: createEmptyYesNo(),
    weak: createEmptyYesNo(),
    notInSync: createEmptyYesNo(),
  },
  positionalAboveIcing: {
    poor: createEmptyYesNo(),
    improving: createEmptyYesNo(),
    good: createEmptyYesNo(),
    angleIssue: {
      selectedAngles: [],
      comments: '',
    },
  },
  positionalBelowIcing: {
    poor: createEmptyYesNo(),
    improving: createEmptyYesNo(),
    good: createEmptyYesNo(),
    strong: createEmptyYesNo(),
  },
  reboundControl: {
    poor: createEmptyYesNo(),
    improving: createEmptyYesNo(),
    good: createEmptyYesNo(),
    consistent: createEmptyYesNo(),
    inconsistent: createEmptyYesNo(),
  },
  freezingPuck: {
    poor: createEmptyYesNo(),
    improving: createEmptyYesNo(),
    good: createEmptyYesNo(),
    consistent: createEmptyYesNo(),
    inconsistent: createEmptyYesNo(),
  },
});

export default function PeriodsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [existingEntry, setExistingEntry] = useState<ChartingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePeriod, setActivePeriod] = useState('period1');

  const [period1Data, setPeriod1Data] = useState<PeriodData>(createEmptyPeriodData());
  const [period2Data, setPeriod2Data] = useState<PeriodData>(createEmptyPeriodData());
  const [period3Data, setPeriod3Data] = useState<PeriodData>({
    ...createEmptyPeriodData(),
    teamPlay: {
      settingUpDefense: {
        poor: createEmptyYesNo(),
        improving: createEmptyYesNo(),
        good: createEmptyYesNo(),
      },
      settingUpForwards: {
        poor: createEmptyYesNo(),
        improving: createEmptyYesNo(),
        good: createEmptyYesNo(),
      },
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
          if (myEntry.period1) setPeriod1Data(myEntry.period1);
          if (myEntry.period2) setPeriod2Data(myEntry.period2);
          if (myEntry.period3) setPeriod3Data(myEntry.period3);
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
        period1: period1Data,
        period2: period2Data,
        period3: period3Data,
      };

      // Preserve existing data from other sections
      if (existingEntry) {
        if (existingEntry.preGame) entryData.preGame = existingEntry.preGame;
        if (existingEntry.gameOverview) entryData.gameOverview = existingEntry.gameOverview;
        if (existingEntry.overtime) entryData.overtime = existingEntry.overtime;
        if (existingEntry.shootout) entryData.shootout = existingEntry.shootout;
        if (existingEntry.postGame) entryData.postGame = existingEntry.postGame;
        if (existingEntry.additionalComments) entryData.additionalComments = existingEntry.additionalComments;

        await chartingService.updateChartingEntry(existingEntry.id, entryData);
        toast.success('Periods data saved successfully!');
        router.push(`/charting/sessions/${sessionId}/post-game`);
      } else {
        const result = await chartingService.createChartingEntry(entryData);
        if (result.success && result.data) {
          const newEntryResult = await chartingService.getChartingEntry(result.data.id);
          if (newEntryResult.success && newEntryResult.data) {
            setExistingEntry(newEntryResult.data);
          }
        }
        toast.success('Periods data created successfully!');
        router.push(`/charting/sessions/${sessionId}/post-game`);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const updateRadioGroup = (
    period: 'period1' | 'period2' | 'period3',
    section: string,
    fieldGroup: Record<string, { value: boolean; comments: string }>,
    selectedValue: string,
    comments: string
  ) => {
    const setPeriodData = period === 'period1' ? setPeriod1Data : period === 'period2' ? setPeriod2Data : setPeriod3Data;

    // Handle nested paths (e.g., "settingUpDefense.poor")
    if (selectedValue.includes('.')) {
      const [subsection, field] = selectedValue.split('.');
      setPeriodData((prev: any) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: updateRadioSelection(fieldGroup, field, comments),
        },
      }));
    } else {
      const updated = updateRadioSelection(fieldGroup, selectedValue, comments);
      setPeriodData((prev: any) => ({
        ...prev,
        [section]: {
          ...prev[section],
          ...updated,
        },
      }));
    }
  };

  const renderPeriodForm = (period: 'period1' | 'period2' | 'period3') => {
    const data = period === 'period1' ? period1Data : period === 'period2' ? period2Data : period3Data;
    const isPeriod3 = period === 'period3';

    return (
      <div className="space-y-6">
        {/* MindSet */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">MindSet</h3>
          <div className="space-y-4">
            <RadioSelectField
              label="Focus"
              options={['focusConsistent', 'focusInconsistent']}
              {...getSelectedOption({ focusConsistent: data.mindSet.focusConsistent, focusInconsistent: data.mindSet.focusInconsistent })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'mindSet', { focusConsistent: data.mindSet.focusConsistent, focusInconsistent: data.mindSet.focusInconsistent }, value, comments)
              }
            />
            <RadioSelectField
              label="Decision Making"
              options={['decisionMakingStrong', 'decisionMakingImproving', 'decisionMakingNeedsWork']}
              {...getSelectedOption({ decisionMakingStrong: data.mindSet.decisionMakingStrong, decisionMakingImproving: data.mindSet.decisionMakingImproving, decisionMakingNeedsWork: data.mindSet.decisionMakingNeedsWork })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'mindSet', { decisionMakingStrong: data.mindSet.decisionMakingStrong, decisionMakingImproving: data.mindSet.decisionMakingImproving, decisionMakingNeedsWork: data.mindSet.decisionMakingNeedsWork }, value, comments)
              }
            />
            <RadioSelectField
              label="Body Language"
              options={['bodyLanguageConsistent', 'bodyLanguageInconsistent']}
              {...getSelectedOption({ bodyLanguageConsistent: data.mindSet.bodyLanguageConsistent, bodyLanguageInconsistent: data.mindSet.bodyLanguageInconsistent })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'mindSet', { bodyLanguageConsistent: data.mindSet.bodyLanguageConsistent, bodyLanguageInconsistent: data.mindSet.bodyLanguageInconsistent }, value, comments)
              }
            />
          </div>
        </Card>

        {/* Skating */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Skating Performance</h3>
          <div className="space-y-4">
            <RadioSelectField
              label="Skating"
              options={['inSyncWithPuck', 'improving', 'weak', 'notInSync']}
              {...getSelectedOption({ inSyncWithPuck: data.skating.inSyncWithPuck, improving: data.skating.improving, weak: data.skating.weak, notInSync: data.skating.notInSync })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'skating', { inSyncWithPuck: data.skating.inSyncWithPuck, improving: data.skating.improving, weak: data.skating.weak, notInSync: data.skating.notInSync }, value, comments)
              }
            />
          </div>
        </Card>

        {/* Positional - Above Icing Line */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Positional - Above Icing Line</h3>
          <div className="space-y-4">
            <RadioSelectField
              label="Performance Level"
              options={['poor', 'improving', 'good']}
              {...getSelectedOption({ poor: data.positionalAboveIcing.poor, improving: data.positionalAboveIcing.improving, good: data.positionalAboveIcing.good })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'positionalAboveIcing', { poor: data.positionalAboveIcing.poor, improving: data.positionalAboveIcing.improving, good: data.positionalAboveIcing.good }, value, comments)
              }
            />
          </div>
        </Card>

        {/* Positional - Below Icing Line */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Positional - Below Icing Line</h3>
          <div className="space-y-4">
            <RadioSelectField
              label="Performance Level"
              options={['poor', 'improving', 'good', 'strong']}
              {...getSelectedOption({ poor: data.positionalBelowIcing.poor, improving: data.positionalBelowIcing.improving, good: data.positionalBelowIcing.good, strong: data.positionalBelowIcing.strong })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'positionalBelowIcing', { poor: data.positionalBelowIcing.poor, improving: data.positionalBelowIcing.improving, good: data.positionalBelowIcing.good, strong: data.positionalBelowIcing.strong }, value, comments)
              }
            />
          </div>
        </Card>

        {/* Rebound Control */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Rebound Control</h3>
          <div className="space-y-4">
            <RadioSelectField
              label="Quality"
              options={['poor', 'improving', 'good']}
              {...getSelectedOption({ poor: data.reboundControl.poor, improving: data.reboundControl.improving, good: data.reboundControl.good })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'reboundControl', { poor: data.reboundControl.poor, improving: data.reboundControl.improving, good: data.reboundControl.good }, value, comments)
              }
            />
            <RadioSelectField
              label="Consistency"
              options={['consistent', 'inconsistent']}
              {...getSelectedOption({ consistent: data.reboundControl.consistent, inconsistent: data.reboundControl.inconsistent })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'reboundControl', { consistent: data.reboundControl.consistent, inconsistent: data.reboundControl.inconsistent }, value, comments)
              }
            />
          </div>
        </Card>

        {/* Freezing Puck */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Freezing Puck</h3>
          <div className="space-y-4">
            <RadioSelectField
              label="Quality"
              options={['poor', 'improving', 'good']}
              {...getSelectedOption({ poor: data.freezingPuck.poor, improving: data.freezingPuck.improving, good: data.freezingPuck.good })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'freezingPuck', { poor: data.freezingPuck.poor, improving: data.freezingPuck.improving, good: data.freezingPuck.good }, value, comments)
              }
            />
            <RadioSelectField
              label="Consistency"
              options={['consistent', 'inconsistent']}
              {...getSelectedOption({ consistent: data.freezingPuck.consistent, inconsistent: data.freezingPuck.inconsistent })}
              onChange={(value: string, comments: string) =>
                updateRadioGroup(period, 'freezingPuck', { consistent: data.freezingPuck.consistent, inconsistent: data.freezingPuck.inconsistent }, value, comments)
              }
            />
          </div>
        </Card>

        {/* Team Play - Only for Period 3 */}
        {isPeriod3 && data.teamPlay && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Team Play</h3>
            <div className="space-y-4">
              <RadioSelectField
                label="Setting Up Defense"
                options={['poor', 'improving', 'good']}
                {...getSelectedOption({ poor: data.teamPlay?.settingUpDefense?.poor ?? { value: false, comments: '' }, improving: data.teamPlay?.settingUpDefense?.improving ?? { value: false, comments: '' }, good: data.teamPlay?.settingUpDefense?.good ?? { value: false, comments: '' } })}
                onChange={(value: string, comments: string) =>
                  updateRadioGroup(period, 'teamPlay', { poor: data.teamPlay?.settingUpDefense?.poor ?? { value: false, comments: '' }, improving: data.teamPlay?.settingUpDefense?.improving ?? { value: false, comments: '' }, good: data.teamPlay?.settingUpDefense?.good ?? { value: false, comments: '' } }, `settingUpDefense.${value}`, comments)
                }
              />
              <RadioSelectField
                label="Setting Up Forwards"
                options={['poor', 'improving', 'good']}
                {...getSelectedOption({ poor: data.teamPlay?.settingUpForwards?.poor ?? { value: false, comments: '' }, improving: data.teamPlay?.settingUpForwards?.improving ?? { value: false, comments: '' }, good: data.teamPlay?.settingUpForwards?.good ?? { value: false, comments: '' } })}
                onChange={(value: string, comments: string) =>
                  updateRadioGroup(period, 'teamPlay', { poor: data.teamPlay?.settingUpForwards?.poor ?? { value: false, comments: '' }, improving: data.teamPlay?.settingUpForwards?.improving ?? { value: false, comments: '' }, good: data.teamPlay?.settingUpForwards?.good ?? { value: false, comments: '' } }, `settingUpForwards.${value}`, comments)
                }
              />
            </div>
          </Card>
        )}
      </div>
    );
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
              <h1 className="text-3xl font-bold text-gray-900">Period Performance</h1>
              <p className="text-gray-600">
                {session.type === 'game' ? '🥅 Game' : '🏒 Practice'}
                {session.opponent && (session.type === 'game' ? ` vs ${session.opponent}` : ` - ${session.opponent}`)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for Each Period */}
        <Tabs value={activePeriod} onValueChange={setActivePeriod}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="period1">Period 1</TabsTrigger>
            <TabsTrigger value="period2">Period 2</TabsTrigger>
            <TabsTrigger value="period3">Period 3</TabsTrigger>
          </TabsList>

          <TabsContent value="period1" className="space-y-4 mt-6">
            {renderPeriodForm('period1')}
          </TabsContent>

          <TabsContent value="period2" className="space-y-4 mt-6">
            {renderPeriodForm('period2')}
          </TabsContent>

          <TabsContent value="period3" className="space-y-4 mt-6">
            {renderPeriodForm('period3')}
          </TabsContent>
        </Tabs>

        {/* Save Button Footer */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Save All Periods
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
