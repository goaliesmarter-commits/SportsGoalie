'use client';

import { useEffect, useMemo, useState } from 'react';
import { chartingService } from '@/lib/database';
import { ChartingEntry, Session } from '@/types';
import {
  Calendar, MapPin, Trophy, Dumbbell,
  ChevronDown, ChevronUp, ClipboardList, Filter, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { V2ChartReadOnlyView } from './V2ChartReadOnlyView';

const BLUE = '#37b5ff';

type V2Fields = { v2PreGame?: unknown; v2Periods?: unknown; v2PostGame?: unknown; v2Practice?: unknown };
type TypeFilter = 'all' | 'game' | 'practice';

interface GoalieChartingHistoryProps {
  studentId: string;
  onOpenSession?: (sessionId: string) => void;
}

const hasV2Data = (entry: ChartingEntry | undefined): boolean => {
  if (!entry) return false;
  const v2 = entry as unknown as V2Fields;
  return !!(v2.v2PreGame || v2.v2Periods || v2.v2PostGame || v2.v2Practice);
};

const isComplete = (entry: ChartingEntry | undefined, sessionType: string): boolean => {
  if (!entry) return false;
  const v2 = entry as unknown as V2Fields;
  if (sessionType === 'practice') return !!v2.v2Practice;
  return !!v2.v2PreGame && !!v2.v2Periods && !!v2.v2PostGame;
};

export function GoalieChartingHistory({ studentId, onOpenSession }: GoalieChartingHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entries, setEntries] = useState<ChartingEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [sessionsResult, entriesResult] = await Promise.all([
          chartingService.getSessionsByStudent(studentId, { limit: 200, orderBy: 'date', orderDirection: 'desc' }),
          chartingService.getChartingEntriesByStudent(studentId),
        ]);
        if (cancelled) return;
        setSessions(sessionsResult.success ? sessionsResult.data || [] : []);
        setEntries(entriesResult.success ? entriesResult.data || [] : []);
      } catch (err) {
        console.error('Failed to load charting history', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  const entriesBySession = useMemo(() => {
    const map = new Map<string, ChartingEntry>();
    entries.forEach((e) => {
      const existing = map.get(e.sessionId);
      if (!existing || (hasV2Data(e) && !hasV2Data(existing))) map.set(e.sessionId, e);
    });
    return map;
  }, [entries]);

  const filteredSessions = useMemo(() =>
    sessions.filter((s) => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      return hasV2Data(entriesBySession.get(s.id));
    }), [sessions, entriesBySession, typeFilter]);

  const counts = useMemo(() => {
    const all = sessions.filter((s) => hasV2Data(entriesBySession.get(s.id)));
    return { all: all.length, game: all.filter(s => s.type === 'game').length, practice: all.filter(s => s.type === 'practice').length };
  }, [sessions, entriesBySession]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: '12px' }}>
        <Loader2 size={24} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Loading charting history…</p>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  if (counts.all === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <ClipboardList size={26} color="rgba(255,255,255,0.2)" />
        </div>
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>No charting history yet</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>Once the goalie charts a game or practice session, it will appear here.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <Filter size={13} color="rgba(255,255,255,0.3)" />
        {([
          { key: 'all' as TypeFilter, label: 'All', count: counts.all },
          { key: 'game' as TypeFilter, label: 'Games', count: counts.game },
          { key: 'practice' as TypeFilter, label: 'Practices', count: counts.practice },
        ]).map((opt) => (
          <button key={opt.key} type="button" onClick={() => setTypeFilter(opt.key)}
            style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              background: typeFilter === opt.key ? BLUE : 'rgba(255,255,255,0.06)',
              border: typeFilter === opt.key ? `1px solid ${BLUE}` : '1px solid rgba(255,255,255,0.1)',
              color: typeFilter === opt.key ? '#000f28' : 'rgba(255,255,255,0.5)',
            }}
          >
            {opt.label} · {opt.count}
          </button>
        ))}
      </div>

      {/* Session list */}
      {filteredSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>No {typeFilter === 'all' ? '' : typeFilter + ' '}sessions in history.</p>
        </div>
      ) : (
        filteredSessions.map((session) => {
          const entry = entriesBySession.get(session.id);
          const expanded = expandedId === session.id;
          const complete = isComplete(entry, session.type);
          const TypeIcon = session.type === 'game' ? Trophy : Dumbbell;
          const dateStr = session.date?.toDate ? format(session.date.toDate(), 'EEE, MMM d, yyyy') : '';
          const typeAccent = session.type === 'game' ? BLUE : '#4ade80';

          return (
            <div key={session.id} style={{ background: 'rgba(2,18,44,0.7)', border: `1px solid rgba(55,181,255,0.12)`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
              <button type="button" onClick={() => setExpandedId(expanded ? null : session.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(55,181,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${typeAccent}15`, border: `1px solid ${typeAccent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TypeIcon size={18} color={typeAccent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>
                      {session.type}
                      {session.opponent && <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}> vs {session.opponent}</span>}
                    </p>
                    <span style={{
                      fontSize: '9px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: '20px',
                      color: complete ? '#4ade80' : '#fbbf24',
                      background: complete ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
                      border: complete ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(251,191,36,0.3)',
                    }}>
                      {complete ? '✓ Complete' : 'Partial'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} /> {dateStr}
                    </span>
                    {session.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <MapPin size={11} /> {session.location}
                      </span>
                    )}
                  </div>
                </div>
                {expanded
                  ? <ChevronUp size={15} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
                  : <ChevronDown size={15} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
                }
              </button>

              {expanded && entry && (
                <div style={{ borderTop: '1px solid rgba(55,181,255,0.1)', background: 'rgba(2,18,44,0.5)', padding: '16px' }}>
                  {/*
                    Flat: this drawer already sits inside the session card, which
                    sits inside the page card. Framed sections here would be the
                    fourth outline in the stack.
                  */}
                  <V2ChartReadOnlyView entry={entry} session={session} variant="flat" />
                  {onOpenSession && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <button onClick={() => onOpenSession(session.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: `1px solid ${BLUE}40`, color: BLUE, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        Open full session →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
