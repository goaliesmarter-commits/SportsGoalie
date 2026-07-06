'use client';

import React, { useState } from 'react';
import { CoachInvitation, CreateInvitationData } from '@/types/auth';
import { coachInvitationService } from '@/lib/services/coach-invitation.service';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';

const RED = '#f87171';

interface InvitationFormProps {
  invitedBy: string;
  invitedByName: string;
  onInvitationCreated: (invitation: CoachInvitation) => void;
}

export function InvitationForm({ invitedBy, invitedByName, onInvitationCreated }: InvitationFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    organizationName: '',
    customMessage: '',
    expiresInDays: '7',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      setLoading(true);
      const invitationData: CreateInvitationData = {
        email: formData.email,
        invitedBy,
        invitedByName,
        expiresInDays: parseInt(formData.expiresInDays),
        metadata: {
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          organizationName: formData.organizationName || undefined,
          customMessage: formData.customMessage || undefined,
        },
      };
      const invitation = await coachInvitationService.createInvitation(invitationData);
      try {
        const res = await fetch('/api/invitations/send-coach-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitation }),
        });
        if (!res.ok) throw new Error('Email send request failed');
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        toast.warning('Invitation created but email failed to send', { description: 'You can copy the invitation link manually' });
      }
      onInvitationCreated(invitation);
      setFormData({ email: '', firstName: '', lastName: '', organizationName: '', customMessage: '', expiresInDays: '7' });
      toast.success('Invitation created successfully!', { description: `An invitation has been sent to ${invitation.email}` });
    } catch (error: unknown) {
      console.error('Failed to create invitation:', error);
      toast.error('Failed to create invitation', { description: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const fieldLabel = (text: string, required?: boolean) => (
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
      {text} {required && <span style={{ color: RED }}>*</span>}
    </p>
  );

  return (
    <>
      <style>{`
        .if-inp { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 10px !important; padding: 10px 14px !important; width: 100% !important; font-size: 15px !important; outline: none !important; box-sizing: border-box !important; }
        .if-inp:focus { border-color: rgba(55,181,255,0.45) !important; }
        .if-inp::placeholder { color: rgba(255,255,255,0.25) !important; }
        .if-inp:disabled { opacity: 0.5 !important; }
        .if-inp-icon { padding-left: 36px !important; }
        .if-sel { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: rgba(255,255,255,0.8) !important; border-radius: 10px !important; padding: 10px 14px !important; width: 100% !important; font-size: 15px !important; outline: none !important; cursor: pointer !important; }
        .if-sel:focus { border-color: rgba(55,181,255,0.45) !important; }
        .if-ta { background: rgba(2,18,44,0.7) !important; border: 1px solid rgba(55,181,255,0.18) !important; color: #fff !important; border-radius: 10px !important; padding: 10px 14px !important; width: 100% !important; font-size: 15px !important; outline: none !important; resize: vertical !important; box-sizing: border-box !important; }
        .if-ta:focus { border-color: rgba(55,181,255,0.45) !important; }
        .if-ta::placeholder { color: rgba(255,255,255,0.25) !important; }
      `}</style>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          {fieldLabel('Email Address', true)}
          <div style={{ position: 'relative' }}>
            <Mail size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input className="if-inp if-inp-icon" type="email" placeholder="coach@example.com" value={formData.email} onChange={e => handleChange('email', e.target.value)} required disabled={loading} />
          </div>
        </div>
        <div>
          {fieldLabel('First Name (Optional)')}
          <input className="if-inp" type="text" placeholder="John" value={formData.firstName} onChange={e => handleChange('firstName', e.target.value)} disabled={loading} />
        </div>
        <div>
          {fieldLabel('Last Name (Optional)')}
          <input className="if-inp" type="text" placeholder="Doe" value={formData.lastName} onChange={e => handleChange('lastName', e.target.value)} disabled={loading} />
        </div>
        <div>
          {fieldLabel('Organization (Optional)')}
          <input className="if-inp" type="text" placeholder="Hockey Academy" value={formData.organizationName} onChange={e => handleChange('organizationName', e.target.value)} disabled={loading} />
        </div>
        <div>
          {fieldLabel('Invitation Expires In')}
          <select className="if-sel" value={formData.expiresInDays} onChange={e => handleChange('expiresInDays', e.target.value)} disabled={loading}>
            <option value="1">1 Day</option>
            <option value="3">3 Days</option>
            <option value="7">7 Days (Recommended)</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>
        <div>
          {fieldLabel('Custom Message (Optional)')}
          <textarea className="if-ta" placeholder="Add a personal message for the coach..." value={formData.customMessage} onChange={e => handleChange('customMessage', e.target.value)} rows={3} disabled={loading} />
        </div>
        <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: loading ? 'rgba(248,113,113,0.5)' : `linear-gradient(135deg, ${RED} 0%, #dc2626 100%)`, border: 'none', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}>
          {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending Invitation...</> : <><Mail size={15} /> Send Invitation</>}
        </button>
      </form>
    </>
  );
}
