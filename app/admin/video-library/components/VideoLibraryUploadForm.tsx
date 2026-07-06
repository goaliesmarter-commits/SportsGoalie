'use client';

import { useState } from 'react';
import { Loader2, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { VideoUploader } from '@/components/coach/video-uploader';
import { videoLibraryService } from '@/lib/services/video-library.service';
import { detectVideoSource } from '@/lib/utils/video-source';
import { LibraryVideo } from '@/types/video-library';

const BLUE = '#37b5ff';

interface Props {
  userId: string;
  userName?: string;
  onVideoAdded: (video: LibraryVideo) => void;
}

export function VideoLibraryUploadForm({ userId, userName, onVideoAdded }: Props) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [pendingUrl, setPendingUrl] = useState('');
  const [pendingDuration, setPendingDuration] = useState<number | undefined>();
  const [uploaderKey, setUploaderKey] = useState(0);

  const handleVideoUploaded = (url: string, duration?: number) => {
    setPendingUrl(url);
    setPendingDuration(duration);
  };

  const isDriveLink = pendingUrl.includes('drive.google.com');

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!pendingUrl) { toast.error('Upload a video or add a video URL first'); return; }

    try {
      setSaving(true);
      const video = await videoLibraryService.createVideo({
        title: title.trim(),
        description: description.trim() || undefined,
        videoUrl: pendingUrl,
        videoDuration: pendingDuration,
        source: detectVideoSource(pendingUrl),
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        createdBy: userId,
        createdByName: userName,
      });
      toast.success(`"${video.title}" added to the video library`);
      onVideoAdded(video);

      // Reset form
      setTitle('');
      setDescription('');
      setTagsInput('');
      setPendingUrl('');
      setPendingDuration(undefined);
      setUploaderKey(k => k + 1); // remounts VideoUploader to clear its internal state
    } catch (error: any) {
      toast.error(error.message || 'Failed to save video to library');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(96,205,255,0.25)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1.5px',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Title <span style={{ color: BLUE }}>*</span></label>
        <input
          type="text"
          placeholder="Butterfly save technique — drill 3"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={inputStyle}
          disabled={saving}
        />
      </div>

      <div>
        <label style={labelStyle}>Description <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></label>
        <textarea
          placeholder="Short note about what this video shows..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          disabled={saving}
        />
      </div>

      <div>
        <label style={labelStyle}>Tags <span style={{ color: 'rgba(255,255,255,0.3)' }}>(comma separated)</span></label>
        <input
          type="text"
          placeholder="butterfly, footwork, u12"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          style={inputStyle}
          disabled={saving}
        />
      </div>

      <div>
        <label style={labelStyle}>Video</label>
        <VideoUploader
          key={uploaderKey}
          userId={userId}
          uploadFolder={`video-library/${userId}`}
          onVideoUploaded={handleVideoUploaded}
        />
      </div>

      {isDriveLink && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
          <Info size={14} color={BLUE} style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            Google Drive links can fail to play once a file gets popular or is over ~100MB (Drive shows a
            download-quota or virus-scan warning instead of the video). If a video stops playing later,
            re-upload it directly for reliable playback.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !pendingUrl}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: saving || !pendingUrl ? 'rgba(55,181,255,0.25)' : `linear-gradient(135deg, ${BLUE} 0%, #2596d1 100%)`,
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 0',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          cursor: saving || !pendingUrl ? 'not-allowed' : 'pointer',
          boxShadow: saving || !pendingUrl ? 'none' : '0 4px 20px rgba(55,181,255,0.35)',
        }}
      >
        {saving ? (
          <>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Saving...
          </>
        ) : (
          <>
            <Save size={14} />
            Save to Library
          </>
        )}
      </button>
    </div>
  );
}
