'use client';

import { useState, useRef, useEffect } from 'react';
import { VideoQuizQuestion, QuestionType } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Clock,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactPlayer from 'react-player';
import type { OnProgressProps } from 'react-player/base';

interface VideoQuestionBuilderProps {
  questions: VideoQuizQuestion[];
  videoDuration: number;
  videoUrl: string;
  onChange: (questions: VideoQuizQuestion[]) => void;
  /**
   * Fires once the player reports the real length of the video.
   *
   * YouTube/Vimeo/Drive links can't be measured by the `<video>` element the
   * uploader uses, so those quizzes were saving `videoDuration: 0` and the
   * student timeline came out broken. The player here knows the true duration —
   * this hands it back to the form so it gets saved.
   */
  onDurationDetected?: (seconds: number) => void;
}

export function VideoQuestionBuilder({
  questions,
  videoDuration,
  videoUrl,
  onChange,
  onDurationDetected,
}: VideoQuestionBuilderProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const videoFrameRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  // Real leftover space below wherever this component sits, measured live instead
  // of guessed — so the video grows as large as it can while the timeline/controls
  // below it are always guaranteed to still fit, on any host page and at any zoom
  // level. Falls back to the fixed-guess `.video-fit-frame` CSS class until the
  // first measurement lands.
  const [availableVideoHeight, setAvailableVideoHeight] = useState<number | null>(null);
  useEffect(() => {
    // The floor is the bottom of whatever actually scrolls this component. On the
    // full-page builders that is the window, but inside the coach modals the
    // builder sits in an `overflow-y: auto` box that ends well above the window
    // bottom. Measuring against the window there overshoots by the height of the
    // modal footer plus its margin, which pushed the timeline and the Add Question
    // button below the modal's visible area.
    // Capped at the window too: the video has to fit inside the scroll box *and*
    // on screen, and a scroll container taller than the viewport would otherwise
    // hand back a floor below the fold.
    const findScrollFloor = (el: HTMLElement): number => {
      for (let node = el.parentElement; node; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll') {
          return Math.min(node.getBoundingClientRect().bottom, window.innerHeight);
        }
      }
      return window.innerHeight;
    };

    const recompute = () => {
      if (!videoFrameRef.current || !controlsRef.current) return;
      const frameTop = videoFrameRef.current.getBoundingClientRect().top;
      const controlsHeight = controlsRef.current.offsetHeight;
      const available = findScrollFloor(videoFrameRef.current) - frameTop - controlsHeight - 24;
      setAvailableVideoHeight(Math.max(160, available));
    };

    recompute();
    window.addEventListener('resize', recompute);

    // The transport controls render taller once the player reports duration and
    // the timeline appears, so the first measurement is always short-lived.
    // Re-measure when they actually change size rather than trusting mount.
    const observer = new ResizeObserver(recompute);
    if (controlsRef.current) observer.observe(controlsRef.current);

    return () => {
      window.removeEventListener('resize', recompute);
      observer.disconnect();
    };
  }, []);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1); // 0 to 1
  const [muted, setMuted] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<number>(videoDuration);
  const [videoReady, setVideoReady] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<VideoQuizQuestion>>({
    type: 'multiple_choice',
    timestamp: 0,
    points: 10,
    required: true,
  });
  // Minimum gap enforced between two questions. Was a hard-coded 5s, which is
  // right for most videos and wrong for a fast drill where three cues land in
  // the same second. 0 turns the check off completely.
  const [minQuestionSpacing, setMinQuestionSpacing] = useState(5);

  // Fill in the blank split inputs
  const [blankBefore, setBlankBefore] = useState('');
  const [blankAfter, setBlankAfter] = useState('');

  const toggleQuestionExpanded = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgress = (state: OnProgressProps) => {
    setCurrentTime(Math.floor(state.playedSeconds));
  };

  // Reported lengths arrive more than once (onReady, then onDuration, and again on
  // some sources after the first seek). Only push a genuinely new value upward, so
  // the parent form isn't re-rendered for a number it already holds.
  const reportedDurationRef = useRef<number | null>(null);
  const applyDetectedDuration = (raw: number | null | undefined) => {
    if (raw == null || isNaN(raw) || !isFinite(raw) || raw <= 0) return;
    const rounded = Math.floor(raw);
    if (reportedDurationRef.current === rounded) return;
    reportedDurationRef.current = rounded;
    setDetectedDuration(rounded);
    onDurationDetected?.(rounded);
  };

  const handleReady = () => {
    setVideoReady(true);
    // Get duration from the player when it's ready
    if (playerRef.current) {
      applyDetectedDuration(playerRef.current.getDuration());
      // Duration is shown next to the progress bar; repeating it in a corner
      // popup was the other timestamp readout Michael asked us to drop.
      toast.success('Video loaded successfully');
    }
  };

  // YouTube and Vimeo frequently aren't ready to answer `getDuration()` at onReady
  // and report it a beat later through this callback instead. Without it a pasted
  // YouTube link saves a duration of 0.
  const handleDuration = (duration: number) => {
    applyDetectedDuration(duration);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0 && muted) {
      setMuted(false);
    }
  };

  const handleToggleMute = () => {
    setMuted(!muted);
  };

  const handleSeek = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, 'seconds');
      setCurrentTime(seconds);
    }
  };

  const handleSkipBackward = () => {
    const newTime = Math.max(0, currentTime - 5);
    handleSeek(newTime);
  };

  const handleSkipForward = () => {
    const maxDuration = detectedDuration || videoDuration;
    const newTime = Math.min(maxDuration, currentTime + 5);
    handleSeek(newTime);
  };

  const handleAddQuestionAtCurrentTime = () => {
    setNewQuestion({
      ...newQuestion,
      timestamp: Math.floor(currentTime),
    });
    setIsPlaying(false);
    // No toast here: the timestamp it announced is already visible in the form
    // field it just filled in, so the popup was noise on every click.

    // Scroll to the add question form
    const addQuestionForm = document.getElementById('add-question-form');
    if (addQuestionForm) {
      addQuestionForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleJumpToTimestamp = (timestamp: number) => {
    handleSeek(timestamp);
    setIsPlaying(false);
  };

  const handleAddQuestion = () => {
    if (!newQuestion.question || newQuestion.question.trim() === '') {
      toast.error('Question text is required');
      return;
    }

    if (newQuestion.timestamp === undefined || newQuestion.timestamp < 0) {
      toast.error('Valid timestamp is required');
      return;
    }

    // Use detected duration if available, otherwise fall back to provided duration
    const maxDuration = detectedDuration || videoDuration;
    if (newQuestion.timestamp! > maxDuration) {
      toast.error('Timestamp cannot exceed video duration');
      return;
    }

    // Check if timestamp conflicts with existing question. The gap is the coach's
    // to set; 0 means overlapping timestamps are allowed on purpose.
    if (minQuestionSpacing > 0) {
      const conflictingQuestion = questions.find(
        (q) => Math.abs(q.timestamp - newQuestion.timestamp!) < minQuestionSpacing
      );
      if (conflictingQuestion) {
        toast.error(
          `Questions must be at least ${minQuestionSpacing} second${minQuestionSpacing === 1 ? '' : 's'} apart`,
          { description: 'Change the minimum gap below if you want them closer together.' }
        );
        return;
      }
    }

    // Validate question based on type. Reflective questions are exempt from every
    // correct-answer rule — that is the entire point of them.
    const isReflective = newQuestion.reflective === true;
    if (newQuestion.type === 'multiple_choice') {
      if (!newQuestion.options || newQuestion.options.length < 2) {
        toast.error('Multiple choice questions need at least 2 options');
        return;
      }
      if (!isReflective && !newQuestion.options.some((opt: any) => opt.isCorrect)) {
        toast.error('At least one option must be marked as correct', {
          description: 'Or switch on "No right answer" if this is a reflective question.',
        });
        return;
      }
    } else if (newQuestion.type === 'true_false') {
      if (!isReflective && newQuestion.correctAnswer === undefined) {
        toast.error('Correct answer is required for true/false questions');
        return;
      }
    } else if (newQuestion.type === 'fill_in_blank') {
      if (!newQuestion.correctAnswers || newQuestion.correctAnswers.length === 0) {
        toast.error('At least one correct answer is required');
        return;
      }
    }

    const questionToAdd: VideoQuizQuestion = {
      id: `q_${Date.now()}`,
      type: newQuestion.type as QuestionType,
      question: newQuestion.question,
      timestamp: newQuestion.timestamp!,
      // Reflective questions score nothing, so they can't drag a percentage down
      // and can't inflate it either.
      points: isReflective ? 0 : newQuestion.points || 10,
      required: newQuestion.required !== false,
      reflective: isReflective,
      explanation: newQuestion.explanation,
      // Clear any correctness the coach set before switching the toggle on, so a
      // stale tick can't come back as grading later.
      options: isReflective
        ? newQuestion.options?.map((opt: any) => ({ ...opt, isCorrect: false }))
        : newQuestion.options,
      correctAnswer: isReflective ? undefined : newQuestion.correctAnswer,
      correctAnswers: newQuestion.correctAnswers,
      caseSensitive: newQuestion.caseSensitive,
    };

    const updatedQuestions = [...questions, questionToAdd].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    onChange(updatedQuestions);

    // Reset form
    setNewQuestion({
      type: 'multiple_choice',
      timestamp: 0,
      points: 10,
      required: true,
      reflective: false,
    });
    setBlankBefore('');
    setBlankAfter('');

    toast.success('Question added successfully');
  };

  const handleDeleteQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    onChange(updatedQuestions);
    toast.success('Question deleted');
  };

  const renderQuestionTypeFields = () => {
    switch (newQuestion.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-4">
            <div>
              <Label>Options</Label>
              {newQuestion.reflective && (
                <p className="text-xs text-gray-500 mt-1">
                  No right answer — whichever option the goalie picks is recorded as their response.
                </p>
              )}
              <div className="space-y-2 mt-2">
                {(newQuestion.options || []).map((option: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.text}
                      onChange={(e) => {
                        const newOptions = [...(newQuestion.options || [])];
                        newOptions[index] = { ...option, text: e.target.value };
                        setNewQuestion({ ...newQuestion, options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {!newQuestion.reflective && (
                      <>
                        <Switch
                          checked={option.isCorrect}
                          onCheckedChange={(checked) => {
                            const newOptions = [...(newQuestion.options || [])];
                            newOptions[index] = { ...option, isCorrect: checked };
                            setNewQuestion({ ...newQuestion, options: newOptions });
                          }}
                        />
                        <Label className="text-sm">Correct</Label>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newOptions = (newQuestion.options || []).filter(
                          (_: any, i: number) => i !== index
                        );
                        setNewQuestion({ ...newQuestion, options: newOptions });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOptions = [
                      ...(newQuestion.options || []),
                      { id: `opt_${Date.now()}`, text: '', isCorrect: false },
                    ];
                    setNewQuestion({ ...newQuestion, options: newOptions });
                  }}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              </div>
            </div>
          </div>
        );

      case 'true_false':
        if (newQuestion.reflective) {
          return (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                No right answer — the goalie answers True or False and their choice is recorded as is.
              </p>
            </div>
          );
        }
        return (
          <div className="space-y-3">
            <Label>What is the correct answer? *</Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: true })}
                className={`flex-1 py-4 px-6 rounded-lg border-2 font-semibold text-lg transition-all ${
                  newQuestion.correctAnswer === true
                    ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    newQuestion.correctAnswer === true
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}>
                    {newQuestion.correctAnswer === true && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </span>
                  True
                </div>
              </button>
              <button
                type="button"
                onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: false })}
                className={`flex-1 py-4 px-6 rounded-lg border-2 font-semibold text-lg transition-all ${
                  newQuestion.correctAnswer === false
                    ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    newQuestion.correctAnswer === false
                      ? 'border-red-500 bg-red-500'
                      : 'border-gray-300'
                  }`}>
                    {newQuestion.correctAnswer === false && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </span>
                  False
                </div>
              </button>
            </div>
            {newQuestion.correctAnswer === undefined && (
              <p className="text-sm text-amber-600">
                Please select whether the correct answer is True or False
              </p>
            )}
          </div>
        );

      case 'fill_in_blank':
        return (
          <div className="space-y-4">
            {/* Question Builder */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <Label className="text-sm font-medium">Build Your Question</Label>
              <p className="text-xs text-gray-500">
                Enter the text before and after the blank. The blank will be automatically placed between them.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={blankBefore}
                  onChange={(e) => {
                    setBlankBefore(e.target.value);
                    setNewQuestion({
                      ...newQuestion,
                      question: `${e.target.value} ___ ${blankAfter}`.trim(),
                    });
                  }}
                  placeholder="A goalie who drops both pads to seal the ice is in the"
                  className="flex-1 min-w-[200px]"
                />
                <div className="flex items-center gap-1 px-4 py-2 bg-primary/10 border-2 border-dashed border-primary rounded-lg">
                  <span className="w-16 h-6 bg-white border border-gray-300 rounded" />
                  <span className="text-xs text-primary font-medium">BLANK</span>
                </div>
                <Input
                  value={blankAfter}
                  onChange={(e) => {
                    setBlankAfter(e.target.value);
                    setNewQuestion({
                      ...newQuestion,
                      question: `${blankBefore} ___ ${e.target.value}`.trim(),
                    });
                  }}
                  placeholder="position. (optional)"
                  className="flex-1 min-w-[200px]"
                />
              </div>
            </div>

            {/* Preview */}
            {(blankBefore || blankAfter) && (
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <Label className="text-xs text-gray-500 mb-2 block">Preview (how students will see it):</Label>
                <p className="text-gray-800 text-lg">
                  {blankBefore}
                  {blankBefore && ' '}
                  <span className="inline-block min-w-[120px] mx-1 px-4 py-1 bg-gray-100 border-2 border-gray-300 rounded text-gray-400 font-medium text-center">
                    {(newQuestion.correctAnswers && newQuestion.correctAnswers[0]) || 'answer here'}
                  </span>
                  {blankAfter && ' '}
                  {blankAfter}
                </p>
              </div>
            )}

            {/* Correct Answers */}
            <div>
              <Label className="mb-1 block">Acceptable Answers *</Label>
              <p className="text-xs text-gray-500 mb-2">
                What answers should be accepted? Add multiple variations if needed.
              </p>
              <div className="space-y-2">
                {(newQuestion.correctAnswers || ['']).map((answer, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={answer}
                      onChange={(e) => {
                        const newAnswers = [...(newQuestion.correctAnswers || [''])];
                        newAnswers[index] = e.target.value;
                        setNewQuestion({ ...newQuestion, correctAnswers: newAnswers });
                      }}
                      placeholder={index === 0 ? 'Primary answer (e.g., goalie)' : 'Alternative answer'}
                      className="flex-1"
                    />
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newAnswers = (newQuestion.correctAnswers || []).filter((_, i) => i !== index);
                          setNewQuestion({ ...newQuestion, correctAnswers: newAnswers });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newAnswers = [...(newQuestion.correctAnswers || ['']), ''];
                    setNewQuestion({ ...newQuestion, correctAnswers: newAnswers });
                  }}
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Alternative Answer
                </Button>
              </div>
            </div>

            {/* Case Sensitive Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm">Case Sensitive</Label>
                <p className="text-xs text-gray-500">
                  {newQuestion.caseSensitive
                    ? '"Goalie" and "goalie" will be treated as different answers'
                    : '"Goalie" and "goalie" will both be accepted'}
                </p>
              </div>
              <Switch
                checked={newQuestion.caseSensitive}
                onCheckedChange={(checked) =>
                  setNewQuestion({ ...newQuestion, caseSensitive: checked })
                }
              />
            </div>
          </div>
        );

      case 'descriptive':
        return (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Descriptive questions will require manual grading or AI evaluation.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    // `no-button-zoom` here rather than only on the page, so the builder behaves
    // the same wherever it is embedded (coach and admin quiz screens).
    <div className="no-button-zoom space-y-6">
      {/* Video Player Section */}
      {/*
        Tight header on purpose. The player is capped by the space left below it, so every
        pixel this card spends on chrome comes off the video. `short:` drops the hint line
        and squeezes further once the viewport can't afford it.
      */}
      <Card className="gap-3 py-3 short:gap-2 short:py-2">
        <CardHeader className="short:px-4">
          <CardTitle className="text-base short:text-sm">Video Preview & Controls</CardTitle>
          <p className="text-sm text-gray-600 short:hidden">
            Watch the video and pause at any moment to add a question at that timestamp
          </p>
        </CardHeader>
        <CardContent className="short:px-4">
          <div className="space-y-4 short:space-y-2">
            {/* Video Player */}
            <div
              ref={videoFrameRef}
              className={cn(
                'relative bg-black rounded-lg overflow-hidden aspect-video cursor-pointer group mx-auto w-full',
                availableVideoHeight == null &&
                  'video-fit-frame [--video-chrome:36rem] short:[--video-chrome:28rem]'
              )}
              style={
                availableVideoHeight != null
                  ? { maxWidth: `${Math.round((availableVideoHeight * 16) / 9)}px` }
                  : undefined
              }
              onClick={handlePlayPause}
            >
              <ReactPlayer
                ref={playerRef}
                url={videoUrl}
                playing={isPlaying}
                controls={false}
                width="100%"
                height="100%"
                playbackRate={playbackRate}
                volume={volume}
                muted={muted}
                onProgress={handleProgress}
                onReady={handleReady}
                onDuration={handleDuration}
                onPlay={handlePlay}
                onPause={handlePause}
                progressInterval={100}
              />
              {/* Play/Pause Overlay on Hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/50 rounded-full p-4">
                  {isPlaying ? (
                    <Pause className="h-12 w-12 text-white" />
                  ) : (
                    <Play className="h-12 w-12 text-white" />
                  )}
                </div>
              </div>
              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <Clock className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                    <p>Loading video...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Controls */}
            <div ref={controlsRef} className="space-y-4 short:space-y-2">
              {/*
                Elapsed / scrubber / duration on one line rather than a caption row above
                the bar. Same information, ~40px shorter — and the player is capped by the
                space left below it, so those pixels go straight into the video.
              */}
              <div className="flex items-center gap-3 short:gap-2 text-sm">
                <span className="font-medium tabular-nums shrink-0">{formatTimestamp(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={detectedDuration || videoDuration}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseInt(e.target.value))}
                  className="flex-1 min-w-0 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-gray-500 tabular-nums shrink-0">
                  {formatTimestamp(detectedDuration || videoDuration)}
                  {detectedDuration && detectedDuration !== videoDuration && (
                    <span className="ml-2 text-xs text-green-600">(auto-detected)</span>
                  )}
                </span>
              </div>

              {/* Control Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSkipBackward}
                    title="Skip backward 5 seconds"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="default"
                    size="icon"
                    onClick={handlePlayPause}
                    className="h-12 w-12 short:h-10 short:w-10 bg-red-600 text-white hover:bg-red-700"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSkipForward}
                    title="Skip forward 5 seconds"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>

                  <div className="ml-4">
                    <Select
                      value={String(playbackRate)}
                      onValueChange={(value) => setPlaybackRate(parseFloat(value))}
                    >
                      <SelectTrigger className="w-[100px] border-slate-300 focus:ring-red-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Volume Controls */}
                  <div className="flex items-center gap-2 ml-4 border-l pl-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleToggleMute}
                      title={muted ? "Unmute" : "Mute"}
                      className="text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                    >
                      {muted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={muted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      title={`Volume: ${Math.round(volume * 100)}%`}
                    />
                    <span className="text-xs text-gray-600 w-10">
                      {Math.round((muted ? 0 : volume) * 100)}%
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleAddQuestionAtCurrentTime}
                  variant="default"
                  size="lg"
                  className="gap-2 short:h-9 bg-gradient-to-r from-red-600 to-blue-600 text-white hover:from-red-700 hover:to-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  Add Question Here
                  <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded">
                    {formatTimestamp(currentTime)}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Questions ({questions.length})</CardTitle>
            <div className="text-sm text-gray-500">
              Video: {formatTimestamp(detectedDuration || videoDuration)}
              {detectedDuration && detectedDuration !== videoDuration && (
                <span className="ml-2 text-xs text-green-600">(auto-detected)</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="mx-auto h-12 w-12 mb-4 text-gray-400" />
              <p>No questions added yet</p>
              <p className="text-sm mt-1">Add your first question below</p>
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleJumpToTimestamp(question.timestamp)}
                        className="flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/10"
                        title="Jump to this timestamp in the video"
                      >
                        <PlayCircle className="h-4 w-4" />
                        {formatTimestamp(question.timestamp)}
                      </Button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{question.question}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {question.type.replace('_', ' ')}
                            </span>
                            {question.reflective ? (
                              <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium">
                                Reflective — not scored
                              </span>
                            ) : (
                              <span className="text-xs text-gray-600">
                                {question.points} points
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleQuestionExpanded(index)}
                          >
                            {expandedQuestions.has(index) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteQuestion(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      {expandedQuestions.has(index) && (
                        <div className="mt-4 p-4 bg-gray-50 rounded space-y-2">
                          {question.explanation && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">
                                Explanation:
                              </span>
                              <p className="text-sm text-gray-600 mt-1">
                                {question.explanation}
                              </p>
                            </div>
                          )}
                          {question.type === 'multiple_choice' && question.options && (
                            <div>
                              <span className="text-xs font-medium text-gray-700">
                                Options:
                              </span>
                              <ul className="text-sm text-gray-600 mt-1 space-y-1">
                                {question.options.map((opt) => (
                                  <li key={opt.id} className="flex items-center gap-2">
                                    {opt.isCorrect && (
                                      <span className="text-green-600 font-bold">✓</span>
                                    )}
                                    {opt.text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Question Form */}
      <Card id="add-question-form">
        <CardHeader>
          <CardTitle>Add New Question</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            The timestamp is automatically set when you click "Add Question Here" while watching the video
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="questionType">Question Type</Label>
              <Select
                value={newQuestion.type}
                onValueChange={(value) => {
                  // Clear type-specific fields when changing type
                  setBlankBefore('');
                  setBlankAfter('');
                  setNewQuestion({
                    ...newQuestion,
                    type: value as QuestionType,
                    question: '',
                    options: undefined,
                    correctAnswer: undefined,
                    correctAnswers: undefined,
                    // Fill-in-the-blank is graded by matching text, so there is no
                    // coherent reflective version of it.
                    reflective: value === 'fill_in_blank' ? false : newQuestion.reflective,
                  });
                }}
              >
                <SelectTrigger className="w-full border-slate-300 focus:ring-red-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="fill_in_blank">Fill in the Blank</SelectItem>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timestamp">
                Timestamp (seconds) - Max: {detectedDuration || videoDuration}s
              </Label>
              <Input
                id="timestamp"
                type="number"
                min="0"
                max={detectedDuration || videoDuration}
                value={newQuestion.timestamp}
                onChange={(e) =>
                  setNewQuestion({
                    ...newQuestion,
                    timestamp: parseInt(e.target.value),
                  })
                }
                className="w-full border-slate-300 focus-visible:ring-red-200"
              />
              <p className="text-xs text-gray-500">
                {formatTimestamp(newQuestion.timestamp || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min="1"
                disabled={newQuestion.reflective}
                value={newQuestion.reflective ? 0 : newQuestion.points}
                onChange={(e) =>
                  setNewQuestion({
                    ...newQuestion,
                    points: parseInt(e.target.value),
                  })
                }
                className="w-full border-slate-300 focus-visible:ring-red-200 disabled:bg-gray-100 disabled:text-gray-400"
              />
              {newQuestion.reflective && (
                <p className="text-xs text-gray-500">
                  Reflective questions aren&apos;t scored, so they don&apos;t affect the goalie&apos;s percentage.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minSpacing">Minimum gap between questions</Label>
              <Input
                id="minSpacing"
                type="number"
                min="0"
                max="120"
                value={minQuestionSpacing}
                onChange={(e) => {
                  const next = parseInt(e.target.value);
                  setMinQuestionSpacing(Number.isNaN(next) ? 0 : Math.max(0, Math.min(120, next)));
                }}
                className="w-full border-slate-300 focus-visible:ring-red-200"
              />
              <p className="text-xs text-gray-500">
                {minQuestionSpacing === 0
                  ? 'Off — questions can sit at the same moment in the video.'
                  : `Questions must be at least ${minQuestionSpacing}s apart. Set to 0 to turn this off.`}
              </p>
            </div>
          </div>

          {/* Question Text - hidden for fill_in_blank since we use separate inputs */}
          {newQuestion.type !== 'fill_in_blank' && (
            <div>
              <Label htmlFor="questionText">Question Text *</Label>
              <Textarea
                id="questionText"
                value={newQuestion.question || ''}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, question: e.target.value })
                }
                placeholder={
                  newQuestion.type === 'true_false'
                    ? 'Example: A goalkeeper can use their hands inside the penalty area.'
                    : 'Enter your question'
                }
                rows={2}
                className="border-slate-300 focus-visible:ring-red-200"
              />
            </div>
          )}

          {/*
            Reflective mode. Sits above the answer fields on purpose — it changes what
            those fields ask for, so it has to be decided first.
          */}
          {newQuestion.type !== 'fill_in_blank' && (
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50/60">
              <div>
                <Label className="text-sm font-medium">No right answer (reflective question)</Label>
                <p className="text-xs text-gray-600 mt-1">
                  For questions like &ldquo;Did that save feel balanced?&rdquo; — the goalie&apos;s answer is
                  recorded and shown to you, but it is never marked wrong and never scored.
                </p>
              </div>
              <Switch
                checked={newQuestion.reflective === true}
                onCheckedChange={(checked) =>
                  setNewQuestion({ ...newQuestion, reflective: checked })
                }
              />
            </div>
          )}

          {renderQuestionTypeFields()}

          <div>
            <Label htmlFor="explanation">Explanation (optional)</Label>
            <Textarea
              id="explanation"
              value={newQuestion.explanation || ''}
              onChange={(e) =>
                setNewQuestion({ ...newQuestion, explanation: e.target.value })
              }
              placeholder="Provide an explanation for the answer"
              rows={2}
              className="border-slate-300 focus-visible:ring-red-200"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={newQuestion.required !== false}
              onCheckedChange={(checked) =>
                setNewQuestion({ ...newQuestion, required: checked })
              }
            />
            <Label>Required Question</Label>
          </div>

          <Button onClick={handleAddQuestion} className="w-full bg-gradient-to-r from-red-600 to-blue-600 text-white hover:from-red-700 hover:to-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
