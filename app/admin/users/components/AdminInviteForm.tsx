'use client';

import { useState } from 'react';
import { Loader2, Send, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { invitationService } from '@/lib/services/invitation.service';
import { Invitation } from '@/types/invitation';

const RED = '#f87171';

interface Props {
  invitedBy: string;
  invitedByName: string;
  onInvitationCreated: (inv: Invitation) => void;
}

export function AdminInviteForm({ invitedBy, invitedByName, onInvitationCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    customMessage: '',
  });

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) { toast.error('Email is required'); return; }

    try {
      setSubmitting(true);
      const invitation = await invitationService.createInvitation({
        email: form.email.trim().toLowerCase(),
        role: 'admin',
        invitedBy,
        invitedByName,
        expiresInDays: 7,
        metadata: {
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          customMessage: form.customMessage.trim() || undefined,
        },
      });

      try {
        const res = await fetch('/api/invitations/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitation }),
        });
        if (!res.ok) throw new Error('Email API error');
        toast.success(`Admin invite sent to ${invitation.email}`);
      } catch {
        toast.warning(`Email delivery failed for ${invitation.email}`, {
          description: 'Invitation saved — use "Copy Link" in the list below to share it manually.',
          duration: 10000,
        });
      }

      onInvitationCreated(invitation);
      setForm({ firstName: '', lastName: '', email: '', customMessage: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
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
    transition: 'border-color 0.2s',
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`@media (max-width: 480px) { .aif-name { grid-template-columns: 1fr !important; } }`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
        <ShieldAlert size={14} color={RED} style={{ flexShrink: 0, marginTop: '1px' }} />
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          This grants full administrator access. Only invite people you trust.
        </p>
      </div>

      <div className="aif-name" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>First Name</label>
          <input
            type="text"
            placeholder="Alex"
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </div>
        <div>
          <label style={labelStyle}>Last Name</label>
          <input
            type="text"
            placeholder="Smith"
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Email Address <span style={{ color: RED }}>*</span></label>
        <input
          type="email"
          placeholder="admin@email.com"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          style={inputStyle}
          required
          disabled={submitting}
        />
      </div>

      <div>
        <label style={labelStyle}>Personal Message <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></label>
        <textarea
          placeholder="Add a personal note to include in the invite email..."
          value={form.customMessage}
          onChange={e => set('customMessage', e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          disabled={submitting}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: submitting ? 'rgba(248,113,113,0.4)' : `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`,
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 0',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          cursor: submitting ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: submitting ? 'none' : '0 4px 20px rgba(248,113,113,0.35)',
        }}
      >
        {submitting ? (
          <>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Sending Invite...
          </>
        ) : (
          <>
            <Send size={14} />
            Send Admin Invite
          </>
        )}
      </button>
    </form>
  );
}
