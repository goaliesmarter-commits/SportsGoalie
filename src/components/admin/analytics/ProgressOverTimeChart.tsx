'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Target, BarChart3 } from 'lucide-react';

interface ProgressData {
  date: string;
  skillsCompleted: number;
  quizzesTaken: number;
  averageScore: number;
  timeSpent: number;
}

interface ProgressOverTimeChartProps {
  data: ProgressData[];
}

/**
 * Series colours, as literals.
 *
 * The skills line used to be `hsl(var(--primary))`, but `--primary` holds a
 * whole colour (`oklch(…)` on the light theme, `#37b5ff` in `.surface-dark`) —
 * not the three HSL channels that wrapper expects. `hsl(#37b5ff)` is invalid
 * CSS, so recharts fell back to black and the line was invisible against the
 * chart. Recharts writes these straight into SVG attributes and can't read
 * tokens anyway, so they're spelled out.
 */
const SERIES = {
  skills: '#37b5ff',
  quizzes: '#34d399',
  score: '#fb7185',
} as const;

export function ProgressOverTimeChart({ data }: ProgressOverTimeChartProps) {
  // Calculate summary stats
  const totalSkills = data.length > 0 ? data[data.length - 1].skillsCompleted : 0;
  const totalQuizzes = data.reduce((sum, d) => sum + d.quizzesTaken, 0);
  const totalHours = data.reduce((sum, d) => sum + d.timeSpent, 0);
  const avgScore = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.averageScore, 0) / data.filter(d => d.averageScore > 0).length || 0)
    : 0;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Progress Over Time</span>
        </CardTitle>
        <CardDescription>
          Learning activity and performance trends over the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Skills Completed</p>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{totalSkills}</p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Quizzes Taken</p>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{totalQuizzes}</p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Study Hours</p>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{totalHours}h</p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold mt-2">{avgScore}%</p>
            </div>
          </div>

          {/* Line Chart */}
          {data.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDate}
                  />
                  <YAxis
                    yAxisId="left"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    label={{ value: 'Score %', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <p className="font-semibold mb-2">{formatDate(String(label))}</p>
                            <div className="space-y-1 text-sm">
                              {payload.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between space-x-4">
                                  <span className="text-muted-foreground">{entry.name}:</span>
                                  <span className="font-medium" style={{ color: entry.color }}>
                                    {entry.name === 'Avg Score' ? `${entry.value}%` : entry.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="skillsCompleted"
                    name="Skills Completed"
                    stroke={SERIES.skills}
                    strokeWidth={2}
                    dot={{ fill: SERIES.skills, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="quizzesTaken"
                    name="Quizzes Taken"
                    stroke={SERIES.quizzes}
                    strokeWidth={2}
                    dot={{ fill: SERIES.quizzes, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="averageScore"
                    name="Avg Score"
                    stroke={SERIES.score}
                    strokeWidth={2}
                    dot={{ fill: SERIES.score, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
              <p>No progress data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
