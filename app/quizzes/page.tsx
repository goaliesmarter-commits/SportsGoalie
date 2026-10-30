'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Clock, Users, Star, Search, BookOpen, Target, ArrowRight } from 'lucide-react';
import { SkeletonListPage } from '@/components/ui/skeletons';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { VideoQuiz } from '@/types/video-quiz';
import { videoQuizService } from '@/lib/database/services/video-quiz.service';

const BLUE = '#37b5ff';

interface QuizStats { totalAttempts: number; averageScore: number; completionRate: number; }
interface QuizWithStats extends VideoQuiz { stats?: QuizStats; }

function QuizzesPageContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizWithStats[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<QuizWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  useEffect(() => { loadQuizzes(); }, []);
  useEffect(() => { filterQuizzes(); }, [quizzes, searchTerm, selectedDifficulty]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      // Active and published, the same pair the admin list calls "Active". This
      // used to ask for `status == 'published'`, a field the quiz form never
      // writes, so the page was empty for every goalie (item 4 of the 4 Oct run).
      const quizzesResult = await videoQuizService.getPublishedVideoQuizzes({ limit: 100 });
      if (quizzesResult.success && quizzesResult.data) {
        const quizzesWithStats = await Promise.all(
          quizzesResult.data.items.map(async quiz => {
            try {
              const attemptsResult = user ? await videoQuizService.getUserVideoQuizAttempts(user.id, { videoQuizId: quiz.id }) : null;
              let stats: QuizStats = { totalAttempts: 0, averageScore: 0, completionRate: 0 };
              if (attemptsResult?.success && attemptsResult.data?.items.length) {
                const attempts = attemptsResult.data.items;
                const totalScore = attempts.reduce((sum, a) => sum + a.percentage, 0);
                const completedCount = attempts.filter(a => a.isCompleted).length;
                stats = { totalAttempts: attempts.length, averageScore: totalScore / attempts.length, completionRate: (completedCount / attempts.length) * 100 };
              }
              return { ...quiz, stats } as QuizWithStats;
            } catch { return quiz as QuizWithStats; }
          })
        );
        setQuizzes(quizzesWithStats);
      } else {
        throw new Error(quizzesResult.error?.message || 'Failed to load quizzes');
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Failed to load quizzes', { description: 'Please try refreshing the page.' });
    } finally {
      setLoading(false);
    }
  };

  const filterQuizzes = () => {
    let filtered = quizzes;
    if (searchTerm) filtered = filtered.filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase()) || q.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedDifficulty !== 'all') filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    setFilteredQuizzes(filtered);
  };

  const difficultyColor = (d: string) => d === 'easy' ? '#4ade80' : d === 'medium' ? '#fbbf24' : d === 'hard' ? '#f87171' : 'rgba(255,255,255,0.4)';

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (loading) return <SkeletonListPage cols={3} count={6} />;

  return (
    <div style={{ minHeight: '100vh', padding: '28px 24px 48px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Banner */}
        <div style={{ position: 'relative', borderRadius: '20px', background: 'rgba(2,18,44,0.9)', border: '1.5px solid rgba(55,181,255,0.3)', padding: '28px 32px', overflow: 'hidden', boxShadow: '0 0 60px rgba(55,181,255,0.06)' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '50%', height: '1px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <p style={{ fontSize: '10px', letterSpacing: '3px', color: BLUE, fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Knowledge Check</p>
          <h1 style={{ fontSize: 'clamp(20px,3.5vw,32px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>Knowledge Checks</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>Confirm your knowledge and track your Grasp Level with our interactive Knowledge Checks.</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={15} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              placeholder="Search Knowledge Checks..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '38px', padding: '10px 14px 10px 38px', background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            style={{ padding: '10px 14px', background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Quiz Grid */}
        {filteredQuizzes.length === 0 ? (
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.15)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center' }}>
            <BookOpen size={36} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>No Knowledge Checks found</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
              {searchTerm || selectedDifficulty !== 'all' ? 'Try adjusting your filters or search term.' : 'Check back later for new Knowledge Checks.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
            {filteredQuizzes.map(quiz => {
              const dc = difficultyColor(quiz.difficulty);
              return (
                <div key={quiz.id}
                  style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s' }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 16px 40px rgba(55,181,255,0.1)'; el.style.borderColor = 'rgba(55,181,255,0.35)'; }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; el.style.borderColor = 'rgba(55,181,255,0.18)'; }}
                >
                  {/* Badges row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: dc, background: `${dc}15`, border: `1px solid ${dc}25`, borderRadius: '20px', padding: '3px 10px' }}>
                      {quiz.difficulty}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: BLUE, background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '20px', padding: '3px 10px' }}>
                      Knowledge Check
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: '6px' }}>{quiz.title}</h3>
                    {quiz.description && (
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{quiz.description}</p>
                    )}
                  </div>

                  {/* Info row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Target size={11} /> {quiz.questions?.length || 0} questions</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={11} /> {formatDuration(quiz.estimatedDuration)}</span>
                  </div>

                  {/* Stats */}
                  {quiz.stats && quiz.stats.totalAttempts > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', paddingTop: '6px', borderTop: '1px solid rgba(55,181,255,0.08)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={11} /> {quiz.stats.totalAttempts} attempts</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={11} /> {quiz.stats.averageScore.toFixed(1)}% avg</span>
                    </div>
                  )}

                  <Link href={`/quiz/video/${quiz.id}`} style={{ textDecoration: 'none' }}>
                    <button style={{ width: '100%', padding: '12px', borderRadius: '10px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, border: 'none', color: '#000f28', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      Start Knowledge Check <ArrowRight size={13} />
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizzesPage() {
  return (
    <ProtectedRoute>
      <QuizzesPageContent />
    </ProtectedRoute>
  );
}
