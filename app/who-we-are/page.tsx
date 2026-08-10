'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Footer7 } from '@/components/footer-7';
import { PublicPageNav } from '@/components/PublicPageNav';
import dynamic from 'next/dynamic';
const MeshGradientBg = dynamic(
  () => import('@/components/ui/mesh-gradient-bg').then(m => ({ default: m.MeshGradientBg })),
  { ssr: false, loading: () => null }
);

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const BLUE3 = '#0ea5e9';
const BLUE4 = '#7dd3fc';
const NAVY = '#000f28';
const NAVY2 = '#041530';
const BODY_TEXT = 'rgba(200,230,255,0.84)';

const heroContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 56 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const ACT_ACCENTS = [BLUE, BLUE3, BLUE2, BLUE4, BLUE, BLUE3, BLUE2] as const;

function actBackground(x1: number, y1: number, x2: number, y2: number) {
  return `radial-gradient(ellipse at ${x1}% ${y1}%, rgba(55,181,255,0.14) 0%, transparent 55%),
          radial-gradient(ellipse at ${x2}% ${y2}%, rgba(14,165,233,0.10) 0%, transparent 45%),
          linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)`;
}

function VoiceButton({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => on && setPlaying(p => !p)}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', background: on ? 'linear-gradient(135deg, rgba(55,181,255,0.14), rgba(96,205,255,0.07))' : 'rgba(255,255,255,0.04)', border: `1px solid ${on ? 'rgba(96,205,255,0.32)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '50px', padding: '9px 18px 9px 10px', color: on ? BLUE2 : '#475569', fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', cursor: on ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: on ? '0 2px 10px rgba(55,181,255,0.12)' : 'none' }}
      >
        <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: on ? `linear-gradient(135deg, ${BLUE}, ${BLUE3})` : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {playing ? <Pause size={10} color="#fff" /> : <Play size={10} color="#fff" fill="#fff" />}
        </span>
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">HEAR COACH MIKE</span>
      </button>
      <button onClick={() => { setOn(v => !v); if (on) setPlaying(false); }} style={{ fontSize: '10px', color: on ? BLUE2 : '#475569', letterSpacing: '1.5px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>
        VOICE {on ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

// Each act bg uses a dark-hued base tinted toward its accent color
// plus a strong ambient radial so the color is visible, not just implied
const ACTS = [
  {
    number: 'ACT ONE',
    title: 'THE ACCIDENT',
    body: [
      'It started in Toronto. House league hockey. I was a defenseman with weak skating, and my coach saw it. He had an epiphany and moved me into net.',
      'We won the championship that year. The next season, my coach changed organizations and brought me with him. We won it again.',
      'Two seasons in net. Two championships. Don\'t ask me how. I just had a feel for reading and reacting. A feel for stopping a puck.',
      'Nobody chose goaltending for me. The pads chose me.',
    ],
    accent: ACT_ACCENTS[0],
    bodyColor: BODY_TEXT,
    bg: actBackground(70, 20, 20, 80),
  },
  {
    number: 'ACT TWO',
    title: '"YOU CAN\'T PLAY HERE"',
    body: [
      'Year three. Before the season, my coach pulled me and my father aside.',
      'My jaw dropped. My eyes went wide.',
    ],
    quote: '"You can\'t play here, Michael."',
    quoteNote: '"I\'m taking you to the Majors. AAA."',
    accent: ACT_ACCENTS[1],
    bodyColor: BODY_TEXT,
    bg: actBackground(60, 35, 25, 75),
  },
  {
    number: 'ACT THREE',
    title: 'THE FIRST TRYOUT',
    body: [
      'AAA tryouts. Twelve goalies. One spot.',
      'For the first time, this was real competition, and I felt something I\'d never felt before. Butterflies. A state I didn\'t recognize, didn\'t have a name for yet. Only later would I understand it: that\'s what it feels like to step up to the real thing. To truly compete.',
      'Twelve goalies tried out. I made it.',
      'And I was the starter.',
    ],
    accent: ACT_ACCENTS[2],
    bodyColor: BODY_TEXT,
    bg: actBackground(30, 70, 75, 20),
  },
  {
    number: 'ACT FOUR',
    title: 'AGE 14: THE ANALYTICAL AWAKENING',
    body: [
      'At fourteen, I picked up martial arts. Not because hockey told me to, but because something in it spoke to me.',
      'It trained both sides of the body, equal strength, equal precision, and in doing that, it opened my analytical mind. I began to understand the body in a more definitive, more defined training format: the left side and the right side, the left brain and the right brain, built deliberately, built equally.',
      'That discipline became a lens. I started translating it back to the net, breaking the goaltending position down more precisely than I ever had. If the body could be trained with that kind of definition, so could the position. Every movement could be understood. Every read could be defined.',
      'And four questions emerged, the four that would come to define the entire Smarter Goalie system:',
    ],
    highlight: 'WHERE. WHEN. WHY. HOW.',
    highlightNote: 'Every read. Every save. Every movement. In that order.',
    accent: ACT_ACCENTS[3],
    bodyColor: BODY_TEXT,
    bg: actBackground(55, 30, 20, 80),
  },
  {
    number: 'ACT FIVE',
    title: 'AGE 21: THE 7AMS GENESIS',
    body: [
      'I adopted an Olympic mindset early, long before Europe. As a youth, watching the Olympics, I took on the attitude that would define everything that came after: be my personal best, train with purpose.',
      'And here\'s the truth no one tells you about coaches: the first goalie I ever taught was myself.',
      'The milestone that made it real came at twenty-one, in Germany. I found a book on goaltending by Dave Dryden, brother of Hall of Famer Ken Dryden. One photo in that book changed my life: an overhead view of the rink, a single line drawn from the center of the net to the face-off circle at center ice.',
      'The ice seen from above for the first time. I saw the geometry no one else was talking about.',
      'In that moment, the 7 Angle-Mark System was born. Not a theory. A discovery. My framework stopped being personal notes that day and became a real teaching architecture. That was the moment Smarter Goalie, though it wouldn\'t carry the name for decades, was born as a system.',
    ],
    accent: ACT_ACCENTS[4],
    bodyColor: BODY_TEXT,
    bg: actBackground(70, 65, 25, 20),
  },
  {
    number: 'ACT SIX',
    title: 'NINE YEARS PROFESSIONAL',
    body: [
      'At twenty-one, I was offered the chance to play professional hockey in Europe. I took it. Nine years.',
      'I never gave up the starter\'s role, not in my youth, not through Junior, not in Europe. I respected my goalie partners, but that net was mine, and I wasn\'t giving it away. If they wanted it, they\'d have to beat me for it. I competed in games, and I competed in practice. Every day.',
      'That\'s where the consistency came from, the efforts and the disciplines I held to, whether the lights were on or the rink was empty.',
      'And through all of it, I never stopped studying. Still refining. Still applying the four questions to every goalie I could find, where, when, why, how.',
      'The system grew the only way it could, Pillar by Pillar. Each one built from a layer of my own experience: my own development, my own mistakes, my own breakthroughs. What didn\'t exist, I created. And what I created, I tested on myself before I ever taught it to another soul.',
      'Every Pillar in the Smarter Goalie system was designed and developed for me, by me, because no one else was building one.',
    ],
    accent: ACT_ACCENTS[5],
    bodyColor: BODY_TEXT,
    bg: actBackground(65, 30, 15, 75),
  },
  {
    number: 'ACT SEVEN',
    title: 'THE CALLING',
    body: [
      'Year six of my professional career. A phone call to my best friend back in Canada. I told him I didn\'t know what I\'d do when I stopped playing.',
      'He answered without hesitating:',
    ],
    quote: '"Coach. Teach your game to others."',
    quoteNote: 'The mission became real that day. What had been built privately for six decades now had a purpose beyond the man who built it.',
    accent: ACT_ACCENTS[6],
    bodyColor: BODY_TEXT,
    bg: actBackground(60, 35, 25, 75),
  },
];

const ACT_EIGHT = {
  number: 'ACT EIGHT',
  title: 'THE DREAM',
  body: [
    'I had a dream, to make a difference. To have an impact. To help develop everyone who joins in.',
    'Not just to build goalies. To build self-aware, disciplined people, achievers who know anything is possible with the right MINDSET. To build confidence and self-esteem that takes doubt and fear and throws them in the trash where they belong.',
    'And to forge the rare athlete who doesn\'t flinch from the toughest seat in sport, who chooses the net, owns the pressure, and turns it into power. Because goaltending is unique in all of sport. It builds a rare kind of character: dynamic in volume, soft in approach. One that leads by example, on the ice and off of it.',
    'That\'s what I\'m really building. Not just a goaltender. A person who can read the game, read themselves, and lead, wherever life takes them.',
  ],
  accent: BLUE4,
  bodyColor: BODY_TEXT,
  bg: actBackground(40, 25, 75, 75),
};

const STATS = [
  { value: '60+', label: 'Years\nBuilding', color: BLUE },
  { value: '7',   label: 'Pillars\nSystem',  color: BLUE2 },
  { value: '9',   label: 'Pro\nSeasons',     color: BLUE3 },
  { value: '100', label: 'Goalies\nSelected', color: BLUE4 },
];

export default function WhoWeArePage() {
  const router = useRouter();

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: '#fff' }}>

      <PublicPageNav />

      {/* ── HERO ── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: 'clamp(80px,10vw,120px)', paddingBottom: 'clamp(60px,8vw,100px)', background: 'linear-gradient(145deg, #081d3f 0%, #0a2248 55%, #071840 100%)' }}>
        <MeshGradientBg
          colors={['#060f28', '#0f2847', '#1F3864', '#1850b4', '#37b5ff', '#0a2040']}
          distortion={0.9}
          swirl={0.7}
          speed={0.38}
          veilOpacity={0.48}
        />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', padding: '7px 13px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.3px', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(55,181,255,0.14)'; el.style.borderColor = 'rgba(55,181,255,0.45)'; el.style.color = '#fff'; }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.08)'; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.color = 'rgba(255,255,255,0.8)'; }}
        >
          <ChevronLeft size={13} />Back
        </button>

        <motion.div
          className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full"
          style={{ position: 'relative', zIndex: 4 }}
          variants={heroContainer}
          initial="hidden"
          animate="show"
        >
          {/* Badge */}
          <motion.div
            variants={heroItem}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '50px', padding: '8px 20px', marginBottom: '28px' }}
          >
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: BLUE, boxShadow: '0 0 0 3px rgba(55,181,255,0.2)', flexShrink: 0 }} />
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3.5px', color: BLUE, margin: 0, textTransform: 'uppercase' }}>BUILT BY A GOALIE. FOR MOTIVATED GOALIES.</p>
          </motion.div>

          {/* Blue accent rule */}
          <motion.div
            variants={heroItem}
            style={{ display: 'flex', height: '3px', width: '220px', borderRadius: '4px', overflow: 'hidden', marginBottom: '28px', gap: '2px' }}
          >
            {[BLUE, BLUE2, BLUE3, BLUE4].map(c => (
              <div key={c} style={{ flex: 1, background: c, boxShadow: `0 0 8px ${c}` }} />
            ))}
          </motion.div>

          <motion.h1
            variants={heroItem}
            style={{ fontSize: 'clamp(36px, 7vw, 96px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', margin: '0 0 20px', color: '#fff' }}
          >
            THE COACH<br />
            <span style={{ color: BLUE, textShadow: '0 0 40px rgba(55,181,255,0.47), 0 0 80px rgba(55,181,255,0.2)' }}>MIKE</span>
            {' '}
            <span style={{ color: '#fff' }}>STORY</span>
          </motion.h1>

          <motion.p
            variants={heroItem}
            style={{ fontSize: 'clamp(20px, 2.8vw, 34px)', fontWeight: 800, color: BLUE2, margin: '0 0 28px', letterSpacing: '-0.01em', textShadow: '0 0 20px rgba(96,205,255,0.33)' }}
          >
            Six decades. Seven pillars. One system built from nothing.
          </motion.p>
          <motion.p
            variants={heroItem}
            style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, maxWidth: '560px', margin: '0 0 44px' }}
          >
            No template was handed to him. No coach built it for him. What you are about to read is how a boy in a house-league net became the person who built the most complete goaltending development system in the world, and the receipts to prove it.
          </motion.p>

          {/* Act dots */}
          <motion.div
            variants={heroItem}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
          >
            {[...ACTS, ACT_EIGHT].map((act, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: act.accent, boxShadow: `0 0 8px ${act.accent}99, 0 0 16px ${act.accent}44` }} />
                <span style={{ fontSize: '9px', fontWeight: 700, color: act.accent, opacity: 0.6, letterSpacing: '1.5px' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── THE 7 ACTS ── */}
      {ACTS.map((act, i) => (
        <section
          key={i}
          style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(60px,8vw,100px) 0', background: act.bg, borderBottom: `1px solid ${act.accent}25` }}
        >
          {/* Ghost act number */}
          <div style={{ position: 'absolute', right: '-1%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(80px, 18vw, 280px)', fontWeight: 900, fontStyle: 'italic', color: `${act.accent}10`, letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0, overflow: 'hidden', maxWidth: '50%' }}>
            {String(i + 1).padStart(2, '0')}
          </div>

          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '32px' }}>
              {/* Accent bar */}
              <div style={{ width: '6px', minHeight: '80px', background: `linear-gradient(to bottom, ${act.accent}, ${act.accent}55)`, boxShadow: `0 0 20px ${act.accent}cc, 0 0 40px ${act.accent}44`, borderRadius: '3px', flexShrink: 0, marginTop: '4px' }} />
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: act.accent, textTransform: 'uppercase', margin: '0 0 6px', textShadow: `0 0 12px ${act.accent}99` }}>{act.number}</p>
                <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 60px)', fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-0.025em', margin: 0 }}>
                  {act.title}
                </h2>
              </div>
            </div>

            <div style={{ maxWidth: '720px', marginLeft: '22px' }}>
              {act.body.map((para, pi) => (
                <p key={pi} style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: act.bodyColor, lineHeight: 1.85, marginBottom: '16px', fontStyle: 'italic' }}>
                  {para}
                </p>
              ))}

              {'highlight' in act && act.highlight && (
                <div style={{ margin: '32px 0', background: `${act.accent}12`, border: `1px solid ${act.accent}35`, borderLeft: `4px solid ${act.accent}`, borderRadius: '0 12px 12px 0', padding: '20px 24px' }}>
                  <p style={{ fontSize: 'clamp(28px, 5vw, 64px)', fontWeight: 900, color: act.accent, textShadow: `0 0 32px ${act.accent}88, 0 0 60px ${act.accent}33`, letterSpacing: '0.06em', lineHeight: 1.1, margin: '0 0 12px' }}>
                    {act.highlight}
                  </p>
                  {act.highlightNote && (
                    <p style={{ fontSize: 'clamp(14px, 1.8vw, 18px)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
                      {act.highlightNote}
                    </p>
                  )}
                </div>
              )}

              {'quote' in act && act.quote && (
                <div style={{ margin: '28px 0', background: `${act.accent}10`, border: `1px solid ${act.accent}30`, borderLeft: `4px solid ${act.accent}`, borderRadius: '0 12px 12px 0', padding: '20px 24px' }}>
                  <p style={{ fontSize: 'clamp(22px, 3.5vw, 42px)', fontWeight: 900, fontStyle: 'italic', color: act.accent, textShadow: `0 0 24px ${act.accent}77`, lineHeight: 1.2, margin: '0 0 14px' }}>
                    {act.quote}
                  </p>
                  {act.quoteNote && (
                    <p style={{ fontSize: 'clamp(14px, 1.8vw, 18px)', color: act.bodyColor, lineHeight: 1.75, margin: 0 }}>
                      {act.quoteNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom fade line */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(to right, transparent, ${act.accent}55, transparent)`, pointerEvents: 'none' }} />
        </section>
      ))}

      {/* ── PUZZLE METAPHOR CLOSING ── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(60px,8vw,100px) 0',
        background: `
          radial-gradient(ellipse at 10% 15%,  rgba(55,181,255,0.13) 0%, transparent 45%),
          radial-gradient(ellipse at 90% 85%,  rgba(14,165,233,0.12) 0%, transparent 45%),
          radial-gradient(ellipse at 20% 80%,  rgba(96,205,255,0.10) 0%, transparent 40%),
          radial-gradient(ellipse at 80% 10%,  rgba(55,181,255,0.08) 0%, transparent 35%),
          linear-gradient(145deg, ${NAVY} 0%, ${NAVY2} 50%, #020a18 100%)
        ` }}>

        <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(100px, 14vw, 200px)', fontWeight: 900, color: 'rgba(255,255,255,0.022)', letterSpacing: '-6px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}>PUZZLE</div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>

          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '4px', color: BLUE3, textTransform: 'uppercase', marginBottom: '18px', textShadow: '0 0 10px rgba(14,165,233,0.4)' }}>THE PUZZLE CLOSE</p>

          <h2 style={{ fontSize: 'clamp(22px, 4vw, 54px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 36px', maxWidth: '900px' }}>
            IN THE BEGINNING, GOALTENDING WAS LIKE A THOUSAND-PIECE PUZZLE,{' '}
            <span style={{ color: BLUE, textShadow: '0 0 24px rgba(55,181,255,0.33)' }}>NO BORDERS. NO PICTURE. NO BOX.</span>
          </h2>

          <div style={{ marginBottom: '44px' }}>
            <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.85, maxWidth: '720px', marginBottom: '20px', fontStyle: 'italic', borderLeft: '3px solid rgba(55,181,255,0.4)', paddingLeft: '16px' }}>
              No goalie coaches. No systematic breakdowns in book form. Just a position, and a thousand pieces scattered everywhere. Every save a piece. Every angle a piece. Every read, every recovery, every option, a piece. And no one had built the picture to assemble them.
            </p>

            <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.85, maxWidth: '720px', marginBottom: '20px', fontStyle: 'italic', borderLeft: '3px solid rgba(96,205,255,0.4)', paddingLeft: '16px' }}>
              Coach Mike didn&apos;t receive the pieces. He found them, one by one, over six decades. He sorted them. He named them. He built the framework that holds them together: the borders first, then the picture.
            </p>

            <p style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.85, maxWidth: '720px', marginBottom: '28px', fontStyle: 'italic', borderLeft: '3px solid rgba(14,165,233,0.4)', paddingLeft: '16px' }}>
              And notice, puzzles, not a puzzle. Goaltending was never one picture. It&apos;s seven, the 7 Pillars, one complete system.
            </p>

            <div style={{ background: 'rgba(55,181,255,0.06)', border: '1px solid rgba(55,181,255,0.22)', borderLeft: `4px solid ${BLUE}`, borderRadius: '0 16px 16px 0', padding: '28px 32px', maxWidth: '720px' }}>
              <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.9)', lineHeight: 1.75, margin: '0 0 12px', fontStyle: 'italic' }}>
                Built, not borrowed. Found, not given.
              </p>
              <p style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', fontWeight: 900, color: BLUE, textShadow: '0 0 24px rgba(55,181,255,0.33)', lineHeight: 1.3, margin: 0 }}>
                Raw talent is one thing. Building it into a SMARTER goaltender is another.
              </p>
            </div>
          </div>

          <VoiceButton label="HEAR COACH MIKE TELL THIS STORY" />
        </div>
      </section>

      {/* ── ACT EIGHT — THE DREAM ── */}
      <section
        style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(60px,8vw,100px) 0', background: ACT_EIGHT.bg, borderBottom: `1px solid ${ACT_EIGHT.accent}25` }}
      >
        <div style={{ position: 'absolute', right: '-1%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(80px, 18vw, 280px)', fontWeight: 900, fontStyle: 'italic', color: `${ACT_EIGHT.accent}10`, letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0, overflow: 'hidden', maxWidth: '50%' }}>
          08
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '6px', minHeight: '80px', background: `linear-gradient(to bottom, ${ACT_EIGHT.accent}, ${ACT_EIGHT.accent}55)`, boxShadow: `0 0 20px ${ACT_EIGHT.accent}cc, 0 0 40px ${ACT_EIGHT.accent}44`, borderRadius: '3px', flexShrink: 0, marginTop: '4px' }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: ACT_EIGHT.accent, textTransform: 'uppercase', margin: '0 0 6px', textShadow: `0 0 12px ${ACT_EIGHT.accent}99` }}>{ACT_EIGHT.number}</p>
              <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 60px)', fontWeight: 900, color: '#fff', lineHeight: 1.0, letterSpacing: '-0.025em', margin: 0 }}>
                {ACT_EIGHT.title}
              </h2>
            </div>
          </div>

          <div style={{ maxWidth: '720px', marginLeft: '22px' }}>
            {ACT_EIGHT.body.map((para, pi) => (
              <p key={pi} style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: ACT_EIGHT.bodyColor, lineHeight: 1.85, marginBottom: '16px', fontStyle: 'italic' }}>
                {para}
              </p>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(to right, transparent, ${ACT_EIGHT.accent}55, transparent)`, pointerEvents: 'none' }} />
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(60px,8vw,100px) 0', textAlign: 'center',
        background: `
          radial-gradient(ellipse at 85% 10%,  rgba(55,181,255,0.16) 0%, transparent 45%),
          radial-gradient(ellipse at 15% 90%,  rgba(14,165,233,0.14) 0%, transparent 45%),
          radial-gradient(ellipse at 5%  40%,  rgba(96,205,255,0.12) 0%, transparent 40%),
          radial-gradient(ellipse at 90% 70%,  rgba(55,181,255,0.10) 0%, transparent 40%),
          linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)
        ` }}>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 4vw, 48px)', flexWrap: 'wrap', marginBottom: '56px' }}>
            {STATS.map(s => (
              <div key={s.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '80px' }}>
                <span style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, color: s.color, letterSpacing: '-0.03em', lineHeight: 1, textShadow: `0 0 28px ${s.color}77` }}>{s.value}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.4 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Blue accent divider */}
          <div style={{ display: 'flex', height: '2px', width: '200px', margin: '0 auto 40px', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
            {[BLUE, BLUE2, BLUE3, BLUE4].map(c => (
              <div key={c} style={{ flex: 1, background: c, boxShadow: `0 0 6px ${c}` }} />
            ))}
          </div>

          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '4px', color: BLUE2, textTransform: 'uppercase', marginBottom: '20px', textShadow: '0 0 10px rgba(96,205,255,0.33)' }}>WHAT COMES NEXT</p>
          <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 58px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: '24px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            The system is ready.<br />
            <span style={{ color: BLUE, textShadow: '0 0 28px rgba(55,181,255,0.4)' }}>Are you?</span>
          </h2>
          <p style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', color: 'rgba(175,215,238,0.85)', lineHeight: 1.8, maxWidth: '520px', margin: '0 auto 40px' }}>
            Coach Mike is personally selecting the first one hundred goalies to join the Smarter Goalie BUILD experience. The application takes five minutes.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/explain')}
              style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE3})`, color: NAVY, border: 'none', padding: '16px 36px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 4px 28px rgba(55,181,255,0.4)' }}
            >
              SELECT YOUR ROLE →
            </button>
            <button
              onClick={() => router.push('/7-pillars?from=who-we-are')}
              style={{ background: 'rgba(55,181,255,0.12)', color: BLUE2, border: '1px solid rgba(96,205,255,0.4)', padding: '16px 36px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 0 16px rgba(55,181,255,0.12)' }}
            >
              EXPLORE THE SYSTEM
            </button>
          </div>
        </div>
      </section>

      <Footer7 />
    </div>
  );
}
