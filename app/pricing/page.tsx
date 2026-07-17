'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Menu, X } from 'lucide-react';

const BLUE = '#37b5ff';
const BLUE2 = '#60a5fa';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-5">
      <div style={{ width: '32px', height: '1.5px', background: BLUE, opacity: 0.5 }} />
      <p style={{ fontSize: '10px', letterSpacing: '4px', color: BLUE, fontWeight: 700, textTransform: 'uppercase' }}>
        {children}
      </p>
      <div style={{ width: '32px', height: '1.5px', background: BLUE, opacity: 0.5 }} />
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const plans = [
    {
      name: '1 Pillar',
      description: 'Focused training for one skill pillar.',
      upfront: '$95',
      monthly: '$15',
      highlight: false,
      features: [
        '1 skill pillar access',
        'Video lessons + quizzes',
        'Progress tracking dashboard',
        'Parent access included',
      ],
    },
    {
      name: '3+ Pillars',
      description: 'Balanced plan for multi-skill growth.',
      upfront: '$150',
      monthly: '$15',
      highlight: true,
      features: [
        '3+ skill pillars access',
        'Advanced quizzes + analytics',
        'Session charting system',
        'Coach feedback tools',
        'Weekly progress reports',
      ],
    },
    {
      name: 'All 7 Pillars',
      description: 'Full platform access for complete development.',
      upfront: '$225',
      monthly: '$15',
      highlight: false,
      features: [
        'All 7 pillars unlocked',
        'Full lesson + quiz library',
        'Advanced charting + analytics',
        'Priority support + feedback',
      ],
    },
  ];

  const comparisonRows = [
    { offer: 'Video Review - 1 Hour',         founding: '$35 (50% off)',                       postFounding: '$70' },
    { offer: 'Video Review - 3 Hours',         founding: '$105 (50% off)',                      postFounding: '$210' },
    { offer: 'Goalie Subscription',            founding: 'Join now and lock your active rate',  postFounding: '$15/mo' },
    { offer: 'Team Subscription',              founding: 'Founding access + lock-in option',    postFounding: '$20/mo' },
    { offer: 'Organization Subscription',      founding: 'Founding access + lock-in option',    postFounding: '$100/mo' },
    { offer: 'Federation Subscription',        founding: 'Founding access + lock-in option',    postFounding: '$200/mo' },
    { offer: 'Full Platform Launch Pricing',   founding: 'Enter before launch to secure founding terms', postFounding: '$1,500 one-time + $20–$35/mo' },
  ];

  const faqs = [
    {
      q: 'What does "founding member" mean?',
      a: 'Founding members join during our early-access period and lock in the lowest prices ever offered permanently. When the full platform launches, standard pricing will be significantly higher.',
    },
    {
      q: 'What is the 30-day guarantee?',
      a: 'Your upfront payment is held for 30 days. Cancel in weeks 1–2 for a full refund. Sign the early waiver for immediate payment release. On day 30, the payment is released and your access continues.',
    },
    {
      q: 'Can I upgrade from 1 Pillar to more later?',
      a: 'Yes. You can upgrade your pillar access at any time by paying the difference at founding rates, as long as the founding period is still open.',
    },
    {
      q: 'What is a Skill Pillar?',
      a: 'Our 7 Pillars are Mind-Set, Skating Tech, Seven Angle-Mark System, 6ZS (6 Zone System), Form Tech, Game/Practice Performance Charting, and Decision-Making. Each pillar is a complete learning module.',
    },
    {
      q: 'Do parents get access with any plan?',
      a: "Yes. All plans include parent access so guardians can monitor progress, view reports, and stay connected to their child's development.",
    },
    {
      q: 'Is there team pricing?',
      a: 'Teams are $20/mo, organizations $100/mo, and federations $200/mo post-founding. Contact us for custom team packages during the founding period.',
    },
  ];

  const cardBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(55,181,255,0.18)',
    borderRadius: '20px',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
  };

  const cardHighlight: React.CSSProperties = {
    ...cardBase,
    background: 'rgba(55,181,255,0.08)',
    border: `1.5px solid ${BLUE}`,
    boxShadow: `0 0 40px rgba(55,181,255,0.12)`,
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(145deg, #000f28 0%, #062344 46%, #0a3159 100%)' }}
    >
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-slate-100/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { router.push('/'); setMobileNavOpen(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Go to home"
          >
            <img src="/logo.png" alt="Smarter Goalie" className="h-10 w-auto object-contain" />
          </button>
          <div className="hidden md:flex items-center gap-7">
            <button onClick={() => router.push('/')} className="text-slate-800 hover:text-slate-900 text-[15px] font-medium tracking-wide">
              Home
            </button>
            <button onClick={() => router.push('/explain')} className="text-slate-800 hover:text-slate-900 text-[15px] font-medium tracking-wide">
              How It Works
            </button>
            <button onClick={() => router.push('/auth/login')} className="text-white px-4 py-2 rounded-md text-[15px] font-medium tracking-wide transition-colors duration-300" style={{ background: BLUE }}>
              Login
            </button>
          </div>
          {/* Mobile: Login + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button onClick={() => router.push('/auth/login')} className="text-white text-[13px] font-semibold rounded-md px-3 py-2" style={{ background: BLUE, border: 'none', cursor: 'pointer' }}>
              Login
            </button>
            <button
              onClick={() => setMobileNavOpen(o => !o)}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', color: '#1e293b', minWidth: '40px', minHeight: '40px' }}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {mobileNavOpen && (
          <div style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '4px 20px 16px' }}>
            {[
              { label: 'Home', action: () => { router.push('/'); setMobileNavOpen(false); } },
              { label: 'How It Works', action: () => { router.push('/explain'); setMobileNavOpen(false); } },
              { label: 'Contact', action: () => { router.push('/contact'); setMobileNavOpen(false); } },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#1e293b', padding: '15px 0' }}
              >{label}</button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="text-center px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
        <SectionLabel>Founding Member Rates — Live Now</SectionLabel>

        <h1
          className="font-black uppercase mx-auto"
          style={{
            fontSize: 'clamp(28px, 5vw, 64px)',
            lineHeight: 1.05,
            color: '#ffffff',
            maxWidth: '860px',
            letterSpacing: '-0.02em',
          }}
        >
          INVEST IN{' '}
          <span style={{ color: BLUE }}>YOUR GAME</span>
        </h1>

        <p
          className="mt-5 mx-auto"
          style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', maxWidth: '520px', lineHeight: 1.7 }}
        >
          Lock in founding member rates before the full platform launch. Choose your pillar path and pay upfront once to unlock your pillars.
        </p>

        <div
          className="flex flex-wrap justify-center items-center gap-3 mt-8"
          style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: '0.5px' }}
        >
          <span>From $95 upfront</span>
          <span style={{ color: 'rgba(55,181,255,0.4)' }}>|</span>
          <span>Only $15/month</span>
          <span style={{ color: 'rgba(55,181,255,0.4)' }}>|</span>
          <span>30-day guarantee</span>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.name}
                style={plan.highlight ? cardHighlight : cardBase}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(-6px)';
                  el.style.boxShadow = `0 24px 48px rgba(55,181,255,0.15), 0 0 0 1.5px ${BLUE}55`;
                  el.style.borderColor = BLUE;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = plan.highlight ? `0 0 40px rgba(55,181,255,0.12)` : 'none';
                  el.style.borderColor = plan.highlight ? BLUE : 'rgba(55,181,255,0.18)';
                }}
              >
                {/* Tag */}
                {plan.highlight && (
                  <div
                    className="text-center mb-5"
                    style={{
                      background: BLUE,
                      color: '#000f28',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      padding: '5px 14px',
                      borderRadius: '20px',
                      alignSelf: 'flex-start',
                    }}
                  >
                    Most Popular
                  </div>
                )}

                {/* Plan name */}
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '2.5px',
                    textTransform: 'uppercase',
                    color: BLUE,
                    marginBottom: '10px',
                  }}
                >
                  {plan.name}
                </p>

                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', lineHeight: 1.6 }}>
                  {plan.description}
                </p>

                {/* Price */}
                <div style={{ marginBottom: '28px' }}>
                  <span style={{ fontSize: '52px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                    {plan.upfront}
                  </span>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                    One-time + {plan.monthly}/mo
                  </p>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(55,181,255,0.15)', marginBottom: '24px' }} />

                {/* Features */}
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Check size={14} style={{ color: BLUE, flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => router.push('/auth/register')}
                  style={{
                    marginTop: '28px',
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: '10px',
                    border: plan.highlight ? 'none' : `1px solid ${BLUE}55`,
                    background: plan.highlight
                      ? `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`
                      : 'rgba(55,181,255,0.08)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'filter 0.2s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)')}
                >
                  Book a Demo →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Founding Plans</SectionLabel>
            <h2
              className="font-black uppercase mx-auto"
              style={{ fontSize: 'clamp(20px, 3.5vw, 40px)', color: '#fff', letterSpacing: '-0.02em', maxWidth: '600px' }}
            >
              FOUNDING VS{' '}
              <span style={{ color: BLUE }}>POST-FOUNDING</span>
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>
              A side-by-side view of what you get by joining now vs. standard pricing after the founding period.
            </p>
          </div>

          <div
            style={{
              borderRadius: '16px',
              border: '1.5px solid rgba(55,181,255,0.35)',
              overflow: 'hidden',
              background: 'rgba(2, 18, 44, 0.85)',
              boxShadow: '0 0 60px rgba(55,181,255,0.08), 0 8px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'rgba(55,181,255,0.18)', borderBottom: '1.5px solid rgba(55,181,255,0.35)' }}>
                    {['Offer', 'Founding Member', 'Post-Founding'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '18px 28px',
                          textAlign: 'left',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '2.5px',
                          textTransform: 'uppercase',
                          color: BLUE,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr
                      key={row.offer}
                      style={{
                        borderBottom: i < comparisonRows.length - 1 ? '1px solid rgba(55,181,255,0.1)' : 'none',
                        background: i % 2 === 0 ? 'rgba(55,181,255,0.05)' : 'rgba(255,255,255,0.025)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(55,181,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          i % 2 === 0 ? 'rgba(55,181,255,0.05)' : 'rgba(255,255,255,0.025)';
                      }}
                    >
                      <td style={{ padding: '18px 28px', fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>
                        {row.offer}
                      </td>
                      <td style={{ padding: '18px 28px', fontSize: '13.5px', color: BLUE2, fontWeight: 600 }}>
                        {row.founding}
                      </td>
                      <td style={{ padding: '18px 28px', fontSize: '13.5px', color: 'rgba(255,255,255,0.55)' }}>
                        {row.postFounding}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Got Questions</SectionLabel>
            <h2
              className="font-black uppercase"
              style={{ fontSize: 'clamp(20px, 3.5vw, 40px)', color: '#fff', letterSpacing: '-0.02em' }}
            >
              FREQUENTLY ASKED{' '}
              <span style={{ color: BLUE }}>QUESTIONS</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {faqs.map((item, i) => {
              const isOpen = openFaqIndex === i;
              return (
                <div
                  key={item.q}
                  style={{
                    background: isOpen ? 'rgba(4, 28, 64, 0.95)' : 'rgba(2, 18, 44, 0.8)',
                    border: `1.5px solid ${isOpen ? 'rgba(55,181,255,0.5)' : 'rgba(55,181,255,0.18)'}`,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s ease, background 0.2s ease',
                    boxShadow: isOpen ? '0 4px 32px rgba(55,181,255,0.1)' : '0 2px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      padding: '20px 24px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 700, color: isOpen ? '#fff' : 'rgba(255,255,255,0.88)', lineHeight: 1.5 }}>
                      {item.q}
                    </span>
                    <span
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background: isOpen ? BLUE : 'rgba(55,181,255,0.15)',
                        border: `1px solid ${isOpen ? 'transparent' : 'rgba(55,181,255,0.3)'}`,
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                    >
                      <ChevronDown
                        size={16}
                        color={isOpen ? '#000f28' : BLUE}
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}
                      />
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 24px 22px', borderTop: '1px solid rgba(55,181,255,0.15)' }}>
                      <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, paddingTop: '16px' }}>
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 sm:px-6 pb-20 pt-4">
        <div
          className="max-w-3xl mx-auto text-center"
          style={{
            background: 'linear-gradient(160deg, rgba(4, 28, 64, 0.97) 0%, rgba(2, 18, 44, 0.95) 100%)',
            border: '1.5px solid rgba(55,181,255,0.4)',
            borderRadius: '24px',
            padding: 'clamp(40px, 6vw, 72px) clamp(24px, 6vw, 64px)',
            boxShadow: '0 0 80px rgba(55,181,255,0.1), 0 16px 60px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* top glow accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60%',
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)`,
            }}
          />
          <SectionLabel>Limited Founding Spots</SectionLabel>

          <h3
            className="font-black uppercase"
            style={{ fontSize: 'clamp(22px, 4vw, 48px)', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            LOCK IN YOUR{' '}
            <span style={{ color: BLUE }}>RATE TODAY</span>
          </h3>

          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              marginTop: '16px',
              marginBottom: '36px',
              lineHeight: 1.7,
              maxWidth: '480px',
              margin: '16px auto 36px',
            }}
          >
            Join now and permanently secure founding member pricing before the platform goes live at full price.
          </p>

          <button
            onClick={() => router.push('/auth/register')}
            style={{
              background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
              color: '#fff',
              padding: '16px 48px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(55,181,255,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 12px 40px rgba(55,181,255,0.45)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = '0 8px 32px rgba(55,181,255,0.3)';
            }}
          >
            Claim Founding Rate →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="text-center px-4 pb-10 flex-shrink-0">
        <p style={{ fontSize: '9px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>
          EVERY GOAL STARTS WITH THE RIGHT FOUNDATION — SMARTER GOALIE
        </p>
      </div>
    </div>
  );
}
