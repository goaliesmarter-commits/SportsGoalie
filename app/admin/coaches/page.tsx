'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import { CoachInvitation } from '@/types/auth';
import { coachInvitationService } from '@/lib/services/coach-invitation.service';
import { InvitationForm } from './components/InvitationForm';
import { InvitationList } from './components/InvitationList';
import { toast } from 'sonner';
import { UserPlus, Mail, CheckCircle, Clock, XCircle } from 'lucide-react';

const BLUE = '#37b5ff';
const RED = '#f87171';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'expired', label: 'Expired' },
  { id: 'revoked', label: 'Revoked' },
];

export default function CoachInvitationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [invitations, setInvitations] = useState<CoachInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await coachInvitationService.getAllInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationCreated = (invitation: CoachInvitation) => {
    setInvitations(prev => [invitation, ...prev]);
    toast.success(`Invitation sent to ${invitation.email}`);
  };

  const handleResend = async (invitation: CoachInvitation) => {
    try {
      const updated = await coachInvitationService.resendInvitation(invitation.id);
      setInvitations(prev => prev.map(inv => (inv.id === updated.id ? updated : inv)));

      try {
        const res = await fetch('/api/invitations/send-coach-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitation: updated }),
        });
        if (!res.ok) throw new Error('Email send request failed');
        toast.success(`Invitation resent to ${invitation.email}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        toast.warning('Invitation renewed but email failed to send', { description: 'You can copy the invitation link manually' });
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const handleRevoke = async (invitation: CoachInvitation) => {
    if (!user) return;
    try {
      await coachInvitationService.revokeInvitation(invitation.id, user.id);
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitation.id ? { ...inv, status: 'revoked', revokedAt: new Date(), revokedBy: user.id } : inv
        )
      );
      toast.success(`Invitation to ${invitation.email} has been revoked`);
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
      toast.error('Failed to revoke invitation');
    }
  };

  const filterInvitations = (status?: string) => {
    if (!status || status === 'all') return invitations;
    return invitations.filter(inv => inv.status === status);
  };

  const pendingCount = invitations.filter(inv => inv.status === 'pending').length;
  const acceptedCount = invitations.filter(inv => inv.status === 'accepted').length;
  const expiredCount = invitations.filter(inv => inv.status === 'expired').length;
  const revokedCount = invitations.filter(inv => inv.status === 'revoked').length;

  if (authLoading || user?.role !== 'admin') {
    return <div style={{ padding: '48px' }}><SkeletonDarkPage /></div>;
  }

  return (
    <>
      <style>{`
        .ci-tab { transition: all 0.2s !important; }
        .ci-tab:hover { background: rgba(55,181,255,0.06) !important; }
        @media (max-width: 768px) { .ci-layout { grid-template-columns: 1fr !important; } .ci-stats { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>Coach Invitations</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Invite coaches to join your platform and manage existing invitations</p>
        </div>

        {/* Stat Cards */}
        <div className="ci-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total', value: invitations.length, icon: Mail, color: BLUE },
            { label: 'Pending', value: pendingCount, icon: Clock, color: '#fbbf24' },
            { label: 'Accepted', value: acceptedCount, icon: CheckCircle, color: '#22c55e' },
            { label: 'Revoked', value: revokedCount, icon: XCircle, color: RED },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ position: 'relative', ...card, padding: '16px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600 }}>{label}</p>
                <Icon size={14} color={`${color}88`} />
              </div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '26px', lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Main Layout */}
        <div className="ci-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>

          {/* Invite Form */}
          <div style={{ position: 'relative', ...card, padding: '20px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <UserPlus size={16} color={RED} />
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Invite New Coach</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '18px' }}>Send an invitation email to a new coach</p>
            {user && (
              <InvitationForm
                invitedBy={user.id}
                invitedByName={user.displayName}
                onInvitationCreated={handleInvitationCreated}
              />
            )}
          </div>

          {/* Invitations List */}
          <div style={{ position: 'relative', ...card, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(55,181,255,0.1)', overflowX: 'auto' }}>
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                const count = tab.id === 'all' ? invitations.length : tab.id === 'pending' ? pendingCount : tab.id === 'accepted' ? acceptedCount : tab.id === 'expired' ? expiredCount : revokedCount;
                return (
                  <button key={tab.id} className={!active ? 'ci-tab' : ''} onClick={() => setActiveTab(tab.id)}
                    style={{ flex: 1, minWidth: '80px', padding: '13px 6px', background: active ? 'rgba(55,181,255,0.08)' : 'transparent', border: 'none', borderBottom: active ? `2px solid ${BLUE}` : '2px solid transparent', color: active ? BLUE : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>

            <div style={{ padding: '20px' }}>
              <InvitationList
                invitations={filterInvitations(activeTab)}
                loading={loading}
                onResend={handleResend}
                onRevoke={handleRevoke}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
