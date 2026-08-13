'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, Trophy, CheckCircle2, Circle, PlayCircle } from 'lucide-react';

interface SkillPerformanceData {
  skillId: string;
  skillName: string;
  sportName: string;
  progress: number;
  timeSpent: number;
  quizScore: number | null;
  status: 'not_started' | 'in_progress' | 'completed';
  difficulty: 'introduction' | 'development' | 'refinement';
}

interface SkillPerformanceTableProps {
  data: SkillPerformanceData[];
}

export function SkillPerformanceTable({ data }: SkillPerformanceTableProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'introduction':
        return 'bg-sky-500/15 text-sky-200 border-sky-400/30';
      case 'development':
        return 'bg-yellow-500/15 text-yellow-200 border-yellow-400/30';
      case 'refinement':
        return 'bg-red-500/15 text-red-200 border-red-400/30';
      default:
        return 'bg-white/8 text-white/70 border-white/15';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-sky-400" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/15 text-green-200 border-green-400/30">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-sky-500/15 text-sky-200 border-sky-400/30">In Progress</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  // Calculate summary stats
  const totalSkills = data.length;
  const completedSkills = data.filter(s => s.status === 'completed').length;
  const inProgressSkills = data.filter(s => s.status === 'in_progress').length;
  const avgProgress = data.length > 0
    ? Math.round(data.reduce((sum, s) => sum + s.progress, 0) / data.length)
    : 0;
  const totalHours = data.reduce((sum, s) => sum + s.timeSpent, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5" />
          <span>Skill Performance Breakdown</span>
        </CardTitle>
        <CardDescription>
          Detailed view of progress across all skills
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Skills</p>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{totalSkills}</p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Completed</p>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-400">{completedSkills}</p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">In Progress</p>
                <PlayCircle className="h-4 w-4 text-sky-400" />
              </div>
              <p className="text-2xl font-bold text-sky-400">{inProgressSkills}</p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{avgProgress}%</p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{totalHours}h</p>
            </div>
          </div>

          {/* Skills Table */}
          {data.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Skill</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Sport</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Difficulty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Progress</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Time Spent</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Quiz Score</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.map((skill) => (
                      <tr key={skill.skillId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(skill.status)}
                            <span className="font-medium text-sm">{skill.skillName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{skill.sportName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={getDifficultyColor(skill.difficulty)}>
                            {skill.difficulty}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{skill.progress}%</span>
                            </div>
                            <Progress value={skill.progress} className="h-2" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{skill.timeSpent}h</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {skill.quizScore !== null ? (
                            <div className="flex items-center space-x-1">
                              <Trophy className="h-3 w-3 text-yellow-400" />
                              <span className="font-medium text-sm">{skill.quizScore}%</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(skill.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-3 opacity-50" />
              <p>No skill data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
