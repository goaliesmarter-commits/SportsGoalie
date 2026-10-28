'use client';

/**
 * Says one of the short event lines (V-A-27 to V-A-37) when something happens.
 *
 *   const say = useEventVoice();
 *   ...
 *   if (result.success) say('chartSaved');
 *
 * It does nothing, quietly, unless the viewer is a goalie, the event has not
 * just spoken, and nothing else is being said. See `eventMaySpeak`.
 *
 * "Has not just spoken" is counted per place. Steps that follow one another,
 * like the Pre-Game save and then the Periods save, are each a place of their
 * own and each get their line; saving the same step again is what is held back:
 *
 *   say('nextStep', 'periods');
 *
 * On an iPhone a line that no tap started is refused until the page has played
 * a clip from a tap once. That is left alone on purpose: waking the phone's
 * audio on every save would pause the goalie's music for a line that may not
 * even be on file.
 */

import { useCallback } from 'react';

import { useAuth } from '@/lib/auth/context';
import { useCoachAudio } from '@/lib/audio/context';
import { builtInLine, eventMaySpeak, type VoiceEventKey } from '@/lib/audio/events';
import { momentSlotKey } from '@/lib/audio/slots';

/**
 * When each event last spoke in this tab, by event and place. Module-level so it
 * survives navigation from one step to the next.
 */
const lastSpokeAt = new Map<string, number>();

/**
 * The clip the last moment tried to play. When a phone refuses it, the message
 * chip offers it with a tap instead of losing it (see MomentMessageChip).
 */
let lastMomentClip: string | null = null;

export function lastMomentClipId(): string | null {
  return lastMomentClip;
}

/** Forgets what has spoken. For tests. */
export function resetEventVoice(): void {
  lastSpokeAt.clear();
  lastMomentClip = null;
}

/**
 * The recording for an event: one Coach Mike placed on it in admin, taking turns
 * when he placed several, or else the line built into the code.
 */
export function pickMomentClip(placed: string[], fallback: string | null, random: () => number = Math.random): string | null {
  if (placed.length > 0) return placed[Math.floor(random() * placed.length) % placed.length];
  return fallback;
}

export function useEventVoice(): (event: VoiceEventKey, place?: string) => boolean {
  const { user } = useAuth();
  const { isLoading, playLine, clipsForSlot } = useCoachAudio();

  return useCallback(
    (event: VoiceEventKey, place?: string) => {
      const now = Date.now();
      const key = place ? `${event}:${place}` : event;
      if (isLoading || !eventMaySpeak(event, user, lastSpokeAt.get(key), now)) return false;

      const clipId = pickMomentClip(clipsForSlot(momentSlotKey(event)), builtInLine(event));
      if (!clipId) return false;

      const started = playLine(clipId);
      if (started) {
        lastSpokeAt.set(key, now);
        lastMomentClip = clipId;
      }
      return started;
    },
    [user, isLoading, playLine, clipsForSlot]
  );
}
