'use client';

import { LinkedChildSummary } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Award,
  ChevronRight,
  CheckCircle2,
  Clock,
  Flame,
} from 'lucide-react';
import Link from 'next/link';
import { calendarDaysAgo } from '@/lib/utils/local-date';

interface ChildProgressCardProps {
  child: LinkedChildSummary;
}

export function ChildProgressCard({ child }: ChildProgressCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Never';
    const days = calendarDaysAgo(date);

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPacingLevelBadge = (level: string | undefined) => {
    if (!level) return null;

    const variants: Record<string, { className: string; label: string }> = {
      beginner: { className: 'bg-amber-100 text-amber-800', label: 'Introduction' },
      introduction: { className: 'bg-amber-100 text-amber-800', label: 'Introduction' },
      intermediate: { className: 'bg-blue-100 text-blue-800', label: 'Development' },
      development: { className: 'bg-blue-100 text-blue-800', label: 'Development' },
      advanced: { className: 'bg-emerald-100 text-emerald-800', label: 'Refinement' },
      refinement: { className: 'bg-emerald-100 text-emerald-800', label: 'Refinement' },
    };

    const variant = variants[level] || variants['beginner'];
    return (
      <Badge variant="secondary" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={child.profileImage} alt={child.displayName} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(child.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{child.displayName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {child.studentNumber && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {child.studentNumber}
                  </span>
                )}
                {getPacingLevelBadge(child.pacingLevel)}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="capitalize">
            {child.relationship}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {child.progressPercentage !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round(child.progressPercentage)}%</span>
            </div>
            <Progress value={child.progressPercentage} className="h-2" />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Award className="h-3.5 w-3.5" />
              <span className="text-xs">Quizzes</span>
            </div>
            <span className="text-lg font-semibold">{child.quizzesCompleted || 0}</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Flame className="h-3.5 w-3.5" />
              <span className="text-xs">Streak</span>
            </div>
            <span className="text-lg font-semibold">{child.currentStreak || 0}</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">Active</span>
            </div>
            <span className="text-sm font-medium">{formatDate(child.lastActiveAt)}</span>
          </div>
        </div>

        {/* Assessment Status */}
        <div className="flex items-center justify-between py-2 border-t">
          <div className="flex items-center gap-2">
            {child.hasCompletedAssessment ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Assessment Complete</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Assessment Pending</span>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/parent/child/${child.childId}`}>
              View Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
