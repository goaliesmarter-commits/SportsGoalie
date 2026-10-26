'use client';

/**
 * The real "Hear Coach Mike" button.
 *
 * This replaces the mock that was copy-pasted into five marketing pages, which
 * flipped a `playing` boolean and a play/pause icon while never loading any
 * audio. The visual design here is deliberately identical to that mock so the
 * site does not change appearance when the real player goes in — only the
 * behaviour changes.
 *
 * `whenMissing` matters. Most of the buttons on the public pages point at lines
 * Michael has not recorded, and a button that promises audio and delivers
 * silence is worse than no button. Default is to render disabled and say so.
 */

import { Pause, Play } from 'lucide-react';

import { useCoachAudioClip, useCoachAudio } from '@/lib/audio/context';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const BLUE3 = '#0ea5e9';
const MUTED = '#475569';

interface CoachAudioButtonProps {
  /** A catalogue id, e.g. 'V-A-01'. */
  clipId: string;
  /** Shown on wider screens. Falls back to the catalogue script line. */
  label?: string;
  /** Render the VOICE ON/OFF control beside the play pill. */
  showToggle?: boolean;
  /** What to do when the recording has not been uploaded. */
  whenMissing?: 'disable' | 'hide';
  /**
   * Draws a smaller chip showing this text on every screen width, for a page
   * that carries several lines. `label` still names the button for screen
   * readers, so two chips never sound alike.
   */
  chipLabel?: string;
  className?: string;
}

export function CoachAudioButton({
  clipId,
  label,
  showToggle = true,
  whenMissing = 'disable',
  chipLabel,
  className,
}: CoachAudioButtonProps) {
  const isChip = chipLabel !== undefined;
  const { clip, available, isLoading, isPlaying, enabled, toggle } = useCoachAudioClip(clipId);
  const { setEnabled, textFor, settings } = useCoachAudio();

  const transcript = textFor(clipId);
  // A label set in admin wins over the one the page was built with (2.4).
  const displayLabel = settings[clipId]?.label ?? label ?? transcript ?? 'HEAR COACH MIKE';

  // While the first load is in flight, keep the button in place rather than
  // popping it in — the marketing pages lay out around it.
  if (!available && !isLoading && whenMissing === 'hide') return null;

  const interactive = available && enabled;

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => interactive && toggle()}
        disabled={!interactive}
        aria-label={
          available
            ? `${isPlaying ? 'Pause' : 'Play'} Coach Mike: ${displayLabel}`
            : 'This recording has not been added yet'
        }
        title={available ? transcript : 'Not recorded yet'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isChip ? '7px' : '10px',
          background: interactive
            ? 'linear-gradient(135deg, rgba(55,181,255,0.14), rgba(96,205,255,0.07))'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${interactive ? 'rgba(96,205,255,0.32)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '50px',
          padding: isChip ? '6px 14px 6px 7px' : '9px 18px 9px 10px',
          color: interactive ? BLUE2 : MUTED,
          fontSize: isChip ? '10px' : '11px',
          fontWeight: 700,
          letterSpacing: isChip ? '1px' : '1.2px',
          textAlign: 'left',
          cursor: interactive ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          boxShadow: interactive ? '0 2px 10px rgba(55,181,255,0.12)' : 'none',
        }}
      >
        <span
          style={{
            width: isChip ? '20px' : '26px',
            height: isChip ? '20px' : '26px',
            borderRadius: '50%',
            background: interactive ? `linear-gradient(135deg, ${BLUE}, ${BLUE3})` : '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isPlaying ? (
            <Pause size={isChip ? 8 : 10} color="#fff" fill="#fff" />
          ) : (
            <Play size={isChip ? 8 : 10} color="#fff" fill="#fff" />
          )}
        </span>
        {isChip ? (
          <span>{chipLabel}</span>
        ) : (
          <>
            <span className="hidden sm:inline">{displayLabel}</span>
            <span className="sm:hidden">HEAR COACH MIKE</span>
          </>
        )}
      </button>

      {showToggle && available && (
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          style={{
            fontSize: '11px',
            color: enabled ? BLUE2 : MUTED,
            letterSpacing: '1.5px',
            background: 'none',
            border: 'none',
            // padding, not margin, so the tap area is ~36px tall rather than the
            // 15px the text alone gives it
            padding: '10px 8px',
            cursor: 'pointer',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          VOICE {enabled ? 'ON' : 'OFF'}
        </button>
      )}

      {!available && !isLoading && (
        <span style={{ fontSize: '11px', color: MUTED, letterSpacing: '1.2px', fontWeight: 700 }}>
          NOT RECORDED YET
        </span>
      )}

      {/*
        The script line doubles as the transcript. Kept in the DOM for screen
        readers rather than rendered, so the visual design is untouched.
      */}
      {clip && transcript && <span className="sr-only">{transcript}</span>}
    </div>
  );
}

/**
 * Small circular variant for use inline — beside a chart confirmation, a
 * milestone card, or a trigger message. No label, no on/off control.
 */
export function CoachAudioInlineButton({
  clipId,
  whenMissing = 'hide',
}: {
  clipId: string;
  whenMissing?: 'disable' | 'hide';
}) {
  const { available, isLoading, isPlaying, enabled, toggle } = useCoachAudioClip(clipId);
  const { textFor } = useCoachAudio();

  if (!available && !isLoading && whenMissing === 'hide') return null;

  const interactive = available && enabled;

  return (
    <button
      type="button"
      onClick={() => interactive && toggle()}
      disabled={!interactive}
      aria-label={
        available ? `${isPlaying ? 'Pause' : 'Play'} Coach Mike` : 'Recording not added yet'
      }
      title={textFor(clipId)}
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        border: 'none',
        flexShrink: 0,
        background: interactive ? `linear-gradient(135deg, ${BLUE}, ${BLUE3})` : '#334155',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: interactive ? 'pointer' : 'not-allowed',
        opacity: interactive ? 1 : 0.5,
      }}
    >
      {isPlaying ? (
        <Pause size={12} color="#fff" fill="#fff" />
      ) : (
        <Play size={12} color="#fff" fill="#fff" />
      )}
    </button>
  );
}
