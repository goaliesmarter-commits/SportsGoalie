import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  Trophy,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import type { CourseProgressDetail } from '@/lib/database/services/student-analytics.service';

interface CourseProgressProps {
  courses: CourseProgressDetail[];
  loading?: boolean;
}

export function CourseProgress({ courses, loading }: CourseProgressProps) {
  const [expandedCourses, setExpandedCourses] = React.useState<Set<string>>(new Set());

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/15 text-green-200 border-green-400/30">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const getQuizStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading course progress...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No courses enrolled yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Course Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {courses.map((course) => (
          <Collapsible
            key={course.sportId}
            open={expandedCourses.has(course.sportId)}
          >
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full p-4 hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCourse(course.sportId)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{course.sportName}</h3>
                        {getStatusBadge(course.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Progress:</span>
                          <span className="ml-2 font-medium">{course.progressPercentage}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Skills:</span>
                          <span className="ml-2 font-medium">
                            {course.completedSkills}/{course.totalSkills}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Score:</span>
                          <span className="ml-2 font-medium">{course.averageQuizScore}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Active:</span>
                          <span className="ml-2 font-medium">
                            {formatDate(course.lastActivityDate)}
                          </span>
                        </div>
                      </div>

                      <Progress value={course.progressPercentage} className="h-2" />
                    </div>

                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ml-4 ${
                        expandedCourses.has(course.sportId) ? 'transform rotate-180' : ''
                      }`}
                    />
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t px-4 pb-4 pt-2 bg-muted/20">
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground">
                      Enrolled: {formatDate(course.enrolledAt)}
                    </p>
                  </div>

                  {course.skills.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm mb-2">Skills Breakdown:</h4>
                      {course.skills.map((skill) => (
                        <div
                          key={skill.skillId}
                          className="bg-white/5 rounded-lg p-3 border"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium">{skill.skillName}</h5>
                              <Badge variant="outline" className="text-xs">
                                {skill.difficulty}
                              </Badge>
                              {getStatusBadge(skill.status)}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Progress:</span>
                              <span className="font-medium">{skill.progressPercentage}%</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {getQuizStatusIcon(skill.quizStatus)}
                              <span className="text-muted-foreground">Quiz:</span>
                              <span className="font-medium">
                                {skill.latestQuizScore !== null
                                  ? `${skill.latestQuizScore}%`
                                  : 'Not attempted'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Time:</span>
                              <span className="font-medium">{formatTime(skill.timeSpent)}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Trophy className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {skill.completedAt ? 'Completed:' : 'Last attempt:'}
                              </span>
                              <span className="font-medium">
                                {formatDate(skill.completedAt || skill.lastAttemptDate)}
                              </span>
                            </div>
                          </div>

                          {skill.progressPercentage > 0 && (
                            <Progress
                              value={skill.progressPercentage}
                              className="h-1.5 mt-2"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No skills available for this course
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}