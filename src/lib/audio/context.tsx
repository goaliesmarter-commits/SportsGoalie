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
 *
 * Takes Michael is re-recording are left out of `clips` altogether, so every
 * button and every freeze point treats them as not uploaded yet. See
 * `isHeldForReRecord`.
 *
 * iPhones refuse a play that no tap started. `prime()` unlocks the shared
 * element from a tap, and `blockedId` names the clip the phone last refused so
 * the screen can ask for the tap instead of staying silent. See playback.ts.
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

import { clipIdsForSlot, displayText, type AudioSettingsMap } from '@/lib/audio/library';
import { primeElement, resumeClip, startClip } from '@/lib/audio/playback';
import { coachAudioService } from '@/lib/database/services/coach-audio.service';
import { playableClips, type CoachAudioClip } from '@/types/coach-audio';

const ENABLED_STORAGE_KEY = 'sg.coachAudio.enabled';

interface CoachAudioContextValue {
  /** Clips that may play, by id: uploaded, not held, not hidden. Empty until the first load resolves. */
  clips: Record<string, CoachAudioClip>;
  /** What admin has set on each recording: text, label, places, hidden. */
  settings: AudioSettingsMap;
  /** The recordings admin has placed in a slot that can play now, in library order. */
  clipsForSlot: (slot: string) => string[];
  /** The words to show with a recording, or undefined when there are none to trust. */
  textFor: (id: string) => string | undefined;
  /**
   * True until the clip list is in and the viewer's voice preference has been
   * read, so nothing starts on the strength of a default the preference is
   * about to overturn.
   */
  isLoading: boolean;
  /** The clip currently playing, or null. */
  playingId: string | null;
  /** The clip whose last play the browser refused for want of a tap, or null. */
  blockedId: string | null;
  /** Viewer's voice on/off preference. */
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  play: (id: string) => void;
  /**
   * Plays the clips one after another, each starting as the last one ends.
   * Starting any other clip, or pausing, drops whatever of the sequence has
   * not played yet. Call it from a tap handler on an iPhone, as with `play`.
   */
  playSequence: (ids: string[]) => void;
  /**
   * Plays a short line for something that has just happened, if it is fine to
   * talk: voice on, the clip on file, and nothing already being said or waiting
   * to be said. A line that cannot start is dropped, never queued, and never
   * cuts another clip off. Returns whether it started.
   */
  playLine: (id: string) => boolean;
  pause: () => void;
  /** Stops `id` if it is the clip playing, and leaves anything else alone. */
  stopClip: (id: string) => void;
  toggle: (id: string) => void;
  /**
   * Unlocks playback for a later play no tap starts, such as the freeze-point
   * voice. Call it synchronously inside a tap handler. Silent, and does nothing
   * once the element is unlocked.
   */
  prime: () => void;
  /** Re-reads the collection. Called by the admin screen after an upload. */
  refresh: () => Promise<void>;
  /**
   * Plays `id` from where it was paused, or from the start if it was not the
   * clip last playing or had finished. For long recordings with a progress bar.
   */
  resume: (id: string) => void;
  /** Moves the clip that is loaded to `seconds`. */
  seek: (seconds: number) => void;
  /** The shared element and the clip it was last asked to play, for progress bars. */
  getElement: () => HTMLAudioElement | null;
  getLoadedId: () => string | null;
}

const CoachAudioContext = createContext<CoachAudioContextValue | null>(null);

export function CoachAudioProvider({ children }: { children: ReactNode }) {
  const [clips, setClips] = useState<Record<string, CoachAudioClip>>({});
  const [settings, setSettings] = useState<AudioSettingsMap>({});
  const [clipsLoading, setIsLoading] = useState(true);
  const [preferenceRead, setPreferenceRead] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [blockedId, setBlockedId] = useState<string | null>(null);
  const [enabled, setEnabledState] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // True once the element has played from a tap, so `prime` has nothing to do.
  const unlockedRef = useRef(false);
  // The clip the element was last asked to play. Set at once rather than when
  // play() resolves, so `stopClip` also catches a clip that is still starting.
  const requestedIdRef = useRef<string | null>(null);
  // What is still to play after the current clip, in order. Only `playSequence`
  // fills it; any other way of starting or stopping a clip empties it.
  const queueRef = useRef<string[]>([]);
  // Always the latest "start the next queued clip", so the audio element's
  // 'ended' listener, which is attached once, never calls a stale one.
  const advanceRef = useRef<() => void>(() => {});

  const refresh = useCallback(async () => {
    const result = await coachAudioService.getLibrary();
    if (result.success && result.data) {
      setClips(playableClips(result.data.clips, result.data.settings));
      setSettings(result.data.settings);
    }
    setIsLoading(false);
  }, []);

  // The first load runs here rather than calling `refresh()` in the effect
  // body, so the state updates land in a promise callback instead of
  // synchronously during the effect (which cascades a render, and which the
  // react-hooks lint rule rejects).
  useEffect(() => {
    let cancelled = false;

    void coachAudioService.getLibrary().then(result => {
      if (cancelled) return;
      if (result.success && result.data) {
        setClips(playableClips(result.data.clips, result.data.settings));
        setSettings(result.data.settings);
      }
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
      setPreferenceRead(true);
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
    // A clip that ends by itself hands over to the next one queued. 'pause'
    // fires on a natural end too, so it must not touch the queue; only an
    // explicit pause() or a failure does.
    const onEnded = () => {
      clearPlaying();
      advanceRef.current();
    };
    const onError = () => {
      queueRef.current = [];
      clearPlaying();
    };
    element.addEventListener('ended', onEnded);
    element.addEventListener('pause', clearPlaying);
    element.addEventListener('error', onError);

    return () => {
      element.removeEventListener('ended', onEnded);
      element.removeEventListener('pause', clearPlaying);
      element.removeEventListener('error', onError);
      element.pause();
      audioRef.current = null;
    };
  }, []);

  const pause = useCallback(() => {
    queueRef.current = [];
    audioRef.current?.pause();
    setPlayingId(null);
    // A refused play only matters while its moment is on screen.
    setBlockedId(null);
  }, []);

  // Starts one clip and leaves the queue as it is.
  const startOne = useCallback(
    (id: string) => {
      const element = audioRef.current;
      const clip = clips[id];
      if (!element || !clip) return;

      requestedIdRef.current = id;

      // `startClip` calls play() before it returns, so a press still counts as
      // the tap on an iPhone.
      void startClip(element, clip.url).then(outcome => {
        if (outcome === 'playing') {
          unlockedRef.current = true;
          setBlockedId(null);
          setPlayingId(id);
          return;
        }

        // Whatever went wrong, the button must not be left showing "playing".
        setPlayingId(null);

        // A clip that did not start ends the sequence it was part of, unless
        // something newer has already taken over the element.
        if (requestedIdRef.current === id) queueRef.current = [];

        if (outcome === 'blocked') {
          // The phone wants a tap. Say which clip, so the screen can ask for
          // one, and unlock again on the next tap that primes.
          unlockedRef.current = false;
          setBlockedId(id);
        }
      });
    },
    [clips]
  );

  useEffect(() => {
    advanceRef.current = () => {
      const next = queueRef.current.shift();
      if (next) startOne(next);
    };
  }, [startOne]);

  const play = useCallback(
    (id: string) => {
      queueRef.current = [];
      startOne(id);
    },
    [startOne]
  );

  const playSequence = useCallback(
    (ids: string[]) => {
      // A line that is not on file is skipped rather than ending the run. A
      // caller that needs every line, or none, checks `clips` first.
      const playable = ids.filter(id => clips[id]);
      if (playable.length === 0) return;

      queueRef.current = playable.slice(1);
      startOne(playable[0]);
    },
    [clips, startOne]
  );

  const playLine = useCallback(
    (id: string) => {
      const element = audioRef.current;
      if (!enabled || !element || !clips[id]) return false;
      // `paused` goes false the moment play() is called, so this also covers a
      // clip that is still loading.
      if (!element.paused || queueRef.current.length > 0) return false;

      startOne(id);
      return true;
    },
    [enabled, clips, startOne]
  );

  const prime = useCallback(() => {
    const element = audioRef.current;
    // A playing element is already unlocked, and priming it would cut it off.
    if (!element || unlockedRef.current || !element.paused) return;

    requestedIdRef.current = null;
    void primeElement(element).then(unlocked => {
      if (unlocked) unlockedRef.current = true;
    });
  }, []);

  const stopClip = useCallback(
    (id: string) => {
      const element = audioRef.current;
      if (element && requestedIdRef.current === id && !element.paused) pause();
    },
    [pause]
  );

  const resume = useCallback(
    (id: string) => {
      const element = audioRef.current;
      const canResume =
        element && requestedIdRef.current === id && element.paused && !element.ended && element.currentTime > 0;
      if (!element || !canResume) {
        play(id);
        return;
      }
      queueRef.current = [];
      void resumeClip(element).then(outcome => {
        if (outcome === 'playing') {
          unlockedRef.current = true;
          setBlockedId(null);
          setPlayingId(id);
        } else if (outcome === 'blocked') {
          unlockedRef.current = false;
          setBlockedId(id);
        }
      });
    },
    [play]
  );

  const seek = useCallback((seconds: number) => {
    const element = audioRef.current;
    if (!element || !Number.isFinite(seconds)) return;
    element.currentTime = Math.max(0, seconds);
  }, []);

  const getElement = useCallback(() => audioRef.current, []);
  const getLoadedId = useCallback(() => requestedIdRef.current, []);

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

  const clipsForSlot = useCallback(
    (slot: string) => clipIdsForSlot(slot, settings, clips),
    [settings, clips]
  );
  const textFor = useCallback((id: string) => displayText(id, settings), [settings]);

  const isLoading = clipsLoading || !preferenceRead;

  const value = useMemo<CoachAudioContextValue>(
    () => ({
      clips,
      settings,
      clipsForSlot,
      textFor,
      isLoading,
      playingId,
      blockedId,
      enabled,
      setEnabled,
      play,
      playSequence,
      playLine,
      pause,
      stopClip,
      toggle,
      prime,
      refresh,
      resume,
      seek,
      getElement,
      getLoadedId,
    }),
    [
      clips,
      settings,
      clipsForSlot,
      textFor,
      isLoading,
      playingId,
      blockedId,
      enabled,
      setEnabled,
      play,
      playSequence,
      playLine,
      pause,
      stopClip,
      toggle,
      prime,
      refresh,
      resume,
      seek,
      getElement,
      getLoadedId,
    ]
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
 * recorded for the marketing pages — and while a take is held for re-recording.
 * Callers decide whether that means a disabled button or no button at all.
 *
 * `wasBlocked` is true when this clip's last play was refused because nobody
 * tapped; a tap on the button will play it.
 */
export function useCoachAudioClip(id: string) {
  const { clips, isLoading, playingId, blockedId, enabled, toggle } = useCoachAudio();
  const clip = clips[id] ?? null;

  return {
    clip,
    available: clip !== null,
    isLoading,
    isPlaying: playingId === id,
    wasBlocked: clip !== null && blockedId === id,
    enabled,
    toggle: useCallback(() => toggle(id), [toggle, id]),
  };
}

/**
 * Where the shared element is in clip `id`, for a progress bar. Zero, with no
 * duration, while some other clip is loaded. Reads the element's own events, so
 * it follows a seek or a pause made anywhere.
 */
export function usePlaybackPosition(id: string | null): { currentTime: number; duration: number | null } {
  const { getElement, getLoadedId, playingId } = useCoachAudio();
  const [position, setPosition] = useState<{ currentTime: number; duration: number | null }>({
    currentTime: 0,
    duration: null,
  });

  useEffect(() => {
    const element = getElement();
    if (!element || !id) return;

    const read = () => {
      if (getLoadedId() !== id) {
        setPosition({ currentTime: 0, duration: null });
        return;
      }
      const duration = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : null;
      setPosition({ currentTime: element.currentTime, duration });
    };

    const events = ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked', 'ended', 'pause', 'play'];
    events.forEach(name => element.addEventListener(name, read));
    read();
    return () => events.forEach(name => element.removeEventListener(name, read));
    // playingId re-reads when a different clip takes over the element.
  }, [getElement, getLoadedId, id, playingId]);

  return position;
}
