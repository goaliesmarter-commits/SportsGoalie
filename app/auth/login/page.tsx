'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

import { useAuth } from '@/lib/auth/context';
import { loginSchema, type LoginFormData } from '@/lib/validation/auth';
import { isAuthError } from '@/lib/errors/auth-errors';

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

function VerificationMessage() {
  const searchParams = useSearchParams();
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (searchParams.get('message') === 'verify-email') setShowMessage(true);
  }, [searchParams]);

  if (!showMessage) return null;

  return (
    <div
      style={{
        marginBottom: '20px',
        borderRadius: '10px',
        border: '1px solid rgba(74,222,128,0.3)',
        background: 'rgba(74,222,128,0.08)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      }}
    >
      <CheckCircle size={16} style={{ color: '#4ade80', marginTop: '2px', flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', marginBottom: '2px' }}>
          Registration Successful!
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(74,222,128,0.75)' }}>
          We&apos;ve sent a verification email to your inbox. Please verify your email before signing in.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      await login(data);
    } catch (error) {
      setError('root', {
        message: isAuthError(error)
          ? error.userMessage
          : error instanceof Error ? error.message : 'Login failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      let destination = '/dashboard';
      if (user.role === 'admin') destination = '/admin';
      else if (user.role === 'coach') destination = '/coach';
      else if (user.role === 'parent') destination = '/parent';
      else if (user.role === 'student' && !user.onboardingCompleted) destination = '/onboarding';
      router.push(destination);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #000f28 0%, #062344 46%, #0a3159 100%)',
        }}
      >
        <Loader2 size={28} style={{ color: BLUE, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000c1e' }}>

      {/* ── LEFT — Editorial brand panel ── */}
      <div
        className="hidden lg:flex"
        style={{
          flex: '0 0 50%',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 48px',
          background: 'linear-gradient(135deg, #000c1e 0%, #062344 40%, #1e0d14 70%, #3d1a24 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Blue glow — top right */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(55,181,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Maroon glow — bottom left */}
        <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '440px', height: '440px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,30,48,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Centre diagonal blend */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(55,181,255,0.04) 0%, transparent 45%, rgba(80,22,36,0.08) 100%)', pointerEvents: 'none' }} />

        {/* Top — Logo */}
        <Link href="/" style={{ display: 'inline-block' }}>
          <img src="/logo.png" alt="Smarter Goalie" style={{ height: '44px' }} />
        </Link>

        {/* Bottom — Tagline */}
        <div style={{ paddingBottom: '80px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: BLUE, textTransform: 'uppercase', marginBottom: '18px' }}>
            ——&nbsp;&nbsp;WELCOME BACK
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
            Master the crease.<br />
            <span style={{ color: BLUE }}>Own every game.</span>
          </h2>
        </div>
      </div>

      {/* Vertical divider */}
      <div className="hidden lg:block" style={{ width: '1px', background: 'rgba(55,181,255,0.1)', flexShrink: 0 }} />

      {/* ── RIGHT — Form panel ── */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#00101f',
          padding: '48px 24px',
          overflowY: 'auto',
        }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex justify-center">
          <Link href="/">
            <img src="/logo.png" alt="Smarter Goalie" style={{ height: '40px' }} />
          </Link>
        </div>

        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Already registered?
            </p>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Sign in
            </h1>
          </div>

          <Suspense fallback={null}>
            <VerificationMessage />
          </Suspense>

          <style>{`
            .auth-input:-webkit-autofill,
            .auth-input:-webkit-autofill:hover,
            .auth-input:-webkit-autofill:focus,
            .auth-input:-webkit-autofill:active {
              -webkit-text-fill-color: #fff !important;
              -webkit-box-shadow: 0 0 0px 1000px #00101f inset !important;
              box-shadow: 0 0 0px 1000px #00101f inset !important;
              caret-color: #fff !important;
              transition: background-color 5000s ease-in-out 0s !important;
            }
          `}</style>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} data-testid="login-form">

            {/* Email */}
            <div>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
                autoComplete="email"
                data-testid="email-input"
                className="auth-input"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(55,181,255,0.2)')}
              />
              {errors.email && (
                <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }} data-testid="email-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="password" style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <Link
                  href="/auth/reset-password"
                  style={{ fontSize: '12px', color: BLUE, textDecoration: 'none', fontWeight: 600 }}
                  data-testid="forgot-password-link"
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                  autoComplete="current-password"
                  data-testid="password-input"
                  className="auth-input"
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(55,181,255,0.2)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: '12px', color: '#f87171', marginTop: '5px' }} data-testid="password-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="rememberMe"
                type="checkbox"
                {...register('rememberMe')}
                data-testid="remember-me-checkbox"
                style={{ width: '15px', height: '15px', accentColor: BLUE, cursor: 'pointer' }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>
                Remember me for 30 days
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: '8px',
                border: 'none',
                background: isLoading ? 'rgba(55,181,255,0.3)' : `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: isLoading ? 'none' : '0 4px 24px rgba(55,181,255,0.28)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing In...
                </>
              ) : 'Sign In →'}
            </button>

            {errors.root && (
              <div style={{ borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', padding: '12px 14px' }} data-testid="login-error">
                <p style={{ fontSize: '13px', color: '#f87171' }}>{errors.root.message}</p>
              </div>
            )}
          </form>

          {/* Register link */}
          <p style={{ marginTop: '28px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" style={{ color: BLUE, fontWeight: 700, textDecoration: 'none' }} data-testid="register-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
