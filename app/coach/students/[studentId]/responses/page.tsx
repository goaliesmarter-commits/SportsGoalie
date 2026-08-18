'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ClipboardList, CheckCircle2, XCircle, MessageSquare,
  ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { userService } from '@/lib/database';
import { videoQuizService } from '@/lib/database/services/video-quiz.service';
import {
  User as UserType, VideoQuiz, VideoQuizProgress, VideoQuestionAnswer, VideoQuizQuestion,
} from '@/types';
import { toast } from 'sonner';

const BLUE  = '#37b5ff';
const GOLD  = '#D4A93B';
const RED    = '#f87171';
const GREEN  = '#22c55e';
const cardBg = 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)';
const border = '1px solid rgba(55,181,255,0.22)';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDate(ts: any): string {
  if (!ts) return '—';
  if (typeof ts?.toDate === 'function') return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (ts instanceof Date) return ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return '—';
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * The goalie's answer in words.
 *
 * Answers recorded from now on carry `answerText`, but everything saved before that
 * only holds option *ids*. Rather than show a coach `opt_1738...`, fall back to
 * resolving the id against the quiz — which is why the quiz is loaded alongside the
 * attempt rather than just its title.
 */
function resolveAnswerText(answer: VideoQuestionAnswer, question?: VideoQuizQuestion): string {
  if (answer.answerText) return answer.answerText;

  const values = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
  if (question?.type === 'multiple_choice' && question.options) {
    return values
      .map(v => question.options!.find(o => o.id === v)?.text ?? String(v))
      .join(', ');
  }
  if (question?.type === 'true_false') {
    return String(values[0]) === 'true' ? 'True' : 'False';
  }
  return values.map(String).join(', ') || '—';
}

interface AttemptView {
  progress: VideoQuizProgress;
  quiz: VideoQuiz | null;
}

export default function CoachStudentResponsesPage() {
  const { user }  = useAuth();
  const router    = useRouter();
  const params    = useParams();
  const studentId = params.studentId as string;

  const [student, setStudent]   = useState<UserType | null>(null);
  const [attempts, setAttempts] = useState<AttemptView[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!studentId || !user) return;
    const load = async () => {
      setLoading(true);
      try {
        const studentResult = await userService.getUser(studentId);
        if (!studentResult.success || !studentResult.data) {
          toast.error('Goalie not found');
          router.push('/coach/students');
          return;
        }
        if (user.role === 'coach' && studentResult.data.assignedCoachId !== user.id) {
          toast.error('This goalie is not on your roster');
          router.push('/coach/students');
          return;
        }
        setStudent(studentResult.data);

        const attemptsResult = await videoQuizService.getUserVideoQuizAttempts(studentId, { limit: 50 });
        const items = attemptsResult.success && attemptsResult.data ? attemptsResult.data.items : [];

        // One fetch per distinct quiz, not per attempt — a goalie retaking the same
        // Knowledge Check five times shouldn't cost five reads of the same document.
        const quizIds = Array.from(new Set(items.map(p => p.videoQuizId)));
        const quizResults = await Promise.all(quizIds.map(id => videoQuizService.getVideoQuiz(id)));
        const quizMap = new Map<string, VideoQuiz>();
        quizResults.forEach((r, i) => {
          if (r.success && r.data) quizMap.set(quizIds[i], r.data);
        });

        setAttempts(items.map(progress => ({
          progress,
          quiz: quizMap.get(progress.videoQuizId) ?? null,
        })));
      } catch (err) {
        console.error(err);
        toast.error('Failed to load quiz answers');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studentId, user, router]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <SkeletonContentPage />;
  if (!student) return null;

  const initials = (student.displayName || student.email || 'G')
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const totalAnswers = attempts.reduce((sum, a) => sum + (a.progress.questionsAnswered?.length || 0), 0);
  const totalReflections = attempts.reduce(
    (sum, a) => sum + (a.progress.questionsAnswered?.filter(x => x.reflective).length || 0), 0
  );

  return (
    <>
      <style>{`
        .sr-back:hover { color: ${BLUE} !important; background: rgba(55,181,255,0.08) !important; }
        .sr-toggle:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(14px,3vw,24px) 56px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <Link href="/coach/students" className="sr-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, borderRadius: '8px', padding: '6px 10px', width: 'fit-content', transition: 'all 0.2s' }}>
          <ArrowLeft size={15} /> Back to Goalies
        </Link>

        {/* Header */}
        <div style={{ position: 'relative', borderRadius: '20px', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 50%, #0d1f40 100%)', border, boxShadow: '0 4px 32px rgba(0,0,0,0.5)', padding: '24px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-30px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(212,169,59,0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${GOLD}, ${BLUE}44, transparent)` }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#0c0800', flexShrink: 0, border: '2px solid rgba(212,169,59,0.35)' }}>
                {student.profileImage
                  ? <img src={student.profileImage} alt={student.displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <ClipboardList size={14} color={GOLD} />
                  <span style={{ color: GOLD, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Knowledge Check Answers</span>
                </div>
                <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '22px' }}>{student.displayName}</h1>
                {student.email && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '2px' }}>{student.email}</p>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {totalAnswers > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)' }}>
                  <ClipboardList size={12} color={BLUE} />
                  <span style={{ color: BLUE, fontSize: '11px', fontWeight: 700 }}>{totalAnswers} answers</span>
                </div>
              )}
              {totalReflections > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(212,169,59,0.1)', border: '1px solid rgba(212,169,59,0.25)' }}>
                  <MessageSquare size={12} color={GOLD} />
                  <span style={{ color: GOLD, fontSize: '11px', fontWeight: 700 }}>{totalReflections} reflections</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attempts */}
        {attempts.length === 0 ? (
          <div style={{ background: cardBg, border, borderRadius: '16px', padding: '48px 24px', textAlign: 'center' }}>
            <ClipboardList size={36} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', margin: 0 }}>
              {student.displayName} hasn&apos;t answered any Knowledge Checks yet
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {attempts.map(({ progress, quiz }) => {
              const answers      = progress.questionsAnswered || [];
              const isOpen       = expanded.has(progress.id);
              const reflections  = answers.filter(a => a.reflective).length;
              const graded       = answers.filter(a => !a.reflective);
              const correctCount = graded.filter(a => a.isCorrect).length;

              return (
                <div key={progress.id} style={{ background: cardBg, borderRadius: '16px', overflow: 'hidden', border }}>
                  <div style={{ height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}55, transparent)` }} />

                  {/* Attempt header — the whole strip toggles */}
                  <button
                    type="button"
                    className="sr-toggle"
                    onClick={() => toggle(progress.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {quiz?.title || 'Knowledge Check'}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: '3px 0 0' }}>
                        {formatDate(progress.completedAt || progress.submittedAt || progress.startedAt)}
                        {' · '}{answers.length} answered
                        {reflections > 0 && <> · {reflections} reflection{reflections === 1 ? '' : 's'}</>}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        {graded.length > 0 ? (
                          <>
                            <p style={{ color: '#fff', fontWeight: 800, fontSize: '15px', margin: 0 }}>
                              {Math.round(progress.percentage || 0)}%
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: 0 }}>
                              {correctCount}/{graded.length} correct
                            </p>
                          </>
                        ) : (
                          <p style={{ color: GOLD, fontWeight: 700, fontSize: '12px', margin: 0 }}>Reflection only</p>
                        )}
                      </div>
                      {isOpen
                        ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
                        : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 20px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {answers.length === 0 && (
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>No answers recorded for this attempt.</p>
                      )}
                      {answers.map((answer, index) => {
                        const question = quiz?.questions?.find(q => q.id === answer.questionId);
                        // Reflective is checked before correctness everywhere — an
                        // honest "No" must never be presented to the coach as wrong.
                        const isReflective = answer.reflective === true || question?.reflective === true;
                        const tint = isReflective
                          ? { bg: 'rgba(212,169,59,0.05)', bd: 'rgba(212,169,59,0.16)', fg: GOLD }
                          : answer.isCorrect
                            ? { bg: 'rgba(34,197,94,0.05)', bd: 'rgba(34,197,94,0.16)', fg: GREEN }
                            : { bg: 'rgba(248,113,113,0.05)', bd: 'rgba(248,113,113,0.16)', fg: RED };

                        return (
                          <div key={`${answer.questionId}_${index}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: tint.bg, border: `1px solid ${tint.bd}`, borderRadius: '10px' }}>
                            <div style={{ flexShrink: 0, marginTop: '1px' }}>
                              {isReflective
                                ? <MessageSquare size={16} color={GOLD} />
                                : answer.isCorrect
                                  ? <CheckCircle2 size={16} color={GREEN} />
                                  : <XCircle size={16} color={RED} />}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', margin: 0, lineHeight: 1.45 }}>
                                {question?.question || `Question ${index + 1}`}
                              </p>
                              <p style={{ color: tint.fg, fontSize: '13px', fontWeight: 700, margin: '5px 0 0', overflowWrap: 'anywhere' }}>
                                {resolveAnswerText(answer, question)}
                              </p>
                              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Clock size={10} />
                                At {formatTimestamp(answer.timestamp)}
                                {isReflective
                                  ? ' · Reflection — not scored'
                                  : ` · ${answer.pointsEarned}/${question?.points ?? 0} pts`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
