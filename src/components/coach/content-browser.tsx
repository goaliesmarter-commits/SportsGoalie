'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen, PlayCircle, Search, Loader2, ChevronRight,
  Clock, Check, FolderOpen, User, X, Video,
} from 'lucide-react';
import { sportsService, videoQuizService, customContentService } from '@/lib/database';
import { useAuth } from '@/lib/auth/context';
import { Sport, Skill, VideoQuiz, CustomContentLibrary } from '@/types';
import { pillarFromSportId, pillarOptionLabel } from '@/types/onboarding';
import { pillarDisplayName } from '@/lib/utils/pillars';
import { toast } from 'sonner';

const GOLD   = '#D4A93B';
const BLUE   = '#37b5ff';
const PURPLE = '#a78bfa';

interface ContentItem {
  id: string;
  type: 'lesson' | 'quiz' | 'custom_lesson' | 'custom_quiz';
  title: string;
  description: string;
  sportId: string;
  sportName: string;
  difficulty: string;
  estimatedTime: number;
  hasVideo?: boolean;
  icon?: string;
  color?: string;
  isCustom?: boolean;
}

interface ContentBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (content: ContentItem) => void;
  selectedSportId?: string;
  coachId?: string;
  preSelectedSportId?: string;
  /** Pre-select the difficulty filter — pass student's pacingLevel so the browser defaults to matching content */
  preSelectedDifficulty?: string;
}

export function ContentBrowser({ open, onOpenChange, onSelect, selectedSportId, coachId, preSelectedSportId, preSelectedDifficulty }: ContentBrowserProps) {
  const { user } = useAuth();
  const effectiveCoachId = coachId || user?.id;

  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [quizzes, setQuizzes] = useState<VideoQuiz[]>([]);
  const [customContent, setCustomContent] = useState<CustomContentLibrary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState(selectedSportId || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState(preSelectedDifficulty || 'all');
  const [contentSource, setContentSource] = useState<'library' | 'custom'>('library');
  const [contentType, setContentType] = useState<'lesson' | 'quiz'>('lesson');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (open && preSelectedSportId) setSelectedSport(preSelectedSportId);
    if (open && preSelectedDifficulty) setSelectedDifficulty(preSelectedDifficulty);
  }, [open, preSelectedSportId, preSelectedDifficulty]);

  useEffect(() => {
    if (open) {
      loadSports();
      if (effectiveCoachId) loadCustomContent();
    }
  }, [open, effectiveCoachId]);

  useEffect(() => {
    if (selectedSport && contentSource === 'library') loadContent();
  }, [selectedSport, contentType, contentSource]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const loadSports = async () => {
    try {
      setLoading(true);
      const result = await sportsService.getAllSports();
      if (result.success && result.data) {
        const active = result.data.items.filter(s => s.isActive);
        setSports(active);
        if (!selectedSport && active.length > 0) setSelectedSport(active[0].id);
      } else toast.error('Failed to load sports');
    } catch { toast.error('Failed to load sports'); }
    finally { setLoading(false); }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      if (contentType === 'lesson') {
        const result = await sportsService.getSkillsBySport(selectedSport);
        if (result.success && result.data) setSkills(result.data.items.filter(s => s.isActive));
        else toast.error('Failed to load lessons');
      } else {
        const result = await videoQuizService.getQuizzesBySport(selectedSport);
        if (result.success && result.data) setQuizzes(result.data.items.filter(q => q.isActive));
        else toast.error('Failed to load quizzes');
      }
    } catch { toast.error('Failed to load content'); }
    finally { setLoading(false); }
  };

  const loadCustomContent = async () => {
    if (!effectiveCoachId) return;
    try {
      const result = await customContentService.getCoachContent(effectiveCoachId);
      if (result.success && result.data) setCustomContent(result.data);
    } catch { /* silent */ }
  };

  const getFilteredContent = (): ContentItem[] => {
    if (contentSource === 'custom') {
      let items = customContent
        .filter(item => contentType === 'lesson' ? item.type === 'lesson' : item.type === 'quiz')
        .map(item => ({
          id: item.id,
          type: (item.type === 'lesson' ? 'custom_lesson' : 'custom_quiz') as ContentItem['type'],
          title: item.title,
          description: item.description,
          sportId: item.pillarId || 'custom',
          sportName: 'My Content',
          difficulty: 'custom',
          estimatedTime: item.estimatedTimeMinutes || 15,
          hasVideo: !!item.videoUrl,
          color: GOLD,
          isCustom: true,
        }));
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
      }
      return items;
    }

    const sport = sports.find(s => s.id === selectedSport);
    if (!sport) return [];

    let items: ContentItem[] = contentType === 'lesson'
      ? skills.map(skill => ({ id: skill.id, type: 'lesson' as const, title: skill.name, description: skill.description, sportId: sport.id, sportName: pillarDisplayName(sport.id, sport.name), difficulty: skill.difficulty, estimatedTime: skill.estimatedTimeToComplete, hasVideo: skill.hasVideo, icon: sport.icon, color: sport.color }))
      : quizzes.map(quiz => ({ id: quiz.id, type: 'quiz' as const, title: quiz.title, description: quiz.description || '', sportId: sport.id, sportName: pillarDisplayName(sport.id, sport.name), difficulty: quiz.difficulty, estimatedTime: quiz.estimatedDuration || 30, icon: sport.icon, color: sport.color }));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    if (selectedDifficulty !== 'all') items = items.filter(i => i.difficulty === selectedDifficulty);
    return items;
  };

  const handleAdd = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      onOpenChange(false);
      setSelectedItem(null);
      setSearchQuery('');
    }
  };

  if (!open) return null;

  const filteredContent = getFilteredContent();
  const customLessonCount = customContent.filter(c => c.type === 'lesson').length;
  const customQuizCount = customContent.filter(c => c.type === 'quiz').length;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(4,33,63,0.7)',
    border: `1px solid rgba(212,169,59,0.22)`,
    borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  };
  const selectStyle: React.CSSProperties = {
    padding: '10px 14px',
    background: 'rgba(4,33,63,0.9)',
    border: `1px solid rgba(212,169,59,0.22)`,
    borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none',
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <style>{`
        @keyframes cb-spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        .cb-tab-active  { background: rgba(212,169,59,0.15) !important; border-color: rgba(212,169,59,0.45) !important; color: ${GOLD} !important; }
        .cb-type-active { background: rgba(212,169,59,0.12) !important; border-color: rgba(212,169,59,0.35) !important; color: ${GOLD} !important; }
        .cb-item:hover  { background: rgba(212,169,59,0.05) !important; border-color: rgba(212,169,59,0.22) !important; }
        .cb-item-sel    { background: rgba(212,169,59,0.1) !important; border-color: rgba(212,169,59,0.4) !important; }
        .cb-input:focus { border-color: ${GOLD} !important; box-shadow: 0 0 0 3px rgba(212,169,59,0.1) !important; }
        .cb-input::placeholder { color: rgba(255,255,255,0.22); }
        .cb-select option { background: #020e24; color: #fff; }
        .cb-add:hover:not(:disabled) { opacity:0.88 !important; transform:translateY(-1px) !important; }
        .cb-add:disabled { opacity:0.35 !important; cursor:not-allowed !important; }
        .cb-cancel:hover { background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.22) !important; }
        .cb-scroll::-webkit-scrollbar { width: 5px; }
        .cb-scroll::-webkit-scrollbar-track { background: transparent; }
        .cb-scroll::-webkit-scrollbar-thumb { background: rgba(212,169,59,0.2); border-radius: 4px; }
      `}</style>

      <div style={{
        background: 'linear-gradient(145deg, #030e22 0%, #04213f 100%)',
        border: `1px solid rgba(212,169,59,0.25)`,
        borderRadius: '20px',
        width: '100%',
        maxWidth: '980px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: `0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(212,169,59,0.08)`,
      }}>

        {/* Header */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 60%, #0d1f40 100%)', padding: '24px 32px', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-30px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(212,169,59,0.1)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${GOLD}, ${BLUE}55, transparent)` }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: GOLD, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '7px' }}>Curriculum</p>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '5px' }}>Add Content to Curriculum</h2>
              <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '13px' }}>Browse and select lessons or knowledge checks to add to the goalie&apos;s development path</p>
            </div>
            <button onClick={() => onOpenChange(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '7px', borderRadius: '9px', display: 'flex', transition: 'all 0.2s' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="cb-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Source tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(4,33,63,0.6)', border: `1px solid rgba(212,169,59,0.14)`, borderRadius: '12px', padding: '4px' }}>
            {([
              { key: 'library' as const, icon: <FolderOpen size={14} />, label: 'Content Library' },
              { key: 'custom'  as const, icon: <User size={14} />,       label: `My Content${customContent.length > 0 ? ` (${customContent.length})` : ''}` },
            ]).map(tab => (
              <button key={tab.key} onClick={() => { setContentSource(tab.key); setSelectedItem(null); }}
                className={contentSource === tab.key ? 'cb-tab-active' : ''}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 16px', borderRadius: '9px', border: '1px solid transparent', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Sport selector */}
          {contentSource === 'library' && (
            <div>
              <label style={{ display: 'block', color: GOLD, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Sport / Pillar</label>
              <select value={selectedSport} onChange={e => setSelectedSport(e.target.value)} className="cb-select" style={{ ...selectStyle, width: '100%' }}>
                {/* Name the pillar from code, not from the row — the doc ID is the
                    identity, and the stored `name` is whatever the database holds
                    that day. No `s.icon` prefix: an <option> renders text only, and
                    the icon field stores a Lucide component name ("Brain",
                    "Footprints"), so including it printed the icon's NAME in front
                    of every row. */}
                {sports.map(s => {
                  const pillar = pillarFromSportId(s.id);
                  return (
                    <option key={s.id} value={s.id}>
                      {pillar ? pillarOptionLabel(pillar) : s.name} ({s.skillsCount} skills)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Type tabs + filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(4,33,63,0.6)', border: `1px solid rgba(212,169,59,0.12)`, borderRadius: '10px', padding: '4px' }}>
              {([
                { key: 'lesson' as const, icon: <BookOpen size={13} />,    label: `Lessons${contentSource === 'custom' && customLessonCount > 0 ? ` (${customLessonCount})` : ''}` },
                { key: 'quiz'   as const, icon: <PlayCircle size={13} />, label: `Knowledge Checks${contentSource === 'custom' && customQuizCount > 0 ? ` (${customQuizCount})` : ''}` },
              ]).map(tab => (
                <button key={tab.key} onClick={() => { setContentType(tab.key); setSelectedItem(null); }}
                  className={contentType === tab.key ? 'cb-type-active' : ''}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 14px', borderRadius: '7px', border: '1px solid transparent', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input placeholder="Search content…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="cb-input" style={{ ...inputStyle, paddingLeft: '38px' }} />
              </div>
              {contentSource === 'library' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)} className="cb-select" style={{ ...selectStyle, minWidth: '160px' }}>
                    <option value="all">All Levels</option>
                    <option value="introduction">Introduction</option>
                    <option value="development">Development</option>
                    <option value="refinement">Refinement</option>
                  </select>
                  {preSelectedDifficulty && selectedDifficulty === preSelectedDifficulty && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: GOLD, background: 'rgba(212,169,59,0.12)', border: '1px solid rgba(212,169,59,0.3)', borderRadius: '20px', padding: '3px 9px', whiteSpace: 'nowrap' }}>
                      Student&apos;s Level
                    </span>
                  )}
                  {preSelectedDifficulty && selectedDifficulty !== preSelectedDifficulty && selectedDifficulty !== 'all' && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '20px', padding: '3px 9px', whiteSpace: 'nowrap' }}>
                      ⚠ Level mismatch
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content list — taller now */}
          <div className="cb-scroll" style={{ background: 'rgba(4,33,63,0.5)', border: `1px solid rgba(212,169,59,0.14)`, borderRadius: '14px', overflow: 'hidden', minHeight: '320px', maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '72px', gap: '10px' }}>
                <Loader2 size={22} color={GOLD} style={{ animation: 'cb-spin 1s linear infinite' }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Loading…</p>
              </div>
            ) : filteredContent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                {contentSource === 'custom'
                  ? <User size={40} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 14px' }} />
                  : <BookOpen size={40} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 14px' }} />}
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '14px', marginBottom: '4px' }}>
                  {searchQuery ? 'No content matches your search' : contentSource === 'custom' ? `No custom ${contentType === 'lesson' ? 'lessons' : 'knowledge checks'} created yet` : `No ${contentType === 'lesson' ? 'lessons' : 'knowledge checks'} for this pillar`}
                </p>
                {contentSource === 'custom' && !searchQuery && <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '12px' }}>Create content from the Content Library page</p>}
              </div>
            ) : (
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredContent.map(item => {
                  const isLesson = item.type === 'lesson' || item.type === 'custom_lesson';
                  const accent   = item.color || (isLesson ? BLUE : PURPLE);
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <button key={item.id} onClick={() => setSelectedItem(item)}
                      className={isSelected ? 'cb-item cb-item-sel' : 'cb-item'}
                      style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '10px', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: `${accent}18`, border: `1px solid ${accent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isLesson ? <BookOpen size={19} color={accent} /> : <PlayCircle size={19} color={accent} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                          {item.isCustom && <span style={{ fontSize: '9px', fontWeight: 700, color: GOLD, background: 'rgba(212,169,59,0.12)', border: `1px solid rgba(212,169,59,0.28)`, borderRadius: '20px', padding: '1px 7px', flexShrink: 0 }}>Custom</span>}
                          {isSelected && <Check size={14} color={GOLD} style={{ flexShrink: 0 }} />}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>{item.description}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                          {!item.isCustom && <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '1px 7px', textTransform: 'capitalize' }}>{item.difficulty}</span>}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> {item.estimatedTime}m</span>
                          {item.hasVideo && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: BLUE }}><Video size={10} /> Video</span>}
                        </div>
                      </div>
                      <ChevronRight size={14} color={isSelected ? GOLD : 'rgba(255,255,255,0.18)'} style={{ flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected item preview */}
          {selectedItem && (
            <div style={{ background: 'rgba(212,169,59,0.08)', border: `1px solid rgba(212,169,59,0.3)`, borderRadius: '14px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `rgba(212,169,59,0.14)`, border: `1px solid rgba(212,169,59,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selectedItem.type === 'lesson' || selectedItem.type === 'custom_lesson'
                  ? <BookOpen size={20} color={GOLD} />
                  : <PlayCircle size={20} color={GOLD} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{selectedItem.title}</p>
                  {selectedItem.isCustom && <span style={{ fontSize: '9px', fontWeight: 700, color: GOLD, background: 'rgba(212,169,59,0.12)', border: `1px solid rgba(212,169,59,0.28)`, borderRadius: '20px', padding: '1px 7px' }}>Custom</span>}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
                  {selectedItem.sportName} · {selectedItem.isCustom ? 'Custom Content' : selectedItem.difficulty} · {selectedItem.estimatedTime} min
                </p>
              </div>
              <Check size={18} color={GOLD} style={{ flexShrink: 0 }} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 32px', borderTop: `1px solid rgba(212,169,59,0.14)`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexShrink: 0, background: 'rgba(3,14,34,0.7)' }}>
          <button onClick={() => onOpenChange(false)} className="cb-cancel"
            style={{ padding: '11px 22px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!selectedItem} className="cb-add"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 26px', background: selectedItem ? `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)` : 'rgba(212,169,59,0.15)', border: 'none', borderRadius: '10px', color: selectedItem ? '#0c0800' : 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: selectedItem ? `0 4px 16px rgba(212,169,59,0.35)` : 'none' }}>
            <Check size={15} /> Add to Curriculum
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
