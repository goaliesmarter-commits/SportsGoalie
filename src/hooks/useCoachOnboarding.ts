import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { onboardingService } from '@/lib/database';
import {
  OnboardingEvaluation, IntakeQuestion, IntakeResponse, IntakeData,
  AssessmentQuestion, AssessmentResponse, IntelligenceProfile, IntelligenceScore,
  CoachCategorySlug, COACH_CATEGORIES, CategoryInfo,
} from '@/types';
import { getCoachIntakeQuestionsByScreen, getCoachTotalIntakeScreens } from '@/data/coach-intake-questions';
import { getCoachCategoryOrder, getQuestionsForCoachCategory } from '@/data/coach-assessment-questions';
import { logger } from '@/lib/utils/logger';

export type CoachOnboardingPhase = 'loading' | 'welcome' | 'intake' | 'bridge' | 'category_intro' | 'question' | 'profile' | 'complete';

interface UseCoachOnboardingOptions {
  userId: string | null;
  coachName?: string;
  enabled?: boolean;
  onRefreshUser?: () => Promise<void>;
}

interface UseCoachOnboardingReturn {
  phase: CoachOnboardingPhase;
  loading: boolean;
  error: string | null;
  evaluation: OnboardingEvaluation | null;
  currentIntakeScreen: number;
  intakeScreenQuestions: IntakeQuestion[];
  intakeResponses: Record<string, string | string[]>;
  intakeData: IntakeData | null;
  currentCategoryIndex: number;
  currentQuestionIndex: number;
  currentCategory: CategoryInfo | null;
  currentQuestion: AssessmentQuestion | null;
  categoryQuestions: AssessmentQuestion[];
  intelligenceProfile: IntelligenceProfile | null;
  totalIntakeScreens: number;
  totalCategories: number;
  questionProgress: { current: number; total: number };
  beginOnboarding: () => void;
  answerIntake: (questionId: string, value: string | string[]) => void;
  nextIntakeScreen: () => Promise<void>;
  previousIntakeScreen: () => void;
  startCategory: () => void;
  answerQuestion: (questionId: string, optionId: string, score: IntelligenceScore) => Promise<void>;
  previousQuestion: () => void;
  goToDashboard: () => void;
}

export function useCoachOnboarding({ userId, coachName: _coachName, enabled = true, onRefreshUser }: UseCoachOnboardingOptions): UseCoachOnboardingReturn {
  const router = useRouter();

  const [phase, setPhase] = useState<CoachOnboardingPhase>('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<OnboardingEvaluation | null>(null);
  const [currentIntakeScreen, setCurrentIntakeScreen] = useState(0);
  const [intakeResponses, setIntakeResponses] = useState<Record<string, string | string[]>>({});
  const [intakeData, setIntakeData] = useState<IntakeData | null>(null);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [intelligenceProfile, setIntelligenceProfile] = useState<IntelligenceProfile | null>(null);

  const screenMap = useMemo(() => getCoachIntakeQuestionsByScreen(), []);
  const totalIntakeScreens = useMemo(() => getCoachTotalIntakeScreens(), []);

  const intakeScreenQuestions = useMemo(() => {
    return screenMap.get(currentIntakeScreen + 1) || [];
  }, [screenMap, currentIntakeScreen]);

  const categoryOrder = useMemo(() => getCoachCategoryOrder(), []);
  const totalCategories = categoryOrder.length;

  const currentCategory = useMemo((): CategoryInfo | null => {
    if (currentCategoryIndex >= categoryOrder.length) return null;
    const slug = categoryOrder[currentCategoryIndex];
    return COACH_CATEGORIES.find(c => c.slug === slug) || null;
  }, [categoryOrder, currentCategoryIndex]);

  const categoryQuestions = useMemo(() => {
    if (!currentCategory) return [];
    return getQuestionsForCoachCategory(currentCategory.slug as CoachCategorySlug);
  }, [currentCategory]);

  const currentQuestion = useMemo(() => {
    if (currentQuestionIndex >= categoryQuestions.length) return null;
    return categoryQuestions[currentQuestionIndex];
  }, [categoryQuestions, currentQuestionIndex]);

  const questionProgress = useMemo(() => {
    let total = 0, current = 0;
    for (let i = 0; i < categoryOrder.length; i++) {
      const qs = getQuestionsForCoachCategory(categoryOrder[i]);
      total += qs.length;
      if (i < currentCategoryIndex) current += qs.length;
      else if (i === currentCategoryIndex) current += currentQuestionIndex;
    }
    return { current, total };
  }, [categoryOrder, currentCategoryIndex, currentQuestionIndex]);

  useEffect(() => {
    if (!enabled || !userId) { setLoading(false); return; }
    loadEvaluation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId]);

  const loadEvaluation = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getCoachEvaluation(userId);
      if (result.success && result.data) {
        const eval_ = result.data;
        setEvaluation(eval_);
        if (eval_.intakeData) {
          setIntakeData(eval_.intakeData);
          const responses: Record<string, string | string[]> = {};
          for (const r of eval_.intakeData.responses || []) responses[r.questionId] = r.value;
          setIntakeResponses(responses);
        }
        if (eval_.intelligenceProfile) setIntelligenceProfile(eval_.intelligenceProfile);
        if (eval_.status === 'completed') {
          setPhase('complete');
          if (onRefreshUser) await onRefreshUser();
          router.push('/coach');
          return;
        }
        switch (eval_.phase) {
          case 'intake': setCurrentIntakeScreen(eval_.currentQuestionIndex || 0); setPhase('intake'); break;
          case 'bridge': setPhase('bridge'); break;
          case 'assessment':
            setCurrentCategoryIndex(eval_.currentCategoryIndex);
            setCurrentQuestionIndex(eval_.currentQuestionIndex);
            setPhase(eval_.currentQuestionIndex === 0 ? 'category_intro' : 'question');
            break;
          case 'completed': setPhase('profile'); break;
          default: setPhase('welcome');
        }
      } else {
        const createResult = await onboardingService.createCoachEvaluation(userId);
        if (createResult.success && createResult.data) { setEvaluation(createResult.data); setPhase('welcome'); }
        else setError('Failed to create evaluation');
      }
    } catch (err) {
      logger.error('Failed to load coach onboarding evaluation', 'useCoachOnboarding', err);
      setError('Failed to load evaluation');
      setPhase('welcome');
    } finally { setLoading(false); }
  };

  const beginOnboarding = useCallback(() => { setCurrentIntakeScreen(0); setPhase('intake'); }, []);

  const answerIntake = useCallback((questionId: string, value: string | string[]) => {
    setIntakeResponses(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const nextIntakeScreen = useCallback(async () => {
    if (!evaluation) return;
    // Save all responses for the current screen
    const screenQuestions = screenMap.get(currentIntakeScreen + 1) || [];
    for (let i = 0; i < screenQuestions.length; i++) {
      const q = screenQuestions[i];
      const value = intakeResponses[q.id];
      if (value !== undefined) {
        const response: IntakeResponse = { questionId: q.id, questionCode: q.questionCode, value, answeredAt: Timestamp.now() };
        await onboardingService.saveIntakeResponse(evaluation.id, response, currentIntakeScreen * 10 + i);
      }
    }
    if (currentIntakeScreen >= totalIntakeScreens - 1) {
      await completeIntakeInternal();
    } else {
      setCurrentIntakeScreen(prev => prev + 1);
    }
  }, [evaluation, currentIntakeScreen, intakeResponses, screenMap, totalIntakeScreens]);

  const previousIntakeScreen = useCallback(() => {
    if (currentIntakeScreen > 0) setCurrentIntakeScreen(prev => prev - 1);
  }, [currentIntakeScreen]);

  const completeIntakeInternal = async () => {
    if (!evaluation) return;
    try {
      setLoading(true);
      const result = await onboardingService.completeCoachIntake(evaluation.id);
      if (result.success && result.data) { setIntakeData(result.data); setPhase('bridge'); }
      else setError('Failed to complete intake');
    } catch (err) {
      logger.error('Failed to complete coach intake', 'useCoachOnboarding', err);
      setError('Failed to complete intake');
    } finally { setLoading(false); }
  };

  const startCategory = useCallback(() => { setPhase('question'); }, []);

  const answerQuestion = useCallback(async (questionId: string, optionId: string, score: IntelligenceScore) => {
    if (!evaluation || !currentQuestion || !currentCategory) return;
    try {
      const response: AssessmentResponse = {
        questionId, questionCode: currentQuestion.questionCode, categorySlug: currentCategory.slug,
        value: optionId, score, answeredAt: Timestamp.now(),
      };
      let nextCategoryIndex = currentCategoryIndex;
      let nextQuestionIndex = currentQuestionIndex + 1;
      if (nextQuestionIndex >= categoryQuestions.length) { nextCategoryIndex = currentCategoryIndex + 1; nextQuestionIndex = 0; }
      await onboardingService.saveAssessmentResponse(evaluation.id, response, nextCategoryIndex, nextQuestionIndex);
      setEvaluation(prev => prev ? { ...prev, assessmentResponses: [...prev.assessmentResponses.filter(r => r.questionId !== response.questionId), response], currentCategoryIndex: nextCategoryIndex, currentQuestionIndex: nextQuestionIndex } : null);
      if (nextCategoryIndex >= totalCategories) {
        await completeAssessmentInternal();
      } else if (nextQuestionIndex === 0 && nextCategoryIndex > currentCategoryIndex) {
        setCurrentCategoryIndex(nextCategoryIndex);
        setCurrentQuestionIndex(0);
        setPhase('category_intro');
      } else {
        setCurrentQuestionIndex(nextQuestionIndex);
      }
    } catch (err) {
      logger.error('Failed to save coach response', 'useCoachOnboarding', err);
      setError('Failed to save your answer. Please try again.');
    }
  }, [evaluation, currentQuestion, currentCategory, currentCategoryIndex, currentQuestionIndex, categoryQuestions.length, totalCategories]);

  // Sets the phase as well as the index in every branch — this is also the Back
  // handler for the category intro, where moving the index alone would leave the
  // intro on screen. The last branch is the one that used to dead-end: at the very
  // first question there was no way back into the intake, so those answers were
  // final from the moment the assessment opened.
  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) { setCurrentQuestionIndex(prev => prev - 1); setPhase('question'); return; }
    if (currentCategoryIndex > 0) {
      const prevIdx = currentCategoryIndex - 1;
      const prevQs = getQuestionsForCoachCategory(categoryOrder[prevIdx]);
      setCurrentCategoryIndex(prevIdx);
      setCurrentQuestionIndex(Math.max(prevQs.length - 1, 0));
      setPhase('question');
      return;
    }
    if (totalIntakeScreens > 0) {
      setCurrentIntakeScreen(totalIntakeScreens - 1);
      setPhase('intake');
    }
  }, [currentQuestionIndex, currentCategoryIndex, categoryOrder, totalIntakeScreens]);

  const completeAssessmentInternal = async () => {
    if (!userId || !evaluation) return;
    try {
      setLoading(true);
      const result = await onboardingService.completeCoachEvaluation(userId);
      if (result.success && result.data) { setIntelligenceProfile(result.data); setPhase('profile'); }
      else setError('Failed to complete assessment');
    } catch (err) {
      logger.error('Failed to complete coach assessment', 'useCoachOnboarding', err);
      setError('Failed to complete assessment');
    } finally { setLoading(false); }
  };

  const goToDashboard = useCallback(async () => {
    setPhase('complete');
    if (onRefreshUser) await onRefreshUser();
    router.push('/coach');
  }, [router, onRefreshUser]);

  return {
    phase, loading, error, evaluation, currentIntakeScreen, intakeScreenQuestions, intakeResponses, intakeData,
    currentCategoryIndex, currentQuestionIndex, currentCategory, currentQuestion, categoryQuestions, intelligenceProfile,
    totalIntakeScreens, totalCategories, questionProgress, beginOnboarding, answerIntake, nextIntakeScreen,
    previousIntakeScreen, startCategory, answerQuestion, previousQuestion, goToDashboard,
  };
}
