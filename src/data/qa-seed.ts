/**
 * The question index — Michael's question bank and answers.
 *
 * Source document: SG_QUESTION_INDEX_QA_20260829_v1 ("The Question Index —
 * Questions and Answers", 29 August 2026). Transcribed verbatim: every answer
 * here is Michael's wording with only the "ANSWER (draft — under Coach's
 * review):" prefix removed. Do not edit answer text in this file — wording
 * changes come from Michael, batch by batch, as he finalises his review.
 *
 * Per that document:
 *   - The questions, categories and structure are settled; build against them.
 *   - Answers marked draft in the source are under his review and may be
 *     re-worded. Re-running scripts/seed-qa-entries.ts after updating this
 *     file updates the stored entries in place.
 *   - `answer: null` = "to follow from Coach". These are kept here so the
 *     settled structure is complete, but the importer skips them — the system
 *     never serves anything Michael has not written.
 *   - Pillar 4 (6 Zone – 7 Point System™) answers are held back deliberately:
 *     the terminology is still in development. Category built, entries empty.
 *
 * A further batch of ~60 Q&As (cold questions, page-triggered, the parent's
 * set, on-ice problems, practical questions, mind and body) is coming next
 * and gets appended here when it arrives.
 *
 * The category is not part of the QAEntry data model (the library is flat);
 * it is kept here because Michael's structure files every question somewhere,
 * and the admin screen or matcher may want it later.
 */

export interface QASeedItem {
  /** Stable id from Michael's numbering — becomes Firestore doc id `qa-seed-<id>`. */
  id: string;
  category: string;
  question: string;
  /** Michael's answer, verbatim. `null` = "to follow from Coach" — not imported. */
  answer: string | null;
}

const LANDING = 'Website — Landing Page';
const SYSTEM = 'Website — System Page';
const P1 = 'Pillar 1 — MindSet';
const P2 = 'Pillar 2 — Skating Tech';
const P3 = 'Pillar 3 — 7 Angle-Marker System';
const P4 = 'Pillar 4 — 6 Zone – 7 Point System™';
const P5 = 'Pillar 5 — Form Tech';
const P6 = 'Pillar 6 — Game Performance Charting System';
const P7 = 'Pillar 7 — Practice System';
const P8 = 'Pillar 8 — Lifestyle & Hockey';

export const QA_SEED: QASeedItem[] = [
  /* ── Part 1 — Questions from the website ── */

  {
    id: 'web-01',
    category: LANDING,
    question: 'What is a “development support system”, and how is it different from lessons?',
    answer: `A lesson ends when the ice time does. A support system does not. You get the systems, the charting, the answers and the record — and it stays with you between sessions, between seasons, and after whoever is coaching you this year has moved on. Nothing here decays the day you pay for it.`,
  },
  {
    id: 'web-02',
    category: LANDING,
    question: 'You say it meets me where I am. How do you know where I am?',
    answer: null,
  },
  {
    id: 'web-03',
    category: LANDING,
    question: 'What does “nothing left to the imagination” mean in practice?',
    answer: `I have created a teaching system that leaves nothing to the imagination. Everything is broken down verbally and illustratively — you are told what, you are shown why, and you are given how. A goalie should never leave a session guessing at what he was supposed to have learned.`,
  },
  {
    id: 'web-04',
    category: LANDING,
    question: 'What are the pillars, and do I have to do all of them?',
    answer: `Areas that together make a complete goaltender — MindSet, Skating Tech, the 7 Angle-Marker System, the 6 Zone – 7 Point System™, Form Tech, Game Performance Charting, the Practice System, and Lifestyle & Hockey.

They are not a ladder and no pillar blocks another. A goalie can be strong in one and developing in another and still be very good. But the goal is the whole boat floating level — you bring up the part sitting low, because the boat lists without it.`,
  },
  {
    id: 'web-05',
    category: LANDING,
    question: 'What is the 7 Angle-Marker System?',
    answer: null,
  },
  {
    id: 'web-06',
    category: LANDING,
    question: 'What is the 6 Zone – 7 Point System™, and why is it a separate system?',
    answer: null,
  },
  {
    id: 'web-07',
    category: LANDING,
    question: 'You say video never lies. What am I supposed to see in it that I cannot see now?',
    answer: `The coverage you are creating — or not creating.

I learned this in Europe in my first year. The boards had blue plexiglass and I could see my own reflection, so during practice I went through my save techniques while watching myself. For the first time I could see the holes I was leaving.

Most goalies, young and seasoned, are not aware of the techniques they use or the coverage they create. Video shows you. Nobody has to tell you.`,
  },
  {
    id: 'web-08',
    category: LANDING,
    question: 'What does “raising your evaluation ability” actually mean?',
    answer: `Proper form in every save technique develops your technical eye — the ability to accurately critique your own performance so you can correct yourself.

That is the difference between a goalie who needs someone watching and a goalie who can fix himself. Increased knowledge makes the difference between correct and incorrect technique easy to see, and that is where consistency comes from.`,
  },
  {
    id: 'web-09',
    category: LANDING,
    question: 'You say gaps are not failures. So what is a gap?',
    answer: null,
  },
  {
    id: 'web-10',
    category: LANDING,
    question: 'What is a Baseline Profile, and how do I get one?',
    answer: null,
  },
  {
    id: 'web-11',
    category: LANDING,
    question: 'What is the “intuitive system”?',
    answer: null,
  },
  {
    id: 'web-12',
    category: LANDING,
    question: 'You say most goalies have a puzzle with no border. What are the borders?',
    answer: `Teaching goaltending used to feel like a thousand-piece puzzle with no picture on the box. No structure. No order.

So I created a border — then filled in the pieces, one skill category at a time. The border is the framework: knowing what the parts are, what each one is for, and where each sits in relation to all the others.

Talent scattered with no frame to build it on is what most goalies are given.`,
  },
  {
    id: 'web-13',
    category: LANDING,
    question: 'What does “the goalie decides when, why, where and how” look like on the ice?',
    answer: `It looks like patience.

A goalie who has been taught to read the release, read the stick, read the player and wait knows the options before they arrive. He is not guessing what comes next — he knows what can come next, and what the man in front of him can actually do from where he is.

Reacting is the position. Deciding is the difference.`,
  },
  {
    id: 'web-14',
    category: LANDING,
    question: 'What is the Mind-Vault?',
    answer: null,
  },
  {
    id: 'web-15',
    category: LANDING,
    question: '“Logic, Math, Science — every read.” How does that work in a game?',
    answer: `It is not something you calculate in the moment. It is the test every method here had to pass before it was ever taught to you.

Everything I teach has to survive four criteria — logic, common sense, math and science. If it cannot, it does not go in.

Ask that of anyone who coaches you. Including me.`,
  },
  {
    id: 'web-16',
    category: LANDING,
    question: 'Performance versus outcome — which one am I judged on here?',
    answer: `Performance — because that is the one you control.

Look at how every other sport is judged. To an untrained eye the athlete is scored on the result. Judges score the form and the execution of the technique, across an ever-changing array of situations. Goaltending has been scored on outcome for a hundred years, and outcome hides everything that caused it.

A goalie can be excellent in a loss and lucky in a win.`,
  },
  {
    id: 'web-17',
    category: LANDING,
    question: 'Why does the site say my most important relationship is with the net?',
    answer: `Because if you do not know where you are at all times in relation to the net, the crease and the white ice, you cannot make a smart decision.

Everything else — your reads, your movement, your technique — sits on top of that. Without it you are guessing, and guessing at speed looks like bad hands.`,
  },
  {
    id: 'web-18',
    category: LANDING,
    question: 'What is Game IQ, and how do you assess it?',
    answer: null,
  },
  {
    id: 'web-19',
    category: LANDING,
    question: 'What does “know what you do not know” mean?',
    answer: null,
  },
  {
    id: 'web-20',
    category: LANDING,
    question: 'What does “coach yourself between sessions” actually involve?',
    answer: `Knowing what you actually did, not what you think you did — and knowing what to work on next without being told.

That comes out of charting and out of evaluating yourself honestly. Having an open mind to learning is the key to your growth.

A goalie who can find his own problem and work at it has stopped needing me standing behind him. That is the aim.`,
  },
  {
    id: 'web-21',
    category: SYSTEM,
    question: 'What is a Factor Ratio?',
    answer: null,
  },
  {
    id: 'web-22',
    category: SYSTEM,
    question: 'What is the Technical Eye?',
    answer: `The gap between what you think happened out there and what actually did.

Every goalie has one. Almost nobody measures it. We want you to develop a technical eye toward goaltending — because closing that gap is the fastest change that happens to a goalie here, and it is the part nobody can do for you.`,
  },
  {
    id: 'web-23',
    category: SYSTEM,
    question: 'What is the Feel Factor?',
    answer: null,
  },
  {
    id: 'web-24',
    category: SYSTEM,
    question: 'What is a good goal and a weak goal — and who decides which it was?',
    answer: null,
  },
  {
    id: 'web-25',
    category: SYSTEM,
    question: 'What is Designated Training, and who sets my one directive?',
    answer: `Probably the most neglected aspect of goaltending. Work aimed at one specific thing — a movement, a read, a habit, a piece of equipment — trained on purpose rather than buried inside general drills.

It covers mobility, form, net management front and back, and the number one designated area, the mind.

The directive comes out of what your own charting says needs attention. Not a guess, and not the same one everybody else gets.`,
  },
  {
    id: 'web-26',
    category: SYSTEM,
    question: 'What are Strong Side and Weak Side, and how do you close the gap?',
    answer: null,
  },
  {
    id: 'web-27',
    category: SYSTEM,
    question: 'My rating dips. What happens next?',
    answer: null,
  },
  {
    id: 'web-28',
    category: SYSTEM,
    question: 'Is that really your voice, or a computer?',
    answer: null,
  },
  {
    id: 'web-29',
    category: SYSTEM,
    question: 'You say this is a system, not a program. What is the difference to me?',
    answer: `A program ends. A system grows.

What you learn here does not go stale between seasons and does not vanish when a camp finishes. Every goalie who comes in adds to what serves the next one.

The difference to you is that season three is worth more because season one is still there.`,
  },
  {
    id: 'web-30',
    category: SYSTEM,
    question: 'What happens to my record if I stop?',
    answer: `It stays exactly where you left it.

Take the summer off, take a season off — your charts, your answers, your progress are waiting. You come back and pick up, not start again.

You are not ever starting over.`,
  },

  /* ── Part 2 — Questions by pillar ── */

  {
    id: 'p1-1',
    category: P1,
    question: 'Why is MindSet the first pillar when I came here to stop pucks?',
    answer: `Because if you cannot control what is inside, you cannot control what is outside. That is the whole argument and it took me sixty years to say it that plainly.

It does not mean a goalie with a soft mental game cannot be very good. Plenty are, and I have coached them. It means the mind is where control starts, and control is the job. Without the right mind set, it will not matter how skilled you are.`,
  },
  {
    id: 'p1-2',
    category: P1,
    question: 'What is the Mind-Vault?',
    answer: null,
  },
  {
    id: 'p1-3',
    category: P1,
    question: 'My goalie falls apart after one bad goal. What is actually happening?',
    answer: `Nothing is wrong with him. He has been trained in everything except the one thing that decides it.

The mind is the number one designated area here — not a personality trait you either have or you do not, but a discipline that gets trained like edges or angles. Most goalies have never had a single minute of instruction in it, and then get told to shake it off by people who cannot tell them how.

Skill is what you have. Control is what lets you use it.`,
  },
  {
    id: 'p1-4',
    category: P1,
    question: 'What is the difference between performance and outcome, and why does it matter?',
    answer: `You control one. You do not control the other.

To an untrained eye, an athlete in any sport is scored on the result. Judges score the form and the execution of the technique, across an ever-changing array of situations. Goaltending has been scored on outcome for a hundred years, and outcome hides everything that caused it.

A goalie can be excellent in a loss and lucky in a win. We chart the part he owns.`,
  },
  {
    id: 'p1-5',
    category: P1,
    question: 'How do I handle pressure instead of hoping it does not turn up?',
    answer: null,
  },

  {
    id: 'p2-1',
    category: P2,
    question: 'How is goalie skating different from player skating?',
    answer: `A player skates to travel. A goalie skates to be in the play.

And you will not always get there. A quick pass creates a gap that no amount of foot speed closes, and it happens at every level.

What decides the save then is not your feet. It is whether you know the net and the crease well enough to know what the puck sees from where it is — because that is what tells you what power, or what technique, the moment needs.

Goalie skating is not player skating.`,
  },
  {
    id: 'p2-2',
    category: P2,
    question: 'Why am I gassed by the third period when I barely left my crease?',
    answer: `Start with the ordinary answers, because they are usually part of it. Conditioning, sleep, what you ate and when, what you have had to drink. No system on earth overcomes a goalie running on four hours and a bag of candy.

Then the part nobody looks at: you are probably moving more than the play requires. The standing rule here is maximum coverage, minimal movement. Every unnecessary movement is paid for later in the game, and it is paid at the worst moment.

Look after the body, and stop paying for movement that bought you nothing.`,
  },
  {
    id: 'p2-3',
    category: P2,
    question: 'What is M.E.T. — Movement, Energy and Time?',
    answer: `No wasted movement. No wasted energy. No wasted time.

They are a chain, not three ideas. An unnecessary movement costs energy. Spent energy costs focus. Lost focus costs the fraction of a second you needed. Waste one and you have wasted all three.`,
  },
  {
    id: 'p2-4',
    category: P2,
    question: 'My goalie is always half a second late. Is that just slow feet?',
    answer: `Usually not. Late is a reading problem far more often than a foot problem, and it comes in two opposite shapes.

Over-anticipating — he decided before the play told him, and now he is recovering from his own guess. Over-reacting — he responded to the first thing he saw instead of the thing that mattered.

They look identical from the stands and they need opposite work. Which one it is, is the first thing worth finding out.`,
  },
  {
    id: 'p2-5',
    category: P2,
    question: 'Why does stopping matter more than starting?',
    answer: null,
  },

  {
    id: 'p3-1',
    category: P3,
    question: 'What is the 7 Angle-Marker System?',
    answer: `It is how a goalie knows exactly where he is, above the icing line, without turning to look for it.

I created it in 1977, at twenty-two, while I was still playing — and I give Dave Dryden credit for marker 4. That one picture gave me the grid that can take anyone and make him or her a positionally strong goaltender who is consistent in play.

It is taught inside the system. What matters out here is what it replaces: guessing.`,
  },
  {
    id: 'p3-2',
    category: P3,
    question: '“You were off your angle.” What does that actually mean?',
    answer: `If you do not know where you are at all times in relation to the net, the crease and the white ice, you cannot make a smart decision.`,
  },
  {
    id: 'p3-3',
    category: P3,
    question: 'How do I know where I am in my net without looking for the post?',
    answer: `The same way you know where the light switch is in your own house at night.

A goalie is evaluated here on eight things, and two of them are knowing his net and knowing his angles. Not checking them — knowing them. Every glance you spend finding a post is a glance you did not spend on the play, and the play does not wait.

That certainty is trained. It is not a gift some goalies were born with.`,
  },
  {
    id: 'p3-4',
    category: P3,
    question: 'Why seven markers instead of just telling me to be square?',
    answer: `Because “be square” is a description, not an instruction. Two goalies hear it and stand in two different places, and neither can tell you why.

Markers give the ice addresses. A place with a number on it can be taught, checked, charted and corrected. A feeling cannot.

That is the difference between coaching a goalie and commentating on him.`,
  },
  {
    id: 'p3-5',
    category: P3,
    question: 'What is the difference between being centred and being positionally strong?',
    answer: `They are two different things and they fail separately — which is exactly why we separate them.

Centred is your line to the puck and to the net. Positionally strong is your depth, and depth is decided by the puck, the man holding it, his options and the situation.

A goalie can be one and not the other, and the correction is completely different in each case. “Off his angle” cannot tell you which one broke. We can.`,
  },

  /*
    Pillar 4 — all five answers held back deliberately (Michael, 29 Aug 2026):
    the terminology is still in development and he is not releasing it yet.
    The questions stand; the entries stay empty until he does.
  */
  {
    id: 'p4-1',
    category: P4,
    question: 'What do I do when the puck goes behind my net?',
    answer: null,
  },
  {
    id: 'p4-2',
    category: P4,
    question: 'Do I play the puck or the man back there?',
    answer: null,
  },
  {
    id: 'p4-3',
    category: P4,
    question: 'Why do wraparounds keep beating me?',
    answer: null,
  },
  {
    id: 'p4-4',
    category: P4,
    question: 'What is the 6 Zone – 7 Point System™?',
    answer: null,
  },
  {
    id: 'p4-5',
    category: P4,
    question: 'Why is behind the net taught as its own system instead of part of angles?',
    answer: null,
  },

  {
    id: 'p5-1',
    category: P5,
    question: 'What is the Set-Crouch, and is there only one?',
    answer: `There is not one. There is yours.

Most goalies are never trained to understand that they have a very personal set crouch. Your height and your weight have to be taken into account before anything else — and a stance copied off a professional who is eight inches taller than you is not a stance, it is a costume.

We start from your body, not from somebody else's.`,
  },
  {
    id: 'p5-2',
    category: P5,
    question: 'What does “maximum coverage, minimal movement” mean?',
    answer: `The more coverage you create, the more you increase your chances of stopping the puck. That is not a slogan, it is arithmetic.

The second half is the discipline. Coverage bought with unnecessary movement costs you energy, focus and time — and you pay for it later in the game.

Take up the most space you can, using the least you have to.`,
  },
  {
    id: 'p5-3',
    category: P5,
    question: 'Why do my rebounds keep coming back to the slot?',
    answer: `Because a rebound is not luck. It is a consequence of where you were and what you did, and it is decided before the puck ever arrives.

That is why the first save is worth far less here than what follows it. Anyone can stop the first shot. The second, third and fourth are where games are decided, and almost nobody charts them.

Where the rebound goes is information about you. We treat it that way.`,
  },
  {
    id: 'p5-4',
    category: P5,
    question: 'Am I going down too much?',
    answer: `Ask it a better way: are you going down before the shot?

A goalie who drops early stops responding to the shooter and starts announcing himself. At competitive levels that makes him predictable, and predictable gets solved — usually high, while he is covering low.

Here is the test you can run tonight. If you are dropping on every shot, can you actually detect that you are going down before the release? Most goalies cannot, and that is the real answer.

Knowing when to go down, when to stay standing, and when either will do — that is the skill. Not the drop.`,
  },
  {
    id: 'p5-5',
    category: P5,
    question: 'What does it mean that goalies create coverage?',
    answer: `It is my one-line definition of the whole position.

You are not there to react to a puck. You are there to occupy the net so that the shot has nowhere to be. Every technique in this system is judged on the coverage it creates — or does not create.

Most goalies, young and experienced, have never been shown the coverage they are actually making. Once they see it, they stop guessing about it.`,
  },

  {
    id: 'p6-1',
    category: P6,
    question: 'What is charting, and why does it matter so much here?',
    answer: `It is the record of what actually happened, kept by the person it happened to.

A career held in memory is a career held badly — memory lies in the same direction every time. A kid has a great season at thirteen and by fifteen nobody remembers what worked. Not his coach, not his parents, not him. So he starts over.

Charting is how you stop starting over. It is also where your next directive comes from, so it is not paperwork — it is the engine.`,
  },
  {
    id: 'p6-2',
    category: P6,
    question: 'What is the Technical Eye?',
    answer: `The gap between what you think happened out there and what actually did.

Every goalie has one. Almost nobody measures it. Closing that gap is the fastest change that happens to a goalie here, and it is the part nobody can do for you.`,
  },
  {
    id: 'p6-3',
    category: P6,
    question: 'What is a good goal and a weak goal — and who decides which it was?',
    answer: null,
  },
  {
    id: 'p6-4',
    category: P6,
    question: 'What does a chart show that a coach watching from the bench does not?',
    answer: `A coach sees the result. The chart sees the cause.

In every other judged sport, athletes are scored on form and execution of technique across changing situations. Goaltending gets scored on whether the puck went in — which tells you almost nothing about why it went in, and nothing at all about the four saves before it.

The chart also sees across time, which no pair of eyes can. One game is an opinion. Thirty games is evidence.`,
  },
  {
    id: 'p6-5',
    category: P6,
    question: 'My rating dipped. What happens next?',
    answer: null,
  },

  {
    id: 'p7-1',
    category: P7,
    question: 'How much of a team practice is actually any use to a goalie?',
    answer: `Less than you would like, and it is worth doing the arithmetic instead of arguing about it.

In all my years between the pipes I put practices into three categories. Not worth getting dressed for. Had something in it for me. Had a lot in it for me.

Say you have twenty-four hours of team practice. Throw away half straight off — skating for the players, breakouts, offensive work, drills where you are a target. Of the twelve left, about six are moderate use. That leaves six hours out of twenty-four that are genuinely yours.

That is not a complaint about your coach — he has twenty players to develop. It is the reason a goalie needs his own plan walking into the rink.`,
  },
  {
    id: 'p7-2',
    category: P7,
    question: 'What is Designated Training?',
    answer: `Probably the most neglected aspect of goaltending. Work aimed at one specific thing — a movement, a read, a habit, a piece of equipment — trained on purpose rather than buried inside general drills.

It covers mobility, form, net management front and back, and the number one designated area, the mind.

You cannot get good at something you have never isolated.`,
  },
  {
    id: 'p7-3',
    category: P7,
    question: 'What do I do when the puck is at the other end of the rink?',
    answer: `You work. That is Opportunity Time, and it is my own.

I asked my coaches to let me use the time that was, for me, wasted — when I would go to a knee while the team was called to the boards to draw up a drill. I asked if I could go to my net and work my game. If the team had twenty minutes of set skating, I asked to skate part of it and then go work my own skills. I was a good skater as a player, but goalie skating is different.

You ask your coach's permission first — this is a cooperative arrangement, not freelancing. Then you go to your net and work the directive you came in with.`,
  },
  {
    id: 'p7-4',
    category: P7,
    question: 'Why do I need a directive before I step on the ice?',
    answer: `Because without one you are attending practice instead of using it.

A bored goalie is a goalie who has not been given a job. With a directive, the dead time in every practice becomes yours — and there is a lot of dead time.

And it is not a directive somebody invented for you. It comes out of your own charting, which means it is aimed at the thing that is actually costing you goals.`,
  },
  {
    id: 'p7-5',
    category: P7,
    question: 'How do I practise on my own without a shooter?',
    answer: null,
  },

  {
    id: 'p8-1',
    category: P8,
    question: 'What should I eat, and how much sleep do I actually need?',
    answer: `These are foundation. Not to hockey — to a balanced life and an athletic life, and hockey sits on top of both.

How you treat your body — your temple — will be directly reflected in how you perform. If not today, then one day soon. And when it shows up it is crippling to performance.

That is the part young athletes do not believe until it is already happening. The bill for a badly-run week is not paid that week. It is paid in the third period of a game that mattered, months later, and almost nobody traces it back.

So we chart it — nutrition, hydration, sleep and rest, alongside mental preparation, physical training, game-day routine and recovery. Not to lecture anybody. Because seeing your own record show you the connection between how you lived and how you played is worth more than being told it a hundred times.

You are building an athlete first. The goalie is what the athlete does.`,
  },
  {
    id: 'p8-2',
    category: P8,
    question: 'How do I balance school with hockey?',
    answer: null,
  },
  {
    id: 'p8-3',
    category: P8,
    question: 'Does off-ice training matter for a goalie?',
    answer: null,
  },
  {
    id: 'p8-4',
    category: P8,
    question: 'My goalie had a growth spurt and lost his game. What happened?',
    answer: `He did not lose it. The frame changed. The understanding did not.

Weight, balance, coordination, reach, how the gear sits — all of that moved. The markers did not. Angle-Marker 4 still sees the whole net. Movement, Energy and Time still apply. His Technical Eye is still his.

A goalie taught a style has to rebuild it, because the style belonged to the old body. A goalie taught a system carries the system across.

Never call it starting over. He is adapting — and the growth is not a setback, it is the beginning of a new era.`,
  },
  {
    id: 'p8-5',
    category: P8,
    question: 'What is the Maintenance Program?',
    answer: `Four pillars, and they exist because of one line: what you do not maintain, you lose.

Your Charting Routine. Your Practice Schedule. Your Knowledge Base. Your Pinnacle Routine.

Every goalie has watched something he had in October disappear by January. It did not disappear — it was not maintained. This is the part of development that has no season.`,
  },
];
