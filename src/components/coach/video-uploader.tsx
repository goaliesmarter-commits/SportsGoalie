'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Upload, Video, X, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { storageService, UploadProgress, STORAGE_CONFIGS } from '@/lib/firebase/storage.service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BLUE = '#37b5ff';

/**
 * This component renders on two very different backgrounds: the navy admin/coach
 * panels it was designed for, and the white shadcn cards on the coach content
 * pages. Every colour below is therefore picked per surface — hard-coded
 * `text-white` made the drop zone and its instructions literally invisible on
 * white, so coaches could not tell where to click.
 */
type Surface = 'dark' | 'light';

const SURFACE_STYLES: Record<Surface, Record<string, string>> = {
  dark: {
    shell: 'border-[#60cdff]/20 bg-white/[0.03]',
    tabsList: 'bg-white/5 border-white/10',
    tabInactive: 'text-white/50',
    dropzone: 'border-white/15 hover:border-[#37b5ff]/50',
    dropzoneIcon: 'text-white/30',
    heading: 'text-white',
    muted: 'text-white/50',
    subtle: 'text-white/40',
    button: 'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white',
    input: 'bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#37b5ff]/40',
    label: 'text-white/70',
    infoBox: 'bg-white/5 border-white/10',
    progressTrack: 'bg-white/10',
    success: 'text-emerald-400',
    error: 'text-red-400',
  },
  light: {
    shell: 'border-zinc-200 bg-zinc-50',
    tabsList: 'bg-zinc-100 border-zinc-200',
    tabInactive: 'text-zinc-600 hover:text-zinc-900',
    dropzone: 'border-zinc-300 bg-white hover:border-[#37b5ff] hover:bg-[#37b5ff]/[0.04]',
    dropzoneIcon: 'text-zinc-400',
    heading: 'text-zinc-900',
    muted: 'text-zinc-600',
    subtle: 'text-zinc-500',
    button: 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900',
    input: 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-[#37b5ff]/40',
    label: 'text-zinc-700',
    infoBox: 'bg-blue-50 border-blue-200',
    progressTrack: 'bg-zinc-200',
    success: 'text-emerald-600',
    error: 'text-red-600',
  },
};

type VideoSourceType = 'youtube' | 'vimeo' | 'google-drive' | 'direct';

function getVideoSourceType(url: string): VideoSourceType {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('drive.google.com')) return 'google-drive';
  return 'direct';
}

/**
 * Extract Google Drive file ID from various URL formats
 */
function extractGoogleDriveId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,  // /file/d/ID/...
    /id=([a-zA-Z0-9_-]+)/,          // ?id=ID or &id=ID
    /\/d\/([a-zA-Z0-9_-]+)/,        // /d/ID/...
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface VideoUploaderProps {
  /** Coach ID for upload path (use this or userId) */
  coachId?: string;
  /** Alternative to coachId for non-coach contexts */
  userId?: string;
  /** Custom upload folder path (overrides default) */
  uploadFolder?: string;
  onVideoUploaded: (url: string, duration?: number) => void;
  initialVideoUrl?: string;
  className?: string;
  /**
   * Background this renders on. Defaults to `dark` — the navy admin/coach panels
   * it was built for. Pass `light` on white cards (the coach content pages).
   */
  surface?: Surface;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function VideoUploader({
  coachId,
  userId,
  uploadFolder,
  onVideoUploaded,
  initialVideoUrl,
  className,
  surface = 'dark',
}: VideoUploaderProps) {
  const s = SURFACE_STYLES[surface];
  // Determine upload path - use custom folder, or fall back to coach/user path
  const effectiveUserId = coachId || userId || 'anonymous';
  const effectiveUploadFolder = uploadFolder || `coach-content/${effectiveUserId}/videos`;
  const [uploadState, setUploadState] = useState<UploadState>(
    initialVideoUrl ? 'success' : 'idle'
  );
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl || '');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>(
    initialVideoUrl && !initialVideoUrl.includes('firebasestorage') ? 'url' : 'upload'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const MAX_SIZE_BYTES = STORAGE_CONFIGS.VIDEOS.maxSizeBytes;
  const ALLOWED_TYPES = STORAGE_CONFIGS.VIDEOS.allowedTypes;

  // Determine video source type for URL tab
  const videoSourceType = useMemo(() => {
    return videoUrl ? getVideoSourceType(videoUrl) : 'direct';
  }, [videoUrl]);

  const isExternalPlatform = videoSourceType !== 'direct';

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(MAX_SIZE_BYTES)})`);
      return false;
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage(`File type "${file.type}" is not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    console.log('🎬 handleFileSelect called:', { fileName: file.name, fileSize: file.size, fileType: file.type });
    setErrorMessage(null);

    if (!validateFile(file)) {
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    setUploadState('idle');

    // Create a temporary URL to get video duration
    const tempUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';

    let durationSet = false;
    const trySetDuration = () => {
      const duration = tempVideo.duration;
      console.log('🎬 trySetDuration - duration:', duration, 'isFinite:', Number.isFinite(duration), 'readyState:', tempVideo.readyState);
      if (!durationSet && Number.isFinite(duration) && duration > 0) {
        durationSet = true;
        const flooredDuration = Math.floor(duration);
        console.log('🎬 Setting duration:', flooredDuration);
        setVideoDuration(flooredDuration);
        URL.revokeObjectURL(tempUrl);
      }
    };

    // Different formats report duration at different events
    tempVideo.onloadedmetadata = () => {
      trySetDuration();
      // WebM files often report Infinity duration - seek to end to force calculation
      if (!Number.isFinite(tempVideo.duration)) {
        console.log('🎬 Duration is Infinity, seeking to end to calculate...');
        tempVideo.currentTime = Number.MAX_SAFE_INTEGER;
      }
    };
    tempVideo.ondurationchange = trySetDuration;
    tempVideo.onloadeddata = trySetDuration;

    // When seeking completes, the duration should be available
    tempVideo.onseeked = () => {
      console.log('🎬 Seeked - duration now:', tempVideo.duration);
      trySetDuration();
    };

    // Clean up on error
    tempVideo.onerror = (e) => {
      console.log('🎬 Video error during duration detection:', e);
      if (!durationSet) {
        URL.revokeObjectURL(tempUrl);
      }
    };

    // Fallback: clean up after timeout if duration never becomes available
    setTimeout(() => {
      if (!durationSet) {
        console.log('🎬 Duration detection timeout - duration never became available');
        URL.revokeObjectURL(tempUrl);
      }
    }, 5000);

    tempVideo.src = tempUrl;
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const result = await storageService.uploadFile(
        selectedFile,
        {
          folder: effectiveUploadFolder,
          maxSizeBytes: MAX_SIZE_BYTES,
          allowedTypes: ALLOWED_TYPES,
          customMetadata: {
            uploadedBy: effectiveUserId,
            contentType: 'video',
          },
        },
        (progress: UploadProgress) => {
          setUploadProgress(Math.round(progress.percentage));
        }
      );

      if (result.success && result.url) {
        console.log('🎬 VideoUploader upload success, calling onVideoUploaded:', { url: result.url, videoDuration });
        setVideoUrl(result.url);
        setUploadState('success');
        onVideoUploaded(result.url, videoDuration);
        toast.success('Video uploaded successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadState('error');
      const message = error instanceof Error ? error.message : 'Failed to upload video';
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (!videoUrl.trim()) {
      setErrorMessage('Please enter a video URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(videoUrl);
    } catch {
      setErrorMessage('Please enter a valid URL');
      return;
    }

    // Handle Google Drive URLs - convert to embeddable format
    if (videoSourceType === 'google-drive') {
      const driveId = extractGoogleDriveId(videoUrl);
      if (driveId) {
        const embedUrl = `https://drive.google.com/file/d/${driveId}/preview`;
        setVideoUrl(embedUrl);
        // Google Drive videos can't have duration detected automatically
        onVideoUploaded(embedUrl, undefined);
        setUploadState('success');
        toast.success('Google Drive video URL added', {
          description: 'Duration will be detected when video plays',
        });
        return;
      } else {
        setErrorMessage('Could not extract Google Drive file ID from URL');
        return;
      }
    }

    // Get video duration from URL for direct URLs
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      const rawDuration = tempVideo.duration;
      if (Number.isFinite(rawDuration) && rawDuration > 0) {
        const duration = Math.floor(rawDuration);
        setVideoDuration(duration);
        onVideoUploaded(videoUrl, duration);
      } else {
        // Duration not available (e.g., streaming video)
        onVideoUploaded(videoUrl, undefined);
      }
      setUploadState('success');
      toast.success('Video URL added successfully');
    };
    tempVideo.onerror = () => {
      // For external URLs (YouTube, Vimeo, etc.), we can't get duration via video element
      onVideoUploaded(videoUrl, undefined);
      setUploadState('success');
      toast.success('Video URL added successfully');
    };
    tempVideo.src = videoUrl;
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setVideoUrl('');
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMessage(null);
    setVideoDuration(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderUploadArea = () => {
    if (uploadState === 'success' && videoUrl) {
      return (
        <div className="space-y-4">
          <div className="video-fit-frame [--video-chrome:38rem] short:[--video-chrome:32rem] relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className={cn('flex items-center gap-2 text-sm', s.success)}>
              <CheckCircle2 className="h-4 w-4" />
              <span>Video ready</span>
              {videoDuration !== undefined && Number.isFinite(videoDuration) && (
                <span className={s.subtle}>
                  ({Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')})
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className={s.button}
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      );
    }

    if (uploadState === 'uploading') {
      return (
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: BLUE }} />
          </div>
          <div className="space-y-2">
            <Progress value={uploadProgress} className={cn('h-2', s.progressTrack)} />
            <p className={cn('text-sm text-center', s.muted)}>
              Uploading... {uploadProgress}%
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a video file"
        className={cn(
          'border-2 border-dashed rounded-lg p-8 short:p-4 max-sm:p-3 text-center transition-colors cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#37b5ff]/60',
          isDragging ? 'bg-[#37b5ff]/10' : s.dropzone,
          uploadState === 'error' && 'border-red-400/50 bg-red-400/5'
        )}
        style={{ borderColor: isDragging ? BLUE : undefined }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        {uploadState === 'error' ? (
          <div className="space-y-2">
            <AlertCircle className={cn('h-12 w-12 mx-auto', s.error)} />
            <p className={cn('text-sm', s.error)}>{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              className={s.button}
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
            >
              Try Again
            </Button>
          </div>
        ) : selectedFile ? (
          <div className="space-y-4">
            <Video className="h-12 w-12 mx-auto" style={{ color: BLUE }} />
            <div>
              <p className={cn('font-medium', s.heading)}>{selectedFile.name}</p>
              <p className={cn('text-sm', s.muted)}>
                {formatFileSize(selectedFile.size)}
                {videoDuration !== undefined && Number.isFinite(videoDuration) && ` • ${Math.floor(videoDuration / 60)}:${(videoDuration % 60).toString().padStart(2, '0')}`}
              </p>
            </div>
            <Button
              className="bg-gradient-to-r from-[#37b5ff] to-[#2596d1] hover:from-[#37b5ff] hover:to-[#1f7fb3] text-white border-0 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          </div>
        ) : (
          <div className="space-y-3 short:space-y-2">
            <Upload className={cn('h-12 w-12 short:h-8 short:w-8 mx-auto', s.dropzoneIcon)} />
            <div className="space-y-1">
              <p className={cn('font-semibold', s.heading)}>Click here to upload a video</p>
              <p className={cn('text-sm short:hidden', s.subtle)}>
                or drag and drop it into this box
              </p>
            </div>
            {/* Explicit target as well as the whole-box click — the box alone did not
                read as clickable, which is what stalled coaches on this screen. */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={s.button}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
            {/* Short viewports get one combined line instead of two, so the drop
                zone still fits above the sticky footer without losing the info. */}
            <p className={cn('text-xs short:hidden', s.subtle)}>
              MP4, WebM or MOV — up to {formatFileSize(MAX_SIZE_BYTES)}
            </p>
            <p className={cn('text-xs hidden short:block', s.subtle)}>
              {/* Drag-and-drop is meaningless on a phone and the extra words wrap
                  to a second line there, so only mention it from `sm` up. */}
              <span className="hidden sm:inline">or drag and drop — </span>
              MP4, WebM or MOV, up to {formatFileSize(MAX_SIZE_BYTES)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('overflow-hidden rounded-xl border', s.shell, className)}>
      <div className="p-4 short:p-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'url')}>
          <TabsList className={cn('grid w-full grid-cols-2 mb-4 short:mb-2 rounded-xl border p-1', s.tabsList)}>
            <TabsTrigger value="upload" className={cn('rounded-lg data-[state=active]:bg-[#f87171] data-[state=active]:text-white', s.tabInactive)}>Upload Video</TabsTrigger>
            <TabsTrigger value="url" className={cn('rounded-lg data-[state=active]:bg-[#f87171] data-[state=active]:text-white', s.tabInactive)}>Video URL</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            {renderUploadArea()}
          </TabsContent>

          <TabsContent value="url">
            {uploadState === 'success' && videoUrl ? (
              <div className="space-y-4">
                <div className="video-fit-frame [--video-chrome:38rem] short:[--video-chrome:32rem] relative aspect-video bg-black rounded-lg overflow-hidden">
                  {isExternalPlatform ? (
                    <ReactPlayer
                      url={videoUrl}
                      controls
                      width="100%"
                      height="100%"
                      onDuration={(duration) => {
                        if (duration && Number.isFinite(duration) && duration > 0) {
                          const flooredDuration = Math.floor(duration);
                          setVideoDuration(flooredDuration);
                          // Update parent with duration if not already set
                          if (videoDuration === undefined) {
                            onVideoUploaded(videoUrl, flooredDuration);
                          }
                        }
                      }}
                      config={{
                        youtube: { playerVars: { modestbranding: 1 } },
                        vimeo: { playerOptions: { byline: false, portrait: false } },
                      }}
                    />
                  ) : (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className={cn('flex items-center gap-2 text-sm', s.success)}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Video URL added</span>
                    {videoDuration !== undefined && Number.isFinite(videoDuration) && (
                      <span className={s.subtle}>
                        ({Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={s.button}
                    onClick={handleRemove}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="videoUrl" className={s.label}>Video URL</Label>
                  <Input
                    id="videoUrl"
                    placeholder="YouTube, Vimeo, Google Drive, or direct video URL"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className={s.input}
                  />
                  <p className={cn('text-xs', s.subtle)}>
                    Paste a YouTube, Vimeo, Google Drive, or direct video URL
                  </p>
                </div>
                {isExternalPlatform && (
                  <div className={cn('flex items-start gap-2 p-3 rounded-md border', s.infoBox)}>
                    <Info className={cn('h-4 w-4 mt-0.5 flex-shrink-0', s.subtle)} />
                    <p className={cn('text-xs', s.muted)}>
                      {videoSourceType === 'youtube' ? 'YouTube' : videoSourceType === 'vimeo' ? 'Vimeo' : 'Google Drive'} videos will play correctly in quizzes. Duration may not be detected automatically.
                    </p>
                  </div>
                )}
                {errorMessage && (
                  <p className={cn('text-sm', s.error)}>{errorMessage}</p>
                )}
                <Button
                  onClick={handleUrlSubmit}
                  className="w-full bg-gradient-to-r from-[#f87171] to-[#37b5ff] hover:from-[#f75c5c] hover:to-[#2596d1] text-white border-0"
                >
                  Add Video URL
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
