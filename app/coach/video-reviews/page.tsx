'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import { Play, MessageSquare, Send, Eye, CheckCircle, AlertCircle, Search, Users, X, Clock, Pause, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/context';
import { videoReviewService, StudentVideo, VideoReviewSession } from '@/lib/database/services/video-review.service';
import { sportsService } from '@/lib/database/services/sports.service';
import { VideoFeedbackComposer } from '@/components/messages/VideoFeedbackComposer';
import { Sport } from '@/types';
import { pillarDisplayName } from '@/lib/utils/pillars';
import { pillarFromSportId, pillarOptionLabel } from '@/types/onboarding';

const BLUE = '#37b5ff';
const RED = '#f87171';
const AMBER = '#fbbf24';
const GREEN = '#22c55e';
const GOLD = '#D4A93B';

const card = {
  background: 'rgba(2,18,44,0.85)',
  border: '1px solid rgba(55,181,255,0.14)',
  borderRadius: '16px',
} as const;

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:       { bg: 'rgba(251,191,36,0.15)',  color: AMBER,  label: 'Pending Review' },
  reviewed:      { bg: `rgba(55,181,255,0.12)`,  color: BLUE,   label: 'Under Review' },
  feedback_sent: { bg: 'rgba(34,197,94,0.12)',   color: GREEN,  label: 'Feedback Sent' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatFirestoreDate(timestamp: any) {
  if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate().toLocaleDateString();
  if (timestamp instanceof Date) return timestamp.toLocaleDateString();
  if (typeof timestamp === 'string') {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString();
  }
  if (timestamp && typeof timestamp === 'object' && timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString();
  return 'Unknown date';
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function CoachVideoReviewsPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<StudentVideo[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<StudentVideo | null>(null);
  const [feedback, setFeedback] = useState('');
  const [recommendedSports, setRecommendedSports] = useState<string[]>([]);
  const [selectedSportToAdd, setSelectedSportToAdd] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showVideoFeedbackComposer, setShowVideoFeedbackComposer] = useState(false);
  const [selectedVideoForMessage, setSelectedVideoForMessage] = useState<StudentVideo | null>(null);

  // Timer state
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadVideos(); }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const [videosResult, sportsResult] = await Promise.all([
        videoReviewService.getAllVideosForReview(),
        sportsService.getAllSports(),
      ]);
      if (videosResult.success && videosResult.data) setVideos(videosResult.data);
      else toast.error('Failed to load videos');
      if (sportsResult.success && sportsResult.data) {
        // Pillar order, not alphabetical — same reason as the admin page.
        setSports(sportsResult.data.items.sort((a, b) => a.order - b.order));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setElapsedSeconds(0);
    setSessionStartTime(null);
  }, []);

  const saveAndStopTimer = useCallback(async (videoId: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!sessionStartTime || elapsedSeconds < 1) { resetTimer(); return; }
    const session: VideoReviewSession = {
      id: `${Date.now()}`,
      reviewerId: user?.id || '',
      reviewerName: user?.displayName || user?.email || 'Coach',
      startedAt: sessionStartTime,
      endedAt: new Date(),
      durationSeconds: elapsedSeconds,
    };
    await videoReviewService.addCompletedSession(videoId, session);
    resetTimer();
    await loadVideos();
  }, [sessionStartTime, elapsedSeconds, user, resetTimer]);

  const handleReviewVideo = (video: StudentVideo) => {
    resetTimer();
    setSelectedVideo(video);
    setFeedback(video.coachFeedback || '');
    setRecommendedSports(video.recommendedCourses || []);
  };

  const handleCloseModal = async () => {
    if (selectedVideo && (timerState === 'running' || timerState === 'paused') && elapsedSeconds > 0) {
      await saveAndStopTimer(selectedVideo.id);
    } else {
      resetTimer();
    }
    setSelectedVideo(null);
    setFeedback('');
    setRecommendedSports([]);
  };

  const startTimer = () => {
    setSessionStartTime(new Date());
    setTimerState('running');
    intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('paused');
  };

  const resumeTimer = () => {
    setTimerState('running');
    intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const addRecommendedSport = () => {
    if (selectedSportToAdd && !recommendedSports.includes(selectedSportToAdd)) {
      const sport = sports.find(c => c.id === selectedSportToAdd);
      // The recommendation is stored as the name itself, so it has to be the code
      // list's name — otherwise the goalie is sent to a pillar that no longer exists
      // under that title.
      if (sport) { setRecommendedSports([...recommendedSports, pillarDisplayName(sport.id, sport.name)]); setSelectedSportToAdd(''); }
    }
  };

  const removeSport = (sport: string) => setRecommendedSports(recommendedSports.filter(c => c !== sport));

  const submitFeedback = async () => {
    if (!selectedVideo || !feedback.trim()) { toast.error('Please provide feedback before submitting'); return; }
    setSubmittingFeedback(true);
    try {
      const result = await videoReviewService.submitCoachFeedback(
        selectedVideo.id,
        { coachFeedback: feedback, recommendedCourses: recommendedSports, reviewedBy: user?.email || 'coach@example.com' },
        user?.id
      );
      if (result.success) {
        toast.success('Feedback sent to student successfully!');
        setSelectedVideo(null); setFeedback(''); setRecommendedSports([]);
        await loadVideos();
      } else {
        toast.error(result.error?.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesStatus = filterStatus === 'all' || video.status === filterStatus;
    const matchesSearch =
      video.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.sport?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPending = videos.filter(v => v.status === 'pending').length;
  const totalReviewed = videos.filter(v => v.status === 'reviewed').length;
  const totalFeedbackSent = videos.filter(v => v.status === 'feedback_sent').length;

  const STATS = [
    { label: 'Total Videos',   value: videos.length,      color: BLUE,  icon: <Users size={20} /> },
    { label: 'Pending Review', value: totalPending,        color: AMBER, icon: <AlertCircle size={20} /> },
    { label: 'Under Review',   value: totalReviewed,       color: BLUE,  icon: <Eye size={20} /> },
    { label: 'Feedback Sent',  value: totalFeedbackSent,   color: GREEN, icon: <CheckCircle size={20} /> },
  ];

  if (loading) return <div className="min-h-[400px] p-6"><SkeletonDarkPage /></div>;

  return (
    <>
      <style>{`
        .vr-search::placeholder { color: rgba(255,255,255,0.3); }
        .vr-search { color: #fff; background: rgba(255,255,255,0.05); border: 1px solid rgba(55,181,255,0.18); border-radius: 10px; padding: 10px 12px 10px 40px; width: 100%; outline: none; }
        .vr-search:focus { border-color: rgba(55,181,255,0.45); }
        .vr-sel { color: #fff; background: rgba(255,255,255,0.05); border: 1px solid rgba(55,181,255,0.18); border-radius: 10px; padding: 10px 12px; outline: none; }
        .vr-sel:focus { border-color: rgba(55,181,255,0.45); }
        .vr-sel option { background: #0a1628; color: #fff; }
        .vr-ta { color: #fff; background: rgba(255,255,255,0.05); border: 1px solid rgba(55,181,255,0.18); border-radius: 10px; padding: 10px 12px; width: 100%; outline: none; resize: vertical; font-family: inherit; }
        .vr-ta::placeholder { color: rgba(255,255,255,0.3); }
        .vr-ta:focus { border-color: rgba(55,181,255,0.45); }
        .vr-ta:disabled { opacity: 0.5; cursor: not-allowed; }
        .vr-card-btn:hover { background: rgba(55,181,255,0.18) !important; }
        .vr-btn-primary:hover { filter: brightness(1.1); }
        .vr-btn-secondary:hover { background: rgba(255,255,255,0.1) !important; }
        .vr-sport-add:hover { background: rgba(55,181,255,0.18) !important; }
        .vr-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .vr-modal { background: #020e22; border: 1px solid rgba(55,181,255,0.2); border-radius: 20px; width: 100%; max-width: 860px; max-height: 90vh; overflow-y: auto; position: relative; }
        .vr-close-btn:hover { background: rgba(255,255,255,0.12) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: 0 }}>Video Reviews</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: '6px', fontSize: '15px' }}>
                Review goalie training videos and provide personalized feedback
              </p>
            </div>
            {totalPending > 0 && (
              <div style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '20px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} color={AMBER} />
                <span style={{ color: AMBER, fontSize: '15px', fontWeight: 600 }}>{totalPending} Pending</span>
              </div>
            )}
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px', marginBottom: '28px' }}>
            {STATS.map(s => (
              <div key={s.label} style={{ ...card, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${s.color}66,transparent)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0 }}>{s.label}</p>
                  <span style={{ color: s.color, opacity: 0.7 }}>{s.icon}</span>
                </div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              <input className="vr-search" placeholder="Search by goalie, file name, or sport..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="vr-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: '180px' }}>
              <option value="all">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="reviewed">Under Review</option>
              <option value="feedback_sent">Feedback Sent</option>
            </select>
          </div>

          {/* Videos Grid */}
          {filteredVideos.length === 0 ? (
            <div style={{ ...card, padding: '64px', textAlign: 'center' }}>
              <Users size={48} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No videos found</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', margin: 0 }}>
                {searchTerm || filterStatus !== 'all' ? 'Try adjusting your search or filters' : "Goalies haven't uploaded any videos yet"}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '20px' }}>
              {filteredVideos.map(video => {
                const st = STATUS_STYLES[video.status] ?? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', label: 'Unknown' };
                return (
                  <div key={video.id} style={{ ...card, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${st.color}66,transparent)` }} />

                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {video.status === 'pending' && <AlertCircle size={16} color={AMBER} />}
                        {video.status === 'reviewed' && <Eye size={16} color={BLUE} />}
                        {video.status === 'feedback_sent' && <CheckCircle size={16} color={GREEN} />}
                        <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>{video.studentName}</span>
                      </div>
                      <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}40`, borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: 500, marginBottom: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {video.fileName}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                      {[
                        { label: 'Sport',    value: video.sport || 'Not specified' },
                        { label: 'Size',     value: formatFileSize(video.fileSize) },
                        { label: 'Uploaded', value: formatFirestoreDate(video.uploadedAt) },
                      ].map(r => (
                        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{r.label}:</span>
                          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{r.value}</span>
                        </div>
                      ))}
                    </div>

                    {video.description && (
                      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', marginBottom: '14px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: 0 }}>{video.description}</p>
                      </div>
                    )}

                    {video.status === 'feedback_sent' && video.reviewedAt && (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '10px', marginBottom: '12px' }}>
                        Reviewed on {formatFirestoreDate(video.reviewedAt)}
                      </p>
                    )}

                    {/* Time logged badge */}
                    {(video.totalTimeSpentSeconds || 0) > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                        <Clock size={12} color={GOLD} />
                        <span style={{ color: GOLD, fontSize: '12px', fontWeight: 700 }}>{formatDuration(video.totalTimeSpentSeconds!)} logged</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        className="vr-card-btn"
                        onClick={() => handleReviewVideo(video)}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '15px',
                          background: video.status === 'pending' ? RED : `rgba(55,181,255,0.12)`,
                          color: video.status === 'pending' ? '#fff' : BLUE,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
                        }}
                      >
                        {video.status === 'pending' && <><Eye size={15} /> Review Video</>}
                        {video.status === 'reviewed' && <><MessageSquare size={15} /> Complete Review</>}
                        {video.status === 'feedback_sent' && <><CheckCircle size={15} /> View Feedback</>}
                      </button>
                      <button
                        className="vr-btn-secondary"
                        onClick={() => { setSelectedVideoForMessage(video); setShowVideoFeedbackComposer(true); }}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontWeight: 500, fontSize: '15px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                      >
                        <MessageSquare size={15} /> Send Detailed Feedback
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedVideo && (
        <div className="vr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleCloseModal(); }}>
          <div className="vr-modal">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(55,181,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Review Video — {selectedVideo.fileName}</h2>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', marginTop: '4px', margin: '4px 0 0' }}>
                  Goalie: {selectedVideo.studentName} ({selectedVideo.studentEmail})
                </p>
              </div>
              <button className="vr-close-btn" onClick={handleCloseModal} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Video Player */}
              <div style={{ background: '#000', borderRadius: '12px', aspectRatio: '16/9', overflow: 'hidden', position: 'relative' }}>
                {selectedVideo.videoUrl ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <video controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} preload="metadata">
                      <source src={selectedVideo.videoUrl} type="video/mp4" />
                      <source src={selectedVideo.videoUrl} type="video/webm" />
                      <source src={selectedVideo.videoUrl} type="video/quicktime" />
                      Your browser does not support the video tag.
                    </video>
                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>
                      {selectedVideo.fileName} • {(selectedVideo.fileSize / (1024 * 1024)).toFixed(1)} MB
                    </div>
                    <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                      <a href={selectedVideo.videoUrl} target="_blank" rel="noopener noreferrer" style={{ background: RED, color: '#fff', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>
                        Open in New Tab
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
                    <Play size={64} color="rgba(255,255,255,0.3)" />
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', margin: 0 }}>{selectedVideo.fileName}</p>
                  </div>
                )}
              </div>

              {/* Student Description */}
              {selectedVideo.description && (
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goalie&apos;s Description</p>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', margin: 0 }}>{selectedVideo.description}</p>
                  </div>
                </div>
              )}

              {/* Analysis Timer */}
              <div style={{ background: 'rgba(212,169,59,0.06)', border: '1px solid rgba(212,169,59,0.2)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={15} color={GOLD} />
                    <span style={{ color: GOLD, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px' }}>Analysis Timer</span>
                  </div>
                  {(selectedVideo.totalTimeSpentSeconds || 0) > 0 && (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                      Total logged: <span style={{ color: GOLD, fontWeight: 700 }}>{formatDuration(selectedVideo.totalTimeSpentSeconds || 0)}</span>
                    </span>
                  )}
                </div>

                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '3px', fontVariantNumeric: 'tabular-nums', color: timerState === 'running' ? GOLD : timerState === 'paused' ? AMBER : 'rgba(255,255,255,0.35)', transition: 'color 0.3s' }}>
                    {formatTimer(elapsedSeconds)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: (selectedVideo.timeSessions?.length || 0) > 0 ? '12px' : 0 }}>
                  {timerState === 'idle' && (
                    <button onClick={startTimer} style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: GOLD, color: '#0c0800', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Play size={13} /> Start Timer
                    </button>
                  )}
                  {timerState === 'running' && (
                    <>
                      <button onClick={pauseTimer} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid rgba(212,169,59,0.35)`, background: 'rgba(212,169,59,0.1)', color: GOLD, fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Pause size={13} /> Pause
                      </button>
                      <button onClick={() => selectedVideo && saveAndStopTimer(selectedVideo.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid rgba(34,197,94,0.35)`, background: 'rgba(34,197,94,0.1)', color: GREEN, fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Square size={13} /> Save Session
                      </button>
                    </>
                  )}
                  {timerState === 'paused' && (
                    <>
                      <button onClick={resumeTimer} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: GOLD, color: '#0c0800', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Play size={13} /> Resume
                      </button>
                      <button onClick={() => selectedVideo && saveAndStopTimer(selectedVideo.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid rgba(34,197,94,0.35)`, background: 'rgba(34,197,94,0.1)', color: GREEN, fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Square size={13} /> Save Session
                      </button>
                    </>
                  )}
                </div>

                {(selectedVideo.timeSessions?.length || 0) > 0 && (
                  <div style={{ borderTop: '1px solid rgba(212,169,59,0.15)', paddingTop: '12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>Session Log</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedVideo.timeSessions!.map((s, i) => (
                        <div key={s.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.45)' }}>{formatFirestoreDate(s.startedAt)} — {s.reviewerName}</span>
                          <span style={{ color: GOLD, fontWeight: 700 }}>{formatDuration(s.durationSeconds)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback */}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Coach Feedback
                </label>
                <textarea
                  className="vr-ta"
                  placeholder="Provide detailed feedback on the goalie's performance, areas for improvement, and positive observations..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={4}
                  disabled={selectedVideo.status === 'feedback_sent'}
                />
              </div>

              {/* Recommended Courses */}
              <div>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended Courses</p>
                {selectedVideo.status !== 'feedback_sent' && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <select className="vr-sel" value={selectedSportToAdd} onChange={e => setSelectedSportToAdd(e.target.value)} style={{ flex: 1 }}>
                      <option value="">Select a course to recommend...</option>
                      {/* Numbered in the picker; the plain name is what gets stored
                          on the review (see addRecommendedSport). */}
                      {sports.map(sport => {
                        const info = pillarFromSportId(sport.id);
                        return (
                          <option key={sport.id} value={sport.id}>
                            {info ? pillarOptionLabel(info) : pillarDisplayName(sport.id, sport.name)}
                          </option>
                        );
                      })}
                    </select>
                    <button className="vr-sport-add" onClick={addRecommendedSport} disabled={!selectedSportToAdd}
                      style={{ padding: '10px 16px', borderRadius: '10px', border: `1px solid rgba(55,181,255,0.25)`, background: `rgba(55,181,255,0.1)`, color: BLUE, fontWeight: 600, fontSize: '15px', cursor: selectedSportToAdd ? 'pointer' : 'not-allowed', opacity: selectedSportToAdd ? 1 : 0.5, transition: 'all 0.2s' }}>
                      Add
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {recommendedSports.map((sport, i) => (
                    <span key={i} style={{ background: `rgba(55,181,255,0.1)`, border: `1px solid rgba(55,181,255,0.25)`, borderRadius: '20px', padding: '4px 12px', fontSize: '13px', color: BLUE, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {sport}
                      {selectedVideo.status !== 'feedback_sent' && (
                        <button onClick={() => removeSport(sport)} style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontSize: '15px', padding: 0, lineHeight: 1 }}>×</button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Submit */}
              {selectedVideo.status !== 'feedback_sent' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <button
                    className="vr-btn-primary"
                    onClick={submitFeedback}
                    disabled={submittingFeedback || !feedback.trim()}
                    style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: submittingFeedback || !feedback.trim() ? 'rgba(55,181,255,0.3)' : BLUE, color: '#fff', fontWeight: 700, fontSize: '15px', cursor: submittingFeedback || !feedback.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                  >
                    {submittingFeedback
                      ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Sending...</>
                      : <><Send size={16} /> Send Feedback</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {user && selectedVideoForMessage && (
        <VideoFeedbackComposer
          isOpen={showVideoFeedbackComposer}
          onClose={() => { setShowVideoFeedbackComposer(false); setSelectedVideoForMessage(null); }}
          studentId={selectedVideoForMessage.studentId}
          studentName={selectedVideoForMessage.studentName}
          adminUserId={user.id}
          videoUrl={selectedVideoForMessage.videoUrl}
          videoReviewId={selectedVideoForMessage.id}
          onMessageSent={() => { loadVideos(); toast.success('Video feedback sent successfully'); }}
        />
      )}
    </>
  );
}
