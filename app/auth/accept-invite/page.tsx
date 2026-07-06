'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Mail, Lock, User, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { invitationService } from '@/lib/services/invitation.service';
import { coachInvitationService } from '@/lib/services/coach-invitation.service';
import { Invitation } from '@/types/invitation';
import { CoachInvitation } from '@/types/auth';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const BLUE3 = '#0ea5e9';

type AnyInvitation =
  | { kind: 'generic'; data: Invitation }
  | { kind: 'coach_legacy'; data: CoachInvitation };

function roleLabel(inv: AnyInvitation): string {
  if (inv.kind === 'coach_legacy') return 'Coach';
  const roleMap: Record<string, string> = {
    student: 'Goalie',
    coach: 'Coach',
    goalie_coach: 'Goalie Coach',
    parent: 'Parent',
    admin: 'Administrator',
  };
  return roleMap[inv.data.role] ?? 'Member';
}

function invitedByName(inv: AnyInvitation): string {
  return inv.data.invitedByName ?? 'your administrator';
}

function invitationEmail(inv: AnyInvitation): string {
  return inv.data.email;
}

function invitationId(inv: AnyInvitation): string {
  return inv.data.id;
}

function metaFirstName(inv: AnyInvitation): string {
  return inv.data.metadata?.firstName ?? '';
}

function metaLastName(inv: AnyInvitation): string {
  return inv.data.metadata?.lastName ?? '';
}

function metaCustomMessage(inv: AnyInvitation): string | undefined {
  return inv.data.metadata?.customMessage;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(96,205,255,0.25)',
  borderRadius: '8px',
  padding: '11px 14px 11px 40px',
  color: '#fff',
  fontSize: '14px',
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

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '13px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'rgba(255,255,255,0.35)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  );
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { register } = useAuth();

  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<AnyInvitation | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [form, setForm] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!token) {
      setValidationError('Invalid invitation link. No token provided.');
      setValidating(false);
      return;
    }
    validateToken(token);
  }, [token]);

  const validateToken = async (t: string) => {
    try {
      setValidating(true);

      // Try the generic invitations collection first
      const result = await invitationService.validateInvitation(t);
      if (result.valid && result.invitation) {
        const inv: AnyInvitation = { kind: 'generic', data: result.invitation };
        setInvitation(inv);
        prefillForm(inv);
        setValidating(false);
        return;
      }

      // Fall back to legacy coach_invitations collection
      const legacyResult = await coachInvitationService.validateInvitation(t);
      if (legacyResult.valid && legacyResult.invitation) {
        const inv: AnyInvitation = { kind: 'coach_legacy', data: legacyResult.invitation };
        setInvitation(inv);
        prefillForm(inv);
        setValidating(false);
        return;
      }

      // Neither found
      setValidationError(
        result.error ?? legacyResult.error ?? 'Invalid or expired invitation link.'
      );
      setValidating(false);
    } catch {
      setValidationError('Failed to validate your invitation. Please try again.');
      setValidating(false);
    }
  };

  const prefillForm = (inv: AnyInvitation) => {
    const first = metaFirstName(inv);
    const last = metaLastName(inv);
    setForm(prev => ({
      ...prev,
      firstName: first,
      lastName: last,
      displayName: first && last ? `${first} ${last}` : first || last,
    }));
  };

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !token) return;

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!form.displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    try {
      setSubmitting(true);

      if (invitation.kind === 'coach_legacy') {
        // Legacy path: register as coach, mark legacy invitation accepted
        const { userId } = await register({
          email: invitation.data.email,
          password: form.password,
          displayName: form.displayName.trim(),
          role: 'coach',
          skipEmailVerification: true,
        });
        await coachInvitationService.acceptInvitation(invitationId(invitation), userId);
        toast.success('Coach account created! Welcome aboard.');
        router.push('/coach');
        return;
      }

      // Generic invitation path
      const inv = invitation.data as Invitation;
      const role = inv.role;

      // Map InvitableRole → RegisterCredentials role
      // goalie_coach doesn't exist in RegisterCredentials so register as 'coach' and patch Firestore
      const registerRole: 'student' | 'coach' | 'parent' | 'admin' =
        role === 'student' ? 'student'
        : role === 'parent' ? 'parent'
        : role === 'admin' ? 'admin'
        : 'coach'; // covers 'coach' and 'goalie_coach'

      const { userId } = await register({
        email: inv.email,
        password: form.password,
        displayName: form.displayName.trim(),
        role: registerRole,
        skipEmailVerification: true,
        ...(registerRole === 'student' && { workflowType: inv.metadata?.tier ?? 'automated' }),
      });

      // Post-registration Firestore patches
      const userRef = doc(db, 'users', userId);
      const patches: Record<string, unknown> = {};

      if (role === 'student' && inv.metadata?.assignedCoachId) {
        patches.assignedCoachId = inv.metadata.assignedCoachId;
        patches.assignedCoachName = inv.metadata.assignedCoachName ?? null;
      }

      if (role === 'goalie_coach') {
        patches.role = 'goalie_coach';
      }

      if (Object.keys(patches).length > 0) {
        await updateDoc(userRef, patches);
      }

      // Mark invitation accepted in the generic collection
      await invitationService.acceptInvitation(invitationId(invitation), userId);

      toast.success(`${roleLabel(invitation)} account created! Welcome aboard.`);
      // Redirect directly to the appropriate destination — the user is already authenticated
      // after register(), so routing through /auth/login would cause an immediate re-redirect.
      if (registerRole === 'student') {
        router.push('/onboarding');
      } else if (registerRole === 'parent') {
        router.push('/onboarding?role=parent');
      } else if (registerRole === 'admin') {
        router.push('/admin');
      } else {
        router.push('/coach');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
      setSubmitting(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (validating) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #050d1a 0%, #0a1628 50%, #0d1b3a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <Loader2 size={28} color={BLUE} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '14px', letterSpacing: '0.5px' }}>Validating your invite...</span>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (validationError || !invitation) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #050d1a 0%, #0a1628 50%, #0d1b3a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: '16px',
            padding: '36px 32px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <XCircle size={26} color="#f87171" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
            Invalid Invitation
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px', lineHeight: 1.6 }}>
            {validationError ?? 'This invitation link is invalid, expired, or has already been used.'}
          </p>
          <Link
            href="/auth/login"
            style={{
              display: 'inline-block',
              padding: '11px 28px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE3} 100%)`,
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              textDecoration: 'none',
              letterSpacing: '0.5px',
            }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ─── Registration form ────────────────────────────────────────────────────
  const label = roleLabel(invitation);
  const byName = invitedByName(invitation);
  const email = invitationEmail(invitation);
  const customMsg = metaCustomMessage(invitation);

  // For goalie: show assigned coach
  const assignedCoachName =
    invitation.kind === 'generic'
      ? (invitation.data as Invitation).metadata?.assignedCoachName
      : undefined;

  return (
    <>
      <style>{`
        @media (min-width: 768px) { .ai-grid { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #050d1a 0%, #0a1628 50%, #0d1b3a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <div className="ai-grid" style={{ width: '100%', maxWidth: '860px', display: 'grid', gridTemplateColumns: '1fr', gap: '16px', alignItems: 'start' }}>

          {/* ── Left: Invite info ── */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid rgba(55,181,255,0.2)`,
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Logo + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE3} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 20px rgba(55,181,255,0.3)',
                }}
              >
                <CheckCircle size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                  You&apos;re Invited!
                </h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                  Create your {label} account below
                </p>
              </div>
            </div>

            {/* Role badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `rgba(55,181,255,0.1)`, border: `1px solid rgba(55,181,255,0.2)`, borderRadius: '8px', padding: '6px 12px', width: 'fit-content' }}>
              <Shield size={13} color={BLUE} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: BLUE, letterSpacing: '0.5px' }}>{label} Account</span>
            </div>

            {/* Invite details */}
            <div
              style={{
                background: 'rgba(55,181,255,0.06)',
                border: '1px solid rgba(55,181,255,0.15)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} color={BLUE2} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: BLUE2, fontWeight: 600 }}>{email}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                Invited by <strong style={{ color: '#fff' }}>{byName}</strong>
                {assignedCoachName && (
                  <> · Coach: <strong style={{ color: '#fff' }}>{assignedCoachName}</strong></>
                )}
              </div>
              {customMsg && (
                <div
                  style={{
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(96,205,255,0.1)',
                    fontStyle: 'italic',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.45)',
                    lineHeight: 1.6,
                  }}
                >
                  &ldquo;{customMsg}&rdquo;
                </div>
              )}
            </div>

            {/* Already have account */}
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: 'auto' }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: BLUE2, textDecoration: 'none', fontWeight: 600 }}>
                Sign in
              </Link>
            </p>
          </div>

          {/* ── Right: Form ── */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(96,205,255,0.12)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Display Name */}
              <div>
                <label style={labelStyle}>
                  Display Name <span style={{ color: BLUE }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <IconWrap><User size={15} /></IconWrap>
                  <input
                    type="text"
                    placeholder="How your name appears on the platform"
                    value={form.displayName}
                    onChange={e => set('displayName', e.target.value)}
                    style={inputStyle}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input
                    type="text"
                    placeholder="Alex"
                    value={form.firstName}
                    onChange={e => set('firstName', e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '14px' }}
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
                    style={{ ...inputStyle, paddingLeft: '14px' }}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Email (locked) */}
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <IconWrap><Mail size={15} /></IconWrap>
                  <input
                    type="email"
                    value={email}
                    style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                    disabled
                  />
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                  Pre-filled from your invitation — cannot be changed
                </p>
              </div>

              {/* Password row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>
                    Password <span style={{ color: BLUE }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <IconWrap><Lock size={15} /></IconWrap>
                    <input
                      type="password"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      style={inputStyle}
                      required
                      minLength={8}
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>
                    Confirm Password <span style={{ color: BLUE }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <IconWrap><Lock size={15} /></IconWrap>
                    <input
                      type="password"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      style={inputStyle}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '13px 0',
                  borderRadius: '8px',
                  border: 'none',
                  background: submitting
                    ? 'rgba(55,181,255,0.25)'
                    : `linear-gradient(135deg, ${BLUE} 0%, ${BLUE3} 100%)`,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '13px',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting ? 'none' : '0 4px 20px rgba(55,181,255,0.35)',
                  transition: 'all 0.2s',
                  marginTop: '6px',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Shield size={15} />
                    Create {label} Account
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #050d1a 0%, #0a1628 50%, #0d1b3a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader2 size={28} color="#37b5ff" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
