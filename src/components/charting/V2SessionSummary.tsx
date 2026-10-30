'use client';

import { ChartingEntry } from '@/types';
import { V2PeriodData, V2PostGameData, V2PreGameData } from '@/types/charting';
import { filledPeriods } from '@/lib/charting/v2-periods';

interface V2SessionSummaryProps {
  entry: ChartingEntry;
}

interface Tile {
  label: string;
  value: string;
  sub?: string;
  color: string;
  bg: string;
  border: string;
}

const GREEN = { color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' };
const RED = { color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' };
const BLUE = { color: '#37b5ff', bg: 'rgba(55,181,255,0.08)', border: 'rgba(55,181,255,0.18)' };
const NEUTRAL = { color: '#ffffff', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' };

const PERIOD_SHORT: Record<string, string> = { period1: 'P1', period2: 'P2', period3: 'P3', overtime: 'OT' };

/**
 * The numbers from a V2 game chart, for the Session Analytics box on the game
 * page. That box used to read only the legacy chart fields, so a game charted
 * in V2 showed the heading and nothing under it.
 */
export function V2SessionSummary({ entry }: V2SessionSummaryProps) {
  const raw = entry as unknown as {
    v2PreGame?: V2PreGameData;
    v2Periods?: Partial<Record<'period1' | 'period2' | 'period3' | 'overtime', V2PeriodData>>;
    v2PostGame?: V2PostGameData;
  };
  const periods = filledPeriods(raw.v2Periods);
  const post = raw.v2PostGame;
  const pre = raw.v2PreGame;

  const sum = (pick: (p: V2PeriodData) => number) => periods.reduce((n, [, p]) => n + pick(p), 0);
  const shots = sum((p) => p.shots || 0);
  const saves = sum((p) => p.saves || 0);
  const goalsAgainst = sum((p) => p.goalsAgainst || 0);
  const goodGoals = sum((p) => (p.goals ?? []).filter((g) => g.isGoodGoal).length);
  const weakGoals = sum((p) => (p.goals ?? []).filter((g) => !g.isGoodGoal).length);

  const rated = periods.filter(([, p]) => typeof p.mindControlRating === 'number');
  const mindAvg = rated.length > 0
    ? rated.reduce((n, [, p]) => n + (p.mindControlRating as number), 0) / rated.length
    : null;

  // A period with nothing entered reads as a dash: a 0 here would look like a rating of 0.
  const perPeriod = (pick: (p: V2PeriodData) => number | undefined) =>
    periods.map(([key, p]) => `${PERIOD_SHORT[key]}: ${pick(p) ?? '–'}`).join(' | ');

  const tiles: Tile[] = [];
  if (shots > 0 || saves > 0 || goalsAgainst > 0) {
    tiles.push({ label: 'Shots', value: String(shots), sub: perPeriod((p) => p.shots || 0), ...BLUE });
    tiles.push({ label: 'Saves', value: String(saves), sub: perPeriod((p) => p.saves || 0), ...GREEN });
    tiles.push({ label: 'Goals Against', value: String(goalsAgainst), sub: perPeriod((p) => p.goalsAgainst || 0), ...RED });
  }
  if (goodGoals + weakGoals > 0) {
    tiles.push({ label: 'Good Goals', value: String(goodGoals), ...GREEN });
    tiles.push({ label: 'Weak Goals', value: String(weakGoals), ...RED });
  }
  if (mindAvg !== null) {
    tiles.push({
      label: 'Emotional Balance',
      value: `${mindAvg.toFixed(1)}/5`,
      sub: perPeriod((p) => p.mindControlRating),
      ...BLUE,
    });
  }
  if (typeof pre?.mentalStateRating === 'number') {
    tiles.push({ label: 'Pre-Game Mental State', value: `${pre.mentalStateRating}/5`, ...NEUTRAL });
  }
  if (typeof post?.overallGameFactorRating === 'number') {
    tiles.push({ label: 'Overall Game Factor', value: `${post.overallGameFactorRating}/5`, ...NEUTRAL });
  }
  if (typeof post?.gameRetentionRating === 'number') {
    tiles.push({ label: 'Game Retention', value: `${post.gameRetentionRating}/5`, ...NEUTRAL });
  }

  if (tiles.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-white/50">Nothing charted for this game yet</p>
        <p className="text-sm text-white/30 mt-2">Fill in a section above to see its numbers here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-lg p-4" style={{ background: tile.bg, border: `1px solid ${tile.border}` }}>
          <p className="text-sm text-white/50 mb-1">{tile.label}</p>
          <p className="text-3xl font-bold" style={{ color: tile.color }}>{tile.value}</p>
          {tile.sub && <p className="text-xs text-white/35 mt-1">{tile.sub}</p>}
        </div>
      ))}
    </div>
  );
}
