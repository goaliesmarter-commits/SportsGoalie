'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Mail, ChevronDown } from 'lucide-react';

import { useAuth } from '@/lib/auth/context';
import { registerSchema, type RegisterFormData } from '@/lib/validation/auth';
import {
  GOALIE_SELF_REGISTRATION_ENABLED,
  MAX_SIGNUP_AGE,
  PARENT_HELD_ACCOUNT_AGE,
  parseDateOfBirth,
  requiresParentHeldAccount,
} from '@/lib/auth/signup-policy';
import { isAuthError } from '@/lib/errors/auth-errors';
import { toast } from 'sonner';

const BLUE = '#37b5ff';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(55,181,255,0.18)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  color: 'rgba(255,255,255,0.65)',
  display: 'block',
  marginBottom: '6px',
};

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect already-authenticated users to their home so they don't see this form flash
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') router.push('/admin');
      else if (user.role === 'coach') router.push('/coach');
      else if (user.role === 'parent') router.push('/parent');
      else if (user.role === 'student' && !user.onboardingCompleted) router.push('/onboarding');
      else router.push('/dashboard');
    }
  }, [user, loading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'parent' as const,
      workflowType: 'automated' as const,
      agreeToTerms: false,
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      dateOfBirth: '',
    },
  });

  const selectedRole = watch('role');

  const dateOfBirthValue = watch('dateOfBirth');

  // Bounds for the date input. `max` stops a birthday in the future being
  // picked at all, and `min` keeps the picker's year list to something a person
  // would scroll. Computed once — the page is not open across a midnight.
  const [todayISO, earliestDobISO] = useMemo(() => {
    const pad = (n: number): string => String(n).padStart(2, '0');
    const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date();
    const earliest = new Date(now.getFullYear() - MAX_SIGNUP_AGE, now.getMonth(), now.getDate());
    return [iso(now), iso(earliest)];
  }, []);

  // Whether this sign-up has to go through a parent instead (item 6b).
  // Recomputed as they type — a half-entered date parses to null, so the notice
  // does not flash while the year is still being typed.
  const needsParentAccount = useMemo((): boolean => {
    if (selectedRole !== 'student') return false;
    const dob = parseDateOfBirth(dateOfBirthValue);
    return dob !== null && requiresParentHeldAccount(dob);
  }, [selectedRole, dateOfBirthValue]);

  const onSubmit = async (data: Record<string, unknown>) => {
    // Belt and braces. The submit button is disabled while this is true, but a
    // keyboard submit or a browser autofill can still arrive here, and what is
    // on the other side of this function is a real account.
    if (needsParentAccount) {
      setError('dateOfBirth', {
        message: 'A parent or guardian needs to create this account.',
      });
      return;
    }

    try {
      setIsLoading(true);
      await registerUser(data as RegisterFormData);
      toast.success('Account created successfully!', {
        description: "Your account is ready. Let's complete onboarding.",
        duration: 6000,
      });
      if (data.role === 'parent') router.push('/onboarding?role=parent');
      else if (data.role === 'admin') router.push('/admin');
      else if (data.role === 'coach') router.push('/coach');
      else router.push('/onboarding');
    } catch (error) {
      if (isAuthError(error)) {
        setError('root', { message: error.userMessage });
        toast.error('Registration failed', { description: error.userMessage });
      } else {
        const msg = error instanceof Error ? error.message : 'Registration failed';
        setError('root', { message: msg });
        toast.error('Registration failed', { description: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000c1e' }}>

      {/* ── LEFT — Form panel ── */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#00101f',
          padding: '28px 24px',
          overflowY: 'auto',
        }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex justify-center">
          <Link href="/">
            <img src="/logo.png" alt="Smarter Goalie" style={{ height: '40px' }} />
          </Link>
        </div>

        <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '6px' }}>
              New here?
            </p>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Create account
            </h1>
          </div>

          {/* Goalie notice — only while goalies are invitation-only. Once
              self-registration is switched on, "check your email" would be
              telling a goalie to wait for an invitation that is not coming. */}
          {!GOALIE_SELF_REGISTRATION_ENABLED && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                borderRadius: '8px',
                border: `1px solid rgba(55,181,255,0.2)`,
                background: 'rgba(55,181,255,0.06)',
                padding: '8px 12px',
                marginBottom: '14px',
              }}
            >
              <Mail size={12} style={{ color: BLUE, flexShrink: 0 }} />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, margin: 0 }}>
                <span style={{ color: BLUE, fontWeight: 700 }}>Goalie?</span>{' '}
                Register via your personal invite link — check your email.
              </p>
            </div>
          )}

          <style dangerouslySetInnerHTML={{ __html: `
            @media (max-width: 480px) {
              .reg-grid-role { grid-template-columns: 1fr !important; }
              .reg-grid-pw   { grid-template-columns: 1fr !important; }
            }
          `}} />
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}
            data-testid="register-form"
          >
            {/* Role + Full Name — side by side on sm+, stacked on mobile */}
            <div className="reg-grid-role" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '10px' }}>
              <div>
                <label htmlFor="role" style={labelStyle}>I am a...</label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) => setValue('role', e.target.value as 'parent' | 'coach' | 'student')}
                    data-testid="role-select"
                    style={{ ...inputStyle, background: '#001628', appearance: 'none', paddingRight: '30px', cursor: 'pointer' }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(55,181,255,0.2)')}
                  >
                    <option value="parent" style={{ background: '#001628', color: '#fff' }}>Parent</option>
                    <option value="coach" style={{ background: '#001628', color: '#fff' }}>Coach</option>
                    {GOALIE_SELF_REGISTRATION_ENABLED && (
                      <option value="student" style={{ background: '#001628', color: '#fff' }}>Goalie</option>
                    )}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                </div>
                {errors.role && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }} data-testid="role-error">{errors.role.message}</p>}
              </div>

              <div>
                <label htmlFor="displayName" style={labelStyle}>Full Name</label>
                <input
                  id="displayName"
                  placeholder="Your full name"
                  {...register('displayName')}
                  data-testid="display-name-input"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(55,181,255,0.2)')}
                />
                {errors.displayName && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }} data-testid="display-name-error">{errors.displayName.message}</p>}
              </div>
            </div>

            {/* Date of birth — goalies only (item 6b). A parent or coach signing
                themselves up is an adult by definition and is not asked. */}
            {selectedRole === 'student' && (
              <div>
                <label htmlFor="dateOfBirth" style={labelStyle}>Date of Birth</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  max={todayISO}
                  min={earliestDobISO}
                  {...register('dateOfBirth')}
                  data-testid="date-of-birth-input"
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(55,181,255,0.2)')}
                />
                {errors.dateOfBirth && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }} data-testid="date-of-birth-error">{errors.dateOfBirth.message}</p>}
              </div>
            )}

            {/* The under-age route. Shown the moment the date says so, rather than
                after a completed form is rejected — and it offers the way through
                instead of only closing the door. */}
            {needsParentAccount && (
              <div
                data-testid="parent-account-required"
                style={{
                  borderRadius: '8px',
                  border: '1px solid rgba(55,181,255,0.28)',
                  background: 'rgba(55,181,255,0.07)',
                  padding: '12px 14px',
                }}
              >
                <p style={{ fontSize: '12px', fontWeight: 800, color: BLUE, margin: '0 0 6px', letterSpacing: '0.5px' }}>
                  A parent needs to start this one
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: 0 }}>
                  Under {PARENT_HELD_ACCOUNT_AGE}, a parent or guardian creates and holds the
                  account — and the goalie still gets their own login inside it. Ask them to
                  sign up here as a parent; they can add you from their dashboard straight
                  afterwards, and you will have your own login before they close the laptop.
                </p>
                <button
                  type="button"
                  onClick={() => setValue('role', 'parent')}
                  data-testid="switch-to-parent"
                  style={{
                    marginTop: '10px',
                    background: 'transparent',
                    border: `1px solid ${BLUE}`,
                    color: BLUE,
                    borderRadius: '6px',
                    padding: '7px 12px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Sign up as a parent →
                </button>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
                data-testid="email-input"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(55,181,255,0.2)')}
              />
              {errors.email && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }} data-testid="email-error">{errors.email.message}</p>}
            </div>

            {/* Password + Confirm Password — side by side on sm+, stacked on mobile */}
            <div className="reg-grid-pw" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label htmlFor="password" style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    {...register('password')}
                    data-testid="password-input"
                    style={{ ...inputStyle, paddingRight: '38px' }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(55,181,255,0.2)')}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} data-testid="toggle-password"
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, display: 'flex' }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }} data-testid="password-error">{errors.password.message}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm"
                    {...register('confirmPassword')}
                    data-testid="confirm-password-input"
                    style={{ ...inputStyle, paddingRight: '38px' }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(55,181,255,0.2)')}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} data-testid="toggle-confirm-password"
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, display: 'flex' }}>
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.confirmPassword && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }} data-testid="confirm-password-error">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Terms */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <input type="checkbox" {...register('agreeToTerms')} data-testid="agree-terms-checkbox"
                style={{ width: '14px', height: '14px', accentColor: BLUE, cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                I agree to the{' '}
                <Link href="/terms" style={{ color: BLUE, textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>{' '}
                and{' '}
                <Link href="/privacy" style={{ color: BLUE, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>
              </span>
            </div>
            {errors.agreeToTerms && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '-4px' }} data-testid="agree-terms-error">{errors.agreeToTerms.message}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || needsParentAccount}
              data-testid="register-submit"
              style={{
                width: '100%', padding: '13px 0', borderRadius: '8px', border: 'none',
                background: isLoading || needsParentAccount ? 'rgba(55,181,255,0.3)' : `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
                color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase',
                cursor: isLoading || needsParentAccount ? 'not-allowed' : 'pointer',
                boxShadow: isLoading || needsParentAccount ? 'none' : '0 4px 24px rgba(55,181,255,0.28)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {isLoading ? (<><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Creating Account...</>) : 'Create Account →'}
            </button>

            {errors.root && (
              <div style={{ borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', padding: '10px 14px' }} data-testid="register-error">
                <p style={{ fontSize: '13px', color: '#f87171' }}>{errors.root.message}</p>
              </div>
            )}
          </form>

          {/* Login link */}
          <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: BLUE, fontWeight: 700, textDecoration: 'none' }} data-testid="login-link">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Vertical divider */}
      <div className="hidden lg:block" style={{ width: '1px', background: 'rgba(55,181,255,0.1)', flexShrink: 0 }} />

      {/* ── RIGHT — Editorial brand panel ── */}
      <div
        className="hidden lg:flex"
        style={{
          flex: '0 0 50%',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 48px',
          background: 'linear-gradient(225deg, #000c1e 0%, #062344 40%, #1e0d14 70%, #3d1a24 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Blue glow — top left */}
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(55,181,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Maroon glow — bottom right */}
        <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '440px', height: '440px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,30,48,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Centre diagonal blend */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(225deg, rgba(55,181,255,0.04) 0%, transparent 45%, rgba(80,22,36,0.08) 100%)', pointerEvents: 'none' }} />

        {/* Top — Logo */}
        <Link href="/" style={{ display: 'inline-block', alignSelf: 'flex-end' }}>
          <img src="/logo.png" alt="Smarter Goalie" style={{ height: '44px' }} />
        </Link>

        {/* Bottom — Tagline */}
        <div style={{ paddingBottom: '80px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: BLUE, textTransform: 'uppercase', marginBottom: '18px' }}>
            ——&nbsp;&nbsp;GET STARTED
          </p>
          <h2
            style={{
              fontSize: 'clamp(36px, 4.5vw, 58px)',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Your goalie journey<br />
            <span style={{ color: BLUE }}>starts today.</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
