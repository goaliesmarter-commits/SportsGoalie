'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  BookOpen,
  PlayCircle,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Users,
  Clock,
  Calendar,
  FolderOpen,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { customContentService } from '@/lib/database';
import { CustomContentLibrary } from '@/types';
import { toast } from 'sonner';
import { ContentTypeSelector, ContentType } from '@/components/coach/content-type-selector';
import { LessonCreator } from '@/components/coach/lesson-creator';
import { SkeletonDarkPage } from '@/components/ui/skeletons';

const GOLD  = '#D4A93B';
const BLUE  = '#37b5ff';
const card  = { background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(212,169,59,0.18)', borderRadius: '16px' };

export default function CoachContentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [content, setContent] = useState<CustomContentLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentFilter, setContentFilter] = useState<'all' | 'lesson' | 'quiz'>('all');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showLessonCreator, setShowLessonCreator] = useState(false);
  const [editingContent, setEditingContent] = useState<CustomContentLibrary | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomContentLibrary | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => { if (user?.id) loadContent(); }, [user?.id]);

  const loadContent = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const result = await customContentService.getCoachContent(user.id);
      if (result.success && result.data) setContent(result.data);
      else toast.error('Failed to load content library');
    } catch { toast.error('Failed to load content library'); }
    finally { setLoading(false); }
  };

  const handleTypeSelect = (type: ContentType) => {
    if (type === 'lesson') setShowLessonCreator(true);
    else router.push('/coach/content/quiz/create');
  };

  const handleContentSaved = (newContent: CustomContentLibrary) => {
    if (editingContent) {
      setContent(prev => prev.map(c => c.id === newContent.id ? newContent : c));
      setEditingContent(null);
    } else {
      setContent(prev => [newContent, ...prev]);
    }
  };

  const handleEdit = (item: CustomContentLibrary) => {
    if (item.type === 'lesson') { setEditingContent(item); setShowLessonCreator(true); }
    else router.push(`/coach/content/quiz/${item.id}/edit`);
    setOpenMenuId(null);
  };

  const handleDuplicate = async (item: CustomContentLibrary) => {
    if (!user?.id) return;
    setOpenMenuId(null);
    try {
      const result = await customContentService.cloneContent(item.id, user.id);
      if (result.success && result.data) { setContent(prev => [result.data!, ...prev]); toast.success('Content duplicated successfully'); }
      else toast.error('Failed to duplicate content');
    } catch { toast.error('Failed to duplicate content'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !user?.id) return;
    try {
      const result = await customContentService.deleteContent(deleteConfirm.id, user.id);
      if (result.success) { setContent(prev => prev.filter(c => c.id !== deleteConfirm.id)); toast.success('Content deleted successfully'); }
      else toast.error('Failed to delete content');
    } catch { toast.error('Failed to delete content'); }
    finally { setDeleteConfirm(null); }
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return '';
    const date = (timestamp as { toDate?: () => Date }).toDate ? (timestamp as { toDate: () => Date }).toDate() : new Date(timestamp as string);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredContent = content.filter(item => {
    if (contentFilter !== 'all' && item.type !== contentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || (item.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const lessonCount = content.filter(c => c.type === 'lesson').length;
  const quizCount = content.filter(c => c.type === 'quiz').length;

  if (loading) return <SkeletonDarkPage />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        .content-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
        @media (min-width: 640px)  { .content-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
        @media (min-width: 1024px) { .content-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr); } }
        .content-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 480px) { .content-stats { grid-template-columns: 1fr; } }
        .content-header { padding: 20px 20px; }
        @media (min-width: 640px) { .content-header { padding: 28px 32px; } }
        .content-filters { flex-wrap: wrap; }
        .filter-group { flex-wrap: wrap; }
        @media (max-width: 480px) { .filter-group button { flex: 1; } }
      `}</style>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(14px,3vw,24px) 56px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div className="content-header" style={{ position: 'relative', borderRadius: '16px', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 50%, #0d1f40 100%)', border: '1px solid rgba(55,181,255,0.18)', boxShadow: '0 4px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(55,181,255,0.08)', filter: 'blur(70px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: GOLD, marginBottom: '6px' }}>Library</p>
              <h1 style={{ fontSize: 'clamp(20px,3vw,30px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>Content Library</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Create and manage your custom lessons and knowledge checks</p>
            </div>
            <button
              onClick={() => setShowTypeSelector(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', background: `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)`, border: 'none', borderRadius: '12px', color: '#0c0800', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 16px rgba(212,169,59,0.3)`, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            >
              <Plus size={15} /> Create Content
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="content-stats">
          {[
            { label: 'Total Content', value: content.length, color: GOLD,      icon: <FolderOpen size={16} color={GOLD} /> },
            { label: 'Lessons',       value: lessonCount,    color: '#4ade80',  icon: <BookOpen   size={16} color="#4ade80" /> },
            { label: 'Knowledge Checks', value: quizCount,   color: '#a78bfa',  icon: <PlayCircle size={16} color="#a78bfa" /> },
          ].map(s => (
            <div key={s.label} style={{ position: 'relative', background: `linear-gradient(135deg,${s.color}14 0%,rgba(2,18,44,0.85) 100%)`, border: `1px solid ${s.color}28`, borderRadius: '14px', padding: '16px 18px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${s.color}99, transparent)` }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${s.color}1a`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              </div>
              <p style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="content-filters" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
            <Search size={14} color="rgba(255,255,255,0.35)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              placeholder="Search content..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 36px', background: 'rgba(2,18,44,0.82)', border: `1px solid rgba(212,169,59,0.2)`, borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div className="filter-group" style={{ display: 'flex', gap: '4px', background: 'rgba(2,18,44,0.8)', border: `1px solid rgba(212,169,59,0.16)`, borderRadius: '10px', padding: '4px', flexShrink: 0 }}>
            {(['all', 'lesson', 'quiz'] as const).map(f => (
              <button
                key={f}
                onClick={() => setContentFilter(f)}
                style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', background: contentFilter === f ? GOLD : 'transparent', color: contentFilter === f ? '#0c0800' : 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}
              >{f === 'all' ? 'All' : f === 'lesson' ? 'Lessons' : 'Knowledge Checks'}</button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        {filteredContent.length === 0 ? (
          <div style={{ ...card, padding: '64px 24px', textAlign: 'center' }}>
            <FolderOpen size={56} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 16px' }} />
            {content.length === 0 ? (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>No Content Yet</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', maxWidth: '360px', margin: '0 auto 20px' }}>Start creating custom lessons and knowledge checks for your goalies. Your content will appear here.</p>
                <button
                  onClick={() => setShowTypeSelector(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)`, border: 'none', borderRadius: '10px', color: '#0c0800', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                >
                  <Plus size={14} /> Create Your First Content
                </button>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>No Matching Content</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>No content matches your search criteria. Try adjusting your filters.</p>
              </>
            )}
          </div>
        ) : (
          <div className="content-grid">
            {filteredContent.map(item => {
              const isLesson = item.type === 'lesson';
              const typeColor = isLesson ? BLUE : '#a78bfa';
              return (
                <div key={item.id} style={{ ...card, padding: '18px 20px', position: 'relative', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,169,59,0.38)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,169,59,0.16)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                >
                  {/* Top border accent */}
                  <div style={{ position: 'absolute', top: 0, left: '20px', right: '20px', height: '2px', background: `linear-gradient(90deg, transparent, ${typeColor}, transparent)`, borderRadius: '2px' }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${typeColor}18`, border: `1px solid ${typeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isLesson ? <BookOpen size={17} color={typeColor} /> : <PlayCircle size={17} color={typeColor} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h3>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30`, borderRadius: '20px', padding: '2px 8px', display: 'inline-block', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {isLesson ? 'Lesson' : 'Knowledge Check'}
                        </span>
                      </div>
                    </div>

                    {/* Kebab menu */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(55,181,255,0.15)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openMenuId === item.id && (
                        <div style={{ position: 'absolute', right: 0, top: '36px', background: 'rgba(2,18,44,0.98)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '12px', padding: '6px', zIndex: 50, minWidth: '140px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                          onMouseLeave={() => setOpenMenuId(null)}>
                          {[
                            { label: 'Edit', icon: <Edit size={13} />, action: () => handleEdit(item), color: '#fff' },
                            { label: 'Duplicate', icon: <Copy size={13} />, action: () => handleDuplicate(item), color: '#fff' },
                            { label: 'Delete', icon: <Trash2 size={13} />, action: () => { setDeleteConfirm(item); setOpenMenuId(null); }, color: '#f87171' },
                          ].map((m, i) => (
                            <button
                              key={m.label}
                              onClick={m.action}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', borderRadius: '8px', color: m.color, fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginTop: i === 2 ? '4px' : 0, borderTop: i === 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(55,181,255,0.08)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                            >
                              {m.icon}{m.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '12px' }}>{item.description}</p>

                  {/* Tags */}
                  {(item.tags || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {(item.tags || []).slice(0, 3).map((tag, i) => (
                        <span key={i} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px 8px' }}>{tag}</span>
                      ))}
                      {(item.tags || []).length > 3 && (
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2px 8px' }}>+{item.tags!.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={10} />{item.usageCount || 0} uses</span>
                    {item.estimatedTimeMinutes && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} />{item.estimatedTimeMinutes} min</span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={10} />{formatDate(item.createdAt)}</span>
                    {item.isPublic && <span style={{ color: '#4ade80', fontWeight: 700 }}>Public</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <ContentTypeSelector open={showTypeSelector} onOpenChange={setShowTypeSelector} onSelect={handleTypeSelect} />
      {user?.id && (
        <LessonCreator
          open={showLessonCreator}
          onOpenChange={open => { setShowLessonCreator(open); if (!open) setEditingContent(null); }}
          coachId={user.id}
          onSave={handleContentSaved}
          editContent={editingContent?.type === 'lesson' ? editingContent : undefined}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '20px', padding: '0', maxWidth: '480px', width: '100%', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: GOLD }}>Content Library</p>
                <button onClick={() => setDeleteConfirm(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', marginBottom: '10px' }}>Delete Content</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Are you sure you want to delete &quot;{deleteConfirm.title}&quot;? This action cannot be undone.
              </p>
              {(deleteConfirm.usageCount || 0) > 0 && (
                <p style={{ fontSize: '12px', color: '#fbbf24', marginTop: '8px', fontWeight: 600 }}>
                  Warning: This content has been assigned to {deleteConfirm.usageCount} student(s). Deleting it may affect their curriculum.
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', padding: '16px 28px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '10px 20px', background: '#dc2626', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
