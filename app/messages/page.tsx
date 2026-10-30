'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Mail,
  Clock,
  Video,
  FileText,
  Image as ImageIcon,
  Eye,
  Inbox,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { SkeletonList } from '@/components/ui/skeletons';
import { messageService } from '@/lib/database/services/message.service';
import { Message, MessageType } from '@/types/message';
import { toast } from 'sonner';

const BLUE = '#37b5ff';
const card = { background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px' };

const TYPE_COLORS: Record<string, string> = {
  general: BLUE,
  instruction: '#a78bfa',
  feedback: '#34d399',
  video_review: '#f87171',
};

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<MessageType | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');

  const fetchMessages = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const result = await messageService.getUserMessages(user.id, { limit: 50 });
      if (result.success && result.data) {
        const sorted = result.data.items.sort((a, b) => {
          if (!a.isRead && b.isRead) return -1;
          if (a.isRead && !b.isRead) return 1;
          const dateA = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        setMessages(sorted);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, [user]);

  const filteredMessages = messages.filter(m => {
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterRead === 'read' && !m.isRead) return false;
    if (filterRead === 'unread' && m.isRead) return false;
    return true;
  });

  const stats = {
    total: messages.length,
    unread: messages.filter(m => !m.isRead).length,
    videoReview: messages.filter(m => m.type === 'video_review').length,
    instruction: messages.filter(m => m.type === 'instruction').length,
  };

  const getTypeIcon = (type: MessageType) => {
    switch (type) {
      case 'general': return <MessageSquare size={14} />;
      case 'instruction': return <FileText size={14} />;
      case 'feedback': return <Mail size={14} />;
      case 'video_review': return <Video size={14} />;
      default: return <MessageSquare size={14} />;
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Please log in to view your messages</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        .msg-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        @media (min-width: 768px) { .msg-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; } }
        .msg-filters { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
        @media (min-width: 640px) { .msg-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(16px,3vw,28px) clamp(14px,4vw,24px) 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Banner */}
        <div style={{ ...card, padding: 'clamp(16px,4vw,24px) clamp(16px,4vw,28px)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '50%', height: '1px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(55,181,255,0.12)', border: '1px solid rgba(55,181,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare size={18} color={BLUE} />
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(18px,3vw,28px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Messages</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Messages and feedback from your coaches</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="msg-stats">
          {[
            { label: 'Total Messages', value: stats.total, icon: <Inbox size={16} color={BLUE} /> },
            { label: 'Unread', value: stats.unread, icon: <Mail size={16} color={BLUE} />, alert: stats.unread > 0 },
            { label: 'Video Reviews', value: stats.videoReview, icon: <Video size={16} color={BLUE} /> },
            { label: 'Instructions', value: stats.instruction, icon: <FileText size={16} color={BLUE} /> },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: 'clamp(12px,3.5vw,18px) clamp(12px,3.5vw,20px)', minWidth: 0, borderColor: s.alert ? 'rgba(248,113,113,0.35)' : 'rgba(55,181,255,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '8px' }}>
                <p style={{ fontSize: 'clamp(9px, 2.6vw, 10px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 'clamp(0.2px, 0.3vw, 1.5px)', color: 'rgba(255,255,255,0.4)', minWidth: 0 }}>{s.label}</p>
                <span style={{ display: 'flex', flexShrink: 0 }}>{s.icon}</span>
              </div>
              <p style={{ fontSize: '32px', fontWeight: 900, color: s.alert ? '#f87171' : '#fff', lineHeight: 1 }}>{s.value}</p>
              {s.alert && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 600 }}>You have unread messages</p>}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ ...card, padding: 'clamp(14px,3.5vw,18px) clamp(14px,3.5vw,20px)' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Filter Messages</p>
          <div className="msg-filters">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Message Type</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as MessageType | 'all')}
                style={{ width: '100%', padding: '10px 14px', background: 'rgba(1,12,32,0.9)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Types</option>
                <option value="general">General</option>
                <option value="instruction">Instruction</option>
                <option value="feedback">Feedback</option>
                <option value="video_review">Video Review</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Read Status</label>
              <select
                value={filterRead}
                onChange={e => setFilterRead(e.target.value as 'all' | 'read' | 'unread')}
                style={{ width: '100%', padding: '10px 14px', background: 'rgba(1,12,32,0.9)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Messages</option>
                <option value="unread">Unread Only</option>
                <option value="read">Read Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div style={{ ...card, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Inbox ({filteredMessages.length})</h2>
              {(filterType !== 'all' || filterRead !== 'all') && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {filterType !== 'all' && `Showing ${filterType} messages`}{filterRead !== 'all' && ` · ${filterRead}`}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <SkeletonList count={5} />
          ) : filteredMessages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMessages.map(message => {
                const typeColor = TYPE_COLORS[message.type] || BLUE;
                const msgDate = message.createdAt && typeof message.createdAt === 'object' && 'toDate' in message.createdAt
                  ? message.createdAt.toDate()
                  : new Date(message.createdAt);
                return (
                  <div
                    key={message.id}
                    onClick={() => router.push(`/messages/${message.id}`)}
                    style={{ padding: '14px 16px', borderRadius: '12px', border: `1px solid ${!message.isRead ? `${typeColor}35` : 'rgba(55,181,255,0.12)'}`, background: !message.isRead ? `${typeColor}06` : 'rgba(1,12,32,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${typeColor}50`; (e.currentTarget as HTMLDivElement).style.background = `${typeColor}0a`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = !message.isRead ? `${typeColor}35` : 'rgba(55,181,255,0.12)'; (e.currentTarget as HTMLDivElement).style.background = !message.isRead ? `${typeColor}06` : 'rgba(1,12,32,0.4)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: typeColor, minWidth: 0, maxWidth: '100%' }}>
                            <span style={{ display: 'flex', flexShrink: 0 }}>{getTypeIcon(message.type)}</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', minWidth: 0, overflowWrap: 'anywhere' }}>{message.subject}</span>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30`, borderRadius: '20px', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {message.type.replace('_', ' ')}
                          </span>
                          {!message.isRead && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#000f28', background: BLUE, borderRadius: '20px', padding: '2px 8px' }}>New</span>
                          )}
                        </div>

                        {/* Preview */}
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, overflow: 'hidden', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {message.message.length > 150 ? message.message.substring(0, 150) + '...' : message.message}
                        </p>

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                            {message.attachments.some(a => a.type === 'image') && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={11} />{message.attachments.filter(a => a.type === 'image').length} image(s)</span>
                            )}
                            {message.attachments.some(a => a.type === 'video') && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Video size={11} />{message.attachments.filter(a => a.type === 'video').length} video(s)</span>
                            )}
                            {message.attachments.some(a => a.type === 'document') && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={11} />{message.attachments.filter(a => a.type === 'document').length} doc(s)</span>
                            )}
                          </div>
                        )}

                        {/* Date */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                          <Clock size={10} />
                          <span>{msgDate.toLocaleString()}</span>
                        </div>
                      </div>

                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/messages/${message.id}`); }}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', color: BLUE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Inbox size={48} color="rgba(255,255,255,0.12)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>No messages found</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                {filterType !== 'all' || filterRead !== 'all' ? 'Try adjusting your filters' : "You don't have any messages yet"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
