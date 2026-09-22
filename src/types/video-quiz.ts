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

  // ---------------------------------------------------------------------------
  // The freeze point (SG-09 / SG-10).
  //
  // These are not a second mechanism. A freeze point IS a question trigger: the
  // clock reaches `timestamp`, the frame holds, and what happens next is
  // described by the fields below. Michael's "step" and this freeze point are
  // the same thing under two names, which is why `stepNumber` lives here rather
  // than in a structure of its own.
  // ---------------------------------------------------------------------------

  /**
   * Hold the frame and play the voice, but ask nothing. The goalie is looking at
   * the moment while Michael talks over it, then carries on. There is no answer
   * to record and nothing to grade, so this question never enters the score.
   */
  holdOnly?: boolean;

  /**
   * The line shown beside the held frame - what to look at, in Michael's words.
   * Loaded as a string so wording can change up to launch without a rebuild.
   */
  holdText?: string;

  /**
   * A clip id from the coach audio catalogue (e.g. 'V-A-14'), played once while
   * the frame is held. Same catalogue the page buttons use; see
   * CoachAudioButton. Absent means the frame holds in silence.
   */
  voiceClipId?: string;

  /**
   * What happens once the goalie has answered.
   *
   * - `'resume'` - playback continues by itself. This is what the player has
   *   always done and stays the default when the field is absent.
   * - `'choose'` - the goalie is offered PLAY ON or REWIND and nothing moves
   *   until one is chosen.
   */
  afterAnswer?: 'resume' | 'choose';

  /**
   * Where REWIND goes back to, in seconds. Only read when `afterAnswer` is
   * `'choose'`. Absent means rewind to the start of this question's own segment
   * - the previous freeze point, or 0 if this is the first.
   */
  rewindTo?: number;

  /**
   * Which step of the clip this freeze point is. The cumulative Knowledge Check
   * reads these to decide what to ask and in what order.
   *
   * IMPORTANT, and this is Michael's rule rather than an implementation detail:
   * the newest step is asked FIRST, then the older ones. Do not sort these into
   * chronological order anywhere they are read back. The ordering IS the
   * teaching.
   */
  stepNumber?: number;
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
  /**
   * Unique per attempt. Historically this was `progress_<userId>_<quizId>`, which meant a
   * retake wrote over the previous attempt instead of adding to it. New attempts use
   * `attempt_<userId>_<quizId>_<timestamp>`; legacy ids still load because every query
   * filters on the userId/videoQuizId fields, never on the document id.
   */
  id: string;
  userId: string;
  videoQuizId: string;
  /** Title of the Knowledge Check as it was named when this attempt was taken. */
  quizTitle?: string;
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
 * Props for the freeze point panel.
 *
 * Named "panel", not "overlay", deliberately: Michael's rule is that the
 * question sits underneath the video, with no overlay, no blur and no dimming.
 * See QuestionPanel.tsx.
 */
export interface QuestionPanelProps {
  question: VideoQuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string | string[]) => void;
  onSkip?: () => void;
  showSkip?: boolean;

  // ---------------------------------------------------------------------------
  // The freeze point (SG-09 / SG-11).
  // ---------------------------------------------------------------------------

  /**
   * The frame is still held and the goalie has been offered PLAY ON or REWIND.
   * Set once a question has been answered, or immediately for a `holdOnly`
   * freeze whose `afterAnswer` is `'choose'`. Nothing moves until one of the two
   * is picked.
   */
  awaitingChoice?: boolean;

  /**
   * A `holdOnly` freeze asks nothing, so there is no answer to submit. This is
   * the goalie saying they have looked, and is the only way such a freeze ends
   * when `afterAnswer` is not `'choose'`.
   */
  onAcknowledge?: () => void;

  /** Carry on from where the frame was held. */
  onPlayOn?: () => void;

  /** Go back and watch the segment again. See `VideoQuizQuestion.rewindTo`. */
  onRewind?: () => void;
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
