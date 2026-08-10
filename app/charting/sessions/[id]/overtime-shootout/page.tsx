'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { useRouter, useParams } from 'next/navigation';
import { chartingService } from '@/lib/database';
import { Session, ChartingEntry, OvertimeData, ShootoutData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

const createEmptyOvertimeData = (): OvertimeData => ({
  mindSetFocus: {
    poor: createEmptyYesNo(),
    needsWork: createEmptyYesNo(),
    good: createEmptyYesNo(),
  },
  mindSetDecisionMaking: {
    strong: createEmptyYesNo(),
    improving: createEmptyYesNo(),
    needsWork: createEmptyYesNo(),
  },
  skatingPerformance: {
    poor: createEmptyYesNo(),
    needsWork: createEmptyYesNo(),
    good: createEmptyYesNo(),
  },
  positionalGame: {
    poor: createEmptyYesNo(),
    needsWork: createEmptyYesNo(),
    good: createEmptyYesNo(),
  },
  reboundControl: {
    poor: createEmptyYesNo(),
    needsWork: createEmptyYesNo(),
    good: createEmptyYesNo(),
  },
  freezingPuck: {
    poor: createEmptyYesNo(),
    needsWork: createEmptyYesNo(),
    good: createEmptyYesNo(),
  },
});

const createEmptyShootoutData = (): ShootoutData => ({
  result: 'won',
  shotsSaved: 0,
  shotsScored: 0,
  dekesSaved: 0,
  dekesScored: 0,
  comments: '',
});

export default function OvertimeShootoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [existingEntry, setExistingEntry] = useState<ChartingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [overtimeData, setOvertimeData] = useState<OvertimeData>(createEmptyOvertimeData());
  const [shootoutData, setShootoutData] = useState<ShootoutData>(createEmptyShootoutData());
  const [hasOvertime, setHasOvertime] = useState(false);
  const [hasShootout, setHasShootout] = useState(false);
  const [activeTab, setActiveTab] = useState('overtime');

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
          if (myEntry.overtime) {
            setOvertimeData(myEntry.overtime);
            setHasOvertime(true);
          }
          if (myEntry.shootout) {
            setShootoutData(myEntry.shootout);
            setHasShootout(true);
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
      };

      // Always include overtime/shootout data if it exists or if checkbox is checked
      if (hasOvertime) {
        entryData.overtime = overtimeData;
      } else if (existingEntry?.overtime) {
        // Preserve existing overtime data if checkbox is not checked
        entryData.overtime = existingEntry.overtime;
      }

      if (hasShootout) {
        entryData.shootout = shootoutData;
      } else if (existingEntry?.shootout) {
        // Preserve existing shootout data if checkbox is not checked
        entryData.shootout = existingEntry.shootout;
      }

      if (existingEntry) {
        await chartingService.updateChartingEntry(existingEntry.id, entryData);
        toast.success('Overtime/Shootout data saved successfully!');
        router.push(`/charting/sessions/${sessionId}`);
      } else {
        const result = await chartingService.createChartingEntry(entryData);
        if (result.success && result.data) {
          const newEntryResult = await chartingService.getChartingEntry(result.data.id);
          if (newEntryResult.success && newEntryResult.data) {
            setExistingEntry(newEntryResult.data);
          }
        }
        toast.success('Overtime/Shootout data created successfully!');
        router.push(`/charting/sessions/${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const updateOvertimeRadioGroup = (
    section: string,
    fieldGroup: Record<string, { value: boolean; comments: string }>,
    selectedValue: string,
    comments: string
  ) => {
    const updated = updateRadioSelection(fieldGroup, selectedValue, comments);
    setOvertimeData((prev: any) => ({
      ...prev,
      [section]: updated,
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
              <h1 className="text-3xl font-bold text-gray-900">Overtime & Shootout</h1>
              <p className="text-gray-600">
                {session.type === 'game' ? '🥅 Game' : '🏒 Practice'}
                {session.opponent && (session.type === 'game' ? ` vs ${session.opponent}` : ` - ${session.opponent}`)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for Overtime and Shootout */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 h-14">
            <TabsTrigger value="overtime" className="text-lg font-semibold">Overtime</TabsTrigger>
            <TabsTrigger value="shootout" className="text-lg font-semibold">Shootout</TabsTrigger>
          </TabsList>

          {/* Overtime Tab */}
          <TabsContent value="overtime" className="space-y-6 mt-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasOvertime}
                    onChange={(e) => setHasOvertime(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-lg font-semibold text-gray-900">Overtime Occurred</span>
                </label>
              </div>
              {hasOvertime && (
                <p className="text-sm text-gray-600">
                  Track performance metrics during overtime play
                </p>
              )}
            </Card>

            {hasOvertime && (
              <>
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">MindSet</h2>
                  <div className="space-y-4">
                    <RadioSelectField
                      label="Focus"
                      options={['poor', 'needsWork', 'good']}
                      {...getSelectedOption(overtimeData.mindSetFocus)}
                      onChange={(value: string, comments: string) =>
                        updateOvertimeRadioGroup('mindSetFocus', overtimeData.mindSetFocus, value, comments)
                      }
                    />
                    <RadioSelectField
                      label="Decision Making"
                      options={['strong', 'improving', 'needsWork']}
                      {...getSelectedOption(overtimeData.mindSetDecisionMaking)}
                      onChange={(value: string, comments: string) =>
                        updateOvertimeRadioGroup('mindSetDecisionMaking', overtimeData.mindSetDecisionMaking, value, comments)
                      }
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Performance</h2>
                  <div className="space-y-4">
                    <RadioSelectField
                      label="Skating Performance"
                      options={['poor', 'needsWork', 'good']}
                      {...getSelectedOption(overtimeData.skatingPerformance)}
                      onChange={(value: string, comments: string) =>
                        updateOvertimeRadioGroup('skatingPerformance', overtimeData.skatingPerformance, value, comments)
                      }
                    />
                    <RadioSelectField
                      label="Positional Game"
                      options={['poor', 'needsWork', 'good']}
                      {...getSelectedOption(overtimeData.positionalGame)}
                      onChange={(value: string, comments: string) =>
                        updateOvertimeRadioGroup('positionalGame', overtimeData.positionalGame, value, comments)
                      }
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Puck Control</h2>
                  <div className="space-y-4">
                    <RadioSelectField
                      label="Rebound Control"
                      options={['poor', 'needsWork', 'good']}
                      {...getSelectedOption(overtimeData.reboundControl)}
                      onChange={(value: string, comments: string) =>
                        updateOvertimeRadioGroup('reboundControl', overtimeData.reboundControl, value, comments)
                      }
                    />
                    <RadioSelectField
                      label="Freezing Puck"
                      options={['poor', 'needsWork', 'good']}
                      {...getSelectedOption(overtimeData.freezingPuck)}
                      onChange={(value: string, comments: string) =>
                        updateOvertimeRadioGroup('freezingPuck', overtimeData.freezingPuck, value, comments)
                      }
                    />
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Shootout Tab */}
          <TabsContent value="shootout" className="space-y-6 mt-6">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasShootout}
                    onChange={(e) => setHasShootout(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-lg font-semibold text-gray-900">Shootout Occurred</span>
                </label>
              </div>
              {hasShootout && (
                <p className="text-sm text-gray-600">
                  Record shootout statistics and performance
                </p>
              )}
            </Card>

            {hasShootout && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Shootout Statistics</h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="result">Result</Label>
                    <select
                      id="result"
                      value={shootoutData.result}
                      onChange={(e) => setShootoutData({ ...shootoutData, result: e.target.value as 'won' | 'lost' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
                    >
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shotsSaved">Shots Saved (0-10)</Label>
                      <Input
                        id="shotsSaved"
                        type="number"
                        min="0"
                        max="10"
                        value={shootoutData.shotsSaved}
                        onChange={(e) => setShootoutData({ ...shootoutData, shotsSaved: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shotsScored">Shots Scored Against (0-10)</Label>
                      <Input
                        id="shotsScored"
                        type="number"
                        min="0"
                        max="10"
                        value={shootoutData.shotsScored}
                        onChange={(e) => setShootoutData({ ...shootoutData, shotsScored: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)) })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dekesSaved">Dekes Saved (0-10)</Label>
                      <Input
                        id="dekesSaved"
                        type="number"
                        min="0"
                        max="10"
                        value={shootoutData.dekesSaved}
                        onChange={(e) => setShootoutData({ ...shootoutData, dekesSaved: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dekesScored">Dekes Scored Against (0-10)</Label>
                      <Input
                        id="dekesScored"
                        type="number"
                        min="0"
                        max="10"
                        value={shootoutData.dekesScored}
                        onChange={(e) => setShootoutData({ ...shootoutData, dekesScored: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)) })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="comments">Comments</Label>
                    <textarea
                      id="comments"
                      value={shootoutData.comments}
                      onChange={(e) => setShootoutData({ ...shootoutData, comments: e.target.value })}
                      placeholder="Any additional notes about the shootout..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-24 mt-1"
                      rows={4}
                    />
                  </div>
                </div>
              </Card>
            )}
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
                Save Overtime/Shootout
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
