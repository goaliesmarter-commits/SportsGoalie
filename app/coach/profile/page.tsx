'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Loader2, Mail, Shield, User, Users, BookOpen } from 'lucide-react';

import { toast } from 'sonner';

import { useAuth } from '@/lib/auth/context';
import { toProfileUpdate } from '@/lib/auth/profile-update';
import { profileUpdateSchema, type ProfileUpdateFormData } from '@/lib/validation/auth';

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

export default function CoachProfilePage() {
  const router = useRouter();
  const { user, updateUserProfile, resendEmailVerification, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError, reset } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    // `values`, not `defaultValues`: on a refresh the user is not loaded yet when this runs, and
    // defaults are read only once - the name field stayed blank until the goalie retyped it.
    values: { displayName: user?.displayName || '', photoURL: user?.profileImage || '' },
    resetOptions: { keepDirtyValues: true },
  });

  if (!authLoading && user && user.role !== 'coach' && user.role !== 'admin') {
    router.push('/dashboard');
    return null;
  }

  const onSubmit = async (data: ProfileUpdateFormData) => {
    try {
      setIsLoading(true);
      await updateUserProfile(toProfileUpdate(data));
      reset(data);
      toast.success('Profile updated');
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

  if (!user) return null;

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
        @keyframes pf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pf-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 900px) { .pf-grid { grid-template-columns: 3fr 2fr; } }
        .pf-acct-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 480px) { .pf-acct-grid { grid-template-columns: 1fr 1fr; gap: 20px; } }
      `}</style>

      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Hero */}
        <div style={{ position: 'relative', borderRadius: '16px', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 50%, #0d1f40 100%)', padding: '28px 32px', overflow: 'hidden', border: '1px solid rgba(55,181,255,0.22)', boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(55,181,255,0.07)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={20} color={BLUE} />
            </div>
            <div>
              <p style={{ color: BLUE, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Coach</p>
              <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '4px' }}>Profile Settings</h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Manage your coach account information.</p>
            </div>
          </div>
        </div>

        {/* Email Verification Banner */}
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
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '4px' }}>Update your name and profile picture.</p>
              </div>
              <div style={{ padding: '24px' }}>
                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Profile Picture */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {user.profileImage ? (
                        <Image src={user.profileImage} alt="Profile" width={72} height={72} unoptimized style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(55,181,255,0.3)' }} />
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

            {/* Coach Panel */}
            <div style={sectionStyle}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(55,181,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color={BLUE} />
                  <h2 style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Coach Panel</h2>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '4px' }}>Quick access to your coaching tools.</p>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { href: '/coach/students', icon: <Users size={15} color={BLUE} />, label: 'My Goalies', desc: 'View and manage your roster' },
                  { href: '/coach/content', icon: <BookOpen size={15} color="#a78bfa" />, label: 'Content Library', desc: 'Create lessons and quizzes' },
                  { href: '/coach', icon: <Shield size={15} color="#4ade80" />, label: 'Dashboard', desc: 'Overview and stats' },
                ].map(link => (
                  <a key={link.href} href={link.href}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(55,181,255,0.1)', textDecoration: 'none', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(55,181,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(55,181,255,0.25)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(55,181,255,0.1)'; }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(55,181,255,0.07)', border: '1px solid rgba(55,181,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {link.icon}
                    </div>
                    <div>
                      <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>{link.label}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{link.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
