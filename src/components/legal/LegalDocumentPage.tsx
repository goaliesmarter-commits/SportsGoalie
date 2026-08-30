'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Footer7 } from '@/components/footer-7';
import { PublicPageNav } from '@/components/PublicPageNav';
import { isInForce, type LegalDocument } from '@/types/legal';

// Same palette and section vocabulary as the other public pages (see
// app/contact/page.tsx, which is the reference implementation): navy #000f28
// base, gradient section backgrounds, badge pill in the hero, 900-weight
// two-tone headings, and gradient "section-card" panels.
const BLUE  = '#37b5ff';
const BLUE2 = '#60cdff';
const AMBER = '#FFD166';
const MUTED = 'rgba(200,230,255,0.55)';
const BODY  = 'rgba(200,230,255,0.84)';

const CARD_BG  = 'linear-gradient(135deg, #041e3a 0%, #082d52 100%)';
const CARD_BDR = '1px solid rgba(55,181,255,0.18)';

const S = 'clamp(44px,5.5vw,72px) 0';

/**
 * Renders a legal document from `src/data/legal/*`.
 *
 * The page has two states and picks between them itself:
 *
 *   • In force — the wording exists and a date is set. Renders as a normal
 *     document with a table of contents and a version line.
 *
 *   • Draft — no wording yet. Renders the outline of what the document will
 *     cover, behind a notice that says plainly it is not in force.
 *
 * The draft state exists because the sign-up form has linked to /terms and
 * /privacy since long before either page existed, so every visitor who read
 * the tickbox and clicked through hit a 404. An honest "being finalised, here
 * is what it will cover" page is better than that, and far better than
 * placeholder legal text — text that only *looks* like a policy is worse than
 * none at all, because someone may rely on it.
 *
 * Nothing here needs editing when the wording arrives. Fill the data file.
 */
export function LegalDocumentPage({ doc }: { doc: LegalDocument }) {
  const live = isInForce(doc);
  const written = doc.sections.filter(s => s.body.length > 0);
  const sections = live ? written : doc.sections;

  // The marketing pages set their headline's last line in BLUE2; the closest
  // equivalent for a data-driven single-line title is colouring its last word.
  const titleWords = doc.title.split(' ');
  const titleLead = titleWords.slice(0, -1).join(' ');
  const titleTail = titleWords[titleWords.length - 1];

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: '#fff', background: '#000f28', colorScheme: 'dark' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .legal-toc-link { color: ${BODY}; text-decoration: none; transition: color .15s; }
        .legal-toc-link:hover { color: ${BLUE2}; }
        .legal-inline-link { color: ${BLUE}; text-decoration: none; font-weight: 600; transition: color .15s; }
        .legal-inline-link:hover { color: ${BLUE2}; }
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
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2.5px', color: BLUE2, margin: 0, textTransform: 'uppercase' }}>Smarter Goalie · Legal</p>
          </div>

          <h1 style={{ fontSize: 'clamp(30px, 5.5vw, 60px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.03em', margin: '0 0 16px', color: '#fff', textTransform: 'uppercase' }}>
            {titleLead && <>{titleLead}{' '}</>}
            <span style={{ color: BLUE2 }}>{titleTail}</span>
          </h1>

          <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: MUTED, lineHeight: 1.75, maxWidth: '560px', margin: 0 }}>
            {doc.subtitle}
          </p>

          {live && (
            <p style={{ fontSize: '12px', color: 'rgba(200,230,255,0.4)', margin: '20px 0 0', letterSpacing: '0.3px' }}>
              Version {doc.version} · In force from {formatDate(doc.effectiveDate!)}
            </p>
          )}
        </div>
      </section>

      {/* ── DOCUMENT ── */}
      <section style={{ padding: S, background: 'linear-gradient(150deg, #061a38 0%, #0a2848 100%)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full">
          <div style={{ maxWidth: '820px' }}>

            {!live && <DraftNotice title={doc.title} />}

            {doc.intro.map((paragraph, i) => (
              <p key={i} style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.85, margin: '0 0 18px' }}>
                {paragraph}
              </p>
            ))}

            {/* Contents — only worth showing once there is something to jump to. */}
            {live && sections.length > 1 && (
              <nav
                aria-label="Contents"
                style={{ background: CARD_BG, border: CARD_BDR, borderRadius: '14px', padding: '20px 24px', margin: '0 0 24px' }}
              >
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3.5px', color: BLUE, textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Contents
                </p>
                <ol style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, padding: 0, listStyle: 'none' }}>
                  {sections.map((section, i) => (
                    <li key={section.id} style={{ display: 'flex', gap: '10px', fontSize: '14px' }}>
                      <span style={{ color: 'rgba(200,230,255,0.3)', minWidth: '20px' }}>{i + 1}.</span>
                      <a href={`#${section.id}`} className="legal-toc-link">
                        {section.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* The document body lives in one large card, the same treatment
                the contact page gives its form panel. */}
            <div style={{ background: CARD_BG, border: CARD_BDR, borderRadius: '18px', padding: 'clamp(22px,3.5vw,40px)' }}>
              {sections.map((section, i) => (
                <article key={section.id} id={section.id} style={{ scrollMarginTop: '88px', marginBottom: i === sections.length - 1 ? 0 : '30px' }}>
                  <h2
                    style={{
                      fontSize: 'clamp(16px, 2vw, 20px)',
                      fontWeight: 900,
                      color: '#fff',
                      letterSpacing: '-0.015em',
                      margin: '0 0 10px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ color: BLUE, fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {section.heading}
                  </h2>

                  {section.body.length > 0 ? (
                    section.body.map((paragraph, j) => (
                      <p key={j} style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', color: BODY, lineHeight: 1.85, margin: '0 0 14px', paddingLeft: '30px' }}>
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p style={{ fontSize: '14px', color: 'rgba(200,230,255,0.35)', lineHeight: 1.7, margin: 0, paddingLeft: '30px', fontStyle: 'italic' }}>
                      Wording to follow.
                    </p>
                  )}
                </article>
              ))}
            </div>

            {/* Questions — useful in both states, and the only route a visitor
                has to a person while the document is still being written.
                Styled as the blue left-accent callout the other pages use. */}
            <div
              style={{
                marginTop: '24px',
                background: 'rgba(55,181,255,0.07)',
                border: '1px solid rgba(55,181,255,0.2)',
                borderLeft: `4px solid ${BLUE}`,
                borderRadius: '0 14px 14px 0',
                padding: '18px 22px',
                fontSize: 'clamp(13px, 1.4vw, 15px)',
                color: BODY,
                lineHeight: 1.85,
              }}
            >
              Questions about this document?{' '}
              <a href="mailto:info@smartergoalie.com" className="legal-inline-link">
                info@smartergoalie.com
              </a>
              {' · '}
              <Link href="/contact" className="legal-inline-link">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer7 />
    </div>
  );
}

/**
 * Shown until the wording exists. Deliberately impossible to mistake for the
 * document itself — a visitor must not read an outline and believe they have
 * read a policy. Amber on purpose: it must not blend into the blue theme.
 */
function DraftNotice({ title }: { title: string }) {
  return (
    <div
      role="note"
      style={{
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
        background: 'rgba(255,209,102,0.07)',
        border: '1px solid rgba(255,209,102,0.32)',
        borderLeft: `4px solid ${AMBER}`,
        borderRadius: '0 14px 14px 0',
        padding: '18px 22px',
        margin: '0 0 24px',
      }}
    >
      <AlertTriangle size={17} style={{ color: AMBER, flexShrink: 0, marginTop: '3px' }} />
      <div>
        <p style={{ fontSize: '13px', fontWeight: 800, color: AMBER, margin: '0 0 6px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
          This document is being finalised and is not yet in force
        </p>
        <p style={{ fontSize: 'clamp(13px, 1.4vw, 14px)', color: BODY, lineHeight: 1.75, margin: 0 }}>
          Our {title.toLowerCase()} is currently with us for drafting. Below is an
          outline of what it will cover, published so you can see it before it is
          finished rather than after. Until it is in force there is nothing here
          for you to rely on — if you have a question in the meantime, please ask
          us directly and you will get a straight answer from a person.
        </p>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  // en-GB with an explicit UTC timezone: an ISO date like '2026-09-05' parses
  // as UTC midnight, which in any negative-offset timezone (all of Canada)
  // would otherwise render as the previous day.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
