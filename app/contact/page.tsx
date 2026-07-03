'use client';

import { useState } from 'react';
import { Footer7 } from '@/components/footer-7';
import { PublicPageNav } from '@/components/PublicPageNav';

const BLUE  = '#37b5ff';
const BLUE2 = '#60cdff';
const BLUE3 = '#0ea5e9';
const RED   = '#C00000';
const GREEN = '#34d399';
const MUTED = 'rgba(200,230,255,0.55)';
const BODY  = 'rgba(200,230,255,0.84)';

const CARD_BG  = 'linear-gradient(135deg, #041e3a 0%, #082d52 100%)';
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

const S = 'clamp(44px,5.5vw,72px) 0';
const H = 'clamp(24px,3.5vw,48px)';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    name: '', role: '', organisation: '', location: '',
    teams: '', goalies: '', goals: '', email: '', phone: '',
    preferred_contact: '', consent: false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setSubmitError('');
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!data.success) throw new Error(data.error || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: '#fff', background: '#000f28' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .contact-input:focus { border-color: ${BLUE} !important; box-shadow: 0 0 0 3px rgba(55,181,255,0.14) !important; }
        .contact-input::placeholder { color: rgba(200,230,255,0.2); }
        .contact-input option { background: #04152e; color: #fff; }
        .section-card { background: ${CARD_BG}; border: ${CARD_BDR}; border-radius: 14px; }
        .cta-btn:hover { opacity: 0.88; transform: translateY(-2px); }
      `}} />

      <PublicPageNav />

      {/* ── HERO ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(64px,9vw,100px) 0 clamp(52px,7vw,80px)', background: 'linear-gradient(145deg, #050912 0%, #0d2848 60%, #091830 100%)' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-8%', width: '55vw', height: '55vw', maxWidth: '640px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '440px', height: '440px', background: 'radial-gradient(ellipse, rgba(14,165,233,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent, ${BLUE}, ${BLUE2}88, transparent)` }} />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '50px', padding: '6px 16px', marginBottom: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: BLUE, boxShadow: '0 0 0 3px rgba(55,181,255,0.2)', flexShrink: 0 }} />
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2.5px', color: BLUE2, margin: 0, textTransform: 'uppercase' }}>Organisations · Federations · Hockey Businesses</p>
          </div>

          <div style={{ display: 'inline-block', marginBottom: '10px', fontSize: '11px', fontWeight: 700, letterSpacing: '.2em', color: BLUE2, border: '1px solid rgba(96,205,255,0.3)', borderRadius: '99px', padding: '6px 16px', textTransform: 'uppercase' }}>
            A Self-Generating, Turn-Key Goaltending Operation
          </div>

          <h1 style={{ fontSize: 'clamp(30px, 5.5vw, 68px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', margin: '0 0 16px', color: '#fff' }}>
            YOUR OPERATION.<br />
            YOUR BRAND.<br />
            <span style={{ color: RED }}>OUR SIX DECADES</span><br />
            <span style={{ color: RED }}>BEHIND IT.</span>
          </h1>

          <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: MUTED, lineHeight: 1.75, maxWidth: '460px', margin: '0 0 32px' }}>
            Smarter Goalie enhances what your operation already is — working with all circumstances, tailoring the experience and our expertise to your brand.
          </p>

          <button
            onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: `linear-gradient(135deg, ${RED}, #a00000)`, border: 'none', borderRadius: '10px', padding: '12px 26px', color: '#fff', fontSize: '13px', fontWeight: 800, letterSpacing: '.5px', cursor: 'pointer', boxShadow: '0 6px 22px rgba(192,0,0,0.4)', transition: 'all .2s' }}
            className="cta-btn"
          >
            SET UP THE CALL →
          </button>
        </div>
      </section>

      {/* ── CREDENTIALS ── */}
      <section style={{ padding: S, background: 'linear-gradient(150deg, #061a38 0%, #0a2848 100%)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full">
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3.5px', color: BLUE, textTransform: 'uppercase', marginBottom: '6px' }}>Why We Get to Say This</p>
          <h2 style={{ fontSize: H, fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '2px' }}>We Have Done It All.</h2>
          <h2 style={{ fontSize: H, fontWeight: 900, color: BLUE2, lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '24px' }}>For Over Six Decades.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="section-card" style={{ padding: '22px' }}>
              <div style={{ width: '40px', height: '3px', background: BLUE, borderRadius: '99px', marginBottom: '12px' }} />
              <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.8, margin: 0 }}>
                Smarter Goalie was not assembled from theory. It was earned — six decades of studying, deciphering, and creating <b style={{ color: BLUE2 }}>an original teaching philosophy that simplifies the position and the game itself</b>: the mysteries of the net broken down into a system that can be taught, learned, and proven.
              </p>
            </div>
            <div className="section-card" style={{ padding: '22px' }}>
              <div style={{ width: '40px', height: '3px', background: GREEN, borderRadius: '99px', marginBottom: '12px' }} />
              <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.8, margin: 0 }}>
                Over five decades of running clinics, building camps, and delivering custom programs — developing goalies at every age and every level — across organisations, federations, sports academies, facilities, grassroots programs, and education institutions.
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(192,0,0,0.06)', border: '1px solid rgba(192,0,0,0.2)', borderLeft: `4px solid ${RED}`, borderRadius: '0 14px 14px 0', padding: '20px 24px', maxWidth: '800px' }}>
            <p style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', fontStyle: 'italic', lineHeight: 1.6, margin: 0, color: BODY }}>
              The experience Smarter Goalie brings goes back to opening{' '}
              <b style={{ color: RED, fontStyle: 'normal' }}>the first year-round goalie school</b>{' '}
              in Toronto, Canada — the Mecca of hockey — in the early '80s.
            </p>
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY ── */}
      <section style={{ padding: S, background: 'radial-gradient(ellipse at 60% 30%, #0a1e42 0%, #050912 100%)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full">
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3.5px', color: BLUE, textTransform: 'uppercase', marginBottom: '6px' }}>The Most Important Position on the Team</p>
          <h2 style={{ fontSize: H, fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '2px' }}>How the Goalie Goes —</h2>
          <h2 style={{ fontSize: H, fontWeight: 900, color: BLUE2, lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '24px' }}>The Team Goes.</h2>

          <div style={{ maxWidth: '700px', marginBottom: '24px' }}>
            <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.85, marginBottom: '14px' }}>
              Goalies carry a leadership role whether they ask for it or not — so getting to know each goalie is critical to advancing them as a person, as an athlete, and as a goaltender. Their personal <b style={{ color: BLUE2 }}>Baseline Profile</b> starts their journey on a unique, intuitive teaching system built exclusively for the most important person — and position — on the team.
            </p>
            <p style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', fontWeight: 800, color: '#fff', lineHeight: 1.4 }}>
              <span style={{ color: GREEN }}>Confident goalie, confident bench.</span>{' '}
              <span style={{ color: RED }}>Weak goalie, deflated bench.</span>
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            {['Self-Evaluation', 'Self-Coaching', 'Practice Formatting', 'Game Performance Analytics'].map(s => (
              <span key={s} style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.06em', border: '1px solid rgba(55,181,255,0.28)', color: BLUE2, borderRadius: '99px', padding: '7px 16px', background: 'rgba(4,20,50,0.8)' }}>{s}</span>
            ))}
          </div>

          <p style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', fontWeight: 800, color: BLUE2, lineHeight: 1.4, maxWidth: '600px', margin: 0 }}>
            We build athletes for life and for the game of hockey — and we build starters. That's Smarter Goalie.
          </p>
        </div>
      </section>

      {/* ── SUPPORTING CAST ── */}
      <section style={{ padding: S, background: 'linear-gradient(150deg, #061830 0%, #0c2542 100%)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full">
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3.5px', color: BLUE, textTransform: 'uppercase', marginBottom: '6px' }}>The Supporting Cast</p>
          <h2 style={{ fontSize: H, fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '2px' }}>Nobody Stands in the Crease</h2>
          <h2 style={{ fontSize: H, fontWeight: 900, color: BLUE2, lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '28px' }}>Alone.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="section-card" style={{ padding: '22px', borderTop: `3px solid ${BLUE2}` }}>
              <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.85, marginBottom: '12px' }}>
                Behind every goalie stands a parent who wants to help and a coach who wants answers — and Smarter Goalie puts both to work. We are active in parent support, and we welcome the coach to <b style={{ color: BLUE2 }}>engage and learn at their own speed — never any pressure</b>.
              </p>
              <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.85, margin: 0 }}>
                What that builds is a <b style={{ color: BLUE2 }}>full, impact-driven experience</b> — one that captures every minute of learning impact, in team practice and private practice alike.
              </p>
            </div>
            <div className="section-card" style={{ padding: '22px', borderTop: `3px solid ${GREEN}` }}>
              <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.85, marginBottom: '12px' }}>
                Every goalie in your program carries a living history: from baseline profile through every chart, every reflection, every season — data they keep, to reflect on, to reaffirm their goals are being met.
              </p>
              <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.85, margin: 0 }}>
                That history is what makes the relationship <b style={{ color: GREEN }}>long-term</b> — your program doesn't get a season of help. It gets a system that stays.
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(55,181,255,0.07)', border: '1px solid rgba(55,181,255,0.2)', borderLeft: `4px solid ${BLUE}`, borderRadius: '0 14px 14px 0', padding: '18px 22px', maxWidth: '740px' }}>
            <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.85, margin: 0 }}>
              We meet you where your organisation wants to go — <b style={{ color: BLUE2 }}>your goals, your budget, your vision</b>. And if the vision isn't fully formed yet, Smarter Goalie can help you build that too.
            </p>
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ── */}
      <section id="contact-form" style={{ padding: S, background: 'radial-gradient(ellipse at 35% 65%, #04152e 0%, #070f1e 100%)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full">
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3.5px', color: BLUE, textTransform: 'uppercase', marginBottom: '6px' }}>Start Here</p>
          <h2 style={{ fontSize: H, fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '2px' }}>A Few Specific Questions.</h2>
          <h2 style={{ fontSize: H, fontWeight: 900, color: BLUE2, lineHeight: 1.0, letterSpacing: '-0.025em', marginBottom: '24px' }}>Then a Call on the Calendar.</h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
            {[['Answer the Questions', BLUE], ['→', null], ['Pick Your Time', BLUE2], ['→', null], ['We Chat', BLUE3]].map(([label, color], i) => (
              color === null
                ? <span key={i} style={{ color: BLUE, fontSize: '16px', fontWeight: 700 }}>{label}</span>
                : <span key={i} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', border: `1px solid ${color}55`, color: color as string, borderRadius: '99px', padding: '7px 16px', background: 'rgba(4,20,50,0.8)', textTransform: 'uppercase' }}>{label}</span>
            ))}
          </div>
          <p style={{ fontSize: '13px', color: MUTED, fontStyle: 'italic', marginBottom: '22px' }}>
            Direct to the Smarter Goalie team — a real conversation about where your program wants to go.
          </p>

          {submitted ? (
            <div style={{ background: CARD_BG, border: '1px solid rgba(55,181,255,0.3)', borderRadius: '18px', padding: 'clamp(32px,5vw,52px) clamp(20px,4vw,36px)', textAlign: 'center', maxWidth: '560px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>✓</div>
              <h3 style={{ fontSize: 'clamp(20px,3vw,24px)', fontWeight: 800, marginBottom: '10px', color: BLUE2 }}>Your answers are on their way.</h3>
              <p style={{ fontSize: '15px', color: MUTED, lineHeight: 1.7, margin: 0 }}>
                The Smarter Goalie team will be in touch to set up the call. We look forward to hearing about your program.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: CARD_BG, border: CARD_BDR, borderRadius: '18px', padding: 'clamp(18px,3vw,32px)', maxWidth: '860px' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="flex flex-col">
                  <label style={labelStyle}>Your Name</label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="First and last name" required style={inputStyle} className="contact-input" />
                </div>

                <div className="flex flex-col">
                  <label style={labelStyle}>Your Role</label>
                  <select name="role" value={form.role} onChange={handleChange} required style={inputStyle} className="contact-input">
                    <option value="" disabled>Select your role…</option>
                    {['Head Coach','Goalie Coach','Team Manager','Organisation / Association Executive','Federation Representative','Camp Director / Hockey Business','Sports Academy / Facility Director','Education Institution','Grassroots Program','Parent Group Representative','Other'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label style={labelStyle}>Organisation / Program Name</label>
                  <input name="organisation" value={form.organisation} onChange={handleChange} placeholder="Your organisation, team, or business" required style={inputStyle} className="contact-input" />
                </div>

                <div className="flex flex-col">
                  <label style={labelStyle}>Location <span style={{ color: MUTED, textTransform: 'none', letterSpacing: 0, fontWeight: 'normal' }}>(city & region)</span></label>
                  <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Vaughan, Ontario" required style={inputStyle} className="contact-input" />
                </div>

                <div className="flex flex-col">
                  <label style={labelStyle}>Teams in Your Program</label>
                  <select name="teams" value={form.teams} onChange={handleChange} style={inputStyle} className="contact-input">
                    <option value="" disabled>Select…</option>
                    {['1 team','2–5 teams','6–15 teams','16+ teams','Camp / seasonal program'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label style={labelStyle}>Goaltenders in Your Program</label>
                  <select name="goalies" value={form.goalies} onChange={handleChange} style={inputStyle} className="contact-input">
                    <option value="" disabled>Select…</option>
                    {['1–2','3–10','11–30','31+'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>

                <div className="flex flex-col sm:col-span-2">
                  <label style={labelStyle}>Your Program's Goals <span style={{ color: MUTED, textTransform: 'none', letterSpacing: 0, fontWeight: 'normal' }}>(in your own words)</span></label>
                  <textarea name="goals" value={form.goals} onChange={handleChange} placeholder="Where does your organisation want to go? What would a goaltending standard change for your teams, your coaches, your parents, your goalies?" style={{ ...inputStyle, minHeight: '110px', resize: 'vertical' }} className="contact-input" />
                </div>

                <div className="flex flex-col">
                  <label style={labelStyle}>Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required style={inputStyle} className="contact-input" />
                </div>

                <div className="flex flex-col">
                  <label style={labelStyle}>Phone <span style={{ color: MUTED, textTransform: 'none', letterSpacing: 0, fontWeight: 'normal' }}>(optional)</span></label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="For the call" style={inputStyle} className="contact-input" />
                </div>

                <div className="flex flex-col sm:col-span-2">
                  <label style={labelStyle}>Preferred Way to Talk</label>
                  <select name="preferred_contact" value={form.preferred_contact} onChange={handleChange} style={inputStyle} className="contact-input">
                    <option value="" disabled>Select…</option>
                    {['Phone call','Video call','Email first'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 items-start sm:col-span-2" style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>
                  <input type="checkbox" name="consent" checked={form.consent} onChange={handleChange} required style={{ width: 'auto', marginTop: '3px', accentColor: BLUE } as React.CSSProperties} />
                  <span>I'd like Smarter Goalie to contact me about my program. My information stays with Smarter Goalie — never sold, never shared.</span>
                </div>
              </div>

              {submitError && (
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#f87171', marginTop: '16px', marginBottom: 0, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', padding: '10px 16px' }}>
                  {submitError}
                </p>
              )}
              <div style={{ textAlign: 'center', marginTop: '22px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="cta-btn"
                  style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#fff', background: loading ? 'rgba(192,0,0,0.5)' : `linear-gradient(135deg, ${RED}, #a00000)`, border: 'none', borderRadius: '10px', padding: '13px 38px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 6px 22px rgba(192,0,0,0.4)', transition: 'all .2s' }}
                >
                  {loading ? 'Sending…' : 'Set Up the Call'}
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '12px', color: MUTED, fontStyle: 'italic', marginTop: '10px', marginBottom: 0 }}>
                Your answers reach the Smarter Goalie team directly — and the calendar opens to pick your time.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── CLOSING ── */}
      <section style={{ padding: 'clamp(36px,5vw,60px) 0', background: 'linear-gradient(160deg, #040f24 0%, #061a38 100%)', textAlign: 'center' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full">
          <div style={{ maxWidth: '660px', margin: '0 auto' }}>
            <p style={{ fontSize: 'clamp(17px, 2.6vw, 30px)', fontWeight: 900, lineHeight: 1.3, color: '#fff', marginBottom: '4px' }}>We build the human behind the goalie.</p>
            <p style={{ fontSize: 'clamp(17px, 2.6vw, 30px)', fontWeight: 900, lineHeight: 1.3, color: '#fff', marginBottom: '4px' }}>We build athletes for life.</p>
            <p style={{ fontSize: 'clamp(17px, 2.6vw, 30px)', fontWeight: 900, lineHeight: 1.3, color: BLUE2, marginBottom: '16px' }}>We build starters.</p>
            <p style={{ fontSize: 'clamp(12px, 1.4vw, 15px)', color: MUTED, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>
              That's Smarter Goalie. <span style={{ color: BLUE }}>Think Smart. Play Smart.</span>
            </p>
          </div>
        </div>
      </section>

      <Footer7 />
    </div>
  );
}
