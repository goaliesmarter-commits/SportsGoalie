'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DynamicFieldProps } from './DynamicField';
import { StarScaleInput } from '../StarScale';
import { isStarScale } from '@/lib/scale/five-star';

/**
 * Past this many steps the segmented control gets too cramped to tap, so we fall
 * back to the original slider. A 1-10 self-rating (10 steps) is the normal case.
 */
const MAX_SEGMENTS = 12;

export const DynamicScaleField: React.FC<DynamicFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
  className = '',
  scaleAnchors,
  scaleDisplay = 'numeric',
}) => {
  // `?? ` rather than `|| ` so a legitimate min of 0 isn't coerced up to 1.
  const min = field.validation?.min ?? 1;
  const max = field.validation?.max ?? 10;

  // `value.value` stays undefined until the student actually picks a number.
  // Defaulting the *display* to `min` made an untouched checkpoint read as a
  // confident score of 1, so track "unrated" separately.
  const rawValue = value?.value;
  const hasValue = typeof rawValue === 'number';
  const scaleValue = hasValue ? (rawValue as number) : min;
  const comments = value?.comments || '';

  // Most check-ins are rate-and-move-on. Keeping a textarea open under every
  // checkpoint turns the form into a wall of empty boxes, so the note is opt-in
  // unless it's required or the student already wrote one.
  const [showComments, setShowComments] = useState(
    () => Boolean(comments) || Boolean(field.commentsRequired)
  );

  const handleSelect = (next: number) => {
    onChange({ value: next, comments });
  };

  const handleValueChange = (values: number[]) => {
    onChange({ value: values[0], comments });
  };

  const handleCommentsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ value: scaleValue, comments: e.target.value });
  };

  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const useSegments = steps.length <= MAX_SEGMENTS;

  // The 5-Star development scale, where the consumer asks for it and the range
  // divides into five rungs. Not every scale field is a development rating —
  // the Hockey tracker's "Degree of Challenge" measures how hard a period was,
  // and "Self-Coaching" would be nonsense on it — so this is opt-in per screen
  // rather than applied to every 1-10 field. The stored value is unchanged
  // either way: still 1-10, still what the charts read.
  const useStars = scaleDisplay === 'stars' && isStarScale(min, max);

  return (
    <div className={cn('space-y-3.5', className)}>
      {/* Label on the left, the live reading on the right */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Label htmlFor={field.id} className="text-[15px] font-semibold leading-snug">
            {field.label}
            {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {field.description && (
            <p className="text-[13px] leading-relaxed text-muted-foreground">{field.description}</p>
          )}
        </div>

        {/* In star mode the row carries its own reading — the stage name and the
            number — so a second big number here would just be the same fact twice. */}
        {!useStars && (
          <div
            className={cn(
              'flex shrink-0 items-baseline gap-0.5 rounded-lg px-3 py-1.5 tabular-nums transition-colors',
              hasValue ? 'bg-primary/15' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'text-2xl font-extrabold leading-none',
                hasValue ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {hasValue ? scaleValue : '–'}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">/{max}</span>
          </div>
        )}
      </div>

      {useStars ? (
        <StarScaleInput
          score={hasValue ? scaleValue : null}
          onChange={handleSelect}
          max={max}
          disabled={disabled}
          label={field.label}
        />
      ) : useSegments ? (
        <div className="space-y-2">
          {/* Strength meter: everything up to the pick fills in, so the rating
              reads at a glance instead of needing the number underneath it. */}
          <div className="flex gap-1.5" role="radiogroup" aria-label={field.label}>
            {steps.map((step) => {
              const filled = hasValue && step <= scaleValue;
              const active = hasValue && step === scaleValue;

              return (
                <button
                  key={step}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${step} out of ${max}`}
                  disabled={disabled}
                  onClick={() => handleSelect(step)}
                  data-segment=""
                  // Always emitted, never omitted — the dark-theme rules in
                  // globals.css key off 'true'/'false' as two exclusive states.
                  data-filled={filled ? 'true' : 'false'}
                  className={cn(
                    'h-11 flex-1 rounded-lg border text-[13px] font-bold tabular-nums transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    filled
                      ? 'border-primary/60 bg-primary text-primary-foreground'
                      : 'border-border bg-muted text-muted-foreground hover:border-primary/40',
                    active && 'ring-2 ring-primary/35'
                  )}
                >
                  {step}
                </button>
              );
            })}
          </div>

          {scaleAnchors && (
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              <span>{scaleAnchors.low}</span>
              <span>{scaleAnchors.high}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Slider
            id={field.id}
            value={[scaleValue]}
            onValueChange={handleValueChange}
            disabled={disabled}
            min={min}
            max={max}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <span>{scaleAnchors ? scaleAnchors.low : min}</span>
            <span>{scaleAnchors ? scaleAnchors.high : max}</span>
          </div>
        </div>
      )}

      {field.includeComments &&
        (showComments ? (
          <div className="space-y-1.5">
            <Label
              htmlFor={`${field.id}-comments`}
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {field.commentsLabel || 'Comments'}
              {field.commentsRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={`${field.id}-comments`}
              value={comments}
              onChange={handleCommentsChange}
              disabled={disabled}
              placeholder={field.placeholder || 'Add any additional notes...'}
              className="min-h-[72px] resize-none text-sm"
              maxLength={field.validation?.maxLength}
            />
            {field.validation?.maxLength && (
              <p className="text-right text-[11px] text-muted-foreground">
                {comments.length} / {field.validation.maxLength}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowComments(true)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Add a note
          </button>
        ))}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
