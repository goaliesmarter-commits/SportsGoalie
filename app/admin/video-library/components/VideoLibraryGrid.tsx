'use client';

import { useState } from 'react';
import { Loader2, Trash2, Copy, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { videoLibraryService } from '@/lib/services/video-library.service';
import { VIDEO_SOURCE_LABELS } from '@/lib/utils/video-source';
import { LibraryVideo } from '@/types/video-library';

const BLUE2 = '#60cdff';
const RED = '#f87171';

interface Props {
  videos: LibraryVideo[];
  loading: boolean;
  onDelete: (video: LibraryVideo) => void;
}

function formatDuration(seconds?: number): string | null {
  if (seconds === undefined || !Number.isFinite(seconds)) return null;
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export function VideoLibraryGrid({ videos, loading, onDelete }: Props) {
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCopy = async (url: string, title: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Video URL copied for "${title}"`);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleDelete = async (video: LibraryVideo) => {
    setConfirmDeleteId(null);
    setActionId(video.id);
    try {
      await videoLibraryService.deleteVideo(video.id);
      toast.success(`"${video.title}" removed from the library`);
      onDelete(video);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete video');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '48px 0', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading videos...
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
        No videos in the library yet. Use the form to add your first one.
      </div>
    );
  }

  return (
    <div className="vlg-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
      {videos.map(video => {
        const busy = actionId === video.id;
        const isConfirmingDelete = confirmDeleteId === video.id;
        const duration = formatDuration(video.videoDuration);

        return (
          <div key={video.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isConfirmingDelete ? 'rgba(248,113,113,0.3)' : 'rgba(96,205,255,0.12)'}`, borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
              <video src={video.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata" muted />
              <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.65)', color: BLUE2, fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', borderRadius: '20px', padding: '3px 9px' }}>
                {VIDEO_SOURCE_LABELS[video.source]}
              </span>
              {duration && (
                <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '6px', padding: '2px 7px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} />{duration}
                </span>
              )}
            </div>

            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: video.description ? '4px' : 0 }}>{video.title}</p>
                {video.description && (
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.4 }}>{video.description}</p>
                )}
              </div>

              {video.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {video.tags.map(tag => (
                    <span key={tag} style={{ background: 'rgba(55,181,255,0.1)', color: BLUE2, fontSize: '10px', fontWeight: 600, borderRadius: '20px', padding: '2px 8px' }}>{tag}</span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', paddingTop: '4px' }}>
                <button onClick={() => handleCopy(video.videoUrl, video.title)} disabled={busy} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '6px 0', borderRadius: '6px', border: '1px solid rgba(96,205,255,0.2)', background: 'rgba(96,205,255,0.07)', color: BLUE2, fontSize: '11px', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
                  <Copy size={11} />Copy URL
                </button>
                <button onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : video.id)} disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.2)', background: isConfirmingDelete ? 'rgba(248,113,113,0.15)' : 'transparent', color: isConfirmingDelete ? RED : 'rgba(255,255,255,0.3)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
                  {busy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                </button>
              </div>

              {isConfirmingDelete && (
                <div style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Permanently remove this video? Quizzes already using it keep working.</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '5px 0', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => handleDelete(video)} style={{ flex: 1, padding: '5px 0', borderRadius: '6px', border: 'none', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Remove</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
