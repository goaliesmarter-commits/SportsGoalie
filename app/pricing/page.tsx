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

  /**
   * Every price and promise on this page comes from Michael's founding-member
   * email of 2 September 2026 — the same text the sign-up at /founding sends to
   * the buyer. The two must never disagree: a visitor reads this page, signs up,
   * and receives that email minutes later.
   *
   * Nothing goes on this page that he has not put in writing. The per-pillar
   * packages he described on 2 September ("one pillar, three, or all of them")
   * are deliberately absent — he has not given prices for them.
   */
  const foundingTerms = [
    { label: '$300, one time', detail: 'A registration fee, not a monthly plan — and it is yours for life.' },
    { label: 'Your first month is free', detail: 'Nothing at all is charged in your first month.' },
    { label: 'Then $15 a month', detail: 'That is your founding rate, and it holds for two years.' },
    { label: 'After two years, $20 a month', detail: 'That is the rate for life, and the only increase there will ever be.' },
    { label: 'Switch it off whenever you like', detail: 'Take the summer off, pay nothing, switch back on for pre-season. Your record is exactly where you left it.' },
    { label: '30 days, no questions, your money back', detail: 'If it is not what was described, you get your money back, no argument.' },
  ];

  const rateTimeline = [
    { when: 'When you join',        pay: '$300 one time — a registration fee, yours for life' },
    { when: 'Your first month',     pay: 'Free' },
    { when: 'Months 2 to 24',       pay: '$15 a month — your founding rate' },
    { when: 'After two years',      pay: '$20 a month, for life — the only increase there will ever be' },
    { when: 'Any month you pause',  pay: 'Nothing. Your record waits exactly where you left it.' },
  ];

  const faqs = [
    {
      q: 'What does "founding member" mean?',
      a: 'There will only ever be one first group. Founding members join at $300 one time with the first month free, then $15 a month — a rate that holds for two years before it becomes $20 a month for life. That is the only increase there will ever be, and you are told about it on the day you join rather than finding it on a statement three years from now.',
    },
    {
      q: 'What is the 30-day guarantee?',
      a: 'Thirty days. If it is not what was described, you get your money back, no argument. And if you decide inside the first two weeks that you do not need the guarantee, you can waive it — Coach Mike gives you an hour of video analysis, or up to three hours at half price. That is $70 an hour normally, and a lot of clips fit in an hour. Founding members who waive their own guarantee go up on the site: not a testimonial anybody wrote, a count of people who decided they were staying.',
    },
    {
      q: 'Can I pause my membership?',
      a: 'Yes. Take the summer off, pay nothing, and switch back on for pre-season. Your record is exactly where you left it — you are not ever starting over. If you are on the full year, it simply runs straight through.',
    },
    {
      q: 'How do I pay?',
      a: 'Interac e-transfer to info@smartergoalie.com, with the name of the goalie in the message so Coach Mike can match it. Prefer a cheque? Say so when you sign up and he will send you the details. There is no card processing here and no card details are stored anywhere.',
    },
    {
      q: 'What happens after I pay?',
      a: 'As soon as it clears, Coach Mike marks you paid and your account opens fully. You will hear from him — not a system message, him.',
    },
    {
      q: 'What are the 8 Pillars?',
      a: 'In order: 1. MindSet, 2. Skating Tech, 3. 7 Angle-Marker System (7AMS) — above the icing line, 4. 6 Zone – 7 Point System™ (6Z-7PS) — below the icing line, 5. Form Tech, 6. Game Performance Charting System, 7. Practice System, 8. Lifestyle & Hockey. 7AMS and the 6 Zone – 7 Point System™ sit under one umbrella but are two different programs.',
    },
    {
      q: 'Is there team or organization pricing?',
      a: 'Team and organization programs are arranged directly with Coach Mike rather than bought off a page. Contact us and he will set it up with you personally.',
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
        <SectionLabel>There Will Only Ever Be One First Group</SectionLabel>

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
          One registration, one rate, and it is yours for life. $300 to join, your first month free, then $15 a month.
        </p>

        <div
          className="flex flex-wrap justify-center items-center gap-3 mt-8"
          style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: '0.5px' }}
        >
          <span>$300 one time</span>
          <span style={{ color: 'rgba(55,181,255,0.4)' }}>|</span>
          <span>First month free</span>
          <span style={{ color: 'rgba(55,181,255,0.4)' }}>|</span>
          <span>Then $15/month</span>
          <span style={{ color: 'rgba(55,181,255,0.4)' }}>|</span>
          <span>30-day guarantee</span>
        </div>
      </section>

      {/* ── The Founding Offer — one price, one card ── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="mx-auto" style={{ maxWidth: '560px' }}>
          <div style={cardHighlight}>
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
              Founding Membership
            </p>

            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', lineHeight: 1.6 }}>
              The complete system, and a rate that holds.
            </p>

            {/* Price */}
            <div style={{ marginBottom: '28px' }}>
              <span style={{ fontSize: '52px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>$300</span>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                One time. Then your first month free, and $15/mo.
              </p>
            </div>

            <div style={{ height: '1px', background: 'rgba(55,181,255,0.15)', marginBottom: '24px' }} />

            {/* Terms — his words */}
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              {foundingTerms.map((term) => (
                <li key={term.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Check size={14} style={{ color: BLUE, flexShrink: 0, marginTop: '4px' }} />
                  <span>
                    <span style={{ display: 'block', fontSize: '13.5px', color: '#fff', fontWeight: 700, lineHeight: 1.5 }}>
                      {term.label}
                    </span>
                    <span style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginTop: '2px' }}>
                      {term.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => router.push('/founding')}
              style={{
                marginTop: '32px',
                width: '100%',
                padding: '16px 0',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'filter 0.2s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)')}
            >
              Join the Experience →
            </button>

            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: '14px', lineHeight: 1.6 }}>
              Payment is by Interac e-transfer or cheque. No card processing, and no card details stored anywhere.
            </p>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>What You Pay, And When</SectionLabel>
            <h2
              className="font-black uppercase mx-auto"
              style={{ fontSize: 'clamp(20px, 3.5vw, 40px)', color: '#fff', letterSpacing: '-0.02em', maxWidth: '600px' }}
            >
              THE WHOLE COST,{' '}
              <span style={{ color: BLUE }}>IN ONE PLACE</span>
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>
              Nothing else is added later. This is every dollar the membership will ever ask of you.
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
                    {['When', 'What You Pay'].map((h) => (
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
                  {rateTimeline.map((row, i) => (
                    <tr
                      key={row.when}
                      style={{
                        borderBottom: i < rateTimeline.length - 1 ? '1px solid rgba(55,181,255,0.1)' : 'none',
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
                      <td style={{ padding: '18px 28px', fontSize: '13.5px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                        {row.when}
                      </td>
                      <td style={{ padding: '18px 28px', fontSize: '13.5px', color: BLUE2, fontWeight: 600 }}>
                        {row.pay}
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
          <SectionLabel>The Founding Group</SectionLabel>

          <h3
            className="font-black uppercase"
            style={{ fontSize: 'clamp(22px, 4vw, 48px)', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            THE RATE YOU JOIN AT{' '}
            <span style={{ color: BLUE }}>IS THE RATE YOU KEEP</span>
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
            $15 a month for two years, then $20 a month for life. That is the only increase there will ever be, and it is written into your membership from the day you join.
          </p>

          <button
            onClick={() => router.push('/founding')}
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
            Join the Experience →
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
