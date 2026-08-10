'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { parentLinkService } from '@/lib/database';
import { LinkedChildSummary, ParentCrossReferenceView, PerceptionComparison } from '@/types';
import { CrossReferenceDisplay } from '@/components/parent';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import { GoalieChartingHistory } from '@/components/charting/GoalieChartingHistory';
import {
  AlertCircle, ChevronLeft, TrendingUp, Award, Flame, Calendar,
  ClipboardCheck, BarChart3, Scale, LineChart, BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { redirect, useParams, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { enrollmentService } from '@/lib/database/services/enrollment.service';
import { onboardingService } from '@/lib/database/services/onboarding.service';
import { compareGoalieAndParent, DEFAULT_CROSS_REFERENCE_RULES } from '@/lib/scoring/cross-reference-engine';
import { scaleToPercentage } from '@/lib/scoring/scale-score';
import { PILLARS, GOALIE_CATEGORIES } from '@/types';
import { getPillarSlugFromDocId } from '@/lib/utils/pillars';

const BLUE = '#37b5ff';
const cardBg = 'rgba(2,18,44,0.82)';
const border = '1px solid rgba(55,181,255,0.18)';

type ChildIntelligenceProfile = {
  overallScore: number;
  pacingLevel: string;
  identifiedStrengths: Array<{ categoryName: string; score: number }>;
  identifiedGaps: Array<{ categoryName: string; score: number; priority?: string }>;
  categoryScores: Array<{ categorySlug: string; categoryName: string; averageScore: number; weight: number }>;
};

const TABS = [
  { id: 'charting', label: 'Game Charts', icon: LineChart },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'comparison', label: 'Perception', icon: Scale },
];

export default function ChildDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const childId = params.childId as string;

  const [childData, setChildData] = useState<LinkedChildSummary | null>(null);
  const [crossReferenceData, setCrossReferenceData] = useState<ParentCrossReferenceView | null>(null);
  const [enrollments, setEnrollments] = useState<{ sport: { id: string; name: string }; progress: { totalSkills: number; completedSkills: string[]; progressPercentage: number; status: string } }[]>([]);
  const [goalieProfile, setGoalieProfile] = useState<ChildIntelligenceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'charting');

  useEffect(() => {
    if (!user || !childId) return;
    const loadChildData = async () => {
      try {
        setLoading(true);
        setError(null);
        const isLinked = await parentLinkService.isLinked(user.id, childId);
        if (!isLinked) { setError('You are not linked to this goalie'); return; }
        const [childrenResult, enrollmentsResult, goalieEvalResult, parentEvalResult] = await Promise.allSettled([
          parentLinkService.getLinkedChildren(user.id),
          enrollmentService.getUserEnrolledSports(childId),
          onboardingService.getEvaluation(childId),
          onboardingService.getParentEvaluation(user.id),
        ]);

        if (childrenResult.status === 'fulfilled' && childrenResult.value.success && childrenResult.value.data) {
          const child = childrenResult.value.data.find(c => c.childId === childId);
          if (child) {
            setChildData(child);

            const goalieAssessmentComplete = child.hasCompletedAssessment || false;
            const parentAssessmentComplete = user.parentOnboardingComplete || false;

            // Build real perception comparisons from assessment responses
            let comparisons: PerceptionComparison[] = [];
            let overallAlignmentScore = 0;
            let criticalGapsCount = 0;
            let strengthAlignmentsCount = 0;

            const goalieResponses = goalieEvalResult.status === 'fulfilled' && goalieEvalResult.value.success
              ? goalieEvalResult.value.data?.assessmentResponses ?? []
              : [];
            const parentResponses = parentEvalResult.status === 'fulfilled' && parentEvalResult.value.success
              ? parentEvalResult.value.data?.assessmentResponses ?? []
              : [];

            if (goalieResponses.length > 0 && parentResponses.length > 0) {
              const flags = compareGoalieAndParent(goalieResponses, parentResponses, DEFAULT_CROSS_REFERENCE_RULES);

              // Map flags → PerceptionComparison[]
              comparisons = flags.map((flag): PerceptionComparison => {
                const rule = DEFAULT_CROSS_REFERENCE_RULES.find(
                  r => r.goalieQuestionId === flag.goalieQuestionId && r.parentQuestionId === flag.parentQuestionId
                );
                const alignmentLevel: PerceptionComparison['alignmentLevel'] =
                  flag.type === 'alignment' ? 'aligned'
                  : flag.severity === 'high' ? 'significant_gap'
                  : 'minor_gap';
                return {
                  categorySlug: rule?.id ?? `${flag.goalieQuestionId}-${flag.parentQuestionId ?? flag.coachQuestionId}`,
                  categoryName: rule?.name
                    ?? GOALIE_CATEGORIES.find(c => c.slug === flag.type)?.shortName
                    ?? flag.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                  goalieScore: flag.goalieScore,
                  parentScore: flag.parentScore,
                  scoreDifference: flag.scoreDifference,
                  alignmentLevel,
                  description: flag.description,
                  recommendation: flag.recommendation,
                };
              });

              const aligned = comparisons.filter(c => c.alignmentLevel === 'aligned').length;
              const total = comparisons.length;
              overallAlignmentScore = total > 0 ? Math.round((aligned / total) * 100) : 0;
              criticalGapsCount = comparisons.filter(c => c.alignmentLevel === 'significant_gap').length;
              strengthAlignmentsCount = aligned;
            }

            setCrossReferenceData({
              childId,
              childName: child.displayName,
              goalieAssessmentComplete,
              parentAssessmentComplete,
              comparisons,
              overallAlignmentScore,
              criticalGapsCount,
              strengthAlignmentsCount,
              lastUpdated: new Date(),
            });
          } else { setError('Goalie not found'); }
        }

        if (enrollmentsResult.status === 'fulfilled' && enrollmentsResult.value.success && enrollmentsResult.value.data) {
          setEnrollments(enrollmentsResult.value.data as typeof enrollments);
        }

        // Fetch baseline intelligence profile
        try {
          const baselineSnap = await getDoc(doc(db, 'studentBaselineProfiles', childId));
          if (baselineSnap.exists()) {
            const data = baselineSnap.data();
            if (data?.intelligenceProfile) setGoalieProfile(data.intelligenceProfile as ChildIntelligenceProfile);
          }
        } catch {
          // Profile may not exist for all students
        }
      } catch (err) {
        console.error('Failed to load child data:', err);
        setError('Failed to load goalie data');
      } finally { setLoading(false); }
    };
    loadChildData();
  }, [user, childId]);

  if (authLoading || loading) return <SkeletonDarkPage />;
  if (!user) { redirect('/auth/login'); }

  const ErrorCard = ({ title, msg }: { title: string; msg: string }) => (
    <div style={{ maxWidth: '560px', margin: '40px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '16px', padding: '20px', display: 'flex', gap: '12px' }}>
        <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ color: '#f87171', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{title}</p>
          <p style={{ color: 'rgba(248,113,113,0.7)', fontSize: '13px' }}>{msg}</p>
        </div>
      </div>
      <Link href="/parent/goalies" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
        <ChevronLeft size={16} /> Back
      </Link>
    </div>
  );

  if (user.role !== 'parent') return <ErrorCard title="Access Denied" msg="This page is only available for parent accounts." />;
  if (error) return <ErrorCard title="Error" msg={error} />;
  if (!childData) return <ErrorCard title="Not Found" msg="Could not find the goalie you're looking for." />;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const PACING_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    beginner: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'Introduction' },
    introduction: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'Introduction' },
    intermediate: { bg: `rgba(55,181,255,0.12)`, color: BLUE, label: 'Development' },
    development: { bg: `rgba(55,181,255,0.12)`, color: BLUE, label: 'Development' },
    advanced: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Refinement' },
    refinement: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Refinement' },
  };

  const pacing = childData.pacingLevel ? PACING_COLORS[childData.pacingLevel] : null;

  const stats = [
    { label: 'Progress', value: `${Math.round(childData.progressPercentage || 0)}%`, icon: TrendingUp, isProgress: true },
    { label: 'Quizzes', value: String(childData.quizzesCompleted || 0), sub: 'Completed', icon: Award },
    { label: 'Streak', value: String(childData.currentStreak || 0), sub: `${childData.currentStreak === 1 ? 'Day' : 'Days'}`, icon: Flame },
    {
      label: 'Last Active',
      value: childData.lastActiveAt ? childData.lastActiveAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never',
      sub: childData.lastActiveAt ? childData.lastActiveAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
      icon: Calendar,
    },
  ];

  return (
    <>
      <style>{`
        .cd-back:hover { color: ${BLUE} !important; background: rgba(55,181,255,0.08) !important; }
        .cd-tab:hover { background: rgba(55,181,255,0.06) !important; }
        .cd-assess:hover { opacity: 0.9 !important; transform: translateY(-1px) !important; }
        .cd-assess { transition: all 0.2s !important; }
        @media (min-width: 640px) { .child-stats-grid { grid-template-columns: repeat(4, 1fr) !important; } }
      `}</style>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Back */}
        <Link href="/parent/goalies" className="cd-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, borderRadius: '8px', padding: '6px 10px', width: 'fit-content', transition: 'all 0.2s' }}>
          <ChevronLeft size={16} /> Back
        </Link>

        {/* Child Header Card */}
        <div style={{ position: 'relative', background: cardBg, border, borderRadius: '20px', padding: '24px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid rgba(55,181,255,0.3)`, fontSize: '22px', fontWeight: 800, color: '#000f28' }}>
              {childData.profileImage
                ? <img src={childData.profileImage} alt={childData.displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : getInitials(childData.displayName)
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '22px' }}>{childData.displayName}</h1>
                {pacing && (
                  <span style={{ background: pacing.bg, color: pacing.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{pacing.label}</span>
                )}
                {goalieProfile && (
                  <span style={{ color: pacing?.color ?? BLUE, fontWeight: 800, fontSize: '15px' }}>
                    {goalieProfile.overallScore.toFixed(1)}<span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: '12px' }}>/4.0</span>
                  </span>
                )}
              </div>
              {childData.studentNumber && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: 'monospace', marginBottom: '6px' }}>ID: {childData.studentNumber}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  <Calendar size={13} /> Linked: {childData.linkedAt.toLocaleDateString()}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
                  {childData.relationship}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Profile Card */}
        {goalieProfile && (() => {
          const PACING_META: Record<string, { color: string; label: string; description: string }> = {
            introduction: { color: '#fbbf24', label: 'Introduction', description: 'Building foundational goalie knowledge and habits.' },
            development: { color: BLUE, label: 'Development', description: 'Developing core skills and game understanding.' },
            refinement: { color: '#22c55e', label: 'Refinement', description: 'Refining advanced techniques and mental performance.' },
          };
          const pm = PACING_META[goalieProfile.pacingLevel] || PACING_META.introduction;
          const barPct = scaleToPercentage(goalieProfile.overallScore, 4, 1) ?? 0;
          const topStrength = goalieProfile.identifiedStrengths?.[0];
          const topGap = goalieProfile.identifiedGaps?.[0];
          return (
            <div style={{ position: 'relative', background: cardBg, border, borderRadius: '16px', padding: '18px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${pm.color}88, transparent)` }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Baseline Assessment Profile</p>
                <span style={{ background: `${pm.color}18`, border: `1px solid ${pm.color}30`, color: pm.color, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{pm.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: 900, color: pm.color, lineHeight: 1 }}>{goalieProfile.overallScore.toFixed(1)}</span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>/4.0</span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px', fontStyle: 'italic' }}>{pm.description}</span>
              </div>
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.07)', borderRadius: '99px', overflow: 'hidden', marginBottom: '4px' }}>
                <div style={{ height: '100%', width: `${barPct}%`, background: pm.color, borderRadius: '99px', boxShadow: `0 0 8px ${pm.color}55` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 600, marginBottom: '12px' }}>
                <span>Introduction</span><span>Development</span><span>Refinement</span>
              </div>
              {(topStrength || topGap) && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {topStrength && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                        Strength: <strong style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 600 }}>{topStrength.categoryName}</strong>
                      </span>
                    </div>
                  )}
                  {topGap && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                        Focus area: <strong style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 600 }}>{topGap.categoryName}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }} className="child-stats-grid">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{ position: 'relative', background: cardBg, border, borderRadius: '14px', padding: '16px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 600, marginBottom: '10px' }}>
                  <Icon size={13} /> {s.label}
                </div>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>{s.value}</p>
                {s.isProgress ? (
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(childData.progressPercentage || 0)}%`, background: `linear-gradient(90deg, ${BLUE}, #0ea5e9)`, borderRadius: '2px' }} />
                  </div>
                ) : s.sub ? (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{s.sub}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{ background: cardBg, border, borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} className={!active ? 'cd-tab' : ''} onClick={() => setActiveTab(tab.id)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '14px 8px', background: active ? 'rgba(55,181,255,0.1)' : 'transparent', border: 'none', borderBottom: active ? `2px solid ${BLUE}` : '2px solid transparent', color: active ? BLUE : 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '20px' }}>
            {/* Perception Comparison */}
            {activeTab === 'comparison' && (
              crossReferenceData ? (
                <CrossReferenceDisplay data={crossReferenceData} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <ClipboardCheck size={44} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>No Comparison Data</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', maxWidth: '360px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                    Complete your parent assessment to see how your perceptions compare with your goalie's self-assessment.
                  </p>
                  <Link href="/onboarding?role=parent" className="cd-assess" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', padding: '11px 22px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}>
                    Take Parent Assessment
                  </Link>
                </div>
              )
            )}

            {/* Charting */}
            {activeTab === 'charting' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Game & Practice Charting</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    Review how {childData.displayName.split(' ')[0]} is reflecting on each session — mind management, performance, and what they&apos;re saving to their Mind Vault.
                  </p>
                </div>
                <GoalieChartingHistory studentId={childId} />
              </div>
            )}

            {/* Progress */}
            {activeTab === 'progress' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Pillar Progress</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    {childData.displayName.split(' ')[0]}&apos;s progress across each training pillar.
                  </p>
                </div>

                {enrollments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                    <BookOpen size={36} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No pillars started yet.</p>
                  </div>
                ) : (
                  enrollments.map(({ sport, progress }) => {
                    const slug = getPillarSlugFromDocId(sport.id);
                    const info = slug ? PILLARS.find(p => p.slug === slug) : null;
                    const pct = Math.round(progress.progressPercentage);
                    // Label color by performance; bar always uses solid blue
                    const labelColor = pct >= 80 ? '#4ade80' : pct >= 40 ? BLUE : 'rgba(255,255,255,0.55)';
                    const barColor = pct >= 80 ? '#4ade80' : BLUE;

                    return (
                      <div key={sport.id} style={{ background: 'rgba(55,181,255,0.04)', border: '1px solid rgba(55,181,255,0.1)', borderRadius: '14px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {info?.shortName || sport.name}
                          </p>
                          <span style={{ fontSize: '16px', fontWeight: 900, color: labelColor, flexShrink: 0, marginLeft: '12px' }}>{pct}%</span>
                        </div>
                        {/* Track */}
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                          {/* Fill — always solid, width drives the visual */}
                          <div style={{
                            height: '100%',
                            borderRadius: '99px',
                            width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`,
                            background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                            boxShadow: pct > 0 ? `0 0 10px ${barColor}66` : 'none',
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                          {progress.completedSkills.length} / {progress.totalSkills} skills · {progress.status === 'completed' ? '✓ Complete' : progress.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                        </p>
                      </div>
                    );
                  })
                )}

                {/* Summary row */}
                {enrollments.length > 0 && (
                  <div style={{ background: `${BLUE}0a`, border: `1px solid ${BLUE}25`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>{enrollments.length}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Pillars</p>
                    </div>
                    <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>
                        {enrollments.reduce((s, e) => s + e.progress.completedSkills.length, 0)}
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Skills Done</p>
                    </div>
                    <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '22px', fontWeight: 900, color: BLUE }}>
                        {Math.round(enrollments.reduce((s, e) => s + e.progress.progressPercentage, 0) / enrollments.length)}%
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Avg Progress</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
