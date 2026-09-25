'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { AlertCircle, Check, Copy, KeyRound, Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/auth/context';
import { auth, db } from '@/lib/firebase/config';

/**
 * The login details of a goalie whose account this parent holds, and the one
 * control that goes with holding it: setting a new password.
 *
 * Renders nothing at all unless the viewer is this goalie's `accountHolderId`.
 * Being *linked* to a goalie is not enough — a goalie who signed themselves up
 * and later shared a link code still owns their own password, and a link must
 * never become a way to take an account over. The API route enforces the same
 * rule; this only decides whether to show the door.
 *
 * It exists because of the trade made in `child-account.ts`: a goalie signing
 * in with a username has no email address behind them, so there is no reset
 * link to send. Without this, one forgotten password ends the account.
 */

const BLUE = '#37b5ff';

interface GoalieLoginCardProps {
  childId: string;
  childName: string;
}

interface HeldAccount {
  loginEmail: string;
  loginHandle: string | null;
}

export function GoalieLoginCard({ childId, childName }: GoalieLoginCardProps) {
  const { user } = useAuth();

  const [held, setHeld] = useState<HeldAccount | null>(null);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) return;
      try {
        const snapshot = await getDoc(doc(db, 'users', childId));
        const data = snapshot.data();
        if (cancelled) return;
        if (data && data.accountHolderId === user.id) {
          setHeld({
            loginEmail: typeof data.email === 'string' ? data.email : '',
            loginHandle: typeof data.loginHandle === 'string' ? data.loginHandle : null,
          });
        }
      } catch {
        // A goalie this parent only links to is unreadable here for the same
        // reason it is uneditable. Showing nothing is the right outcome.
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [childId, user]);

  if (checking || !held) return null;

  const loginValue = held.loginHandle ?? held.loginEmail;

  const copyLogin = async () => {
    try {
      await navigator.clipboard.writeText(loginValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused. The value is on screen either way.
    }
  };

  const submit = async () => {
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError('Your session has expired. Please sign in again.');
        return;
      }

      const response = await fetch(`/api/parent/goalies/${childId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error ?? 'Could not update the password. Please try again.');
        return;
      }

      setSaved(true);
      setPassword('');
      setConfirmPassword('');
      setOpen(false);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 13px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(55,181,255,0.18)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      data-testid="goalie-login-card"
      style={{
        background: 'rgba(2,18,44,0.82)',
        border: '1px solid rgba(55,181,255,0.18)',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '6px' }}>
        <KeyRound size={15} color={BLUE} />
        <p style={{ color: BLUE, fontWeight: 700, fontSize: '13px', margin: 0 }}>
          {childName}&apos;s login
        </p>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: 1.6, margin: '0 0 14px' }}>
        You hold this account, so the password is yours to reset.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <code style={{ color: '#fff', fontSize: '14px', fontWeight: 700, wordBreak: 'break-all' }}>
          {loginValue}
        </code>
        <button
          type="button"
          onClick={() => void copyLogin()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'transparent',
            border: `1px solid ${BLUE}`,
            color: BLUE,
            borderRadius: '6px',
            padding: '4px 9px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {held.loginHandle && (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11.5px', lineHeight: 1.6, margin: '0 0 14px' }}>
          This is a username login, so there is no email address to send a reset link to.
        </p>
      )}

      {saved && (
        <p style={{ color: '#34d399', fontSize: '12px', fontWeight: 700, margin: '0 0 12px' }} data-testid="password-saved">
          Password updated. Tell {childName} their new password.
        </p>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="open-password-reset"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.65)',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Set a new password
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            style={inputStyle}
            data-testid="new-password-input"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            style={inputStyle}
            data-testid="confirm-password-input"
          />

          {error && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }} data-testid="password-error">
              <AlertCircle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ color: '#f87171', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              data-testid="save-password"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                background: saving ? 'rgba(55,181,255,0.3)' : `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
                border: 'none',
                color: saving ? 'rgba(255,255,255,0.6)' : '#000f28',
                borderRadius: '8px',
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
              {saving ? 'Saving...' : 'Save password'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
                setPassword('');
                setConfirmPassword('');
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.45)',
                borderRadius: '8px',
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
