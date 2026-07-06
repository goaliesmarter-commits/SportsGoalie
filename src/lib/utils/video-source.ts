import { VideoSource } from '@/types/video-library';

export function detectVideoSource(url: string): VideoSource {
  if (url.includes('firebasestorage')) return 'upload';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('drive.google.com')) return 'google-drive';
  return 'direct';
}

export const VIDEO_SOURCE_LABELS: Record<VideoSource, string> = {
  upload: 'Uploaded',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  'google-drive': 'Google Drive',
  direct: 'Direct URL',
};
