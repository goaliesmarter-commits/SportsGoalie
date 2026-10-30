'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SkeletonDetailPage } from '@/components/ui/skeletons';
import {
  ArrowLeft, MessageSquare, Calendar, Video, FileText,
  Image as ImageIcon, Download, ExternalLink, X,
} from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/lib/auth/context';
import { messageService } from '@/lib/database/services/message.service';
import { Message, MessageType } from '@/types/message';
import { toast } from 'sonner';

const BLUE = '#37b5ff';
const TYPE_COLORS: Record<string, string> = {
  general: BLUE,
  instruction: '#a78bfa',
  feedback: '#34d399',
  video_review: '#f87171',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatTs(ts: unknown): string {
  if (!ts) return '';
  const t = ts as { toDate?: () => Date };
  const date = t.toDate ? t.toDate() : new Date(ts as string);
  return date.toLocaleString();
}

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const messageId = params.id as string;

  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchMessage = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const result = await messageService.getMessage(messageId);
      if (result.success && result.data) {
        setMessage(result.data);
        if (!result.data.isRead && user.id) {
          await messageService.markAsRead(messageId, user.id);
        }
      } else {
        toast.error('Message not found');
        router.push('/messages');
      }
    } catch (error) {
      console.error('Error fetching message:', error);
      toast.error('Failed to load message');
      router.push('/messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessage(); }, [messageId, user]);

  const getTypeIcon = (type: MessageType) => {
    const color = TYPE_COLORS[type] || BLUE;
    switch (type) {
      case 'video_review': return <Video size={18} color={color} />;
      case 'instruction': return <FileText size={18} color={color} />;
      default: return <MessageSquare size={18} color={color} />;
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Please log in to view this message</p>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '24px' }}><SkeletonDetailPage /></div>;
  }

  if (!message) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <MessageSquare size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Message not found</h3>
        <Link href="/messages" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Messages
        </Link>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[message.type] || BLUE;
  const cardStyle = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' };

  return (
    <>
      <style>{`.msg-download:hover { background: rgba(55,181,255,0.15) !important; border-color: ${BLUE} !important; }`}</style>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Back */}
        <div>
          <Link href="/messages" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}>
            <ArrowLeft size={14} /> Back to Messages
          </Link>
        </div>

        {/* Message Card */}
        <div style={cardStyle}>
          {/* Card Header */}
          <div style={{ padding: 'clamp(16px, 5vw, 24px)', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${typeColor}18`, border: `1px solid ${typeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                {getTypeIcon(message.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ color: '#fff', fontSize: 'clamp(17px, 5vw, 20px)', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.01em', overflowWrap: 'anywhere' }}>{message.subject}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: `${typeColor}14`, border: `1px solid ${typeColor}30`, color: typeColor, fontSize: '11px', fontWeight: 700, textTransform: 'capitalize' }}>
                    {message.type.replace('_', ' ')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                    <Calendar size={13} />
                    Received {formatTs(message.createdAt)}
                  </span>
                  {message.readAt && (
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                      · Read {formatTs(message.readAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Message Body */}
          <div style={{ padding: 'clamp(16px, 5vw, 24px)' }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {message.message}
            </p>
          </div>

          {/* Related Video */}
          {message.type === 'video_review' && message.relatedVideoUrl && (
            <div style={{ padding: '0 clamp(16px, 5vw, 24px) clamp(16px, 5vw, 24px)', borderTop: '1px solid rgba(55,181,255,0.08)', paddingTop: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={16} color="#f87171" /> Your Video Submission
              </h3>
              <div style={{ background: '#000', borderRadius: '10px', overflow: 'hidden' }}>
                <video src={message.relatedVideoUrl} controls style={{ width: '100%', maxHeight: '380px' }} preload="metadata" />
              </div>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div style={{ padding: '0 clamp(16px, 5vw, 24px) clamp(16px, 5vw, 24px)', borderTop: '1px solid rgba(55,181,255,0.08)', paddingTop: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
                Attachments ({message.attachments.length})
              </h3>

              {/* Images */}
              {message.attachments.filter(a => a.type === 'image').length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={14} /> Images
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))', gap: '12px' }}>
                    {message.attachments.filter(a => a.type === 'image').map((attachment, idx) => (
                      <div
                        key={idx}
                        style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(55,181,255,0.15)', cursor: 'pointer', aspectRatio: '4/3' }}
                        onClick={() => setSelectedImage(attachment.url)}
                      >
                        <img src={attachment.url} alt={attachment.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ExternalLink size={20} color="#fff" style={{ opacity: 0.8 }} />
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '8px' }}>
                          <p style={{ color: '#fff', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.fileName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {message.attachments.filter(a => a.type === 'video').length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={14} /> Videos
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {message.attachments.filter(a => a.type === 'video').map((attachment, idx) => (
                      <div key={idx}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', overflowWrap: 'anywhere' }}>{attachment.fileName}</p>
                        <div style={{ background: '#000', borderRadius: '10px', overflow: 'hidden' }}>
                          <video src={attachment.url} controls style={{ width: '100%', maxHeight: '380px' }} preload="metadata" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {message.attachments.filter(a => a.type === 'document').length > 0 && (
                <div>
                  <h4 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} /> Documents
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {message.attachments.filter(a => a.type === 'document').map((attachment, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 180px', minWidth: 0 }}>
                          <FileText size={28} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, overflowWrap: 'anywhere' }}>{attachment.fileName}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{formatFileSize(attachment.fileSize)}</p>
                          </div>
                        </div>
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" download style={{ textDecoration: 'none' }}>
                          <button className="msg-download" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(55,181,255,0.2)', background: 'rgba(55,181,255,0.06)', color: BLUE, fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                            <Download size={14} /> Download
                          </button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image Lightbox */}
        {selectedImage && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={() => setSelectedImage(null)}
          >
            <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
              <img src={selectedImage} alt="Full size" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
              <button
                style={{ position: 'absolute', top: '8px', right: '8px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setSelectedImage(null)}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
