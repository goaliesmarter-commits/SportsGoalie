'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { videoQuizService } from '@/lib/database/services/video-quiz.service';
import { customContentService } from '@/lib/database/services/custom-content.service';
import { VideoQuiz, VideoQuizProgress } from '@/types';
import {
  ArrowLeft, Home, Trophy, Clock, CheckCircle2, XCircle,
  RotateCcw, ChevronRight, Target, MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { GrowthPointsToast } from '@/components/ui/GrowthPointsToast';
import { GROWTH_POINTS } from '@/lib/config/growth-points';
import { growthPointsService } from '@/lib/firebase/growth-points.service';

const BLUE = '#37b5ff';
const RED = '#f87171';
// Reflective answers are neither right nor wrong, so they get their own neutral
// treatment rather than borrowing the pass/fail palette.
const AMBER = '#d4a93b';

function VideoQuizResultsContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<VideoQuiz | null>(null);
  const [progress, setProgress] = useState<VideoQuizProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGpToast, setShowGpToast] = useState(false);
  const [gpToastPoints, setGpToastPoints] = useState(0);

  useEffect(() => {
    if (quizId && user) { loadResults(); }
  }, [quizId, user]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);

      let actualQuizId = quizId;
      if (quizId.startsWith('content_')) {
        const contentResult = await customContentService.getContent(quizId);
        if (!contentResult.success || !contentResult.data) { setError('Content not found'); return; }
        try {
          const contentData = JSON.parse(contentResult.data.content);
          if (contentData.videoQuizId) { actualQuizId = contentData.videoQuizId; }
          else { setError('Invalid quiz reference'); return; }
        } catch { setError('Invalid quiz data'); return; }
      }

      const [quizResult, progressResult] = await Promise.all([
        videoQuizService.getVideoQuiz(actualQuizId),
        videoQuizService.getUserProgress(user!.id, actualQuizId),
      ]);

      if (!quizResult.success || !quizResult.data) { setError('Video quiz not found'); return; }
      if (!progressResult.success || !progressResult.data) { setError('Quiz results not found'); return; }

      const progressData = progressResult.data;
      if (!progressData.isCompleted) {
        toast.error('Quiz not completed yet');
        router.push(`/quiz/video/${quizId}`);
        return;
      }

      setQuiz(quizResult.data);
      setProgress(progressData);

      const pct = progressData.percentage;
      let totalPoints = GROWTH_POINTS.KNOWLEDGE_CHECK_COMPLETE;
      let bonusLabel = '';
      if (pct >= 95) {
        totalPoints += GROWTH_POINTS.KC_CLUB_95_BONUS;
        bonusLabel = ' — 95-100 Club bonus!';
      } else if (pct >= 80) {
        totalPoints += GROWTH_POINTS.KC_CLUB_80_BONUS;
        bonusLabel = ' — 80-100 Club bonus!';
      } else if (pct >= 70) {
        totalPoints += GROWTH_POINTS.KC_OWNING_IT_BONUS;
        bonusLabel = ' — Owning It bonus!';
      }

      growthPointsService.awardPointsOnce(
        user!.id,
        'KNOWLEDGE_CHECK_COMPLETE',
        totalPoints,
        `Knowledge Check Completed${bonusLabel}`,
        `quiz_${actualQuizId}`
      ).then((awarded) => {
        if (awarded) {
          setGpToastPoints(totalPoints);
          setTimeout(() => setShowGpToast(true), 600);
        }
      }).catch(() => {});
    } catch (err) {
      console.error('Error loading results:', err);
      setError('Failed to load quiz results');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return 'N/A';
    const ts = timestamp as { toDate?: () => Date };
    const date = ts.toDate ? ts.toDate() : new Date(timestamp as string);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div style={{ minHeight: '60vh', padding: '24px' }}><SkeletonContentPage /></div>;
  }

  if (error || !quiz || !progress) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '400px', background: 'rgba(2,18,44,0.9)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', marginBottom: '20px' }}>{error || 'Results not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            <Home size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const passed = progress.percentage >= 70;
  const scoreColor = passed ? BLUE : RED;

  const cardStyle = { background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px', padding: '24px', marginBottom: '0' };

  return (
    <>
      <GrowthPointsToast points={gpToastPoints} show={showGpToast} />
      <style>{`
        .qr-action:hover { opacity: 0.85 !important; transform: translateY(-1px); }
        .qr-outline:hover { background: rgba(55,181,255,0.08) !important; }
      `}</style>
      <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(55,181,255,0.2)', background: 'linear-gradient(135deg, #000f28 0%, #062344 50%, #0a1628 100%)', padding: '24px', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: passed ? 'rgba(55,181,255,0.1)' : 'rgba(248,113,113,0.08)', filter: 'blur(50px)', pointerEvents: 'none' }} />
          <Link href="/dashboard" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', marginBottom: '16px', fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div style={{ position: 'relative' }}>
            <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.02em' }}>Quiz Results</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{quiz.title}</p>
          </div>
        </div>

        {/* Score Card */}
        <div style={{ ...cardStyle, background: passed ? 'rgba(2,18,44,0.9)' : 'rgba(20,5,5,0.9)', border: `1px solid ${passed ? 'rgba(55,181,255,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>Your Score</h2>
            <div style={{ color: scoreColor }}>
              {passed ? <Trophy size={22} /> : <Target size={22} />}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '72px', fontWeight: 900, color: scoreColor, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '16px', textShadow: `0 0 40px ${scoreColor}40` }}>
              {progress.percentage.toFixed(1)}%
            </div>
            {/* Custom progress bar */}
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ height: '100%', width: `${Math.min(100, progress.percentage)}%`, background: passed ? `linear-gradient(90deg, ${BLUE}, #0ea5e9)` : 'linear-gradient(90deg, #dc2626, #f87171)', borderRadius: '99px', transition: 'width 0.8s ease', boxShadow: `0 0 12px ${scoreColor}60` }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>{progress.score}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Points Earned</div>
              </div>
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>{progress.maxScore}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Points</div>
              </div>
            </div>
            <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '20px', background: passed ? 'rgba(55,181,255,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${passed ? 'rgba(55,181,255,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: scoreColor }}>{passed ? '✓ Passed' : '✗ Not Passed'}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Questions Answered</p>
                <p style={{ fontSize: '26px', fontWeight: 900, color: '#fff' }}>
                  {progress.questionsAnswered.length} <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>/ {quiz.questions?.length || 0}</span>
                </p>
              </div>
              <CheckCircle2 size={28} color={BLUE} style={{ opacity: 0.7 }} />
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time Spent</p>
                <p style={{ fontSize: '26px', fontWeight: 900, color: '#fff' }}>{formatTime(progress.totalTimeSpent)}</p>
              </div>
              <Clock size={28} color={BLUE} style={{ opacity: 0.7 }} />
            </div>
          </div>
        </div>

        {/* Question Review */}
        {progress.questionsAnswered.length > 0 && (
          <div style={cardStyle}>
            <h2 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Question Review</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {progress.questionsAnswered.map((answer, index) => {
                const question = quiz.questions?.find(q => q.id === answer.questionId);
                if (!question) return null;
                // Reflective answers are checked first and never fall through to the
                // correct/incorrect styling — an honest "No" is not a wrong answer.
                const isReflective = answer.reflective === true || question.reflective === true;
                const tint = isReflective
                  ? { bg: 'rgba(212,169,59,0.05)', border: 'rgba(212,169,59,0.14)' }
                  : answer.isCorrect
                    ? { bg: 'rgba(55,181,255,0.05)', border: 'rgba(55,181,255,0.12)' }
                    : { bg: 'rgba(248,113,113,0.05)', border: 'rgba(248,113,113,0.12)' };
                return (
                  <div key={answer.questionId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: tint.bg, borderRadius: '10px', border: `1px solid ${tint.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ flexShrink: 0 }}>
                        {isReflective
                          ? <MessageSquare size={18} color={AMBER} />
                          : answer.isCorrect
                            ? <CheckCircle2 size={18} color={BLUE} />
                            : <XCircle size={18} color={RED} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Question {index + 1}</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                          At {Math.floor(answer.timestamp / 60)}:{String(Math.floor(answer.timestamp % 60)).padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 0 }}>
                      {isReflective ? (
                        <p style={{ color: AMBER, fontSize: '13px', fontWeight: 700, overflowWrap: 'anywhere' }}>
                          {answer.answerText || 'Answered'}
                        </p>
                      ) : (
                        <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                          {answer.pointsEarned} / {question.points} pts
                        </p>
                      )}
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                        {isReflective ? 'Your answer — not scored' : `${formatTime(answer.timeToAnswer)} to answer`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completion Info */}
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Started:</span>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, marginLeft: '8px' }}>{formatDate(progress.startedAt)}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Completed:</span>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, marginLeft: '8px' }}>{formatDate(progress.completedAt)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', paddingBottom: '8px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            className="qr-action qr-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '10px', border: '1px solid rgba(55,181,255,0.25)', background: 'rgba(55,181,255,0.06)', color: BLUE, fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Home size={16} />
            Back to Dashboard
          </button>

          {quiz.allowRetakes && (
            <button
              onClick={() => router.push(`/quiz/video/${quizId}`)}
              className="qr-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }}
            >
              <RotateCcw size={16} />
              Retake Quiz
            </button>
          )}

          <button
            onClick={() => router.push(`/sports/${quiz.sportId}/skills/${quiz.skillId}`)}
            className="qr-action"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(55,181,255,0.3)' }}
          >
            Continue Learning
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

export default function VideoQuizResultsPage() {
  return (
    <ProtectedRoute>
      <VideoQuizResultsContent />
    </ProtectedRoute>
  );
}
