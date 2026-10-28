'use client';

/**
 * "Coach Mike has a message" — the fallback for a moment the phone would not
 * play (Audio Part 3).
 *
 * A moment plays by itself, with no tap. Most phones allow that once the site
 * has played sound from a tap; an iPhone that has not yet refuses. Rather than
 * lose the message, this small button appears and plays it on a tap. It shows
 * only for a moment's own clip, never for a button or player that already
 * handles its own refusal, and goes away once played or dismissed.
 */

import { useState } from 'react';
import { Play, X } from 'lucide-react';

import { lastMomentClipId } from '@/hooks/useEventVoice';
import { useCoachAudio } from '@/lib/audio/context';

export function MomentMessageChip() {
  const { blockedId, play } = useCoachAudio();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const momentClip = lastMomentClipId();
  if (!blockedId || blockedId !== momentClip || dismissed === blockedId) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '16px',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'linear-gradient(135deg, #0b2a55, #0f3d9e)',
        border: '1px solid rgba(96,205,255,0.45)',
        borderRadius: '50px',
        padding: '4px 4px 4px 4px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 18px rgba(55,181,255,0.25)',
      }}
    >
      <button
        type="button"
        onClick={() => play(blockedId)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '1.2px',
          padding: '8px 10px',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #37b5ff, #0ea5e9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Play size={11} color="#fff" fill="#fff" />
        </span>
        COACH MIKE HAS A MESSAGE
      </button>
      <button
        type="button"
        onClick={() => setDismissed(blockedId)}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', padding: '10px', cursor: 'pointer', display: 'flex' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
