'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ReactPlayer from 'react-player';
import { OnProgressProps } from 'react-player/base';
import { VideoQuiz, VideoQuizProgress, VideoQuizQuestionWithState, VideoQuestionAnswer } from '@/types';
import { QuestionPanel } from './QuestionPanel';
import { VideoControls } from './VideoControls';
import { useCoachAudio } from '@/lib/audio/context';
import { Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface StandaloneVideoQuizPlayerProps {
  quiz: VideoQuiz;
  userId: string;
  initialProgress?: VideoQuizProgress;
  onComplete: (progress: VideoQuizProgress) => void;
}

/**
 * STANDALONE VIDEO QUIZ PLAYER
 *
 * This component is completely self-contained and manages its own state.
 * It does NOT rely on external hooks or state management that could cause
 * re-renders and infinite loops.
 *
 * Key principles:
 * 1. All question data is stored in refs and NEVER causes re-renders
 * 2. Only UI state (playing, freeze visibility) causes re-renders
 * 3. Questions are processed once on mount and stored in a ref
 * 4. No external dependencies that could change and cause re-renders
 *
 * THE FREEZE POINT (SG-09 / SG-11)
 *
 * Every question is a freeze point: the clock reaches its timestamp, the frame
 * holds, and the panel UNDER the picture takes over. What it shows depends on
 * the question's freeze fields (see VideoQuizQuestion in types/video-quiz.ts):
 *
 * - a question to answer, or `holdOnly` - a line to look at and nothing asked
 * - a coach voice clip (`voiceClipId`), played once as the frame holds
 * - after answering, either carry on by itself (the default, and what the
 *   player always did) or `afterAnswer: 'choose'` - PLAY ON or REWIND, and
 *   nothing moves until one is picked
 *
 * A question with none of those fields behaves exactly as before, apart from
 * where the panel sits.
 */
export const StandaloneVideoQuizPlayer: React.FC<StandaloneVideoQuizPlayerProps> = ({
  quiz,
  userId,
  initialProgress,
  onComplete,
}) => {
  // Player ref
  const playerRef = useRef<ReactPlayer>(null);

  // The coach voice. One shared audio element for the whole site, so starting a
  // clip here stops anything else that was playing.
  const { play: playVoice, pause: pauseVoice, enabled: voiceEnabled } = useCoachAudio();

  // Static data refs - these NEVER change after initialization
  const questionsRef = useRef<VideoQuizQuestionWithState[]>([]);
  const progressRef = useRef<VideoQuizProgress>(null!);
  const answeredQuestionsRef = useRef<Set<string>>(new Set());
  const shownQuestionsRef = useRef<Set<string>>(new Set());

  // Dynamic tracking refs
  const currentTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const videoEndedRef = useRef(false);
  const allQuestionsAnsweredRef = useRef(false);

  /**
   * Where the clock was on the last progress tick that was checked for freeze
   * points. A freeze fires when playback CROSSES its timestamp - that is, when
   * the timestamp lies after this and at or before the current tick.
   *
   * Starts below zero so a freeze point placed at 0:00 is still crossed on the
   * first tick.
   */
  const lastTickRef = useRef(-1);

  // UI State - minimal, only what affects rendering
  const [isReady, setIsReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [duration, setDuration] = useState(quiz.videoDuration || 0); // Use stored duration as initial value
  const [displayTime, setDisplayTime] = useState(0);
  const [frozenQuestion, setFrozenQuestion] = useState<VideoQuizQuestionWithState | null>(null);
  // The frame is still held and PLAY ON / REWIND is on offer.
  const [awaitingChoice, setAwaitingChoice] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Initialize data ONCE on mount
  useEffect(() => {
    console.log('🎬 Initializing standalone player with quiz:', quiz.id);

    // Initialize questions
    questionsRef.current = quiz.questions.map(q => ({
      ...q,
      answered: false,
      userAnswer: undefined,
      isCorrect: undefined,
    }));

    // Initialize progress.
    // One document per attempt. The old id was fixed per goalie + Knowledge Check, so a
    // retake landed on top of the previous attempt and the history only ever showed one row.
    progressRef.current = initialProgress || {
      id: `attempt_${userId}_${quiz.id}_${Date.now()}`,
      userId,
      videoQuizId: quiz.id,
      quizTitle: quiz.title,
      skillId: quiz.skillId,
      sportId: quiz.sportId,
      currentTime: 0,
      questionsAnswered: [],
      questionsRemaining: quiz.questions.length,
      score: 0,
      // Reflective questions carry no points and are left out of the denominator —
      // otherwise answering one honestly would lower the goalie's percentage.
      // A hold with no question asks nothing at all, so the same applies to it.
      maxScore: quiz.questions.reduce(
        (sum, q) => sum + (q.reflective || q.holdOnly ? 0 : q.points || 0),
        0
      ),
      percentage: 0,
      isCompleted: false,
      status: 'in-progress',
      startedAt: Timestamp.now(),
      watchTime: 0,
      totalTimeSpent: 0,
    };

    console.log('✅ Initialized with', questionsRef.current.length, 'questions');
  }, []); // Empty deps - only run once on mount

  // Leaving the page mid-clip should not leave Coach Mike talking to nobody.
  useEffect(() => pauseVoice, [pauseVoice]);

  // Check if quiz should complete (both conditions must be met)
  const checkAndCompleteQuiz = useCallback(() => {
    if (videoEndedRef.current && allQuestionsAnsweredRef.current) {
      console.log('🎉 Quiz complete - both video ended and all questions answered!');
      progressRef.current.isCompleted = true;
      progressRef.current.status = 'submitted';
      progressRef.current.completedAt = Timestamp.now();

      // Calculate total time spent (in seconds)
      const startTime = progressRef.current.startedAt?.toDate?.() || new Date();
      const endTime = new Date();
      progressRef.current.totalTimeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      progressRef.current.watchTime = currentTimeRef.current; // How much video was watched

      // Short delay for visual feedback, then complete
      setTimeout(() => {
        onComplete(progressRef.current);
      }, 300);
    } else {
      console.log('📋 Completion check:', {
        videoEnded: videoEndedRef.current,
        allQuestionsAnswered: allQuestionsAnsweredRef.current,
        answeredCount: answeredQuestionsRef.current.size,
        totalQuestions: questionsRef.current.length,
      });
    }
  }, [onComplete]);

  // Once every freeze point has been settled, see whether the check is done.
  const checkAllSettled = useCallback(() => {
    if (answeredQuestionsRef.current.size >= questionsRef.current.length) {
      console.log('✅ All questions answered');
      allQuestionsAnsweredRef.current = true;
      checkAndCompleteQuiz();
    }
  }, [checkAndCompleteQuiz]);

  // Progress handler - called by ReactPlayer
  const handleProgress = useCallback((state: OnProgressProps) => {
    const currentSeconds = state.playedSeconds;
    currentTimeRef.current = currentSeconds;

    // Update display time for UI
    setDisplayTime(Math.floor(currentSeconds));

    // Nothing is checked while a freeze is held. The last checked tick is left
    // where the freeze set it, so playback picks up from exactly that point.
    if (frozenQuestion || isProcessingRef.current) {
      return;
    }

    const previousTick = lastTickRef.current;
    lastTickRef.current = currentSeconds;

    // Paused, or no further on than last time - nothing can have been crossed.
    if (currentSeconds <= previousTick) {
      return;
    }

    // Find the EARLIEST freeze point crossed since the last tick.
    //
    // This replaces an older check that fired when the clock was within half a
    // second of a timestamp. The clock is only read twice a second, so that
    // could step straight over a freeze point - at double speed, or when two
    // were placed close together. Checking the span between ticks cannot miss
    // one, however close they are.
    let crossed: VideoQuizQuestionWithState | null = null;
    for (const question of questionsRef.current) {
      // Skip if already shown or answered
      if (shownQuestionsRef.current.has(question.id) || answeredQuestionsRef.current.has(question.id)) {
        continue;
      }
      if (question.timestamp <= previousTick || question.timestamp > currentSeconds) {
        continue;
      }
      if (!crossed || question.timestamp < crossed.timestamp) {
        crossed = question;
      }
    }

    if (!crossed) {
      return;
    }

    const question = crossed;
    console.log('📍 Freeze at', currentSeconds, '- Question:', question.id);

    // Mark as processing to prevent double-triggering
    isProcessingRef.current = true;
    shownQuestionsRef.current.add(question.id);

    // If two freeze points fell inside the same tick, the later one has not been
    // shown yet. Restarting the span from this one means it is caught as soon as
    // playback carries on, instead of being stepped over.
    lastTickRef.current = question.timestamp;

    // Use setTimeout to defer state updates and avoid React batching issues
    setTimeout(() => {
      setPlaying(false);
      setFrozenQuestion(question);
      // A hold that asks nothing, with the choice switched on, has no answer to
      // wait for - it goes straight to PLAY ON / REWIND.
      setAwaitingChoice(question.holdOnly === true && question.afterAnswer === 'choose');
      if (question.voiceClipId && voiceEnabled) {
        playVoice(question.voiceClipId);
      }
      isProcessingRef.current = false;
    }, 0);
  }, [frozenQuestion, voiceEnabled, playVoice]);

  /**
   * Let go of the frame and carry on. With `resumeAt`, playback goes back to
   * that point first (REWIND).
   */
  const releaseFreeze = useCallback((resumeAt?: number) => {
    pauseVoice();
    setFrozenQuestion(null);
    setAwaitingChoice(false);

    if (typeof resumeAt === 'number') {
      // Moving the clock by hand is a jump, not playback - start the crossing
      // span from where it lands so nothing in between fires.
      lastTickRef.current = resumeAt;
      currentTimeRef.current = resumeAt;
      playerRef.current?.seekTo(resumeAt, 'seconds');
    }

    setTimeout(() => setPlaying(true), 100);
  }, [pauseVoice]);

  /**
   * A hold that asks nothing is settled once the goalie moves on from it. It is
   * counted so the check can complete, but nothing is recorded as an answer and
   * nothing is scored - there was no question.
   */
  const settleHold = useCallback((question: VideoQuizQuestionWithState) => {
    if (answeredQuestionsRef.current.has(question.id)) return;
    answeredQuestionsRef.current.add(question.id);
    progressRef.current.questionsRemaining--;
  }, []);

  /**
   * Where REWIND goes back to.
   *
   * `rewindTo` if Michael set one (never later than the freeze itself).
   * Otherwise the start of this freeze point's own segment - the freeze point
   * before it in the video, or the start of the clip.
   *
   * This looks at position in the VIDEO, because that is where the segment
   * boundaries physically are. It has nothing to do with the order the
   * cumulative Knowledge Check asks in, which runs newest step first.
   */
  const rewindTargetFor = useCallback((question: VideoQuizQuestionWithState): number => {
    if (typeof question.rewindTo === 'number' && Number.isFinite(question.rewindTo) && question.rewindTo >= 0) {
      return Math.min(question.rewindTo, question.timestamp);
    }

    let segmentStart = 0;
    for (const other of questionsRef.current) {
      if (other.timestamp < question.timestamp && other.timestamp > segmentStart) {
        segmentStart = other.timestamp;
      }
    }
    return segmentStart;
  }, []);

  // Handle question answer
  const handleAnswer = useCallback((answer: string | string[]) => {
    if (!frozenQuestion) return;

    console.log('✅ Question answered:', frozenQuestion.id, 'Answer:', answer);

    // Mark as answered
    answeredQuestionsRef.current.add(frozenQuestion.id);

    // Calculate if correct
    let isCorrect = false;
    let pointsEarned = 0;

    const question = frozenQuestion;
    const isReflective = question.reflective === true;

    // Reflective questions are skipped entirely by the grader. Nothing below runs
    // for them, so `isCorrect` stays false and is never read — the `reflective`
    // flag on the stored answer is what every display site checks.
    if (!isReflective) {
      switch (question.type) {
        case 'multiple_choice':
          if (question.options) {
            const correctOptions = question.options.filter(opt => opt.isCorrect);
            if (Array.isArray(answer)) {
              const correctIds = correctOptions.map(opt => opt.id);
              isCorrect = answer.length === correctIds.length &&
                         answer.every(id => correctIds.includes(id));
            } else {
              isCorrect = correctOptions.some(opt => opt.id === answer);
            }
          }
          break;

        case 'true_false':
          isCorrect = String(question.correctAnswer) === String(answer);
          break;

        case 'fill_in_blank':
          if (question.correctAnswers) {
            const answers = Array.isArray(answer) ? answer : [answer];
            isCorrect = question.correctAnswers.every((correct, index) => {
              const userAnswer = answers[index];
              if (!userAnswer) return false;
              return question.caseSensitive
                ? userAnswer.trim() === correct.trim()
                : userAnswer.trim().toLowerCase() === correct.trim().toLowerCase();
            });
          }
          break;
      }

      if (isCorrect) {
        pointsEarned = question.points || 0;
      }
    }

    // Resolve the answer into words while the question is still in hand. Multiple
    // choice stores option ids, which tell a coach nothing in a report — "No" and
    // "Not Sure" are the whole reason reflective questions exist.
    const answerText = ((): string => {
      const values = Array.isArray(answer) ? answer : [answer];
      if (question.type === 'multiple_choice' && question.options) {
        return values
          .map(v => question.options!.find(opt => opt.id === v)?.text ?? String(v))
          .join(', ');
      }
      if (question.type === 'true_false') {
        return String(values[0]) === 'true' ? 'True' : 'False';
      }
      return values.join(', ');
    })();

    // Update progress ref (not state!)
    const questionAnswer: VideoQuestionAnswer = {
      questionId: frozenQuestion.id,
      questionType: question.type,
      timestamp: question.timestamp,
      answer,
      answerText,
      isCorrect,
      pointsEarned,
      reflective: isReflective,
      timeToAnswer: 0,
      answeredAt: Timestamp.now(),
    };

    progressRef.current.questionsAnswered.push(questionAnswer);
    progressRef.current.questionsRemaining--;
    progressRef.current.score += pointsEarned;
    // An all-reflective quiz has nothing to score against, so guard the divide —
    // `0 / 0` would otherwise write NaN into the goalie's progress record.
    progressRef.current.percentage = progressRef.current.maxScore > 0
      ? (progressRef.current.score / progressRef.current.maxScore) * 100
      : 0;

    // Update answered count for UI
    setAnsweredCount(prev => prev + 1);

    // Answered, but the frame stays held: PLAY ON / REWIND decides what happens
    // next, and the completion check waits for that choice.
    if (question.afterAnswer === 'choose') {
      setAwaitingChoice(true);
      return;
    }

    // Default: let go of the frame and carry on, as the player always has.
    releaseFreeze();
    checkAllSettled();
  }, [frozenQuestion, releaseFreeze, checkAllSettled]);

  // A hold with no question, and no choice: the goalie has looked, carry on.
  const handleAcknowledge = useCallback(() => {
    if (!frozenQuestion) return;
    settleHold(frozenQuestion);
    releaseFreeze();
    checkAllSettled();
  }, [frozenQuestion, settleHold, releaseFreeze, checkAllSettled]);

  // PLAY ON - carry on from the held frame.
  const handlePlayOn = useCallback(() => {
    if (!frozenQuestion) return;
    if (frozenQuestion.holdOnly) settleHold(frozenQuestion);
    releaseFreeze();
    checkAllSettled();
  }, [frozenQuestion, settleHold, releaseFreeze, checkAllSettled]);

  // REWIND - watch the segment again.
  //
  // No completion check here. The goalie has asked to watch more, so finishing
  // the check and leaving the page now would be wrong. This freeze point is
  // already settled and will not fire again on the replay; the check completes
  // when the video reaches its end, in handleEnded.
  const handleRewind = useCallback(() => {
    if (!frozenQuestion) return;
    if (frozenQuestion.holdOnly) settleHold(frozenQuestion);
    releaseFreeze(rewindTargetFor(frozenQuestion));
  }, [frozenQuestion, settleHold, releaseFreeze, rewindTargetFor]);

  // Video event handlers
  const resumeAtSeconds = initialProgress?.currentTime;
  const handleReady = useCallback(() => {
    console.log('✅ Video ready');
    setIsReady(true);

    if (resumeAtSeconds && resumeAtSeconds > 0) {
      lastTickRef.current = resumeAtSeconds;
      playerRef.current?.seekTo(resumeAtSeconds, 'seconds');
    }
  }, [resumeAtSeconds]);

  const handleDuration = useCallback((dur: number) => {
    // Only update if we get a valid duration from ReactPlayer
    if (dur && Number.isFinite(dur) && dur > 0) {
      setDuration(dur);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    console.log('🎬 Video ended');
    videoEndedRef.current = true;

    const unanswered = questionsRef.current.filter(
      q => !answeredQuestionsRef.current.has(q.id)
    );

    if (unanswered.length > 0) {
      console.log(`⚠️ ${unanswered.length} unanswered questions remaining`);
      // Don't complete yet - user needs to answer all questions
      toast.warning(`Please answer ${unanswered.length} remaining question(s) to complete the quiz`);

      // If there are unanswered questions, we might want to show them
      // For now, we'll just wait for the user to seek back
    } else {
      // All questions answered and video ended
      allQuestionsAnsweredRef.current = true;
      checkAndCompleteQuiz();
    }
  }, [checkAndCompleteQuiz]);

  // Handle seeking
  const handleSeek = useCallback((seconds: number) => {
    currentTimeRef.current = seconds;
    // A seek is a jump, not playback. Start the crossing span from where it
    // lands, so skipping ahead does not fire every freeze point skipped over.
    lastTickRef.current = seconds;
    playerRef.current?.seekTo(seconds, 'seconds');
  }, []);

  // Start quiz
  const handleStart = useCallback(() => {
    setHasStarted(true);
    setPlaying(true);
  }, []);

  // A hold with no question is not a question, so it takes no number and is not
  // counted in "N of M" or in the answered badge.
  //
  // Read from the prop, not questionsRef: the ref holds the same questions but
  // must not be read during render, where it can hand back a stale list.
  const askedQuestions = useMemo(
    () => quiz.questions.filter(q => !q.holdOnly),
    [quiz.questions]
  );
  const questionNumber = frozenQuestion
    ? askedQuestions.findIndex(q => q.id === frozenQuestion.id) + 1
    : 0;

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-2xl">
      <div className="relative aspect-video">
        <ReactPlayer
          ref={playerRef}
          url={quiz.videoUrl}
          playing={playing}
          controls={false}
          width="100%"
          height="100%"
          volume={volume}
          muted={muted}
          playbackRate={playbackRate}
          progressInterval={500}
          onProgress={handleProgress}
          onReady={handleReady}
          onDuration={handleDuration}
          onEnded={handleEnded}
          config={{
            file: {
              attributes: {
                preload: 'auto',
                playsInline: true,
              },
            },
          }}
        />

        {/* Loading */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}

        {/* Start Button */}
        {isReady && !hasStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold"
            >
              Start Quiz
            </button>
          </div>
        )}

        {/*
          Nothing is drawn over the picture once the check has started. The frozen
          frame has to stay sharp - see the panel below.
        */}
      </div>

      {/* Controls */}
      {hasStarted && (
        <VideoControls
          playing={playing}
          playbackRate={playbackRate}
          currentTime={displayTime}
          duration={duration}
          volume={volume}
          muted={muted}
          onPlayPause={() => setPlaying(!playing)}
          onSeek={handleSeek}
          onPlaybackRateChange={(rate) => setPlaybackRate(rate)}
          onVolumeChange={(vol) => setVolume(vol)}
          onMuteToggle={() => setMuted(!muted)}
          disabled={!!frozenQuestion}
        />
      )}

      {/*
        THE QUESTION PANEL - SG-11, rule 3. In Michael's words:

          "The video does not resize when a freeze fires. Same size before the
           freeze, during it, and after it. ... If the panel appearing would
           push, shrink or reflow the picture, reserve the space for it from the
           start so nothing moves."

        Two things hold that rule, and both must stay:

        1. The picture lives in the `aspect-video` box above. Its width comes from
           the container and its height from the ratio, so nothing rendered after
           it can change its size. The panel is a sibling BELOW it - never a child
           of that box, never `absolute`, never an overlay.

        2. The room is claimed here, when the check starts and before any freeze
           can fire, at a FIXED height. When a freeze fires the panel fills space
           that was already there, and nothing on the page moves. A long question
           scrolls inside this box; it does not grow it. Change the height if it
           needs changing, but keep it fixed.
      */}
      {hasStarted && (
        <div className="border-t border-white/10 bg-slate-950 p-3 sm:p-4">
          <div className="h-[340px] overflow-y-auto sm:h-[380px]">
            {frozenQuestion ? (
              <QuestionPanel
                // A fresh panel for each freeze point, so a half-picked answer
                // from one can never carry into the next.
                key={frozenQuestion.id}
                question={frozenQuestion}
                questionNumber={questionNumber}
                totalQuestions={askedQuestions.length}
                onAnswer={handleAnswer}
                awaitingChoice={awaitingChoice}
                onAcknowledge={handleAcknowledge}
                onPlayOn={handlePlayOn}
                onRewind={handleRewind}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center">
                {quiz.instructions && (
                  <p className="max-w-xl text-sm leading-relaxed text-white/45">
                    {quiz.instructions}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {quiz.settings.showProgressBar && askedQuestions.length > 0 && (
        <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded-full text-white text-xs">
          {answeredCount} / {askedQuestions.length} answered
        </div>
      )}
    </div>
  );
};
