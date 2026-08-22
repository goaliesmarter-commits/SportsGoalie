'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { Sport, Skill, DifficultyLevel } from '@/types';
import { sportsService } from '@/lib/database/services/sports.service';
import { videoQuizService } from '@/lib/database/services/video-quiz.service';
import { ProgressService } from '@/lib/database/services/progress.service';
import { customCurriculumService } from '@/lib/database';
import { customContentService } from '@/lib/database/services/custom-content.service';
import { pillarDisplayName } from '@/lib/utils/pillars';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft, Clock, BookOpen, Play, CheckCircle, Star,
  ExternalLink, Target, AlertTriangle, Bookmark, Share2,
} from 'lucide-react';

const BLUE = '#37b5ff';
const GREEN = '#22c55e';
const YELLOW = '#fbbf24';
const RED = '#f87171';
const cardBg = 'rgba(2,18,44,0.82)';
const border = '1px solid rgba(55,181,255,0.18)';

interface SkillDetailState {
  sport: Sport | null;
  skill: Skill | null;
  prerequisites: Skill[];
  loading: boolean;
  error: string | null;
  hasQuizzes: boolean;
  quizzesLoading: boolean;
}

interface LinkedCustomItem {
  id: string;
  type: 'custom_lesson' | 'custom_quiz';
  title: string;
  description?: string;
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
}

export default function SkillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const sportId = params.id as string;
  const skillId = params.skillId as string;
  const completedContentId = searchParams.get('completedContentId');
  const completedAt = searchParams.get('completedAt');

  const [state, setState] = useState<SkillDetailState>({
    sport: null, skill: null, prerequisites: [],
    loading: true, error: null, hasQuizzes: false, quizzesLoading: true,
  });

  const [activeTab, setActiveTab] = useState<'content' | 'objectives' | 'resources'>('content');
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  const [isInCurriculum, setIsInCurriculum] = useState(false);
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [linkedCustomItems, setLinkedCustomItems] = useState<LinkedCustomItem[]>([]);

  const isCustomWorkflow = user?.workflowType === 'custom';

  useEffect(() => {
    const checkCurriculum = async () => {
      if (!isCustomWorkflow || !user?.id || !skillId) { setCurriculumLoading(false); return; }
      try {
        setCurriculumLoading(true);
        const result = await customCurriculumService.getStudentCurriculum(user.id);
        if (result.success && result.data) {
          const item = result.data.items.find(i => i.contentId === skillId);
          const linkedItems = result.data.items.filter(
            i => (i.type === 'custom_lesson' || i.type === 'custom_quiz') &&
              i.pillarId === sportId && (i.levelId === skillId || !i.levelId || i.levelId === 'level-1') && !!i.contentId
          );
          const linkedContent = await Promise.all(linkedItems.map(async (curriculumItem) => {
            if (!curriculumItem.contentId) return null;
            const contentResult = await customContentService.getContent(curriculumItem.contentId);
            if (!contentResult.success || !contentResult.data) return null;
            return {
              id: curriculumItem.contentId, type: curriculumItem.type,
              title: contentResult.data.title, description: contentResult.data.description,
              status: curriculumItem.contentId === completedContentId ? 'completed' : curriculumItem.status,
            } as LinkedCustomItem;
          }));
          setLinkedCustomItems(linkedContent.filter((v): v is LinkedCustomItem => v !== null));
          if (item) { setIsInCurriculum(true); setIsMarkedComplete(item.status === 'completed'); }
          else { setIsInCurriculum(false); }
        } else { setIsInCurriculum(false); }
      } catch (error) { console.error('Failed to check curriculum:', error); setIsInCurriculum(false); setLinkedCustomItems([]); }
      finally { setCurriculumLoading(false); }
    };
    checkCurriculum();
  }, [isCustomWorkflow, user?.id, sportId, skillId, completedContentId, completedAt]);

  useEffect(() => {
    if (!sportId || !skillId) return;
    const loadSkillData = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const [sportResult, skillResult] = await Promise.all([
          sportsService.getSport(sportId), sportsService.getSkill(skillId),
        ]);
        if (!sportResult.success || !sportResult.data) { setState(prev => ({ ...prev, error: 'Sport not found', loading: false })); return; }
        if (!skillResult.success || !skillResult.data) { setState(prev => ({ ...prev, sport: sportResult.data ?? null, error: 'Skill not found', loading: false })); return; }
        let prerequisites: Skill[] = [];
        if (skillResult.data.prerequisites.length > 0) {
          const prereqResult = await sportsService.getSkillPrerequisites(skillId);
          if (prereqResult.success && prereqResult.data) prerequisites = prereqResult.data;
        }
        setState(prev => ({ ...prev, sport: sportResult.data ?? null, skill: skillResult.data ?? null, prerequisites, loading: false }));
        checkForQuizzes(skillId);
      } catch {
        setState(prev => ({ ...prev, error: 'An unexpected error occurred', loading: false }));
      }
    };
    const checkForQuizzes = async (sid: string) => {
      try {
        setState(prev => ({ ...prev, quizzesLoading: true }));
        const quizzesResult = await videoQuizService.getVideoQuizzesBySkill(sid, { where: [{ field: 'isPublished', operator: '==', value: true }] });
        const hasQuizzes = quizzesResult.success && (quizzesResult.data?.items?.length ?? 0) > 0;
        setState(prev => ({ ...prev, hasQuizzes, quizzesLoading: false }));
      } catch {
        setState(prev => ({ ...prev, hasQuizzes: false, quizzesLoading: false }));
      }
    };
    loadSkillData();
  }, [sportId, skillId]);

  const getDifficultyStyle = (difficulty: DifficultyLevel) => {
    if (difficulty === 'introduction') return { bg: 'rgba(34,197,94,0.12)', color: GREEN };
    if (difficulty === 'development') return { bg: 'rgba(251,191,36,0.12)', color: YELLOW };
    return { bg: 'rgba(248,113,113,0.12)', color: RED };
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const handleTakeQuiz = async () => {
    if (!skillId) return;
    try {
      const quizzesResult = await videoQuizService.getVideoQuizzesBySkill(skillId, { where: [{ field: 'isPublished', operator: '==', value: true }] });
      if (quizzesResult.success && quizzesResult.data?.items && quizzesResult.data.items.length > 0) {
        router.push(`/quiz/video/${quizzesResult.data.items[0].id}`);
      } else { alert('Video quiz not available yet. Please check back later!'); }
    } catch (error) {
      alert('Unable to load video quiz. Please try again later.');
      console.error('Error navigating to video quiz:', error);
    }
  };

  const handleMarkComplete = async () => {
    if (!user || !skillId) return;
    try {
      setIsMarkingComplete(true);
      const result = await ProgressService.recordLessonCompletion(user.id, skillId, sportId);
      if (result.success) { setIsMarkedComplete(true); toast.success('Lesson marked as complete!', { description: 'Your progress has been updated.' }); }
      else toast.error('Failed to mark lesson as complete');
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast.error('Failed to mark lesson as complete');
    } finally { setIsMarkingComplete(false); }
  };

  if (state.loading) return <div style={{ padding: '32px' }}><SkeletonContentPage /></div>;

  if (state.error || !state.skill || !state.sport) {
    return (
      <div style={{ maxWidth: '560px', margin: '40px auto', padding: '0 16px' }}>
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: RED, fontSize: '32px', marginBottom: '12px' }}>⚠️</p>
          <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>{state.error || 'Skill not found'}</h3>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              <ArrowLeft size={14} /> Go Back
            </button>
            <button onClick={() => window.location.reload()} style={{ padding: '9px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { sport, skill, prerequisites } = state;
  const diffStyle = getDifficultyStyle(skill.difficulty);

  return (
    <>
      <style>{`
        .sd-back:hover { color: ${BLUE} !important; background: rgba(55,181,255,0.08) !important; }
        .sd-btn:hover { background: rgba(55,181,255,0.12) !important; color: ${BLUE} !important; border-color: rgba(55,181,255,0.3) !important; }
        .sd-tab:hover { background: rgba(55,181,255,0.06) !important; }
        .sd-quiz:hover { opacity: 0.9 !important; transform: translateY(-1px) !important; }
        .sd-quiz, .sd-complete { transition: all 0.2s !important; }
        .sd-complete:hover:not(:disabled) { opacity: 0.9 !important; transform: translateY(-1px) !important; }
        .sd-prereq:hover { background: rgba(55,181,255,0.12) !important; }
        .sd-resource:hover { background: rgba(55,181,255,0.05) !important; }
        @keyframes sd-spin { to { transform: rotate(360deg); } }
        .sd-spinner { animation: sd-spin 0.8s linear infinite; border-radius: 50%; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; }
        .sd-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; }
        @media (min-width: 640px) { .sd-stats { grid-template-columns: repeat(4, 1fr); } }
      `}</style>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Breadcrumb + Back */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Link href="/pillars" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Pillars</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <Link href={`/pillars/${sportId}`} style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>{pillarDisplayName(sport.id, sport.name)}</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{skill.name}</span>
          </nav>
          <button onClick={() => router.back()} className="sd-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', background: 'transparent', border: 'none', fontSize: '13px', fontWeight: 600, borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', width: 'fit-content', transition: 'all 0.2s' }}>
            <ArrowLeft size={15} /> Back to {pillarDisplayName(sport.id, sport.name)}
          </button>
        </div>

        {/* Skill Hero */}
        <div style={{ position: 'relative', background: cardBg, border, borderRadius: '20px', padding: '24px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '24px' }}>{skill.name}</h1>
                <span style={{ background: diffStyle.bg, color: diffStyle.color, padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'capitalize' }}>{skill.difficulty}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.6 }}>{skill.description}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button className="sd-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                <Bookmark size={13} /> Save
              </button>
              <button className="sd-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                <Share2 size={13} /> Share
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="sd-stats">
            {[
              { icon: Clock, label: 'Est. Time', value: formatDuration(skill.estimatedTimeToComplete) },
              { icon: Target, label: 'Objectives', value: String(skill.learningObjectives.length) },
              { icon: Play, label: 'Content', value: [skill.hasVideo && 'Video', state.hasQuizzes && 'Quiz'].filter(Boolean).join(' + ') || 'Text' },
              { icon: Star, label: 'Rating', value: skill.metadata.averageRating > 0 ? skill.metadata.averageRating.toFixed(1) : 'New' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Icon size={14} color="rgba(255,255,255,0.3)" />
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600 }}>{label}</span>
                </div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', padding: '16px', display: 'flex', gap: '12px' }}>
            <AlertTriangle size={18} color={YELLOW} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ color: YELLOW, fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Prerequisites Required</p>
              <p style={{ color: 'rgba(251,191,36,0.6)', fontSize: '12px', marginBottom: '10px' }}>Complete these skills before starting this one for the best learning experience:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {prerequisites.map((prereq) => (
                  <Link key={prereq.id} href={`/pillars/${sportId}/skills/${prereq.id}`} className="sd-prereq"
                    style={{ background: 'rgba(251,191,36,0.12)', color: YELLOW, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s' }}>
                    {prereq.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ background: cardBg, border, borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
            {[
              { id: 'content', label: 'Content', icon: BookOpen },
              { id: 'objectives', label: 'Learning Objectives', icon: Target },
              { id: 'resources', label: 'Resources', icon: ExternalLink },
            ].map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button key={id} className={!active ? 'sd-tab' : ''} onClick={() => setActiveTab(id as typeof activeTab)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '14px 8px', background: active ? 'rgba(55,181,255,0.08)' : 'transparent', border: 'none', borderBottom: active ? `2px solid ${BLUE}` : '2px solid transparent', color: active ? BLUE : 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <Icon size={13} /><span>{label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* CONTENT TAB */}
            {activeTab === 'content' && (
              <>
                {/* Video */}
                {skill.hasVideo && skill.media?.videos && skill.media.videos.length > 0 && skill.media.videos.map((video) => (
                  <div key={video.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Play size={15} color={BLUE} />
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Video Content</span>
                    </div>
                    <div style={{ aspectRatio: '16/9' }}>
                      {video.url ? (
                        <video src={video.url} controls style={{ width: '100%', height: '100%' }} preload="metadata">
                          <source src={video.url} type="video/mp4" />
                        </video>
                      ) : video.youtubeId ? (
                        <iframe src={`https://www.youtube.com/embed/${video.youtubeId}`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                          <div style={{ textAlign: 'center' }}>
                            <Play size={40} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 8px' }} />
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Video unavailable</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Text Content */}
                {skill.content && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={15} color={BLUE} />
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Skill Guide</span>
                    </div>
                    <div style={{ padding: '16px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: skill.content }} />
                  </div>
                )}

                {/* Images */}
                {skill.media?.images && skill.media.images.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>Visual Guide</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {skill.media.images.map((image) => (
                        <div key={image.id}>
                          <img src={image.url} alt={image.alt} style={{ width: '100%', borderRadius: '8px' }} />
                          {image.caption && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '6px' }}>{image.caption}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quiz check */}
                {state.quizzesLoading ? (
                  <div style={{ background: 'rgba(55,181,255,0.04)', border: '1px solid rgba(55,181,255,0.12)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="sd-spinner" />
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Checking for quizzes...</p>
                  </div>
                ) : state.hasQuizzes ? (
                  <div style={{ background: `rgba(55,181,255,0.06)`, border: `1px solid rgba(55,181,255,0.2)`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `rgba(55,181,255,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle size={20} color={BLUE} />
                      </div>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Knowledge Check</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Test your understanding with an interactive quiz</p>
                      </div>
                    </div>
                    <button onClick={handleTakeQuiz} className="sd-quiz" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                      Take Quiz
                    </button>
                  </div>
                ) : null}

                {/* Coach-assigned custom content */}
                {!curriculumLoading && linkedCustomItems.length > 0 && (
                  <div style={{ background: `rgba(55,181,255,0.04)`, border: `1px solid rgba(55,181,255,0.15)`, borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Assigned For This Skill</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>Extra lesson and quiz content your coach linked to this skill.</p>
                    </div>
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {linkedCustomItems.map((item) => {
                        const isLesson = item.type === 'custom_lesson';
                        const isLocked = item.status === 'locked';
                        const isCompleted = item.status === 'completed';
                        const href = isLesson ? `/learn/lesson/${item.id}?pillarId=${sportId}&skillId=${skillId}` : `/quiz/video/${item.id}`;
                        return (
                          <div key={item.id} className="sd-resource" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.2s' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <p style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{item.title}</p>
                                {isCompleted && <span style={{ background: 'rgba(34,197,94,0.12)', color: GREEN, padding: '1px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>Completed</span>}
                              </div>
                              {item.description && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{item.description}</p>}
                            </div>
                            <Link href={href} style={{ pointerEvents: isLocked ? 'none' : 'auto', background: isLocked ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: isLocked ? 'rgba(255,255,255,0.3)' : '#000f28', padding: '8px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {isLesson ? (isCompleted ? 'Review Lesson' : 'Start Lesson') : 'Take Quiz'}
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mark Complete for custom workflow */}
                {isCustomWorkflow && !state.hasQuizzes && !state.quizzesLoading && !curriculumLoading && isInCurriculum && (
                  <div style={{ background: isMarkedComplete ? 'rgba(34,197,94,0.06)' : 'rgba(251,191,36,0.06)', border: `1px solid ${isMarkedComplete ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)'}`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isMarkedComplete ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle size={20} color={isMarkedComplete ? GREEN : YELLOW} />
                      </div>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>
                          {isMarkedComplete ? 'Lesson Completed!' : 'Finished this lesson?'}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                          {isMarkedComplete ? 'Your coach has been notified of your progress.' : "Mark this lesson as complete when you're done reviewing the content."}
                        </p>
                      </div>
                    </div>
                    {!isMarkedComplete && (
                      <button onClick={handleMarkComplete} disabled={isMarkingComplete} className="sd-complete"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', padding: '10px 18px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: isMarkingComplete ? 'not-allowed' : 'pointer', opacity: isMarkingComplete ? 0.7 : 1 }}>
                        {isMarkingComplete ? <><div className="sd-spinner" style={{ border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000f28' }} /> Saving...</> : <><CheckCircle size={15} /> Mark Complete</>}
                      </button>
                    )}
                  </div>
                )}

                {/* Curriculum loading check */}
                {isCustomWorkflow && !state.hasQuizzes && !state.quizzesLoading && curriculumLoading && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="sd-spinner" style={{ borderTopColor: 'rgba(255,255,255,0.6)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Checking your curriculum...</p>
                  </div>
                )}
              </>
            )}

            {/* OBJECTIVES TAB */}
            {activeTab === 'objectives' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Target size={16} color={BLUE} />
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Learning Objectives</p>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>By the end of this skill, you will be able to:</p>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {skill.learningObjectives.map((objective, index) => (
                    <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: 'rgba(55,181,255,0.04)', border: '1px solid rgba(55,181,255,0.08)', borderRadius: '10px' }}>
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: `rgba(55,181,255,0.15)`, border: `1px solid rgba(55,181,255,0.25)`, color: BLUE, fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{index + 1}</span>
                      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.6, paddingTop: '3px' }}>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* RESOURCES TAB */}
            {activeTab === 'resources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {skill.externalResources && skill.externalResources.length > 0 ? (
                  skill.externalResources.map((resource, index) => (
                    <div key={resource.id || `resource-${index}`} className="sd-resource" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', transition: 'background 0.2s' }}>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{resource.title}</p>
                        {resource.description && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '6px' }}>{resource.description}</p>}
                        <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{resource.type}</span>
                      </div>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="sd-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.2)', color: BLUE, textDecoration: 'none', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s' }}>
                        <ExternalLink size={13} /> View
                      </a>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <ExternalLink size={36} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>No external resources</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>All the learning material is included in the skill content above.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
