'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, X, Loader2, Save, ArrowRight, Clock, Target, Tag, Paperclip, Upload } from 'lucide-react';
import { VideoUploader } from './video-uploader';
import { customContentService, sportsService } from '@/lib/database';
import { toast } from 'sonner';
import { CustomContentLibrary, Sport, Skill } from '@/types';

const GOLD = '#D4A93B';
const BLUE = '#37b5ff';

interface StudentGapInfo {
  categoryName: string;
  categorySlug: string;
  priority: 'high' | 'medium' | 'low';
  suggestedContent: string[];
}

interface LessonCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  onSave: (content: CustomContentLibrary) => void;
  editContent?: CustomContentLibrary;
  studentGaps?: StudentGapInfo[];
}

// ── Shared input styles ──────────────────────────────────────────────────────
const inputS: React.CSSProperties = { width: '100%', padding: '10px 13px', background: 'rgba(4,33,63,0.7)', border: '1px solid rgba(212,169,59,0.22)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'text' };
const labelS: React.CSSProperties = { display: 'block', color: GOLD, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '7px' };
const sectionCard: React.CSSProperties = { background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.16)', borderTop: `2px solid ${GOLD}`, borderRadius: '14px', padding: '18px' };

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ width: '44px', height: '24px', borderRadius: '99px', background: checked ? GOLD : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: checked ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

const PRIORITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  high:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.3)' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)' },
  low:    { color: BLUE,      bg: 'rgba(55,181,255,0.08)',  border: 'rgba(55,181,255,0.25)' },
};

export function LessonCreator({ open, onOpenChange, coachId, onSave, editContent, studentGaps }: LessonCreatorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_videoDuration, setVideoDuration] = useState<number | undefined>();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const [title, setTitle] = useState(editContent?.title || '');
  const [description, setDescription] = useState(editContent?.description || '');
  const [content, setContent] = useState(editContent?.content || '');
  const [videoUrl, setVideoUrl] = useState(editContent?.videoUrl || '');
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState(editContent?.estimatedTimeMinutes || 15);
  const [learningObjectives, setLearningObjectives] = useState<string[]>(editContent?.learningObjectives || []);
  const [tags, setTags] = useState<string[]>(editContent?.tags || []);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [isPublic, setIsPublic] = useState(editContent?.isPublic || false);
  const [newObjective, setNewObjective] = useState('');
  const [newTag, setNewTag] = useState('');

  const [pillars, setPillars] = useState<Sport[]>([]);
  const [pillarSkills, setPillarSkills] = useState<Skill[]>([]);
  const [selectedPillarId, setSelectedPillarId] = useState(editContent?.pillarId || '');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [loadingPillars, setLoadingPillars] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!editContent;

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingPillars(true);
      try {
        const r = await sportsService.getAllSports({ limit: 10 });
        if (r.success && r.data) setPillars(r.data.items.sort((a, b) => a.order - b.order));
      } catch { /* non-blocking */ }
      finally { setLoadingPillars(false); }
    };
    load();
  }, [open]);

  useEffect(() => {
    if (!selectedPillarId) { setPillarSkills([]); return; }
    const load = async () => {
      setLoadingSkills(true);
      try {
        const r = await sportsService.getSkillsBySport(selectedPillarId);
        if (r.success && r.data) setPillarSkills(r.data.items.filter(s => s.isActive));
      } catch { /* non-blocking */ }
      finally { setLoadingSkills(false); }
    };
    load();
  }, [selectedPillarId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSubmitting) handleClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isSubmitting]);

  const applyGapSuggestion = (gap: StudentGapInfo) => {
    if (!title) setTitle(`${gap.categoryName} — Targeted Lesson`);
    const t = [...tags];
    if (!t.includes(gap.categorySlug)) t.push(gap.categorySlug);
    if (!t.includes(gap.priority + '-priority')) t.push(gap.priority + '-priority');
    setTags(t);
    if (gap.suggestedContent.length > 0 && learningObjectives.length === 0) setLearningObjectives(gap.suggestedContent.slice(0, 3));
  };

  const handleVideoUploaded = (url: string, duration?: number) => {
    setVideoUrl(url);
    if (duration) { setVideoDuration(duration); setEstimatedTimeMinutes(Math.ceil(duration / 60)); }
  };

  const addObjective = () => { if (newObjective.trim()) { setLearningObjectives([...learningObjectives, newObjective.trim()]); setNewObjective(''); } };
  const removeObjective = (i: number) => setLearningObjectives(learningObjectives.filter((_, idx) => idx !== i));
  const addTag = () => { if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) { setTags([...tags, newTag.trim().toLowerCase()]); setNewTag(''); } };
  const removeTag = (i: number) => setTags(tags.filter((_, idx) => idx !== i));

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    /**
     * Read the files into a real array *before* clearing the input.
     *
     * The state updater below runs during the next render, not at the moment
     * it is queued — so reading `e.target.files` inside it happened after the
     * `value = ''` on the following line had already emptied the FileList, and
     * every attachment was silently dropped. The clear itself has to stay: a
     * file input fires no `change` event when re-picking the same file, so
     * without it the picker looks dead until the page is remounted.
     */
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (picked.length > 0) {
      setAttachments(prev => [...prev, ...picked].slice(0, 5));
    }
  };
  const removeAttachment = (i: number) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim() || title.length < 3) e.title = 'Title must be at least 3 characters';
    if (!description.trim() || description.length < 10) e.description = 'Description must be at least 10 characters';
    if (estimatedTimeMinutes < 1 || estimatedTimeMinutes > 180) e.estimatedTime = 'Must be between 1 and 180 minutes';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent | React.MouseEvent) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Please fix the errors in the form'); return; }
    setIsSubmitting(true);
    try {
      const data = { title: title.trim(), description: description.trim(), type: 'lesson' as const, content: content.trim(), videoUrl, attachments, estimatedTimeMinutes, learningObjectives, tags, isPublic, pillarId: selectedPillarId || undefined, levelId: selectedSkillId || undefined };
      let result;
      if (isEditing && editContent) {
        result = await customContentService.updateContent(editContent.id, { title: data.title, description: data.description, content: data.content, videoUrl, estimatedTimeMinutes, learningObjectives, tags, isPublic }, coachId);
        if (result.success) { toast.success('Lesson updated successfully'); onSave({ ...editContent, ...data, attachments: [] }); }
      } else {
        result = await customContentService.createContent(coachId, data);
        if (result.success && result.data) { toast.success('Lesson created successfully'); onSave(result.data); }
      }
      if (!result.success) throw new Error(result.error?.message || 'Failed to save lesson');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save lesson');
    } finally { setIsSubmitting(false); setUploadingAttachments(false); }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setTitle(editContent?.title || ''); setDescription(editContent?.description || ''); setContent(editContent?.content || '');
    setVideoUrl(editContent?.videoUrl || ''); setEstimatedTimeMinutes(editContent?.estimatedTimeMinutes || 15);
    setLearningObjectives(editContent?.learningObjectives || []); setTags(editContent?.tags || []);
    setAttachments([]); setNewObjective(''); setNewTag(''); setVideoDuration(undefined); setErrors({});
    onOpenChange(false);
  };

  if (!open) return null;

  const selectS: React.CSSProperties = { width: '100%', padding: '10px 13px', background: 'rgba(2,8,28,0.95)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', fontFamily: 'inherit' };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <style>{`
        .lc-input:focus{border-color:${BLUE}!important;box-shadow:0 0 0 3px rgba(55,181,255,0.1)!important}
        .lc-input::placeholder{color:rgba(255,255,255,0.22)}
        .lc-add:hover{background:rgba(55,181,255,0.18)!important}
        .lc-remove:hover{background:rgba(248,113,113,0.12)!important;color:#f87171!important}
        .lc-gap:hover{opacity:0.8}
        .lc-save:hover:not(:disabled){opacity:0.9;transform:translateY(-1px)}
        .lc-save:disabled{opacity:0.5;cursor:not-allowed}
        .lc-cancel:hover{background:rgba(255,255,255,0.06)!important}
        .lc-select option{background:#020e24;color:#fff}
        @keyframes lc-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ background: 'linear-gradient(145deg, #030e22 0%, #04213f 100%)', border: `1px solid rgba(212,169,59,0.25)`, borderRadius: '22px', width: '100%', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: `0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(212,169,59,0.06)` }}>

        {/* Header */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 60%, #0d1f40 100%)', padding: '24px 28px', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(212,169,59,0.1)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: GOLD, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Content Library</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(212,169,59,0.15)', border: `1px solid rgba(212,169,59,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={18} color={GOLD} />
                </div>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em' }}>{isEditing ? 'Edit Lesson' : 'Create New Lesson'}</h2>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Create a custom lesson with video, objectives, and attachments.</p>
            </div>
            <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px', borderRadius: '8px', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Gap Suggestions */}
        {studentGaps && studentGaps.length > 0 && !isEditing && (
          <div style={{ margin: '0', padding: '12px 28px', background: 'rgba(55,181,255,0.05)', borderBottom: '1px solid rgba(55,181,255,0.1)', flexShrink: 0 }}>
            <p style={{ color: BLUE, fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>Student needs help with — click to pre-fill:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {studentGaps.map(gap => {
                const s = PRIORITY_STYLE[gap.priority] || PRIORITY_STYLE.low;
                return (
                  <button key={gap.categorySlug} type="button" onClick={() => applyGapSuggestion(gap)} className="lc-gap"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', border: `1px solid ${s.border}`, background: s.bg, color: s.color, transition: 'opacity 0.15s' }}>
                    {gap.categoryName}
                    <span style={{ fontSize: '9px', opacity: 0.7 }}>({gap.priority})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '16px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(55,181,255,0.2) transparent' }}>

          {/* Pillar & Skill */}
          <div style={{ ...sectionCard }}>

            <p style={{ color: BLUE, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Assign to Pillar & Skill</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
              <div>
                <label style={labelS}>Pillar</label>
                <select value={selectedPillarId} onChange={e => { setSelectedPillarId(e.target.value); setSelectedSkillId(''); }} className="lc-select" style={selectS} disabled={loadingPillars}>
                  <option value="">Select a pillar…</option>
                  {pillars.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Skill (optional)</label>
                <select value={selectedSkillId} onChange={e => setSelectedSkillId(e.target.value)} className="lc-select" style={{ ...selectS, opacity: (!selectedPillarId || loadingSkills) ? 0.5 : 1 }} disabled={!selectedPillarId || loadingSkills}>
                  <option value="">Select a skill…</option>
                  {pillarSkills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Linking ensures this content appears in the goalie's skill page.</p>
          </div>

          {/* Title & Description */}
          <div style={sectionCard}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelS}>Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter lesson title" className="lc-input" style={{ ...inputS, borderColor: errors.title ? '#f87171' : undefined }} />
                {errors.title && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.title}</p>}
              </div>
              <div>
                <label style={labelS}>Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what students will learn" rows={3} className="lc-input" style={{ ...inputS, resize: 'vertical', borderColor: errors.description ? '#f87171' : undefined }} />
                {errors.description && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.description}</p>}
              </div>
            </div>
          </div>

          {/* Video */}
          <div style={sectionCard}>

            <label style={{ ...labelS, marginBottom: '12px' }}>Video (Optional)</label>
            <VideoUploader coachId={coachId} onVideoUploaded={handleVideoUploaded} initialVideoUrl={videoUrl} />
          </div>

          {/* Lesson Content */}
          <div style={sectionCard}>

            <label style={labelS}>Lesson Content (Optional)</label>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginBottom: '8px' }}>Add written content, instructions, or notes</p>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Add lesson content, instructions, or notes…" rows={5} className="lc-input" style={{ ...inputS, resize: 'vertical' }} />
          </div>

          {/* Estimated Time */}
          <div style={sectionCard}>

            <label style={{ ...labelS, display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={13} />Estimated Time (minutes)</label>
            <input type="number" min={1} max={180} value={estimatedTimeMinutes} onChange={e => setEstimatedTimeMinutes(parseInt(e.target.value) || 15)} className="lc-input" style={{ ...inputS, width: '120px', borderColor: errors.estimatedTime ? '#f87171' : undefined }} />
            {errors.estimatedTime && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.estimatedTime}</p>}
          </div>

          {/* Learning Objectives */}
          <div style={sectionCard}>

            <label style={{ ...labelS, display: 'flex', alignItems: 'center', gap: '6px' }}><Target size={13} />Learning Objectives (Optional)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input value={newObjective} onChange={e => setNewObjective(e.target.value)} placeholder="Add a learning objective" className="lc-input" style={{ ...inputS, flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addObjective(); } }} />
              <button type="button" onClick={addObjective} className="lc-add"
                style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', color: BLUE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                <Plus size={16} />
              </button>
            </div>
            {learningObjectives.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {learningObjectives.map((obj, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                    <span style={{ color: BLUE, fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>•</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', flex: 1 }}>{obj}</span>
                    <button type="button" onClick={() => removeObjective(i)} className="lc-remove"
                      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '2px', borderRadius: '6px', display: 'flex', transition: 'all 0.15s' }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div style={sectionCard}>

            <label style={{ ...labelS, display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={13} />Tags (Optional)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add a tag" className="lc-input" style={{ ...inputS, flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
              <button type="button" onClick={addTag} className="lc-add"
                style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', color: BLUE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                <Plus size={16} />
              </button>
            </div>
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tags.map((tag, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: BLUE, background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '20px', padding: '3px 10px' }}>
                    {tag}
                    <button type="button" onClick={() => removeTag(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1 }}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div style={sectionCard}>

            <label style={{ ...labelS, display: 'flex', alignItems: 'center', gap: '6px' }}><Paperclip size={13} />Attachments (Optional)</label>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginBottom: '10px' }}>PDFs, documents, images (max 5 files, 25MB each)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {attachments.map((file, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '3px 10px' }}>
                  {file.name}
                  <button type="button" onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={11} /></button>
                </span>
              ))}
              {attachments.length < 5 && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: BLUE, background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '20px', padding: '3px 10px', cursor: 'pointer' }}>
                  <input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={handleAddAttachment} style={{ display: 'none' }} multiple />
                  <Upload size={11} /> Add File
                </label>
              )}
            </div>
          </div>

          {/* Library Options */}
          <div style={sectionCard}>

            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Library Options</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Save to Library', desc: 'Save this lesson to your content library for reuse', checked: saveToLibrary, onChange: setSaveToLibrary },
                { label: 'Make Public', desc: 'Allow other coaches to use this lesson', checked: isPublic, onChange: setIsPublic },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{row.label}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{row.desc}</p>
                  </div>
                  <Toggle checked={row.checked} onChange={row.onChange} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(55,181,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexShrink: 0, background: 'rgba(2,10,30,0.6)' }}>
          <button onClick={handleClose} disabled={isSubmitting} className="lc-cancel"
            style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            Cancel
          </button>
          <button onClick={onSubmit} disabled={isSubmitting || uploadingAttachments} className="lc-save"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', background: `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)`, border: 'none', borderRadius: '10px', color: '#0c0800', fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 16px rgba(212,169,59,0.35)` }}>
            {isSubmitting
              ? <><Loader2 size={15} style={{ animation: 'lc-spin 1s linear infinite' }} />{uploadingAttachments ? 'Uploading…' : 'Saving…'}</>
              : <><Save size={15} />{isEditing ? 'Update Lesson' : 'Create Lesson'}<ArrowRight size={14} /></>
            }
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
