'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sport, Skill, DifficultyLevel, PILLARS, PacingLevel } from '@/types';
import { sportsService } from '@/lib/database/services/sports.service';
import { videoQuizService } from '@/lib/database/services/video-quiz.service';
import { onboardingService } from '@/lib/database';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/context';
import { getPillarSlugFromDocId } from '@/lib/utils/pillars';
import { SkeletonPillarDetail } from '@/components/ui/skeletons';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Play, CheckCircle, Loader2, ChevronRight, Zap, TrendingUp, Star,
} from 'lucide-react';

const BLUE = '#37b5ff';

const LEVEL_CONFIG: Record<PacingLevel, { label: string; color: string; tagline: string; range: string; icon: React.ComponentType<{ size?: number; color?: string }>; }> = {
  introduction: { label: 'Introduction', color: BLUE,     tagline: 'Building your foundation', range: '1.0 – 2.2', icon: BookOpen },
  development:  { label: 'Development',  color: '#a78bfa', tagline: 'Growing your skills',       range: '2.2 – 3.1', icon: TrendingUp },
  refinement:   { label: 'Refinement',   color: '#4ade80', tagline: 'Mastering your craft',      range: '3.1 – 4.0', icon: Zap },
};

const DIFFICULTY_ORDER: DifficultyLevel[] = ['introduction', 'development', 'refinement'];

interface SkillProgress { [skillId: string]: { percentage: number; isCompleted: boolean } | null; }

function ScoreBar({ score, level }: { score: number; level: PacingLevel }) {
  const pct = Math.round(((score - 1.0) / 3.0) * 100);
  const cfg = LEVEL_CONFIG[level];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
        <span>1.0</span>
        <span style={{ fontWeight: 700, color: '#fff' }}>{score.toFixed(1)} / 4.0</span>
        <span>4.0</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '99px', background: cfg.color, width: `${pct}%`, transition: 'width 0.7s' }} />
      </div>
    </div>
  );
}

function SkillCard({ skill, pillarId, progress }: {
  skill: Skill; pillarId: string;
  progress: { percentage: number; isCompleted: boolean } | null | undefined;
}) {
  const hasAttempt = progress !== undefined && progress !== null;
  const isCompleted = hasAttempt && progress!.isCompleted;
  const isInProgress = hasAttempt && !isCompleted;

  return (
    <Link href={`/pillars/${pillarId}/skills/${skill.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        style={{ background: 'rgba(2,18,44,0.9)', borderStyle: 'solid', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderTopWidth: '2px', borderLeftColor: isCompleted ? 'rgba(74,222,128,0.3)' : isInProgress ? 'rgba(55,181,255,0.3)' : 'rgba(55,181,255,0.15)', borderRightColor: isCompleted ? 'rgba(74,222,128,0.3)' : isInProgress ? 'rgba(55,181,255,0.3)' : 'rgba(55,181,255,0.15)', borderBottomColor: isCompleted ? 'rgba(74,222,128,0.3)' : isInProgress ? 'rgba(55,181,255,0.3)' : 'rgba(55,181,255,0.15)', borderTopColor: isCompleted ? '#4ade80' : isInProgress ? BLUE : 'rgba(55,181,255,0.3)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }}
        onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)'; }}
        onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
      >
        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          {isCompleted ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '20px', padding: '3px 9px' }}>
              <CheckCircle size={10} /> Completed
            </span>
          ) : isInProgress ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: BLUE, background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '20px', padding: '3px 9px' }}>
              <Play size={10} /> In Progress
            </span>
          ) : null}
        </div>

        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: '8px' }}>{skill.name}</h4>

        {skill.description && (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '10px' }}>
            {skill.description}
          </p>
        )}

        {skill.learningObjectives.length > 0 && (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
            {skill.learningObjectives.slice(0, 2).map((obj, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(55,181,255,0.4)', flexShrink: 0, marginTop: '5px' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obj}</span>
              </li>
            ))}
          </ul>
        )}

        <div style={{ flex: 1 }} />

        {hasAttempt && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Progress</span>
              <span style={{ fontWeight: 800, color: isCompleted ? '#4ade80' : BLUE }}>{Math.round(progress!.percentage)}%</span>
            </div>
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', background: isCompleted ? '#4ade80' : BLUE, width: `${progress!.percentage}%` }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(55,181,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            {skill.estimatedTimeToComplete > 0 && <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>{skill.estimatedTimeToComplete} min</>}
          </div>
          <ChevronRight size={14} color="rgba(55,181,255,0.35)" />
        </div>
      </div>
    </Link>
  );
}

function SkillsGroup({ difficulty, skills, pillarId, userLevel, skillProgress }: {
  difficulty: DifficultyLevel; skills: Skill[]; pillarId: string;
  userLevel: PacingLevel | null; skillProgress: SkillProgress;
}) {
  const cfg = LEVEL_CONFIG[difficulty];
  const Icon = cfg.icon;
  const isUserLevel = userLevel === difficulty;
  const completedCount = skills.filter(s => skillProgress[s.id]?.isCompleted).length;
  if (skills.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isUserLevel ? `${cfg.color}10` : 'rgba(2,18,44,0.7)', border: `1px solid ${isUserLevel ? `${cfg.color}30` : 'rgba(55,181,255,0.12)'}`, borderRadius: '14px', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} color={cfg.color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{cfg.label}</h3>
              {isUserLevel && (
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: cfg.color, background: `${cfg.color}15`, borderRadius: '20px', padding: '2px 8px' }}>Your Level</span>
              )}
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{cfg.tagline}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{skills.length} skills</p>
          {completedCount > 0 && <p style={{ fontSize: '11px', color: '#4ade80', marginTop: '2px' }}>{completedCount} completed</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
        {skills.map(skill => (
          <SkillCard key={skill.id} skill={skill} pillarId={pillarId} progress={skillProgress[skill.id]} />
        ))}
      </div>
    </div>
  );
}

export default function PillarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pillarId = params.id as string;
  const { user } = useAuth();

  const [pillar, setPillar] = useState<Sport | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skillProgress, setSkillProgress] = useState<SkillProgress>({});
  const [userLevel, setUserLevel] = useState<PacingLevel | null>(null);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [levelLoading, setLevelLoading] = useState(false);
  const [showAllLevels, setShowAllLevels] = useState(false);

  useEffect(() => {
    if (!pillarId) return;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const [pillarResult, skillsResult] = await Promise.all([
          sportsService.getSport(pillarId),
          sportsService.getSkillsBySport(pillarId),
        ]);
        if (!pillarResult.success || !pillarResult.data) {
          setError(pillarResult.error?.message || 'Pillar not found');
        } else {
          setPillar(pillarResult.data);
          setSkills(skillsResult.data?.items || []);
        }
      } catch { setError('An unexpected error occurred'); }
      finally { setLoading(false); }
    };
    load();
  }, [pillarId]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLevelLoading(true);
      try {
        const baselineSnap = await getDoc(doc(db, 'studentBaselineProfiles', user.id));
        const baselineProfile = baselineSnap.exists() ? baselineSnap.data()?.intelligenceProfile : null;
        if (baselineProfile) {
          setUserLevel(baselineProfile.pacingLevel);
          setUserScore(baselineProfile.overallScore);
          return;
        }
        const result = await onboardingService.getEvaluation(user.id);
        if (result.success && result.data?.intelligenceProfile) {
          setUserLevel(result.data.intelligenceProfile.pacingLevel);
          setUserScore(result.data.intelligenceProfile.overallScore);
        } else if (result.success && result.data?.pacingLevel) {
          setUserLevel(result.data.pacingLevel);
        }
      } catch { /* non-blocking */ }
      finally { setLevelLoading(false); }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user || !skills.length) return;
    const load = async () => {
      const map: SkillProgress = {};
      await Promise.all(skills.map(async skill => {
        try {
          const res = await videoQuizService.getUserVideoQuizAttempts(user.id, { skillId: skill.id, completed: true, limit: 1 });
          map[skill.id] = (res.success && res.data?.items?.length)
            ? { percentage: res.data.items[0].percentage, isCompleted: res.data.items[0].isCompleted }
            : null;
        } catch { map[skill.id] = null; }
      }));
      setSkillProgress(map);
    };
    load();
  }, [user, skills]);

  if (loading) return <SkeletonPillarDetail />;

  if (error || !pillar) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #000f28 0%, #062344 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '16px', padding: '32px', textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{error || 'Pillar not found'}</p>
          <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            <ArrowLeft size={14} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const slug = getPillarSlugFromDocId(pillar.id);
  void (slug ? PILLARS.find(x => x.slug === slug) : null);

  const displayedSkills = (userLevel && !showAllLevels) ? skills.filter(s => s.difficulty === userLevel) : skills;
  const skillsByDifficulty: Record<DifficultyLevel, Skill[]> = {
    introduction: displayedSkills.filter(s => s.difficulty === 'introduction'),
    development:  displayedSkills.filter(s => s.difficulty === 'development'),
    refinement:   displayedSkills.filter(s => s.difficulty === 'refinement'),
  };
  const completedTotal = displayedSkills.filter(s => skillProgress[s.id]?.isCompleted).length;
  const progressPct = displayedSkills.length > 0 ? Math.round((completedTotal / displayedSkills.length) * 100) : 0;
  const orderedDifficulties = (userLevel && !showAllLevels) ? [userLevel] as DifficultyLevel[] : DIFFICULTY_ORDER;
  const levelCfg = userLevel ? LEVEL_CONFIG[userLevel] : null;

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ padding: '20px 24px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', borderRadius: '20px', background: 'rgba(2,18,44,0.9)', border: '1.5px solid rgba(55,181,255,0.25)', padding: 'clamp(16px,3vw,28px) clamp(16px,4vw,32px)', overflow: 'hidden', boxShadow: '0 0 60px rgba(55,181,255,0.08)' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '50%', height: '1px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />

          <button onClick={() => router.push('/pillars')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '20px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
            <ArrowLeft size={14} /> All Pillars
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '12px' }}>
                {pillar.name}
              </h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: '560px', marginBottom: '16px' }}>
                {pillar.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <BookOpen size={13} /> {skills.length} skills
                </span>
                {user && completedTotal > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4ade80' }}>
                    <CheckCircle size={13} /> {completedTotal} completed
                  </span>
                )}
              </div>

              {user && skills.length > 0 && (
                <div style={{ maxWidth: '360px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
                    <span>Your progress</span>
                    <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{progressPct}%</span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: BLUE, borderRadius: '99px', width: `${progressPct}%`, transition: 'width 0.7s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Level Panel */}
            {user && (
              <div style={{ width: '240px', flexShrink: 0 }}>
                {levelLoading ? (
                  <div style={{ background: 'rgba(55,181,255,0.07)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '14px', padding: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading your level…
                  </div>
                ) : userLevel && levelCfg ? (
                  <div style={{ background: 'rgba(55,181,255,0.07)', border: `1px solid ${levelCfg.color}30`, borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.5)' }}>Your Level</p>
                      <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: levelCfg.color, background: `${levelCfg.color}18`, borderRadius: '20px', padding: '3px 9px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingUp size={10} /> {levelCfg.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{levelCfg.tagline}</p>
                    {userScore !== null && <ScoreBar score={userScore} level={userLevel} />}
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                      Score range: <span style={{ fontWeight: 700, color: '#fff' }}>{levelCfg.range}</span>
                    </p>
                    <div style={{ background: 'rgba(55,181,255,0.1)', border: `1px solid ${levelCfg.color}25`, borderRadius: '10px', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                      {skillsByDifficulty[userLevel].length} skills at your level — <span style={{ fontWeight: 900, color: levelCfg.color }}>start here</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(55,181,255,0.07)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>Your Level</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                      Complete your onboarding assessment to see your recommended level.
                    </p>
                    <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#000f28', background: BLUE, borderRadius: '8px', padding: '8px 14px', textDecoration: 'none' }}>
                      Take Assessment <ChevronRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Skills ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(14px,4vw,24px) 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
            Skills{' '}
            <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>
              ({displayedSkills.length}{showAllLevels && userLevel ? ` — ${skills.filter(s => s.difficulty === userLevel).length} at your level` : ''})
            </span>
          </h2>
          {userLevel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {!showAllLevels && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  <Star size={13} color="#fbbf24" />
                  Showing: <span style={{ fontWeight: 700, color: '#fff' }}>{userLevel.charAt(0).toUpperCase() + userLevel.slice(1)}</span>
                </div>
              )}
              <button
                onClick={() => setShowAllLevels(v => !v)}
                style={{ fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', border: `1px solid ${showAllLevels ? BLUE : 'rgba(255,255,255,0.15)'}`, background: showAllLevels ? 'rgba(55,181,255,0.1)' : 'rgba(255,255,255,0.04)', color: showAllLevels ? BLUE : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.18s' }}
              >
                {showAllLevels ? 'My Level Only' : 'Show All Levels'}
              </button>
            </div>
          )}
        </div>

        {showAllLevels && userLevel && levelCfg && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: `${levelCfg.color}0d`, border: `1px solid ${levelCfg.color}28`, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={14} color={levelCfg.color} />
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              You&apos;re viewing all difficulty levels. Skills marked{' '}
              <span style={{ fontWeight: 700, color: levelCfg.color }}>Your Level</span>{' '}
              match your assessed <span style={{ fontWeight: 700, color: '#fff' }}>{levelCfg.label}</span> level — start there.
            </p>
          </div>
        )}

        {displayedSkills.length === 0 ? (
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.15)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
            <BookOpen size={36} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Skills coming soon</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Content for this pillar is being added.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {orderedDifficulties.map(difficulty => (
              <SkillsGroup
                key={difficulty}
                difficulty={difficulty}
                skills={skillsByDifficulty[difficulty]}
                pillarId={pillarId}
                userLevel={userLevel}
                skillProgress={skillProgress}
              />
            ))}
          </div>
        )}
      </section>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
