'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Loader2, Save, ArrowRight, Clock, Settings, PlayCircle, FileText, Video, HelpCircle } from 'lucide-react';
import { VideoUploader } from '@/components/coach/video-uploader';
import { VideoQuestionBuilder } from '@/components/admin/VideoQuestionBuilder';
import { customContentService, videoQuizService } from '@/lib/database';
import { toast } from 'sonner';
import { VideoQuizQuestion, VideoQuizSettings, CustomContentLibrary } from '@/types';

const GOLD   = '#D4A93B';
const BLUE   = '#37b5ff';
const PURPLE = '#a78bfa';

const defaultSettings: VideoQuizSettings = {
  allowPlaybackSpeedChange: true,
  playbackSpeeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
  allowRewind: true,
  allowSkipAhead: false,
  requireSequentialAnswers: true,
  showProgressBar: true,
  autoPlayNext: true,
  showCorrectAnswers: true,
  showExplanations: true,
};

interface QuizCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  onSave: (content: CustomContentLibrary) => void;
}

const inputS: React.CSSProperties = { width: '100%', padding: '10px 13px', background: 'rgba(4,33,63,0.7)', border: '1px solid rgba(212,169,59,0.22)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'text' };
const labelS: React.CSSProperties = { display: 'block', color: GOLD, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '7px' };
const sectionCard: React.CSSProperties = { background: 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)', border: '1px solid rgba(55,181,255,0.16)', borderTop: `2px solid ${GOLD}`, borderRadius: '14px', padding: '20px' };

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ width: '44px', height: '24px', borderRadius: '99px', background: checked ? GOLD : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: checked ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

const TABS = [
  { key: 'info',      icon: <FileText size={14} />,    label: 'KC Info' },
  { key: 'video',     icon: <Video size={14} />,       label: 'Video' },
  { key: 'questions', icon: <HelpCircle size={14} />,  label: 'Questions' },
  { key: 'settings',  icon: <Settings size={14} />,    label: 'Settings' },
] as const;
type TabKey = typeof TABS[number]['key'];

export function QuizCreator({ open, onOpenChange, coachId, onSave }: QuizCreatorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [videoDuration, setVideoDuration] = useState(0);
  const [questions, setQuestions] = useState<VideoQuizQuestion[]>([]);
  const [settings, setSettings] = useState<VideoQuizSettings>(defaultSettings);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'introduction' | 'development' | 'refinement'>('introduction');
  const [videoUrl, setVideoUrl] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setIsSubmitting(false); setActiveTab('info'); setVideoDuration(0); setQuestions([]); setSettings(defaultSettings);
    setTitle(''); setDescription(''); setDifficulty('introduction'); setVideoUrl('');
    setSaveToLibrary(true); setIsPublic(false); setTags([]); setNewTag(''); setErrors({});
  };

  const handleClose = () => { if (isSubmitting) return; onOpenChange(false); resetForm(); };
  const handleVideoUploaded = (url: string, duration?: number) => { setVideoUrl(url); if (duration) setVideoDuration(duration); };

  const addTag = () => { if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) { setTags([...tags, newTag.trim().toLowerCase()]); setNewTag(''); } };
  const removeTag = (i: number) => setTags(tags.filter((_, idx) => idx !== i));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim() || title.length < 3) e.title = 'Title must be at least 3 characters';
    if (!description.trim() || description.length < 10) e.description = 'Description must be at least 10 characters';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) { toast.error('Please fix the form errors'); setActiveTab('info'); return; }
    if (!videoUrl) { toast.error('Please add a video'); setActiveTab('video'); return; }
    if (questions.length === 0) { toast.error('Please add at least one question'); setActiveTab('questions'); return; }
    setIsSubmitting(true);
    try {
      const totalPoints = questions.reduce((s, q) => s + (q.points || 10), 0);
      const estimatedDuration = Math.ceil(videoDuration / 60) + Math.ceil(questions.length * 0.5);
      const quizResult = await videoQuizService.createVideoQuiz({ title: title.trim(), description: description.trim(), videoUrl, videoDuration, questions, settings, difficulty, estimatedDuration, tags, isActive: true, isPublished: true, category: 'coach-content', sportId: 'coach-custom', skillId: 'coach-custom', createdBy: coachId, source: 'coach' });
      if (!quizResult.success) throw new Error(quizResult.error?.message || 'Failed to create quiz');
      if (!saveToLibrary) { toast.success('Quiz created'); onOpenChange(false); resetForm(); return; }
      const contentResult = await customContentService.createContent(coachId, { title: title.trim(), description: description.trim(), type: 'quiz', content: JSON.stringify({ videoQuizId: quizResult.data?.id, totalPoints, questionCount: questions.length }), videoUrl, tags, isPublic, estimatedTimeMinutes: estimatedDuration });
      if (!contentResult.success || !contentResult.data) throw new Error(contentResult.error?.message || 'Failed to save quiz to library');
      toast.success('Quiz created successfully');
      onSave(contentResult.data); onOpenChange(false); resetForm();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to save quiz'); }
    finally { setIsSubmitting(false); }
  };

  if (!open) return null;

  const selectS: React.CSSProperties = { width: '100%', padding: '10px 13px', background: 'rgba(2,8,28,0.95)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', fontFamily: 'inherit' };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '12px' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <style>{`
        .qc-input:focus{border-color:${BLUE}!important;box-shadow:0 0 0 3px rgba(55,181,255,0.1)!important}
        .qc-input::placeholder{color:rgba(255,255,255,0.22)}
        .qc-add:hover{background:rgba(55,181,255,0.18)!important}
        .qc-save:hover:not(:disabled){opacity:0.9;transform:translateY(-1px)}
        .qc-save:disabled{opacity:0.5;cursor:not-allowed}
        .qc-cancel:hover{background:rgba(255,255,255,0.06)!important}
        .qc-select option{background:#020e24;color:#fff}
        @keyframes qc-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}

        /* The questions tab renders VideoQuestionBuilder, a shadcn-built component shared
           with the light admin pages. \`.surface-dark\` on its wrapper already flips the
           design tokens; these last few rules close the gap to the panel styling the other
           three tabs use inline — same gradient, same gold top rule, same purple eyebrow
           for section titles, same field treatment. Scoped to .qc-builder so nothing
           outside this modal is affected, and doubled with .surface-dark so it outranks
           the generic surface rules regardless of stylesheet order. */
        .surface-dark.qc-builder [data-slot="card"]{background:linear-gradient(135deg,#04213f 0%,#0a2d52 100%);border:1px solid rgba(55,181,255,0.16);border-top:2px solid ${GOLD};border-radius:14px;box-shadow:none}
        .surface-dark.qc-builder [data-slot="card-title"]{color:${PURPLE};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
        .surface-dark.qc-builder :is([data-slot="input"],[data-slot="textarea"],[data-slot="select-trigger"]){background:rgba(4,33,63,0.7);border-color:rgba(212,169,59,0.22);color:#fff}
        .surface-dark.qc-builder :is([data-slot="input"],[data-slot="textarea"])::placeholder{color:rgba(255,255,255,0.28)}
        .surface-dark.qc-builder [data-slot="label"]{color:${GOLD};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px}
      `}</style>

      {/*
        Deliberately one fixed size for every tab. The questions tab hosts the same
        VideoQuestionBuilder as the full-page content library form and needs real room
        for the player, the timeline and the Add Question button — but sizing the modal
        per-tab made it jump wider and taller on the way in and snap back on the way out,
        which reads as a glitch. So the box is sized once, to something the builder can
        live in, and the lighter tabs simply have space to spare.
        940px tall rather than the full viewport so it still reads as a dialog on a big
        monitor; the max-height takes over on short laptop screens.
      */}
      <div style={{ background: 'linear-gradient(145deg, #030e22 0%, #04213f 100%)', border: `1px solid rgba(212,169,59,0.25)`, borderRadius: '22px', width: '100%', maxWidth: '1280px', height: '940px', maxHeight: 'calc(100vh - 24px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: `0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(212,169,59,0.06)` }}>

        {/*
          Header is one compact row on every tab. It used to be a three-line block —
          eyebrow, title, and a sentence restating what the tabs already say — which cost
          ~90px of height. That height comes straight off the video on the questions tab,
          where the player is capped by the room left below it, so the trim is what makes
          the video noticeably larger. Same on all tabs so nothing shifts when switching.
        */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 60%, #0d1f40 100%)', padding: '11px 24px', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(212,169,59,0.1)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${GOLD}, ${PURPLE}55, transparent)` }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(212,169,59,0.15)', border: `1px solid rgba(212,169,59,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PlayCircle size={15} color={GOLD} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: GOLD, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.2 }}>Content Library</p>
                <h2 style={{ color: '#fff', fontSize: '16px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.25 }}>Create Knowledge Check</h2>
              </div>
            </div>
            <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px', borderRadius: '8px', display: 'flex', flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: '4px', padding: '8px 24px 0', background: 'rgba(3,14,34,0.7)', flexShrink: 0, borderBottom: `1px solid rgba(212,169,59,0.14)` }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px 10px 0 0', border: '1px solid transparent', borderBottom: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === tab.key ? 'rgba(212,169,59,0.1)' : 'transparent',
                color: activeTab === tab.key ? GOLD : 'rgba(255,255,255,0.45)',
                borderColor: activeTab === tab.key ? 'rgba(55,181,255,0.25)' : 'transparent',
              }}>
              {tab.icon}
              {tab.label}
              {tab.key === 'questions' && questions.length > 0 && (
                <span style={{ fontSize: '10px', fontWeight: 800, color: BLUE, background: 'rgba(55,181,255,0.15)', border: '1px solid rgba(55,181,255,0.3)', borderRadius: '20px', padding: '1px 7px' }}>{questions.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '16px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(55,181,255,0.2) transparent' }}>

          {/* Info tab */}
          {activeTab === 'info' && (
            <>
              <div style={sectionCard}>

                <p style={{ color: PURPLE, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Basic Information</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelS}>Quiz Title *</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter quiz title" className="qc-input" style={{ ...inputS, borderColor: errors.title ? '#f87171' : undefined }} />
                    {errors.title && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.title}</p>}
                  </div>
                  <div>
                    <label style={labelS}>Description *</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what this quiz covers" rows={4} className="qc-input" style={{ ...inputS, resize: 'vertical', borderColor: errors.description ? '#f87171' : undefined }} />
                    {errors.description && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.description}</p>}
                  </div>
                  <div>
                    <label style={labelS}>Difficulty Level</label>
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value as 'introduction' | 'development' | 'refinement')} className="qc-select" style={{ ...selectS, maxWidth: '240px' }}>
                      <option value="introduction">Introduction</option>
                      <option value="development">Development</option>
                      <option value="refinement">Refinement</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Tags (Optional)</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add a tag" className="qc-input" style={{ ...inputS, flex: 1 }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                      <button type="button" onClick={addTag} className="qc-add"
                        style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', color: BLUE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                        <Plus size={16} />
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {tags.map((tag, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: PURPLE, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '20px', padding: '3px 10px' }}>
                            {tag}
                            <button type="button" onClick={() => removeTag(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={11} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={sectionCard}>

                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Library Options</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { label: 'Save to Library', desc: 'Save this quiz to your content library for reuse', checked: saveToLibrary, onChange: setSaveToLibrary },
                    { label: 'Make Public', desc: 'Allow other coaches to use this quiz', checked: isPublic, onChange: setIsPublic },
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
            </>
          )}

          {/* Video tab */}
          {activeTab === 'video' && (
            <div style={sectionCard}>

              <p style={{ color: PURPLE, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Quiz Video</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '16px' }}>Upload or link a video. Questions will be added at specific timestamps.</p>
              <VideoUploader coachId={coachId} onVideoUploaded={handleVideoUploaded} initialVideoUrl={videoUrl} />
              {videoDuration > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  <Clock size={13} />
                  <span>Duration: {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
            </div>
          )}

          {/* Questions tab */}
          {activeTab === 'questions' && (
            !videoUrl ? (
              <div style={{ ...sectionCard, textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Video size={24} color="rgba(255,255,255,0.25)" />
                </div>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>Add a Video First</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px', maxWidth: '320px', margin: '0 auto 20px' }}>Please add a video in the Video tab before creating questions.</p>
                <button onClick={() => setActiveTab('video')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, border: 'none', borderRadius: '10px', color: '#000f28', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Go to Video Tab
                </button>
              </div>
            ) : (
              /* `surface-dark` repoints the shadcn tokens the builder is made of to the
                 navy palette; `qc-builder` carries the modal-specific panel styling above.
                 The builder itself stays light-themed for the admin pages that use it. */
              <div className="surface-dark qc-builder">
                {/* onDurationDetected: a pasted YouTube/Vimeo/Drive link can't be measured
                    by the uploader, so the player on this tab is the only place the real
                    length is known. Without it the quiz saves videoDuration: 0. */}
                <VideoQuestionBuilder questions={questions} videoDuration={videoDuration} videoUrl={videoUrl} onChange={setQuestions} onDurationDetected={setVideoDuration} />
              </div>
            )
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && (
            <div style={sectionCard}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Settings size={14} color={PURPLE} />
                <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Quiz Settings</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {([
                  { label: 'Allow Playback Speed', desc: 'Let students adjust video playback speed', key: 'allowPlaybackSpeedChange' as const },
                  { label: 'Allow Rewind', desc: 'Let students rewind the video', key: 'allowRewind' as const },
                  { label: 'Allow Skip Ahead', desc: 'Let students skip ahead in the video', key: 'allowSkipAhead' as const },
                  { label: 'Sequential Answers', desc: 'Students must answer questions in order', key: 'requireSequentialAnswers' as const },
                  { label: 'Show Progress Bar', desc: 'Display progress through the quiz', key: 'showProgressBar' as const },
                  { label: 'Show Correct Answers', desc: 'Show correct answers after submission', key: 'showCorrectAnswers' as const },
                  { label: 'Show Explanations', desc: 'Show explanations for each answer', key: 'showExplanations' as const },
                  { label: 'Auto-Play Next', desc: 'Automatically continue after answering', key: 'autoPlayNext' as const },
                ] as Array<{ label: string; desc: string; key: keyof VideoQuizSettings }>).map(row => (
                  <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                    <div>
                      <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{row.label}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{row.desc}</p>
                    </div>
                    <Toggle checked={settings[row.key] as boolean} onChange={v => setSettings({ ...settings, [row.key]: v })} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '11px 24px', borderTop: `1px solid rgba(212,169,59,0.14)`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexShrink: 0, background: 'rgba(3,14,34,0.7)' }}>
          <button onClick={handleClose} disabled={isSubmitting} className="qc-cancel"
            style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            Cancel
          </button>
          <button onClick={onSubmit} disabled={isSubmitting} className="qc-save"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', background: `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)`, border: 'none', borderRadius: '10px', color: '#0c0800', fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 16px rgba(212,169,59,0.35)` }}>
            {isSubmitting
              ? <><Loader2 size={15} style={{ animation: 'qc-spin 1s linear infinite' }} />Creating…</>
              : <><Save size={15} />Create Knowledge Check<ArrowRight size={14} /></>
            }
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
