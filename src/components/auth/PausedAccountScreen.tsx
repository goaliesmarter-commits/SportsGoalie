'use client';

import { PauseCircle, LogOut, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const MUTED = 'rgba(200,230,255,0.55)';
const BODY = 'rgba(200,230,255,0.84)';
const CARD_BG = 'linear-gradient(135deg, #041e3a 0%, #082d52 100%)';

/**
 * Shown in place of the app to a member whose account an admin has paused.
 * The account and all its data are intact — this screen only closes the door
 * until the pause switch is flipped back. Rendered by ProtectedRoute, so it
 * covers every guarded page without each page knowing pause exists.
 */
export function PausedAccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#000f28',
        colorScheme: 'dark',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <style>{`
        .paused-btn { transition: all .2s; }
        .paused-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .paused-mail:hover { color: ${BLUE2} !important; }
      `}</style>
      <div
        style={{
          position: 'relative',
          background: CARD_BG,
          border: '1px solid rgba(55,181,255,0.22)',
          borderRadius: '18px',
          padding: 'clamp(32px, 6vw, 52px) clamp(20px, 5vw, 44px)',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${BLUE}, ${BLUE2}88, transparent)` }} />

        <PauseCircle size={48} color={BLUE} style={{ marginBottom: '18px' }} aria-hidden="true" />

        <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 12px' }}>
          Your account is <span style={{ color: BLUE2 }}>paused</span>.
        </h1>

        <p style={{ fontSize: 'clamp(14px, 1.8vw, 15px)', color: BODY, lineHeight: 1.75, margin: '0 0 10px' }}>
          {user?.displayName ? `${user.displayName}, your` : 'Your'} membership is on hold right now.
          Nothing has been lost — your profile, your progress, and every chart and
          reflection are kept exactly as you left them.
        </p>
        <p style={{ fontSize: 'clamp(14px, 1.8vw, 15px)', color: MUTED, lineHeight: 1.75, margin: '0 0 26px' }}>
          When your account is switched back on, you&apos;ll pick up right where you left off.
          If you think this is a mistake, or you&apos;re ready to come back, get in touch.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="mailto:info@smartergoalie.com"
            className="paused-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${BLUE}, #0ea5e9)`, borderRadius: '10px', padding: '11px 22px', color: '#001426', fontSize: '13px', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', textDecoration: 'none', boxShadow: '0 6px 22px rgba(55,181,255,0.3)' }}
          >
            <Mail size={15} aria-hidden="true" /> Contact Us
          </a>
          <button
            onClick={handleLogout}
            className="paused-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(200,230,255,0.25)', borderRadius: '10px', padding: '11px 22px', color: BODY, fontSize: '13px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            <LogOut size={15} aria-hidden="true" /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
