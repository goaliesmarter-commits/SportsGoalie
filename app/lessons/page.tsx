'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BookOpen, Lock, Clock, CheckCircle2, ArrowRight, Target, FileText } from 'lucide-react';
import { SkeletonListPage } from '@/components/ui/skeletons';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { customCurriculumService, customContentService, sportsService } from '@/lib/database';
import { CustomCurriculumItem } from '@/types';

const BLUE = '#37b5ff';

interface LessonEntry {
  item: CustomCurriculumItem;
  title: string;
  description?: string;
  duration?: number;
}

function LessonsPageContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LessonEntry[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    void loadLessons();
  }, [user?.id]);

  const loadLessons = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const curriculumResult = await customCurriculumService.getStudentCurriculum(user.id);
      if (!curriculumResult.success || !curriculumResult.data) { setEntries([]); return; }

      const lessonLikeItems = curriculumResult.data.items
        .filter(item => ['lesson', 'custom_lesson', 'quiz', 'custom_quiz'].includes(item.type))
        .sort((a, b) => a.order - b.order);

      const resolved = await Promise.all(
        lessonLikeItems.map(async item => {
          if (!item.contentId) return { item, title: item.customContent?.title || 'Curriculum Item', description: item.customContent?.description, duration: item.customContent?.estimatedTimeMinutes };
          try {
            if (item.type === 'lesson') {
              const r = await sportsService.getSkill(item.contentId);
              if (r.success && r.data) return { item, title: r.data.name, description: r.data.description, duration: r.data.estimatedTimeToComplete };
            }
            if (item.type === 'quiz') {
              const r = await customContentService.getContent(item.contentId);
              if (r.success && r.data) return { item, title: r.data.title, description: r.data.description, duration: r.data.estimatedTimeMinutes };
              return { item, title: 'Video Quiz', description: 'Assigned by your coach' };
            }
            const r = await customContentService.getContent(item.contentId);
            if (r.success && r.data) return { item, title: r.data.title, description: r.data.description, duration: r.data.estimatedTimeMinutes };
          } catch { /* fallthrough */ }
          return { item, title: item.type.includes('quiz') ? 'Quiz' : 'Lesson', description: 'Assigned by your coach' };
        })
      );
      setEntries(resolved);
    } catch (error) {
      console.error('Error loading lessons:', error);
      toast.error('Failed to load assigned lessons');
    } finally {
      setLoading(false);
    }
  };

  const getHref = (item: CustomCurriculumItem) => {
    if (item.status === 'locked' || !item.contentId) return '';
    if (item.type === 'lesson') return `/pillars/${item.pillarId}/skills/${item.contentId}`;
    if (item.type === 'quiz' || item.type === 'custom_quiz') return `/quiz/video/${item.contentId}`;
    if (item.type === 'custom_lesson') return `/learn/lesson/${item.contentId}`;
    return '';
  };

  if (loading) return <SkeletonListPage cols={3} count={6} />;

  return (
    <div style={{ minHeight: '100vh', padding: '28px 24px 48px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Banner */}
        <div style={{ position: 'relative', borderRadius: '20px', background: 'rgba(2,18,44,0.9)', border: '1.5px solid rgba(55,181,255,0.3)', padding: '28px 32px', overflow: 'hidden', boxShadow: '0 0 60px rgba(55,181,255,0.06)' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '50%', height: '1px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <p style={{ fontSize: '10px', letterSpacing: '3px', color: BLUE, fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Your Curriculum</p>
          <h1 style={{ fontSize: 'clamp(20px,3.5vw,32px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>Lessons &amp; Quizzes</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>All coach-assigned learning items in one place.</p>
        </div>

        {entries.length === 0 ? (
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.15)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center' }}>
            <FileText size={36} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>No assigned items yet</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Your coach will add lessons and quizzes here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
            {entries.map(({ item, title, description, duration }) => {
              const href = getHref(item);
              const isLocked = item.status === 'locked';
              const isCompleted = item.status === 'completed';
              const isQuiz = item.type === 'quiz' || item.type === 'custom_quiz';
              const typeColor = isQuiz ? BLUE : '#a78bfa';

              return (
                <div key={item.id} style={{ background: isLocked ? 'rgba(2,14,36,0.7)' : 'rgba(2,18,44,0.82)', border: `1px solid ${isCompleted ? 'rgba(74,222,128,0.2)' : isLocked ? 'rgba(255,255,255,0.07)' : 'rgba(55,181,255,0.18)'}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', opacity: isLocked ? 0.6 : 1, transition: 'transform 0.2s, box-shadow 0.2s', borderTopWidth: '2px', borderTopColor: isCompleted ? '#4ade80' : isLocked ? 'rgba(255,255,255,0.1)' : typeColor }}
                  onMouseEnter={e => { if (!isLocked) { const el = e.currentTarget; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 12px 32px rgba(55,181,255,0.1)'; }}}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
                >
                  {/* Header badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: typeColor, background: `${typeColor}15`, border: `1px solid ${typeColor}25`, borderRadius: '20px', padding: '3px 10px' }}>
                      {isQuiz ? 'Quiz' : 'Lesson'}
                    </span>
                    {isCompleted ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '20px', padding: '3px 9px' }}>
                        <CheckCircle2 size={10} /> Completed
                      </span>
                    ) : isLocked ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', borderRadius: '20px', padding: '3px 9px' }}>
                        <Lock size={10} /> Locked
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '20px', padding: '3px 9px' }}>
                        <Target size={10} /> Available
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</h3>

                  {description && (
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{description}</p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={11} /> Step {item.order + 1}</span>
                    {duration && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={11} /> {duration} min</span>}
                  </div>

                  {isLocked ? (
                    <button disabled style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: 700, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Lock size={12} /> Locked
                    </button>
                  ) : (
                    <Link href={href} style={{ textDecoration: 'none' }}>
                      <button style={{ width: '100%', padding: '11px', borderRadius: '10px', background: isCompleted ? 'rgba(74,222,128,0.15)' : `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, border: isCompleted ? '1px solid rgba(74,222,128,0.3)' : 'none', color: isCompleted ? '#4ade80' : '#000f28', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {isCompleted ? 'Review' : isQuiz ? 'Start Quiz' : 'Start Lesson'}
                        <ArrowRight size={13} />
                      </button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LessonsPage() {
  return (
    <ProtectedRoute>
      <LessonsPageContent />
    </ProtectedRoute>
  );
}
