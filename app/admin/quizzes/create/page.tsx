'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { videoQuizService } from '@/lib/database/services/video-quiz.service';
import { sportsService } from '@/lib/database/services/sports.service';
import { Sport, Skill, DifficultyLevel, VideoQuiz, VideoQuizQuestion, VideoQuizSettings, VideoStructuredTags, createEmptyStructuredTags } from '@/types';
import { VideoTagEditor } from '@/components/video';
import { ArrowLeft, Save, Loader2, Video, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { VideoQuestionBuilder } from '@/components/admin/VideoQuestionBuilder';
import { VideoUploader } from '@/components/coach/video-uploader';
import { VideoLibraryPicker } from '@/components/video';

const BLUE = '#37b5ff';
const RED = '#f87171';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;
type TabId = 'basic' | 'video' | 'questions' | 'tags' | 'settings';

function CreateVideoQuizContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabId>('basic');

  const [quizData, setQuizData] = useState<Partial<VideoQuiz>>({
    title: '', description: '', sportId: '', skillId: '', videoUrl: '', videoDuration: 0,
    instructions: '', difficulty: 'development' as DifficultyLevel, tags: [],
    isActive: false, isPublished: false, questions: [],
    structuredTags: createEmptyStructuredTags(),
    settings: {
      allowPlaybackSpeedChange: true, playbackSpeeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
      allowRewind: true, allowSkipAhead: false, requireSequentialAnswers: false,
      showProgressBar: true, autoPlayNext: true, showCorrectAnswers: true, showExplanations: true,
    } as VideoQuizSettings,
  });

  useEffect(() => { loadSportsAndSkills(); }, []);

  const loadSportsAndSkills = async () => {
    try {
      setLoading(true);
      const [sportsResult, skillsResult] = await Promise.all([sportsService.getAllSports(), sportsService.getAllSkills()]);
      if (sportsResult.success && sportsResult.data) setSports(sportsResult.data.items);
      if (skillsResult.success && skillsResult.data) setSkills(skillsResult.data.items);
    } catch (error) {
      console.error('Error loading sports and skills:', error);
      toast.error('Failed to load sports and skills');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUploaded = (url: string, duration?: number) => {
    setQuizData(prev => ({ ...prev, videoUrl: url, videoDuration: duration || 1 }));
    setVideoDuration(duration || 1);
  };

  const handleInputChange = (field: string, value: unknown) => setQuizData(prev => ({ ...prev, [field]: value }));
  const handleSettingsChange = (field: string, value: unknown) => setQuizData(prev => ({ ...prev, settings: { ...prev.settings!, [field]: value } }));
  const handleQuestionsChange = (questions: VideoQuizQuestion[]) => setQuizData(prev => ({ ...prev, questions }));
  const handleStructuredTagsChange = (structuredTags: VideoStructuredTags) => setQuizData(prev => ({ ...prev, structuredTags }));

  const handleSaveQuiz = async () => {
    if (!quizData.title?.trim()) { toast.error('Quiz title is required'); return; }
    if (!quizData.sportId?.trim()) { toast.error('Sport is required'); return; }
    if (!quizData.skillId?.trim()) { toast.error('Skill is required'); return; }
    if (!quizData.videoUrl?.trim()) { toast.error('Video URL is required'); return; }
    if (!quizData.questions?.length) { toast.error('At least one question is required'); return; }
    if (!user?.id) { toast.error('Please log in again'); return; }
    try {
      setSaveLoading(true);
      const quizToCreate = {
        title: quizData.title!, description: quizData.description || '',
        videoUrl: quizData.videoUrl!, videoDuration: quizData.videoDuration ?? 0,
        sportId: quizData.sportId!, skillId: quizData.skillId!,
        instructions: quizData.instructions || '', difficulty: quizData.difficulty!,
        tags: quizData.tags || [], structuredTags: quizData.structuredTags,
        category: 'Video Quiz', isActive: quizData.isActive || false,
        isPublished: quizData.isPublished || false, questions: quizData.questions!,
        settings: quizData.settings!, estimatedDuration: Math.ceil((quizData.videoDuration || 300) / 60),
        createdBy: user.id,
      };
      const result = await videoQuizService.createVideoQuiz(quizToCreate);
      if (!result?.success) throw new Error(result?.error?.message || 'Failed to create video quiz');
      toast.success('Video quiz created successfully!');
      router.push('/admin/quizzes');
    } catch (error) {
      console.error('Error creating video quiz:', error);
      toast.error('Failed to create video quiz', { description: error instanceof Error ? error.message : 'Please try again' });
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredSkills = skills.filter(skill => !quizData.sportId || skill.sportId === quizData.sportId);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Loading…</p></div>;
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'basic', label: 'Basic Info' }, { id: 'video', label: 'Video Setup' },
    { id: 'questions', label: 'Questions' }, { id: 'tags', label: 'Tags' }, { id: 'settings', label: 'Settings' },
  ];

  const fieldLabel = (text: string, required?: boolean) => (
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
      {text} {required && <span style={{ color: RED }}>*</span>}
    </p>
  );

  const Toggle = ({ checked, onChange }: { checked?: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!checked)} style={{ width: '40px', height: '22px', borderRadius: '11px', background: checked ? BLUE : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );

  return (
    <>
      <style>{`
        .qc-inp { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 10px !important; padding: 10px 14px !important; width: 100% !important; font-size: 15px !important; outline: none !important; box-sizing: border-box !important; }
        .qc-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
        .qc-inp::placeholder { color: rgba(255,255,255,0.25) !important; }
        .qc-inp:disabled { opacity: 0.4 !important; }
        .qc-sel { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: rgba(255,255,255,0.8) !important; border-radius: 10px !important; padding: 10px 14px !important; width: 100% !important; font-size: 15px !important; outline: none !important; cursor: pointer !important; }
        .qc-sel:focus { border-color: rgba(55,181,255,0.45) !important; }
        .qc-sel:disabled { opacity: 0.4 !important; }
        .qc-ta { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 10px !important; padding: 10px 14px !important; width: 100% !important; font-size: 15px !important; outline: none !important; resize: vertical !important; box-sizing: border-box !important; }
        .qc-ta:focus { border-color: rgba(55,181,255,0.45) !important; }
        .qc-ta::placeholder { color: rgba(255,255,255,0.25) !important; }
        .qc-tab:hover { color: #fff !important; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/admin/quizzes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '8px 14px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={15} /> Back to Quizzes
            </Link>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>Create Video Quiz</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Create an interactive video quiz with timestamp-based questions</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/admin/quizzes" style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}>Cancel</Link>
            <button onClick={handleSaveQuiz} disabled={saveLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: saveLoading ? 'not-allowed' : 'pointer', opacity: saveLoading ? 0.7 : 1 }}>
              {saveLoading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Save size={15} /> Create Video Quiz</>}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ position: 'relative', ...card, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(55,181,255,0.1)', padding: '0 20px', overflowX: 'auto' }}>
            {TABS.map(({ id, label }) => (
              <button key={id} className="qc-tab" onClick={() => setActiveTab(id)} style={{ padding: '16px 18px', background: 'none', border: 'none', borderBottom: activeTab === id ? `2px solid ${BLUE}` : '2px solid transparent', color: activeTab === id ? BLUE : 'rgba(255,255,255,0.45)', fontWeight: activeTab === id ? 700 : 500, fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.2s', marginBottom: '-1px' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '24px' }}>
            {/* Basic Info */}
            {activeTab === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>{fieldLabel('Quiz Title', true)}<input className="qc-inp" value={quizData.title || ''} onChange={e => handleInputChange('title', e.target.value)} placeholder="Enter quiz title" /></div>
                <div>{fieldLabel('Description')}<textarea className="qc-ta" value={quizData.description || ''} onChange={e => handleInputChange('description', e.target.value)} placeholder="Describe what this video quiz covers" rows={3} /></div>
                <div>{fieldLabel('Instructions')}<textarea className="qc-ta" value={quizData.instructions || ''} onChange={e => handleInputChange('instructions', e.target.value)} placeholder="Instructions for quiz takers (optional)" rows={3} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    {fieldLabel('Sport', true)}
                    <select className="qc-sel" value={quizData.sportId || ''} onChange={e => handleInputChange('sportId', e.target.value)}>
                      <option value="">Select a sport</option>
                      {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '4px' }}>Required</p>
                  </div>
                  <div>
                    {fieldLabel('Skill', true)}
                    <select className="qc-sel" value={quizData.skillId || ''} onChange={e => handleInputChange('skillId', e.target.value)} disabled={!quizData.sportId}>
                      <option value="">Select a skill</option>
                      {filteredSkills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '4px' }}>Required</p>
                  </div>
                  <div>
                    {fieldLabel('Difficulty')}
                    <select className="qc-sel" value={quizData.difficulty || 'development'} onChange={e => handleInputChange('difficulty', e.target.value as DifficultyLevel)}>
                      <option value="introduction">Introduction</option>
                      <option value="development">Development</option>
                      <option value="refinement">Refinement</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  {[{ key: 'isActive', label: 'Active' }, { key: 'isPublished', label: 'Published' }].map(({ key, label }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Toggle checked={quizData[key as keyof typeof quizData] as boolean} onChange={v => handleInputChange(key, v)} />
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', fontWeight: 500 }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Setup */}
            {activeTab === 'video' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '12px', padding: '14px' }}>
                  <Video size={16} color={BLUE} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>Provide a video by entering a URL or uploading a file. Duration will be automatically detected when you create questions.</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <VideoLibraryPicker onSelect={handleVideoUploaded} />
                </div>
                <VideoUploader userId={user?.id} uploadFolder="video-quizzes" onVideoUploaded={handleVideoUploaded} initialVideoUrl={quizData.videoUrl} />
                {quizData.videoUrl && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                    {fieldLabel('Video Duration (seconds)')}
                    <input className="qc-inp" type="number" value={videoDuration || ''} onChange={e => { const d = Number(e.target.value); setVideoDuration(d); handleInputChange('videoDuration', d); }} placeholder="Auto-detected or enter manually" min="1" style={{ maxWidth: '240px' } as React.CSSProperties} />
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '4px' }}>Duration is auto-detected for most videos. Override here if needed.</p>
                  </div>
                )}
              </div>
            )}

            {/* Questions */}
            {activeTab === 'questions' && (
              videoDuration > 0 && quizData.videoUrl ? (
                <VideoQuestionBuilder questions={quizData.questions || []} videoDuration={videoDuration} videoUrl={quizData.videoUrl} onChange={handleQuestionsChange} />
              ) : (
                <div style={{ textAlign: 'center', padding: '64px' }}>
                  <AlertCircle size={44} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: '17px', marginBottom: '6px' }}>Video Setup Required</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '16px' }}>Please add a video URL or upload a video file in the Video Setup tab first</p>
                  <button onClick={() => setActiveTab('video')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.3)', color: BLUE, padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                    Go to Video Setup
                  </button>
                </div>
              )
            )}

            {/* Tags */}
            {activeTab === 'tags' && (
              <VideoTagEditor value={quizData.structuredTags} onChange={handleStructuredTagsChange} />
            )}

            {/* Settings */}
            {activeTab === 'settings' && (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '15px', marginBottom: '16px' }}>Player Controls</p>
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
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Toggle checked={quizData.settings?.[key as keyof VideoQuizSettings] as boolean} onChange={v => handleSettingsChange(key, v)} />
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function CreateVideoQuizPage() {
  return <AdminRoute><CreateVideoQuizContent /></AdminRoute>;
}
