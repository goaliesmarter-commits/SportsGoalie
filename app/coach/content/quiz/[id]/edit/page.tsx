'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { VideoQuizQuestion, VideoQuizSettings, CustomContentLibrary } from '@/types';

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

export default function EditVideoQuizPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [videoDuration, setVideoDuration] = useState(0);
  const [questions, setQuestions] = useState<VideoQuizQuestion[]>([]);
  const [settings, setSettings] = useState<VideoQuizSettings>(defaultSettings);
  const [content, setContent] = useState<CustomContentLibrary | null>(null);
  const [videoQuizId, setVideoQuizId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'introduction' | 'development' | 'refinement'>('introduction');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const contentId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (contentId && user?.id) {
      loadContent();
    }
  }, [contentId, user?.id]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const result = await customContentService.getContent(contentId);

      if (result.success && result.data) {
        // Verify ownership
        if (result.data.createdBy !== user?.id) {
          toast.error('You do not have permission to edit this content');
          router.push('/coach/content');
          return;
        }

        if (result.data.type !== 'quiz') {
          toast.error('This content is not a quiz');
          router.push('/coach/content');
          return;
        }

        setContent(result.data);
        setTitle(result.data.title || '');
        setDescription(result.data.description || '');
        setVideoUrl(result.data.videoUrl || '');
        setTags(result.data.tags || []);
        setIsPublic(result.data.isPublic || false);

        // Try to load the video quiz data
        if (result.data.content) {
          try {
            const contentData = JSON.parse(result.data.content);
            if (contentData.videoQuizId) {
              setVideoQuizId(contentData.videoQuizId);
              // Load the full video quiz data
              const quizResult = await videoQuizService.getVideoQuiz(contentData.videoQuizId);
              if (quizResult.success && quizResult.data) {
                setQuestions(quizResult.data.questions || []);
                setSettings(quizResult.data.settings || defaultSettings);
                setVideoDuration(quizResult.data.videoDuration || 0);
                setDifficulty(quizResult.data.difficulty || 'introduction');
              }
            }
          } catch (e) {
            console.error('Failed to parse content data:', e);
          }
        }
      } else {
        toast.error('Content not found');
        router.push('/coach/content');
      }
    } catch (error) {
      console.error('Failed to load content:', error);
      toast.error('Failed to load content');
      router.push('/coach/content');
    } finally {
      setLoading(false);
    }
  };

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
    if (!user?.id || !content) {
      toast.error('Unable to save changes');
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

      // Update the video quiz if it exists
      if (videoQuizId) {
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
        };

        const quizResult = await videoQuizService.updateVideoQuiz(videoQuizId, quizData);

        if (!quizResult.success) {
          throw new Error(quizResult.error?.message || 'Failed to update quiz');
        }
      }

      // Update the custom content library entry
      const contentData = {
        title: title.trim(),
        description: description.trim(),
        videoUrl,
        tags,
        isPublic,
        estimatedTimeMinutes: estimatedDuration,
        content: JSON.stringify({
          videoQuizId,
          totalPoints,
          questionCount: questions.length,
        }),
      };

      const contentResult = await customContentService.updateContent(contentId, contentData, user.id);

      if (contentResult.success) {
        toast.success('Quiz updated successfully');
        router.push('/coach/content');
      } else {
        throw new Error(contentResult.error?.message || 'Failed to update quiz');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save quiz';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/coach/content">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Content Library
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <PlayCircle className="h-6 w-6" />
                Edit Video Quiz
              </h1>
              <p className="text-sm text-muted-foreground">
                Update your interactive video quiz
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quiz Info
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Questions
              {questions.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {questions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Quiz Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Library Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
            <Card>
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
              <Card>
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
            <Card>
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
      <div className="sticky bottom-0 bg-background border-t">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {questions.length > 0 && (
                <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/coach/content')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
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
