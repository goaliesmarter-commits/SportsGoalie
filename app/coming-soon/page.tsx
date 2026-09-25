import type { Metadata } from 'next';

/**
 * The holding page shown while the site is closed for the October soft launch.
 *
 * Every gated request is rewritten here by preLaunchGate() in proxy.ts, so this
 * page is rendered under whatever URL the visitor typed. It carries no links
 * into the app and no login form on purpose: the preview link is the only door,
 * and a sign-in box on a closed site invites people to rattle the handle.
 */
export const metadata: Metadata = {
  title: 'Smarter Goalie — Opening Soon',
  description: 'Smarter Goalie Educational Systems opens to members in October 2026.',
  robots: { index: false, follow: false },
};

const PILLARS = [
  'MindSet',
  'Skating Tech',
  '7AMS',
  '6Z-7PS',
  'Form Tech',
  'Game Charting',
  'Practice System',
  'Lifestyle & Hockey',
];

export default function ComingSoonPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(120% 100% at 50% 0%, #0b1030 0%, #06050f 55%, #000 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '620px', width: '100%' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(0,255,255,0.25)',
            background: 'rgba(0,255,255,0.06)',
            fontSize: '12px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#7fffff',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00FFFF, #00FF99)',
              boxShadow: '0 0 10px rgba(0,255,255,0.7)',
            }}
          />
          Opening October 2026
        </div>

        <h1
          style={{
            marginTop: '28px',
            fontSize: 'clamp(30px, 7vw, 50px)',
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          SMARTER GOALIE
          <span style={{ display: 'block', fontSize: 'clamp(13px, 2.6vw, 17px)', fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', marginTop: '14px' }}>
            EDUCATIONAL SYSTEMS
          </span>
        </h1>

        <p style={{ marginTop: '26px', fontSize: 'clamp(15px, 2.4vw, 18px)', lineHeight: 1.65, color: 'rgba(255,255,255,0.72)' }}>
          We are closed to the public while the system is prepared for its soft
          launch. Think Smart — Play Smarter.
        </p>

        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '34px 0 0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
          }}
        >
          {PILLARS.map((pillar, index) => (
            <li
              key={pillar}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              <span style={{ color: '#00FF99', marginRight: '6px' }}>{index + 1}</span>
              {pillar}
            </li>
          ))}
        </ul>

        <p style={{ marginTop: '40px', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
          Enquiries:{' '}
          <a href="mailto:goaliesmarter@gmail.com" style={{ color: '#00FFFF', textDecoration: 'none' }}>
            goaliesmarter@gmail.com
          </a>
        </p>

        <p style={{ marginTop: '14px', fontSize: '12px', color: 'rgba(255,255,255,0.32)' }}>
          Reviewing with the team? Open your preview link once and this device stays in.
        </p>
      </div>
    </main>
  );
}
