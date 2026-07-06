'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Plus,
  X,
  Loader2,
  Save,
  Clock,
  Settings,
  PlayCircle,
  FileText,
  Video,
  HelpCircle,
} from 'lucide-react';
import { VideoUploader } from '@/components/coach/video-uploader';
import { VideoLibraryPicker } from '@/components/video';
import { VideoQuestionBuilder } from '@/components/admin/VideoQuestionBuilder';
import { customContentService } from '@/lib/database';
import { videoQuizService } from '@/lib/database';
import { toast } from 'sonner';
import { VideoQuizQuestion, VideoQuizSettings } from '@/types';
import { SkeletonContentPage } from '@/components/ui/skeletons';

const defaultSettings: VideoQuizSettings = {
  allowPlaybackSpeedChange: true,
  playbackSpeeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
  allowRewind: true,
  allowSkipAhead: false,
  requireSequentialAnswers: true,
  showProgressBar: true,
  autoPlayNext: true,
  showCorrectAnswers: true,
  showExplanations: true,
};

export default function CreateVideoQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const embedded = searchParams.get('embedded') === '1';
  // Get returnTo URL from search params (for returning to curriculum page after creation)
  const returnTo = searchParams.get('returnTo') || '/coach/content';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [videoDuration, setVideoDuration] = useState(0);
  const [questions, setQuestions] = useState<VideoQuizQuestion[]>([]);
  const [settings, setSettings] = useState<VideoQuizSettings>(defaultSettings);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'introduction' | 'development' | 'refinement'>('introduction');
  const [videoUrl, setVideoUrl] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const handleVideoUploaded = (url: string, duration?: number) => {
    setVideoUrl(url);
    if (duration) {
      setVideoDuration(duration);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const closeEmbedded = () => {
    window.parent?.postMessage({ type: 'coach-quiz-close' }, window.location.origin);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (!description.trim() || description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to create a quiz');
      return;
    }

    if (!validate()) {
      toast.error('Please fix the errors in the form');
      setActiveTab('info');
      return;
    }

    if (!videoUrl) {
      toast.error('Please add a video');
      setActiveTab('video');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      setActiveTab('questions');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate total points
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);
      const estimatedDuration = Math.ceil(videoDuration / 60) + Math.ceil(questions.length * 0.5);

      // Create the quiz in video_quizzes collection (shared with admin quizzes)
      const quizData = {
        title: title.trim(),
        description: description.trim(),
        videoUrl,
        videoDuration,
        questions,
        settings,
        difficulty,
        estimatedDuration,
        tags,
        isActive: true,
        isPublished: true,
        category: 'coach-content',
        sportId: 'coach-custom',
        skillId: 'coach-custom',
        createdBy: user.id,
        source: 'coach',
        metadata: {
          totalAttempts: 0,
          totalCompletions: 0,
          averageScore: 0,
          averageTimeSpent: 0,
          averageCompletionTime: 0,
          dropOffPoints: [],
        },
      };

      // Debug: Log user info and quiz data
      console.log('🔍 Creating quiz with:', {
        userId: user.id,
        userRole: user.role,
        userEmail: user.email,
        quizTitle: quizData.title,
        source: quizData.source,
        videoDuration: quizData.videoDuration,
        questionsCount: quizData.questions.length,
      });

      // Create quiz in video_quizzes collection
      const quizResult = await videoQuizService.createVideoQuiz(quizData);

      if (!quizResult.success) {
        throw new Error(quizResult.error?.message || 'Failed to create quiz');
      }

      // Also save reference in custom content library for coach's library view
      const contentData = {
        title: title.trim(),
        description: description.trim(),
        type: 'quiz' as const,
        content: JSON.stringify({
          videoQuizId: quizResult.data?.id,
          totalPoints,
          questionCount: questions.length,
        }),
        videoUrl,
        tags,
        isPublic,
        estimatedTimeMinutes: estimatedDuration,
      };

      const contentResult = await customContentService.createContent(user.id, contentData);

      if (contentResult.success && contentResult.data) {
        if (embedded) {
          window.parent?.postMessage({ type: 'coach-quiz-created', contentId: contentResult.data.id }, window.location.origin);
        } else {
          toast.success('Quiz created successfully');
          router.push(returnTo);
        }
      } else {
        throw new Error(contentResult.error?.message || 'Failed to save quiz to library');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save quiz';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return <SkeletonContentPage />;
  }

  return (
    <div className={`${embedded ? 'h-full' : 'min-h-screen'} flex flex-col bg-gradient-to-b from-zinc-50 via-white to-blue-50/30`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-950 via-blue-950 to-zinc-900 px-4 py-3 shadow-md shadow-zinc-300/30">
            {embedded ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={closeEmbedded}
                className="h-9 w-9 p-0 text-blue-100 hover:text-white hover:bg-white/10"
                aria-label="Close"
                title="Close"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Link href={returnTo}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-blue-100 hover:text-white hover:bg-white/10"
                  aria-label={returnTo.includes('/curriculum') ? 'Back to Curriculum' : 'Back to Content Library'}
                  title={returnTo.includes('/curriculum') ? 'Back to Curriculum' : 'Back to Content Library'}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-red-300 mb-1">Curriculum</p>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <PlayCircle className="h-6 w-6" />
                Create Video Quiz
              </h1>
              <p className="text-sm text-blue-100/80">
                Create an interactive video quiz with questions at specific timestamps
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
            <TabsTrigger value="info" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800">
              <FileText className="h-4 w-4" />
              Quiz Info
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800">
              <Video className="h-4 w-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              <HelpCircle className="h-4 w-4" />
              Questions
              {questions.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800 border-blue-200">
                  {questions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Quiz Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <Card className="border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter quiz title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this quiz covers"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={(v: 'introduction' | 'development' | 'refinement') => setDifficulty(v)}>
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="introduction">Introduction</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="refinement">Refinement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Library Options */}
            <Card className="border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Library Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Save to Library</Label>
                    <p className="text-xs text-muted-foreground">
                      Save this quiz to your content library for reuse
                    </p>
                  </div>
                  <Switch
                    checked={saveToLibrary}
                    onCheckedChange={setSaveToLibrary}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Make Public</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow other coaches to use this quiz
                    </p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Tab */}
          <TabsContent value="video" className="space-y-6">
            <Card className="border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Quiz Video</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload or add a video URL. Questions will be added at specific timestamps.
                </p>
                <div className="flex justify-end">
                  <VideoLibraryPicker onSelect={handleVideoUploaded} />
                </div>
                <VideoUploader
                  coachId={user.id}
                  onVideoUploaded={handleVideoUploaded}
                  initialVideoUrl={videoUrl}
                />
                {videoDuration > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Video duration: {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            {!videoUrl ? (
              <Card className="border-zinc-200 bg-white shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Video className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Add a Video First</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Please add a video in the Video tab before creating questions.
                  </p>
                  <Button onClick={() => setActiveTab('video')}>
                    Go to Video Tab
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <VideoQuestionBuilder
                questions={questions}
                videoDuration={videoDuration}
                videoUrl={videoUrl}
                onChange={setQuestions}
              />
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-zinc-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quiz Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Playback Speed Change</Label>
                      <p className="text-xs text-muted-foreground">
                        Let students adjust video playback speed
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowPlaybackSpeedChange}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, allowPlaybackSpeedChange: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Rewind</Label>
                      <p className="text-xs text-muted-foreground">
                        Let students rewind the video
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowRewind}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, allowRewind: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Skip Ahead</Label>
                      <p className="text-xs text-muted-foreground">
                        Let students skip ahead in the video
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowSkipAhead}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, allowSkipAhead: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Sequential Answers</Label>
                      <p className="text-xs text-muted-foreground">
                        Students must answer questions in order
                      </p>
                    </div>
                    <Switch
                      checked={settings.requireSequentialAnswers}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, requireSequentialAnswers: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Progress Bar</Label>
                      <p className="text-xs text-muted-foreground">
                        Display progress through the quiz
                      </p>
                    </div>
                    <Switch
                      checked={settings.showProgressBar}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, showProgressBar: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Correct Answers</Label>
                      <p className="text-xs text-muted-foreground">
                        Show correct answers after submission
                      </p>
                    </div>
                    <Switch
                      checked={settings.showCorrectAnswers}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, showCorrectAnswers: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Explanations</Label>
                      <p className="text-xs text-muted-foreground">
                        Show explanations for each answer
                      </p>
                    </div>
                    <Switch
                      checked={settings.showExplanations}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, showExplanations: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Play Next</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically continue after answering
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoPlayNext}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, autoPlayNext: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-zinc-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {questions.length > 0 && (
                <span>{questions.length} question{questions.length !== 1 ? 's' : ''} added</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (embedded) {
                    closeEmbedded();
                  } else {
                    router.push(returnTo);
                  }
                }}
                disabled={isSubmitting}
                className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              >
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="bg-red-600 text-white hover:bg-red-700 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Quiz
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
