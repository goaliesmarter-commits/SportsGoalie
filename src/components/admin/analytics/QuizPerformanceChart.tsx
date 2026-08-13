'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Award } from 'lucide-react';

interface QuizPerformanceData {
  quizTitle: string;
  sportName: string;
  skillName: string;
  attempts: number;
  bestScore: number;
  averageScore: number;
  passed: boolean;
}

interface QuizPerformanceChartProps {
  data: QuizPerformanceData[];
}

export function QuizPerformanceChart({ data }: QuizPerformanceChartProps) {
  const getBarColor = (score: number, passed: boolean) => {
    if (passed) return 'hsl(142, 76%, 36%)'; // Green for passed
    if (score >= 70) return 'hsl(45, 93%, 47%)'; // Orange for close
    return 'hsl(0, 84%, 60%)'; // Red for failed
  };

  // Calculate summary stats
  const totalQuizzes = data.length;
  const passedQuizzes = data.filter(d => d.passed).length;
  const averageAllScores = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.averageScore, 0) / data.length)
    : 0;
  const bestOverallScore = data.length > 0 ? Math.max(...data.map(d => d.bestScore)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5" />
          <span>Quiz Performance Analysis</span>
        </CardTitle>
        <CardDescription>
          Detailed breakdown of quiz attempts and scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Quizzes</p>
                <Award className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{totalQuizzes}</p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Passed</p>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold mt-2 text-green-400">{passedQuizzes}</p>
              <p className="text-xs text-muted-foreground">
                {totalQuizzes > 0 ? Math.round((passedQuizzes / totalQuizzes) * 100) : 0}% pass rate
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{averageAllScores}%</p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Best Score</p>
                <TrendingUp className="h-4 w-4 text-sky-400" />
              </div>
              <p className="text-2xl font-bold mt-2 text-sky-400">{bestOverallScore}%</p>
            </div>
          </div>

          {/* Chart */}
          {data.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="quizTitle"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as QuizPerformanceData;
                        return (
                          <div className="rounded-lg border bg-background p-4 shadow-lg">
                            <div className="space-y-2">
                              <div>
                                <p className="font-semibold">{data.quizTitle}</p>
                                <p className="text-xs text-muted-foreground">
                                  {data.sportName} - {data.skillName}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                                <div>
                                  <p className="text-muted-foreground">Best Score</p>
                                  <p className="font-bold text-lg">{data.bestScore}%</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Avg Score</p>
                                  <p className="font-bold text-lg">{data.averageScore}%</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Attempts</p>
                                  <p className="font-medium">{data.attempts}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Status</p>
                                  <Badge variant={data.passed ? "default" : "destructive"} className="mt-1">
                                    {data.passed ? "Passed" : "Failed"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="bestScore" name="Best Score" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getBarColor(entry.bestScore, entry.passed)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mb-3 opacity-50" />
              <p>No quiz data available</p>
            </div>
          )}

          {/* Detailed List */}
          {data.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Quiz Details</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.map((quiz, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{quiz.quizTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {quiz.sportName} • {quiz.skillName}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{quiz.bestScore}%</p>
                        <p className="text-xs text-muted-foreground">{quiz.attempts} attempts</p>
                      </div>
                      <Badge variant={quiz.passed ? "default" : "destructive"}>
                        {quiz.passed ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
