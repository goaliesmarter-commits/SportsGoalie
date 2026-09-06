'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Loader2, Mail, Shield, User, Copy, Check, RefreshCw, Zap, Users } from 'lucide-react';
import Image from 'next/image';

import { useAuth } from '@/lib/auth/context';
import { profileUpdateSchema, type ProfileUpdateFormData } from '@/lib/validation/auth';
import { ParentLinkManager } from '@/components/settings/ParentLinkManager';
import { userService } from '@/lib/database/services/user.service';
import { normalizeCoachCode } from '@/lib/utils/coach-code-generator';
import type { WorkflowType } from '@/types/index';

const BLUE = '#37b5ff';

function formatTs(ts: unknown): string {
  if (!ts) return 'N/A';
  const t = ts as { toDate?: () => Date };
  const date = t.toDate ? t.toDate() : new Date(ts as string);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTsShort(ts: unknown): string {
  if (!ts) return 'N/A';
  const t = ts as { toDate?: () => Date };
  const date = t.toDate ? t.toDate() : new Date(ts as string);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ProfilePage() {
  const { user, updateUserProfile, resendEmailVerification } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [copiedStudentId, setCopiedStudentId] = useState(false);
  const [isWorkflowSwitching, setIsWorkflowSwitching] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);
  const [coachCode, setCoachCode] = useState('');
  const [showCoachCodeInput, setShowCoachCodeInput] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError, reset } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { displayName: user?.displayName || '', photoURL: user?.profileImage || '' },
  });

  const onSubmit = async (data: ProfileUpdateFormData) => {
    try {
      setIsLoading(true);
      await updateUserProfile(data);
      reset(data);
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResendingVerification(true);
      await resendEmailVerification();
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Failed to send verification email' });
    } finally {
      setIsResendingVerification(false);
    }
  };

  const copyStudentIdToClipboard = async () => {
    if (user?.studentNumber) {
      await navigator.clipboard.writeText(user.studentNumber);
      setCopiedStudentId(true);
      setTimeout(() => setCopiedStudentId(false), 2000);
    }
  };

  const handleWorkflowSwitch = async (targetWorkflow: WorkflowType) => {
    if (!user) return;
    setWorkflowError(null);
    setWorkflowSuccess(null);

    if (targetWorkflow === 'custom') {
      if (!showCoachCodeInput) { setShowCoachCodeInput(true); return; }
      if (!coachCode.trim()) { setWorkflowError('Please enter a coach code to switch to coach-guided mode.'); return; }
      try {
        setIsWorkflowSwitching(true);
        const normalizedCode = normalizeCoachCode(coachCode.trim());
        const coachResult = await userService.getCoachByCode(normalizedCode);
        if (!coachResult.success || !coachResult.data) {
          setWorkflowError('Invalid coach code. Please check with your coach and try again.');
          return;
        }
        await updateUserProfile({ workflowType: 'custom', assignedCoachId: coachResult.data.id, assignedCoachName: coachResult.data.displayName });
        setWorkflowSuccess(`Switched to Coach-Guided mode with ${coachResult.data.displayName}.`);
        setShowCoachCodeInput(false);
        setCoachCode('');
      } catch { setWorkflowError('Failed to switch workflow. Please try again.'); }
      finally { setIsWorkflowSwitching(false); }
    } else {
      try {
        setIsWorkflowSwitching(true);
        // Clear the coach link too — leaving it behind would keep this goalie on
        // the old coach's roster queries after they've left coach-guided mode.
        await updateUserProfile({ workflowType: 'automated', assignedCoachId: null, assignedCoachName: null });
        setWorkflowSuccess('Switched to Self-Paced mode.');
        setShowCoachCodeInput(false);
        setCoachCode('');
      } catch { setWorkflowError('Failed to switch workflow. Please try again.'); }
      finally { setIsWorkflowSwitching(false); }
    }
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Please log in to view your profile.</p>
      </div>
    );
  }

  const sectionStyle = { background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px', overflow: 'hidden' };
  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(55,181,255,0.18)', background: 'rgba(55,181,255,0.04)', color: '#fff', fontSize: '13px', transition: 'all 0.2s', boxSizing: 'border-box' as const };
  const inputDisabledStyle = { ...inputStyle, background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', cursor: 'not-allowed' };
  const labelStyle = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700 as const, marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.8px' };

  return (
    <>
      <style>{`
        .pf-input::placeholder { color: rgba(255,255,255,0.2); }
        .pf-input:focus { outline: none; border-color: ${BLUE} !important; box-shadow: 0 0 0 3px rgba(55,181,255,0.1) !important; }
        .pf-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .pf-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pf-outline:hover { background: rgba(55,181,255,0.12) !important; border-color: ${BLUE} !important; }
        .pf-wf-btn:hover:not(:disabled) { border-color: rgba(55,181,255,0.35) !important; }
        @keyframes pf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pf-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 900px) { .pf-grid { grid-template-columns: 3fr 2fr; } }
        .pf-acct-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 480px) { .pf-acct-grid { grid-template-columns: 1fr 1fr; gap: 20px; } }
        .pf-wf-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 480px) { .pf-wf-grid { grid-template-columns: 1fr 1fr; gap: 12px; } }
      `}</style>

      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Hero — full width */}
        <div style={{ position: 'relative', borderRadius: '16px', background: 'linear-gradient(135deg, #000f28 0%, #062344 50%, #0a1628 100%)', padding: '28px 32px', overflow: 'hidden', border: '1px solid rgba(55,181,255,0.15)' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(55,181,255,0.07)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={20} color={BLUE} />
            </div>
            <div>
              <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '4px' }}>Profile Settings</h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Manage your account information and preferences.</p>
            </div>
          </div>
        </div>

        {/* Email Verification Banner — full width */}
        {!user.emailVerified && (
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>Email not verified</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Please verify your email to access all features.</p>
              </div>
            </div>
            <button onClick={handleResendVerification} disabled={isResendingVerification} className="pf-outline"
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', fontSize: '12px', fontWeight: 700, cursor: isResendingVerification ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              {isResendingVerification ? <><Loader2 size={13} style={{ animation: 'pf-spin 1s linear infinite' }} />Sending...</> : 'Resend'}
            </button>
          </div>
        )}

        {/* Two-column content */}
        <div className="pf-grid">

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Profile Information */}
            <div style={sectionStyle}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} color={BLUE} />
                  <h2 style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Profile Information</h2>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '4px' }}>Update your personal information and profile picture.</p>
              </div>
              <div style={{ padding: '24px' }}>
                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Profile Picture */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {user.profileImage ? (
                        <Image src={user.profileImage} alt="Profile" width={72} height={72} style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(55,181,255,0.3)' }} />
                      ) : (
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(55,181,255,0.1)', border: '2px solid rgba(55,181,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={28} color="rgba(255,255,255,0.3)" />
                        </div>
                      )}
                      <button type="button" style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(2,18,44,0.9)', border: `1px solid rgba(55,181,255,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Camera size={13} color={BLUE} />
                      </button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="photoURL" style={labelStyle}>Profile Picture URL</label>
                      <input id="photoURL" placeholder="https://example.com/photo.jpg" {...register('photoURL')} className="pf-input" style={{ ...inputStyle, ...(errors.photoURL ? { borderColor: '#f87171' } : {}) }} />
                      {errors.photoURL && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.photoURL.message}</p>}
                    </div>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label htmlFor="displayName" style={labelStyle}>Display Name</label>
                    <input id="displayName" placeholder="Enter your display name" {...register('displayName')} className="pf-input" style={{ ...inputStyle, ...(errors.displayName ? { borderColor: '#f87171' } : {}) }} />
                    {errors.displayName && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.displayName.message}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" style={labelStyle}>Email Address</label>
                    <input id="email" type="email" value={user.email} disabled style={inputDisabledStyle} />
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '4px' }}>Email address cannot be changed. Contact support if needed.</p>
                  </div>

                  {/* Student ID */}
                  {user.role === 'student' && user.studentNumber && (
                    <div>
                      <label htmlFor="studentId" style={labelStyle}>Student ID</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input id="studentId" value={user.studentNumber} disabled style={{ ...inputDisabledStyle, fontFamily: 'monospace', fontSize: '15px', flex: 1 }} />
                        <button type="button" onClick={copyStudentIdToClipboard} title="Copy Student ID" className="pf-outline"
                          style={{ width: '42px', height: '42px', borderRadius: '10px', border: '1px solid rgba(55,181,255,0.2)', background: 'rgba(55,181,255,0.05)', color: copiedStudentId ? '#34d399' : BLUE, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {copiedStudentId ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '4px' }}>Share this ID with your parents so they can link their account to yours.</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                    <button type="submit" disabled={isLoading} className="pf-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 22px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(55,181,255,0.3)' }}>
                      {isLoading ? <><Loader2 size={15} style={{ animation: 'pf-spin 1s linear infinite' }} />Updating...</> : 'Update Profile'}
                    </button>
                  </div>

                  {errors.root && (
                    <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ color: '#f87171', fontSize: '12px' }}>{errors.root.message}</p>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Account Information */}
            <div style={sectionStyle}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} color={BLUE} />
                  <h2 style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Account Information</h2>
                </div>
              </div>
              <div className="pf-acct-grid" style={{ padding: '24px' }}>
                <div>
                  <p style={{ ...labelStyle, marginBottom: '4px' }}>Account Type</p>
                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, textTransform: 'capitalize' }}>{user.role}</p>
                </div>
                <div>
                  <p style={{ ...labelStyle, marginBottom: '4px' }}>Member Since</p>
                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{formatTs(user.createdAt)}</p>
                </div>
                <div>
                  <p style={{ ...labelStyle, marginBottom: '4px' }}>Email Status</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: user.emailVerified ? '#34d399' : '#fbbf24' }}>
                    {user.emailVerified ? 'Verified' : 'Pending Verification'}
                  </p>
                </div>
                <div>
                  <p style={{ ...labelStyle, marginBottom: '4px' }}>Last Login</p>
                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{formatTsShort(user.lastLoginAt)}</p>
                </div>
              </div>
            </div>

          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Family Links */}
            {user.role === 'student' && <ParentLinkManager user={user} />}

            {/* Learning Mode */}
            {user.role === 'student' && (
              <div style={sectionStyle}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} color={BLUE} />
                    <h2 style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Learning Mode</h2>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '4px' }}>Switch between self-paced and coach-guided learning workflows.</p>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="pf-wf-grid">
                    {/* Self-Paced */}
                    <button type="button" onClick={() => handleWorkflowSwitch('automated')}
                      disabled={isWorkflowSwitching || user.workflowType === 'automated'}
                      className="pf-wf-btn"
                      style={{ position: 'relative', borderRadius: '12px', border: `2px solid ${user.workflowType === 'automated' ? BLUE : 'rgba(255,255,255,0.08)'}`, padding: '16px', textAlign: 'left', background: user.workflowType === 'automated' ? 'rgba(55,181,255,0.08)' : 'rgba(255,255,255,0.02)', cursor: isWorkflowSwitching || user.workflowType === 'automated' ? 'default' : 'pointer', transition: 'all 0.2s', opacity: isWorkflowSwitching ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Zap size={18} color={user.workflowType === 'automated' ? BLUE : 'rgba(255,255,255,0.3)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Self-Paced</p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', lineHeight: 1.5 }}>Progress automatically at your own speed.</p>
                        </div>
                      </div>
                      {user.workflowType === 'automated' && (
                        <span style={{ position: 'absolute', top: '10px', right: '10px', padding: '2px 8px', borderRadius: '20px', background: BLUE, color: '#000f28', fontSize: '10px', fontWeight: 800 }}>Active</span>
                      )}
                    </button>

                    {/* Coach-Guided */}
                    <button type="button" onClick={() => handleWorkflowSwitch('custom')}
                      disabled={isWorkflowSwitching || (user.workflowType === 'custom' && !showCoachCodeInput)}
                      className="pf-wf-btn"
                      style={{ position: 'relative', borderRadius: '12px', border: `2px solid ${user.workflowType === 'custom' ? BLUE : 'rgba(255,255,255,0.08)'}`, padding: '16px', textAlign: 'left', background: user.workflowType === 'custom' ? 'rgba(55,181,255,0.08)' : 'rgba(255,255,255,0.02)', cursor: isWorkflowSwitching || (user.workflowType === 'custom' && !showCoachCodeInput) ? 'default' : 'pointer', transition: 'all 0.2s', opacity: isWorkflowSwitching ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Users size={18} color={user.workflowType === 'custom' ? BLUE : 'rgba(255,255,255,0.3)'} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Coach-Guided</p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', lineHeight: 1.5 }}>Follow a curriculum from your coach.</p>
                        </div>
                      </div>
                      {user.workflowType === 'custom' && (
                        <span style={{ position: 'absolute', top: '10px', right: '10px', padding: '2px 8px', borderRadius: '20px', background: BLUE, color: '#000f28', fontSize: '10px', fontWeight: 800 }}>Active</span>
                      )}
                    </button>
                  </div>

                  {/* Coach Code Input */}
                  {showCoachCodeInput && user.workflowType !== 'custom' && (
                    <div style={{ background: 'rgba(55,181,255,0.04)', border: '1px solid rgba(55,181,255,0.15)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label htmlFor="coachCode" style={labelStyle}>Coach Code</label>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '-6px' }}>Enter the code provided by your coach.</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input id="coachCode" placeholder="e.g. SMITH-7K3M" value={coachCode} onChange={(e) => setCoachCode(e.target.value.toUpperCase())} className="pf-input"
                          style={{ ...inputStyle, fontFamily: 'monospace', textTransform: 'uppercase', flex: 1 }} />
                        <button onClick={() => handleWorkflowSwitch('custom')} disabled={isWorkflowSwitching || !coachCode.trim()} className="pf-btn"
                          style={{ padding: '11px 18px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', fontSize: '13px', fontWeight: 800, cursor: isWorkflowSwitching || !coachCode.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          {isWorkflowSwitching ? <Loader2 size={15} style={{ animation: 'pf-spin 1s linear infinite' }} /> : 'Confirm'}
                        </button>
                        <button onClick={() => { setShowCoachCodeInput(false); setCoachCode(''); setWorkflowError(null); }} className="pf-outline"
                          style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {workflowSuccess && (
                    <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ color: '#34d399', fontSize: '12px' }}>{workflowSuccess}</p>
                    </div>
                  )}
                  {workflowError && (
                    <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ color: '#f87171', fontSize: '12px' }}>{workflowError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
