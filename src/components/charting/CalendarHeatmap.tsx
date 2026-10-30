'use client';

import { useEffect, useRef } from 'react';
import { Session, DynamicChartingEntry } from '@/types';
import { format, startOfDay, addDays, getDay, differenceInCalendarDays } from 'date-fns';
import { isV2GameEntry, v2GameProgress } from '@/lib/charting/v2-sections';

interface CalendarHeatmapProps {
  sessions: Session[];
  chartingEntries: any[];
  dynamicEntries?: DynamicChartingEntry[];
  onDayClick: (date: Date, sessions: Session[]) => void;
  colorScheme?: 'default' | 'blue';
}

export const CalendarHeatmap = ({
  sessions,
  chartingEntries,
  dynamicEntries = [],
  onDayClick,
}: CalendarHeatmapProps) => {
  const today = startOfDay(new Date());
  const yearStart = addDays(today, -365);
  const yearEnd = addDays(today, 90);
  const totalDays = 455;

  // The grid runs a year back and 90 days ahead, so it is wider than most screens
  // and used to open on the oldest (empty) months. Open it centred on today.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const weekPitch = 20; // 14px cell + 6px gap
    const labelGutter = 40;
    const firstColumnDate = addDays(yearStart, -getDay(yearStart));
    const todayColumn = Math.floor(differenceInCalendarDays(today, firstColumnDate) / 7);
    el.scrollLeft = Math.max(0, labelGutter + todayColumn * weekPitch - el.clientWidth / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toJsDate = (rawDate: unknown): Date | null => {
    if (
      rawDate &&
      typeof rawDate === 'object' &&
      'toDate' in rawDate &&
      typeof (rawDate as { toDate?: unknown }).toDate === 'function'
    ) {
      return (rawDate as { toDate: () => Date }).toDate();
    }
    if (rawDate instanceof Date) return rawDate;
    if (typeof rawDate === 'string' || typeof rawDate === 'number') {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const sessionsByDate = sessions.reduce((acc, session) => {
    const sessionDate = toJsDate((session as unknown as { date?: unknown }).date);
    if (!sessionDate) return acc;
    const dateKey = format(startOfDay(sessionDate), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  const isLegacyEntryComplete = (entry: any): boolean => {
    if (!entry) return false;
    // V2 game charts keep their sections under different fields and are judged on
    // whether each one holds an answer.
    if (isV2GameEntry(entry)) return v2GameProgress(entry) === 'complete';
    return !!entry.preGame && !!entry.gameOverview && !!entry.period1 && !!entry.period2 && !!entry.period3 && !!entry.postGame;
  };

  const isDynamicEntryComplete = (entry: DynamicChartingEntry): boolean => !!entry?.isComplete;
  const isDynamicEntryPartial  = (entry: DynamicChartingEntry): boolean => !!(entry?.completionPercentage > 0 && !entry.isComplete);

  const legacyEntriesBySession  = chartingEntries.reduce((acc, e) => { acc[e.sessionId] = e; return acc; }, {} as Record<string, any>);
  const dynamicEntriesBySession = dynamicEntries.reduce((acc, e) => { if (e.sessionId) acc[e.sessionId] = e; return acc; }, {} as Record<string, DynamicChartingEntry>);

  const getCompletionLevel = (date: Date): number => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const daySessions = sessionsByDate[dateKey];
    if (!daySessions || daySessions.length === 0) return 0;

    let fullyCompleteCount = 0;
    let partiallyCompleteCount = 0;

    daySessions.forEach(session => {
      const dynamicEntry = dynamicEntriesBySession[session.id];
      if (dynamicEntry) {
        if (isDynamicEntryComplete(dynamicEntry)) fullyCompleteCount++;
        else if (isDynamicEntryPartial(dynamicEntry)) partiallyCompleteCount++;
        return;
      }
      const legacyEntry = legacyEntriesBySession[session.id];
      if (legacyEntry) {
        if (isLegacyEntryComplete(legacyEntry)) fullyCompleteCount++;
        // A V2 chart with every section blank has nothing charted yet.
        else if (!isV2GameEntry(legacyEntry) || v2GameProgress(legacyEntry) === 'partial') partiallyCompleteCount++;
      }
    });

    const totalCount = daySessions.length;
    if (fullyCompleteCount === 0 && partiallyCompleteCount === 0) return 1;
    if (fullyCompleteCount === totalCount) return 3;
    return 2;
  };

  const getCellStyle = (level: number, isToday: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      cursor: 'pointer',
      transition: 'all 0.15s',
      border: 'none',
      padding: 0,
      flexShrink: 0,
      outline: isToday ? '2px solid rgba(55,181,255,0.85)' : undefined,
      outlineOffset: isToday ? '2px' : undefined,
    };
    switch (level) {
      case 0: return { ...base, background: 'rgba(255,255,255,0.07)' };
      case 1: return { ...base, background: 'rgba(55,181,255,0.22)', border: '1px solid rgba(55,181,255,0.35)' };
      case 2: return { ...base, background: 'rgba(55,181,255,0.55)', boxShadow: '0 0 5px rgba(55,181,255,0.35)' };
      case 3: return { ...base, background: '#37b5ff', boxShadow: '0 0 8px rgba(55,181,255,0.7), 0 0 2px rgba(55,181,255,0.9)' };
      default: return { ...base, background: 'rgba(255,255,255,0.07)' };
    }
  };

  const firstDate = addDays(yearStart, -getDay(yearStart));
  const weeksNeeded = Math.ceil((totalDays + getDay(yearStart)) / 7);
  const grid: Date[][] = Array.from({ length: 7 }, () => []);

  for (let week = 0; week < weeksNeeded; week++) {
    for (let day = 0; day < 7; day++) {
      grid[day].push(addDays(firstDate, week * 7 + day));
    }
  }

  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  for (let week = 0; week < weeksNeeded; week++) {
    const date = addDays(firstDate, week * 7);
    const month = date.getMonth();
    if (month !== lastMonth && date >= yearStart && date <= yearEnd) {
      monthLabels.push({ label: format(date, 'MMM'), weekIndex: week });
      lastMonth = month;
    }
  }

  const LEGEND = [
    { label: 'None',      style: { background: 'rgba(255,255,255,0.07)' } as React.CSSProperties },
    { label: 'Scheduled', style: { background: 'rgba(55,181,255,0.22)', border: '1px solid rgba(55,181,255,0.35)' } as React.CSSProperties },
    { label: 'Partial',   style: { background: 'rgba(55,181,255,0.55)', boxShadow: '0 0 5px rgba(55,181,255,0.35)' } as React.CSSProperties },
    { label: 'Complete',  style: { background: '#37b5ff', boxShadow: '0 0 8px rgba(55,181,255,0.6)' } as React.CSSProperties },
  ];

  return (
    <div className="space-y-4">
      <style>{`
        .cal-heatmap-scroll::-webkit-scrollbar{height:6px}
        .cal-heatmap-scroll::-webkit-scrollbar-thumb{background:rgba(55,181,255,0.35);border-radius:99px}
        .cal-heatmap-scroll::-webkit-scrollbar-track{background:transparent}
      `}</style>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Legend</span>
        {LEGEND.map(({ label, style }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, ...style }} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div ref={scrollRef} className="overflow-x-auto pb-2 cal-heatmap-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(55,181,255,0.35) transparent' }}>
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels */}
          <div className="relative h-5 ml-10 mb-1">
            {monthLabels.map((month) => (
              <div
                key={month.weekIndex}
                style={{ position: 'absolute', left: `${month.weekIndex * 20}px`, fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}
              >
                {month.label}
              </div>
            ))}
          </div>

          {/* Grid container with day labels */}
          <div className="flex gap-2">
            {/* Day labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '8px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                <div key={day} style={{ height: '14px', display: 'flex', alignItems: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  {idx % 2 === 1 ? day[0] : ''}
                </div>
              ))}
            </div>

            {/* Weeks (columns) */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {grid[0].map((_, weekIndex) => (
                <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {grid.map((row, dayIndex) => {
                    const date = row[weekIndex];
                    const isInRange = date >= yearStart && date <= yearEnd;

                    if (!isInRange) return <div key={dayIndex} style={{ width: '14px', height: '14px' }} />;

                    const level = getCompletionLevel(date);
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const daySessions = sessionsByDate[dateKey] || [];
                    const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

                    return (
                      <button
                        key={dayIndex}
                        onClick={() => onDayClick(date, daySessions)}
                        style={getCellStyle(level, isToday)}
                        title={`${format(date, 'MMM d, yyyy')}: ${daySessions.length} session${daySessions.length !== 1 ? 's' : ''}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)', fontWeight: 500 }}>
        {format(yearStart, 'MMM d, yyyy')} &ndash; {format(yearEnd, 'MMM d, yyyy')} &bull; {sessions.length} total sessions
      </div>
    </div>
  );
};
