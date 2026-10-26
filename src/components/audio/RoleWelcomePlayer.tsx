'use client';

/**
 * Coach Mike's welcome on a role page (Audio Part 1, items 1.1 to 1.6).
 *
 * Replaces the player that was copied into the five role pages, which ran a
 * timer to fake 3:45 of progress and never loaded any audio. The look is kept as
 * it was; what changed is that it now plays the welcome admin placed on the
 * page's WELCOME slot, through the site's one shared audio element.
 *
 *   - Starts by itself when the visitor has just chosen this role on "Let us
 *     explain" (that tap unlocks sound, see markRoleArrival), and only then.
 *   - Where a phone still refuses, the play button is there and says so.
 *   - Stays hidden until a welcome is placed and uploaded (1.4).
 *   - Pause carries on from the same place; play after the end starts again.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Pause } from 'lucide-react';

import { useCoachAudio, usePlaybackPosition } from '@/lib/audio/context';
import { clearRoleArrival, hasRoleArrival } from '@/lib/audio/arrival';
import { ROLE_WELCOME_LABEL, slotKey } from '@/lib/audio/slots';

/** A short breath after arriving, so the voice does not start on top of the page appearing. */
const ARRIVAL_DELAY_MS = 900;
/** How far the back and forward buttons move, as a share of the recording. */
const SKIP_SHARE = 0.08;

const WAVEFORM = [
  0.3, 0.5, 0.8, 0.4, 0.95, 0.6, 0.35, 0.75, 1, 0.55, 0.4, 0.85, 0.65, 0.3, 0.9, 0.7, 0.45, 0.5, 0.8, 0.35,
  0.6, 1, 0.4, 0.7, 0.5, 0.9, 0.3, 0.65, 0.85, 0.4, 0.75, 0.5, 1, 0.35, 0.8, 0.6, 0.45, 0.9, 0.5, 0.3, 0.7,
  0.55, 0.8, 0.35, 0.65, 0.95, 0.4, 0.7, 0.5, 0.85,
];

function formatTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '--:--';
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

interface RoleWelcomePlayerProps {
  /** The small heading above "Coach Mike". */
  heading?: string;
  /** The line in italics under the heading, without quotation marks. */
  quote: string;
}

export function RoleWelcomePlayer({ heading = 'VOICE MESSAGE', quote }: RoleWelcomePlayerProps) {
  const pathname = usePathname() ?? '';
  const {
    clips,
    clipsForSlot,
    isLoading,
    playingId,
    blockedId,
    enabled,
    setEnabled,
    play,
    resume,
    pause,
    seek,
    getLoadedId,
    textFor,
  } = useCoachAudio();

  const clipId = clipsForSlot(slotKey(pathname, ROLE_WELCOME_LABEL))[0] ?? null;
  const { currentTime, duration: loadedDuration } = usePlaybackPosition(clipId);
  const [autoStarted, setAutoStarted] = useState(false);

  // Start by itself only for a visitor who has just chosen this role.
  useEffect(() => {
    if (!clipId || isLoading || !enabled || autoStarted || !hasRoleArrival(pathname)) return;
    const timer = window.setTimeout(() => {
      clearRoleArrival();
      setAutoStarted(true);
      play(clipId);
    }, ARRIVAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [clipId, isLoading, enabled, autoStarted, pathname, play]);

  if (!clipId) return null;

  const clip = clips[clipId];
  const duration = loadedDuration ?? clip?.durationSeconds ?? null;
  const isLoaded = getLoadedId() === clipId;
  const progress = isLoaded && duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const playing = playingId === clipId;
  const needsTap = blockedId === clipId;
  const transcript = textFor(clipId);

  const togglePlay = () => {
    if (!enabled) return;
    if (playing) pause();
    else resume(clipId);
  };

  const skip = (direction: 1 | -1) => {
    if (!isLoaded || !duration) return;
    seek(Math.min(duration, Math.max(0, currentTime + direction * SKIP_SHARE * duration)));
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
        animation: 'player-float 6s ease-in-out infinite',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,240,255,0.06))',
            border: '1.5px solid rgba(0,240,255,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 14px rgba(0,240,255,0.2)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(0,240,255,0.65)', letterSpacing: '2.5px', textTransform: 'uppercase', margin: '0 0 3px' }}>
            {heading}
          </p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>Coach Mike</p>
        </div>
        <div
          style={{
            background: playing ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${playing ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '20px',
            padding: '4px 10px',
            transition: 'all 0.3s',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: playing ? '#4ade80' : 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>
            {playing ? 'LIVE' : formatTime(duration)}
          </span>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'rgba(148,163,184,0.65)', margin: '0 0 18px', fontStyle: 'italic', lineHeight: 1.55 }}>
        &ldquo;{quote}&rdquo;
      </p>

      <div
        role="slider"
        aria-label="Position in Coach Mike's message"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        tabIndex={isLoaded ? 0 : -1}
        onClick={event => {
          if (!isLoaded || !duration) return;
          const rect = event.currentTarget.getBoundingClientRect();
          seek(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * duration);
        }}
        onKeyDown={event => {
          if (event.key === 'ArrowRight') skip(1);
          if (event.key === 'ArrowLeft') skip(-1);
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '2.5px', height: '52px', marginBottom: '8px', cursor: isLoaded ? 'pointer' : 'default' }}
      >
        {WAVEFORM.map((height, index) => {
          const isPast = (index / WAVEFORM.length) * 100 < progress;
          return (
            <div
              key={index}
              style={{
                flex: 1,
                height: `${height * 100}%`,
                background: isPast ? '#00f0ff' : 'rgba(255,255,255,0.14)',
                borderRadius: '2px',
                transition: 'background 0.08s',
                boxShadow: isPast ? '0 0 4px rgba(0,240,255,0.4)' : 'none',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(100,116,139,0.8)' }}>{formatTime(isLoaded ? currentTime : 0)}</span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(100,116,139,0.8)' }}>{formatTime(duration)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: needsTap ? '10px' : '20px' }}>
        <button
          type="button"
          onClick={() => skip(-1)}
          aria-label="Back a little"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.7)', display: 'flex', padding: '10px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={togglePlay}
          disabled={!enabled}
          aria-label={playing ? "Pause Coach Mike's message" : "Play Coach Mike's message"}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: playing ? 'rgba(0,240,255,0.12)' : '#00f0ff',
            border: playing ? '2px solid #00f0ff' : 'none',
            cursor: enabled ? 'pointer' : 'not-allowed',
            opacity: enabled ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: playing
              ? '0 0 0 8px rgba(0,240,255,0.1), 0 0 24px rgba(0,240,255,0.3)'
              : needsTap
                ? '0 0 0 10px rgba(0,240,255,0.18), 0 0 28px rgba(0,240,255,0.55)'
                : '0 0 20px rgba(0,240,255,0.4)',
            transition: 'all 0.25s',
          }}
        >
          {playing ? (
            <Pause size={24} color="#00f0ff" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#051125" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => skip(1)}
          aria-label="Forward a little"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.7)', display: 'flex', padding: '10px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {needsTap && (
        <p role="status" style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', color: '#00f0ff', margin: '0 0 16px' }}>
          TAP PLAY TO HEAR COACH MIKE
        </p>
      )}

      <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          style={{ padding: '10px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: enabled ? '#00f0ff' : 'rgba(148,163,184,0.7)', letterSpacing: '3px', textTransform: 'uppercase' }}
        >
          VOICE {enabled ? 'ON' : 'OFF'}
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }} aria-hidden="true">
          {[12, 20, 8, 16, 10].map((height, index) => (
            <div
              key={index}
              style={{
                width: '3px',
                height: `${playing ? height : Math.round(height * 0.45)}px`,
                background: index === 1 ? '#00f0ff' : `rgba(0,240,255,${0.35 + index * 0.1})`,
                borderRadius: '1.5px',
                transition: `height ${0.2 + index * 0.05}s ease`,
              }}
            />
          ))}
        </div>
      </div>

      {transcript && <span className="sr-only">{transcript}</span>}
    </div>
  );
}
