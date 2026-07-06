'use client';

import { useState, useEffect, useMemo } from 'react';
import { Library, Loader2, Search, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { videoLibraryService } from '@/lib/services/video-library.service';
import { VIDEO_SOURCE_LABELS } from '@/lib/utils/video-source';
import { LibraryVideo } from '@/types/video-library';

interface VideoLibraryPickerProps {
  onSelect: (url: string, duration?: number) => void;
}

function formatDuration(seconds?: number): string | null {
  if (seconds === undefined || !Number.isFinite(seconds)) return null;
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export function VideoLibraryPicker({ onSelect }: VideoLibraryPickerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open && videos.length === 0) {
      loadVideos();
    }
  }, [open]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const data = await videoLibraryService.getAllVideos();
      setVideos(data);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter(v =>
      v.title.toLowerCase().includes(q) ||
      v.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [videos, search]);

  const handlePick = (video: LibraryVideo) => {
    onSelect(video.videoUrl, video.videoDuration);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Library className="h-4 w-4 mr-2" />
        Choose from Library
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Video Library</DialogTitle>
          <DialogDescription>Pick a video that's already been uploaded instead of uploading again.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading videos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {videos.length === 0
                ? 'No videos in the library yet. Add one from the Video Library page first.'
                : 'No videos match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(video => {
                const duration = formatDuration(video.videoDuration);
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => handlePick(video)}
                    className="group text-left border rounded-lg overflow-hidden hover:border-primary transition-colors"
                  >
                    <div className="relative aspect-video bg-black">
                      <video src={video.videoUrl} className="w-full h-full object-cover" preload="metadata" muted />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {duration && (
                        <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-xs rounded px-1.5 py-0.5 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />{duration}
                        </span>
                      )}
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-sm font-medium truncate">{video.title}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{VIDEO_SOURCE_LABELS[video.source]}</Badge>
                        {video.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
