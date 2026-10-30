'use client';

import { useState, useEffect } from 'react';
import { User, LinkedParentSummary } from '@/types';
import { parentLinkService } from '@/lib/database';
import {
  Users, Link2, Copy, Check, RefreshCw, Loader2, UserMinus, Clock, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const BLUE = '#37b5ff';

interface ParentLinkManagerProps {
  user: User;
}

export function ParentLinkManager({ user }: ParentLinkManagerProps) {
  const [linkCode, setLinkCode] = useState<string | null>(user.parentLinkCode || null);
  const [linkCodeExpiry, setLinkCodeExpiry] = useState<Date | null>(
    user.parentLinkCodeExpiry
      ? (typeof (user.parentLinkCodeExpiry as { toDate?: () => Date }).toDate === 'function'
          ? (user.parentLinkCodeExpiry as { toDate: () => Date }).toDate()
          : new Date((user.parentLinkCodeExpiry as unknown as { seconds: number }).seconds * 1000))
      : null
  );
  const [linkedParents, setLinkedParents] = useState<LinkedParentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [revokingLink, setRevokingLink] = useState<string | null>(null);
  const [codeCopied, setCodyCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<LinkedParentSummary | null>(null);

  const loadLinkedParents = async () => {
    try {
      setLoading(true);
      const result = await parentLinkService.getLinkedParents(user.id);
      if (result.success && result.data) setLinkedParents(result.data);
    } catch (error) {
      console.error('Failed to load linked parents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLinkedParents(); }, [user.id]);

  const handleGenerateCode = async () => {
    try {
      setGeneratingCode(true);
      const result = await parentLinkService.generateParentLinkCode(user.id);
      if (result.success && result.data) {
        setLinkCode(result.data.code);
        setLinkCodeExpiry(result.data.expiresAt);
        toast.success('Link code generated successfully');
      } else {
        toast.error(result.error?.message || 'Failed to generate link code');
      }
    } catch { toast.error('Failed to generate link code'); }
    finally { setGeneratingCode(false); }
  };

  const handleRegenerateCode = async () => {
    try {
      setGeneratingCode(true);
      const result = await parentLinkService.regenerateParentLinkCode(user.id);
      if (result.success && result.data) {
        setLinkCode(result.data.code);
        setLinkCodeExpiry(result.data.expiresAt);
        toast.success('New link code generated');
      } else {
        toast.error(result.error?.message || 'Failed to regenerate link code');
      }
    } catch { toast.error('Failed to regenerate link code'); }
    finally { setGeneratingCode(false); }
  };

  const handleCopyCode = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(linkCode);
      setCodyCopied(true);
      toast.success('Link code copied to clipboard');
      setTimeout(() => setCodyCopied(false), 2000);
    } catch { toast.error('Failed to copy code'); }
  };

  const handleRevokeLink = async (parentId: string) => {
    try {
      setRevokingLink(parentId);
      const linkResult = await parentLinkService.getLink(parentId, user.id);
      if (!linkResult.success || !linkResult.data) { toast.error('Link not found'); return; }
      const result = await parentLinkService.revokeLink(linkResult.data.id, user.id);
      if (result.success) {
        toast.success('Parent access revoked');
        loadLinkedParents();
      } else {
        toast.error(result.error?.message || 'Failed to revoke access');
      }
    } catch { toast.error('Failed to revoke access'); }
    finally { setRevokingLink(null); setConfirmRevoke(null); }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isCodeExpired = linkCodeExpiry && new Date() > linkCodeExpiry;

  const sectionStyle = { background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px', overflow: 'hidden' };
  const labelStyle: React.CSSProperties = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' };
  const iconBtnStyle: React.CSSProperties = { width: '38px', height: '38px', borderRadius: '9px', border: '1px solid rgba(55,181,255,0.2)', background: 'rgba(55,181,255,0.05)', color: BLUE, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

  return (
    <>
      <style>{`
        @keyframes plm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .plm-iconbtn:hover { background: rgba(55,181,255,0.12) !important; border-color: ${BLUE} !important; }
        .plm-genbtn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .plm-genbtn:disabled { opacity: 0.6; cursor: not-allowed; }
        .plm-revoke:hover { background: rgba(248,113,113,0.12) !important; border-color: rgba(248,113,113,0.4) !important; }
      `}</style>

      <div style={sectionStyle}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color={BLUE} />
            <h2 style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Family Links</h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '4px' }}>
            Share a link code with your parent so they can track your progress.
          </p>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Link Code ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={labelStyle}>Parent Link Code</p>

            {!linkCode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={handleGenerateCode} disabled={generatingCode} className="plm-genbtn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(55,181,255,0.25)' }}>
                  {generatingCode
                    ? <><Loader2 size={14} style={{ animation: 'plm-spin 1s linear infinite' }} />Generating...</>
                    : <><Link2 size={14} />Generate Link Code</>}
                </button>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Create a code to share with your parent.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${isCodeExpired ? 'rgba(248,113,113,0.3)' : 'rgba(55,181,255,0.2)'}`, background: 'rgba(55,181,255,0.04)', fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, letterSpacing: '0.15em', color: isCodeExpired ? 'rgba(255,255,255,0.3)' : '#fff', textDecoration: isCodeExpired ? 'line-through' : 'none' }}>
                    {linkCode}
                  </div>
                  <button onClick={handleCopyCode} disabled={!!isCodeExpired} className="plm-iconbtn" style={{ ...iconBtnStyle, color: codeCopied ? '#34d399' : BLUE }} title="Copy code">
                    {codeCopied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  <button onClick={handleRegenerateCode} disabled={generatingCode} className="plm-iconbtn" style={iconBtnStyle} title="Generate new code">
                    {generatingCode ? <Loader2 size={15} style={{ animation: 'plm-spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={12} color={isCodeExpired ? '#f87171' : 'rgba(255,255,255,0.3)'} />
                  {isCodeExpired ? (
                    <span style={{ color: '#f87171', fontSize: '11px' }}>Expired — generate a new code to share</span>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                      Valid until {linkCodeExpiry?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            )}

            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', lineHeight: 1.6 }}>
              Share this code with your parent. They&apos;ll enter it in their app to link accounts. Codes expire after 7 days.
            </p>
          </div>

          {/* ── Divider ── */}
          <div style={{ borderTop: '1px solid rgba(55,181,255,0.1)' }} />

          {/* ── Linked Parents ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={labelStyle}>Linked Parents</p>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <Loader2 size={20} color="rgba(255,255,255,0.25)" style={{ animation: 'plm-spin 1s linear infinite' }} />
              </div>
            ) : linkedParents.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                No parents linked yet. Generate a code above and share it with your parent.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {linkedParents.map(parent => (
                  <div key={parent.parentId}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(55,181,255,0.12)', background: 'rgba(55,181,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {parent.profileImage ? (
                        <Image src={parent.profileImage} alt={parent.displayName} width={38} height={38} unoptimized style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(55,181,255,0.2)', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(55,181,255,0.1)', border: '2px solid rgba(55,181,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: BLUE, fontSize: '13px', fontWeight: 700 }}>
                          {getInitials(parent.displayName)}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{parent.displayName}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'capitalize', color: BLUE, background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '20px', padding: '2px 8px' }}>
                            {parent.relationship}
                          </span>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{parent.email}</span>
                      </div>
                    </div>
                    <button onClick={() => setConfirmRevoke(parent)} disabled={revokingLink === parent.parentId} className="plm-revoke"
                      style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)', color: '#f87171', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      title="Revoke access">
                      {revokingLink === parent.parentId
                        ? <Loader2 size={14} style={{ animation: 'plm-spin 1s linear infinite' }} />
                        : <UserMinus size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {linkedParents.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(55,181,255,0.04)', border: '1px solid rgba(55,181,255,0.1)' }}>
                <AlertCircle size={14} color={BLUE} style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', lineHeight: 1.6 }}>
                  Linked parents can view your progress, Knowledge Check Grasp Levels, and assessment comparisons. They cannot see your personal notes or send messages.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Revoke Confirmation Modal ── */}
      {confirmRevoke && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={() => setConfirmRevoke(null)}>
          <div style={{ background: '#050f25', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '18px', padding: '28px', maxWidth: '400px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>Revoke Parent Access?</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
              <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{confirmRevoke.displayName}</strong> will no longer be able to view your progress. They can be re-linked later with a new code.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmRevoke(null)}
                style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleRevokeLink(confirmRevoke.parentId)} disabled={!!revokingLink} className="plm-genbtn"
                style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {revokingLink ? <Loader2 size={14} style={{ animation: 'plm-spin 1s linear infinite' }} /> : <UserMinus size={14} />}
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
