/**
 * Video Library — reusable video pool decoupled from quizzes.
 *
 * Lets admins/coaches upload or register a video once (raw file, YouTube,
 * Vimeo, Google Drive, or direct URL) and reuse it across multiple quizzes,
 * instead of uploading inline every time a quiz is created.
 */

export type VideoSource = 'upload' | 'youtube' | 'vimeo' | 'google-drive' | 'direct';

export interface LibraryVideo {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  videoDuration?: number; // seconds; may be undefined for external URLs
  source: VideoSource;
  tags: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLibraryVideoData {
  title: string;
  description?: string;
  videoUrl: string;
  videoDuration?: number;
  source: VideoSource;
  tags?: string[];
  createdBy: string;
  createdByName?: string;
}
