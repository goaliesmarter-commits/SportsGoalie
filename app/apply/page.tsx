'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';

import { PublicPageNav } from '@/components/PublicPageNav';
import { useAuth } from '@/lib/auth/context';
import { isAuthError } from '@/lib/errors/auth-errors';
import {
  MAX_SIGNUP_AGE,
  MIN_SIGNUP_AGE,
  parseDateOfBirth,
  requiresParentHeldAccount,
} from '@/lib/auth/signup-policy';

/**
 * /apply — the front door.
 *
 * Michael's line for this page: "If you like what you see, do our
 * questionnaire and find out just how good a fit we are." So it is not a
 * sign-up form dressed as an application. It creates the account, and then
 * hands straight over to the questionnaire, because the questionnaire *is*
 * the application — there is no second form behind it, and the answers become
 * the baseline profile rather than being thrown away after a decision.
 *
 * The account it creates is walled: `asApplicant` sets applicationStatus to
 * 'applying', and ProtectedRoute shows the holding screen in place of every
 * guarded page until Michael approves. /onboarding is the single door left
 * open, which is why it sits outside ProtectedRoute.
 *
 * WHY THERE IS A PARENT OPTION HERE. An under-18 goalie cannot hold their own
 * login (item 6b) — register() refuses one outright. Most of Michael's market
 * is under 18, so a goalie-only front door would turn away the people it is
 * advertised to. The parent applies, does the parent questionnaire, and the
 * goalie gets their own handle inside the account once approved.
 */

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const MUTED = 'rgba(200,230,255,0.55)';
const BODY = 'rgba(200,230,255,0.84)';
const RED = '#f87171';

const CARD_BG = 'linear-gradient(135deg, #041e3a 0%, #082d52 100%)';
const CARD_BDR = '1px solid rgba(55,181,255,0.18)';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'rgba(4,20,45,0.85)',
  border: '1px solid rgba(55,181,255,0.2)',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: BLUE2,
  marginBottom: '6px',
};

/** What the applicant is told before they start, so nothing is a surprise. */
const WHAT_HAPPENS = [
  'It takes about twenty minutes. There is no shorter version and no way to skip it.',
  'Coach Mike reads every submission himself. Not a filter, not an assistant.',
  'If he says yes, you get an email inviting you to book a call with him.',
  'Your answers become your baseline. You never fill this in twice — your record starts today, not the day you pay.',
];

type Who = 'goalie' | 'parent';

const EMPTY = { displayName: '', email: '', password: '', dateOfBirth: '' };

export default function ApplyPage() {
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();

  const [who, setWho] = useState<Who>('goalie');
  const [form, setForm] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Someone already signed in has an account; sending them through /apply
  // would create a second one. Put them where they belong instead.
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.applicationStatus === 'applying') router.push('/onboarding');
    else if (user.role === 'admin') router.push('/admin');
    else if (user.role === 'coach') router.push('/coach');
    else if (user.role === 'parent') router.push('/parent');
    else router.push('/dashboard');
  }, [authLoading, user, router]);

  const [todayISO, earliestDobISO] = useMemo(() => {
    const pad = (n: number): string => String(n).padStart(2, '0');
    const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date();
    return [iso(now), iso(new Date(now.getFullYear() - MAX_SIGNUP_AGE, now.getMonth(), now.getDate()))];
  }, []);

  // Shown as they type. A half-entered date parses to null, so this does not
  // flash while the year is still being typed.
  const needsParentAccount = useMemo((): boolean => {
    if (who !== 'goalie') return false;
    const dob = parseDateOfBirth(form.dateOfBirth);
    return dob !== null && requiresParentHeldAccount(dob);
  }, [who, form.dateOfBirth]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setError('');
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function validate(): string | null {
    if (form.displayName.trim().length < 2) return 'Please enter your full name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return 'Please enter a valid email address.';
    if (form.password.length < 6) return 'Your password needs to be at least 6 characters.';
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      return 'Your password needs an uppercase letter, a lowercase letter and a number.';
    }
    if (who === 'goalie') {
      const dob = parseDateOfBirth(form.dateOfBirth);
      if (!dob) return 'Please enter your date of birth.';
      if (dob.getTime() > Date.now()) return 'Please enter a real date of birth.';
      const age = new Date().getFullYear() - dob.getFullYear();
      if (age < MIN_SIGNUP_AGE - 1 || age > MAX_SIGNUP_AGE + 1) {
        return `Please check the year — that works out to an age outside ${MIN_SIGNUP_AGE}-${MAX_SIGNUP_AGE}.`;
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // The submit button is disabled while this is true, but a keyboard submit
    // or a browser autofill can still land here, and register() would refuse
    // with a less helpful message than the notice already on screen.
    if (needsParentAccount) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName.trim(),
        role: who === 'parent' ? 'parent' : 'student',
        workflowType: 'automated',
        ...(who === 'goalie' && { dateOfBirth: form.dateOfBirth }),
        agreeToTerms: true,
        // The whole point of this page. Everything else here is an ordinary
        // sign-up; this one flag is what makes it an application.
        asApplicant: true,
      });
      router.push(who === 'parent' ? '/onboarding?role=parent' : '/onboarding');
    } catch (err) {
      setError(
        isAuthError(err) ? err.userMessage
        : err instanceof Error ? err.message
        : 'Something went wrong. Please try again.'
      );
      setSubmitting(false);
    }
  }

  const disabled = submitting || needsParentAccount;

  return (
    <div style={{ minHeight: '100vh', background: '#000f28', colorScheme: 'dark' }}>
      <PublicPageNav />

      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: 'clamp(32px, 6vw, 64px) 20px 80px' }}>

        {/* ── Hero — Michael's line, and what it actually costs them ── */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vw, 52px)' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.22em', color: BLUE, textTransform: 'uppercase', margin: '0 0 14px' }}>
            Apply to Smarter Goalie
          </p>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, letterSpacing: '-0.025em', color: '#fff', margin: '0 0 18px', lineHeight: 1.15 }}>
            If you like what you see, do our questionnaire<br />
            and find out just how good a <span style={{ color: BLUE2 }}>fit</span> we are.
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', color: BODY, lineHeight: 1.7, maxWidth: '620px', margin: '0 auto' }}>
            This is not a waiting list you join and forget. It is the same baseline every goalie
            in the system does, and it goes straight to Coach Mike.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'clamp(20px, 3vw, 32px)', alignItems: 'start' }}>

          {/* ── What happens ── */}
          <div style={{ background: CARD_BG, border: CARD_BDR, borderRadius: '16px', padding: 'clamp(24px, 4vw, 34px)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '.16em', color: BLUE2, textTransform: 'uppercase', margin: '0 0 20px' }}>
              What happens next
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {WHAT_HAPPENS.map(point => (
                <li key={point} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Check size={17} color={BLUE} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
                  <span style={{ fontSize: '14px', color: BODY, lineHeight: 1.65 }}>{point}</span>
                </li>
              ))}
            </ul>
            <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.65, margin: '22px 0 0', paddingTop: '18px', borderTop: '1px solid rgba(55,181,255,0.14)' }}>
              You will not see any of the training content while your application is open.
              That is on purpose — Coach Mike decides who comes in, and nothing opens up
              before he has.
            </p>
          </div>

          {/* ── The form ── */}
          <div style={{ background: CARD_BG, border: CARD_BDR, borderRadius: '16px', padding: 'clamp(24px, 4vw, 34px)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '.16em', color: BLUE2, textTransform: 'uppercase', margin: '0 0 6px' }}>
              Start your application
            </h2>
            <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 22px', lineHeight: 1.6 }}>
              This creates your account and takes you straight into the questionnaire.
            </p>

            <form onSubmit={handleSubmit} noValidate>

              {/* Who is applying — an under-18 goalie cannot hold their own login */}
              <div style={{ marginBottom: '18px' }}>
                <span style={labelStyle}>Who is applying?</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([['goalie', "I'm the goalie"], ['parent', "I'm a parent"]] as [Who, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setWho(value); setError(''); }}
                      style={{
                        flex: 1,
                        padding: '11px 12px',
                        borderRadius: '10px',
                        border: who === value ? `1px solid ${BLUE}` : '1px solid rgba(55,181,255,0.2)',
                        background: who === value ? 'rgba(55,181,255,0.14)' : 'rgba(4,20,45,0.85)',
                        color: who === value ? '#fff' : MUTED,
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="displayName" style={labelStyle}>Your full name</label>
                <input id="displayName" name="displayName" value={form.displayName} onChange={handleChange} style={inputStyle} autoComplete="name" required />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="email" style={labelStyle}>Email</label>
                <input id="email" name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} autoComplete="email" required />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="password" style={labelStyle}>Choose a password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: MUTED, margin: '6px 0 0' }}>
                  At least 6 characters, with an uppercase letter, a lowercase letter and a number.
                </p>
              </div>

              {who === 'goalie' && (
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="dateOfBirth" style={labelStyle}>Your date of birth</label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    min={earliestDobISO}
                    max={todayISO}
                    style={inputStyle}
                    required
                  />
                </div>
              )}

              {/* The under-18 rule, stated before they hit a wall rather than after */}
              {needsParentAccount && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(55,181,255,0.08)', border: `1px solid rgba(55,181,255,0.28)`, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                  <AlertCircle size={16} color={BLUE} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
                  <p style={{ fontSize: '13px', color: BODY, lineHeight: 1.6, margin: 0 }}>
                    Under 18, so a parent or guardian applies and holds the account.{' '}
                    <button
                      type="button"
                      onClick={() => { setWho('parent'); setError(''); }}
                      style={{ background: 'none', border: 'none', padding: 0, color: BLUE2, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', fontFamily: 'inherit' }}
                    >
                      Switch to the parent application
                    </button>
                    {' '}— your goalie gets his own login inside it once you are in.
                  </p>
                </div>
              )}

              {error && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(248,113,113,0.08)', border: `1px solid rgba(248,113,113,0.3)`, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                  <AlertCircle size={16} color={RED} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
                  <p style={{ fontSize: '13px', color: BODY, lineHeight: 1.6, margin: 0 }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={disabled}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '9px',
                  background: disabled ? 'rgba(55,181,255,0.25)' : `linear-gradient(135deg, ${BLUE}, #0ea5e9)`,
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 22px',
                  color: disabled ? 'rgba(255,255,255,0.5)' : '#001426',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {submitting ? 'Creating your account…' : 'Start the questionnaire'}
              </button>

              <p style={{ fontSize: '12px', color: MUTED, textAlign: 'center', margin: '16px 0 0', lineHeight: 1.6 }}>
                Already applied?{' '}
                <Link href="/auth/login" style={{ color: BLUE2, fontWeight: 700 }}>Sign in</Link>{' '}
                to pick up where you left off.
              </p>
              <p style={{ fontSize: '11px', color: MUTED, textAlign: 'center', margin: '10px 0 0', lineHeight: 1.6 }}>
                By applying you agree to our{' '}
                <Link href="/terms" style={{ color: BODY, textDecoration: 'underline' }}>Terms</Link> and{' '}
                <Link href="/privacy" style={{ color: BODY, textDecoration: 'underline' }}>Privacy Policy</Link>.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
