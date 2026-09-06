'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, ChevronLeft, Copy, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';

import { useAuth } from '@/lib/auth/context';
import { auth } from '@/lib/firebase/config';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import {
  MAX_SIGNUP_AGE,
  PARENT_HELD_ACCOUNT_AGE,
  calculateAge,
  parseDateOfBirth,
} from '@/lib/auth/signup-policy';
import {
  createChildAccountFormSchema,
  type CreateChildAccountFormData,
} from '@/lib/validation/child-account';

/**
 * A parent creates a goalie account they hold (Michael's item 6c).
 *
 * The shape of this page follows his model rather than the usual sign-up form:
 * the parent is not making an account for themselves, they are making one for
 * somebody else and standing behind it. So the consent is not a tickbox
 * squeezed under the submit button — it says who is agreeing, on whose behalf,
 * and to what.
 *
 * The last screen is the one that matters in practice. It hands over the
 * goalie's login, because for a goalie signing in with a username there is no
 * email to send it to. Losing that screen means resetting the password.
 */

const BLUE = '#37b5ff';
const cardBg = 'rgba(2,18,44,0.82)';
const border = '1px solid rgba(55,181,255,0.18)';

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
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  color: 'rgba(255,255,255,0.65)',
  display: 'block',
  marginBottom: '6px',
};

const errorStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#f87171',
  marginTop: '5px',
};

interface CreatedGoalie {
  id: string;
  displayName: string;
  studentNumber: string;
  loginEmail: string;
  loginHandle: string | null;
}

export default function AddGoaliePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedGoalie | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateChildAccountFormData>({
    resolver: zodResolver(createChildAccountFormSchema),
    defaultValues: {
      relationship: 'parent',
      loginMethod: 'email',
      consentAccepted: false,
      displayName: '',
      dateOfBirth: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const loginMethod = watch('loginMethod');
  const dateOfBirthValue = watch('dateOfBirth');

  const [todayISO, earliestDobISO] = useMemo(() => {
    const pad = (n: number): string => String(n).padStart(2, '0');
    const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date();
    const earliest = new Date(now.getFullYear() - MAX_SIGNUP_AGE, now.getMonth(), now.getDate());
    return [iso(now), iso(earliest)];
  }, []);

  /**
   * Whether the date entered belongs to someone old enough to hold their own
   * account. Shown while they type rather than after they submit — the schema
   * refuses it either way, but being told before filling in a password is
   * better than being told after.
   */
  const tooOldForParentAccount = useMemo((): boolean => {
    const dob = parseDateOfBirth(dateOfBirthValue);
    return dob !== null && calculateAge(dob) >= PARENT_HELD_ACCOUNT_AGE;
  }, [dateOfBirthValue]);

  const onSubmit = async (data: CreateChildAccountFormData) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setFormError('Your session has expired. Please sign in again.');
        return;
      }

      const response = await fetch('/api/parent/goalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          displayName: data.displayName,
          dateOfBirth: data.dateOfBirth,
          relationship: data.relationship,
          loginMethod: data.loginMethod,
          email: data.loginMethod === 'email' ? data.email : undefined,
          password: data.password,
          consentAccepted: data.consentAccepted,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        setFormError(result.error ?? 'Could not create the account. Please try again.');
        return;
      }

      setCreated(result.goalie as CreatedGoalie);
    } catch {
      setFormError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLogin = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused. The value is on screen either way.
    }
  };

  if (authLoading) return <SkeletonDarkPage />;

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  if (user.role !== 'parent') {
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            gap: '12px',
          }}
        >
          <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ color: '#f87171', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
              Access denied
            </p>
            <p style={{ color: 'rgba(248,113,113,0.7)', fontSize: '13px' }}>
              This page is only available for parent accounts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── The handover screen ────────────────────────────────────────────────────
  if (created) {
    const loginValue = created.loginHandle ?? created.loginEmail;
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ background: cardBg, border, borderRadius: '20px', padding: '28px' }} data-testid="goalie-created">
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Check size={24} color="#34d399" />
          </div>
          <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>
            {created.displayName}&apos;s account is ready
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
            The account is yours — the progress, the charting and the analytics all come to you.
            The login below is theirs.
          </p>

          <div
            style={{
              background: 'rgba(55,181,255,0.06)',
              border: '1px solid rgba(55,181,255,0.22)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <p style={{ ...labelStyle, marginBottom: '8px' }}>
              {created.loginHandle ? 'GOALIE USERNAME' : 'GOALIE EMAIL'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <code
                data-testid="goalie-login"
                style={{
                  color: '#fff',
                  fontSize: '17px',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  wordBreak: 'break-all',
                }}
              >
                {loginValue}
              </code>
              <button
                type="button"
                onClick={() => void copyLogin(loginValue)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: `1px solid ${BLUE}`,
                  color: BLUE,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '10px', lineHeight: 1.6 }}>
              They sign in at the usual login page with this and the password you just chose.
            </p>
          </div>

          {created.loginHandle && (
            <div
              style={{
                background: 'rgba(251,191,36,0.07)',
                border: '1px solid rgba(251,191,36,0.28)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px',
              }}
            >
              <p style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
                Write the password down
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
                A username login has no email address behind it, so we cannot send a reset link.
                If the password is forgotten, you set a new one from the goalie&apos;s page.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/parent/goalies" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  padding: '11px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
                  color: '#000f28',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Go to My Goalies
              </button>
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setCopied(false);
                window.location.reload();
              }}
              style={{
                padding: '11px 20px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Add another goalie
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── The form ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .ag-back:hover { color: ${BLUE} !important; background: rgba(55,181,255,0.08) !important; }
        .ag-input:focus { border-color: ${BLUE} !important; }
      `}</style>
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Link
          href="/parent/goalies"
          className="ag-back"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            padding: '6px 10px',
            width: 'fit-content',
          }}
        >
          <ChevronLeft size={16} /> Back
        </Link>

        <div style={{ position: 'relative', background: cardBg, border, borderRadius: '20px', padding: '28px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${BLUE}22 0%, rgba(14,165,233,0.15) 100%)`,
                border: '1px solid rgba(55,181,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UserPlus size={22} color={BLUE} />
            </div>
            <div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>Add a Goalie</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>
                For a goalie under {PARENT_HELD_ACCOUNT_AGE}, whose account you hold
              </p>
            </div>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.65, margin: '14px 0 24px' }}>
            You create and hold the account. Your goalie gets their own login inside it, and does
            their own work — the progress and the analytics come to you.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} data-testid="add-goalie-form">

            {/* Name */}
            <div>
              <label htmlFor="displayName" style={labelStyle}>Goalie&apos;s name</label>
              <input
                id="displayName"
                type="text"
                placeholder="First and last name"
                className="ag-input"
                style={inputStyle}
                data-testid="goalie-name-input"
                {...register('displayName')}
              />
              {errors.displayName && <p style={errorStyle}>{errors.displayName.message}</p>}
            </div>

            {/* Date of birth */}
            <div>
              <label htmlFor="dateOfBirth" style={labelStyle}>Date of birth</label>
              <input
                id="dateOfBirth"
                type="date"
                max={todayISO}
                min={earliestDobISO}
                className="ag-input"
                style={{ ...inputStyle, colorScheme: 'dark' }}
                data-testid="goalie-dob-input"
                {...register('dateOfBirth')}
              />
              {errors.dateOfBirth && <p style={errorStyle}>{errors.dateOfBirth.message}</p>}
              {tooOldForParentAccount && !errors.dateOfBirth && (
                <p style={{ ...errorStyle, color: '#fbbf24' }} data-testid="too-old-notice">
                  At {PARENT_HELD_ACCOUNT_AGE} and over the goalie sets up their own account.
                </p>
              )}
            </div>

            {/* Relationship */}
            <div>
              <label htmlFor="relationship" style={labelStyle}>Your relationship to them</label>
              <select
                id="relationship"
                className="ag-input"
                style={inputStyle}
                data-testid="relationship-select"
                {...register('relationship')}
              >
                <option value="parent" style={{ background: '#001628', color: '#fff' }}>Parent</option>
                <option value="guardian" style={{ background: '#001628', color: '#fff' }}>Guardian</option>
                <option value="other" style={{ background: '#001628', color: '#fff' }}>Other</option>
              </select>
              {errors.relationship && <p style={errorStyle}>{errors.relationship.message}</p>}
            </div>

            {/* How they sign in */}
            <div>
              <label style={labelStyle}>How your goalie signs in</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: loginMethod === 'email' ? 'rgba(55,181,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: loginMethod === 'email' ? `1px solid ${BLUE}` : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                  }}
                >
                  <input type="radio" value="email" {...register('loginMethod')} style={{ marginTop: '3px', accentColor: BLUE }} data-testid="login-method-email" />
                  <span>
                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, display: 'block' }}>
                      They have their own email
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
                      They sign in with it, and can reset their own password.
                    </span>
                  </span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: loginMethod === 'handle' ? 'rgba(55,181,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: loginMethod === 'handle' ? `1px solid ${BLUE}` : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                  }}
                >
                  <input type="radio" value="handle" {...register('loginMethod')} style={{ marginTop: '3px', accentColor: BLUE }} data-testid="login-method-handle" />
                  <span>
                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, display: 'block' }}>
                      They don&apos;t have an email
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
                      We give them a short username instead. You handle password resets.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Their email — only when that is how they sign in */}
            {loginMethod === 'email' && (
              <div>
                <label htmlFor="email" style={labelStyle}>Goalie&apos;s email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="goalie@email.com"
                  className="ag-input"
                  style={inputStyle}
                  data-testid="goalie-email-input"
                  {...register('email')}
                />
                {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '6px', lineHeight: 1.5 }}>
                  Must be different from your own — it is their login, not yours.
                </p>
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" style={labelStyle}>Password for your goalie</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="ag-input"
                  style={{ ...inputStyle, paddingRight: '42px' }}
                  data-testid="goalie-password-input"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" style={labelStyle}>Confirm password</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="ag-input"
                style={inputStyle}
                data-testid="goalie-confirm-password-input"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword.message}</p>}
            </div>

            {/* Consent. Not a tickbox under the button — it is the reason the
                account is allowed to exist, so it says what is being agreed. */}
            <div
              style={{
                background: 'rgba(55,181,255,0.05)',
                border: '1px solid rgba(55,181,255,0.2)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <p style={{ color: BLUE, fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '10px' }}>
                YOUR CONSENT
              </p>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: '3px', width: '15px', height: '15px', accentColor: BLUE, flexShrink: 0 }}
                  data-testid="consent-checkbox"
                  {...register('consentAccepted')}
                />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12.5px', lineHeight: 1.65 }}>
                  I am this goalie&apos;s parent or guardian. I am creating and holding this account
                  on their behalf, and I agree to the{' '}
                  <Link href="/terms" target="_blank" style={{ color: BLUE, textDecoration: 'underline' }}>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" style={{ color: BLUE, textDecoration: 'underline' }}>
                    Privacy Policy
                  </Link>{' '}
                  for them as well as for myself.
                </span>
              </label>
              {errors.consentAccepted && <p style={errorStyle}>{errors.consentAccepted.message}</p>}
            </div>

            {formError && (
              <div
                style={{
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  gap: '10px',
                }}
                data-testid="add-goalie-error"
              >
                <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ color: '#f87171', fontSize: '12.5px', lineHeight: 1.55, margin: 0 }}>{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid="add-goalie-submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '13px 20px',
                borderRadius: '10px',
                border: 'none',
                background: submitting ? 'rgba(55,181,255,0.3)' : `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
                color: submitting ? 'rgba(255,255,255,0.6)' : '#000f28',
                fontSize: '14px',
                fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 4px 24px rgba(55,181,255,0.28)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Creating account...
                </>
              ) : (
                'Create their account'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
