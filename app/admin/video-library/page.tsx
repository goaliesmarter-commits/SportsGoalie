'use client';

import { useState, useEffect } from 'react';
import { AdminRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { videoLibraryService } from '@/lib/services/video-library.service';
import { LibraryVideo } from '@/types/video-library';
import { VideoLibraryUploadForm } from './components/VideoLibraryUploadForm';
import { VideoLibraryGrid } from './components/VideoLibraryGrid';
import { Plus, X, Video } from 'lucide-react';
import { toast } from 'sonner';

const BLUE = '#37b5ff';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

function VideoLibraryPageContent() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadVideos(); }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const data = await videoLibraryService.getAllVideos();
      setVideos(data);
    } catch {
      toast.error('Failed to load video library');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoAdded = (video: LibraryVideo) => {
    setVideos(prev => [video, ...prev]);
    setShowForm(false);
  };

  const handleVideoDeleted = (video: LibraryVideo) => {
    setVideos(prev => prev.filter(v => v.id !== video.id));
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (max-width: 768px) { .vl-layout { grid-template-columns: 1fr !important; } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>Video Library</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Upload videos once, reuse them across any quiz</p>
          </div>
          <button onClick={() => setShowForm(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${BLUE} 0%, #2596d1 100%)`, color: '#fff', padding: '11px 20px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Close' : 'Add Video'}
          </button>
        </div>

        {showForm && user && (
          <div style={{ ...card, padding: '24px' }}>
            <VideoLibraryUploadForm
              userId={user.id}
              userName={user.displayName || user.email}
              onVideoAdded={handleVideoAdded}
            />
          </div>
        )}

        {/* Video Grid */}
        <div style={{ ...card, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Video size={16} color={BLUE} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600 }}>{videos.length} video{videos.length === 1 ? '' : 's'} in the library</p>
          </div>
          <VideoLibraryGrid videos={videos} loading={loading} onDelete={handleVideoDeleted} />
        </div>
      </div>
    </>
  );
}

export default function VideoLibraryPage() {
  return <AdminRoute><VideoLibraryPageContent /></AdminRoute>;
}
