import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  History,
  FileText
} from 'lucide-react';
import type { QuizAttemptDetail } from '@/lib/database/services/student-analytics.service';

interface QuizAttemptHistoryProps {
  attempts: QuizAttemptDetail[];
  loading?: boolean;
}

export function QuizAttemptHistory({ attempts, loading }: QuizAttemptHistoryProps) {
  const [filterSport, setFilterSport] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'date' | 'score'>('date');

  // Get unique sports for filter
  const uniqueSports = React.useMemo(() => {
    const sports = new Set(attempts.map(a => a.sportName));
    return Array.from(sports);
  }, [attempts]);

  // Filter and sort attempts
  const filteredAttempts = React.useMemo(() => {
    let filtered = [...attempts];

    // Apply filters
    if (filterSport !== 'all') {
      filtered = filtered.filter(a => a.sportName === filterSport);
    }

    // Apply sorting
    if (sortBy === 'score') {
      filtered.sort((a, b) => b.percentage - a.percentage);
    } else {
      filtered.sort((a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
    }

    return filtered;
  }, [attempts, filterSport, sortBy]);

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getScoreTrend = (currentScore: number, attempts: QuizAttemptDetail[], quizId: string): 'up' | 'down' | 'stable' => {
    const sameQuizAttempts = attempts.filter(a => a.quizId === quizId);
    const currentIndex = sameQuizAttempts.findIndex(a => a.percentage === currentScore);

    if (currentIndex > 0) {
      const previousScore = sameQuizAttempts[currentIndex - 1].percentage;
      if (currentScore > previousScore) return 'up';
      if (currentScore < previousScore) return 'down';
    }
    return 'stable';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Attempt History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading quiz history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attempts || attempts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Attempt History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No quiz attempts yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary statistics
  const totalAttempts = filteredAttempts.length;
  const completedAttempts = filteredAttempts.filter(a => a.percentage !== undefined).length;
  const averageScore = totalAttempts > 0 ? Math.round(
    filteredAttempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts
  ) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Quiz Attempt History
          </CardTitle>

          <div className="flex items-center gap-2">
            <Select value={filterSport} onValueChange={setFilterSport}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                {uniqueSports.map(sport => (
                  <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                ))}
              </SelectContent>
            </Select>


            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'score')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="score">Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{totalAttempts}</div>
            <p className="text-sm text-muted-foreground">Total Attempts</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{completedAttempts}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{averageScore}%</div>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </div>
        </div>

        {/* Attempts Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead>Sport / Skill</TableHead>
                <TableHead>Attempt #</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttempts.map((attempt) => {
                const trend = getScoreTrend(attempt.percentage, attempts, attempt.quizId);

                return (
                  <TableRow key={attempt.attemptId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(attempt.submittedAt)}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="max-w-[200px] truncate" title={attempt.quizTitle}>
                        {attempt.quizTitle}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{attempt.sportName}</div>
                        <div className="text-xs text-muted-foreground">{attempt.skillName}</div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">#{attempt.attemptNumber}</Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${
                          attempt.percentage >= 80 ? 'text-green-400' :
                          attempt.percentage >= 60 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {attempt.percentage}%
                        </span>
                        {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-400" />}
                        {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-400" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {attempt.score}/{attempt.maxScore} pts
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span>{attempt.correctAnswers}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-400" />
                          <span>{attempt.incorrectAnswers}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {attempt.questionsAnswered}/{attempt.totalQuestions} answered
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatTime(attempt.timeSpent)}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {attempt.percentage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredAttempts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No attempts match the selected filters
          </div>
        )}
      </CardContent>
    </Card>
  );
}