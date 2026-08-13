'use client';

import { useState } from 'react';
import { Star, X, Play } from 'lucide-react';
import { FIVE_STAR_SCALE, STAR_COUNT, stageForStars } from '@/lib/scale/five-star';

/**
 * Topic-specific wording for one rung of the ladder.
 *
 * This used to be the whole story a goalie got when they tapped a star, and
 * every screen wrote its own set — skating had "Knowledge Base → Polish",
 * composure had "Broke Down → Automatic", the coach's overall rating had "Off
 * Night → Exceptional". Same five rungs, five different vocabularies.
 *
 * The 5-Star development scale is now the constant: every star row in the app
 * leads with Coach Mike's stage names, and these entries sit underneath as the
 * detail for that particular topic. Nothing already written is lost, and a
 * goalie hears the same five words wherever they look.
 */
export interface StarDefinition {
  rating: number;
  title: string;
  description: string;
  videoUrl?: string;
}

interface StarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  definitions?: StarDefinition[];
  maxStars?: number;
}

export function StarRating({
  value,
  onChange,
  definitions = [],
  maxStars = STAR_COUNT,
}: StarRatingProps) {
  const [expandedStar, setExpandedStar] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const handleStarClick = (rating: number) => {
    if (value === rating) {
      // Tap same star again → toggle definition
      setExpandedStar(expandedStar === rating ? null : rating);
    } else {
      onChange(rating);
      setExpandedStar(null);
    }
  };

  const displayValue = hoveredStar ?? value ?? 0;
  // The stage is the headline; the topic-specific entry, if this screen has
  // one, is supporting detail under it.
  const expandedStage = expandedStar === null ? null : stageForStars(expandedStar);
  const expandedDetail = definitions.find(d => d.rating === expandedStar);
  const currentStage = value === null ? null : stageForStars(value);

  return (
    <div className="space-y-3">
      {/* Stars row */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: maxStars }, (_, i) => {
          const rating = i + 1;
          const isFilled = rating <= displayValue;
          const stageName = stageForStars(rating)?.name;
          return (
            <button
              key={rating}
              type="button"
              onClick={() => handleStarClick(rating)}
              onMouseEnter={() => setHoveredStar(rating)}
              onMouseLeave={() => setHoveredStar(null)}
              className={`
                w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150
                ${isFilled
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-white/25 hover:text-white/50'
                }
                ${value === rating ? 'ring-1.5 ring-red-300 ring-offset-1' : ''}
                hover:scale-110 active:scale-95
              `}
              aria-label={stageName ? `${rating} of ${maxStars} — ${stageName}` : `Rate ${rating} of ${maxStars}`}
            >
              <Star
                className="w-5 h-5"
                fill={isFilled ? 'currentColor' : 'none'}
                strokeWidth={1.5}
              />
            </button>
          );
        })}

        {value !== null && (
          <span className="ml-1.5 flex items-baseline gap-1.5">
            {currentStage && (
              <span className="text-xs font-bold text-white">{currentStage.name}</span>
            )}
            <span className="text-xs font-bold text-white/60">
              {value}/{maxStars}
            </span>
          </span>
        )}
      </div>

      {/* Tap hint */}
      {currentStage && expandedStar === null && (
        <p className="text-xs text-white/40">
          Tap a star again to see what the stage means
        </p>
      )}

      {/* Expanded definition panel */}
      {expandedStage && (
        <div
          className="rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ background: 'rgba(55,181,255,0.07)', border: '1px solid rgba(55,181,255,0.3)', borderLeft: '3px solid #37b5ff' }}
        >
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex" aria-hidden="true">
                  {FIVE_STAR_SCALE.map(({ stars }) => (
                    <Star
                      key={stars}
                      className={stars <= expandedStage.stars ? 'w-3.5 h-3.5 text-red-500 fill-red-500' : 'w-3.5 h-3.5 text-white/20'}
                    />
                  ))}
                </div>
                <h4 className="text-sm font-bold text-white">{expandedStage.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setExpandedStar(null)}
                aria-label="Close"
                className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/*
              Coach Mike wrote stages 2-4 in the goalie's own voice and 1 and 5
              as description, so the quote marks come from the stage rather than
              being applied to all five.
            */}
            <p className={`text-sm leading-relaxed ${expandedStage.spoken ? 'text-white font-medium italic' : 'text-white/75'}`}>
              {expandedStage.spoken ? `“${expandedStage.line}”` : expandedStage.line}
            </p>

            {expandedDetail && (
              <div className="pt-2 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-xs font-bold uppercase tracking-wide text-white/50">
                  {expandedDetail.title}
                </p>
                <p className="text-[13px] text-white/70 leading-relaxed">
                  {expandedDetail.description}
                </p>
                {expandedDetail.videoUrl && (
                  <a
                    href={expandedDetail.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#37b5ff] hover:text-white mt-1"
                  >
                    <Play className="w-3.5 h-3.5" /> Watch example
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
