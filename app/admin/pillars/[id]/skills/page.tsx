'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import { Sport, Skill, DifficultyLevel } from '@/types';
import { AdminRoute } from '@/components/auth/protected-route';
import { sportsService } from '@/lib/database/services/sports.service';
import { storageService, STORAGE_CONFIGS } from '@/lib/firebase/storage.service';
import { MediaUpload } from '@/components/admin/media-upload';
import { useDeleteConfirmation } from '@/components/ui/confirmation-dialog';
import { HTMLEditorWithAI } from '@/components/ui/html-editor-with-ai';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Clock, BookOpen, Play, Target } from 'lucide-react';
import { PILLARS } from '@/types';
import { getPillarSlugFromDocId } from '@/lib/utils/pillars';
import {
  BLUE, RED, card, accentLineStyle, pageStackStyle, cardGridStyle, badgeStyle,
  iconChipStyle, tierBadgeStyle, TIER_COLORS, PILLAR_ICONS, adminPillarCss,
} from '@/components/admin/pillar-chrome';

interface AdminSkillsState {
  sport: Sport | null;
  skills: Skill[];
  loading: boolean;
  error: string | null;
  editingId: string | null;
  showCreateForm: boolean;
}

interface SkillFormData {
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedTimeToComplete: number;
  content: string;
  learningObjectives: string[];
  tags: string[];
  isActive: boolean;
  order: number;
  prerequisites: string[];
}

const defaultFormData: SkillFormData = {
  name: '', description: '', difficulty: 'introduction', estimatedTimeToComplete: 30,
  content: '', learningObjectives: [], tags: [], isActive: true, order: 0, prerequisites: [],
};

function AdminSkillsContent() {
  const params = useParams();
  const router = useRouter();
  const sportId = params.id as string;

  const [state, setState] = useState<AdminSkillsState>({ sport: null, skills: [], loading: true, error: null, editingId: null, showCreateForm: false });
  const [formData, setFormData] = useState<SkillFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const { dialog, showDeleteConfirmation, setLoading } = useDeleteConfirmation();

  useEffect(() => { if (sportId) loadData(); }, [sportId]);

  const loadData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [sportResult, skillsResult] = await Promise.all([
        sportsService.getSport(sportId),
        sportsService.getSkillsBySport(sportId),
      ]);
      if (!sportResult.success || !sportResult.data) {
        setState(prev => ({ ...prev, sport: null, error: 'Sport not found', loading: false }));
        return;
      }
      if (!skillsResult.success) {
        setState(prev => ({ ...prev, sport: sportResult.data || null, error: skillsResult.error?.message || 'Failed to load skills', loading: false }));
        return;
      }
      setState(prev => ({ ...prev, sport: sportResult.data || null, skills: skillsResult.data?.items || [], loading: false }));
    } catch {
      setState(prev => ({ ...prev, error: 'An unexpected error occurred', loading: false }));
    }
  };

  const handleEdit = (skill: Skill) => {
    setFormData({ name: skill.name, description: skill.description, difficulty: skill.difficulty, estimatedTimeToComplete: skill.estimatedTimeToComplete, content: skill.content || '', learningObjectives: skill.learningObjectives, tags: skill.tags, isActive: skill.isActive, order: skill.order, prerequisites: skill.prerequisites });
    setEditingSkill(skill);
    setState(prev => ({ ...prev, editingId: skill.id, showCreateForm: false }));
  };

  const handleCreate = () => {
    setFormData(defaultFormData);
    setEditingSkill(null);
    setState(prev => ({ ...prev, showCreateForm: true, editingId: null }));
  };

  const handleCancel = () => {
    setFormData(defaultFormData);
    setUploadedFiles([]);
    setEditingSkill(null);
    setState(prev => ({ ...prev, editingId: null, showCreateForm: false }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { setState(prev => ({ ...prev, error: 'Skill name is required' })); return; }
    if (!formData.description.trim()) { setState(prev => ({ ...prev, error: 'Skill description is required' })); return; }
    if (formData.learningObjectives.length === 0) { setState(prev => ({ ...prev, error: 'At least one learning objective is required' })); return; }
    setSaving(true);
    try {
      let mediaUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        setUploading(true);
        const uploadResults = await storageService.uploadFiles(uploadedFiles, STORAGE_CONFIGS.SKILL_MEDIA);
        mediaUrls = uploadResults.filter(r => r.success && r.url).map(r => r.url!);
        if (mediaUrls.length !== uploadedFiles.length) {
          setState(prev => ({ ...prev, error: 'Some media files failed to upload' }));
          setUploading(false); setSaving(false); return;
        }
        setUploading(false);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const skillData: any = { ...formData, sportId, createdBy: 'admin', externalResources: [], hasVideo: false };

      if (uploadedFiles.length > 0) {
        const videoFiles = uploadedFiles.filter(f => f.type.startsWith('video/'));
        const imageFiles = uploadedFiles.filter(f => f.type.startsWith('image/'));
        skillData.media = {
          text: formData.content,
          images: imageFiles.map((f, i) => ({ id: `img-${Date.now()}-${i}`, url: mediaUrls[uploadedFiles.indexOf(f)], alt: f.name, caption: f.name, order: i })),
          videos: videoFiles.map((f, i) => ({ id: `vid-${Date.now()}-${i}`, url: mediaUrls[uploadedFiles.indexOf(f)], youtubeId: '', title: f.name, duration: 0, thumbnail: '', order: i })),
        };
        skillData.hasVideo = videoFiles.length > 0;
      } else if (state.editingId && editingSkill?.media) {
        skillData.media = editingSkill.media;
        skillData.hasVideo = editingSkill.media.videos && editingSkill.media.videos.length > 0;
      }

      const result = state.editingId
        ? await sportsService.updateSkill(state.editingId, skillData)
        : await sportsService.createSkill(skillData);

      if (result.success) { await loadData(); handleCancel(); }
      else setState(prev => ({ ...prev, error: result.error?.message || 'Failed to save skill' }));
    } catch (error) {
      console.error('Skill creation error:', error);
      setState(prev => ({ ...prev, error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` }));
    } finally {
      setSaving(false); setUploading(false);
    }
  };

  const handleDelete = (skillId: string, skillName: string) => {
    showDeleteConfirmation({
      title: 'Delete Skill',
      description: `Are you sure you want to delete "${skillName}"? This action cannot be undone.`,
      itemName: 'skill',
      onConfirm: async () => {
        setLoading(true);
        try {
          const result = await sportsService.deleteSkill(skillId);
          if (result.success) await loadData();
          else setState(prev => ({ ...prev, error: result.error?.message || 'Failed to delete skill' }));
        } catch {
          setState(prev => ({ ...prev, error: 'An unexpected error occurred while deleting' }));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  if (state.loading) return <div style={{ padding: '48px' }}><SkeletonDarkPage /></div>;

  if (state.error && !state.sport) {
    return (
      <>
        <style>{adminPillarCss}</style>
        <div className="pl-page" style={pageStackStyle}>
          <div style={{ ...card, padding: '48px', textAlign: 'center', border: '1px solid rgba(248,113,113,0.25)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '16px', marginBottom: '20px' }}>{state.error}</p>
            <button className="pl-btn" onClick={() => router.back()} style={{ margin: '0 auto' }}>
              <ArrowLeft size={12} /> Go Back
            </button>
          </div>
        </div>
      </>
    );
  }

  const getPillarDisplayInfo = () => {
    if (!state.sport) return null;
    const slug = getPillarSlugFromDocId(state.sport.id);
    if (slug) {
      const info = PILLARS.find(p => p.slug === slug);
      if (info) return { icon: info.icon, color: info.color, shortName: info.shortName };
    }
    return { icon: state.sport.icon, color: 'blue', shortName: state.sport.name.split(' ')[0] };
  };

  const displayInfo = getPillarDisplayInfo();
  const IconComponent = (displayInfo ? (PILLAR_ICONS[displayInfo.icon] || Target) : Target) as React.ComponentType<{ size?: number; color?: string }>;

  return (
    <>
      <style>{adminPillarCss}</style>

      <div className="pl-page" style={pageStackStyle}>

        {/* Back Button */}
        <button className="pl-btn" onClick={() => router.push('/admin/pillars')} style={{ alignSelf: 'flex-start' }}>
          <ArrowLeft size={12} /> Back to Pillar Management
        </button>

        {/* Pillar Header — same navy card, blue accent line and PILLAR NN badge the
            pillar list uses, so moving between the two pages doesn't change worlds. */}
        {state.sport && (
          <div style={{ position: 'relative', ...card, padding: '20px', overflow: 'hidden' }}>
            <div style={accentLineStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconChipStyle}>
                  <IconComponent size={18} color={BLUE} />
                </div>
                <div>
                  <span style={badgeStyle}>Pillar {String(state.sport.order).padStart(2, '0')}</span>
                  <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, margin: '8px 0 4px' }}>{state.sport.name}</h1>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Manage skills for this pillar</p>
                </div>
              </div>
              <button className="pl-save" onClick={handleCreate}>
                <Plus size={13} /> Add Skill
              </button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {state.error && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: RED, fontWeight: 600, fontSize: '15px' }}>Error:</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px' }}>{state.error}</span>
            </div>
            <button onClick={() => setState(prev => ({ ...prev, error: null }))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Create/Edit Form */}
        {(state.showCreateForm || state.editingId) && (
          <div style={{ position: 'relative', ...card, padding: '24px', overflow: 'hidden' }}>
            <div style={accentLineStyle} />
            <h2 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>{state.editingId ? 'Edit Skill' : 'Create New Skill'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '0 0 20px' }}>{state.editingId ? 'Update skill information' : 'Add a new skill to this pillar'}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', marginBottom: '16px' }}>
              {[
                { lbl: 'Name', id: 'name', type: 'text', val: formData.name, onChange: (v: string) => setFormData(p => ({ ...p, name: v })), ph: 'Skill name' },
                { lbl: 'Estimated Time (min)', id: 'time', type: 'number', val: String(formData.estimatedTimeToComplete), onChange: (v: string) => setFormData(p => ({ ...p, estimatedTimeToComplete: parseInt(v) || 0 })), ph: '30' },
                { lbl: 'Display Order', id: 'order', type: 'number', val: String(formData.order), onChange: (v: string) => setFormData(p => ({ ...p, order: parseInt(v) || 0 })), ph: '0' },
              ].map(f => (
                <div key={f.id}>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.lbl}</label>
                  <input className="pl-inp" type={f.type} value={f.val} onChange={e => f.onChange(e.target.value)} placeholder={f.ph} />
                </div>
              ))}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulty</label>
                <select className="pl-sel" value={formData.difficulty} onChange={e => setFormData(p => ({ ...p, difficulty: e.target.value as DifficultyLevel }))}>
                  <option value="introduction">Introduction</option>
                  <option value="development">Development</option>
                  <option value="refinement">Refinement</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
              <textarea className="pl-ta" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Skill description..." rows={3} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Learning Objectives (one per line)</label>
              <textarea
                className="pl-ta"
                value={formData.learningObjectives.join('\n')}
                onChange={e => { const objectives = e.target.value.split('\n').filter(l => l.trim() !== ''); setFormData(p => ({ ...p, learningObjectives: objectives })); }}
                placeholder={"Master basic dribbling technique\nUnderstand ball control fundamentals"}
                rows={4}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <HTMLEditorWithAI
                label="Content (HTML)"
                value={formData.content}
                onChange={content => setFormData(p => ({ ...p, content }))}
                placeholder="Enter detailed skill content in HTML format, or use AI to generate professional content..."
                skillName={formData.name}
                description={formData.description}
                difficulty={formData.difficulty}
                objectives={formData.learningObjectives}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags (comma-separated)</label>
              <input className="pl-inp" value={formData.tags.join(', ')} onChange={e => setFormData(p => ({ ...p, tags: e.target.value.split(', ').filter(Boolean) }))} placeholder="fundamentals, technique, basics" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Media Files</label>
              <MediaUpload onUpload={setUploadedFiles} acceptedTypes={['image/*', 'video/*']} maxFiles={10} maxSizePerFile={100} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '16px' }}>
              <input type="checkbox" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: BLUE }} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>Active</span>
            </label>

            <div style={{ background: `rgba(55,181,255,0.07)`, border: `1px solid rgba(55,181,255,0.18)`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0 }}>
                <strong style={{ color: BLUE }}>Note:</strong> Quizzes are managed separately through the Quiz Management section.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="pl-save" onClick={handleSave} disabled={saving || uploading}>
                <Save size={13} /> {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save'}
              </button>
              <button className="pl-btn" onClick={handleCancel} disabled={saving || uploading}>
                <X size={13} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Skills List */}
        <div>
          <h2 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            Skills <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: '13px' }}>({state.skills.length})</span>
          </h2>

          {state.skills.length === 0 ? (
            <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
              <BookOpen size={44} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#fff', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>No skills yet</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '15px', marginBottom: '20px' }}>Start by creating the first skill for this pillar.</p>
              <button className="pl-save" onClick={handleCreate} style={{ margin: '0 auto' }}>
                <Plus size={13} /> Add First Skill
              </button>
            </div>
          ) : (
            <div className="pl-grid-3" style={cardGridStyle}>
              {state.skills.map((skill, index) => {
                const tierColor = TIER_COLORS[skill.difficulty] ?? 'rgba(255,255,255,0.5)';
                return (
                  <div key={skill.id} className="pl-card" style={{ ...card, overflow: 'hidden' }}>
                    {/* zIndex so the hairline still reads when a media header follows it */}
                    <div style={{ ...accentLineStyle, zIndex: 2 }} />
                    {(skill.media?.images?.[0] || skill.media?.videos?.[0]) && (
                      <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#000' }}>
                        {skill.media?.videos?.[0] ? (
                          <>
                            <video src={skill.media.videos[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Play size={32} color="rgba(255,255,255,0.9)" />
                            </div>
                            <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '12px', padding: '2px 7px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Play size={10} /> Video
                            </div>
                          </>
                        ) : skill.media?.images?.[0] ? (
                          <img src={skill.media.images[0].url} alt={skill.media.images[0].title || skill.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : null}
                        {!skill.isActive && (
                          <div style={{ position: 'absolute', top: '8px', right: '8px', background: RED, color: '#fff', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>Inactive</div>
                        )}
                      </div>
                    )}

                    <div style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
                        <span style={badgeStyle}>Skill {String(index + 1).padStart(2, '0')}</span>
                        <span style={tierBadgeStyle(tierColor)}>{skill.difficulty}</span>
                        {!skill.media?.images?.[0] && !skill.media?.videos?.[0] && !skill.isActive && (
                          <span style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)', color: RED, padding: '2px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>Inactive</span>
                        )}
                      </div>
                      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{skill.name}</h3>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: 1.5, marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{skill.description}</p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} />{formatDuration(skill.estimatedTimeToComplete)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Target size={11} />{skill.learningObjectives.length} objectives
                        </span>
                        {skill.hasVideo && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Play size={11} /> Has Video
                          </span>
                        )}
                        {(skill.media?.images?.length ?? 0) > 0 && <span>{skill.media?.images?.length} image{(skill.media?.images?.length ?? 0) > 1 ? 's' : ''}</span>}
                        {(skill.media?.videos?.length ?? 0) > 0 && <span>{skill.media?.videos?.length} video{(skill.media?.videos?.length ?? 0) > 1 ? 's' : ''}</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button className="pl-btn pl-btn-sm pl-edit" onClick={() => handleEdit(skill)} style={{ flex: 1 }}>
                          <Edit size={11} /> Edit
                        </button>
                        <button className="pl-btn pl-btn-sm pl-del" onClick={() => handleDelete(skill.id, skill.name)} style={{ flex: 1 }}>
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {dialog}
      </div>
    </>
  );
}

export default function AdminSkillsPage() {
  return (
    <AdminRoute>
      <AdminSkillsContent />
    </AdminRoute>
  );
}
