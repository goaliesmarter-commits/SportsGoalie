'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScrollStack, { ScrollStackItem } from '@/components/ScrollStack/ScrollStack';
import { TestimonialsSection } from '@/components/ui/testimonials-with-marquee';
import { GalleryHoverCarousel, type GalleryCarouselItem } from '@/components/ui/gallery-hover-carousel';
import { ToolboxSection } from '@/components/landing/toolbox-section';
import { Network, Lock, Filter, TrendingUp, Users, Trophy, Play, Pause, Menu, X } from 'lucide-react';

/** Coach Mike clip — drop `7-pillars-video.mp4` into /public before go-live on THE 7 PILLARS card */
const SEVEN_PILLARS_VIDEO_SRC = '/7-pillars-video.mp4';
const SEVEN_PILLARS_VIDEO_POSTER = '/7-pillars.png';

function FeatureVideoPanel({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video || !videoReady) return;
    if (video.paused) {
      await video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div
      className="relative h-44 md:h-full overflow-hidden"
      style={{ background: '#020e2e' }}
      role="region"
      aria-label={label}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${poster}")` }}
        aria-hidden={videoReady}
      />
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        onLoadedData={() => setVideoReady(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!videoReady && (
        <div
          className="absolute inset-0 flex items-end justify-start p-4"
          style={{ background: 'linear-gradient(to top, rgba(0,15,40,0.85), transparent)' }}
        >
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ background: 'rgba(55,181,255,0.15)', color: '#37b5ff', border: '1px solid rgba(55,181,255,0.3)' }}
          >
            Coach Mike video coming soon
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={() => void togglePlayback()}
        disabled={!videoReady}
        className="absolute inset-0 flex items-center justify-center transition-opacity"
        style={{
          background: playing || !videoReady ? 'transparent' : 'rgba(0,15,40,0.35)',
          opacity: playing && videoReady ? 0 : 1,
          cursor: videoReady ? 'pointer' : 'default',
        }}
        onMouseEnter={e => { if (videoReady) e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { if (videoReady && playing) e.currentTarget.style.opacity = '0'; }}
        aria-label={playing ? 'Pause video' : 'Play video'}
      >
        {videoReady && (
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(55,181,255,0.9)', color: '#000f28', boxShadow: '0 4px 24px rgba(55,181,255,0.4)' }}
          >
            {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
          </span>
        )}
      </button>
    </div>
  );
}

const MIND_VAULT_ITEMS: GalleryCarouselItem[] = [
  {
    id: 'gem-1',
    label: 'THE FOUNDATION',
    title: 'What is your foundation built on?',
    quote: 'Regardless how technically strong you are. If the mind is not the strongest tool you have, then what is your foundation built on?',
    accent: '#bde4ff',
    bg: 'linear-gradient(145deg, #1562ea 0%, #0d44c2 55%, #0a2e9a 100%)',
    WatermarkIcon: Network,
  },
  {
    id: 'gem-2',
    label: 'THE MIND-VAULT',
    title: 'Where only the most valuable thoughts are kept.',
    quote: 'The discipline of building where only the most valuable foundational thoughts and behaviors are kept. For game performance. And for life in general.',
    accent: '#a8ecff',
    bg: 'linear-gradient(145deg, #0892cc 0%, #0672ac 55%, #044e84 100%)',
    WatermarkIcon: Lock,
  },
  {
    id: 'gem-3',
    label: 'YOUR FILTERS',
    title: 'Logic. Math. Science. Every read.',
    quote: 'Logic, Common Sense, Math, and Science become your filters, applied to every read, every shift, every decision.',
    accent: '#c8e8ff',
    bg: 'linear-gradient(145deg, #0c3ed6 0%, #0828ae 55%, #061a86 100%)',
    WatermarkIcon: Filter,
  },
  {
    id: 'gem-4',
    label: 'PERFORMANCE VS OUTCOME',
    title: 'You control one. Not the other.',
    quote: 'Learn the difference between performance and outcome, and understand why the goalie controls one, not the other.',
    accent: '#b8ddff',
    bg: 'linear-gradient(145deg, #1e72e8 0%, #1452c8 55%, #0e3aa8 100%)',
    WatermarkIcon: TrendingUp,
  },
  {
    id: 'gem-5',
    label: 'THE BENCH',
    title: 'How the goalie goes, the bench follows.',
    quote: 'How the goalie goes reflects on the bench. A solid goalie lifts the bench. An inconsistent goalie deflates it.',
    accent: '#9ed8f8',
    bg: 'linear-gradient(145deg, #067ab8 0%, #055898 55%, #033878 100%)',
    WatermarkIcon: Users,
  },
  {
    id: 'gem-6',
    label: 'SIX DECADES OF ORIGINAL IP',
    title: 'One foundation. Sixty years. Proven.',
    quote: 'One foundation. Built over sixty years. Proven on every goalie it has ever touched. The MIND-VAULT is yours to build.',
    accent: '#c0d8ff',
    bg: 'linear-gradient(145deg, #2248c8 0%, #1630a8 55%, #102088 100%)',
    WatermarkIcon: Trophy,
  },
];

export default function Home() {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const testimonials = [
    {
      author: {
        name: 'Tyler Bouchard',
        handle: '@tylerbouchard_g',
        avatar:
          'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&h=150&fit=crop&crop=face',
      },
      text: 'The angle-mark system changed how I read plays entirely. I used to guess my positioning. Now I own my crease with confidence every game.',
    },
    {
      author: {
        name: 'Sandra Lafleur',
        handle: '@sandraL_hockeymom',
        avatar:
          'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&h=150&fit=crop&crop=face',
      },
      text: 'My son used to come off the ice frustrated with no idea what went wrong. Now he logs his sessions, reviews the feedback, and shows up next practice with a real plan.',
    },
    {
      author: {
        name: 'Coach Rémi Tremblay',
        handle: '@remitremblay_goalie',
        avatar:
          'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
      },
      text: 'I coach AAA midget goalies in Québec and this platform fills a gap nothing else does. The charting tools give me data I can actually coach from, not just gut feelings.',
    },
    {
      author: {
        name: 'Kaitlyn MacPherson',
        handle: '@kaitlyn_saves',
        avatar:
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
      },
      text: 'As a female goalie in a program that rarely focuses on us specifically, Smarter Goalie finally feels like it was built for me. The seven-point system alone is worth it.',
    },
    {
      author: {
        name: 'Derek Kowalski',
        handle: '@dkowalski_pads',
        avatar:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      },
      text: 'I\'ve been playing rep hockey in Ontario for six years. Nothing has improved my rebound control and breakout reading faster than the video quizzes on this platform.',
    },
    {
      author: {
        name: 'Lucie Gagnon',
        handle: '@lucieg_parentBC',
        avatar:
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      },
      text: 'The coach sends weekly notes through the app and I can actually follow along with my daughter\'s development. For the first time I feel like part of her training, not just a driver.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section
        className="relative min-h-screen overflow-hidden flex flex-col"
        style={{ backgroundColor: '#020e2e' }}
      >
        {/* Background image — mobile: cover centred on goalie */}
        <div
          className="absolute inset-0 md:hidden"
          style={{
            backgroundImage: 'url("/quality.png")',
            backgroundSize: 'cover',
            backgroundPosition: '72% center',
            backgroundRepeat: 'no-repeat',
            zIndex: 0,
            filter: 'brightness(0.80) saturate(1.1)',
          }}
        />
        {/* Background image — desktop: goalie fills right half */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            backgroundImage: 'url("/quality.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
            zIndex: 0,
            filter: 'brightness(0.85) saturate(1.1)',
          }}
        />

        {/* Desktop overlay — left-to-right gradient */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background: 'linear-gradient(to right, rgba(2,18,60,1) 0%, rgba(2,15,52,0.95) 35%, rgba(2,10,38,0.18) 58%, rgba(2,6,23,0.0) 80%)',
            zIndex: 1,
          }}
        />
        {/* Mobile overlay — lighter so the goalie shows through */}
        <div
          className="absolute inset-0 md:hidden"
          style={{ background: 'linear-gradient(to bottom, rgba(2,18,60,0.55) 0%, rgba(2,18,60,0.45) 45%, rgba(2,10,38,0.75) 100%)', zIndex: 1 }}
        />

        {/* Bottom fade into next section */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(2,6,23,0.6) 85%, #000f28 100%)', zIndex: 2 }}
        />

        {/* ── NAV BAR ── */}
        <nav className="relative flex items-center justify-between px-5 md:px-12 py-5" style={{ zIndex: 10 }}>
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#37b5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="#000f28" />
              </svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              SMARTER <span style={{ color: '#37b5ff' }}>GOALIE</span>
            </span>
          </div>

          {/* Nav links — desktop only */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Features', action: () => { const el = document.getElementById('features'); if (el) el.scrollIntoView({ behavior: 'smooth' }); } },
              { label: 'About', action: () => router.push('/who-we-are') },
            ].map(({ label, action }) => (
              <button key={label} onClick={action} style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', cursor: 'pointer', letterSpacing: '0.5px', transition: 'color 0.15s', background: 'none', border: 'none' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#37b5ff')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)')}
              >{label}</button>
            ))}
          </div>

          {/* Right side: Login + mobile hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/auth/login')}
              className="hover:opacity-90 transition-opacity"
              style={{ background: '#37b5ff', color: '#000f28', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}
            >
              Login
            </button>
            <button
              className="flex items-center justify-center md:hidden"
              onClick={() => setMobileNavOpen(o => !o)}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', padding: '8px', color: '#fff', minWidth: '40px', minHeight: '40px' }}
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(2,14,46,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '8px 20px 20px', zIndex: 9 }}>
            {[
              { label: 'Features', action: () => { setMobileNavOpen(false); const el = document.getElementById('features'); if (el) el.scrollIntoView({ behavior: 'smooth' }); } },
              { label: 'About', action: () => { router.push('/who-we-are'); setMobileNavOpen(false); } },
              { label: 'Contact', action: () => { router.push('/contact'); setMobileNavOpen(false); } },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', padding: '16px 0' }}
              >{label}</button>
            ))}
          </div>
        )}

        {/* ── HERO CONTENT ── */}
        <div className="relative flex-1 flex items-center" style={{ zIndex: 10 }}>
          <div className="w-full max-w-7xl mx-auto pl-4 md:pl-6 pr-6 md:pr-16 py-8 md:py-12">
            <div className="w-full md:max-w-[600px]">

              {/* Eyebrow */}
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#37b5ff', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '14px' }}>
                WELCOME TO
              </p>

              {/* Brand name — italic, SMARTER=blue, GOALIE=white */}
              <h1
                className="font-black uppercase italic leading-none mb-5"
                style={{ fontSize: 'clamp(48px, 8vw, 96px)', letterSpacing: '-0.03em', lineHeight: 0.92, fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}
              >
                <span style={{ display: 'block', color: '#42a5f5' }}>SMARTER</span>
                <span style={{ display: 'block', color: '#ffffff' }}>GOALIE</span>
              </h1>

              {/* Full-width divider */}
              <div style={{ width: '100%', maxWidth: '520px', height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '24px' }} />

              {/* Sub-headline — large bold */}
              <h2
                className="font-black uppercase leading-tight mb-3"
                style={{ fontSize: 'clamp(18px, 2.6vw, 32px)', lineHeight: 1.15, color: '#ffffff', letterSpacing: '-0.01em' }}
              >
                THE COMPLETE DEVELOPMENT SUPPORT SYSTEM GOALTENDING NEVER HAD.
              </h2>

              <p
                className="uppercase font-semibold mb-8"
                style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', fontSize: '11px' }}
              >
                It meets you where you are — and takes you where you&rsquo;re going.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Video button */}
                <button
                  className="flex items-center gap-3 cursor-pointer transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 26px 8px 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', borderRadius: '999px', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                >
                  <span className="flex items-center justify-center shrink-0" style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                    <Play size={14} fill="#020617" color="#020617" style={{ marginLeft: '2px' }} />
                  </span>
                  COACH MIKE
                </button>

                {/* Primary CTA */}
                <button
                  onClick={() => router.push('/explain')}
                  className="transition-all duration-200"
                  style={{ background: '#42a5f5', color: '#fff', fontWeight: 800, fontSize: '12px', letterSpacing: '0.15em', padding: '14px 32px', textTransform: 'uppercase', borderRadius: '12px', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', boxShadow: '0 0 24px rgba(66,165,245,0.45)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(66,165,245,0.7)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(66,165,245,0.45)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
                >
                  LET US EXPLAIN →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom brand watermark */}
        <div className="relative pb-6 flex justify-center md:justify-end md:px-12" style={{ zIndex: 2 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.15)', letterSpacing: '3px', textTransform: 'uppercase' }}>
            © SMARTER GOALIE
          </span>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <>
          <section id="features" className="pt-20 pb-0" style={{ background: 'linear-gradient(180deg, #000f28 0%, #041530 100%)' }}>
            <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-24">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-[3px] uppercase mb-3" style={{ background: 'rgba(55,181,255,0.1)', color: '#37b5ff', border: '1px solid rgba(55,181,255,0.25)' }}>FEATURES</span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4">NOTHING LEFT TO THE IMAGINATION.</h2>
              <p className="text-zinc-300 text-base md:text-lg leading-relaxed max-w-2xl mb-3">
                We get to know you. You get to know your game. You grow — and the system grows with you. And the best part? It&rsquo;s always there, for as long as you need it.
              </p>
              <p className="uppercase font-semibold text-sm md:text-base" style={{ color: '#37b5ff', letterSpacing: '0.15em' }}>
                The support system that keeps you sharp.
              </p>
            </div>
            <ScrollStack useWindowScroll={true} itemDistance={200} itemScale={0.02} itemStackDistance={30} stackPosition="72px" scaleEndPosition="15%" baseScale={0.95}>
              {/* 1 — The 7 Pillars of Intelligent Goaltending */}
              <ScrollStackItem>
                <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
                  <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'rgb(6,30,70)', border: '1px solid rgba(55,181,255,0.45)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(55,181,255,0.08)' }}>
                    <div className="grid md:grid-cols-2 gap-0 items-center md:h-[560px]">
                      <FeatureVideoPanel
                        src={SEVEN_PILLARS_VIDEO_SRC}
                        poster={SEVEN_PILLARS_VIDEO_POSTER}
                        label="The 7 Pillars introduction video"
                      />
                      <div className="p-5 md:p-12 flex flex-col justify-center">
                        <div className="text-right mb-4"><span className="text-lg font-semibold" style={{ color: '#37b5ff' }}>1/5</span></div>
                        <h3 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4">THE 7 PILLARS</h3>
                        <p className="text-lg md:text-xl mb-4" style={{ color: '#37b5ff' }}>
                          Raw talent is one thing. Building it into a SMARTER goaltender is another.
                        </p>
                        <p className="text-zinc-400 text-base mb-5">Through 7 Pillars, we lay the foundation.</p>
                        <p className="text-zinc-300 leading-relaxed mb-6">
                          We build INTELLIGENT ATHLETIC GOALTENDERS through 7 Pillars — anchored by two UNIQUE, PROVEN positional systems: the Seven Angle-Mark System (7AMS) above the icing line and the 6 Zone System (6ZS) below it. From MIND-SET to Skating Tech, Form Tech, Game Performance, and LIFE STYLE — mastering each pillar builds lasting consistency.
                        </p>
                        <button className="text-white px-8 py-3 rounded-full transition-all duration-300 font-semibold inline-flex items-center gap-2 w-fit hover:opacity-85" style={{ background: 'linear-gradient(135deg, #37b5ff 0%, #0ea5e9 100%)', boxShadow: '0 4px 16px rgba(55,181,255,0.25)' }}><span className="w-2 h-2 bg-white rounded-full"></span>More about this ›</button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollStackItem>
              {/* 2 — Video Analysis */}
              <ScrollStackItem>
                <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
                  <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'rgb(6,30,70)', border: '1px solid rgba(55,181,255,0.45)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(55,181,255,0.08)' }}>
                    <div className="grid md:grid-cols-2 gap-0 items-center md:h-[560px]">
                      <div className="h-44 md:h-full bg-cover bg-center" style={{ backgroundImage: 'url("/feature_2.png")' }}></div>
                      <div className="p-5 md:px-10 md:py-8 flex flex-col justify-center">
                        <div className="text-right mb-2"><span className="text-lg font-semibold" style={{ color: '#37b5ff' }}>2/5</span></div>
                        <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">VIDEO NEVER LIES</h3>
                        <p className="text-lg md:text-xl mb-4" style={{ color: '#37b5ff' }}>Seeing Is Believing</p>
                        <p className="text-zinc-400 text-sm mb-4">
                          Improve <strong className="text-white">10%</strong>, gain <strong className="text-white">20%</strong> from seeing yourself, go <strong className="text-white">50%</strong> further, or start at <strong className="text-white">100%</strong>. <strong className="text-white">We know how.</strong> Four decades of video analysis. <strong className="text-white">Immediate Development Impact.</strong>
                        </p>
                        <p className="text-zinc-300 leading-relaxed mb-6">
                          Home, in transit, at school, on laptop or phone. <strong className="text-white">That&rsquo;s the Smarter Goalie Way.</strong><sup className="text-[10px] text-zinc-400 ml-0.5">™</sup> Tech analysis reaches the cognitive mind through movement and mechanics. Once gathered, your improvement design is ready. <strong className="text-white">Accelerated Results.</strong> See it, understand it, implement it.
                        </p>
                        <button className="mt-2 text-white px-8 py-3 rounded-full transition-all duration-300 font-semibold inline-flex items-center gap-2 w-fit shrink-0 hover:opacity-85" style={{ background: 'linear-gradient(135deg, #37b5ff 0%, #0ea5e9 100%)', boxShadow: '0 4px 16px rgba(55,181,255,0.25)' }}><span className="w-2 h-2 bg-white rounded-full"></span>More about this ›</button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollStackItem>
              {/* 3 — Performance Analytics & Gap Management */}
              <ScrollStackItem>
                <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
                  <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'rgb(6,30,70)', border: '1px solid rgba(55,181,255,0.45)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(55,181,255,0.08)' }}>
                    <div className="grid md:grid-cols-2 gap-0 items-center md:h-[560px]">
                      <div className="h-44 md:h-full bg-cover bg-center" style={{ backgroundImage: 'url("/feature_3.png")' }}></div>
                      <div className="p-5 md:p-12 flex flex-col justify-center">
                        <div className="text-right mb-4"><span className="text-lg font-semibold" style={{ color: '#37b5ff' }}>3/5</span></div>
                        <h3 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4">ANALYTICS & GAP MANAGEMENT</h3>
                        <p className="text-lg md:text-xl mb-6" style={{ color: '#37b5ff' }}>Gaps are not failures — gaps are the roadmap to building your consistency in performance.</p>
                        <p className="text-zinc-300 leading-relaxed mb-6">
                          The charting systems build your personal Baseline Profile. Your knowledge and skill base is now alive. Smarter Goalie&rsquo;s intuitive system is designed to grow your knowledge base and your tech game with methods built to accelerate your development.
                        </p>
                        <button className="text-white px-8 py-3 rounded-full transition-all duration-300 font-semibold inline-flex items-center gap-2 w-fit hover:opacity-85" style={{ background: 'linear-gradient(135deg, #37b5ff 0%, #0ea5e9 100%)', boxShadow: '0 4px 16px rgba(55,181,255,0.25)' }}><span className="w-2 h-2 bg-white rounded-full"></span>More about this ›</button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollStackItem>
              {/* 4 — Goaltending: A Chess Game */}
              <ScrollStackItem>
                <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
                  <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'rgb(6,30,70)', border: '1px solid rgba(55,181,255,0.45)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(55,181,255,0.08)' }}>
                    <div className="grid md:grid-cols-2 gap-0 items-center md:h-[560px]">
                      <div className="h-44 md:h-full bg-cover bg-center" style={{ backgroundImage: 'url("/feature_4.png")' }}></div>
                      <div className="p-5 md:px-10 md:py-8 flex flex-col justify-center">
                        <div className="text-right mb-2"><span className="text-lg font-semibold" style={{ color: '#37b5ff' }}>4/5</span></div>
                        <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">THE CHESS GAME</h3>
                        <p className="text-lg md:text-xl mb-4" style={{ color: '#37b5ff' }}>Think Smart. Play Smarter.</p>
                        <p className="text-zinc-300 leading-relaxed mb-4">
                          Knowledge is power, and Smarter Goalie is knowledge-driven. Most goalies are playing a 1000-piece puzzle with a fragmented picture and no border pieces. They&rsquo;ve got talent scattered everywhere and no frame to build it on. We hand you the borders first, then fill in the picture until the whole game comes into focus.
                        </p>
                        <p className="text-zinc-400 text-sm mb-5">
                          Chess is won in the mind. So is goaltending. Anyone can move the pieces. Anyone can stop a puck. A Smarter Goalie knows the options, anticipates the play, dictates the terms and holds the cards. Everyone reacts. A Smarter Goalie decides when, why, where, and how.
                        </p>
                        <button className="text-white px-8 py-3 rounded-full transition-all duration-300 font-semibold inline-flex items-center gap-2 w-fit shrink-0 hover:opacity-85" style={{ background: 'linear-gradient(135deg, #37b5ff 0%, #0ea5e9 100%)', boxShadow: '0 4px 16px rgba(55,181,255,0.25)' }}><span className="w-2 h-2 bg-white rounded-full"></span>More about this ›</button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollStackItem>
              {/* 5 — The Mirror Never Lies */}
              <ScrollStackItem>
                <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
                  <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'rgb(6,30,70)', border: '1px solid rgba(55,181,255,0.45)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(55,181,255,0.08)' }}>
                    <div className="grid md:grid-cols-2 gap-0 items-center md:h-[560px]">
                      <div className="h-44 md:h-full bg-cover bg-center" style={{ backgroundImage: 'url("/feature_5.png")' }}></div>
                      <div className="p-5 md:px-8 md:py-6 flex flex-col justify-center">
                        <div className="text-right mb-1"><span className="text-lg font-semibold" style={{ color: '#37b5ff' }}>5/5</span></div>
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">THE MIRROR NEVER LIES</h3>
                        <p className="text-base md:text-lg mb-3 font-semibold" style={{ color: '#37b5ff' }}>Discover. Understand. Know. Own. Maintain.</p>
                        <p className="text-zinc-300 leading-relaxed mb-3">
                          This is where it all comes together. After the layers, the principles, the systems, the reads, Smarter Goalie hands it back simplified in a single living chart. You log your game period by period and rate the factors that decide goaltending. The number isn&rsquo;t a grade. It&rsquo;s a mirror that shows exactly where you stand.
                        </p>
                        <p className="text-zinc-400 text-sm leading-snug mb-6">
                          When a rating dips, the system doesn&rsquo;t scold. It opens the precise lessons that lift that gap, drawn from everything you&rsquo;ve learned. Self-aware in the moment. Self-correcting by design. Layers made simple. Foundations built layer by layer, and a starter is born.
                        </p>
                        <button className="mt-2 text-white px-8 py-3 rounded-full transition-all duration-300 font-semibold inline-flex items-center gap-2 w-fit shrink-0 hover:opacity-85" style={{ background: 'linear-gradient(135deg, #37b5ff 0%, #0ea5e9 100%)', boxShadow: '0 4px 16px rgba(55,181,255,0.25)' }}><span className="w-2 h-2 bg-white rounded-full"></span>More about this ›</button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollStackItem>
            </ScrollStack>
          </section>

          {/* Scrolling Marquee */}
          <section className="py-6 overflow-hidden" style={{ background: '#041530', borderTop: '1px solid rgba(55,181,255,0.12)', borderBottom: '1px solid rgba(55,181,255,0.12)' }}>
            <div className="relative flex" style={{ '--duration': '30s', '--gap': '2rem' } as React.CSSProperties}>
              <div className="flex shrink-0 animate-marquee items-center gap-8">
                {['MIND-SET', 'MIND-VAULT', 'SKATING TECH', 'ANGLE-MARK SYSTEM', '6 ZONE SYSTEM', 'FORM TECH', 'PERFORMANCE CHARTING', 'GAME IQ', 'MIND-SET', 'MIND-VAULT', 'SKATING TECH', 'ANGLE-MARK SYSTEM', '6 ZONE SYSTEM', 'FORM TECH', 'PERFORMANCE CHARTING', 'GAME IQ'].map((text, i) => (
                  <span key={i} className="flex items-center gap-8 whitespace-nowrap">
                    <span className="text-xl md:text-2xl font-bold tracking-wide transition-colors duration-300 cursor-default" style={{ color: 'rgba(255,255,255,0.55)' }}>{text}</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#37b5ff' }}></span>
                  </span>
                ))}
              </div>
              <div className="flex shrink-0 animate-marquee items-center gap-8" aria-hidden="true">
                {['MIND-SET', 'MIND-VAULT', 'SKATING TECH', 'ANGLE-MARK SYSTEM', '6 ZONE SYSTEM', 'FORM TECH', 'PERFORMANCE CHARTING', 'GAME IQ', 'MIND-SET', 'MIND-VAULT', 'SKATING TECH', 'ANGLE-MARK SYSTEM', '6 ZONE SYSTEM', 'FORM TECH', 'PERFORMANCE CHARTING', 'GAME IQ'].map((text, i) => (
                  <span key={i} className="flex items-center gap-8 whitespace-nowrap">
                    <span className="text-xl md:text-2xl font-bold tracking-wide transition-colors duration-300 cursor-default" style={{ color: 'rgba(255,255,255,0.55)' }}>{text}</span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#37b5ff' }}></span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* MIND-VAULT GEM Panel */}
          <GalleryHoverCarousel
            eyebrow="THE MIND-VAULT, DAILY GEMS"
            heading="Six Foundations. One Complete System."
            subheading="The mental pillars every goalie needs, built into your game, your mindset, and your life."
            items={MIND_VAULT_ITEMS}
          />

          <ToolboxSection />

          <TestimonialsSection
            eyebrow="COMMUNITY"
            title="Voices From The Smarter Goalie Community"
            description="Goalies, parents, and coaches trust Smarter Goalie to sharpen their game, track real progress, and train with purpose."
            testimonials={testimonials}
            className="!bg-[#000f28]"
            dark={true}
            gradientColor="#000f28"
          />
      </>

    </div>
  );
}
