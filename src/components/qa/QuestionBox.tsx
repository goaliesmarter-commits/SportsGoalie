'use client';

import { useRef, useState } from 'react';
import { MessageCircleQuestion, Send, X } from 'lucide-react';
import type { QAAskResponse, QASubmitResponse } from '@/types/qa';

const BLUE  = '#37b5ff';
const BLUE2 = '#60cdff';
const MUTED = 'rgba(200,230,255,0.55)';
const BODY  = 'rgba(200,230,255,0.84)';
const CARD_BG  = 'linear-gradient(135deg, #041e3a 0%, #082d52 100%)';
const CARD_BDR = '1px solid rgba(55,181,255,0.25)';

/**
 * The public question box — floats on every marketing page, no login needed.
 *
 * A visitor asks in their own words and gets Michael's stored answer back,
 * word for word. When nothing matches, their question and email are captured
 * into his queue and his reply comes back by email (and joins the library).
 * The visitor-facing promise, kept everywhere in this flow: nothing shown
 * here is machine-written — it is his answer or no answer.
 */

type Stage = 'ask' | 'loading' | 'answer' | 'nomatch' | 'sending' | 'sent';

export function QuestionBox() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('ask');
  const [question, setQuestion] = useState('');
  const [matchedQuestion, setMatchedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function reset() {
    setStage('ask');
    setQuestion('');
    setMatchedQuestion('');
    setAnswer('');
    setError('');
  }

  async function ask() {
    const trimmed = question.trim();
    if (trimmed.length < 3) { setError('Ask a real question — a few words at least.'); return; }
    setError('');
    setStage('loading');
    try {
      const res = await fetch('/api/qa/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = (await res.json()) as QAAskResponse;
      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong. Please try again.');
        setStage('ask');
        return;
      }
      if (data.matched && data.answer) {
        setMatchedQuestion(data.question || trimmed);
        setAnswer(data.answer);
        setStage('answer');
      } else {
        setStage('nomatch');
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setStage('ask');
    }
  }

  async function submitUnanswered() {
    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) { setError('Please enter a valid email address.'); return; }
    setError('');
    setStage('sending');
    try {
      const res = await fetch('/api/qa/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), email: trimmedEmail }),
      });
      const data = (await res.json()) as QASubmitResponse;
      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong. Please try again.');
        setStage('nomatch');
        return;
      }
      setStage('sent');
    } catch {
      setError('Something went wrong. Please try again.');
      setStage('nomatch');
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '2px',
    textTransform: 'uppercase', color: BLUE2, marginBottom: '8px',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', background: 'rgba(4,20,45,0.85)',
    border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', color: '#fff',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    background: `linear-gradient(135deg, ${BLUE}, #1a8fd6)`, border: 'none', borderRadius: '10px',
    padding: '11px 22px', color: '#fff', fontSize: '13px', fontWeight: 800, letterSpacing: '.5px',
    cursor: 'pointer', boxShadow: '0 6px 22px rgba(55,181,255,0.35)', transition: 'all .2s',
  };
  const ghostBtn: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(55,181,255,0.3)', borderRadius: '10px',
    padding: '10px 18px', color: BLUE2, fontSize: '13px', fontWeight: 700, cursor: 'pointer',
    transition: 'all .2s',
  };

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', colorScheme: 'dark' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .qa-fab:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(55,181,255,0.5); }
        .qa-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .qa-ghost:hover { background: rgba(55,181,255,0.1); }
        .qa-input:focus { border-color: ${BLUE} !important; box-shadow: 0 0 0 3px rgba(55,181,255,0.14); }
        .qa-input::placeholder { color: rgba(200,230,255,0.25); }
        .qa-panel { animation: qa-rise .18s ease-out; }
        @keyframes qa-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="qa-fab"
          aria-label="Ask a question"
          style={{
            position: 'fixed', bottom: '20px', right: '20px', zIndex: 60,
            display: 'flex', alignItems: 'center', gap: '10px',
            background: `linear-gradient(135deg, ${BLUE}, #1a8fd6)`, border: 'none',
            borderRadius: '50px', padding: '14px 20px', color: '#fff',
            fontSize: '13px', fontWeight: 800, letterSpacing: '.5px', cursor: 'pointer',
            boxShadow: '0 6px 22px rgba(55,181,255,0.4)', transition: 'all .2s',
          }}
        >
          <MessageCircleQuestion size={20} />
          <span className="hidden sm:inline">ASK A QUESTION</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="qa-panel"
          role="dialog"
          aria-label="Ask Smarter Goalie a question"
          style={{
            position: 'fixed', bottom: '20px', right: '20px', zIndex: 60,
            width: 'min(400px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 40px)',
            display: 'flex', flexDirection: 'column',
            background: CARD_BG, border: CARD_BDR, borderRadius: '18px',
            boxShadow: '0 18px 60px rgba(0,0,0,0.55)', overflow: 'hidden',
          }}
        >
          <div style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${BLUE}, ${BLUE2}88, transparent)`, flexShrink: 0 }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 18px 0', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2.5px', color: BLUE2, margin: '0 0 4px', textTransform: 'uppercase' }}>
                Smarter Goalie
              </p>
              <p style={{ fontSize: '17px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                Ask us anything
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: '6px', marginTop: '-2px', marginRight: '-6px' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '12px 18px 18px', overflowY: 'auto' }}>

            {(stage === 'ask' || stage === 'loading') && (
              <>
                <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6, margin: '0 0 12px' }}>
                  Every answer here is written by us — a real person, in his own words. Nothing is machine-generated.
                </p>
                <textarea
                  ref={inputRef}
                  className="qa-input"
                  value={question}
                  onChange={e => { setQuestion(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && stage === 'ask') { e.preventDefault(); ask(); } }}
                  placeholder="Ask in your own words…"
                  maxLength={500}
                  rows={3}
                  disabled={stage === 'loading'}
                  style={{ ...inputStyle, resize: 'none', marginBottom: '10px' }}
                />
                {error && <ErrorLine text={error} />}
                <button onClick={ask} disabled={stage === 'loading'} className="qa-btn" style={{ ...primaryBtn, width: '100%', opacity: stage === 'loading' ? 0.6 : 1, cursor: stage === 'loading' ? 'wait' : 'pointer' }}>
                  {stage === 'loading' ? 'Looking for your answer…' : <>Ask <Send size={14} /></>}
                </button>
              </>
            )}

            {stage === 'answer' && (() => {
              /*
                The visitor's question and the stored one are shown as two
                different things when they differ. An earlier version printed
                the stored question under "You asked", which read as the box
                rewriting the visitor's question — it must never look like
                that. The answer is a match, and it is presented as one.
              */
              const asked = question.trim();
              const isRephrase = asked.toLowerCase() !== matchedQuestion.trim().toLowerCase();
              return (
                <>
                  <p style={labelStyle}>You asked</p>
                  <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6, margin: '0 0 14px', fontStyle: 'italic' }}>
                    {asked}
                  </p>
                  {isRephrase && (
                    <>
                      <p style={labelStyle}>The closest question Coach has answered</p>
                      <p style={{ fontSize: '13px', color: BODY, lineHeight: 1.6, margin: '0 0 14px', fontStyle: 'italic' }}>
                        {matchedQuestion}
                      </p>
                    </>
                  )}
                  <p style={labelStyle}>{isRephrase ? 'His answer' : 'Our answer'}</p>
                  <div style={{ background: 'rgba(4,20,45,0.6)', border: '1px solid rgba(55,181,255,0.16)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
                    <p style={{ fontSize: '14px', color: BODY, lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{answer}</p>
                  </div>
                  <button onClick={reset} className="qa-ghost" style={{ ...ghostBtn, width: '100%' }}>
                    Ask another question
                  </button>
                  {isRephrase && (
                    <button
                      onClick={() => { setError(''); setStage('nomatch'); }}
                      style={{ background: 'none', border: 'none', color: MUTED, fontSize: '12px', cursor: 'pointer', width: '100%', marginTop: '10px', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                    >
                      Not what you asked? Send your question to Coach
                    </button>
                  )}
                </>
              );
            })()}

            {(stage === 'nomatch' || stage === 'sending') && (
              <>
                <p style={{ fontSize: '14px', color: BODY, lineHeight: 1.7, margin: '0 0 12px' }}>
                  We don&apos;t have an answer for that one yet — and we won&apos;t make one up.
                  Leave your email and your question goes straight to us. You&apos;ll
                  get a real answer back, written for you.
                </p>
                <p style={{ fontSize: '12px', color: MUTED, fontStyle: 'italic', margin: '0 0 12px', borderLeft: `3px solid rgba(55,181,255,0.3)`, paddingLeft: '10px' }}>
                  {question.trim()}
                </p>
                <label style={labelStyle} htmlFor="qa-email">Your email</label>
                <input
                  id="qa-email"
                  className="qa-input"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter' && stage === 'nomatch') { e.preventDefault(); submitUnanswered(); } }}
                  placeholder="you@example.com"
                  disabled={stage === 'sending'}
                  style={{ ...inputStyle, marginBottom: '10px' }}
                />
                {error && <ErrorLine text={error} />}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={submitUnanswered} disabled={stage === 'sending'} className="qa-btn" style={{ ...primaryBtn, flex: 1, opacity: stage === 'sending' ? 0.6 : 1, cursor: stage === 'sending' ? 'wait' : 'pointer' }}>
                    {stage === 'sending' ? 'Sending…' : 'Send my question'}
                  </button>
                  <button onClick={reset} className="qa-ghost" style={ghostBtn}>
                    Back
                  </button>
                </div>
              </>
            )}

            {stage === 'sent' && (
              <>
                <p style={{ fontSize: '15px', fontWeight: 800, color: BLUE2, margin: '0 0 8px' }}>
                  Your question is on its way. ✓
                </p>
                <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.7, margin: '0 0 14px' }}>
                  It goes straight to the Smarter Goalie team, and the answer comes back
                  to your inbox — written by a person, not a machine.
                </p>
                <button onClick={reset} className="qa-ghost" style={{ ...ghostBtn, width: '100%' }}>
                  Ask another question
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p style={{ fontSize: '12px', color: '#f87171', margin: '0 0 10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', padding: '8px 12px' }}>
      {text}
    </p>
  );
}
