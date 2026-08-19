import { Timestamp } from 'firebase/firestore';
import { Question } from './quiz';
import { QuestionType, DifficultyLevel } from './index';
import { VideoStructuredTags } from './video-tags';

/**
 * Video-based quiz question with timestamp
 * Extends the base Question type with video-specific properties
 */
export interface VideoQuizQuestion extends Question {
  timestamp: number; // seconds into video where question appears
  pauseDuration?: number; // optional auto-advance after X seconds
  allowVideoControl?: boolean; // can student rewind to see content again?
  /**
   * Reflective questions have no right answer. "Did that save feel balanced?" with
   * Yes / No / Not Sure is data about the goalie, not a test — so the builder stops
   * demanding a correct option, the player stops grading it, and it is left out of
   * the score denominator entirely. The answer is still recorded; see
   * `VideoQuestionAnswer.reflective`.
   */
  reflective?: boolean;
}

/**
 * Video quiz specific settings
 */
export interface VideoQuizSettings {
  allowPlaybackSpeedChange: boolean;
  playbackSpeeds: number[]; // e.g., [0.5, 0.75, 1, 1.25, 1.5, 2]
  allowRewind: boolean;
  allowSkipAhead: boolean; // can skip past unanswered questions
  requireSequentialAnswers: boolean; // must answer questions in order
  showProgressBar: boolean;
  autoPlayNext: boolean; // after completing quiz
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  passingScore?: number; // Minimum percentage to pass (0-100)
}

/**
 * Complete video quiz structure
 */
export interface VideoQuiz {
  id: string;
  title: string;
  description?: string;
  sportId: string; // MANDATORY - Every quiz must have a sport
  skillId: string; // MANDATORY - Every quiz must have a skill
  videoUrl: string; // Firebase Storage URL or external URL
  videoDuration: number; // total video length in seconds
  thumbnail?: string; // video thumbnail/poster image
  coverImage?: string; // quiz cover image
  instructions?: string;
  questions: VideoQuizQuestion[];
  settings: VideoQuizSettings;
  difficulty: DifficultyLevel;
  estimatedDuration: number; // estimated time to complete in minutes
  tags: string[];
  /** Structured tags for advanced filtering (optional, new system) */
  structuredTags?: VideoStructuredTags;
  /** Flattened tag index for Firestore queries (auto-generated) */
  _tagIndex?: string[];
  isActive: boolean;
  isPublished: boolean;
  status?: 'draft' | 'published' | 'archived'; // Quiz publication status
  allowRetakes?: boolean; // Whether users can retake the quiz
  category: string;
  /**
   * Who authored the quiz. `'coach'` marks coach-authored content, which is filed under the
   * `'coach-custom'` sport/skill sentinels rather than real `sports`/`skills` documents — so
   * VideoQuizService skips its sport/skill existence checks for it.
   *
   * Typed rather than read off an `any` cast on purpose: omitting it from a coach payload is
   * silent at compile time and only fails at save with "Sport with ID 'coach-custom' does not
   * exist", which is exactly how it was missed on the QuizCreator path.
   */
  source?: 'coach' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  metadata: VideoQuizMetadata;
}

/**
 * Video quiz metadata for analytics
 */
export interface VideoQuizMetadata {
  totalAttempts: number;
  totalCompletions: number;
  averageScore: number;
  averageTimeSpent: number; // in minutes
  averageCompletionTime: number; // time to complete video + questions
  dropOffPoints: DropOffPoint[]; // where students abandon the quiz
}

/**
 * Tracks where students abandon quizzes
 */
export interface DropOffPoint {
  timestamp: number; // seconds into video
  count: number; // number of students who dropped off here
}

/**
 * Answer to a video question
 */
export interface VideoQuestionAnswer {
  questionId: string;
  questionType: QuestionType;
  timestamp: number; // when question appeared in video
  answer: string | number | string[]; // supports multiple answer types
  /**
   * What the goalie actually picked, in words — "No", "Not Sure", "Left pad".
   *
   * `answer` holds option *ids* for multiple choice, which are meaningless in a
   * report. Reflective questions are only worth recording if the coach can read
   * the response back, so the text is resolved and stored at answer time rather
   * than re-derived later against a quiz that may since have been edited.
   */
  answerText?: string;
  isCorrect: boolean;
  pointsEarned: number;
  /**
   * Marks an answer to a reflective question. `isCorrect` is meaningless here and
   * is always false — every display site must check this flag first, or an honest
   * "No" renders as a wrong answer, which is the whole complaint.
   */
  reflective?: boolean;
  timeToAnswer: number; // seconds taken to answer
  answeredAt: Timestamp;
}

/**
 * Student progress through video quiz
 */
export interface VideoQuizProgress {
  id: string;
  userId: string;
  videoQuizId: string;
  skillId: string;
  sportId: string;
  currentTime: number; // last watched position in seconds
  questionsAnswered: VideoQuestionAnswer[];
  questionsRemaining: number;
  score: number; // points earned
  maxScore: number; // total points possible
  percentage: number; // score as percentage
  isCompleted: boolean;
  status: 'in-progress' | 'submitted' | 'timed-out' | 'abandoned';
  startedAt: Timestamp;
  completedAt?: Timestamp;
  submittedAt?: Timestamp; // When quiz was submitted
  lastAccessedAt?: Timestamp;
  watchTime: number; // actual time spent watching (excludes pause time)
  totalTimeSpent: number; // total time including pauses
  timeSpent?: number; // alias for backwards compatibility
  feedback?: string;
}

/**
 * Question with answered state (for UI)
 */
export interface VideoQuizQuestionWithState extends VideoQuizQuestion {
  answered: boolean;
  userAnswer?: string | number | string[];
  isCorrect?: boolean;
}

/**
 * Video player state
 */
export interface VideoPlayerState {
  playing: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  buffering: boolean;
  muted: boolean;
  volume: number;
}

/**
 * Props for question overlay
 */
export interface QuestionOverlayProps {
  question: VideoQuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string | string[]) => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

/**
 * Video controls props
 */
export interface VideoControlsProps {
  playing: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  volume?: number;
  muted?: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onVolumeChange?: (volume: number) => void;
  onMuteToggle?: () => void;
  disabled?: boolean;
}
