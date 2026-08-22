'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminRoute } from '@/components/auth/protected-route';
import { videoQuizService } from '@/lib/database/services/video-quiz.service';
import { VideoQuiz, VideoTagFilter, TagFacetCounts, matchesFilter, countTags } from '@/types';
import { PILLARS } from '@/types/onboarding';
import { VideoFilterPanel } from '@/components/video';
import {
  Plus, Search, MoreVertical, Edit, Trash2, Eye,
  Video, Clock, Target, Users, Share2,
} from 'lucide-react';
import { toast } from 'sonner';

const BLUE = '#37b5ff';
const RED = '#f87171';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

const DIFF_STYLES: Record<string, { bg: string; color: string }> = {
  introduction: { bg: 'rgba(251,191,36,0.12)', color: AMBER },
  development:  { bg: `rgba(55,181,255,0.12)`,  color: BLUE },
  refinement:   { bg: 'rgba(34,197,94,0.12)',   color: GREEN },
};

function AdminQuizzesPageContent() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<VideoQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<VideoTagFilter>({});
  const [tagFacets, setTagFacets] = useState<TagFacetCounts | undefined>();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => { loadQuizzes(); loadTagFacets(); }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const result = await videoQuizService.getVideoQuizzes({ limit: 100 });
      if (result.success && result.data) {
        setQuizzes(result.data.items);
      } else {
        toast.error('Failed to load video quizzes', { description: result.error?.message || 'Please try again' });
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
      toast.error('Failed to load video quizzes');
    } finally {
      setLoading(false);
    }
  };

  const loadTagFacets = async () => {
    try {
      const result = await videoQuizService.getTagFacets();
      if (result.success && result.data) setTagFacets(result.data);
    } catch (error) {
      console.error('Error loading tag facets:', error);
    }
  };

  const handleDelete = async (quizId: string, quizTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`)) return;
    try {
      const result = await videoQuizService.deleteVideoQuiz(quizId);
      if (result.success) { toast.success('Video quiz deleted successfully'); loadQuizzes(); }
      else toast.error('Failed to delete video quiz');
    } catch { toast.error('Failed to delete video quiz'); }
    setOpenMenuId(null);
  };

  const handleToggleStatus = async (quiz: VideoQuiz) => {
    try {
      const result = await videoQuizService.updateVideoQuiz(quiz.id, { isActive: !quiz.isActive });
      if (result.success) { toast.success(`Video quiz ${quiz.isActive ? 'deactivated' : 'activated'} successfully`); loadQuizzes(); }
      else toast.error('Failed to update video quiz status');
    } catch { toast.error('Failed to update video quiz status'); }
    setOpenMenuId(null);
  };

  const handleShareQuiz = async (quizId: string, quizTitle: string) => {
    try {
      await navigator.clipboard.writeText(`https://sports-goalie.vercel.app/quiz/video/${quizId}`);
      toast.success('Quiz link copied to clipboard!', { description: `Link for "${quizTitle}" is ready to share` });
    } catch { toast.error('Failed to copy quiz link'); }
    setOpenMenuId(null);
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = searchQuery === '' || quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) || quiz.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty === difficultyFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && quiz.isActive && quiz.isPublished) || (statusFilter === 'inactive' && !quiz.isActive) || (statusFilter === 'draft' && !quiz.isPublished);
    const matchesTags = quiz.structuredTags ? matchesFilter(quiz.structuredTags, tagFilter) : Object.keys(tagFilter).every(key => !tagFilter[key as keyof VideoTagFilter]?.length);
    return matchesSearch && matchesDifficulty && matchesStatus && matchesTags;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalCompletions = quizzes.reduce((sum, q) => sum + (q.metadata?.totalCompletions || 0), 0);
  const activeCount = quizzes.filter(q => q.isActive && q.isPublished).length;
  const avgDuration = Math.round(quizzes.reduce((sum, q) => sum + q.videoDuration, 0) / (quizzes.length || 1) / 60);

  return (
    <>
      <style>{`
        .aq-inp { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 10px !important; padding: 10px 12px 10px 38px !important; width: 100% !important; font-size: 13px !important; outline: none !important; }
        .aq-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
        .aq-inp::placeholder { color: rgba(255,255,255,0.25) !important; }
        .aq-sel { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: rgba(255,255,255,0.7) !important; border-radius: 10px !important; padding: 10px 12px !important; font-size: 13px !important; outline: none !important; cursor: pointer !important; }
        .aq-sel:focus { border-color: rgba(55,181,255,0.45) !important; }
        .aq-card { transition: all 0.2s !important; }
        .aq-card:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 32px rgba(0,0,0,0.3) !important; }
        .aq-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border-radius: 7px; border: none; background: transparent; color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; text-align: left; }
        .aq-menu-item:hover { background: rgba(55,181,255,0.1) !important; color: #fff !important; }
        .aq-menu-danger:hover { background: rgba(248,113,113,0.1) !important; color: ${RED} !important; }
        @media (max-width: 900px) { .aq-grid { grid-template-columns: repeat(2, 1fr) !important; } .aq-stats { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 600px) { .aq-grid { grid-template-columns: 1fr !important; } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>Video Quizzes</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Manage interactive video-based quizzes</p>
          </div>
          <button onClick={() => router.push('/admin/quizzes/create')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, color: '#fff', padding: '11px 20px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
            <Plus size={16} /> Create Video Quiz
          </button>
        </div>

        {/* Stat Cards */}
        <div className="aq-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Quizzes', value: quizzes.length, icon: Video, color: BLUE },
            { label: 'Active', value: activeCount, icon: Target, color: RED },
            { label: 'Total Completions', value: totalCompletions, icon: Users, color: GREEN },
            { label: 'Avg. Duration', value: `${avgDuration}m`, icon: Clock, color: AMBER },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ position: 'relative', ...card, padding: '16px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600 }}>{label}</p>
                <Icon size={14} color={`${color}88`} />
              </div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '26px', lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ ...card, padding: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input className="aq-inp" placeholder="Search quizzes…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <select className="aq-sel" value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)} style={{ minWidth: '160px' }}>
            <option value="all">All Difficulties</option>
            <option value="introduction">Introduction</option>
            <option value="development">Development</option>
            <option value="refinement">Refinement</option>
          </select>
          <select className="aq-sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: '140px' }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Tag Filters */}
        <VideoFilterPanel filter={tagFilter} onFilterChange={setTagFilter} facets={tagFacets} loading={loading} defaultCollapsed={true} theme="dark" />

        {/* Quiz Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ width: '32px', height: '32px', border: `3px solid rgba(55,181,255,0.2)`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '15px' }}>Loading quizzes…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
            <Video size={44} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>No video quizzes found</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '15px', marginBottom: '16px' }}>
              {searchQuery || difficultyFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating your first video quiz'}
            </p>
            {!searchQuery && difficultyFilter === 'all' && statusFilter === 'all' && (
              <button onClick={() => router.push('/admin/quizzes/create')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, color: '#fff', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                <Plus size={14} /> Create Video Quiz
              </button>
            )}
          </div>
        ) : (
          <div className="aq-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {filteredQuizzes.map(quiz => {
              const ds = DIFF_STYLES[quiz.difficulty] || DIFF_STYLES.introduction;
              const statusLabel = quiz.isActive && quiz.isPublished ? 'Active' : !quiz.isPublished ? 'Draft' : 'Inactive';
              const statusColor = quiz.isActive && quiz.isPublished ? GREEN : !quiz.isPublished ? AMBER : RED;
              const isMenuOpen = openMenuId === quiz.id;
              return (
                <div key={quiz.id} className="aq-card" style={{ position: 'relative', ...card, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${ds.color}66, transparent)` }} />
                  <div style={{ padding: '16px 16px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '8px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{quiz.title}</p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ background: ds.bg, color: ds.color, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'capitalize' }}>{quiz.difficulty}</span>
                          <span style={{ background: `${statusColor}1a`, color: statusColor, padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>{statusLabel}</span>
                          {quiz.structuredTags && countTags(quiz.structuredTags) > 0 && (
                            <span style={{ background: 'rgba(55,181,255,0.08)', color: BLUE, border: '1px solid rgba(55,181,255,0.15)', padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                              {countTags(quiz.structuredTags)} tags
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button onClick={() => setOpenMenuId(isMenuOpen ? null : quiz.id)}
                          style={{ padding: '6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <MoreVertical size={15} />
                        </button>
                        {isMenuOpen && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'rgba(2,18,44,0.98)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', padding: '4px', zIndex: 50, minWidth: '160px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                            <button className="aq-menu-item" onClick={() => { router.push(`/quiz/video/${quiz.id}`); setOpenMenuId(null); }}><Eye size={12} /> Preview</button>
                            <button className="aq-menu-item" onClick={() => handleShareQuiz(quiz.id, quiz.title)}><Share2 size={12} /> Share</button>
                            <button className="aq-menu-item" onClick={() => { router.push(`/admin/quizzes/${quiz.id}/edit`); setOpenMenuId(null); }}><Edit size={12} /> Edit</button>
                            <button className="aq-menu-item" onClick={() => handleToggleStatus(quiz)}><Target size={12} /> {quiz.isActive ? 'Deactivate' : 'Activate'}</button>
                            <button className="aq-menu-item aq-menu-danger" onClick={() => handleDelete(quiz.id, quiz.title)}><Trash2 size={12} /> Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                    {quiz.description && (
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', lineHeight: 1.5, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{quiz.description}</p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      {[
                        { icon: Video, label: formatDuration(quiz.videoDuration) },
                        { icon: Target, label: `${quiz.questions.length} questions` },
                        { icon: Users, label: `${quiz.metadata?.totalCompletions || 0} completions` },
                        { icon: Clock, label: `${quiz.metadata?.averageScore?.toFixed(0) || 0}% avg` },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
                          <Icon size={12} color="rgba(255,255,255,0.25)" /> {label}
                        </div>
                      ))}
                    </div>
                    {quiz.structuredTags && (quiz.structuredTags.pillar || quiz.structuredTags.systems.length > 0) && (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {quiz.structuredTags.pillar && (
                          <span style={{ background: 'rgba(55,181,255,0.08)', color: 'rgba(55,181,255,0.7)', border: '1px solid rgba(55,181,255,0.15)', padding: '1px 7px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                            {PILLARS.find(p => p.slug === quiz.structuredTags!.pillar)?.shortName || quiz.structuredTags.pillar}
                          </span>
                        )}
                        {quiz.structuredTags.systems.slice(0, 2).map(system => (
                          <span key={system} style={{ background: 'rgba(248,113,113,0.08)', color: 'rgba(248,113,113,0.7)', border: '1px solid rgba(248,113,113,0.15)', padding: '1px 7px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{system}</span>
                        ))}
                        {quiz.structuredTags.systems.length > 2 && (
                          <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', padding: '1px 7px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>+{quiz.structuredTags.systems.length - 2}</span>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => router.push(`/admin/quizzes/${quiz.id}/edit`)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)', color: RED, fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <Edit size={12} /> Edit
                      </button>
                      <button onClick={() => router.push(`/quiz/video/${quiz.id}`)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', borderRadius: '8px', border: 'none', background: BLUE, color: '#000f28', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s' }}>
                        <Eye size={12} /> Preview
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminQuizzesPage() {
  return <AdminRoute><AdminQuizzesPageContent /></AdminRoute>;
}
