'use client';

/**
 * Coach Audio context.
 *
 * Two problems this exists to solve:
 *
 *   1. There are close to a hundred "Hear Coach Mike" buttons across the site.
 *      If each one fetched its own clip record, opening a page would fire
 *      dozens of Firestore reads for a collection of at most 59 tiny
 *      documents. The provider reads the collection once and shares it.
 *
 *   2. Only one line should ever be audible. A single shared HTMLAudioElement
 *      means starting a clip stops whatever was playing, without every button
 *      needing to know about every other button.
 *
 * The voice on/off preference is per-viewer and lives in localStorage. It is a
 * convenience, not state anyone else needs, and it is read defensively — a
 * browser with site data blocked throws on access rather than returning null.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { coachAudioService } from '@/lib/database/services/coach-audio.service';
import type { CoachAudioClip } from '@/types/coach-audio';

const ENABLED_STORAGE_KEY = 'sg.coachAudio.enabled';

interface CoachAudioContextValue {
  /** Uploaded clips by id. Empty until the first load resolves. */
  clips: Record<string, CoachAudioClip>;
  isLoading: boolean;
  /** The clip currently playing, or null. */
  playingId: string | null;
  /** Viewer's voice on/off preference. */
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  play: (id: string) => void;
  pause: () => void;
  toggle: (id: string) => void;
  /** Re-reads the collection. Called by the admin screen after an upload. */
  refresh: () => Promise<void>;
}

const CoachAudioContext = createContext<CoachAudioContextValue | null>(null);

export function CoachAudioProvider({ children }: { children: ReactNode }) {
  const [clips, setClips] = useState<Record<string, CoachAudioClip>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [enabled, setEnabledState] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refresh = useCallback(async () => {
    const result = await coachAudioService.getAllClips();
    if (result.success && result.data) setClips(result.data);
    setIsLoading(false);
  }, []);

  // The first load runs here rather than calling `refresh()` in the effect
  // body, so the state updates land in a promise callback instead of
  // synchronously during the effect (which cascades a render, and which the
  // react-hooks lint rule rejects).
  useEffect(() => {
    let cancelled = false;

    void coachAudioService.getAllClips().then(result => {
      if (cancelled) return;
      if (result.success && result.data) setClips(result.data);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Restore the viewer's preference.
  //
  // Deferred to a timeout rather than read during render or set synchronously
  // on mount: the server has no localStorage, so it always renders with voice
  // on, and applying a stored `false` before hydration finishes would be a
  // markup mismatch. Reading is wrapped because access itself throws in a
  // browser configured to block site data.
  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const stored = window.localStorage.getItem(ENABLED_STORAGE_KEY);
        if (stored !== null) setEnabledState(stored === 'true');
      } catch {
        /* default to on */
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // One audio element for the whole app, created on the client only.
  useEffect(() => {
    const element = new Audio();
    element.preload = 'none';
    audioRef.current = element;

    const clearPlaying = () => setPlayingId(null);
    element.addEventListener('ended', clearPlaying);
    element.addEventListener('pause', clearPlaying);
    element.addEventListener('error', clearPlaying);

    return () => {
      element.removeEventListener('ended', clearPlaying);
      element.removeEventListener('pause', clearPlaying);
      element.removeEventListener('error', clearPlaying);
      element.pause();
      audioRef.current = null;
    };
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
  }, []);

  const play = useCallback(
    (id: string) => {
      const element = audioRef.current;
      const clip = clips[id];
      if (!element || !clip) return;

      // Switching clips: load the new source before playing. Assigning src to
      // the same value would restart it, which is the behaviour we want on a
      // repeat press anyway.
      if (element.src !== clip.url) element.src = clip.url;
      element.currentTime = 0;

      void element
        .play()
        .then(() => setPlayingId(id))
        .catch(() => {
          // Autoplay policy, a network failure, or a codec the browser will not
          // take. Either way the button should not be left showing "playing".
          setPlayingId(null);
        });
    },
    [clips]
  );

  const toggle = useCallback(
    (id: string) => {
      if (playingId === id) pause();
      else play(id);
    },
    [playingId, pause, play]
  );

  const setEnabled = useCallback(
    (value: boolean) => {
      setEnabledState(value);
      if (!value) pause();
      try {
        window.localStorage.setItem(ENABLED_STORAGE_KEY, String(value));
      } catch {
        /* preference simply will not persist */
      }
    },
    [pause]
  );

  const value = useMemo<CoachAudioContextValue>(
    () => ({ clips, isLoading, playingId, enabled, setEnabled, play, pause, toggle, refresh }),
    [clips, isLoading, playingId, enabled, setEnabled, play, pause, toggle, refresh]
  );

  return <CoachAudioContext.Provider value={value}>{children}</CoachAudioContext.Provider>;
}

export function useCoachAudio(): CoachAudioContextValue {
  const context = useContext(CoachAudioContext);
  if (!context) {
    throw new Error('useCoachAudio must be used inside a CoachAudioProvider');
  }
  return context;
}

/**
 * Everything one button needs for one clip.
 *
 * `available` is false when the recording has not been uploaded — which is the
 * normal state for the eight pillar intros, and for every line Michael has not
 * recorded for the marketing pages. Callers decide whether that means a
 * disabled button or no button at all.
 */
export function useCoachAudioClip(id: string) {
  const { clips, isLoading, playingId, enabled, toggle } = useCoachAudio();
  const clip = clips[id] ?? null;

  return {
    clip,
    available: clip !== null,
    isLoading,
    isPlaying: playingId === id,
    enabled,
    toggle: useCallback(() => toggle(id), [toggle, id]),
  };
}
