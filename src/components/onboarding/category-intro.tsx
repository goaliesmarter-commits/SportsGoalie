'use client';

import { GoalieCategorySlug, GOALIE_CATEGORIES } from '@/types';
import { ChevronRight, ChevronLeft, Heart, Brain, Clock, Target, MessageCircle, Dumbbell, BookOpen } from 'lucide-react';

interface CategoryIntroProps {
  categorySlug: GoalieCategorySlug;
  categoryName: string;
  categoryDescription: string;
  questionCount: number;
  categoryIndex: number;
  totalCategories: number;
  onStart: () => void;
  /**
   * Step back to the previous question. Optional so the screen still renders
   * without it, but leaving it out strands the reader: this intro sits between
   * two categories, so with no Back the last answer of the previous category
   * cannot be reached again.
   */
  onBack?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  feelings: Heart,
  knowledge: Brain,
  pre_game: Clock,
  in_game: Target,
  post_game: MessageCircle,
  training: Dumbbell,
  learning: BookOpen,
};

const CATEGORY_ACCENT: Record<string, string> = {
  feelings: '#a78bfa',
  knowledge: '#37b5ff',
  pre_game: '#2dd4bf',
  in_game: '#f87171',
  post_game: '#4ade80',
  training: '#fb923c',
  learning: '#818cf8',
};

const CATEGORY_TOOLTIPS: Record<string, string> = {
  feelings: "Goaltending starts in your head before it ever reaches your body. How you feel, handle pressure, and bounce back — this is where development begins.",
  knowledge: "No wrong answers here. This helps Smarter Goalie know where to start with your learning.",
  pre_game: "How you prepare at home, in the car, in the dressing room, and during warm-up sets the stage for performance.",
  in_game: "It's about how you see the puck, read the play, and how your eyes, mind, and body work together.",
  post_game: "How you process your performance after a game can be just as important as the game itself.",
  training: "The best goalies build habits and routines that help them improve even off the ice.",
  learning: "This helps us show you content in the way that works best for you.",
};

export function CategoryIntro({
  categorySlug,
  categoryName,
  categoryDescription,
  questionCount,
  categoryIndex,
  totalCategories,
  onStart,
  onBack,
}: CategoryIntroProps) {
  const Icon = CATEGORY_ICONS[categorySlug] || Target;
  const accent = CATEGORY_ACCENT[categorySlug] || '#37b5ff';
  const tooltip = CATEGORY_TOOLTIPS[categorySlug] || '';
  const categoryInfo = GOALIE_CATEGORIES.find(c => c.slug === categorySlug);
  const weight = categoryInfo?.weight || 0;

  return (
    <>
      <style>{`
        .ci-btn:hover { opacity: 0.88 !important; transform: scale(1.01) !important; }
        .ci-back:hover { color: rgba(255,255,255,0.7) !important; }
        @keyframes ci-fade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .ci-fade { animation: ci-fade 0.35s ease both; }
      `}</style>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 24px' }}>
        <div className="ci-fade" style={{ width: '100%', maxWidth: '520px' }}>

          {/* Header */}
          <div style={{
            position: 'relative', background: 'rgba(2,18,44,0.9)',
            border: `1px solid ${accent}30`, borderRadius: '16px', overflow: 'hidden',
            boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${accent}10`,
          }}>
            {/* Top accent strip */}
            <div style={{ height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}50, transparent)` }} />

            {/* Card header */}
            <div style={{
              padding: '20px 24px 16px', textAlign: 'center',
              background: `radial-gradient(ellipse at 60% 0%, ${accent}18 0%, transparent 65%)`,
              borderBottom: `1px solid ${accent}15`,
            }}>
              {/* Category label */}
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: `${accent}aa`, marginBottom: '10px' }}>
                Category {categoryIndex + 1} of {totalCategories}
              </p>

              {/* Icon */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '52px', height: '52px', borderRadius: '14px',
                background: `${accent}20`, border: `1px solid ${accent}40`,
                marginBottom: '12px', boxShadow: `0 6px 18px ${accent}18`,
              }}>
                <Icon size={26} color={accent} />
              </div>

              <h1 style={{ fontSize: 'clamp(20px,3.5vw,28px)', fontWeight: 900, color: '#fff', marginBottom: '6px', lineHeight: 1.15 }}>
                {categoryName}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.5, maxWidth: '360px', margin: '0 auto' }}>
                {categoryDescription}
              </p>
            </div>

            {/* Card body */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Questions', value: String(questionCount) },
                  { label: 'Profile Weight', value: `${weight}%` },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    padding: '12px', borderRadius: '10px', textAlign: 'center',
                    background: `${accent}0c`, border: `1px solid ${accent}18`,
                  }}>
                    <p style={{ fontSize: '22px', fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Insight */}
              {tooltip && (
                <div style={{
                  display: 'flex', gap: '10px', padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ width: '3px', flexShrink: 0, borderRadius: '99px', background: `${accent}80`, minHeight: '32px' }} />
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 }}>{tooltip}</p>
                </div>
              )}

              {/* CTA */}
              <button
                className="ci-btn"
                onClick={onStart}
                style={{
                  width: '100%', padding: '13px',
                  borderRadius: '10px',
                  background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
                  border: 'none', color: '#fff',
                  fontWeight: 800, fontSize: '15px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  transition: 'opacity 0.2s, transform 0.2s',
                  boxShadow: `0 4px 16px ${accent}28`,
                }}
              >
                Start Category <ChevronRight size={16} />
              </button>

              {onBack && (
                <button
                  className="ci-back"
                  onClick={onBack}
                  style={{
                    margin: '0 auto',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.38)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    transition: 'color 0.2s',
                  }}
                >
                  <ChevronLeft size={14} />
                  Back to the previous question
                </button>
              )}

              <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.22)' }}>
                No right or wrong answers — answer honestly for the best results
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
