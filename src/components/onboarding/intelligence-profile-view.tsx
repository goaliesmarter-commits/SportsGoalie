'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  IntelligenceProfile,
  PacingLevel,
  GoalieAgeRange,
  getPacingLevelDisplayText,
  GOALIE_CATEGORIES,
} from '@/types';
import { generateProfileSummary } from '@/lib/scoring/intelligence-profile';
import { scaleToPercentage } from '@/lib/scoring/scale-score';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  Award,
  TrendingUp,
  Lightbulb,
  Heart,
  Brain,
  Clock,
  Target,
  MessageCircle,
  Dumbbell,
  BookOpen,
} from 'lucide-react';

interface IntelligenceProfileViewProps {
  profile: IntelligenceProfile;
  ageRange?: GoalieAgeRange;
  onContinue: () => void;
}

/**
 * Map category slugs to Lucide icons
 */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  feelings: Heart,
  knowledge: Brain,
  pre_game: Clock,
  in_game: Target,
  post_game: MessageCircle,
  training: Dumbbell,
  learning: BookOpen,
};

/**
 * Category colors for cards
 */
const CATEGORY_CARD_COLORS: Record<string, { bg: string; border: string; text: string; meter: string }> = {
  feelings: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    meter: 'bg-purple-500',
  },
  knowledge: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    meter: 'bg-blue-500',
  },
  pre_game: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    meter: 'bg-cyan-500',
  },
  in_game: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    meter: 'bg-red-500',
  },
  post_game: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    meter: 'bg-green-500',
  },
  training: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    meter: 'bg-orange-500',
  },
  learning: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    meter: 'bg-indigo-500',
  },
};

/**
 * Pacing level badge colors
 */
const PACING_LEVEL_STYLES: Record<PacingLevel, { gradient: string; glow: string }> = {
  introduction: {
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/30',
  },
  development: {
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'shadow-blue-500/30',
  },
  refinement: {
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/30',
  },
};

/**
 * Displays the generated intelligence profile after assessment completion.
 */
export function IntelligenceProfileView({
  profile,
  ageRange,
  onContinue,
}: IntelligenceProfileViewProps) {
  const {
    overallScore,
    pacingLevel,
    categoryScores,
    identifiedStrengths,
    identifiedGaps,
  } = profile;

  // Generate personalized summary
  const summary = useMemo(() => {
    return generateProfileSummary(profile, ageRange);
  }, [profile, ageRange]);

  // Get top 3 strengths
  const topStrengths = useMemo(() => {
    return identifiedStrengths.slice(0, 3);
  }, [identifiedStrengths]);

  // Get top 3 gaps
  const topGaps = useMemo(() => {
    return identifiedGaps.slice(0, 3);
  }, [identifiedGaps]);

  // Percentage for the visual meter — a score out of 4.0, read the app-wide way
  // (3.0 out of 4.0 is 75%), so the meter agrees with every other screen.
  const overallPercentage = useMemo(() => {
    return scaleToPercentage(overallScore, 4, 1) ?? 0;
  }, [overallScore]);

  const pacingStyle = PACING_LEVEL_STYLES[pacingLevel];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Your Intelligence Profile
          </h1>
          <p className="text-lg text-slate-400">
            Based on your responses, here's where you stand today.
          </p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-slate-800/50 rounded-2xl p-6 sm:p-8 mb-8 border border-slate-700/50">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Score visualization */}
            <div className="relative">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-slate-900 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-700"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${overallPercentage * 2.64} 264`}
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-3xl sm:text-4xl font-bold text-white">
                      {overallScore.toFixed(1)}
                    </span>
                    <span className="block text-xs text-slate-500">out of 4.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pacing level and summary */}
            <div className="flex-1 text-center sm:text-left">
              <div className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                `bg-gradient-to-r ${pacingStyle.gradient}`,
                `shadow-lg ${pacingStyle.glow}`,
                'text-white font-semibold mb-4'
              )}>
                <Award className="w-5 h-5" />
                {getPacingLevelDisplayText(pacingLevel)} Level
              </div>

              <p className="text-slate-300 leading-relaxed">
                {summary}
              </p>
            </div>
          </div>
        </div>

        {/* Category Breakdown Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Category Breakdown
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoryScores.map((cs) => {
              const colors = CATEGORY_CARD_COLORS[cs.categorySlug] || CATEGORY_CARD_COLORS.knowledge;
              const Icon = CATEGORY_ICONS[cs.categorySlug] || Brain;
              const categoryInfo = GOALIE_CATEGORIES.find(c => c.slug === cs.categorySlug);
              const percentage = scaleToPercentage(cs.averageScore, 4, 1) ?? 0;

              return (
                <div
                  key={cs.categorySlug}
                  className={cn(
                    'p-4 rounded-xl border',
                    colors.bg,
                    colors.border
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('p-2 rounded-lg', colors.bg)}>
                      <Icon className={cn('w-4 h-4', colors.text)} />
                    </div>
                    <span className="text-sm font-medium text-white truncate">
                      {categoryInfo?.shortName || cs.categoryName}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={colors.text}>{cs.averageScore.toFixed(1)}</span>
                      <span className="text-slate-500">{cs.weight}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', colors.meter)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths and Gaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Strengths */}
          {topStrengths.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Your Strengths
              </h3>
              <ul className="space-y-3">
                {topStrengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-emerald-400">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{strength.categoryName}</p>
                      <p className="text-sm text-slate-400">
                        Score: {strength.score.toFixed(1)} ({strength.deviationFromAverage > 0 ? '+' : ''}{strength.deviationFromAverage.toFixed(1)} vs avg)
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Growth */}
          {topGaps.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Areas for Growth
              </h3>
              <ul className="space-y-3">
                {topGaps.map((gap, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-400">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{gap.categoryName}</p>
                      <p className="text-sm text-slate-400">
                        Score: {gap.score.toFixed(1)} • Priority: {gap.priority}
                      </p>
                      {gap.suggestedContent.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Focus: {gap.suggestedContent[0]}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={onContinue}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold px-10 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
          >
            Continue to Dashboard
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>

          <p className="mt-4 text-sm text-slate-500">
            Your profile will guide your personalized learning path.
          </p>
        </div>
      </div>
    </div>
  );
}
