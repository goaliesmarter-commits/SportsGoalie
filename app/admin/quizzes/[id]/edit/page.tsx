'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminRoute } from '@/components/auth/protected-route';
import { videoQuizService } from '@/lib/database/services/video-quiz.service';
import { sportsService } from '@/lib/database/services/sports.service';
import { Sport, Skill, DifficultyLevel, VideoQuiz, VideoQuizQuestion, VideoQuizSettings, VideoStructuredTags, createEmptyStructuredTags } from '@/types';
import { VideoTagEditor, VideoLibraryPicker } from '@/components/video';
import { ArrowLeft, Save, Loader2, Video, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { VideoQuestionBuilder } from '@/components/admin/VideoQuestionBuilder';
import { VideoUploader } from '@/components/coach/video-uploader';

const BLUE = '#37b5ff';
const RED = '#f87171';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

type TabId = 'basic' | 'video' | 'questions' | 'tags' | 'settings';

const Toggle = ({ checked, onChange }: { checked?: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      position: 'relative', width: '40px', height: '22px', borderRadius: '11px',
      background: checked ? BLUE : 'rgba(255,255,255,0.15)',
      border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
    }}
  >
    <div style={{
      position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
      width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s',
    }} />
  </button>
);

function EditVideoQuizContent() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [originalQuiz, setOriginalQuiz] = useState<VideoQuiz | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabId>('basic');

  const [quizData, setQuizData] = useState<Partial<VideoQuiz>>({
    title: '',
    description: '',
    sportId: '',
    skillId: '',
    videoUrl: '',
    videoDuration: 0,
    instructions: '',
    difficulty: 'development' as DifficultyLevel,
    tags: [],
    isActive: false,
    isPublished: false,
    questions: [],
    structuredTags: createEmptyStructuredTags(),
    settings: {
      allowPlaybackSpeedChange: true,
      playbackSpeeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
      allowRewind: true,
      allowSkipAhead: false,
      requireSequentialAnswers: false,
      showProgressBar: true,
      autoPlayNext: true,
      showCorrectAnswers: true,
      showExplanations: true,
    } as VideoQuizSettings,
  });

  useEffect(() => { loadInitialData(); }, [quizId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [quizResult, sportsResult, skillsResult] = await Promise.all([
        videoQuizService.getVideoQuiz(quizId),
        sportsService.getAllSports(),
        sportsService.getAllSkills(),
      ]);

      if (quizResult.success && quizResult.data) {
        const quiz = quizResult.data;
        setOriginalQuiz(quiz);
        setVideoDuration(quiz.videoDuration);
        setQuizData({
          title: quiz.title,
          description: quiz.description || '',
          sportId: quiz.sportId,
          skillId: quiz.skillId,
          videoUrl: quiz.videoUrl,
          videoDuration: quiz.videoDuration,
          instructions: quiz.instructions || '',
          difficulty: quiz.difficulty,
          tags: quiz.tags || [],
          structuredTags: quiz.structuredTags || createEmptyStructuredTags(),
          isActive: quiz.isActive,
          isPublished: quiz.isPublished,
          questions: quiz.questions,
          settings: quiz.settings,
        });
      } else {
        toast.error('Video quiz not found');
        router.push('/admin/quizzes');
        return;
      }

      if (sportsResult.success && sportsResult.data) setSports(sportsResult.data.items);
      if (skillsResult.success && skillsResult.data) setSkills(skillsResult.data.items);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load video quiz data');
      router.push('/admin/quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUploaded = (url: string, duration?: number) => {
    setQuizData(prev => ({ ...prev, videoUrl: url, videoDuration: duration || prev.videoDuration || 1 }));
    if (duration) setVideoDuration(duration);
  };

  const handleInputChange = (field: string, value: any) => {
    setQuizData(prev => ({ ...prev, [field]: value }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setQuizData(prev => ({ ...prev, settings: { ...prev.settings!, [field]: value } }));
  };

  const handleQuestionsChange = (questions: VideoQuizQuestion[]) => {
    setQuizData(prev => ({ ...prev, questions }));
  };

  const handleStructuredTagsChange = (structuredTags: VideoStructuredTags) => {
    setQuizData(prev => ({ ...prev, structuredTags }));
  };

  const handleSaveQuiz = async () => {
    if (!quizData.title || quizData.title.trim() === '') { toast.error('Quiz title is required'); return; }
    if (!quizData.sportId || quizData.sportId.trim() === '') { toast.error('Sport is required', { description: 'Every video quiz must be associated with a sport' }); return; }
    if (!quizData.skillId || quizData.skillId.trim() === '') { toast.error('Skill is required', { description: 'Every video quiz must be associated with a skill' }); return; }
    if (!quizData.videoUrl || quizData.videoUrl.trim() === '') { toast.error('Video URL is required'); return; }
    if (!quizData.videoDuration || quizData.videoDuration <= 0) { toast.error('Video duration is invalid', { description: 'Please validate the video URL first' }); return; }
    if (!quizData.questions || quizData.questions.length === 0) { toast.error('At least one question is required'); return; }

    try {
      setSaveLoading(true);
      const updates = {
        title: quizData.title,
        description: quizData.description || '',
        videoUrl: quizData.videoUrl,
        videoDuration: quizData.videoDuration,
        sportId: quizData.sportId,
        skillId: quizData.skillId,
        instructions: quizData.instructions || '',
        difficulty: quizData.difficulty!,
        tags: quizData.tags || [],
        structuredTags: quizData.structuredTags,
        isActive: quizData.isActive || false,
        isPublished: quizData.isPublished || false,
        questions: quizData.questions,
        settings: quizData.settings!,
      };

      console.log('🔍 [EditQuiz] Attempting update with data:', { quizId, questionsCount: updates.questions?.length, settings: updates.settings, videoDuration: updates.videoDuration });
      const result = await videoQuizService.updateVideoQuiz(quizId, updates);
      console.log('📊 [EditQuiz] Update result:', { success: result.success, error: result.error });

      if (!result.success) {
        console.error('❌ [EditQuiz] Update failed:', result.error);
        throw new Error(result.error?.message || 'Failed to update video quiz');
      }

      toast.success('Video quiz updated successfully!');
      router.push('/admin/quizzes');
    } catch (error) {
      console.error('Error updating video quiz:', error);
      toast.error('Failed to update video quiz', { description: error instanceof Error ? error.message : 'Please try again' });
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredSkills = skills.filter(skill => !quizData.sportId || skill.sportId === quizData.sportId);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(55,181,255,0.15)',
    color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer', appearance: 'none' as const,
  };
  const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'video', label: 'Video Setup' },
    { id: 'questions', label: 'Questions' },
    { id: 'tags', label: 'Tags' },
    { id: 'settings', label: 'Settings' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={32} color={BLUE} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!originalQuiz) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px' }}>
        <div style={{ ...card, padding: '48px', textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} color="rgba(255,255,255,0.25)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#fff', fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>Video quiz not found</p>
          <Link href="/admin/quizzes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#fff', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to Quizzes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .qe-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
        .qe-sel:focus { border-color: rgba(55,181,255,0.45) !important; }
        .qe-ta:focus { border-color: rgba(55,181,255,0.45) !important; }
        .qe-sel option { background: #02122c; color: #fff; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin/quizzes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '8px 14px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to Quizzes
          </Link>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '2px' }}>Edit Video Quiz</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>{originalQuiz.title}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0' }}>
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === id ? '#fff' : 'rgba(255,255,255,0.45)',
                fontWeight: activeTab === id ? 700 : 500, fontSize: '15px',
                borderBottom: activeTab === id ? `2px solid ${BLUE}` : '2px solid transparent',
                marginBottom: '-1px', transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div style={{ position: 'relative', ...card, padding: '24px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}66, transparent)` }} />
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '20px' }}>Basic Information</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div>
                <label style={labelStyle}>Quiz Title *</label>
                <input className="qe-inp" value={quizData.title || ''} onChange={e => handleInputChange('title', e.target.value)} placeholder="Enter quiz title" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea className="qe-ta" value={quizData.description || ''} onChange={e => handleInputChange('description', e.target.value)} placeholder="Describe what this video quiz covers" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div>
                <label style={labelStyle}>Instructions</label>
                <textarea className="qe-ta" value={quizData.instructions || ''} onChange={e => handleInputChange('instructions', e.target.value)} placeholder="Instructions for quiz takers (optional)" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Sport *</label>
                  <select className="qe-sel" value={quizData.sportId || ''} onChange={e => handleInputChange('sportId', e.target.value)} style={selectStyle}>
                    <option value="">Select a sport</option>
                    {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '4px' }}>Required</p>
                </div>

                <div>
                  <label style={labelStyle}>Skill *</label>
                  <select className="qe-sel" value={quizData.skillId || ''} onChange={e => handleInputChange('skillId', e.target.value)} disabled={!quizData.sportId} style={{ ...selectStyle, opacity: !quizData.sportId ? 0.5 : 1, cursor: !quizData.sportId ? 'not-allowed' : 'pointer' }}>
                    <option value="">Select a skill</option>
                    {filteredSkills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '4px' }}>Required</p>
                </div>

                <div>
                  <label style={labelStyle}>Difficulty</label>
                  <select className="qe-sel" value={quizData.difficulty || 'development'} onChange={e => handleInputChange('difficulty', e.target.value as DifficultyLevel)} style={selectStyle}>
                    <option value="introduction">Introduction</option>
                    <option value="development">Development</option>
                    <option value="refinement">Refinement</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle checked={quizData.isActive} onChange={v => handleInputChange('isActive', v)} />
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>Active</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Toggle checked={quizData.isPublished} onChange={v => handleInputChange('isPublished', v)} />
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>Published</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Setup Tab */}
        {activeTab === 'video' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(55,181,255,0.07)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '12px', padding: '14px 16px' }}>
              <Video size={16} color={BLUE} style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px' }}>Be careful when changing the video URL — it may affect existing question timestamps!</p>
            </div>

            <div style={{ position: 'relative', ...card, padding: '24px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}66, transparent)` }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <VideoLibraryPicker onSelect={handleVideoUploaded} />
              </div>
              <VideoUploader
                uploadFolder="video-quizzes"
                onVideoUploaded={handleVideoUploaded}
                initialVideoUrl={quizData.videoUrl}
              />

              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <label style={labelStyle}>Video Duration (seconds)</label>
                <input
                  className="qe-inp"
                  type="number"
                  value={videoDuration}
                  onChange={e => {
                    const duration = parseInt(e.target.value);
                    setVideoDuration(duration);
                    setQuizData(prev => ({ ...prev, videoDuration: duration }));
                  }}
                  placeholder="Auto-detected from video"
                  min="1"
                  style={{ ...inputStyle, maxWidth: '240px' }}
                />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '4px' }}>Duration is auto-detected for most videos. Override here if needed.</p>
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          videoDuration > 0 && quizData.videoUrl ? (
            <VideoQuestionBuilder
              questions={quizData.questions || []}
              videoDuration={videoDuration}
              videoUrl={quizData.videoUrl}
              onChange={handleQuestionsChange}
            />
          ) : (
            <div style={{ position: 'relative', ...card, padding: '64px', textAlign: 'center', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}66, transparent)` }} />
              <AlertCircle size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Video Not Validated</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '20px' }}>Please validate your video in the Video Setup tab before editing questions</p>
              <button onClick={() => setActiveTab('video')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                <Video size={14} /> Go to Video Setup
              </button>
            </div>
          )
        )}

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <VideoTagEditor
            value={quizData.structuredTags}
            onChange={handleStructuredTagsChange}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={{ position: 'relative', ...card, padding: '24px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}66, transparent)` }} />
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '20px' }}>Quiz Settings</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Player Controls</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {[
                { key: 'showExplanations', label: 'Show Explanations' },
                { key: 'showCorrectAnswers', label: 'Show Correct Answers' },
                { key: 'allowRewind', label: 'Allow Video Rewind' },
                { key: 'allowSkipAhead', label: 'Allow Skip Ahead' },
                { key: 'allowPlaybackSpeedChange', label: 'Allow Speed Control' },
                { key: 'requireSequentialAnswers', label: 'Require Sequential Answers' },
                { key: 'autoPlayNext', label: 'Auto-play After Answer' },
                { key: 'showProgressBar', label: 'Show Progress Bar' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 14px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px' }}>{label}</span>
                  <Toggle
                    checked={quizData.settings?.[key as keyof VideoQuizSettings] as boolean}
                    onChange={v => handleSettingsChange(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
          <Link href="/admin/quizzes" style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '15px', textDecoration: 'none' }}>
            Cancel
          </Link>
          <button onClick={handleSaveQuiz} disabled={saveLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: saveLoading ? 'not-allowed' : 'pointer', opacity: saveLoading ? 0.7 : 1 }}>
            {saveLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>

      </div>
    </>
  );
}

export default function EditVideoQuizPage() {
  return (
    <AdminRoute>
      <EditVideoQuizContent />
    </AdminRoute>
  );
}
