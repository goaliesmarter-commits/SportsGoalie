'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import { chartingService, formTemplateService } from '@/lib/database';
import { dynamicChartingService } from '@/lib/database/services/dynamic-charting.service';
import { Session, ChartingEntry, FormTemplate, DynamicChartingEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ClipboardCheck,
  CheckCircle,
  Edit,
  Trash2,
  BarChart3,
  Brain,
  Timer,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toDateSafe } from '@/lib/utils/timestamp';
import { DynamicSessionAnalytics } from '@/components/charting/DynamicSessionAnalytics';
import { NewSessionModal } from '@/components/charting/NewSessionModal';
import { V2SessionSummary } from '@/components/charting/V2SessionSummary';
import { isV2GameEntry, v2GameProgress, v2SectionState } from '@/lib/charting/v2-sections';

export default function SessionDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<ChartingEntry[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [dynamicEntry, setDynamicEntry] = useState<DynamicChartingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showEdit, setShowEdit] = useState(false);

  const loadSessionData = useCallback(async () => {
    if (!sessionId || !user) return;

    try {
      setLoading(true);

      const [sessionResult, entriesResult, templateResult, dynamicEntriesResult] = await Promise.all([
        chartingService.getSession(sessionId),
        chartingService.getChartingEntriesBySession(sessionId),
        formTemplateService.getActiveTemplate({ sport: 'Hockey', pillar: 'combined' }),
        dynamicChartingService.getDynamicEntriesBySession(sessionId),
      ]);

      if (sessionResult.success && sessionResult.data) {
        setSession(sessionResult.data);
      }

      if (entriesResult.success && entriesResult.data) {
        setEntries(entriesResult.data);
      }

      if (!templateResult.success) {
        // Falling back to the legacy analytics panel is fine here, but the failure itself
        // must not be silent — otherwise a broken query looks identical to "no template".
        console.error('Failed to load active template:', templateResult.error);
        setActiveTemplate(null);
      } else {
        setActiveTemplate(templateResult.data ?? null);
      }

      if (dynamicEntriesResult.success && dynamicEntriesResult.data) {
        console.log('📊 [SESSION] Dynamic entries loaded:', {
          totalEntries: dynamicEntriesResult.data.length,
          entries: dynamicEntriesResult.data.map(e => ({
            id: e.id,
            submittedBy: e.submittedBy,
            sessionId: e.sessionId
          })),
          currentUserId: user.id,
        });
        const userEntry = dynamicEntriesResult.data.find((e) => e.submittedBy === user.id);
        console.log('📊 [SESSION] User entry found:', userEntry ? userEntry.id : 'NONE');
        setDynamicEntry(userEntry || null);
      } else {
        console.log('📊 [SESSION] No dynamic entries found or error:', dynamicEntriesResult);
        setDynamicEntry(null);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, user]);

  // Always reload on mount and when dependencies change (including pathname and search params for route changes)
  useEffect(() => {
    if (user) {
      loadSessionData();
    }
  }, [sessionId, user, refreshKey, loadSessionData, pathname, searchParams]);

  // Reload data when window gains focus (user returns to page/tab)
  useEffect(() => {
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleDeleteSession = async () => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await chartingService.deleteSession(sessionId);
      if (result.success) {
        router.push('/charting');
      } else {
        alert('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('An error occurred');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'partial':
        return 'bg-amber-500';
      case 'pre-game':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ background: '#041830' }}>
        <SkeletonContentPage />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ background: '#041830' }}>
        <div className="text-center">
          <p className="text-white/60 mb-4">Session not found</p>
          <Button onClick={() => router.push('/charting')} style={{ background: '#37b5ff' }} className="text-white border-0">Back to Sessions</Button>
        </div>
      </div>
    );
  }

  const myEntry = entries.find((e) => e.submittedBy === user?.id);
  const adminEntries = entries.filter((e) => e.submitterRole === 'admin');

  // The stored status moves to in-progress as soon as one section is saved, so a
  // V2 game is labelled from what it actually holds: all three sections done is
  // completed, some of them is partial.
  const displayStatus = (() => {
    if (session.type !== 'game' || !isV2GameEntry(myEntry)) return session.status;
    const progress = v2GameProgress(myEntry);
    if (progress === 'complete') return 'completed';
    return progress === 'partial' ? 'partial' : session.status;
  })();
  const sessionDateObj = (() => {
    const rawDate = session.date as unknown;
    if (rawDate && typeof rawDate === 'object' && 'toDate' in rawDate && typeof (rawDate as { toDate?: unknown }).toDate === 'function') {
      const converted = (rawDate as { toDate: () => Date }).toDate();
      if (!Number.isNaN(converted.getTime())) {
        return converted;
      }
    }
    if (rawDate instanceof Date) {
      if (!Number.isNaN(rawDate.getTime())) {
        return rawDate;
      }
    }
    if (rawDate && typeof rawDate === 'object') {
      const maybeSeconds =
        (rawDate as { seconds?: unknown; _seconds?: unknown }).seconds ??
        (rawDate as { seconds?: unknown; _seconds?: unknown })._seconds;
      if (typeof maybeSeconds === 'number') {
        const parsed = new Date(maybeSeconds * 1000);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    if (typeof rawDate === 'string' || typeof rawDate === 'number') {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
  })();

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: '#041830' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1 basis-64">
            {/* Back button */}
            <button
              type="button"
              onClick={() => router.push('/charting')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(55,181,255,0.2)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(55,181,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white break-words min-w-0">
                  {session.type === 'game' ? '🥅 Game' : '🏒 Practice'}
                  {session.opponent && (session.type === 'game' ? ` vs ${session.opponent}` : ` - ${session.opponent}`)}
                </h1>
                <Badge className={getStatusColor(displayStatus)}>{displayStatus}</Badge>
                {session.result && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '99px', padding: '3px 10px', textTransform: 'capitalize' }}>
                    {session.result}
                  </span>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {sessionDateObj
                      ? `${sessionDateObj.toLocaleDateString()} at ${sessionDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Date unavailable'}
                  </span>
                </div>
                {session.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{session.location}</span>
                  </div>
                )}
              </div>
              {session.tags && session.tags.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {session.tags.map((tag) => (
                    <span key={tag} style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(55,181,255,0.7)', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '99px', padding: '2px 10px', textTransform: 'capitalize' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0 ml-auto">
            <button
              type="button"
              title="Edit Session"
              onClick={() => setShowEdit(true)}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(55,181,255,0.2)', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(55,181,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDeleteSession}
              title="Delete Session"
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* V2 Practice Chart Section */}
        {session.type === 'practice' && (
          <div className="p-4 sm:p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.18)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(55,181,255,0.1)' }}>
                <Brain className="w-4 h-4" style={{ color: '#37b5ff' }} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Practice Chart</h2>
            </div>
            <p className="text-xs sm:text-sm text-white/40 mb-4 ml-10">
              Index-driven practice reflection — every minute intentional
            </p>

            <div
              onClick={() => router.push(`/charting/sessions/${sessionId}/v2/practice`)}
              className="relative p-4 sm:p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
              style={
                !!(myEntry as unknown as Record<string, unknown> | undefined)?.v2Practice
                  ? { borderColor: '#37b5ff', background: 'rgba(55,181,255,0.1)' }
                  : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }
              }
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={
                    !!(myEntry as unknown as Record<string, unknown> | undefined)?.v2Practice
                      ? { background: '#37b5ff' }
                      : { background: 'rgba(255,255,255,0.08)' }
                  }
                >
                  <ClipboardCheck
                    className="w-5 h-5 text-white"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white">Open Practice Chart</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Practice Index · Value rating · Technical eye · Mind Vault
                  </p>
                </div>
                {!!(myEntry as unknown as Record<string, unknown> | undefined)?.v2Practice && (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#37b5ff' }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* V2 Game Chart Sections */}
        {session.type === 'game' && (
          <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.18)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(55,181,255,0.1)' }}>
                <Brain className="w-4 h-4" style={{ color: '#37b5ff' }} />
              </div>
              <h2 className="text-xl font-bold text-white">Game Chart</h2>
            </div>
            <p className="text-sm text-white/40 mb-4 ml-10">
              Post-game self-assessment — chart from memory
            </p>

            {(() => {
              // A section is done once it holds an answer, not merely once it was saved.
              const { preGame: preGameDone, periods: periodsDone, postGame: postGameDone } =
                v2SectionState(myEntry as unknown as Parameters<typeof v2SectionState>[0]);

              type StepConfig = {
                key: string;
                label: string;
                sub: string;
                icon: React.ReactNode;
                done: boolean;
                unlocked: boolean;
                href: string;
                lockedHint: string;
              };

              const steps: StepConfig[] = [
                {
                  key: 'pre-game',
                  label: 'Pre-Game',
                  sub: 'Mind management',
                  icon: <Timer className="w-5 h-5 text-white" />,
                  done: preGameDone,
                  unlocked: true,
                  href: `/charting/sessions/${sessionId}/v2/pre-game`,
                  lockedHint: '',
                },
                {
                  key: 'periods',
                  label: 'Periods',
                  sub: 'P1 · P2 · P3 · OT',
                  icon: <BarChart3 className="w-5 h-5 text-white" />,
                  done: periodsDone,
                  unlocked: preGameDone,
                  href: `/charting/sessions/${sessionId}/v2/periods`,
                  lockedHint: 'Complete Pre-Game first',
                },
                {
                  key: 'post-game',
                  label: 'Post-Game',
                  sub: 'Review & Mind Vault',
                  icon: <MessageSquare className="w-5 h-5 text-white" />,
                  done: postGameDone,
                  unlocked: preGameDone && periodsDone,
                  href: `/charting/sessions/${sessionId}/v2/post-game`,
                  lockedHint: 'Complete Periods first',
                },
              ];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {steps.map((step, idx) => (
                    <div
                      key={step.key}
                      onClick={() => step.unlocked && router.push(step.href)}
                      className="relative p-4 border-2 rounded-xl transition-all"
                      style={
                        step.done
                          ? { borderColor: '#37b5ff', background: 'rgba(55,181,255,0.1)', cursor: 'pointer' }
                          : step.unlocked
                          ? { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }
                          : { borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', cursor: 'not-allowed', opacity: 0.45 }
                      }
                    >
                      {/* Step number badge */}
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={step.done ? { background: '#37b5ff', color: '#fff' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                        {idx + 1}
                      </div>

                      {/* Done checkmark */}
                      {step.done && (
                        <CheckCircle className="absolute top-2 right-2 w-4 h-4" style={{ color: '#37b5ff' }} />
                      )}

                      {/* Lock icon for unavailable steps */}
                      {!step.unlocked && (
                        <Lock className="absolute top-2 right-2 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
                      )}

                      <div className="flex flex-col items-center text-center gap-2 mt-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={step.done ? { background: '#37b5ff' } : step.unlocked ? { background: 'rgba(255,255,255,0.08)' } : { background: 'rgba(255,255,255,0.04)' }}>
                          {step.unlocked ? step.icon : <Lock className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: step.unlocked ? '#fff' : 'rgba(255,255,255,0.35)' }}>{step.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: step.unlocked ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)' }}>
                            {step.unlocked ? step.sub : step.lockedHint}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>
        )}

        {/* Coach/Admin Entries */}
        {adminEntries.length > 0 && (
          <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.14)' }}>
            <h3 className="text-lg font-bold text-white mb-4">Coach/Admin Observations</h3>
            <div className="space-y-3">
              {adminEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div>
                    <p className="font-medium text-white">Admin Observation</p>
                    <p className="text-sm text-white/40">
                      {/* toDateSafe rather than a toDate guard: entries written before
                          the removeUndefinedFields fix hold a plain {seconds} map, which
                          has no toDate and so fell through to a vague "Recently". */}
                      {(() => {
                        const submitted = toDateSafe(entry.submittedAt);
                        return submitted
                          ? formatDistanceToNow(submitted, { addSuffix: true })
                          : 'Recently';
                      })()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/charting/sessions/${sessionId}/chart/${entry.id}`)}
                    className="border-[rgba(55,181,255,0.2)] text-white/60 hover:text-white hover:bg-[rgba(55,181,255,0.1)]"
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Analytics - Dynamic Forms */}
        {activeTemplate && dynamicEntry && (
          <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.14)' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-white/50" />
              <h3 className="text-lg font-bold text-white">Session Analytics</h3>
            </div>
            <DynamicSessionAnalytics template={activeTemplate} entry={dynamicEntry} />
          </div>
        )}

        {/* Session Analytics - V2 game chart */}
        {myEntry && isV2GameEntry(myEntry) && (
          <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.14)' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-white/50" />
              <h3 className="text-lg font-bold text-white">Session Analytics</h3>
            </div>
            <V2SessionSummary entry={myEntry} />
          </div>
        )}

        {/* Session Analytics - Only show for legacy charting system */}
        {!activeTemplate && !isV2GameEntry(myEntry) && (
          <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.14)' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-white/50" />
              <h3 className="text-lg font-bold text-white">Session Analytics</h3>
            </div>

            {myEntry ? (
              <div className="space-y-6">
                {/* Game Overview Stats */}
                {myEntry.gameOverview && (
                <div>
                  <h4 className="font-semibold text-white mb-3">Game Overview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg p-4" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <p className="text-sm text-white/50 mb-1">Good Goals</p>
                      <p className="text-3xl font-bold text-green-400">
                        {(myEntry.gameOverview.goodGoals.period1 || 0) +
                          (myEntry.gameOverview.goodGoals.period2 || 0) +
                          (myEntry.gameOverview.goodGoals.period3 || 0)}
                      </p>
                      <p className="text-xs text-white/35 mt-1">
                        P1: {myEntry.gameOverview.goodGoals.period1 || 0} |
                        P2: {myEntry.gameOverview.goodGoals.period2 || 0} |
                        P3: {myEntry.gameOverview.goodGoals.period3 || 0}
                      </p>
                    </div>
                    <div className="rounded-lg p-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-sm text-white/50 mb-1">Weak Goals</p>
                      <p className="text-3xl font-bold text-red-400">
                        {(myEntry.gameOverview.badGoals.period1 || 0) +
                          (myEntry.gameOverview.badGoals.period2 || 0) +
                          (myEntry.gameOverview.badGoals.period3 || 0)}
                      </p>
                      <p className="text-xs text-white/35 mt-1">
                        P1: {myEntry.gameOverview.badGoals.period1 || 0} |
                        P2: {myEntry.gameOverview.badGoals.period2 || 0} |
                        P3: {myEntry.gameOverview.badGoals.period3 || 0}
                      </p>
                    </div>
                    <div className="rounded-lg p-4" style={{ background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.18)' }}>
                      <p className="text-sm text-white/50 mb-1">Avg Challenge</p>
                      <p className="text-3xl font-bold" style={{ color: '#37b5ff' }}>
                        {(
                          ((myEntry.gameOverview.degreeOfChallenge.period1 || 0) +
                            (myEntry.gameOverview.degreeOfChallenge.period2 || 0) +
                            (myEntry.gameOverview.degreeOfChallenge.period3 || 0)) /
                          3
                        ).toFixed(1)}
                        <span className="text-base text-white/40">/10</span>
                      </p>
                      <p className="text-xs text-white/35 mt-1">
                        P1: {myEntry.gameOverview.degreeOfChallenge.period1 || 0} |
                        P2: {myEntry.gameOverview.degreeOfChallenge.period2 || 0} |
                        P3: {myEntry.gameOverview.degreeOfChallenge.period3 || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Period Performance Summary */}
              {(myEntry.period1 || myEntry.period2 || myEntry.period3) && (
                <div>
                  <h4 className="font-semibold text-white mb-3">Period Performance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {myEntry.period1 && (
                      <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-sm font-semibold text-white mb-2">Period 1</p>
                        <div className="space-y-1 text-xs">
                          {myEntry.period1.mindSet?.focusConsistent?.value && (
                            <p className="text-green-400">✓ Focus: Consistent</p>
                          )}
                          {myEntry.period1.mindSet?.focusInconsistent?.value && (
                            <p className="text-yellow-400">⚠ Focus: Inconsistent</p>
                          )}
                          {myEntry.period1.skating?.inSync?.value && (
                            <p className="text-green-400">✓ Skating: In Sync</p>
                          )}
                          {myEntry.period1.skating?.notInSync?.value && (
                            <p className="text-red-400">✗ Skating: Not In Sync</p>
                          )}
                        </div>
                      </div>
                    )}
                    {myEntry.period2 && (
                      <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-sm font-semibold text-white mb-2">Period 2</p>
                        <div className="space-y-1 text-xs">
                          {myEntry.period2.mindSet?.focusConsistent?.value && (
                            <p className="text-green-400">✓ Focus: Consistent</p>
                          )}
                          {myEntry.period2.mindSet?.focusInconsistent?.value && (
                            <p className="text-yellow-400">⚠ Focus: Inconsistent</p>
                          )}
                          {myEntry.period2.skating?.inSync?.value && (
                            <p className="text-green-400">✓ Skating: In Sync</p>
                          )}
                          {myEntry.period2.skating?.notInSync?.value && (
                            <p className="text-red-400">✗ Skating: Not In Sync</p>
                          )}
                        </div>
                      </div>
                    )}
                    {myEntry.period3 && (
                      <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-sm font-semibold text-white mb-2">Period 3</p>
                        <div className="space-y-1 text-xs">
                          {myEntry.period3.mindSet?.focusConsistent?.value && (
                            <p className="text-green-400">✓ Focus: Consistent</p>
                          )}
                          {myEntry.period3.mindSet?.focusInconsistent?.value && (
                            <p className="text-yellow-400">⚠ Focus: Inconsistent</p>
                          )}
                          {myEntry.period3.skating?.inSync?.value && (
                            <p className="text-green-400">✓ Skating: In Sync</p>
                          )}
                          {myEntry.period3.skating?.notInSync?.value && (
                            <p className="text-red-400">✗ Skating: Not In Sync</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Overtime & Shootout Stats */}
              {(myEntry.overtime || myEntry.shootout) && (
                <div>
                  <h4 className="font-semibold text-white mb-3">Extended Play</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myEntry.overtime && (
                      <div className="rounded-lg p-4" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                        <p className="text-sm font-semibold text-white mb-2">Overtime</p>
                        <div className="space-y-1 text-xs">
                          {myEntry.overtime.mindSetFocus?.good?.value && (
                            <p className="text-green-400">✓ Focus: Good</p>
                          )}
                          {myEntry.overtime.mindSetFocus?.needsWork?.value && (
                            <p className="text-yellow-400">⚠ Focus: Needs Work</p>
                          )}
                          {myEntry.overtime.skatingPerformance?.good?.value && (
                            <p className="text-green-400">✓ Skating: Good</p>
                          )}
                          {myEntry.overtime.positionalGame?.good?.value && (
                            <p className="text-green-400">✓ Positioning: Good</p>
                          )}
                        </div>
                      </div>
                    )}
                    {myEntry.shootout && (
                      <div className="rounded-lg p-4" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <p className="text-sm font-semibold text-white mb-2">Shootout</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/50">Result:</span>
                            <span className={`text-sm font-bold ${myEntry.shootout.result === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                              {myEntry.shootout.result?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/50">Saves:</span>
                            <span className="text-sm font-semibold text-white">{myEntry.shootout.shotsSaved || 0}/10</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/50">Save %:</span>
                            <span className="text-sm font-semibold text-white">
                              {myEntry.shootout.shotsSaved && (myEntry.shootout.shotsSaved + myEntry.shootout.shotsScored) > 0
                                ? ((myEntry.shootout.shotsSaved / (myEntry.shootout.shotsSaved + myEntry.shootout.shotsScored)) * 100).toFixed(0)
                                : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Comments */}
              {myEntry.additionalComments && (
                <div>
                  <h4 className="font-semibold text-white mb-3">Additional Notes</h4>
                  <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{myEntry.additionalComments}</p>
                  </div>
                </div>
              )}
            </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/50">No charting data available yet</p>
                <p className="text-sm text-white/30 mt-2">Fill out the charting sections above to see analytics here</p>
              </div>
            )}
          </div>
        )}
      </div>

      <NewSessionModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        session={session}
        onSaved={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
}
