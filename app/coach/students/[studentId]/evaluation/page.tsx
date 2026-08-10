'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, ArrowLeft, Heart, Brain, Clock, Target, MessageCircle,
  Dumbbell, BookOpen, Save, CheckCircle, TrendingUp, AlertCircle,
  LucideIcon, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonContentPage } from '@/components/ui/skeletons';
import { userService, onboardingService } from '@/lib/database';
import { scaleToPercentage } from '@/lib/scoring/scale-score';
import {
  User, OnboardingEvaluation, PacingLevel, GoalieCategorySlug,
  getPacingLevelDisplayText, GOALIE_CATEGORIES, CategoryScoreResult, AssessmentResponse,
} from '@/types';
import { GOALIE_ASSESSMENT_QUESTIONS } from '@/data/goalie-assessment-questions';
import { toast } from 'sonner';

const BLUE   = '#37b5ff';
const GREEN  = '#22c55e';
const GOLD   = '#D4A93B';
const YELLOW = '#fbbf24';
const RED    = '#f87171';
const cardBg = 'linear-gradient(135deg, #04213f 0%, #0a2d52 100%)';
const border = '1px solid rgba(55,181,255,0.22)';

const categoryIcons: Record<GoalieCategorySlug, LucideIcon> = {
  feelings: Heart, knowledge: Brain, pre_game: Clock, in_game: Target,
  post_game: MessageCircle, training: Dumbbell, learning: BookOpen,
};

const pacingOptions: PacingLevel[] = ['introduction', 'development', 'refinement'];

function toDate(timestamp: unknown): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof (timestamp as { toDate: unknown }).toDate === 'function') return (timestamp as { toDate: () => Date }).toDate();
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    const raw = (timestamp as { seconds: number }).seconds;
    // If value exceeds year 2200 in seconds it was stored in milliseconds — use directly
    const ms = raw > 7_258_118_400 ? raw : raw * 1000;
    return new Date(ms);
  }
  if (timestamp instanceof Date) return timestamp;
  return null;
}

function formatIntakeValue(value: string): string {
  const overrides: Record<string, string> = {
    house_league: 'House League',
    less_than_1_season: 'Less than 1 season',
    'reason-struggling': 'Struggling',
    'reason-improve': 'Looking to Improve',
    'reason-fun': 'Playing for Fun',
    aaa: 'AAA',
    aa: 'AA',
  };
  return overrides[value] ?? value.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmt(score: number) { return score.toFixed(1); }

function getScoreStyle(score: number): { color: string; bar: string } {
  if (score >= 3.1) return { color: GREEN, bar: GREEN };
  if (score >= 2.2) return { color: BLUE, bar: BLUE };
  return { color: YELLOW, bar: YELLOW };
}

function getQuestionById(questionId: string) { return GOALIE_ASSESSMENT_QUESTIONS.find(q => q.id === questionId); }

function getSelectedOptionText(questionId: string, optionId: string | string[]): string {
  const question = getQuestionById(questionId);
  if (!question) return 'Unknown';
  const optionIds = Array.isArray(optionId) ? optionId : [optionId];
  return optionIds.map(id => question.options.find(opt => opt.id === id)?.text || 'Unknown').join(', ');
}

export default function CoachEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const { user: coach } = useAuth();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<User | null>(null);
  const [evaluation, setEvaluation] = useState<OnboardingEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [adjustedPacingLevel, setAdjustedPacingLevel] = useState<PacingLevel | ''>('');
  const [showResponses, setShowResponses] = useState(false);

  const responsesByCategory = useMemo(() => {
    if (!evaluation?.assessmentResponses) return {};
    const grouped: Record<string, AssessmentResponse[]> = {};
    evaluation.assessmentResponses.forEach(response => {
      if (!grouped[response.categorySlug]) grouped[response.categorySlug] = [];
      grouped[response.categorySlug].push(response);
    });
    Object.values(grouped).forEach(responses => responses.sort((a, b) => a.questionCode.localeCompare(b.questionCode)));
    return grouped;
  }, [evaluation?.assessmentResponses]);

  const totalResponses = evaluation?.assessmentResponses?.length || 0;

  useEffect(() => {
    if (studentId && coach?.id) loadData();
  }, [studentId, coach?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const studentResult = await userService.getUser(studentId);
      if (!studentResult.success || !studentResult.data) { toast.error('Goalie not found'); router.push('/coach/students'); return; }
      if (coach?.role !== 'admin' && coach?.role !== 'coach') { toast.error('Unauthorized'); router.push('/coach/students'); return; }
      setStudent(studentResult.data);
      const evalResult = await onboardingService.getEvaluation(studentId);
      if (evalResult.success && evalResult.data) {
        setEvaluation(evalResult.data);
        if (evalResult.data.coachReview) { setNotes(evalResult.data.coachReview.notes || ''); setAdjustedPacingLevel(evalResult.data.coachReview.adjustedPacingLevel || ''); }
      }
    } catch (error) { console.error('Failed to load data:', error); toast.error('Failed to load evaluation data'); }
    finally { setLoading(false); }
  };

  const handleSaveReview = async () => {
    if (!evaluation || !coach?.id || !coach?.displayName) return;
    try {
      setSaving(true);
      const result = await onboardingService.addCoachReview({ evaluationId: evaluation.id, coachId: coach.id, coachName: coach.displayName, notes, adjustedPacingLevel: adjustedPacingLevel || undefined });
      if (result.success) { toast.success('Review saved successfully'); loadData(); }
      else toast.error(result.error?.message || 'Failed to save review');
    } catch (error) { console.error('Failed to save review:', error); toast.error('Failed to save review'); }
    finally { setSaving(false); }
  };

  if (loading) return <SkeletonContentPage />;
  if (!student) return null;

  if (!evaluation) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Link href="/coach/students" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, padding: '6px 10px', borderRadius: '8px' }}>
          <ArrowLeft size={15} /> Back to Goalies
        </Link>
        <div style={{ background: cardBg, border, borderRadius: '16px', padding: '48px 24px', textAlign: 'center' }}>
          <AlertCircle size={48} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>No Evaluation Found</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
            {student.displayName} has not completed their onboarding evaluation yet. It will appear here once they complete it.
          </p>
        </div>
      </div>
    );
  }

  const hasCoachReview = !!evaluation.coachReview;
  const profile = evaluation.intelligenceProfile;
  const pacingLevel = profile?.pacingLevel || evaluation.pacingLevel || 'introduction';
  const overallScore = profile?.overallScore || 1.0;
  const categoryScores = profile?.categoryScores || [];
  const strengths = profile?.identifiedStrengths || [];
  const gaps = profile?.identifiedGaps || [];
  const overallStyle = getScoreStyle(overallScore);

  return (
    <>
      <style>{`
        .ev-back:hover { color: ${BLUE} !important; background: rgba(55,181,255,0.08) !important; }
        .ev-resp-toggle:hover { background: rgba(55,181,255,0.06) !important; }
        .ev-save:hover:not(:disabled) { opacity: 0.9 !important; transform: translateY(-1px) !important; }
        .ev-save { transition: all 0.2s !important; }
        .ev-select { background: rgba(2,18,44,0.9) !important; border: 1px solid rgba(55,181,255,0.2) !important; color: #fff !important; padding: 9px 12px !important; borderRadius: 8px !important; width: 100% !important; fontSize: 13px !important; cursor: pointer !important; outline: none !important; }
        .ev-select:focus { border-color: rgba(55,181,255,0.5) !important; }
        .ev-textarea { background: rgba(2,18,44,0.9) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; padding: 10px 12px !important; borderRadius: 8px !important; width: 100% !important; fontSize: 13px !important; outline: none !important; resize: vertical !important; }
        .ev-textarea:focus { border-color: rgba(55,181,255,0.4) !important; }
        .ev-textarea::placeholder { color: rgba(255,255,255,0.25) !important; }
        @media(min-width:1024px){.ev-grid{grid-template-columns:2fr 1fr!important;}}
      `}</style>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(20px,3vw,32px) clamp(14px,3vw,24px) 56px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Link href="/coach/students" className="ev-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, borderRadius: '8px', padding: '6px 10px', width: 'fit-content', transition: 'all 0.2s' }}>
          <ArrowLeft size={15} /> Back to Goalies
        </Link>

        {/* Page title + status */}
        <div style={{ position: 'relative', borderRadius: '20px', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 50%, #0d1f40 100%)', border: '1px solid rgba(55,181,255,0.22)', boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(55,181,255,0.12)', padding: '24px 28px', overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-30px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(212,169,59,0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${GOLD}, ${BLUE}44, transparent)` }} />
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: GOLD, marginBottom: '6px' }}>Evaluation</p>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '24px', marginBottom: '4px' }}>{student.displayName}&apos;s Evaluation</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>Review assessment results and adjust recommended pacing level</p>
          </div>
          <span style={{ position: 'relative', background: hasCoachReview ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${hasCoachReview ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}`, color: hasCoachReview ? GREEN : 'rgba(255,255,255,0.5)', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', marginTop: '4px' }}>
            {hasCoachReview ? <><CheckCircle size={13} /> Reviewed</> : <><Clock size={13} /> Pending Review</>}
          </span>
        </div>

        {/* Main grid */}
        <div className="ev-grid" style={{ display: 'grid', gap: '20px' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Intelligence Profile */}
            <div style={{ position: 'relative', background: cardBg, border, borderRadius: '16px', padding: '20px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Goalie Intelligence Profile</h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '20px' }}>
                Completed {evaluation.completedAt ? toDate(evaluation.completedAt)?.toLocaleDateString() ?? 'Unknown' : 'Unknown'}
                {evaluation.duration && ` · ${Math.round(evaluation.duration / 60)} minutes`}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '6px' }}>Pacing Level</p>
                  <span style={{ background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', color: BLUE, padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textTransform: 'capitalize' }}>
                    {getPacingLevelDisplayText(pacingLevel)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '4px' }}>Overall Score</p>
                  <p style={{ color: overallStyle.color, fontWeight: 800, fontSize: '32px', lineHeight: 1 }}>{fmt(overallScore)}</p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>out of 4.0</p>
                </div>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${scaleToPercentage(overallScore, 4, 1) ?? 0}%`, background: `linear-gradient(90deg, ${overallStyle.bar}, ${overallStyle.bar}aa)`, borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                <span>Introduction (1.0–2.2)</span><span>Development (2.2–3.1)</span><span>Refinement (3.1–4.0)</span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div style={{ position: 'relative', background: cardBg, border, borderRadius: '16px', padding: '20px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, rgba(55,181,255,0.3), transparent)` }} />
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Category Breakdown</h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '16px' }}>Performance across the 7 assessment categories</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {GOALIE_CATEGORIES.map((category) => {
                  const Icon = categoryIcons[category.slug as GoalieCategorySlug];
                  const result = categoryScores.find((cs: CategoryScoreResult) => cs.categorySlug === category.slug);
                  const score = result?.averageScore || 1.0;
                  const style = getScoreStyle(score);
                  return (
                    <div key={category.slug} style={{ background: 'rgba(4,33,63,0.6)', border: '1px solid rgba(55,181,255,0.12)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={16} color={BLUE} />
                        </div>
                        <div>
                          <p style={{ color: '#fff', fontWeight: 600, fontSize: '12px', marginBottom: '2px' }}>{category.shortName}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: style.color, fontWeight: 800, fontSize: '16px' }}>{fmt(score)}</span>
                            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>({category.weight}%)</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${scaleToPercentage(score, 4, 1) ?? 0}%`, background: style.bar, borderRadius: '2px' }} />
                      </div>
                      {result && (result.strengths.length > 0 || result.gaps.length > 0) && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {result.strengths.length > 0 && <span style={{ background: 'rgba(34,197,94,0.1)', color: GREEN, padding: '1px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>{result.strengths.length} strength{result.strengths.length > 1 ? 's' : ''}</span>}
                          {result.gaps.length > 0 && <span style={{ background: 'rgba(251,191,36,0.1)', color: YELLOW, padding: '1px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>{result.gaps.length} growth area{result.gaps.length > 1 ? 's' : ''}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assessment Responses */}
            <div style={{ background: cardBg, border, borderRadius: '16px', overflow: 'hidden' }}>
              {totalResponses > 0 ? (
                <>
                  <button className="ev-resp-toggle" onClick={() => setShowResponses(!showResponses)} style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Assessment Responses</p>
                          {showResponses ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>View all {totalResponses} questions and answers</p>
                      </div>
                      <span style={{ background: 'rgba(55,181,255,0.1)', color: BLUE, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>{totalResponses}</span>
                    </div>
                  </button>
                  {showResponses && (
                    <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {GOALIE_CATEGORIES.map((category) => {
                        const Icon = categoryIcons[category.slug as GoalieCategorySlug];
                        const responses = responsesByCategory[category.slug] || [];
                        if (responses.length === 0) return null;
                        return (
                          <div key={category.slug}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid rgba(55,181,255,0.1)', marginBottom: '10px' }}>
                              <Icon size={15} color={BLUE} />
                              <p style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{category.name}</p>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>({responses.length} question{responses.length > 1 ? 's' : ''})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}>
                              {responses.map((response) => {
                                const question = getQuestionById(response.questionId);
                                const answerText = getSelectedOptionText(response.questionId, response.value);
                                const rStyle = getScoreStyle(response.score);
                                return (
                                  <div key={response.questionId} style={{ background: 'rgba(4,33,63,0.6)', border: '1px solid rgba(55,181,255,0.12)', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
                                      <div style={{ flex: 1 }}>
                                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontFamily: 'monospace', marginBottom: '2px' }}>{response.questionCode}</p>
                                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px' }}>{question?.question || 'Unknown question'}</p>
                                      </div>
                                      <span style={{ background: `${rStyle.color}22`, color: rStyle.color, padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', flexShrink: 0 }}>{fmt(response.score)}</span>
                                    </div>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                                      <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Answer:</span> {answerText}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '20px' }}>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Assessment Responses</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', lineHeight: 1.6 }}>Detailed response data is not available for this evaluation. This goalie may have completed onboarding before detailed response tracking was added.</p>
                </div>
              )}
            </div>

            {/* Strengths & Gaps */}
            {(strengths.length > 0 || gaps.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <TrendingUp size={15} color={GREEN} />
                    <p style={{ color: GREEN, fontWeight: 700, fontSize: '13px' }}>Strengths</p>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {strengths.slice(0, 4).map((strength) => (
                      <li key={strength.categorySlug} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: GREEN, marginTop: '2px', flexShrink: 0, fontSize: '14px' }}>•</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}><strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{strength.categoryName}</strong> <span style={{ color: 'rgba(255,255,255,0.35)' }}>({fmt(strength.score)})</span></span>
                      </li>
                    ))}
                    {strengths.length === 0 && <li style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Focus on building foundational skills</li>}
                  </ul>
                </div>
                <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <AlertCircle size={15} color={YELLOW} />
                    <p style={{ color: YELLOW, fontWeight: 700, fontSize: '13px' }}>Areas for Growth</p>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {gaps.slice(0, 4).map((gap) => (
                      <li key={gap.categorySlug} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: YELLOW, marginTop: '2px', flexShrink: 0, fontSize: '14px' }}>•</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                          <strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{gap.categoryName}</strong> <span style={{ color: 'rgba(255,255,255,0.35)' }}>({fmt(gap.score)})</span>
                          {gap.priority === 'high' && <span style={{ background: 'rgba(248,113,113,0.12)', color: RED, padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginLeft: '6px' }}>Priority</span>}
                        </span>
                      </li>
                    ))}
                    {gaps.length === 0 && <li style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Strong performance across all categories</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Intake Data */}
            {evaluation.intakeData && (
              <div style={{ background: cardBg, border, borderRadius: '14px', padding: '18px' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Goalie Background</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '16px' }}>Information from intake questionnaire</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {evaluation.intakeData.ageRange && <div><p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '4px' }}>Age Range</p><p style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{formatIntakeValue(evaluation.intakeData.ageRange)}</p></div>}
                  {evaluation.intakeData.experienceLevel && <div><p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '4px' }}>Experience</p><p style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{formatIntakeValue(evaluation.intakeData.experienceLevel)}</p></div>}
                  {evaluation.intakeData.playingLevel && <div><p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '4px' }}>Playing Level</p><p style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{formatIntakeValue(evaluation.intakeData.playingLevel)}</p></div>}
                  {evaluation.intakeData.hasGoalieCoach !== undefined && <div><p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '4px' }}>Has Goalie Coach</p><p style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{evaluation.intakeData.hasGoalieCoach ? 'Yes' : 'No'}</p></div>}
                  {evaluation.intakeData.primaryReasons && evaluation.intakeData.primaryReasons.length > 0 && (
                    <div style={{ gridColumn: 'span 2' }}><p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '4px' }}>Primary Reasons</p><p style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{evaluation.intakeData.primaryReasons.map(formatIntakeValue).join(', ')}</p></div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Coach Review */}
          <div>
            <div style={{ position: 'sticky', top: '24px', background: cardBg, border, borderRadius: '16px', padding: '20px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Coach Review</h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '20px' }}>Add notes and adjust the recommended pacing level</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Adjust Pacing */}
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Adjust Pacing Level</label>
                  <select className="ev-select" value={adjustedPacingLevel || 'none'} onChange={e => setAdjustedPacingLevel(e.target.value === 'none' ? '' : e.target.value as PacingLevel)}
                    style={{ background: 'rgba(2,18,44,0.9)', border: '1px solid rgba(55,181,255,0.2)', color: '#fff', padding: '9px 12px', borderRadius: '8px', width: '100%', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
                    <option value="none">Keep assessed level</option>
                    {pacingOptions.map(level => <option key={level} value={level}>{getPacingLevelDisplayText(level)}</option>)}
                  </select>
                  {adjustedPacingLevel && adjustedPacingLevel !== pacingLevel && (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '6px' }}>
                      Will change from {getPacingLevelDisplayText(pacingLevel)} to {getPacingLevelDisplayText(adjustedPacingLevel)}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Coach Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} placeholder="Add observations, recommendations, or context about the goalie's assessment..."
                    style={{ background: 'rgba(2,18,44,0.9)', border: '1px solid rgba(55,181,255,0.18)', color: '#fff', padding: '10px 12px', borderRadius: '8px', width: '100%', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
                </div>

                {/* Previous review */}
                {evaluation.coachReview && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', lineHeight: 1.6 }}>
                      Previously reviewed by <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{evaluation.coachReview.reviewerName || 'Coach'}</strong> on {toDate(evaluation.coachReview.reviewedAt)?.toLocaleDateString() ?? 'Unknown'}
                    </p>
                  </div>
                )}

                {/* Save */}
                <button onClick={handleSaveReview} disabled={saving} className="ev-save"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: `linear-gradient(135deg, ${GOLD} 0%, #B8891E 100%)`, color: '#0c0800', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 800, fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: `0 4px 14px rgba(212,169,59,0.3)` }}>
                  {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> {hasCoachReview ? 'Update Review' : 'Save Review'}</>}
                </button>

                {/* Curriculum link */}
                <div style={{ paddingTop: '14px', borderTop: '1px solid rgba(55,181,255,0.1)' }}>
                  <Link href={`/coach/students/${studentId}/curriculum`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(212,169,59,0.08)', border: `1px solid rgba(212,169,59,0.22)`, color: GOLD, padding: '11px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}>
                    Manage Curriculum
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
