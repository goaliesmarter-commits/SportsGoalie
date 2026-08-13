'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEVELOPMENT_SCALE_MAX,
  FIVE_STAR_SCALE,
  STAR_COUNT,
  StarStage,
  scoreFromStars,
  stageForScore,
  starsFromScore,
} from '@/lib/scale/five-star';

/**
 * The 5-Star development scale, as a control and as a readout.
 *
 * Both halves draw the same row of stars from the same numbers, because the
 * point of the scale is that a goalie setting a rating and a coach reading it
 * back are looking at the identical thing. Stage names and the 1–10 conversion
 * live in `src/lib/scale/five-star.ts`.
 */

/**
 * One star, filled by a fraction rather than a boolean.
 *
 * Whole stars are all anyone can tap, but a value can still land between them:
 * an average across a month, or a 7 recorded under the 1–10 control this
 * replaced. Those have to show where they actually are instead of being rounded
 * into a stage the goalie hasn't reached.
 *
 * Sized in pixels rather than utility classes — the filled star is absolutely
 * positioned inside a clipped box, and `width: auto` on an SVG falls back to
 * the icon's intrinsic 24px instead of matching the outline underneath it.
 */
function StarGlyph({ fill, size }: { fill: number; size: number }) {
  const clamped = Math.max(0, Math.min(1, fill));

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <Star size={size} strokeWidth={1.5} className="text-muted-foreground/40" />
      {clamped > 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${clamped * 100}%` }}
        >
          <Star
            size={size}
            strokeWidth={1.5}
            fill="currentColor"
            className="text-red-500"
            style={{ maxWidth: 'none' }}
          />
        </span>
      )}
    </span>
  );
}

/** Fill fraction for the nth star given a total (possibly fractional) star count. */
function fillFor(position: number, stars: number): number {
  return Math.max(0, Math.min(1, stars - (position - 1)));
}

// ─── Readout ─────────────────────────────────────────────────────────────────

export interface StarScaleReadoutProps {
  /** The stored value, on the field's own scale. Null/undefined means unrated. */
  score: number | null | undefined;
  /** Ceiling of the stored scale. 10 unless the field says otherwise. */
  max?: number;
  /** Show the stage name beside the stars. */
  showStage?: boolean;
  /** Also print the stored number, for anyone reading against a chart. */
  showScore?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Read-only stars — coach views, history, and anywhere a recorded rating is
 * shown back rather than set.
 */
export function StarScaleReadout({
  score,
  max = DEVELOPMENT_SCALE_MAX,
  showStage = true,
  showScore = false,
  size = 'sm',
  className,
}: StarScaleReadoutProps) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;

  const stars = starsFromScore(score, max);
  const stage = stageForScore(score, max);
  const px = size === 'sm' ? 13 : 16;
  const rounded = Math.round(score * 10) / 10;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        role="img"
        aria-label={stage ? `${stage.name}, ${rounded} out of ${max}` : `${rounded} out of ${max}`}
        className="inline-flex items-center gap-0.5"
      >
        {FIVE_STAR_SCALE.map(({ stars: position }) => (
          <StarGlyph key={position} fill={fillFor(position, stars)} size={px} />
        ))}
      </span>
      {showStage && stage && (
        <span
          className={cn(
            'font-semibold text-muted-foreground',
            size === 'sm' ? 'text-[11px]' : 'text-xs'
          )}
        >
          {stage.name}
        </span>
      )}
      {showScore && (
        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground/70">
          {rounded}/{max}
        </span>
      )}
    </span>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────

export interface StarScaleInputProps {
  /** The stored value, on the field's own scale. Null/undefined means unrated. */
  score: number | null | undefined;
  /** Called with the stored value for the star that was tapped. */
  onChange: (score: number) => void;
  max?: number;
  disabled?: boolean;
  /** Names the star row for screen readers. */
  label?: string;
  /**
   * Topic-specific wording for each rung, keyed by star position. Shown under
   * the stage rather than instead of it — a goalie learning where their skating
   * sits should read the same five stage names they read everywhere else, with
   * the skating-specific detail beneath.
   */
  details?: Array<StageDetail & { rating: number }>;
  className?: string;
}

export function StarScaleInput({
  score,
  onChange,
  max = DEVELOPMENT_SCALE_MAX,
  disabled = false,
  label,
  details,
  className,
}: StarScaleInputProps) {
  const [revealed, setRevealed] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const hasValue = typeof score === 'number' && Number.isFinite(score);
  const stars = hasValue ? starsFromScore(score as number, max) : 0;
  const stage = hasValue ? stageForScore(score as number, max) : null;

  // Hovering previews whole stars. A stored value can sit between them, so the
  // preview replaces the fractional fill rather than blending with it.
  const shown = hovered ?? stars;
  const revealedStage: StarStage | null =
    revealed === null ? null : FIVE_STAR_SCALE[revealed - 1] ?? null;

  /**
   * Whether this star is the one currently recorded — an exact match on the
   * stored number, not just the same stage. A rating of 7 carried over from the
   * old 1–10 control sits inside star 4 without being star 4, and tapping there
   * should move it to 8 rather than open a definition.
   */
  const isExactly = (position: number) => hasValue && score === scoreFromStars(position, max);

  const handleTap = (position: number) => {
    if (isExactly(position)) {
      setRevealed(revealed === position ? null : position);
      return;
    }
    onChange(scoreFromStars(position, max));
    setRevealed(null);
  };

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div
          role="radiogroup"
          aria-label={label ? `${label} — 5-Star development scale` : '5-Star development scale'}
          className="flex items-center gap-1"
        >
          {FIVE_STAR_SCALE.map(({ stars: position, name }) => (
            <button
              key={position}
              type="button"
              role="radio"
              aria-checked={isExactly(position)}
              aria-label={`${position} of ${STAR_COUNT} — ${name}`}
              disabled={disabled}
              onClick={() => handleTap(position)}
              onMouseEnter={() => setHovered(position)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-lg transition-transform',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isExactly(position) && 'bg-primary/10',
                !disabled && 'hover:scale-110 active:scale-95'
              )}
            >
              <StarGlyph fill={fillFor(position, shown)} size={24} />
            </button>
          ))}
        </div>

        {stage ? (
          <span className="text-[13px] font-bold leading-tight">
            {stage.name}
            <span className="ml-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {score}/{max}
            </span>
          </span>
        ) : (
          <span className="text-[13px] font-medium text-muted-foreground">Not rated yet</span>
        )}
      </div>

      {stage && revealed === null && (
        <p className="text-[11px] text-muted-foreground">
          Tap the same star again to see what the stage means.
        </p>
      )}

      {revealedStage && (
        <StageCard
          stage={revealedStage}
          detail={details?.find((d) => d.rating === revealedStage.stars)}
          onClose={() => setRevealed(null)}
        />
      )}
    </div>
  );
}

// ─── Stage card ──────────────────────────────────────────────────────────────

export interface StageDetail {
  title: string;
  description: string;
  videoUrl?: string;
}

/**
 * What a stage means, shown when someone taps into it. Coach Mike wrote stages
 * 2–4 in the goalie's own voice and 1 and 5 as description, so the quote marks
 * come from `stage.spoken` rather than being applied to all five.
 */
export function StageCard({
  stage,
  detail,
  onClose,
}: {
  stage: StarStage;
  /** Topic-specific wording for this rung, shown under the stage itself. */
  detail?: StageDetail;
  onClose?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-primary/30 border-l-[3px] border-l-primary bg-primary/[0.07]">
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="flex shrink-0 items-center gap-0.5">
              {FIVE_STAR_SCALE.map(({ stars: position }) => (
                <StarGlyph key={position} fill={fillFor(position, stage.stars)} size={13} />
              ))}
            </span>
            <h4 className="text-sm font-bold">{stage.name}</h4>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <p
          className={cn(
            'text-sm leading-relaxed',
            stage.spoken ? 'font-medium italic' : 'text-muted-foreground'
          )}
        >
          {stage.spoken ? `“${stage.line}”` : stage.line}
        </p>

        {detail && (
          <div className="space-y-1 border-t border-border/60 pt-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {detail.title}
            </p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {detail.description}
            </p>
            {detail.videoUrl && (
              <a
                href={detail.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex text-xs font-semibold text-primary hover:underline"
              >
                Watch example
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
