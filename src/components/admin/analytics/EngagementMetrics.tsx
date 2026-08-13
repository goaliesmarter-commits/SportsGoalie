'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Flame,
  Calendar,
  Clock,
  Zap,
  TrendingUp,
  Sun,
  Sunset,
  Moon,
  Sunrise
} from 'lucide-react';

interface EngagementMetricsProps {
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  averageSessionDuration: number;
  studyPattern: 'morning' | 'afternoon' | 'evening' | 'night' | 'varied';
  totalTimeSpent: number;
}

export function EngagementMetrics({
  currentStreak,
  longestStreak,
  activeDays,
  averageSessionDuration,
  studyPattern,
  totalTimeSpent
}: EngagementMetricsProps) {
  const getPatternIcon = () => {
    switch (studyPattern) {
      case 'morning':
        return <Sunrise className="h-5 w-5 text-orange-500" />;
      case 'afternoon':
        return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'evening':
        return <Sunset className="h-5 w-5 text-amber-500" />;
      case 'night':
        return <Moon className="h-5 w-5 text-indigo-300" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPatternText = () => {
    switch (studyPattern) {
      case 'morning':
        return 'Morning Learner (6AM - 12PM)';
      case 'afternoon':
        return 'Afternoon Learner (12PM - 5PM)';
      case 'evening':
        return 'Evening Learner (5PM - 10PM)';
      case 'night':
        return 'Night Owl (10PM - 6AM)';
      default:
        return 'Flexible Schedule';
    }
  };

  /**
   * Streak tiers, as a translucent wash over the navy panel rather than the
   * solid pastel fills these were. The `-100` backgrounds were built for a
   * white page and rendered as bright slabs inside the dark shell; a low-alpha
   * tint of the same hue keeps the tier legible without punching a hole in it.
   */
  const getStreakLevel = (streak: number) => {
    if (streak >= 30) return { label: 'On Fire!', color: 'text-red-300', bg: 'bg-red-500/12 border-red-400/35' };
    if (streak >= 14) return { label: 'Amazing!', color: 'text-orange-300', bg: 'bg-orange-500/12 border-orange-400/35' };
    if (streak >= 7) return { label: 'Great!', color: 'text-yellow-300', bg: 'bg-yellow-500/12 border-yellow-400/35' };
    if (streak >= 3) return { label: 'Good!', color: 'text-green-300', bg: 'bg-green-500/12 border-green-400/35' };
    return { label: 'Keep Going!', color: 'text-sky-300', bg: 'bg-sky-500/12 border-sky-400/35' };
  };

  const streakLevel = getStreakLevel(currentStreak);
  const streakProgress = Math.min((currentStreak / longestStreak) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Engagement Metrics</span>
        </CardTitle>
        <CardDescription>
          Student activity patterns and consistency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Streak Highlight */}
          <div className={`border-2 rounded-lg p-6 ${streakLevel.bg}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/10 rounded-full">
                  <Flame className={`h-8 w-8 ${streakLevel.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className={`text-3xl font-bold ${streakLevel.color}`}>{currentStreak} Days</p>
                </div>
              </div>
              <Badge className={streakLevel.bg + ' ' + streakLevel.color}>
                {streakLevel.label}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress to longest streak</span>
                <span className="font-medium">{longestStreak} days</span>
              </div>
              <Progress value={streakProgress} className="h-2" />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Longest Streak</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{longestStreak}</p>
              <p className="text-xs text-muted-foreground">days</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Active Days</p>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{activeDays}</p>
              <p className="text-xs text-muted-foreground">total</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Avg Session</p>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{averageSessionDuration}</p>
              <p className="text-xs text-muted-foreground">minutes</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Time</p>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{Math.round(totalTimeSpent / 60)}</p>
              <p className="text-xs text-muted-foreground">hours</p>
            </div>
          </div>

          {/* Study Pattern */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-muted rounded-full">
                {getPatternIcon()}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Study Pattern</p>
                <p className="font-semibold">{getPatternText()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on quiz submission times
                </p>
              </div>
            </div>
          </div>

          {/* Consistency Indicator */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Consistency Score</h4>
              <Badge variant="outline">
                {activeDays > 0 ? Math.round((currentStreak / activeDays) * 100) : 0}%
              </Badge>
            </div>
            <Progress
              value={activeDays > 0 ? (currentStreak / activeDays) * 100 : 0}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Shows how well the student maintains their learning streak
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
