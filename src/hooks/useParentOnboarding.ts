import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { onboardingService } from '@/lib/database';
import {
  OnboardingEvaluation,
  IntakeQuestion,
  IntakeResponse,
  IntakeData,
  AssessmentQuestion,
  AssessmentResponse,
  IntelligenceProfile,
  IntelligenceScore,
  ParentCategorySlug,
  PARENT_CATEGORIES,
  CategoryInfo,
} from '@/types';
import {
  PARENT_INTAKE_QUESTIONS,
} from '@/data/parent-intake-questions';
import {
  getParentCategoryOrder,
  getQuestionsForParentCategory,
} from '@/data/parent-assessment-questions';
import { logger } from '@/lib/utils/logger';

/**
 * Parent onboarding phases
 */
export type ParentOnboardingPhase =
  | 'loading'
  | 'welcome'
  | 'intake'
  | 'bridge'
  | 'category_intro'
  | 'question'
  | 'profile'
  | 'complete';

interface UseParentOnboardingOptions {
  userId: string | null;
  parentName?: string;
  enabled?: boolean;
  onRefreshUser?: () => Promise<void>;
}

interface UseParentOnboardingReturn {
  // State
  phase: ParentOnboardingPhase;
  loading: boolean;
  error: string | null;
  evaluation: OnboardingEvaluation | null;

  // Intake state
  currentIntakeScreen: number;
  intakeScreenQuestions: IntakeQuestion[];
  intakeResponses: Record<string, string | string[]>;
  intakeData: IntakeData | null;

  // Assessment state
  currentCategoryIndex: number;
  currentQuestionIndex: number;
  currentCategory: CategoryInfo | null;
  currentQuestion: AssessmentQuestion | null;
  categoryQuestions: AssessmentQuestion[];
  intelligenceProfile: IntelligenceProfile | null;

  // Progress
  totalIntakeScreens: number;
  totalCategories: number;
  questionProgress: { current: number; total: number };

  // Actions
  beginOnboarding: () => void;
  answerIntake: (questionId: string, value: string | string[]) => void;
  nextIntakeScreen: () => Promise<void>;
  previousIntakeScreen: () => void;
  startCategory: () => void;
  answerQuestion: (questionId: string, optionId: string, score: IntelligenceScore) => Promise<void>;
  previousQuestion: () => void;
  goToDashboard: () => void;
}

/**
 * Hook for managing the parent onboarding evaluation flow.
 * Uses parent-specific intake and assessment questions.
 */
export function useParentOnboarding({
  userId,
  parentName: _parentName,
  enabled = true,
  onRefreshUser,
}: UseParentOnboardingOptions): UseParentOnboardingReturn {
  const router = useRouter();

  // Core state
  const [phase, setPhase] = useState<ParentOnboardingPhase>('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<OnboardingEvaluation | null>(null);

  // Intake state
  const [currentIntakeScreen, setCurrentIntakeScreen] = useState(0);
  const [intakeResponses, setIntakeResponses] = useState<Record<string, string | string[]>>({});
  const [intakeData, setIntakeData] = useState<IntakeData | null>(null);

  // Assessment state
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [intelligenceProfile, setIntelligenceProfile] = useState<IntelligenceProfile | null>(null);

  // Parent intake questions (one per screen)
  const allIntakeQuestions = useMemo(() => PARENT_INTAKE_QUESTIONS, []);
  const totalIntakeScreens = allIntakeQuestions.length;

  // Category order and totals
  const categoryOrder = useMemo(() => getParentCategoryOrder(), []);
  const totalCategories = categoryOrder.length;

  // Current intake question
  const intakeScreenQuestions = useMemo(() => {
    const question = allIntakeQuestions[currentIntakeScreen];
    return question ? [question] : [];
  }, [allIntakeQuestions, currentIntakeScreen]);

  // Current category info
  const currentCategory = useMemo((): CategoryInfo | null => {
    if (currentCategoryIndex >= categoryOrder.length) return null;
    const slug = categoryOrder[currentCategoryIndex];
    return PARENT_CATEGORIES.find(c => c.slug === slug) || null;
  }, [categoryOrder, currentCategoryIndex]);

  // Current category questions
  const categoryQuestions = useMemo(() => {
    if (!currentCategory) return [];
    return getQuestionsForParentCategory(currentCategory.slug as ParentCategorySlug);
  }, [currentCategory]);

  // Current question
  const currentQuestion = useMemo(() => {
    if (currentQuestionIndex >= categoryQuestions.length) return null;
    return categoryQuestions[currentQuestionIndex];
  }, [categoryQuestions, currentQuestionIndex]);

  // Question progress
  const questionProgress = useMemo(() => {
    let total = 0;
    let current = 0;

    for (let i = 0; i < categoryOrder.length; i++) {
      const catQuestions = getQuestionsForParentCategory(categoryOrder[i]);
      total += catQuestions.length;

      if (i < currentCategoryIndex) {
        current += catQuestions.length;
      } else if (i === currentCategoryIndex) {
        current += currentQuestionIndex;
      }
    }

    return { current, total };
  }, [categoryOrder, currentCategoryIndex, currentQuestionIndex]);

  // Load or create evaluation
  useEffect(() => {
    if (!enabled || !userId) {
      setLoading(false);
      return;
    }

    loadEvaluation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId]);

  const loadEvaluation = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Try to get existing parent evaluation
      const result = await onboardingService.getParentEvaluation(userId);

      if (result.success && result.data) {
        const eval_ = result.data;
        setEvaluation(eval_);

        // Restore state
        if (eval_.intakeData) {
          setIntakeData(eval_.intakeData);
          const responses: Record<string, string | string[]> = {};
          for (const r of eval_.intakeData.responses || []) {
            responses[r.questionId] = r.value;
          }
          setIntakeResponses(responses);
        }

        if (eval_.intelligenceProfile) {
          setIntelligenceProfile(eval_.intelligenceProfile);
        }

        // Resume from saved phase
        if (eval_.status === 'completed') {
          setPhase('complete');
          if (onRefreshUser) {
            await onRefreshUser();
          }
          router.push('/parent');
          return;
        }

        switch (eval_.phase) {
          case 'intake':
            setCurrentIntakeScreen(eval_.currentQuestionIndex || 0);
            setPhase('intake');
            break;
          case 'bridge':
            setPhase('bridge');
            break;
          case 'assessment':
            setCurrentCategoryIndex(eval_.currentCategoryIndex);
            setCurrentQuestionIndex(eval_.currentQuestionIndex);
            if (eval_.currentQuestionIndex === 0) {
              setPhase('category_intro');
            } else {
              setPhase('question');
            }
            break;
          case 'completed':
            setPhase('profile');
            break;
          default:
            setPhase('welcome');
        }
      } else {
        // Create new parent evaluation
        const createResult = await onboardingService.createParentEvaluation(userId);
        if (createResult.success && createResult.data) {
          setEvaluation(createResult.data);
          setPhase('welcome');
        } else {
          setError('Failed to create evaluation');
        }
      }
    } catch (err) {
      logger.error('Failed to load parent onboarding evaluation', 'useParentOnboarding', err);
      setError('Failed to load evaluation');
      setPhase('welcome');
    } finally {
      setLoading(false);
    }
  };

  const beginOnboarding = useCallback(() => {
    setCurrentIntakeScreen(0);
    setPhase('intake');
  }, []);

  const answerIntake = useCallback((questionId: string, value: string | string[]) => {
    setIntakeResponses(prev => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const nextIntakeScreen = useCallback(async () => {
    if (!evaluation) return;

    // Save response for current question
    const currentQ = allIntakeQuestions[currentIntakeScreen];
    if (currentQ) {
      const value = intakeResponses[currentQ.id];
      if (value !== undefined) {
        const response: IntakeResponse = {
          questionId: currentQ.id,
          questionCode: currentQ.questionCode,
          value,
          answeredAt: Timestamp.now(),
        };
        await onboardingService.saveIntakeResponse(evaluation.id, response, currentIntakeScreen);
      }
    }

    // Check if last question
    if (currentIntakeScreen >= totalIntakeScreens - 1) {
      await completeIntakeInternal();
    } else {
      setCurrentIntakeScreen(prev => prev + 1);
    }
  }, [evaluation, currentIntakeScreen, intakeResponses, allIntakeQuestions, totalIntakeScreens]);

  const previousIntakeScreen = useCallback(() => {
    if (currentIntakeScreen > 0) {
      setCurrentIntakeScreen(prev => prev - 1);
    }
  }, [currentIntakeScreen]);

  const completeIntakeInternal = async () => {
    if (!evaluation) return;

    try {
      setLoading(true);
      const result = await onboardingService.completeParentIntake(evaluation.id);

      if (result.success && result.data) {
        setIntakeData(result.data);
        setPhase('bridge');
      } else {
        setError('Failed to complete intake');
      }
    } catch (err) {
      logger.error('Failed to complete parent intake', 'useParentOnboarding', err);
      setError('Failed to complete intake');
    } finally {
      setLoading(false);
    }
  };

  const startCategory = useCallback(() => {
    setPhase('question');
  }, []);

  const answerQuestion = useCallback(async (
    questionId: string,
    optionId: string,
    score: IntelligenceScore
  ) => {
    if (!evaluation || !currentQuestion || !currentCategory) {
      logger.error('Cannot answer question - missing evaluation or question', 'useParentOnboarding');
      return;
    }

    try {
      const response: AssessmentResponse = {
        questionId,
        questionCode: currentQuestion.questionCode,
        categorySlug: currentCategory.slug,
        value: optionId,
        score,
        answeredAt: Timestamp.now(),
      };

      let nextCategoryIndex = currentCategoryIndex;
      let nextQuestionIndex = currentQuestionIndex + 1;

      if (nextQuestionIndex >= categoryQuestions.length) {
        nextCategoryIndex = currentCategoryIndex + 1;
        nextQuestionIndex = 0;
      }

      await onboardingService.saveAssessmentResponse(
        evaluation.id,
        response,
        nextCategoryIndex,
        nextQuestionIndex
      );

      // Update local state
      setEvaluation(prev => prev ? {
        ...prev,
        assessmentResponses: [
          ...prev.assessmentResponses.filter(r => r.questionId !== response.questionId),
          response,
        ],
        currentCategoryIndex: nextCategoryIndex,
        currentQuestionIndex: nextQuestionIndex,
      } : null);

      // Transition
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
      logger.error('Failed to save parent response', 'useParentOnboarding', err);
      setError('Failed to save your answer. Please try again.');
    }
  }, [evaluation, currentQuestion, currentCategory, currentCategoryIndex, currentQuestionIndex, categoryQuestions.length, totalCategories]);

  // Sets the phase as well as the index in every branch — this is also the Back
  // handler for the category intro, where moving the index alone would leave the
  // intro on screen. The last branch is the one that used to dead-end: at the very
  // first question there was no way back into the intake, so those answers were
  // final from the moment the assessment opened.
  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setPhase('question');
      return;
    }

    if (currentCategoryIndex > 0) {
      const previousCategoryIndex = currentCategoryIndex - 1;
      const previousCategorySlug = categoryOrder[previousCategoryIndex];
      const previousCategoryQuestions = getQuestionsForParentCategory(previousCategorySlug);

      setCurrentCategoryIndex(previousCategoryIndex);
      setCurrentQuestionIndex(Math.max(previousCategoryQuestions.length - 1, 0));
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
      const result = await onboardingService.completeParentEvaluation(userId);

      if (result.success && result.data) {
        setIntelligenceProfile(result.data);
        setPhase('profile');
      } else {
        setError('Failed to complete assessment');
      }
    } catch (err) {
      logger.error('Failed to complete parent assessment', 'useParentOnboarding', err);
      setError('Failed to complete assessment');
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = useCallback(async () => {
    setPhase('complete');
    if (onRefreshUser) {
      await onRefreshUser();
    }
    router.push('/parent');
  }, [router, onRefreshUser]);

  return {
    phase,
    loading,
    error,
    evaluation,
    currentIntakeScreen,
    intakeScreenQuestions,
    intakeResponses,
    intakeData,
    currentCategoryIndex,
    currentQuestionIndex,
    currentCategory,
    currentQuestion,
    categoryQuestions,
    intelligenceProfile,
    totalIntakeScreens,
    totalCategories,
    questionProgress,
    beginOnboarding,
    answerIntake,
    nextIntakeScreen,
    previousIntakeScreen,
    startCategory,
    answerQuestion,
    previousQuestion,
    goToDashboard,
  };
}
