'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, TrendingUp, Plus, Brain, Target, Zap, Lightbulb } from 'lucide-react';
import { onboardingService } from '@/lib/database';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { IntelligenceProfile, GapAnalysis, StrengthAnalysis, ContentRecommendation } from '@/types';
import { getPacingLevelDisplayText, GOALIE_CATEGORIES } from '@/types';
import { getRecommendedPillarsFromGaps, type PillarRecommendation } from '@/lib/utils/category-pillar-mapping';
import { getPillarByDocId } from '@/lib/utils/pillars';

const BLUE = '#37b5ff';
const PURPLE = '#a78bfa';
const GREEN = '#4ade80';
const YELLOW = '#fbbf24';
const RED = '#f87171';

const PRIORITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  high:   { color: RED,    bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)' },
  medium: { color: YELLOW, bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)' },
  low:    { color: BLUE,   bg: 'rgba(55,181,255,0.08)',  border: 'rgba(55,181,255,0.2)' },
};

const PACING_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  refinement:   { color: PURPLE, bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  development:  { color: BLUE,   bg: 'rgba(55,181,255,0.12)',  border: 'rgba(55,181,255,0.3)' },
  introduction: { color: GREEN,  bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.25)' },
};

const card: React.CSSProperties = { background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '14px', overflow: 'hidden' };
const sectionHeader: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid rgba(55,181,255,0.08)' };

interface Props {
  studentId: string;
  onAddContentForPillar?: (pillarId: string, pillarName: string) => void;
}

export function StudentIntelligenceSidebar({ studentId, onAddContentForPillar }: Props) {
  const [profile, setProfile] = useState<IntelligenceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<PillarRecommendation[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const baselineSnap = await getDoc(doc(db, 'studentBaselineProfiles', studentId));
        const baselineProfile = baselineSnap.exists() ? baselineSnap.data()?.intelligenceProfile : null;
        if (baselineProfile) {
          const p = baselineProfile as IntelligenceProfile;
          setProfile(p);
          setRecommendations(getRecommendedPillarsFromGaps(p.identifiedGaps));
          return;
        }
        const result = await onboardingService.getEvaluation(studentId);
        if (result.success && result.data?.intelligenceProfile) {
          const p = result.data.intelligenceProfile;
          setProfile(p);
          setRecommendations(getRecommendedPillarsFromGaps(p.identifiedGaps));
        }
      } catch (err) {
        console.error('Failed to load intelligence profile:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studentId]);

  if (loading) {
    return (
      <>
        <style>{`@keyframes si-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ ...card, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Loader2 size={18} color="rgba(255,255,255,0.3)" style={{ animation: 'si-spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Loading profile…</p>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <div style={{ ...card, padding: '28px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Brain size={22} color={YELLOW} />
        </div>
        <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Assessment Not Completed</p>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px', lineHeight: 1.6 }}>
          Gaps and recommendations will appear here after the goalie completes their assessment.
        </p>
      </div>
    );
  }

  const pacingStyle = PACING_STYLE[profile.pacingLevel] || PACING_STYLE.introduction;
  const scoreColor = profile.overallScore >= 3.1 ? GREEN : profile.overallScore >= 2.2 ? BLUE : YELLOW;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Assessment Profile */}
      <div style={card}>
        <div style={sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={14} color={BLUE} />
            <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>Assessment Profile</p>
          </div>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '32px', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{profile.overallScore.toFixed(1)}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginLeft: '4px' }}>/ 4.0</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: pacingStyle.color, background: pacingStyle.bg, border: `1px solid ${pacingStyle.border}`, borderRadius: '20px', padding: '4px 10px' }}>
              {getPacingLevelDisplayText(profile.pacingLevel)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {profile.categoryScores.map((cat) => {
              const barColor = cat.averageScore >= 3.0 ? GREEN : cat.averageScore >= 2.0 ? BLUE : YELLOW;
              const pct = ((cat.averageScore - 1) / 3) * 100;
              const categoryName = GOALIE_CATEGORIES.find(c => c.slug === cat.categorySlug)?.shortName
                ?? cat.categorySlug.replace(/_/g, ' ');
              return (
                <div key={cat.categorySlug}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                      {categoryName}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: barColor }}>{cat.averageScore.toFixed(1)}</span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '99px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Identified Gaps */}
      {profile.identifiedGaps.length > 0 && (
        <div style={card}>
          <div style={sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={14} color={RED} />
              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                Growth Areas <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>({profile.identifiedGaps.length})</span>
              </p>
            </div>
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {profile.identifiedGaps.map((gap: GapAnalysis) => {
              const s = PRIORITY_STYLE[gap.priority] || PRIORITY_STYLE.low;
              return (
                <div key={gap.categorySlug} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: '12px', fontWeight: 700, marginBottom: '2px', textTransform: 'capitalize' }}>{gap.categoryName}</p>
                    <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px' }}>Score: {gap.score.toFixed(1)}</p>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: s.color, background: `${s.color}20`, border: `1px solid ${s.color}40`, borderRadius: '20px', padding: '2px 8px' }}>
                    {gap.priority}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths */}
      {profile.identifiedStrengths.length > 0 && (
        <div style={card}>
          <div style={sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={14} color={GREEN} />
              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                Strengths <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>({profile.identifiedStrengths.length})</span>
              </p>
            </div>
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {profile.identifiedStrengths.map((s: StrengthAnalysis) => (
              <div key={s.categorySlug} style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{s.categoryName}</span>
                <span style={{ color: GREEN, fontSize: '13px', fontWeight: 800 }}>{s.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Pillars */}
      {recommendations.length > 0 && onAddContentForPillar && (
        <div style={card}>
          <div style={sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={14} color={PURPLE} />
              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>Recommended Pillars</p>
            </div>
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recommendations.map((rec) => {
              const pillarInfo = getPillarByDocId(rec.pillarId);
              return (
                <div key={rec.pillarSlug} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pillarInfo?.name || rec.pillarSlug}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.reasons[0]}</p>
                  </div>
                  <button
                    onClick={() => onAddContentForPillar(rec.pillarId, pillarInfo?.name || rec.pillarSlug)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', color: BLUE, fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(55,181,255,0.2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(55,181,255,0.1)'; }}
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Suggestions — from intelligence profile contentRecommendations */}
      {profile.contentRecommendations && profile.contentRecommendations.length > 0 && (
        <div style={card}>
          <div style={sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={14} color={YELLOW} />
              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                Content Suggestions{' '}
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>({profile.contentRecommendations.length})</span>
              </p>
            </div>
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile.contentRecommendations.map((rec: ContentRecommendation, i: number) => {
              const s = PRIORITY_STYLE[rec.priority] || PRIORITY_STYLE.low;
              // Map contentArea to a recommendation to pass to onAddContentForPillar.
              // We surface the area name and suggested modules so the coach can search the library.
              const pillarRec = recommendations.find(r =>
                r.reasons.some(reason => reason.toLowerCase().includes(rec.contentArea.toLowerCase()))
              );
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <p style={{ color: '#fff', fontSize: '12px', fontWeight: 700, textTransform: 'capitalize' }}>
                          {rec.contentArea.replace(/_/g, ' ')}
                        </p>
                        <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: s.color, background: `${s.color}20`, border: `1px solid ${s.color}40`, borderRadius: '20px', padding: '2px 7px', flexShrink: 0 }}>
                          {rec.priority}
                        </span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', lineHeight: 1.5, marginBottom: rec.suggestedModules && rec.suggestedModules.length > 0 ? '8px' : 0 }}>
                        {rec.reason}
                      </p>
                      {rec.suggestedModules && rec.suggestedModules.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {rec.suggestedModules.map((mod, j) => (
                            <span key={j} style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '2px 7px' }}>
                              {mod}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {onAddContentForPillar && pillarRec && (
                      <button
                        onClick={() => onAddContentForPillar(pillarRec.pillarId, rec.contentArea.replace(/_/g, ' '))}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.2)', color: BLUE, fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(55,181,255,0.18)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(55,181,255,0.08)'; }}
                      >
                        <Plus size={11} /> Find
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charting Focus Areas */}
      {profile.chartingEmphasis && profile.chartingEmphasis.length > 0 && (
        <div style={card}>
          <div style={sectionHeader}>
            <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>Charting Focus Areas</p>
          </div>
          <div style={{ padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {profile.chartingEmphasis.map((area) => (
              <span key={area} style={{ fontSize: '11px', fontWeight: 600, color: RED, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '20px', padding: '3px 10px' }}>
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
