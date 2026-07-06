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
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function VideoUploader({
  coachId,
  userId,
  uploadFolder,
  onVideoUploaded,
  initialVideoUrl,
  className,
}: VideoUploaderProps) {
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
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Video ready</span>
              {videoDuration !== undefined && Number.isFinite(videoDuration) && (
                <span className="text-white/40">
                  ({Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')})
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
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
            <Progress value={uploadProgress} className="h-2 bg-white/10" />
            <p className="text-sm text-center text-white/50">
              Uploading... {uploadProgress}%
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging ? 'bg-[#37b5ff]/10' : 'border-white/15 hover:border-[#37b5ff]/50',
          uploadState === 'error' && 'border-red-400/50 bg-red-400/5'
        )}
        style={{ borderColor: isDragging ? BLUE : undefined }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
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
            <AlertCircle className="h-12 w-12 mx-auto text-red-400" />
            <p className="text-sm text-red-400">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
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
              <p className="font-medium text-white">{selectedFile.name}</p>
              <p className="text-sm text-white/50">
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
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-white/30" />
            <div>
              <p className="font-medium text-white">Drop your video here or click to browse</p>
              <p className="text-sm text-white/40">
                Supports MP4, WebM, MOV (max {formatFileSize(MAX_SIZE_BYTES)})
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn('overflow-hidden rounded-xl border', className)}
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(96,205,255,0.18)' }}
    >
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'url')}>
          <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="upload" className="rounded-lg text-white/50 data-[state=active]:bg-[#f87171] data-[state=active]:text-white">Upload Video</TabsTrigger>
            <TabsTrigger value="url" className="rounded-lg text-white/50 data-[state=active]:bg-[#f87171] data-[state=active]:text-white">Video URL</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            {renderUploadArea()}
          </TabsContent>

          <TabsContent value="url">
            {uploadState === 'success' && videoUrl ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
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
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Video URL added</span>
                    {videoDuration !== undefined && Number.isFinite(videoDuration) && (
                      <span className="text-white/40">
                        ({Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
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
                  <Label htmlFor="videoUrl" className="text-white/70">Video URL</Label>
                  <Input
                    id="videoUrl"
                    placeholder="YouTube, Vimeo, Google Drive, or direct video URL"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#37b5ff]/40"
                  />
                  <p className="text-xs text-white/40">
                    Paste a YouTube, Vimeo, Google Drive, or direct video URL
                  </p>
                </div>
                {isExternalPlatform && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-white/5 border border-white/10">
                    <Info className="h-4 w-4 text-white/40 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-white/50">
                      {videoSourceType === 'youtube' ? 'YouTube' : videoSourceType === 'vimeo' ? 'Vimeo' : 'Google Drive'} videos will play correctly in quizzes. Duration may not be detected automatically.
                    </p>
                  </div>
                )}
                {errorMessage && (
                  <p className="text-sm text-red-400">{errorMessage}</p>
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
