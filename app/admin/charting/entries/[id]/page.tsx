'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { chartingService } from '@/lib/database';
import { ChartingEntry, Session } from '@/types';
import { AdminRoute } from '@/components/auth/protected-route';
import { ArrowLeft, Calendar, User, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { V2ChartReadOnlyView } from '@/components/charting/V2ChartReadOnlyView';
import { toDateSafe } from '@/lib/utils/timestamp';

const BLUE = '#37b5ff';
const RED = '#f87171';
const GREEN = '#22c55e';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

export default function AdminChartingEntryDetailPage() {
  return <AdminRoute><EntryDetailContent /></AdminRoute>;
}

function EntryDetailContent() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<ChartingEntry | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => { loadData(); }, [entryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const entryResult = await chartingService.getChartingEntry(entryId);
      if (entryResult.success && entryResult.data) {
        setEntry(entryResult.data);
        const sessionResult = await chartingService.getSession(entryResult.data.sessionId);
        if (sessionResult.success && sessionResult.data) setSession(sessionResult.data);
      } else {
        toast.error('Entry not found');
        router.push('/admin/charting');
      }
    } catch (error) {
      console.error('Failed to load entry:', error);
      toast.error('Failed to load entry details');
    } finally {
      setLoading(false);
    }
  };

  const renderYesNoField = (label: string, field: { value?: boolean; comments?: string } | null | undefined) => {
    if (!field) return null;
    return (
      <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: field.comments ? '6px' : 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: 500 }}>{label}</span>
          <span style={{ background: field.value ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.07)', color: field.value ? GREEN : 'rgba(255,255,255,0.4)', padding: '2px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
            {field.value ? 'Yes' : 'No'}
          </span>
        </div>
        {field.comments && <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>📝 {field.comments}</p>}
      </div>
    );
  };

  const renderRadioField = (label: string, options: Record<string, { value?: boolean; comments?: string } | null | undefined>) => {
    const selected = Object.entries(options).find(([, value]) => value?.value);
    return (
      <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: 500 }}>{label}</span>
          {selected && (
            <span style={{ background: 'rgba(55,181,255,0.1)', color: BLUE, padding: '2px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
              {selected[0].replace(/([A-Z])/g, ' $1').trim()}
            </span>
          )}
        </div>
        {selected && selected[1]?.comments && <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginTop: '4px' }}>📝 {selected[1].comments}</p>}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Loading entry details…</p>
      </div>
    );
  }

  if (!entry || !session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Entry not found</p>
      </div>
    );
  }

  const sectionCard = (title: string, children: React.ReactNode) => (
    <div style={{ position: 'relative', ...card, padding: '24px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}66, transparent)` }} />
      <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '20px', marginBottom: '16px' }}>{title}</h2>
      {children}
    </div>
  );

  const subHeading = (text: string) => (
    <h3 style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '15px', marginBottom: '8px', marginTop: '4px' }}>{text}</h3>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => router.push('/admin/charting')} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: '24px', marginBottom: '2px' }}>Charting Entry Details (Admin)</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Complete charting data for this session</p>
          </div>
        </div>
        <span style={{ background: entry.submitterRole === 'admin' ? 'rgba(55,181,255,0.12)' : 'rgba(255,255,255,0.07)', color: entry.submitterRole === 'admin' ? BLUE : 'rgba(255,255,255,0.5)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
          {entry.submitterRole === 'admin' ? 'Admin Entry' : 'Student Entry'}
        </span>
      </div>

      {/* Session Info */}
      {sectionCard('Session Information', (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { Icon: Calendar, label: 'Date', value: session.date.toDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
            { Icon: Clock, label: 'Time', value: session.date.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
            { Icon: User, label: 'Type & Opponent', value: `${session.type === 'game' ? '🥅' : '🏒'} ${session.opponent || 'Practice Session'}` },
            ...(session.location ? [{ Icon: MapPin, label: 'Location', value: session.location }] : []),
          ].map(({ Icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Icon size={16} color="rgba(55,181,255,0.5)" style={{ flexShrink: 0, marginTop: '3px' }} />
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '3px' }}>{label}</p>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{value}</p>
              </div>
            </div>
          ))}
          {/* toDateSafe, not a raw toDate(): entries written before the
              removeUndefinedFields fix hold a plain {seconds} map with no methods,
              and calling toDate() on one crashes the whole page. */}
          {toDateSafe(entry.submittedAt) && (
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
                Submitted on {toDateSafe(entry.submittedAt)!.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* V2 Chart Data */}
      <V2ChartReadOnlyView entry={entry} session={session} />

      {/* Game Overview */}
      {entry.gameOverview && sectionCard('Game Overview', (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '8px' }}>Good Goals</p>
            <p style={{ color: GREEN, fontWeight: 800, fontSize: '36px', marginBottom: '8px' }}>
              {(entry.gameOverview.goodGoals.period1 || 0) + (entry.gameOverview.goodGoals.period2 || 0) + (entry.gameOverview.goodGoals.period3 || 0)}
            </p>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
              <div>P1: {entry.gameOverview.goodGoals.period1 || 0}</div>
              <div>P2: {entry.gameOverview.goodGoals.period2 || 0}</div>
              <div>P3: {entry.gameOverview.goodGoals.period3 || 0}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '8px' }}>Bad Goals</p>
            <p style={{ color: RED, fontWeight: 800, fontSize: '36px', marginBottom: '8px' }}>
              {(entry.gameOverview.badGoals.period1 || 0) + (entry.gameOverview.badGoals.period2 || 0) + (entry.gameOverview.badGoals.period3 || 0)}
            </p>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
              <div>P1: {entry.gameOverview.badGoals.period1 || 0}</div>
              <div>P2: {entry.gameOverview.badGoals.period2 || 0}</div>
              <div>P3: {entry.gameOverview.badGoals.period3 || 0}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '8px' }}>Challenge Rating</p>
            <p style={{ color: BLUE, fontWeight: 800, fontSize: '36px', marginBottom: '8px' }}>
              {(((entry.gameOverview.degreeOfChallenge.period1 || 0) + (entry.gameOverview.degreeOfChallenge.period2 || 0) + (entry.gameOverview.degreeOfChallenge.period3 || 0)) / 3).toFixed(1)}
              <span style={{ fontSize: '17px' }}>/10</span>
            </p>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
              <div>P1: {entry.gameOverview.degreeOfChallenge.period1 || 0}/10</div>
              <div>P2: {entry.gameOverview.degreeOfChallenge.period2 || 0}/10</div>
              <div>P3: {entry.gameOverview.degreeOfChallenge.period3 || 0}/10</div>
            </div>
          </div>
        </div>
      ))}

      {/* Pre-Game */}
      {entry.preGame && sectionCard('Pre-Game Checklist', (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
          <div>{subHeading('Game Readiness')}{renderYesNoField('Well Rested', entry.preGame.gameReadiness.wellRested)}{renderYesNoField('Fueled for Game', entry.preGame.gameReadiness.fueledForGame)}</div>
          <div>{subHeading('MindSet')}{renderYesNoField('Mind Cleared', entry.preGame.mindSet.mindCleared)}{renderYesNoField('Mental Imagery', entry.preGame.mindSet.mentalImagery)}</div>
          <div>{subHeading('Pre-Game Routine')}{renderYesNoField('Ball Exercises', entry.preGame.preGameRoutine.ballExercises)}{renderYesNoField('Stretching', entry.preGame.preGameRoutine.stretching)}{renderYesNoField('Other', entry.preGame.preGameRoutine.other)}</div>
          <div>{subHeading('Warm-Up')}{renderYesNoField('Looked Engaged', entry.preGame.warmUp.lookedEngaged)}{renderYesNoField('Lacked Focus', entry.preGame.warmUp.lackedFocus)}{renderYesNoField('Team Warm-Up Needs Adjustment', entry.preGame.warmUp.teamWarmUpNeedsAdjustment)}</div>
        </div>
      ))}

      {/* Periods */}
      {([1, 2, 3] as const).map((periodNum) => {
        const periodKey = `period${periodNum}` as 'period1' | 'period2' | 'period3';
        const periodData = entry[periodKey];
        if (!periodData) return null;
        return sectionCard(`Period ${periodNum}`, (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            <div>{subHeading('MindSet')}{renderRadioField('Focus', { focusConsistent: periodData.mindSet.focusConsistent, focusInconsistent: periodData.mindSet.focusInconsistent })}{renderRadioField('Decision Making', { decisionMakingStrong: periodData.mindSet.decisionMakingStrong, decisionMakingImproving: periodData.mindSet.decisionMakingImproving, decisionMakingNeedsWork: periodData.mindSet.decisionMakingNeedsWork })}{renderRadioField('Body Language', { bodyLanguageConsistent: periodData.mindSet.bodyLanguageConsistent, bodyLanguageInconsistent: periodData.mindSet.bodyLanguageInconsistent })}</div>
            <div>{subHeading('Skating')}{renderRadioField('Skating Performance', { inSyncWithPuck: periodData.skating.inSyncWithPuck, improving: periodData.skating.improving, weak: periodData.skating.weak, notInSync: periodData.skating.notInSync })}</div>
            <div>{subHeading('Positional - Above Icing')}{renderRadioField('Performance Level', { poor: periodData.positionalAboveIcing.poor, improving: periodData.positionalAboveIcing.improving, good: periodData.positionalAboveIcing.good })}</div>
            <div>{subHeading('Positional - Below Icing')}{renderRadioField('Performance Level', { poor: periodData.positionalBelowIcing.poor, improving: periodData.positionalBelowIcing.improving, good: periodData.positionalBelowIcing.good, strong: periodData.positionalBelowIcing.strong })}</div>
            <div>{subHeading('Rebound Control')}{renderRadioField('Quality', { poor: periodData.reboundControl.poor, improving: periodData.reboundControl.improving, good: periodData.reboundControl.good })}{renderRadioField('Consistency', { consistent: periodData.reboundControl.consistent, inconsistent: periodData.reboundControl.inconsistent })}</div>
            <div>{subHeading('Freezing Puck')}{renderRadioField('Quality', { poor: periodData.freezingPuck.poor, improving: periodData.freezingPuck.improving, good: periodData.freezingPuck.good })}{renderRadioField('Consistency', { consistent: periodData.freezingPuck.consistent, inconsistent: periodData.freezingPuck.inconsistent })}</div>
            {periodNum === 3 && periodData.teamPlay && (
              <div style={{ gridColumn: '1 / -1' }}>
                {subHeading('Team Play (Period 3)')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>{renderRadioField('Setting Up Defense', { poor: periodData.teamPlay.settingUpDefense.poor, improving: periodData.teamPlay.settingUpDefense.improving, good: periodData.teamPlay.settingUpDefense.good })}</div>
                  <div>{renderRadioField('Setting Up Forwards', { poor: periodData.teamPlay.settingUpForwards.poor, improving: periodData.teamPlay.settingUpForwards.improving, good: periodData.teamPlay.settingUpForwards.good })}</div>
                </div>
              </div>
            )}
          </div>
        ));
      })}

      {/* Overtime & Shootout */}
      {(entry.overtime || entry.shootout) && sectionCard('Overtime & Shootout', (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
          {entry.overtime && (
            <div>
              {subHeading('Overtime')}
              {renderRadioField('MindSet Focus', { good: entry.overtime.mindSetFocus.good, needsWork: entry.overtime.mindSetFocus.needsWork })}
              {renderRadioField('Skating Performance', { good: entry.overtime.skatingPerformance.good, needsWork: entry.overtime.skatingPerformance.needsWork })}
              {renderRadioField('Positional Game', { good: entry.overtime.positionalGame.good, needsWork: entry.overtime.positionalGame.needsWork })}
            </div>
          )}
          {entry.shootout && (
            <div>
              {subHeading('Shootout')}
              <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>Result</p>
                <span style={{ background: entry.shootout.result === 'won' ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)', color: entry.shootout.result === 'won' ? GREEN : RED, padding: '3px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>{entry.shootout.result}</span>
              </div>
              {[['Shots Saved', entry.shootout.shotsSaved || 0], ['Shots Scored', entry.shootout.shotsScored || 0], ['Save %', `${entry.shootout.shotsSaved && (entry.shootout.shotsSaved + entry.shootout.shotsScored) > 0 ? ((entry.shootout.shotsSaved / (entry.shootout.shotsSaved + entry.shootout.shotsScored)) * 100).toFixed(1) : 0}%`]].map(([label, value]) => (
                <div key={String(label)} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>{label}</p>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '22px' }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Post-Game */}
      {entry.postGame && sectionCard('Post-Game Review', (
        <div>
          {renderYesNoField('Review Completed', entry.postGame.reviewCompleted)}
          {renderYesNoField('Review Not Completed', entry.postGame.reviewNotCompleted)}
        </div>
      ))}

      {/* Additional Comments */}
      {entry.additionalComments && sectionCard('Additional Comments', (
        <div style={{ background: 'rgba(55,181,255,0.05)', border: '1px solid rgba(55,181,255,0.12)', borderRadius: '10px', padding: '16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', whiteSpace: 'pre-wrap' }}>{entry.additionalComments}</p>
        </div>
      ))}
    </div>
  );
}
