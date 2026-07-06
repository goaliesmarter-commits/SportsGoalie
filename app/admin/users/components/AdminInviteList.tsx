'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, XCircle, CheckCircle, Clock, Ban, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { invitationService } from '@/lib/services/invitation.service';
import { Invitation } from '@/types/invitation';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const RED = '#f87171';

interface Props {
  invitations: Invitation[];
  loading: boolean;
  onResend: (inv: Invitation) => void;
  onRevoke: (inv: Invitation) => void;
  onDelete: (inv: Invitation) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  pending:  { label: 'Pending',  color: BLUE2,                    bg: 'rgba(55,181,255,0.12)',   Icon: Clock },
  accepted: { label: 'Accepted', color: '#4ade80',                bg: 'rgba(74,222,128,0.12)',   Icon: CheckCircle },
  expired:  { label: 'Expired',  color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.06)',  Icon: XCircle },
  revoked:  { label: 'Revoked',  color: RED,                      bg: 'rgba(248,113,113,0.12)',  Icon: Ban },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired;
  const { label, color, bg, Icon } = cfg;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: bg, color, border: `1px solid ${color}33`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      <Icon size={11} />{label}
    </span>
  );
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AdminInviteList({ invitations, loading, onResend, onRevoke, onDelete }: Props) {
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const getInviteUrl = (token: string) =>
    `${window.location.origin}/auth/accept-invite?token=${token}`;

  const copyInviteLink = async (token: string, email: string) => {
    try {
      await navigator.clipboard.writeText(getInviteUrl(token));
      toast.success(`Invite link copied for ${email}`);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const handleResend = async (inv: Invitation) => {
    setActionId(inv.id);
    try {
      const updated = await invitationService.resendInvitation(inv.id);
      try {
        const res = await fetch('/api/invitations/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invitation: updated }) });
        if (!res.ok) throw new Error('Email API returned error');
        toast.success(`Invite resent to ${updated.email}`);
      } catch {
        toast.warning(`Email delivery failed for ${updated.email}`, {
          description: 'Use the copy button to share the invite link manually.',
          duration: 8000,
        });
      }
      onResend(updated);
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend invitation');
    } finally {
      setActionId(null);
    }
  };

  const handleRevoke = async (inv: Invitation) => {
    if (!confirm(`Revoke admin invitation for ${inv.email}?`)) return;
    setActionId(inv.id);
    try {
      await invitationService.revokeInvitation(inv.id, 'admin');
      toast.success(`Invitation revoked for ${inv.email}`);
      onRevoke(inv);
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke invitation');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (inv: Invitation) => {
    setConfirmDeleteId(null);
    setActionId(inv.id);
    try {
      await invitationService.deleteInvitation(inv.id);
      toast.success(`Invitation for ${inv.email} removed`);
      onDelete(inv);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete invitation');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '48px 0', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading invitations...
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
        No admin invitations yet. Use the form above to invite your first administrator.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {invitations.map(inv => {
        const busy = actionId === inv.id;
        const canCopyLink = inv.status === 'pending' || inv.status === 'expired';
        const canResend = inv.status === 'pending' || inv.status === 'expired';
        const canRevoke = inv.status === 'pending';
        const canDelete = inv.status !== 'pending';
        const isConfirmingDelete = confirmDeleteId === inv.id;
        const name = inv.metadata.firstName || inv.metadata.lastName
          ? `${inv.metadata.firstName ?? ''} ${inv.metadata.lastName ?? ''}`.trim()
          : inv.email;

        return (
          <div key={inv.id} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isConfirmingDelete ? 'rgba(248,113,113,0.3)' : 'rgba(96,205,255,0.12)'}`, borderRadius: isConfirmingDelete ? '10px 10px 0 0' : '10px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', transition: 'border-color 0.2s' }}>

              {/* Left: info */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{name}</span>
                  <StatusBadge status={inv.status} />
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  {(inv.metadata.firstName || inv.metadata.lastName) && <span>{inv.email}</span>}
                  {inv.status === 'accepted' && inv.acceptedAt ? (
                    <span style={{ color: '#4ade8088' }}>Accepted {formatDate(inv.acceptedAt)}</span>
                  ) : inv.status === 'pending' ? (
                    <span>Expires {formatDate(inv.expiresAt)}</span>
                  ) : inv.status === 'revoked' && inv.revokedAt ? (
                    <span style={{ color: '#f8717188' }}>Revoked {formatDate(inv.revokedAt)}</span>
                  ) : (
                    <span>Sent {formatDate(inv.createdAt)}</span>
                  )}
                </div>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                {canCopyLink && (
                  <button onClick={() => copyInviteLink(inv.token, inv.email)} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: `1px solid rgba(96,205,255,0.2)`, background: 'rgba(96,205,255,0.07)', color: BLUE2, fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1, transition: 'all 0.2s' }}>
                    <Copy size={11} />
                    Copy Link
                  </button>
                )}
                {canResend && (
                  <button onClick={() => handleResend(inv)} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: `1px solid ${BLUE}44`, background: 'rgba(55,181,255,0.1)', color: BLUE, fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1, transition: 'all 0.2s' }}>
                    {busy ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={11} />}
                    Resend
                  </button>
                )}
                {canRevoke && (
                  <button onClick={() => handleRevoke(inv)} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)', color: RED, fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1, transition: 'all 0.2s' }}>
                    {busy ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={11} />}
                    Revoke
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : inv.id)} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.2)', background: isConfirmingDelete ? 'rgba(248,113,113,0.15)' : 'transparent', color: isConfirmingDelete ? RED : 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1, transition: 'all 0.2s' }}>
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Inline delete confirmation */}
            {isConfirmingDelete && (
              <div style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.3)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                  Permanently remove <strong style={{ color: '#fff' }}>{name}</strong> from the list?
                </p>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => handleDelete(inv)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Trash2 size={10} /> Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
