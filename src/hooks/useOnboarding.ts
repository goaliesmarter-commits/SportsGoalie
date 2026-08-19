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
  GoalieCategorySlug,
  GOALIE_CATEGORIES,
  CategoryInfo,
} from '@/types';
import {
  GOALIE_INTAKE_QUESTIONS,
} from '@/data/goalie-intake-questions';
import {
  getCategoryOrder,
  getQuestionsForCategory,
} from '@/data/goalie-assessment-questions';
import { logger } from '@/lib/utils/logger';

/**
 * Onboarding phases
 */
export type OnboardingPhase =
  | 'loading'
  | 'welcome'
  | 'intake'
  | 'bridge'
  | 'category_intro'
  | 'question'
  | 'profile'
  | 'complete';

interface UseOnboardingOptions {
  userId: string | null;
  studentName?: string;
  enabled?: boolean;
  onRefreshUser?: () => Promise<void>;
}

interface UseOnboardingReturn {
  // State
  phase: OnboardingPhase;
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
  completeIntake: () => Promise<void>;
  startCategory: () => void;
  answerQuestion: (questionId: string, optionId: string, score: IntelligenceScore) => Promise<void>;
  previousQuestion: () => void;
  completeAssessment: () => Promise<void>;
  goToDashboard: () => void;
}

/**
 * Hook for managing the onboarding evaluation flow.
 * Implements the 7-category, 1.0-4.0 scoring system.
 */
export function useOnboarding({
  userId,
  studentName: _studentName,
  enabled = true,
  onRefreshUser,
}: UseOnboardingOptions): UseOnboardingReturn {
  const router = useRouter();

  // Core state
  const [phase, setPhase] = useState<OnboardingPhase>('loading');
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

  // Get all intake questions as a flat array (one question per screen)
  const allIntakeQuestions = useMemo(() => GOALIE_INTAKE_QUESTIONS, []);
  const totalIntakeScreens = allIntakeQuestions.length;

  // Get category order and questions
  const categoryOrder = useMemo(() => getCategoryOrder(), []);
  const totalCategories = categoryOrder.length;

  // Current intake question (as array for component compatibility)
  const intakeScreenQuestions = useMemo(() => {
    const question = allIntakeQuestions[currentIntakeScreen];
    return question ? [question] : [];
  }, [allIntakeQuestions, currentIntakeScreen]);

  // Current category info
  const currentCategory = useMemo((): CategoryInfo | null => {
    if (currentCategoryIndex >= categoryOrder.length) return null;
    const slug = categoryOrder[currentCategoryIndex];
    return GOALIE_CATEGORIES.find(c => c.slug === slug) || null;
  }, [categoryOrder, currentCategoryIndex]);

  // Current category questions
  const categoryQuestions = useMemo(() => {
    if (!currentCategory) return [];
    return getQuestionsForCategory(currentCategory.slug as GoalieCategorySlug);
  }, [currentCategory]);

  // Current question
  const currentQuestion = useMemo(() => {
    if (currentQuestionIndex >= categoryQuestions.length) return null;
    return categoryQuestions[currentQuestionIndex];
  }, [categoryQuestions, currentQuestionIndex]);

  // Question progress calculation
  const questionProgress = useMemo(() => {
    let total = 0;
    let current = 0;

    for (let i = 0; i < categoryOrder.length; i++) {
      const catQuestions = getQuestionsForCategory(categoryOrder[i]);
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
      // Don't change phase if hook is disabled - let page handle redirect
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

      // Try to get existing evaluation
      const result = await onboardingService.getEvaluation(userId);

      if (result.success && result.data) {
        const eval_ = result.data;
        setEvaluation(eval_);

        // Restore state from evaluation
        if (eval_.intakeData) {
          setIntakeData(eval_.intakeData);
          // Restore intake responses
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
          router.push('/dashboard');
          return;
        }

        // Determine phase based on evaluation state
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
            // If at the start of a category, show intro
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
        // Create new evaluation
        const createResult = await onboardingService.createEvaluation(userId);
        if (createResult.success && createResult.data) {
          setEvaluation(createResult.data);
          setPhase('welcome');
        } else {
          setError('Failed to create evaluation');
        }
      }
    } catch (err) {
      logger.error('Failed to load onboarding evaluation', 'useOnboarding', err);
      setError('Failed to load evaluation');
      setPhase('welcome'); // Set phase so loading screen doesn't persist
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
    const currentQuestion = allIntakeQuestions[currentIntakeScreen];
    if (currentQuestion) {
      const value = intakeResponses[currentQuestion.id];
      if (value !== undefined) {
        const response: IntakeResponse = {
          questionId: currentQuestion.id,
          questionCode: currentQuestion.questionCode,
          value,
          answeredAt: Timestamp.now(),
        };
        await onboardingService.saveIntakeResponse(evaluation.id, response, currentIntakeScreen);
      }
    }

    // Check if this was the last question
    if (currentIntakeScreen >= totalIntakeScreens - 1) {
      // Complete intake
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
      const result = await onboardingService.completeIntake(evaluation.id);

      if (result.success && result.data) {
        setIntakeData(result.data);
        setPhase('bridge');
      } else {
        setError('Failed to complete intake');
      }
    } catch (err) {
      logger.error('Failed to complete intake', 'useOnboarding', err);
      setError('Failed to complete intake');
    } finally {
      setLoading(false);
    }
  };

  const completeIntake = useCallback(async () => {
    await completeIntakeInternal();
  }, [evaluation]);

  const startCategory = useCallback(() => {
    setPhase('question');
  }, []);

  const answerQuestion = useCallback(async (
    questionId: string,
    optionId: string,
    score: IntelligenceScore
  ) => {
    if (!evaluation || !currentQuestion || !currentCategory) {
      logger.error('Cannot answer question - missing evaluation or question', 'useOnboarding');
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

      // Calculate next position
      let nextCategoryIndex = currentCategoryIndex;
      let nextQuestionIndex = currentQuestionIndex + 1;

      // Check if we're done with current category
      if (nextQuestionIndex >= categoryQuestions.length) {
        nextCategoryIndex = currentCategoryIndex + 1;
        nextQuestionIndex = 0;
      }

      // Save response
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

      // Transition to next state
      if (nextCategoryIndex >= totalCategories) {
        // All categories complete - show profile
        await completeAssessmentInternal();
      } else if (nextQuestionIndex === 0 && nextCategoryIndex > currentCategoryIndex) {
        // New category - show intro
        setCurrentCategoryIndex(nextCategoryIndex);
        setCurrentQuestionIndex(0);
        setPhase('category_intro');
      } else {
        // Next question in same category
        setCurrentQuestionIndex(nextQuestionIndex);
      }
    } catch (err) {
      logger.error('Failed to save response', 'useOnboarding', err);
      setError('Failed to save your answer. Please try again.');
    }
  }, [evaluation, currentQuestion, currentCategory, currentCategoryIndex, currentQuestionIndex, categoryQuestions.length, totalCategories]);

  /**
   * Step back one question.
   *
   * Each branch sets the phase as well as the index, because this is also the
   * Back handler for the category intro screen — from there the indices alone
   * would move the position while leaving the intro on screen.
   */
  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setPhase('question');
      return;
    }

    if (currentCategoryIndex > 0) {
      const previousCategoryIndex = currentCategoryIndex - 1;
      const previousCategorySlug = categoryOrder[previousCategoryIndex];
      const previousCategoryQuestions = getQuestionsForCategory(previousCategorySlug);

      setCurrentCategoryIndex(previousCategoryIndex);
      setCurrentQuestionIndex(Math.max(previousCategoryQuestions.length - 1, 0));
      setPhase('question');
      return;
    }

    // First question of the first category. Everything before this point is the
    // intake, and there was no route back into it from here — Back was disabled,
    // and neither the bridge nor the category intro carries one. So every intake
    // answer became final the moment the assessment opened. Step back onto the
    // last intake screen instead; `intakeResponses` is still held in state, so
    // the answer is there to change.
    if (totalIntakeScreens > 0) {
      setCurrentIntakeScreen(totalIntakeScreens - 1);
      setPhase('intake');
    }
  }, [currentQuestionIndex, currentCategoryIndex, categoryOrder, totalIntakeScreens]);

  const completeAssessmentInternal = async () => {
    if (!userId || !evaluation) return;

    try {
      setLoading(true);
      const result = await onboardingService.completeEvaluation(userId);

      if (result.success && result.data) {
        setIntelligenceProfile(result.data);
        setPhase('profile');
      } else {
        setError('Failed to complete assessment');
      }
    } catch (err) {
      logger.error('Failed to complete assessment', 'useOnboarding', err);
      setError('Failed to complete assessment');
    } finally {
      setLoading(false);
    }
  };

  const completeAssessment = useCallback(async () => {
    await completeAssessmentInternal();
  }, [userId, evaluation]);

  const goToDashboard = useCallback(async () => {
    setPhase('complete');
    if (onRefreshUser) {
      await onRefreshUser();
    }
    router.push('/dashboard');
  }, [router, onRefreshUser]);

  return {
    // State
    phase,
    loading,
    error,
    evaluation,

    // Intake state
    currentIntakeScreen,
    intakeScreenQuestions,
    intakeResponses,
    intakeData,

    // Assessment state
    currentCategoryIndex,
    currentQuestionIndex,
    currentCategory,
    currentQuestion,
    categoryQuestions,
    intelligenceProfile,

    // Progress
    totalIntakeScreens,
    totalCategories,
    questionProgress,

    // Actions
    beginOnboarding,
    answerIntake,
    nextIntakeScreen,
    previousIntakeScreen,
    completeIntake,
    startCategory,
    answerQuestion,
    previousQuestion,
    completeAssessment,
    goToDashboard,
  };
}
