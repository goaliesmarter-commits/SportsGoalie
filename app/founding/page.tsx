'use client';

import { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { Footer7 } from '@/components/footer-7';
import { PublicPageNav } from '@/components/PublicPageNav';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const GREEN = '#34d399';
const MUTED = 'rgba(200,230,255,0.55)';
const BODY = 'rgba(200,230,255,0.84)';

const CARD_BG = 'linear-gradient(135deg, #041e3a 0%, #082d52 100%)';
const CARD_BDR = '1px solid rgba(55,181,255,0.18)';

// Kept in step with E_TRANSFER_ADDRESS in src/lib/emails/founding-member-email.ts
// (server-only module — the address is public information either way).
const E_TRANSFER_ADDRESS = 'info@smartergoalie.com';

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

// The offer terms, matching Michael's confirmation email fact for fact.
const OFFER_POINTS = [
  '$300, one time — a registration fee, not a monthly plan, and it is yours for life',
  'Your first month is free',
  'Then $15 a month — your founding rate, held for two years',
  'After two years, $20 a month — the rate for life, and the only increase there will ever be',
  'Pause any time: pay nothing while you are away, come back to your record exactly where you left it',
  'A thirty-day money-back guarantee, no argument',
];

const EMPTY_FORM = { name: '', email: '', goalieName: '', phone: '', note: '' };

export default function FoundingPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState<{ email: string; emailSent: boolean } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setSubmitError('');
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/founding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { success: boolean; error?: string; confirmationEmailSent?: boolean };
      if (!data.success) throw new Error(data.error || 'Submission failed');
      setDone({ email: form.email, emailSent: data.confirmationEmailSent === true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: '#fff', background: '#000f28', colorScheme: 'dark' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .founding-input:focus, .founding-input:focus-visible { border-color: ${BLUE} !important; box-shadow: 0 0 0 3px rgba(55,181,255,0.14) !important; }
        .founding-input::placeholder { color: rgba(200,230,255,0.2); }
        .founding-card { background: ${CARD_BG}; border: ${CARD_BDR}; border-radius: 14px; }
        .founding-cta:hover { opacity: 0.88; transform: translateY(-2px); }
      `}} />

      <PublicPageNav />

      {/* ── HERO ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(56px,8vw,88px) 0 clamp(36px,5vw,56px)', background: 'linear-gradient(145deg, #050912 0%, #0d2848 60%, #091830 100%)' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-8%', width: '55vw', height: '55vw', maxWidth: '640px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${BLUE}, ${BLUE2}88, transparent)` }} />

        <div className="max-w-3xl mx-auto px-5 sm:px-8 w-full" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '50px', padding: '6px 16px', marginBottom: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: BLUE, boxShadow: '0 0 0 3px rgba(55,181,255,0.2)', flexShrink: 0 }} />
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2.5px', color: BLUE2, margin: 0, textTransform: 'uppercase' }}>There Will Only Ever Be One First Group</p>
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.03em', margin: '0 0 16px', color: '#fff', textTransform: 'uppercase' }}>
            BECOME A <span style={{ color: BLUE }}>FOUNDING MEMBER</span>
          </h1>

          <p style={{ fontSize: 'clamp(14px, 1.6vw, 16px)', color: MUTED, lineHeight: 1.75, maxWidth: '520px', margin: '0 auto' }}>
            Sign up below and your payment instructions arrive by email. No card processing — you pay by Interac e-transfer or cheque, directly.
          </p>
        </div>
      </section>

      {/* ── OFFER + FORM ── */}
      <section style={{ padding: 'clamp(36px,5vw,64px) 0 clamp(56px,7vw,88px)', background: 'radial-gradient(ellipse at 35% 65%, #04152e 0%, #070f1e 100%)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

            {/* The offer */}
            <div className="founding-card" style={{ padding: '28px 26px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: BLUE, textTransform: 'uppercase', marginBottom: '14px' }}>The Founding Offer</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: 0, padding: 0, listStyle: 'none' }}>
                {OFFER_POINTS.map(point => (
                  <li key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Check size={15} style={{ color: GREEN, flexShrink: 0, marginTop: '3px' }} />
                    <span style={{ fontSize: '13.5px', color: BODY, lineHeight: 1.65 }}>{point}</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: '22px', background: 'rgba(55,181,255,0.07)', border: '1px solid rgba(55,181,255,0.2)', borderLeft: `4px solid ${BLUE}`, borderRadius: '0 10px 10px 0', padding: '14px 16px' }}>
                <p style={{ fontSize: '13px', color: BODY, lineHeight: 1.7, margin: 0 }}>
                  Every sign-up is read personally. When your payment clears, your account is opened and you hear from Michael directly — not a system message.
                </p>
              </div>
            </div>

            {/* The form, or the confirmation */}
            {done ? (
              <div className="founding-card" style={{ padding: '28px 26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: `1px solid ${GREEN}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={20} style={{ color: GREEN }} />
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>You&apos;re in.</h2>
                </div>

                {done.emailSent ? (
                  <p style={{ fontSize: '14px', color: BODY, lineHeight: 1.75, margin: '0 0 20px' }}>
                    Your payment instructions are on their way to <b style={{ color: BLUE2 }}>{done.email}</b>. They are also right here:
                  </p>
                ) : (
                  <p style={{ fontSize: '14px', color: BODY, lineHeight: 1.75, margin: '0 0 20px' }}>
                    Your sign-up is saved, but the confirmation email could not be sent just now — no matter, everything you need is right here:
                  </p>
                )}

                <div style={{ background: 'rgba(4,20,45,0.85)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: BLUE, textTransform: 'uppercase', margin: '0 0 10px' }}>How to Pay</p>
                  <p style={{ fontSize: '14px', color: BODY, lineHeight: 1.8, margin: '0 0 10px' }}>
                    Interac e-transfer <b style={{ color: '#fff' }}>$300</b> to{' '}
                    <b style={{ color: BLUE2, wordBreak: 'break-all' }}>{E_TRANSFER_ADDRESS}</b>
                  </p>
                  <p style={{ fontSize: '13.5px', color: BODY, lineHeight: 1.8, margin: 0 }}>
                    Please put the goalie&apos;s name in the transfer message so your payment can be matched to your account. Prefer a cheque? Email{' '}
                    <a href={`mailto:${E_TRANSFER_ADDRESS}`} style={{ color: BLUE2 }}>{E_TRANSFER_ADDRESS}</a> and the details will come back to you.
                  </p>
                </div>

                <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.7, margin: 0, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Mail size={14} style={{ flexShrink: 0, marginTop: '3px', color: BLUE }} />
                  <span>As soon as the payment clears you are marked paid, your account opens fully, and you hear from Michael himself.</span>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="founding-card" style={{ padding: '28px 26px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: BLUE, textTransform: 'uppercase', marginBottom: '18px' }}>Claim Your Spot</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label htmlFor="founding-name" style={labelStyle}>Your Name *</label>
                    <input id="founding-name" name="name" value={form.name} onChange={handleChange} placeholder="First and last name" required maxLength={120} style={inputStyle} className="founding-input" />
                  </div>
                  <div>
                    <label htmlFor="founding-email" style={labelStyle}>Email *</label>
                    <input id="founding-email" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required maxLength={200} style={inputStyle} className="founding-input" />
                    <p style={{ fontSize: '11.5px', color: MUTED, margin: '6px 0 0', lineHeight: 1.5 }}>Your payment instructions arrive here.</p>
                  </div>
                  <div>
                    <label htmlFor="founding-goalie" style={labelStyle}>Goalie&apos;s Name *</label>
                    <input id="founding-goalie" name="goalieName" value={form.goalieName} onChange={handleChange} placeholder="The goalie this membership is for" required maxLength={120} style={inputStyle} className="founding-input" />
                    <p style={{ fontSize: '11.5px', color: MUTED, margin: '6px 0 0', lineHeight: 1.5 }}>You&apos;ll put this name in the e-transfer message — it&apos;s how your payment is matched to your account.</p>
                  </div>
                  <div>
                    <label htmlFor="founding-phone" style={labelStyle}>Phone <span style={{ color: MUTED, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input id="founding-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Your number" maxLength={40} style={inputStyle} className="founding-input" />
                  </div>
                  <div>
                    <label htmlFor="founding-note" style={labelStyle}>Anything You Want Us to Know <span style={{ color: MUTED, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea id="founding-note" name="note" value={form.note} onChange={handleChange} placeholder="Age, level, what you're hoping to get out of it…" maxLength={2000} style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} className="founding-input" />
                  </div>
                </div>

                {submitError && (
                  <p role="alert" style={{ fontSize: '13px', color: '#f87171', margin: '14px 0 0', lineHeight: 1.6 }}>{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="founding-cta"
                  style={{
                    marginTop: '20px',
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: '10px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 8px 32px rgba(55,181,255,0.3)',
                    transition: 'all .2s',
                  }}
                >
                  {loading ? 'Sending…' : 'Claim Founding Rate →'}
                </button>

                <p style={{ fontSize: '11.5px', color: MUTED, margin: '12px 0 0', lineHeight: 1.6, textAlign: 'center' }}>
                  No card processing — no card details are stored anywhere. Payment is by e-transfer or cheque after you sign up.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer7 />
    </div>
  );
}
