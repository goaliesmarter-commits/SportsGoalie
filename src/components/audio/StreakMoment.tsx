'use client';

/**
 * Coach Mike marks a learning-streak milestone (3, 7, 14, 30 days…) once, when
 * the goalie's dashboard shows it (Audio Part 3). Renders nothing.
 *
 * Which milestone was last celebrated is kept in this browser, per goalie. That
 * is a convenience, not a record: on a new phone the same milestone may be
 * celebrated once more, which is a kinder mistake than missing one.
 */

import { useEffect, useRef } from 'react';

import { useEventVoice } from '@/hooks/useEventVoice';
import { useAuth } from '@/lib/auth/context';
import { useCoachAudio } from '@/lib/audio/context';
import { streakMilestoneReached } from '@/lib/audio/learning-moments';

function storageKey(userId: string): string {
  return `sg.streakCelebrated.${userId}`;
}

function readCelebrated(userId: string): number {
  try {
    const stored = Number(window.localStorage.getItem(storageKey(userId)));
    return Number.isFinite(stored) ? stored : 0;
  } catch {
    return 0;
  }
}

function writeCelebrated(userId: string, milestone: number): void {
  try {
    window.localStorage.setItem(storageKey(userId), String(milestone));
  } catch {
    /* the milestone may simply be celebrated again next time */
  }
}

export function StreakMoment({ days }: { days: number }): null {
  const say = useEventVoice();
  const { user, loading: authLoading } = useAuth();
  const { isLoading } = useCoachAudio();
  const tried = useRef(false);

  useEffect(() => {
    if (authLoading || isLoading || tried.current || !user || days <= 0) return;
    tried.current = true;

    const celebrated = readCelebrated(user.id);
    const milestone = streakMilestoneReached(days, celebrated);
    if (milestone === null) {
      // A broken streak resets what counts as new, so the next 3 days is celebrated again.
      if (days < celebrated) writeCelebrated(user.id, 0);
      return;
    }
    if (say('streakReached')) writeCelebrated(user.id, milestone);
  }, [authLoading, isLoading, user, days, say]);

  return null;
}
