'use client';

import { Suspense, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Play, Pause, ArrowLeft, ClipboardList, Shield, Users, Target, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Footer7 } from '@/components/footer-7';
import { PublicPageNav } from '@/components/PublicPageNav';
import { TiltCard } from '@/components/ui/tilt-card';
import { ShaderBackground } from '@/components/ui/hero-shader';
import {
  PILLAR_FROM_CONTEXT,
  pillarDetailHref,
  resolvePillarFrom,
  sevenPillarsHubHref,
  type PillarFromKey,
} from '@/lib/pillar-public-routes';

const BLUE = '#37b5ff';
const BLUE2 = '#60cdff';
const BLUE3 = '#0ea5e9';

const FROM_ICONS: Record<PillarFromKey, LucideIcon> = {
  goalie: Shield,
  'team-programs': ClipboardList,
  'goalie-coach': Target,
  'parent-role': Users,
  organization: Building2,
  'who-we-are': ClipboardList,
  'the-system': ClipboardList,
};

// ─── Pillar content data ────────────────────────────────────────────────────

interface PillarFact {
  statement: string;
  support?: string;
  voiceLabel: string;
  extra?: { label: string; items: string[] };
}

interface PillarData {
  number: string;
  title: string;
  titleOneLine?: boolean;
  titleBreakAt?: number;
  titleGroups?: number[];
  subtitle: string;
  intro: string;
  accent: string;
  accentAlt: string;
  facts: PillarFact[];
  close?: { statement: string; support: string };
}

const PILLARS: Record<string, PillarData> = {
  '1': {
    number: '01',
    title: 'MindSet',
    subtitle: 'The Foundation of Everything',
    intro: 'Regardless how technically strong you are — if the mind is not the strongest tool you have, then what is your foundation built on?\n\nMINDSET for a Smarter Goalie is the discipline of building what we call the MIND-VAULT — where only the most valuable foundational thoughts and behaviors are kept. For game performance. And for life in general.\n\nThis is where Logic, Common Sense, Math, and Science become your filters — applied to every read, every shift, every decision.\n\nThis is where you learn the difference between performance and outcome — and why the goalie controls one, not the other.\n\nThis is where respect is forged through consistency in performance — not single games.\n\nThis is where you understand that how the goalie goes reflects on the bench. A solid goalie lifts the bench. An inconsistent goalie deflates it.\n\nSix decades of original IP. One foundation. The MIND-VAULT is yours to build.\n\nThe goalie lives it. The parent supports it. The coach builds around it. The organization stands on it.\n\nLearn Smart — Play Smart. Think Smart — Play Smart.',
    accent: '#00f2ff',
    accentAlt: '#60cdff',
    facts: [
      {
        statement: 'THE SUB-CONSCIOUS MIND RUNS AT GAME SPEED. THE CONSCIOUS MIND DOESN\'T. WE TRAIN THE RIGHT ONE.',
        voiceLabel: 'HEAR COACH MIKE: THE SUB-CONSCIOUS MIND AND WHY TRAINING IT CHANGES EVERYTHING',
      },
      {
        statement: 'THE GOALIE IS THE MOST IMPORTANT POSITION ON THE TEAM AND THE LEAST UNDERSTOOD.',
        voiceLabel: 'HEAR COACH MIKE: THE GOALIE\'S RESPONSIBILITY AND WHY THE POSITION IS UNLIKE ANY OTHER IN SPORT',
      },
      {
        statement: 'IF THE GOALIE SHOWS UP WITH THEIR A-GAME — THE TEAM SHOWS UP WITH THEIR A-GAME.',
        support: 'Four scenarios. Every goalie needs to understand all four.',
        voiceLabel: 'HEAR COACH MIKE: THE FOUR SCENARIOS AND WHAT THE GOALIE\'S RESPONSIBILITY MEANS IN REAL TERMS',
        extra: {
          label: 'The Four Scenarios',
          items: [
            'Goalie A-Game + Team A-Game: Win or tie. The best possible outcome.',
            'Goalie A-Game + Team so-so: Win or tie still possible. The goalie carries the weight.',
            'Goalie A-Game + Team no-show: The goalie keeps respect in the house.',
            'Goalie does not bring A-Game: The team has no foundation. The goalie is the foundation.',
          ],
        },
      },
      {
        statement: 'THE GOALIE KEEPS RESPECT IN THE HOUSE.',
        support: 'Your reputation is always in play. In the game. In practice. In a tryout. In a casual skate. Always.',
        voiceLabel: 'HEAR COACH MIKE: REPUTATION, PRIDE, AND WHAT IT MEANS TO NEVER LET YOURSELF OR THOSE WHO COACH YOU DOWN',
      },
      {
        statement: 'V.M.P. — VISUAL. MENTAL. PHYSICAL. IN THAT ORDER. ALWAYS.',
        support: 'Intensity is not competing hard. Intensity is assessed as Low, Medium-Spotty, or High-Consistent. Most goalies never learn the difference. Smarter Goalie teaches it from day one.',
        voiceLabel: 'HEAR COACH MIKE: V.M.P. INTENSITY AND WHY THE ORDER IS NON-NEGOTIABLE',
      },
      {
        statement: 'PRACTICE ATTITUDE IS NOT OPTIONAL. IT IS THE GOALIE\'S DECLARATION THAT THEY BELONG IN THAT NET.',
        support: 'The first one was a gift. The second you had to earn.\n\nThe goalie\'s greatest practice motivation is simple — shut down your teammates. Earn their respect by making them work for everything.',
        voiceLabel: 'HEAR COACH MIKE: PRACTICE ATTITUDE AND WHAT IT PRODUCES OVER A FULL SEASON',
      },
      {
        statement: 'THE GOALIE WHO CAN SELF-COACH IS THE GOALIE WHO NEVER STOPS DEVELOPING.',
        support: 'Most programs create dependency. Smarter Goalie builds independence. The Technical Eye. The Feel Factor. The ability to observe your own execution and correct it without being told.',
        voiceLabel: 'HEAR COACH MIKE: SELF-COACHING AND WHY IT IS THE HIGHEST LEVEL OF GOALTENDING DEVELOPMENT',
      },
      {
        statement: 'CHARACTER IS NOT A SIDE EFFECT OF THE SMARTER GOALIE SYSTEM. IT IS ARCHITECTURE.',
        support: 'Built from day one. Baked into every Pillar and every session. Leadership, accountability, resilience, and self-awareness are not optional extras. They are the product.',
        voiceLabel: 'HEAR COACH MIKE: CHARACTER AS ARCHITECTURE AND WHAT THAT MEANS FOR THE GOALIE\'S LIFE BEYOND HOCKEY',
      },
    ],
  },
  '2': {
    number: '02',
    title: 'Skating',
    titleOneLine: true,
    subtitle: 'The Mobility That Keeps You In Game Frequency',
    intro: 'The goalie who understands goalie skating — not just how to move, but when, why, and how to arrive — separates from the rest at every level of the game.',
    accent: BLUE2,
    accentAlt: BLUE,
    facts: [],
  },
  '3': {
    number: '03',
    title: '7AMS',
    titleOneLine: true,
    subtitle: 'Net · Crease · White Ice management above the icing line.',
    intro: 'The most important relationship the goalie can have? Stop and think. The answer is the Net. The Crease — to Net. The White Ice — to Crease and the Net. In that exact order. An ultimate sensitivity to all three will empower you, simplify your game, and hand you a strategic advantage a general would be envious to have.',
    accent: BLUE,
    accentAlt: BLUE3,
    facts: [
      {
        statement: 'THE MOST IMPORTANT RELATIONSHIP THE GOALIE CAN HAVE IS THE NET.',
        support: 'THE NET. THE CREASE — TO NET. THE WHITE ICE — TO CREASE AND THE NET. In that exact order.\n\nAn ultimate sensitivity and awareness to the Net — to the Crease — and to the White Ice will empower you. It will simplify your game. It gives you an understanding of what the player has, and hands you a strategic and tactical advantage a general would be envious to have.\n\nBetter decision-making. More consistency in performance. And respect — not only from your team and coaches, but from the opposition. They know you\'re a Smarter Goalie. They know you\'re one tough cookie to beat. Your position game is superior to all competitors.',
        voiceLabel: 'HEAR COACH MIKE: THE MOST IMPORTANT RELATIONSHIP AND HOW IT TRANSFORMS YOUR ENTIRE POSITIONAL GAME',
      },
      {
        statement: 'THE 7 ANGLE MARKER GRID IS THE GOALIE\'S GPS — YOUR POSITIONAL SYSTEM.',
        support: 'This system is mathematical, logical, and the science of sound positional play. You want consistency in performance? This is one of the greatest tools to make that happen.\n\nThe process in learning it is systematic — evolving through the Net-to-Crease relationship and on to the White Ice — Challenging Mode — taking the net away from the shooter, optimizing your sensitivity to crease and post relationships, providing added energy to actions taken.\n\nSimply said: a foundation you can build your game on.',
        voiceLabel: 'HEAR COACH MIKE: THE 7AMS AND HOW IT TRANSFORMS POSITIONAL AWARENESS FROM GUESSWORK TO PRECISION',
      },
      {
        statement: 'YELLOW ALERT. ORANGE ALERT. RED ALERT — THREE LEVELS, THREE DEGREES OF DANGER.',
        support: 'Three alert levels that tell a goaltender how much danger the moment carries and how much intensity the position demands. Pressure is not one-size-fits-all — and neither is your readiness.\n\nBreak Out. Neutral Zone. Blue Line In. Understanding the game will determine your staging for the attack coming through the three zones.',
        voiceLabel: 'HEAR COACH MIKE: THE ALERT SYSTEM — MATCHING YOUR POSITIONAL GAME TO THE LEVEL OF DANGER',
      },
      {
        statement: 'ABOVE THE ICING LINE, THE SMART GOALIE IS ALWAYS IN THE RIGHT POSITION.',
        support: 'The position game, yours. Connect to the Net — Crease — and White Ice. A strategy and tactical game that belongs to you. The intuitive nature comes with knowing — not hoping — but optimizing your positional game.',
        voiceLabel: 'HEAR COACH MIKE: THE POSITION GAME — YOURS',
        extra: {
          label: 'What You\'ll Own',
          items: [
            'A connect to the Net — Crease — and White Ice',
            'What you will have is a strategy and tactical game',
            'The Alert System — matching your positional game to meet the challenge',
            'The intuitive nature comes with knowing — not hoping, but optimizing your positional game',
            'You will simplify your game — and make it look easy',
          ],
        },
      },
    ],
  },
  '4': {
    number: '04',
    title: 'The 6 Zone – 7 Point System™',
    titleBreakAt: 2,
    subtitle: '"Keeping the Advantage in Your House"',
    intro: 'Below the icing line the game changes — the strategies and the tactical game take on new meaning. Six zones. Three pairs of twins. One system for the area of the ice most goalies are least prepared for. The goalie who knows each zone\'s fundamentals is never guessing.',
    accent: BLUE3,
    accentAlt: BLUE,
    facts: [
      {
        statement: 'BELOW THE ICING LINE THE GAME CHANGES. KNOWING THE CHALLENGE IS AN ADVANTAGE.',
        support: 'Staying on your feet or going to the ice is based on the read of the situation. Each zone offers a challenge. Knowing the challenge is an advantage. Knowing the degree of challenge is an advantage. Outsmarting your opponent behind the net using a knowledge you will possess — is advantage.\n\nYour mind versus the opponent\'s mind. Think Smart. Play Smart.',
        voiceLabel: 'HEAR COACH MIKE: WHY BELOW THE ICING LINE DESERVES ITS OWN COMPLETE FRAMEWORK',
      },
      {
        statement: 'SIX ZONES — THREE TWINS. THE PASS OPTIONS CHANGE WITH EVERY ZONE.',
        support: 'One system: the 6 Zone – 7 Point System™ — the layers of knowledge required to be steps ahead of the player with the puck. The puck\'s location determines "The Passing Field" — the area a pass has to travel, from The Location Principle: what path can the puck take, given no obstructions?\n\nThe beauty: six zones, identical on both sides — Zones 1 & 6 twins · Zones 2 & 5 twins · Zones 3 & 4 twins.\n\nAnd the goalie can BE that obstruction — a pass traveling through the crease, or just outside it, is a pass your stick can interfere with. Knowing this is an advantage.',
        voiceLabel: 'HEAR COACH MIKE: THE 6 ZONE – 7 POINT SYSTEM™ AND HOW IT MAPS EVERY SITUATION BELOW THE ICING LINE',
      },
      {
        statement: 'WHEN THE PASS LEAVES, YOUR READ ALERT IS ALREADY WORKING.',
        support: 'The chess match behind the net. The puck, the player\'s position, and the strategy to keep the advantage in your house — how to play the player.\n\nForehand or backhand — and the more clever the playmaker, the more your Read Alert is flashing. Reading the stick to the left or right of the post, to center, behind the net — that alone will not be enough. This is a mental game.',
        voiceLabel: 'HEAR COACH MIKE: THE READ ALERT — THE PUCK, THE PLAYER, AND HOW TO KEEP THE ADVANTAGE IN YOUR HOUSE',
      },
      {
        statement: 'BEHIND THE NET, IT\'S YOUR MIND VERSUS THEIRS — AND THE ADVANTAGE STAYS IN YOUR HOUSE.',
        support: 'The 6 Zone – 7 Point System™. The Passing Field and The Location Principle — knowing the puck\'s paths before the pass leaves. Your Read Alert — the puck, the player\'s position, and how to play the player.',
        voiceLabel: 'HEAR COACH MIKE: KEEPING THE ADVANTAGE IN YOUR HOUSE',
        extra: {
          label: 'What You\'ll Own',
          items: [
            'The 6 Zone – 7 Point System™ — and the twins that make it learnable',
            'The Passing Field and The Location Principle — knowing the puck\'s paths before the pass leaves',
            'Your Read Alert — the puck, the player\'s position, and how to play the player',
            'The strategies and tactical game behind the net — read by read',
            'The advantage, kept — in your house',
          ],
        },
      },
    ],
  },
  '5': {
    number: '05',
    title: 'Form',
    subtitle: 'The body & mind, built to make it look easy.',
    intro: 'Anyone can make a save. It\'s the second, the third, and even beyond that will separate you from the wannabes. Form covers a wide array of skills — all broken down and systematically taught to render an Intelligent Athletic Goaltender.',
    accent: '#38bdf8',
    accentAlt: BLUE2,
    facts: [
      {
        statement: 'THAT IS NOT LUCK — BUT TRAINED INTO EXISTENCE.',
        support: 'Watch any goalie make a save that looks effortless — or combination saves that appear controlled, with visible athletic understanding of tech, when, where, why and how. You will learn how to perform a single execution or multiple saves in sequence that makes watchers marvel at the efficiency of decision-making, execution, and recovery tech.\n\nWe don\'t depend on luck. It\'s a healthy by-product of work put in — not something you can rely on or base your game on, rather something we welcome when the hockey gods wish to show us some love.',
        voiceLabel: 'HEAR COACH MIKE: TRAINED INTO EXISTENCE — HOW INTELLIGENT GOALTENDING IS BUILT',
      },
      {
        statement: 'FORM COVERS A WIDE ARRAY OF SKILLS — OPTIMIZING WHAT WORKS FOR YOU.',
        support: 'At Smarter Goalie we assist you in knowledge acquisition and skill know-how: optimizing your understanding of what works FOR YOU — to the ability to not just make one save, but make multiple saves in succession without balance loss.\n\nEvery save, every sequence, every time. Nothing is left to the imagination. You will be a Smarter Goalie without a doubt — and mold your game to your ability level.',
        voiceLabel: 'HEAR COACH MIKE: THE WIDE ARRAY OF FORM SKILLS AND HOW EACH ONE IS BUILT FOR YOUR BODY',
        extra: {
          label: 'Skills Covered',
          items: [
            'Set-Crouch (Ready Positions)',
            'Stick Use',
            'Catching Glove',
            'Blocker Use',
            'Execution',
            'Recovery Tech',
          ],
        },
      },
      {
        statement: 'EVERY EXECUTION CLIMBS THE LADDER — FORM INTRODUCED. SKILLS DEVELOPING. REFINEMENT LEVELS.',
        support: 'From introduced — through developed — to refined. Nothing skipped, everything earned.\n\nYou never know who is watching — in practices and games: coaches, your team and opposition players, scouts. We build reputations and achieve respect levels that are earned. There is no greater feeling than having a reputation and respect factor for the consistency you bring game in and game out — and the compete level you have in practice tells your team you\'re a competitor across the board.',
        voiceLabel: 'HEAR COACH MIKE: THE LADDER AND HOW EVERY EXECUTION CLIMBS FROM INTRODUCTION TO REFINEMENT',
      },
      {
        statement: 'FORM IS HOW YOU LOOK. CORRECT FORM IS CONTROL. ANYTHING LESS IS SLOPPY — AND SLOPPY LETS GOALS IN.',
        support: 'Form is rated by Control Factor. Your new knowledge — your new understanding — lets you pinpoint the breakdown of any execution and isolate the correction, driving toward your highest level of Control Factor.',
        voiceLabel: 'HEAR COACH MIKE: THE CONTROL FACTOR AND WHAT CORRECT FORM PRODUCES',
        extra: {
          label: 'What You\'ll Own',
          items: [
            'Improved insight — no wasted movement, no wasted energy, while striving to eliminate any wasted time',
            'Self-evaluation and self-coaching principles — using your time wisely instead of standing around waiting for the team to involve you',
            'Self-empowered — showing all that witness you: you know something. Your character and self-discipline on display for all to admire',
          ],
        },
      },
    ],
  },
  // NOTE: in the app, Game and Practice are now two separate pillars (5 and 6),
  // and off-ice content has moved to Lifestyle. This public page is still the
  // single combined sales page, because splitting it needs new long-form copy in
  // Coach Mike's voice — including his voice-note labels — which we can't write
  // for him. Awaiting his copy before this becomes two pages.
  '6': {
    number: '06',
    title: 'Game & Practice Performance',
    titleGroups: [2, 1, 1],
    subtitle: 'Game & practice charting — the building blocks of discovering your game.',
    intro: 'Every goalie wants the tailored experience. Few understand where it comes from. It comes from your baseline — your game as it truly is, across all 7 Pillars. Hope is not a game plan. Your charts reveal your game — the good and the areas that need attention — and together we fill the gaps.',
    accent: '#22d3ee',
    accentAlt: BLUE3,
    facts: [
      {
        statement: 'THIS IS WHERE IT ALL BEGINS — YOUR BASELINE.',
        support: 'The more Smarter Goalie knows about you, the more you will understand your baseline profile — and the more tailored your journey becomes. Team practice gives you some. Smarter Goalie shows you how even an extra half hour to an hour a week, used with purpose, accelerates development beyond what anyone expects.\n\nWe build your template. We construct your maintenance and development loop — and it grows as the new you is created. Your journey is personal to you, and your development cycle is structured, systematic, and pointed at one thing: building a starter who is consistent in performance — game and practice.',
        voiceLabel: 'HEAR COACH MIKE: THE BASELINE AND WHY THE TAILORED EXPERIENCE STARTS HERE',
      },
      {
        statement: 'THE 4 TIERS — FROM YOUR FIRST CHART TO THE #1 GOALIE.',
        support: 'The 7 Pillars are what you learn. The 4 Tiers are how you climb — the journey of self-evaluation, knowledge acquisition, and consistent performance that merges mental and physical development into one path. Each Tier is earned. Nothing is skipped, nothing is rushed — the system moves with you as your knowledge and skill solidify.',
        voiceLabel: 'HEAR COACH MIKE: THE 4 TIERS AND HOW EACH ONE IS EARNED, NEVER RUSHED',
        extra: {
          label: 'The 4 Tiers',
          items: [
            'Tier 1: Growing Your Fundamentals Chart — your chart is a living document, the story of your journey',
            'Tier 2: Building Your Practice Schedule for Reaffirmation — every rep reaffirms knowledge until the technique is owned',
            'Tier 3: Knowledge Base Across the 7 Pillars — the knowledge stops living on paper and starts living in you',
            'Tier 4: Pinnacle Routine & Lifestyle — The #1 Goalie — the Intelligent Athletic Goaltender',
          ],
        },
      },
      {
        statement: 'CHART IT. UNDERSTAND IT. TRAIN IT. OWN IT — THEN CHART AGAIN.',
        support: 'Game to practice to game, the gaps close and the good compounds. This works wherever you train. At team practice, you arrive with a plan — using your time wisely. In a private session, every rep has a purpose your charts chose.\n\nYou execute, you chart, you submit — and the review comes back with direction. Nobody guesses. The whole team around you — parent, coach, goalie coach — reads from the same page: yours.',
        voiceLabel: 'HEAR COACH MIKE: THE DEVELOPMENT LOOP AND HOW IT TURNS EVERY GAME INTO A DEVELOPMENT ROADMAP',
      },
      {
        statement: 'YOUR JOURNEY IS PERSONAL. YOUR DEVELOPMENT CYCLE IS SYSTEMATIC.',
        support: 'The result is a starter consistent in performance — game and practice.',
        voiceLabel: 'HEAR COACH MIKE: THE PERFORMANCE DIFFERENCE AND WHAT IT LOOKS LIKE AT EVERY LEVEL',
        extra: {
          label: 'What You\'ll Own',
          items: [
            'Your baseline profile — the gateway to a tailored experience built from your charts and your game, never a copy of someone else\'s program',
            'The direction — purposeful practice with one clear focus at a time, growing step by earned step toward the director\'s chair',
            'A loop that compounds — maintenance and development working together, so what you master stays sharp while the new you keeps growing',
          ],
        },
      },
    ],
  },
  '7': {
    number: '07',
    title: 'Lifestyle',
    titleOneLine: true,
    subtitle: 'The goalie you are when nobody is watching.',
    intro: 'Six Pillars live at the rink. This one lives everywhere else — and it decides what the other six are worth. Lifestyle is the pillar that never takes a shift off: how you sleep, how you fuel, how you recover, how you carry yourself when there\'s no net in sight.',
    accent: BLUE2,
    accentAlt: BLUE,
    facts: [
      {
        statement: 'SIX PILLARS LIVE AT THE RINK. THIS ONE LIVES EVERYWHERE ELSE.',
        support: 'Sport is athletic — hockey takes athletics — and athletics are built in the other twenty-two hours of the day. The disciplines, the commitments, the dedication — they\'re not rules we hand you. They\'re choices you grow into, until the goalie and the person are the same one.\n\nTier 4 told you where this journey ends — self-awareness as an individual and an athlete, merged into a lifestyle. This is that lifestyle.',
        voiceLabel: 'HEAR COACH MIKE: THE PILLAR THAT DECIDES WHAT ALL THE OTHERS ARE WORTH',
      },
      {
        statement: 'BUILT IN THE HOURS NOBODY SEES.',
        support: 'Lifestyle covers what the rink can\'t: sleep that restores a body under an athlete\'s stress — and locks in what practice built. Fuel that decides whether the third period belongs to you or to fatigue. Recovery that arrives before the breakdown, not after. Off-ice movement that builds the athlete underneath the goalie. And character — because how you carry yourself away from the net travels with you into it.\n\nRoutine is more than habit — routine builds consistency, and consistency creates patterns. None of this is tracked to control you. It\'s charted so YOU see the connection — the night before, the meal before, the week before — and how each one shows up on your game chart.',
        voiceLabel: 'HEAR COACH MIKE: THE HOURS NOBODY SEES AND WHY THEY DECIDE THE HOURS EVERYONE DOES',
        extra: {
          label: 'The Lifestyle Pillars',
          items: [
            'Sleep — restores a body under an athlete\'s stress, locks in what practice built',
            'Fuel — decides whether the third period belongs to you or to fatigue',
            'Recovery — arrives before the breakdown, not after',
            'Off-Ice Training — builds the athlete underneath the goalie',
            'Routines — build consistency, consistency creates patterns',
            'Character — how you carry yourself away from the net travels with you into it',
          ],
        },
      },
      {
        statement: 'FROM PILLAR TO IDENTITY — THE INTELLIGENT ATHLETIC GOALTENDER.',
        support: 'Every Pillar climbs toward the same place. Tier 4 — the Pinnacle Routine & Lifestyle — is where the knowledge, the charts, the practice discipline, and the self-awareness stop being things you do and become who you are.\n\nThe routines aren\'t assigned anymore; they\'re custom-created from knowing yourself with precision. The disciplines, the commitments, the dedication — chosen, not imposed.\n\nThe other six Pillars build your game. This one decides how long you keep it.',
        voiceLabel: 'HEAR COACH MIKE: FROM PILLAR TO IDENTITY AND WHAT THE INTELLIGENT ATHLETIC GOALTENDER LOOKS LIKE',
      },
      {
        statement: 'THE RINK BUILDS YOUR GAME. YOUR LIFESTYLE DECIDES WHAT IT BECOMES.',
        support: 'Think Smart. Play Smart.',
        voiceLabel: 'HEAR COACH MIKE: THE LIFESTYLE DIFFERENCE AND WHAT IT PRODUCES FOR THE REST OF YOUR LIFE',
        extra: {
          label: 'What You\'ll Own',
          items: [
            'The connection — your charts linking the night before, the meal before, the week before to what shows up in the net',
            'The Routine Principle — routines that build consistency, consistency that builds patterns, patterns that reinforce each other',
            'The identity — disciplines, commitments, and dedication you chose, merged into the Intelligent Athletic Goaltender who sets the tone',
          ],
        },
      },
    ],
    close: {
      statement: 'SEVEN PILLARS. ONE COMPLETE SYSTEM. BUILT ON SIX DECADES. PROVEN ON EVERY GOALIE IT HAS EVER TOUCHED.',
      support: 'Every goalie Coach Mike has ever coached advanced to AA or AAA status. Not one stayed behind.\n\nThe system is not theory. It is not a program. It is a mathematical, systems-based approach to goaltending development that has been stress-tested for sixty years.\n\nIt has never been successfully challenged.\n\nTEST US AND SEE. CHALLENGE US AND KNOW.',
    },
  },
};

// ─── Shared components ───────────────────────────────────────────────────────

function VoiceButton({ label }: { label: string }) {
  const [playing, setPlaying] = useState(false);
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => on && setPlaying(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: on ? 'linear-gradient(135deg, rgba(55,181,255,0.14), rgba(96,205,255,0.07))' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${on ? 'rgba(96,205,255,0.32)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '50px', padding: '9px 18px 9px 10px',
          color: on ? BLUE2 : '#475569', fontSize: '11px', fontWeight: 700,
          letterSpacing: '1.2px', cursor: on ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
          boxShadow: on ? '0 2px 10px rgba(55,181,255,0.12)' : 'none',
        }}
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

function FactSection({ fact, accent, index }: { fact: PillarFact; accent: string; index: number }) {
  const isAlt = index % 2 === 1;
  const bg = isAlt
    ? 'linear-gradient(150deg, #0d2848 0%, #133050 100%)'
    : 'linear-gradient(160deg, #000f28 0%, #041530 55%, #0a2040 100%)';

  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(72px,9vw,120px) 0', background: bg }}>
      {/* Ghost number */}
      <div style={{ position: 'absolute', right: '-2%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(160px,22vw,320px)', fontWeight: 900, fontStyle: 'italic', color: `${accent}10`, letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>
        {String(index + 1).padStart(2, '0')}
      </div>
      {/* Glow */}
      <div style={{ position: 'absolute', top: '-10%', left: isAlt ? 'auto' : '-5%', right: isAlt ? '-5%' : 'auto', width: '500px', height: '500px', background: `radial-gradient(ellipse, ${accent}14 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />
      {/* Soft grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(96,205,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(96,205,255,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', zIndex: 0 }} />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
        {/* Accent bar + number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <div style={{ width: '6px', height: '52px', background: accent, boxShadow: `0 0 14px ${accent}`, borderRadius: '3px', flexShrink: 0 }} />
          <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '3px', color: accent, textTransform: 'uppercase' }}>
            FACT {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Statement */}
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 68px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 28px', maxWidth: '960px' }}>
          {fact.statement}
        </h2>

        {/* Support copy */}
        {fact.support && (
          <div style={{ maxWidth: '760px', marginBottom: '32px' }}>
            {fact.support.split('\n\n').map((para, pi) => (
              <p key={pi} style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(184,212,232,0.88)', fontStyle: 'italic', lineHeight: 1.85, margin: pi < fact.support!.split('\n\n').length - 1 ? '0 0 16px' : '0' }}>
                {para}
              </p>
            ))}
          </div>
        )}

        {/* Extra: four scenarios or similar */}
        {fact.extra && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', maxWidth: '960px', marginBottom: '32px' }}>
            {fact.extra.items.map((item, ii) => (
              <TiltCard
                key={ii}
                effect="gravitate"
                tiltLimit={8}
                scale={1.04}
                style={{ border: `1px solid ${accent}44`, borderRadius: '14px', boxShadow: `0 0 20px ${accent}10` }}
              >
                <div style={{ padding: '20px 22px', background: `linear-gradient(135deg, ${accent}12, rgba(4,18,44,0.9))`, borderRadius: '13px', backdropFilter: 'blur(12px)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}`, marginBottom: '12px' }} />
                  <p style={{ fontSize: 'clamp(13px, 1.5vw, 15px)', color: 'rgba(200,228,248,0.9)', lineHeight: 1.7, margin: 0 }}>{item}</p>
                </div>
              </TiltCard>
            ))}
          </div>
        )}

        <VoiceButton label={fact.voiceLabel} />
      </div>
    </section>
  );
}

// ─── Main page component ─────────────────────────────────────────────────────

function PillarPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const pillar = PILLARS[id];

  const fromKey = resolvePillarFrom(searchParams.get('from'));
  const from = PILLAR_FROM_CONTEXT[fromKey];
  const FromIcon = FROM_ICONS[fromKey];

  if (!pillar) {
    return (
      <div style={{ minHeight: '100vh', background: '#000f28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: BLUE2, fontSize: '14px', letterSpacing: '3px', fontWeight: 700, marginBottom: '16px' }}>PILLAR NOT FOUND</p>
          <button onClick={() => router.push(from.href)} style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE3})`, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px' }}>
            BACK TO {from.label}
          </button>
        </div>
      </div>
    );
  }

  const { accent } = pillar;
  const prevId = String(Number(id) - 1);
  const nextId = String(Number(id) + 1);
  const hasPrev = Number(id) > 1;
  const hasNext = Number(id) < 7;

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: '#fff' }}>

      <PublicPageNav />

      {/* Role bar */}
      <div style={{ background: '#0e2448', borderBottom: '1px solid rgba(96,205,255,0.22)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-3 flex items-center gap-4">
          <button
            onClick={() => router.push(from.href)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: BLUE2, fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', flexShrink: 0 }}
          >
            <ArrowLeft size={13} />
            {from.label}
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(96,205,255,0.3)', flexShrink: 0 }} />
          <FromIcon size={14} color={BLUE2} style={{ flexShrink: 0 }} />
          <button
            type="button"
            onClick={() => router.push(sevenPillarsHubHref(fromKey))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 800, letterSpacing: '2.5px', color: BLUE2, textTransform: 'uppercase', padding: 0 }}
          >
            7 PILLARS
          </button>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>/</span>
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2.5px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
            PILLAR {pillar.number}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>
            {pillar.title}
          </span>
        </div>
      </div>

      {/* ── HERO — mesh shader background ── */}
      <ShaderBackground
        className="flex min-h-screen flex-col justify-center py-[clamp(80px,10vw,130px)]"
        colors={['#000f28', '#0ea5e9', accent, '#1850b4', '#60cdff']}
        overlayColors={['#041530', '#ffffff', accent, '#0d2848']}
        backgroundColor="#000f28"
      >
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
          {/* Pillar number badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${accent}55`, borderRadius: '50px', padding: '8px 20px', marginBottom: '32px', boxShadow: `0 2px 16px ${accent}22`, backdropFilter: 'blur(8px)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: accent, boxShadow: `0 0 0 3px ${accent}35`, flexShrink: 0 }} />
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', color: accent, margin: 0, textTransform: 'uppercase' }}>
              PILLAR {pillar.number} — THE 7 PILLAR SYSTEM
            </p>
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 8vw, 108px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', margin: '0 0 20px', color: '#fff', whiteSpace: 'normal' }}>
            {pillar.titleOneLine
              ? pillar.title
              : pillar.titleGroups
                ? (() => {
                    const words = pillar.title.split(' ');
                    const lines: string[] = [];
                    let idx = 0;
                    for (const count of pillar.titleGroups) {
                      lines.push(words.slice(idx, idx + count).join(' '));
                      idx += count;
                    }
                    if (idx < words.length) lines.push(words.slice(idx).join(' '));
                    return <>{lines.map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</>;
                  })()
                : pillar.titleBreakAt
                  ? (() => {
                      const words = pillar.title.split(' ');
                      const line1 = words.slice(0, pillar.titleBreakAt).join(' ');
                      const line2 = words.slice(pillar.titleBreakAt).join(' ');
                      return <>{line1}<br />{line2}</>;
                    })()
                  : pillar.title.split(' ').map((word, wi) => (
                      <span key={wi}>
                        {wi > 0 && <br />}
                        {word}
                      </span>
                    ))
            }
          </h1>
          <p style={{ fontSize: 'clamp(20px, 2.8vw, 34px)', fontWeight: 800, color: accent, margin: '0 0 32px', letterSpacing: '-0.01em' }}>
            {pillar.subtitle}
          </p>
          <p style={{ fontSize: 'clamp(15px, 1.7vw, 19px)', color: 'rgba(255,255,255,0.72)', lineHeight: 1.8, maxWidth: '520px', margin: '0 0 44px' }}>
            {pillar.intro}
          </p>

          {/* Pillar nav dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Array.from({ length: 7 }, (_, i) => {
              const isActive = String(i + 1) === id;
              return (
                <button
                  key={i}
                  onClick={() => router.push(pillarDetailHref(i + 1, fromKey))}
                  style={{
                    width: isActive ? '28px' : '8px',
                    height: '8px',
                    borderRadius: isActive ? '4px' : '50%',
                    background: isActive ? accent : 'rgba(255,255,255,0.35)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s',
                    boxShadow: isActive ? `0 0 10px ${accent}` : 'none',
                    padding: 0,
                    flexShrink: 0,
                  }}
                />
              );
            })}
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.45)', marginLeft: '8px', textTransform: 'uppercase' }}>
              {id} OF 7
            </span>
          </div>
        </div>
      </ShaderBackground>

      {/* ── Origin section for Pillar 1 ── */}
      {id === '1' && (
        <>
          {/* Puzzle section */}
          <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(80px,10vw,130px) 0', background: 'linear-gradient(140deg, #1b3c7c 0%, #143270 100%)' }}>
            <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(100px, 14vw, 200px)', fontWeight: 900, color: 'rgba(255,255,255,0.02)', letterSpacing: '-6px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', textTransform: 'uppercase' }}>PUZZLE</div>
            <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: 'clamp(28px, 5vw, 68px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 24px', maxWidth: '960px' }}>
                GOALTENDING WAS A 1,000-PIECE PUZZLE WITH NO PICTURE, NO BORDER, NO BOX.
              </h2>
              <div style={{ maxWidth: '760px', marginBottom: '36px' }}>
                <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(184,212,232,0.9)', fontStyle: 'italic', lineHeight: 1.85, marginBottom: '16px' }}>
                  Most programs hand the goalie a handful of pieces and hope for the best. Smarter Goalie built the border first. Then filled in every piece. In order. With purpose.
                </p>
                <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(184,212,232,0.9)', fontStyle: 'italic', lineHeight: 1.85, margin: 0 }}>
                  The First Test Subject: Michael Locicero was his own first experiment. Every principle was proven on himself before it was taught to anyone else.
                </p>
              </div>
              <VoiceButton label="HEAR COACH MIKE: THE PUZZLE WITH NO PICTURE — WHAT IT MEANS AND WHY IT STILL APPLIES TO EVERY GOALIE TODAY" />
            </div>
          </section>

          {/* Pillar 1 label */}
          <section style={{ padding: 'clamp(40px,5vw,60px) 0', background: 'linear-gradient(160deg, #0d2848 0%, #041530 100%)' }}>
            <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ width: '6px', height: '80px', background: accent, boxShadow: `0 0 15px ${accent}`, borderRadius: '3px', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: accent, textTransform: 'uppercase', margin: '0 0 6px' }}>Now Entering</p>
                  <h2 style={{ fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.05 }}>
                    PILLAR 1 — MINDSET<br />
                    <span style={{ color: accent }}>THE FOUNDATION OF EVERYTHING.</span>
                  </h2>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── RICH SECTIONS for Pillar 2 ── */}
      {id === '2' && (
        <>
          {/* Opening body + WHERE THIS TAKES YOU */}
          <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(80px,10vw,130px) 0', background: 'linear-gradient(155deg, #0d2848 0%, #133050 65%, #0b2242 100%)' }}>
            <div style={{ position: 'absolute', top: '10%', right: '-5%', width: '500px', height: '500px', background: `radial-gradient(ellipse, ${BLUE2}08 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>

              {/* Body paragraphs */}
              <div style={{ maxWidth: '820px', marginBottom: '52px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
                  <div style={{ width: '6px', height: '48px', background: BLUE2, boxShadow: `0 0 14px ${BLUE2}`, borderRadius: '3px', flexShrink: 0 }} />
                  <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: BLUE2, textTransform: 'uppercase', margin: 0 }}>PILLAR 02 — SKATING</p>
                </div>
                {/* Placeholder for Michael's opening line */}
                <div style={{ background: `${BLUE2}08`, border: `1px dashed ${BLUE2}28`, borderRadius: '10px', padding: '14px 18px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '12px', color: `${BLUE2}60`, margin: 0, letterSpacing: '1px', fontStyle: 'italic' }}>[Opening message from Coach Mike — content to be provided]</p>
                </div>
                {[
                  'The goalie who separates from the pack does so by understanding one thing that is rarely taught — the difference between goalie skating and player skating.',
                  'The more proficient the goalie becomes at moving through different postures, different situations, and different reads — the more they become in sync with the play. Not a target inside the crease. In sync with the game.',
                  'And when the puck separates from the center-line connection — when the read shifts and the play opens up — the trained goalie still knows what the shooter has, and what the puck sees.',
                  'What the shooter sees and what the puck sees are entirely different.',
                  'Smarter Goalie teaches the goalie to read from the puck\'s point of view — not the shooter\'s.',
                  'That is Game Frequency READS — where mobility, position, and read move as one.',
                ].map((para, i) => (
                  <p key={i} style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: i === 5 ? '#fff' : 'rgba(184,212,232,0.88)', lineHeight: 1.85, marginBottom: '18px', fontStyle: 'italic', fontWeight: i === 5 ? 700 : 400 }}>{para}</p>
                ))}
              </div>

              {/* WHERE THIS TAKES YOU */}
              <div style={{ background: 'rgba(55,181,255,0.05)', border: `1px solid ${BLUE2}22`, borderLeft: `4px solid ${BLUE2}`, borderRadius: '0 16px 16px 0', padding: 'clamp(24px,3vw,40px)', maxWidth: '820px', marginBottom: '48px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '4px', color: BLUE2, textTransform: 'uppercase', marginBottom: '24px' }}>WHERE THIS TAKES YOU</p>
                {[
                  { text: 'Movement with connection and purpose. This combination is very noticeable. When a goalie is in Game Frequency movement, it is poetry in motion.', highlight: false },
                  { text: 'Getting to that stage is our mission, and our record proves we are the leader.', highlight: false },
                  { text: 'In fact, our experience is this: when you\'re the starter, teammates will approach you, asking if you\'re starting game night. That is your vindication that you are the No.1... the starter the team feels confident in.', highlight: true },
                  { text: 'It shows. When you say "yes," they light up. When you say "no," their disappointment is visible.', highlight: false },
                  { text: 'Six decades of learning, observing, and refining tells me this is not optional.', highlight: true },
                ].map((item, i) => (
                  <p key={i} style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', color: item.highlight ? (i === 4 ? BLUE2 : '#fff') : 'rgba(184,212,232,0.85)', lineHeight: 1.85, marginBottom: i < 4 ? '16px' : '0', fontWeight: item.highlight ? 700 : 400 }}>{item.text}</p>
                ))}
              </div>

              <VoiceButton label="HEAR COACH MIKE EXPLAIN" />
            </div>
          </section>

          {/* FACT 01 — THE DECISION-MAKING ENGINE */}
          <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(80px,10vw,130px) 0', background: 'linear-gradient(160deg, #0d2848 0%, #133050 55%, #0a2040 100%)' }}>
            <div style={{ position: 'absolute', right: '-2%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(160px,22vw,320px)', fontWeight: 900, fontStyle: 'italic', color: `${BLUE2}10`, letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>01</div>
            <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '500px', height: '500px', background: `radial-gradient(ellipse, ${BLUE2}14 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                <div style={{ width: '6px', height: '52px', background: BLUE2, boxShadow: `0 0 14px ${BLUE2}`, borderRadius: '3px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase' }}>FACT 01</span>
              </div>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 54px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 20px', maxWidth: '960px' }}>
                THE DECISION-MAKING ENGINE BEHIND EVERY MOVE
              </h2>
              <p style={{ fontSize: 'clamp(17px, 2.3vw, 26px)', fontWeight: 700, color: BLUE2, lineHeight: 1.3, maxWidth: '900px', marginBottom: '48px', fontStyle: 'italic' }}>
                &ldquo;The goalie who moves with connection priorities is playing with strategy and tactical play. Priority 1: the puck. Priority 2: the player with the puck. Priority 3: the player with the puck and their options. WHAT &middot; WHERE &middot; WHEN &middot; WHY &middot; HOW.&rdquo;
              </p>

              {/* Five questions */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '48px' }}>
                {['WHAT', 'WHERE', 'WHEN', 'WHY', 'HOW'].map((q) => (
                  <div key={q} style={{ background: `${BLUE2}12`, border: `1px solid ${BLUE2}35`, borderRadius: '12px', padding: '14px 28px', textAlign: 'center', minWidth: '80px' }}>
                    <p style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 900, color: BLUE2, margin: 0, textShadow: `0 0 20px ${BLUE2}55` }}>{q}</p>
                  </div>
                ))}
              </div>

              {/* 3 Live Inputs */}
              <div style={{ marginBottom: '48px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: BLUE2, textTransform: 'uppercase', marginBottom: '20px' }}>THE 3 LIVE INPUTS</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', maxWidth: '960px' }}>
                  {[
                    { num: '01', label: 'READING THE PLAY', desc: 'Goaltending is a chess game. Always a couple of moves ahead.' },
                    { num: '02', label: 'READING THE STICK', desc: 'Is the player in shooting position or passing position? The player\'s tells...' },
                    { num: '03', label: 'POSITIONAL GAME', desc: 'When you know where you are related to the net and crease, you\'re maximizing your coverage potential.' },
                  ].map((input) => (
                    <div key={input.num} style={{ background: `${BLUE2}0a`, border: `1px solid ${BLUE2}30`, borderRadius: '14px', padding: '22px 24px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: BLUE2, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>{input.num}</p>
                      <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>{input.label}</p>
                      <p style={{ fontSize: '14px', color: 'rgba(184,212,232,0.75)', lineHeight: 1.65, margin: 0 }}>{input.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Game IQ */}
              <div style={{ maxWidth: '820px', marginBottom: '36px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: BLUE2, textTransform: 'uppercase', marginBottom: '14px' }}>GAME IQ</p>
                <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.85, marginBottom: '14px', fontStyle: 'italic' }}>
                  Game IQ grows across Pillars 1 through 6. Each Pillar adds a layer. Each layer expands what the goalie sees and reads in real time.
                </p>
                <p style={{ fontSize: 'clamp(18px, 2.5vw, 28px)', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
                  &ldquo;The puck enters your zone. Your house. Your terms.&rdquo;
                </p>
              </div>

              {/* Decision IQ + Two Enemies */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: 'clamp(20px,3vw,32px)', maxWidth: '820px', marginBottom: '36px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: BLUE2, textTransform: 'uppercase', marginBottom: '20px' }}>DECISION MAKING IQ — THE TWO ENEMIES</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[{ label: 'Over-Reacting', desc: 'Making the first move.' }, { label: 'Over-Anticipating', desc: 'Reacting to your imagination.' }].map((enemy) => (
                    <div key={enemy.label} style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.22)', borderRadius: '12px', padding: '18px 20px' }}>
                      <p style={{ fontSize: '15px', fontWeight: 800, color: '#f87171', marginBottom: '6px' }}>{enemy.label}</p>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>{enemy.desc}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: `${BLUE2}0a`, border: `1px solid ${BLUE2}25`, borderRadius: '12px', padding: '18px 20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: BLUE2, marginBottom: '6px', letterSpacing: '0.5px' }}>THE 90s</p>
                  <p style={{ fontSize: 'clamp(14px, 1.8vw, 17px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.7, margin: 0 }}>
                    Decision Making IQ Factor: taking the 90&rsquo;s to a solid 95% to 98% bar will establish consistency in performance, and a reputation to be proud of.
                  </p>
                </div>
              </div>

              {/* Are You In Tonight? */}
              <div style={{ borderLeft: `4px solid ${BLUE2}`, paddingLeft: '24px', maxWidth: '720px', marginBottom: '48px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: BLUE2, textTransform: 'uppercase', marginBottom: '12px' }}>&ldquo;ARE YOU IN TONIGHT?&rdquo;</p>
                <p style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.85, fontStyle: 'italic' }}>
                  A goalie who knows how to prepare mentally comes ready to perform. Teammates play with the confidence to play their game; they have a goalie between the pipes they believe in. Building a reputation comes one game at a time.
                </p>
              </div>

              <VoiceButton label="HEAR COACH MIKE: THE DECISION-MAKING ENGINE" />
            </div>
          </section>

          {/* FACT 02 — TECHNIQUE + THE TECHNICAL EYE */}
          <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(80px,10vw,130px) 0', background: 'linear-gradient(150deg, #0d2848 0%, #133050 100%)' }}>
            <div style={{ position: 'absolute', right: '-2%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(160px,22vw,320px)', fontWeight: 900, fontStyle: 'italic', color: `${BLUE2}10`, letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex: 0 }}>02</div>
            <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: '500px', height: '500px', background: `radial-gradient(ellipse, ${BLUE2}14 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full" style={{ position: 'relative', zIndex: 1 }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                <div style={{ width: '6px', height: '52px', background: BLUE2, boxShadow: `0 0 14px ${BLUE2}`, borderRadius: '3px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase' }}>FACT 02</span>
              </div>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 54px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 32px', maxWidth: '960px' }}>
                NOT EVERY SKATING TECHNIQUE IS THE RIGHT TOOL FOR EVERY MOMENT
              </h2>
              <div style={{ maxWidth: '820px', marginBottom: '48px' }}>
                {[
                  'Understand the skating tools, and getting them into your tool box, is priority one. If you can\'t skate like a goalie, knowing which tech is right for the situation, you will most likely be behind the play much too often, or find yourself disconnected, over-reacting or over-anticipating.',
                  'No skating technique is overlooked in the Smarter Goalie system. The biomechanics is broken down step by step. Understanding the WHAT, WHERE, WHEN, WHY and HOW is the next level.',
                  '"Knowing is understanding. Learning to read space and time is the key to proper skating tech selection."',
                  'The Technical Eye and the Self-Evaluation Portal work together. As the goalie begins to understand the space and time principles, they make smarter decisions related to the challenge of the play.',
                ].map((para, i) => (
                  <p key={i} style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: i === 2 ? BLUE2 : 'rgba(184,212,232,0.88)', lineHeight: 1.85, marginBottom: '18px', fontStyle: 'italic', fontWeight: i === 2 ? 700 : 400 }}>{para}</p>
                ))}
              </div>

              {/* Set-Crouch story */}
              <div style={{ background: 'rgba(55,181,255,0.04)', border: `1px solid ${BLUE2}22`, borderLeft: `4px solid ${BLUE2}`, borderRadius: '0 16px 16px 0', padding: 'clamp(20px,3vw,36px)', maxWidth: '820px', marginBottom: '48px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: BLUE2, textTransform: 'uppercase', marginBottom: '18px' }}>THE SET-CROUCH STORY — GERMANY 1981</p>
                <p style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.85, marginBottom: '14px', fontStyle: 'italic' }}>
                  Coach Mike was having a good first half, but not a great one. He decided to go home, get some Puck Machine work and on-ice self-training. Two weeks came and went, and Coach Mike got too busy with family, so he trained mentally only, using visualization methods.
                </p>
                <p style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.85, marginBottom: '14px', fontStyle: 'italic' }}>
                  When he hit the ice back in Germany, his 4th-season teammate said something that blew him away:
                </p>
                <p style={{ fontSize: 'clamp(20px, 3vw, 36px)', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1.2, marginBottom: '14px' }}>
                  &ldquo;Mike, you have your set-crouch back.&rdquo;
                </p>
                <p style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.85, margin: 0, fontStyle: 'italic' }}>
                  He was right. He knew my game so well he saw the adjustment... and I never got in front of the Puck Machine or on the ice those two weeks. I trained mentally, seeing myself in game situations and performing.
                </p>
              </div>

              {/* Subconscious */}
              <div style={{ maxWidth: '820px', marginBottom: '48px' }}>
                <h3 style={{ fontSize: 'clamp(20px, 3vw, 36px)', fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: '0 0 14px' }}>
                  Mental training is training the SUBCONSCIOUS.
                </h3>
                <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.85, fontStyle: 'italic', margin: 0 }}>
                  And the subconscious is what runs the game underneath the game.
                </p>
              </div>

              {/* Basketball study */}
              <div style={{ background: 'rgba(2,12,36,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: 'clamp(20px,3vw,36px)', maxWidth: '900px', marginBottom: '48px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: BLUE2, textTransform: 'uppercase', marginBottom: '24px' }}>THE BASKETBALL STUDY — 3 TEAMS, 3 WEEKS</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {[
                    { team: 'TEAM 1', training: 'Physical training only', result: 'Improved', rc: '#4ade80' },
                    { team: 'TEAM 2', training: 'Mental training only', result: 'Maintained', rc: BLUE2 },
                    { team: 'TEAM 3', training: 'No mental/physical training', result: 'Declined', rc: '#f87171' },
                  ].map((t) => (
                    <div key={t.team} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px 20px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>{t.team}</p>
                      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '10px', lineHeight: 1.4 }}>{t.training}</p>
                      <p style={{ fontSize: '17px', fontWeight: 900, color: t.rc, margin: 0 }}>{t.result}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Lessons */}
              <div style={{ maxWidth: '820px', marginBottom: '48px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3.5px', color: BLUE2, textTransform: 'uppercase', marginBottom: '20px' }}>THE 3 LESSONS</p>
                {[
                  'Mental training: visualization methods, sub-conscious training.',
                  'Sub-conscious training benefits: faster habit formation, emotional control, and increased problem-solving skills.',
                  'Training the peripheral eye heightens game-situation reads.',
                ].map((lesson, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${BLUE2}14`, border: `1px solid ${BLUE2}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: BLUE2 }}>{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <p style={{ fontSize: 'clamp(15px, 1.8vw, 19px)', color: 'rgba(184,212,232,0.88)', lineHeight: 1.75, margin: 0 }}>{lesson}</p>
                  </div>
                ))}
              </div>

              {/* Closing */}
              <div style={{ background: `${BLUE2}0a`, border: `1px solid ${BLUE2}25`, borderLeft: `4px solid ${BLUE2}`, borderRadius: '0 16px 16px 0', padding: '22px 28px', maxWidth: '820px', marginBottom: '48px' }}>
                <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#fff', lineHeight: 1.75, margin: 0, fontWeight: 700 }}>
                  MIND-VAULT does the internal work. Self-Evaluation Portal and Video Analysis do the verification. Inside work. Outside proof. That is the loop.
                </p>
              </div>

              <VoiceButton label="HEAR COACH MIKE: TECHNIQUE + THE TECHNICAL EYE" />
            </div>
          </section>
        </>
      )}

      {/* ── FACTS ── */}
      {pillar.facts.map((fact, i) => (
        <FactSection key={i} fact={fact} accent={accent} index={i} />
      ))}

      {/* ── PILLAR 7 CLOSE ── */}
      {id === '7' && pillar.close && (
          <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(100px,12vw,160px) 0', background: 'linear-gradient(160deg, #0d2848 0%, #133050 100%)' }}>
          <div style={{ position: 'absolute', right: '-60px', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(200px,30vw,440px)', fontWeight: 900, color: 'rgba(255,255,255,0.018)', letterSpacing: '-20px', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>VII</div>
          <div style={{ position: 'absolute', top: '-20%', left: '50%', width: '800px', height: '800px', background: 'radial-gradient(ellipse, rgba(55,181,255,0.1) 0%, transparent 70%)', pointerEvents: 'none', transform: 'translateX(-50%)' }} />
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 text-center w-full" style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 62px)', fontWeight: 900, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.025em', margin: '0 0 36px', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
              {pillar.close.statement}
            </h2>
            <div style={{ maxWidth: '680px', margin: '0 auto 48px' }}>
              {pillar.close.support.split('\n\n').map((para, pi) => {
                const isChallenge = para.includes('TEST US');
                return (
                  <p key={pi} style={{
                    fontSize: isChallenge ? 'clamp(20px, 3vw, 36px)' : 'clamp(16px, 2vw, 19px)',
                    color: isChallenge ? accent : 'rgba(175,215,238,0.88)',
                    lineHeight: 1.75,
                    fontWeight: isChallenge ? 900 : 400,
                    letterSpacing: isChallenge ? '0.02em' : 'normal',
                    marginBottom: pi < pillar.close!.support.split('\n\n').length - 1 ? '18px' : '0',
                    fontStyle: isChallenge ? 'normal' : 'italic',
                    textShadow: isChallenge ? `0 0 24px ${accent}55` : 'none',
                  }}>
                    {para}
                  </p>
                );
              })}
            </div>
            <VoiceButton label="HEAR COACH MIKE: SEVEN PILLARS, SIX DECADES, THE RECORD, AND THE INVITATION" />
          </div>
        </section>
      )}

      {/* ── PILLAR NAVIGATION ── */}
      <section style={{ padding: 'clamp(60px,8vw,100px) 0', background: 'linear-gradient(160deg, #0d2848 0%, #041530 100%)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 w-full">
          {/* All 7 pillars overview */}
          <div style={{ marginBottom: '52px' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '3px', color: BLUE2, textTransform: 'uppercase', margin: '0 0 24px' }}>EXPLORE ALL 7 PILLARS</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-start" style={{ maxWidth: '960px' }}>
              {([
                { num: '01', label: 'MindSet', a: '#00f2ff' },
                { num: '02', label: 'Skating', a: BLUE2 },
                { num: '03', label: '7AMS', a: BLUE },
                { num: '04', label: '6 Zone – 7 Point System™', a: BLUE3 },
                { num: '05', label: 'Form', a: '#38bdf8' },
                { num: '06', label: 'Game & Practice', a: '#22d3ee' },
                { num: '07', label: 'Lifestyle', a: BLUE2 },
              ] as { num: string; label: string; a: string }[]).map((p, i) => {
                const isCurrentPillar = String(i + 1) === id;
                return (
                  <TiltCard
                    key={i}
                    effect="gravitate"
                    tiltLimit={10}
                    scale={1.06}
                    style={{
                      border: isCurrentPillar ? `2px solid ${p.a}` : `1px solid ${p.a}33`,
                      borderRadius: '14px',
                      boxShadow: isCurrentPillar ? `0 0 24px ${p.a}35` : 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => router.push(pillarDetailHref(i + 1, fromKey))}
                  >
                    <div style={{ padding: '18px 10px 16px', background: isCurrentPillar ? `linear-gradient(160deg, ${p.a}18, rgba(4,18,44,0.92))` : 'rgba(4,18,44,0.88)', backdropFilter: 'blur(16px)', borderRadius: '13px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '2px', background: p.a, borderRadius: '2px', opacity: isCurrentPillar ? 1 : 0.5 }} />
                      <p style={{ fontSize: '22px', fontWeight: 900, color: p.a, lineHeight: 1, margin: 0, textShadow: isCurrentPillar ? `0 0 16px ${p.a}80` : 'none' }}>{p.num}</p>
                      <p style={{ fontSize: '9px', color: isCurrentPillar ? `${p.a}EE` : `${p.a}88`, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: 0, lineHeight: 1.4 }}>{p.label}</p>
                      {isCurrentPillar && (
                        <div style={{ background: `${p.a}22`, border: `1px solid ${p.a}55`, borderRadius: '20px', padding: '2px 8px' }}>
                          <p style={{ fontSize: '7px', color: p.a, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 }}>CURRENT</p>
                        </div>
                      )}
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          </div>

          {/* Prev / Next navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              {hasPrev && (
                <button
                  onClick={() => router.push(pillarDetailHref(prevId, fromKey))}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(96,205,255,0.22)', borderRadius: '12px', padding: '14px 22px', color: BLUE2, fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(55,181,255,0.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  <ArrowLeft size={14} />
                  PILLAR {prevId}
                </button>
              )}
            </div>
            <button
              onClick={() => router.push(sevenPillarsHubHref(fromKey))}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', transition: 'color 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = BLUE2; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
            >
              ALL 7 PILLARS
            </button>
            <div>
              {hasNext && (
                <button
                  onClick={() => router.push(pillarDetailHref(nextId, fromKey))}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(96,205,255,0.22)', borderRadius: '12px', padding: '14px 22px', color: BLUE2, fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(55,181,255,0.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  PILLAR {nextId}
                  <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer7 />
    </div>
  );
}

export default function PillarPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#000f28',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            letterSpacing: '2px',
            fontWeight: 700,
          }}
        >
          LOADING PILLAR…
        </div>
      }
    >
      <PillarPageContent />
    </Suspense>
  );
}
