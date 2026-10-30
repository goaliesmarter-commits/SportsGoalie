/**
 * Coach Audio — Michael's recorded voice lines.
 *
 * Naming note: this codebase already uses "voice" for the parent feedback
 * feature (`parent_voice_submissions`, /admin/voice-queue). That is unrelated
 * to audio. Everything to do with Coach Mike's recordings is "coach audio".
 *
 * Two halves, deliberately kept apart:
 *
 *   COACH_AUDIO_CATALOGUE — what *should* exist. A code constant, because the
 *   IDs and the script lines are settled and are not editable data. Michael
 *   fixed these in the 9 September copy pack.
 *
 *   CoachAudioClip (Firestore) — what *has been uploaded*. One document per
 *   catalogue ID, keyed by the ID itself.
 *
 * Keeping them separate is what lets the admin screen show a clip as MISSING
 * rather than simply not showing it. On 12 September Michael sent 51 of the 59
 * files; the eight pillar intros (V-A-19 to V-A-26) were not in the folder even
 * though his pack said only MindSet was outstanding. A catalogue that lives in
 * code makes that kind of gap visible instead of silent.
 */

/** The five recording groups from Section 2 of the copy pack, plus the two
 *  groups added with the 29 September voice batch (outside the copy pack's
 *  V-A/V-B numbering: the Driver-or-Passenger assessment and the parent/coach
 *  onboarding lines). */
export type CoachAudioPart =
  | 'orientation' // Part 1 · V-A-01 to V-A-05
  | 'systems' // Part 2 · V-A-06 to V-A-17
  | 'pillars' // Part 3 · V-A-18 to V-A-26
  | 'utility' // Part 4 · V-A-27 to V-A-37
  | 'triggers' // Part 5 · V-B-01 to V-B-22
  | 'assessment' // Driver-or-Passenger · DOP-INTRO, DOP-A to DOP-D
  | 'guardian'; // Parent/coach onboarding · PARENT-WELCOME, PARENT-P2 to P8, COACH-WELCOME

export const COACH_AUDIO_PART_LABELS: Record<CoachAudioPart, string> = {
  orientation: 'Part 1 — Orientation',
  systems: 'Part 2 — The Systems',
  pillars: 'Part 3 — The 8 Pillars',
  utility: 'Part 4 — Utility',
  triggers: 'Part 5 — Trigger messages',
  assessment: 'Driver or Passenger',
  guardian: 'Parent & Coach Onboarding',
};

export const COACH_AUDIO_PART_ORDER: CoachAudioPart[] = [
  'orientation',
  'systems',
  'pillars',
  'utility',
  'triggers',
  'assessment',
  'guardian',
];

/**
 * A recording that is on file but must not play, because Michael has said he
 * is re-recording it.
 *
 * The hold is by upload date, not by a flag someone has to remember to clear:
 * every upload stamps a fresh `uploadedAt`, so the new take plays the moment it
 * is uploaded, with no code change. Until then the old take stays silent.
 */
export interface CoachAudioReRecord {
  /** Why the take on file is held, in words for the admin screen. */
  reason: string;
  /** A take uploaded before this instant is the old one. ISO 8601. */
  heldBefore: string;
  /**
   * True once the entry's `scriptLine` already holds the new wording, so only
   * the recording is out of date. The new take can then show its transcript as
   * soon as it is uploaded. Left unset while the wording itself is unsettled.
   */
  wordingFinal?: boolean;
}

/** One expected recording. */
export interface CoachAudioCatalogueEntry {
  /** e.g. 'V-A-01'. Also the Firestore document id and the storage filename. */
  id: string;
  part: CoachAudioPart;
  /** The words Michael reads. Used as the accessible transcript and as the admin label. */
  scriptLine: string;
  /**
   * For V-B clips only: the Block B message id this reads verbatim (B-01 ... B-22).
   * The mapping is one-to-one by design — Michael's pack says "no lookup table needed".
   */
  readsMessageId?: string;
  /** Set when the clip is known not to have been recorded yet, with the reason. */
  notYetRecorded?: string;
  /**
   * Set when Michael is re-recording the clip. `scriptLine` is then the old
   * wording, so it is kept off the public pages until the new wording arrives.
   */
  reRecord?: CoachAudioReRecord;
  /**
   * Set when Michael has taken the clip out of use for now (his "Held /
   * Potential builds" list). The entry and any upload stay on file and on the
   * admin screen, but the clip plays nowhere. Removing this line puts it back.
   */
  parked?: string;
}

/** An uploaded recording. Firestore: `coach_audio_clips/{id}`. */
export interface CoachAudioClip {
  /** Matches a CoachAudioCatalogueEntry.id. */
  id: string;
  url: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  /** Read off the audio element at upload time. Null if the browser could not decode it. */
  durationSeconds: number | null;
  /** The name of the file as Michael sent it, kept for the audit trail. */
  originalFilename: string;
  uploadedAt: Date;
  updatedAt: Date;
}

/** A catalogue entry joined to its clip, if one has been uploaded. */
export interface CoachAudioStatus {
  entry: CoachAudioCatalogueEntry;
  clip: CoachAudioClip | null;
}

/* ─── The catalogue ──────────────────────────────────────────────────────────
 *
 * 73 entries. Script lines are transcribed from the manifest Michael supplied
 * alongside the .wav files on 12 September, updated 29 September with the
 * final wording from the 34-clip voice batch (V-A-01, 02, 05, 10 corrected;
 * V-A-19–26 pillar intros added; the Driver-or-Passenger and parent/coach
 * onboarding lines added under the 'assessment' and 'guardian' parts).
 *
 * Voice Block 1 (approved by Michael 1 October) then replaced the wording of
 * ten Part 1 and Part 2 lines with the final scripts: V-A-01, 02, 03, 05, 06,
 * 07, 08, 09, 10 and 14. Each scriptLine is the script he sent, word for word,
 * and is what the matching mp3 says.
 *
 * Voice Blocks 3 to 6 (1 and 2 October) did the same for the rest of what is
 * recorded so far: DOP-INTRO and DOP-A to D, PARENT-WELCOME and PARENT-P2 to P8,
 * COACH-WELCOME, V-A-04, 11, 12, 13, 15 and 18, and V-B-02, 04, 06, 07 and 09.
 * V-A-27 to 37 and V-B-01, 03, 05 and 08 came back unchanged.
 *
 * Voice Block 7 (his "FINAL, Coach's wording, 6 Oct 2026", received 11 October)
 * replaced V-B-10 to V-B-19 with new scripts, word for word from his
 * 00_BLOCK7_SCRIPTS.txt. He says the new takes replace every earlier take of
 * those numbers. V-B-20 to 22 are Block 8 and are still the 12 September
 * wording until it arrives. V-A-16 and V-A-17 are in no block so far and are
 * also still the 12 September wording.
 *
 * Coach's answers of 17 October (parts 1 and 2) changed five scripts: V-A-13
 * (what the Factor Ratio means), V-A-17 (goalie dashboard), V-A-19 (MindSet
 * opening), V-A-32 and V-B-12. Each has the new wording below and a `reRecord`
 * hold, so the old take stays silent and the new one plays the moment it is
 * uploaded. The same answers parked V-A-14 and V-A-16 (held), V-A-31, 33 and 34
 * (they assume a spoken answer) and V-A-36 (the goalie decides when the day is
 * done). A parked clip stays in this list and on the admin page, and plays
 * nowhere. Nothing was deleted.
 *
 * Block 7 changed what several triggers say, not just how they say it (V-B-11
 * no longer mentions seven days, V-B-13 no longer mentions three weeks). When
 * the message cards are built, their on-screen text must come from these
 * lines, not from the 12 September copy pack.
 *
 * One deliberate divergence from the written copy pack, his and correct:
 *
 *   V-B-22 records only the banner line, not the sub-line. The sub-line was
 *   always meant to be read rather than heard.
 *
 * (V-B-18 was a second: it dropped a "[N] weeks running." opening because he
 * cannot speak a number that changes. The Block 7 script replaced that line
 * and contains no number.)
 */

const PARKED_SPOKEN_ANSWER =
  'Potential build, 17 October. It assumes the goalie speaks an answer, which is not built. Kept on file to add as the experience grows.';

export const COACH_AUDIO_CATALOGUE: CoachAudioCatalogueEntry[] = [
  // ── Part 1 · Orientation ──────────────────────────────────────────────────
  {
    id: 'V-A-01',
    part: 'orientation',
    scriptLine:
      "Welcome. I'm Coach Mike. Before there were goalie coaches, there were goalies, all of us flying by the seat of our pants, trying to figure it out and in most cases alone. I was one of them. With no roadmap, no books really teaching the position in the market back in the 60's, so I embarked on studying and learning from everyone I saw, to understand the pieces to the puzzle. Smarter Goalie is my life's work. Not smart? Get smart.",
  },
  {
    id: 'V-A-02',
    part: 'orientation',
    scriptLine:
      'Coach Mike here: Welcome to a platform built for goaltending and life, available right at your fingertips for as long as you play the game. Smarter Goalie features an intuitive system designed to establish your baseline profile from day one. The unique teaching process coupled with the analytics and precise charting, the platform continuously evolves alongside you, adapting to your growth and refining your performance at every stage of your development. Think Smart. Play Smart.',
  },
  {
    id: 'V-A-03',
    part: 'orientation',
    scriptLine:
      '"Built Not Born" is our core philosophy. It means goaltending performance isn\'t an innate gift or pure luck. It is systematically developed through mental mastery, deliberate practice, and cognitive training. Every save, decision, and reaction is shaped by training your brain to think, process, and perform physically under pressure. Practice Smart. Play Smart.',
  },
  {
    id: 'V-A-04',
    part: 'orientation',
    scriptLine:
      "One rule that matters more than any technique I'll teach you. Chart what actually happened. The most important person you need to be honest with is yourself, and in doing so, you are being very realistic, not candy coating anything, as that serves only the opposition. A chart you shade to look good teaches me nothing, and it teaches you less. So, honesty is the best policy! Think Smart. Play Smart.",
  },
  {
    id: 'V-A-05',
    part: 'orientation',
    scriptLine:
      'The smarter goalie has a commitment to deliberate mental and physical improvement. By systematically learning, routines are built, self-awareness and self-evaluation grow confidently. You will transform your goaltending performance and achieve unstoppable, game-to-game consistency. Commit Smart. Play Smart.',
  },

  // ── Part 2 · The Systems ──────────────────────────────────────────────────
  {
    id: 'V-A-06',
    part: 'systems',
    scriptLine:
      "The 7 Angle-Marker System. Above the icing line. It creates an unshakable connection to the net, the crease and white ice. Coach Mike designed this system using actual landmarks that exist on the ice, with the exception of angle 4, no visible marker. The system is connected to the net, and with Coach Mike's systematic way of teaching, you become one with net, crease and white ice, simplifying your game and making it look easy. Positional play shows intelligence and a smart decision making process to stay with the puck, the play. Learn Smart. Play Smart.",
  },
  {
    id: 'V-A-07',
    part: 'systems',
    scriptLine:
      "The 6 Zone, 7 Point System is Smarter Goalie's framework to keep the advantage in the goalie's house below the icing line. Built with strategy and tactic play using our core 4 principles of Logic, Common Sense, Math, and Science, it maps the ice behind and beside the net into 6 zones and 7 points to create dominance below the icing line. Think Smart. Play Smart.",
  },
  {
    id: 'V-A-08',
    part: 'systems',
    scriptLine:
      'In the 7 Angle-Marker System: Angles 1 and 7 are the same. Angles 2 and 6 are the same. Angles 3 and 5 are the same. Angle 4 is the dividing line from one end zone to the other end zone net.',
  },
  {
    id: 'V-A-09',
    part: 'systems',
    scriptLine:
      'Depth and multi-level play using the 4 Level Arch System. Level 1, top of the crease. Level 2, low slot. Level 3, mid slot. Level 4, high slot. Regardless of angle, the 4 Level Arch System is an asset in many ways and is utilized in elevating the positional game, maximizing positional strength given the game situation. Positional strategies and tactical play. Think Smart. Play Smart.',
  },
  {
    id: 'V-A-10',
    part: 'systems',
    scriptLine:
      "Three lanes of attack: the left lane, the center lane and the right lane. Opponent's Zone, Neutral Zone, End Zone. Learning to see the ice, the puck and options the player with the puck has is the chess game unfolding. Read Smart. Play Smart.",
  },
  {
    id: 'V-A-11',
    part: 'systems',
    scriptLine:
      'In the game, performance runs on V.M.P: the Visual, Mental, Physical relationship. We have two visual intakes, the focused eye and the peripheral eye. The brain must decipher the correct information to react to physically. You see it, your mind processes it, your body responds. That order is simple science, and understanding it is powerful. Training the subconscious is the target and the goal. Think Smart. Play Smart.',
  },
  {
    id: 'V-A-12',
    part: 'systems',
    scriptLine:
      'No wasted movement, no wasted energy, no wasted time. Waste one and you waste all three. The goal is to understand all the pieces to the puzzle. For me, goaltending was a 500 piece puzzle with no border and no picture. Well, now it has a border and a picture, and 6 decades of study and learning, breaking down this unique position in sports to simplify and accelerate learning and development. Learn Smart. Think Smart.',
  },
  {
    id: 'V-A-13',
    part: 'systems',
    scriptLine:
      "The Factor Ratio is the bar that illustrates how you handled the game challenges you were confronted with: the standard of play, the challenge level, the speed of the play, and more. Period by period, you rate how much of a factor you were. No two games or shifts are exactly the same. A tough opponent, a slow start, a late push. So the question is never just how hard the game was. It's how you faced each challenge, overall and in comparison. Judging the goals against, for example, or the decisions made that need adjusting. Then we ask why. Your concentration. Your decisions. Over-reacting. Positional play above or below the icing line. Your game chart confirms what you observed about yourself across the pillars, and the content you provide shows your consistent patterns in decision making and what needs attention. Think smart, play smart.",
    reRecord: {
      reason: 'Final wording (v3) from Coach Mike, 24 October. The take on file reads an earlier script.',
      heldBefore: '2026-10-17T22:53:00Z',
      wordingFinal: true,
    },
  },
  {
    id: 'V-A-14',
    part: 'systems',
    scriptLine:
      "The Mind-Vault is your impenetrable inner sanctuary and personal repository for peak mental performance. Designed to help goalies move beyond fleeting feelings of confidence, it serves as a carefully curated vault where you store your hard-won successes, proven strategies, and core mental anchors. When high-pressure game situations hit, you don't have to hope for poise. You simply access it, filter out the noise, master the quick reset, and command your game with complete composure. Build Smart. Play Smart.",
    parked:
      'Held, 17 October. There is no separate Mind-Vault welcome: the Mind-Vault is part of the MindSet pillar, and V-A-19 now opens that pillar.',
  },
  {
    id: 'V-A-15',
    part: 'systems',
    scriptLine:
      "The Feel Factor is the part nobody else on your team is writing down. It's also the part that tells me the most. The Feel Factor crosses all physical and mental aspects a goalie needs to have to adjust in real time. Whether it's practice or game or even off ice, it will play a major role in how you stay in the now, current and responsible to self. Think Smart. Play Smart.",
  },
  {
    id: 'V-A-16',
    part: 'systems',
    scriptLine:
      'Knowledge Acquisition. The technique is not just known. It is owned, and it can be reliably deployed under any circumstance.',
    parked:
      'Held, 17 October. It repeats what the onboarding questionnaire already does. Its first line is kept for a later moment on the success trail.',
  },
  {
    id: 'V-A-17',
    part: 'systems',
    scriptLine:
      "Smarter Goalie's ultimate goal is that you become that 'Intelligent Athletic Goaltender' you dream about. True growth comes with a strong desire, determination and the will to succeed. Mastering your Technical Eye leads you to self-awareness, self-evaluation and eventually self-coaching in practice and game performance.",
    reRecord: {
      reason: 'Final wording (v3) from Coach Mike, 24 October, for the goalie dashboard. The take on file reads an earlier script.',
      heldBefore: '2026-10-17T22:53:00Z',
      wordingFinal: true,
    },
  },

  // ── Part 3 · The 8 Pillars ────────────────────────────────────────────────
  {
    id: 'V-A-18',
    part: 'pillars',
    scriptLine:
      'MindSet. Skating Tech. The 7 Angle-Marker System. The 6 Zone 7 Point System. Form Tech. Game Performance Charting System. Practice System. Lifestyle and Hockey. Who you are, what you are, can be measured. Stay up to date and current in your charting, maintenance and development processes to maintain your standard of performance. You want to be that go-to person the coach and team perform for. A number one goaltender, a starter (not a backup), elevates the bench and the coaching staff, as both parties can focus on their role knowing they have a goaltender they can depend on. Think Smart. Play Smart.',
  },
  {
    id: 'V-A-19',
    part: 'pillars',
    scriptLine:
      "Coach Mike here. Welcome to MindSet, where your Mind-Vault grows and lives. It lives in a state of confirmation and change: as your situation changes, some of it holds steady and some of it changes with you and your situation.\n\nAt Smarter Goalie, we believe that high performance isn't just a byproduct of luck. It is the result of a systematic, disciplined approach to every aspect of your game. You are the last line of defense. You occupy the most demanding position on the team and on the ice, where a split-second decision can determine the outcome of the game. That kind of pressure requires more than physical skill. It requires an unshakable mental framework.\n\nThis is your Mind-Vault.\n\nThink of your Mind-Vault not as a fleeting feeling of confidence, but as a carefully designed repository of your greatest mental assets. It is an impenetrable inner sanctuary where we store your proven strategies, your hard-won successes, and the clarity required to perform under intense pressure and challenge.\n\nIn the heat of competition, when distractions rise and mistakes happen, you don't need to hope for confidence. You need to access it. Your Mind-Vault allows you to stay balanced mentally, and self-coach with clarity and perseverance.\n\nStore and retrieve. Bank your brilliant saves and successful game scenarios, and the mantras you create, or take from the Smarter Goalie index library, so you can withdraw that confidence and reset for the next shift, exactly when you need it most.\n\nFilter the noise. Develop the laser-like focus necessary to see only what matters: the puck and the play.\n\nTrain the subconscious, the quickest part of your brain, to play free of negative influence, controlling the noise with the mantras you develop as your own, and proceed like nothing ever happened.\n\nMaster the reset. Transform a challenging goal or a mistake into data, allowing you to re-calibrate and return to peak performance in seconds.\n\nI have spent my career studying what separates the good from the truly great, and it always comes back to one truth: Greatness is built, not born. We don't leave your mental game to chance. We teach you to organize, access, and command your mind with the same precision you apply to your skating, positional play and save selection.\n\nWhether you are just starting your journey or refining and improving your game, your Mind-Vault is where your consistency, resilience, and ultimate performance begin.\n\nYour first deposit starts today. The next time the noise shows up, catch it, name it, and chart later what happened. That's how a Mind-Vault is built, one deposit at a time.\n\nLet's start building yours today. Think smart, play smart.",
    reRecord: {
      reason:
        'Final wording (v3) from Coach Mike, 24 October. It welcomes the goalie to MindSet, and several lines changed from the take on file.',
      heldBefore: '2026-10-17T22:53:00Z',
      wordingFinal: true,
    },
  },
  {
    id: 'V-A-20',
    part: 'pillars',
    scriptLine:
      "Coach Mike here. Welcome to Skating Tech.\n\nBefore we build a single stride, let me share how we do this at Smarter Goalie.\n\nEverything we teach is built on four things. Logic. Common sense. Math. And science. Nothing mysterious. Nothing you can't understand and make your own.\n\nOur first objective is Knowledge Acquisition. That means we build your Technical Eye, the ability to see and understand skating, piece by piece, the way it truly works.\n\nWe take it apart methodically, from the ice up. Your edges, your Set-Crouch, what makes motion fluid, what puts you in Game Frequency, and how movement, energy and time connect, all measured in relationship to the net.\n\nOnce you understand the pieces, you can look at your own game and see clearly where you are and where you want to grow. That is Self awareness and Self-Evaluation skills coming to life. It isn't about judging yourself. It's about knowing, so you can build with purpose.\n\nI've done this on the ice for six decades. Now we do it together, online, step by step.\n\nBuilt Not Born. Let's get to work.",
  },
  {
    id: 'V-A-21',
    part: 'pillars',
    scriptLine:
      "Coach Mike here. Welcome to the 7 Angle-Marker System, 7AMS. Think of it as your GPS, your Goalie's Positional System, above the icing line.\n\nThis one is pure logic and geometry, and that's good news, because geometry can be learned and it can be measured.\n\nOur first objective is Knowledge Acquisition. Before we move you anywhere, we build your Technical Eye for position.\n\nHere are the pieces. There's a line from the puck to the center of your net. There are seven markers across your crease, goalpost to goalpost, with Marker 4 as your center of symmetry. There's the angle, and there's your depth on that line. Put together, they describe exactly where you belong for any puck.\n\nOnce you understand that, you can look at where you play today and measure it against the line. That's your Self-Evaluation. Clear numbers, not opinions. You'll see where you're already strong and where there's room.\n\nSix decades on the ice built this system. Now we learn it together, step by step.\n\nBuilt Not Born. Let's understand your spot.",
  },
  {
    id: 'V-A-22',
    part: 'pillars',
    scriptLine:
      "Coach Mike here. Welcome to the 6 Zone - 7 Point System, your proprietary positional system designed to govern positional excellence below the icing line.\n\nAbove the line, the 7 Angle-Marker System made you the guardian of the net. Below the line is a different world, behind you, beside you, down in the corners, and without a system it is where a goalie can panic and scramble. This system puts you in the driver's seat, making sound strategic and tactical decisions.\n\nEverything we teach is built on four core filters: Logic. Common sense. Math. And science. And nowhere is order more valuable than here, because this system takes the most dynamic ice on the rink and applies a higher level of understanding. There is nothing mysterious about a wraparound, a walkout, or a pass from the side of the net or from the corner, and no play down low is too fast to read. Everything is an actionable principle you can deeply understand, execute, and make your own, so you move with the play instead of chasing it.\n\nOur first major objective is Knowledge Acquisition. We focus on building your Technical Eye so you can read the ice below the line analytically rather than reacting in panic.\n\nWe take it apart methodically, and teach you how to own your posts, when to stay on your feet and when to go down. We map the ice below the icing line with 7 grid lines, numbered 1 through 7, identical from left and right, with points 3, 4 and 5 behind the net where strategy and tactical play rule, keeping the advantage in your house. The 6 zones are the addition that elevates the map. This is your grid for smart positional consistency in the most dynamic part of the rink.\n\nThe grid never lies, and the location of the puck and the player, you dominate. The best part is it becomes a part of you. Your reads sharpen, your decisions speed up, and the chaos becomes a calm, mapped sequence.\n\nOnce you understand the individual pieces, you will progress through our structured learning loop, moving from initial instruction to recognition awareness and full dynamic transfer. You will look at your own play below the icing line with perfect clarity, using our video analysis, evaluation and charting tools, and your Goalie Baseline Profile grows with you. You will see exactly where you stand today and where you are growing. That is the essence of Self-Evaluation.\n\nI have spent six decades on the ice studying this beautiful, complex position. Now, we take all of that refined experience and bring it to you, alongside parallel support systems designed to educate your parents and team coaches simultaneously, so we can raise the standard together, online, step by step.\n\nBuilt Not Born. Let's map the ice.",
  },
  {
    id: 'V-A-23',
    part: 'pillars',
    scriptLine:
      "Coach Mike here. Welcome to Form Tech.\n\nForm is your structure, your stance, your set, the way your body makes the save. My rule is simple and it's built on common sense: foundation before flair. Build the base first, and everything else stands on it.\n\nOur first objective is Knowledge Acquisition. Before we shape anything, we build your Technical Eye for form.\n\nWe break it down methodically, using video as your mirror so you can see it for yourself, and simple science to explain why sound form does two things well: it stays consistent, and it saves energy, so you're as strong late as you are early.\n\nOnce you understand what good form is and why, you can look at your own and see clearly where it's already solid and where there's room. That's your Self-Evaluation, and it's honest and motivating, because you're measuring against something you understand.\n\nBuilt Not Born. Let's understand the foundation.",
  },
  {
    id: 'V-A-24',
    part: 'pillars',
    scriptLine:
      "Coach Mike here. Welcome to the Game Performance Charting System. This is where everything comes together, the mind, the skating, the position, the form, live, in the game.\n\nThe game is fast and it's live, so we bring it logic. In the game, performance runs on V.M.P: Visual, Mental, Physical. You see it, your mind reads it, your body responds. That order is simple science, and understanding it is powerful.\n\nOur first objective is Knowledge Acquisition. Before we sharpen anything, we build your Technical Eye for the game.\n\nWe break it down: reading the play, reading the stick and the release, anticipating so your response is on time, and staying in Game Frequency, in sync with the play.\n\nOnce you understand how game reads work, you can look honestly at your own game and see where you're strong and where there's room. That's your Self-Evaluation, and it's yours to drive.\n\nBuilt Not Born. Let's understand the game.",
  },
  {
    id: 'V-A-25',
    part: 'pillars',
    scriptLine:
      "Coach Mike here. Welcome to the Practice System, where the goalie you want to be gets built, one practice at a time.\n\nDesignated training is the most neglected aspect of goaltending. Mobility. Form. Net management, front and back. And the mind. Every one of them carries the number one. Lose one, and you lose your game.\n\nSo you never walk into a rink empty-handed. You arrive with an agenda: the couple of things your chart says need your attention. Chart. Directive. Practice. Chart. That is the Development Loop, and it turns every ice time into progress you can measure.\n\nHere is where it gets smart. Team practice is full of time a goalie can own. The players at the boards for a drill. The water break. The minute between stations. Minutes, not hours, but minutes that add up across a season. That is opportunity time.\n\nAnd you are not doing it alone. Every Smarter Goalie comes with our support, including an introduction for your team coach: a short video and a personal message from me, asking for whatever designated time your coach feels able to give, and more when it's possible. You and your parents take the lead with us. Your coach is brought in, or your coach is the one who set this up. Together, we build that time into the routine of every practice.\n\nThen you work it right. Slow is fast, and fast is slow. As you understand the mechanics, stationary or in motion, your Feel Factor grows. Speed arrives when the movement is right. It never arrives if it isn't.\n\nThis is how a goalie learns to run their own practice, and own their game.\n\nBuilt Not Born. Now go make every minute count.",
  },
  {
    id: 'V-A-26',
    part: 'pillars',
    scriptLine:
      "Coach Mike here. Welcome to Lifestyle and Hockey. In some ways this pillar holds all the others up.\n\nBeing a goalie carries into how you live, on and off the ice. And there's a simple principle behind it, backed by common sense and science: what you maintain, you keep, and what you don't maintain, you lose.\n\nOur first objective is Knowledge Acquisition. Before we change any habits, we build your Technical Eye for maintenance.\n\nWe use the 4 Pillars of Maintenance to organize it: the Charting Routine, the Practice Schedule, the Knowledge Base, and the Pinnacle Routine. And we use simple science to explain how nutrition, rest, routine and upkeep either sustain the athlete you're building or quietly work against it.\n\nOnce you understand how maintenance works, you can look at your own off-ice habits honestly and see what's serving you and what you'd like to grow. That's your Self-Evaluation, and it's yours to lead.\n\nIntegrity, honesty, values, self-awareness. On and off the ice.\n\nBuilt Not Born. Let's understand what holds it all together.",
  },

  // ── Part 4 · Utility ──────────────────────────────────────────────────────
  { id: 'V-A-27', part: 'utility', scriptLine: 'Chart saved.' },
  { id: 'V-A-28', part: 'utility', scriptLine: 'Got it.' },
  { id: 'V-A-29', part: 'utility', scriptLine: "That's in your record." },
  { id: 'V-A-30', part: 'utility', scriptLine: 'Take your time.' },
  {
    id: 'V-A-31',
    part: 'utility',
    scriptLine: 'Go ahead.',
    parked: PARKED_SPOKEN_ANSWER,
  },
  {
    id: 'V-A-32',
    part: 'utility',
    scriptLine: "Let's take a moment to review.",
    reRecord: {
      reason: 'New wording from Coach Mike, 17 October. The take on file says "Let\'s go back one step."',
      heldBefore: '2026-10-17T22:53:00Z',
      wordingFinal: true,
    },
  },
  {
    id: 'V-A-33',
    part: 'utility',
    scriptLine: 'Say that again for me.',
    parked: PARKED_SPOKEN_ANSWER,
  },
  {
    id: 'V-A-34',
    part: 'utility',
    scriptLine: "I didn't catch that one.",
    parked: PARKED_SPOKEN_ANSWER,
  },
  { id: 'V-A-35', part: 'utility', scriptLine: "Nothing here yet. That's normal on day one." },
  {
    id: 'V-A-36',
    part: 'utility',
    scriptLine: "That's all for today.",
    parked:
      'Potential build, 17 October. The goalie decides when the day is done, not the system. Kept on file.',
  },
  { id: 'V-A-37', part: 'utility', scriptLine: 'Good. Next.' },

  // ── Part 5 · Trigger messages (read B-01 to B-22 verbatim) ────────────────
  {
    id: 'V-B-01',
    part: 'triggers',
    readsMessageId: 'B-01',
    scriptLine:
      "That's your first chart in - and now it means something, because I can see what you saw. Do the next one the same way: honest, even when the number isn't pretty. A chart you shade to look good teaches me nothing, and it teaches you less.",
  },
  {
    id: 'V-B-02',
    part: 'triggers',
    readsMessageId: 'B-02',
    scriptLine:
      "Chart's in. It's on your record. Keep the content coming, the system grows like you every time you add content or travel through your courses.",
  },
  {
    id: 'V-B-03',
    part: 'triggers',
    readsMessageId: 'B-03',
    scriptLine:
      "Your Factor Ratio moved the right way. That isn't luck - that's the loop working. Now don't change three things. Change nothing, run it again, and let's see if it holds.",
  },
  {
    id: 'V-B-04',
    part: 'triggers',
    readsMessageId: 'B-04',
    scriptLine:
      'Your Factor Ratio came down. Before you take that the wrong way - a drop after a good stretch almost always means you started guessing instead of being certain. Go back to your angle first. Read, then move and continue to build.',
  },
  {
    id: 'V-B-05',
    part: 'triggers',
    readsMessageId: 'B-05',
    scriptLine:
      "Same number, three times running. Flat isn't failure - it's a plateau, and a plateau means the work stopped asking you a question. Pick the one zone you've been avoiding and put it in front of yourself.",
  },
  {
    id: 'V-B-06',
    part: 'triggers',
    readsMessageId: 'B-06',
    scriptLine:
      "Your charting is telling us that extra attention is needed. The pattern is clear from your honest charting and that's great intel for your focus and development in practice or on your own or with a support person or goalie coach on our team.",
  },
  {
    id: 'V-B-07',
    part: 'triggers',
    readsMessageId: 'B-07',
    scriptLine:
      "Here's something your own chart just told us. This insight to your game is our direction. Your strengths and the areas that need that special attention. That's the process we are in, we have a maintenance aspect to our training and a special emphasis portion to our training. With this in mind those areas the system brings to light for special emphasis are very important in advancing your game. So don't get stressed, get excited. We have direction and that gets us closer to our ultimate goal.",
  },
  {
    id: 'V-B-08',
    part: 'triggers',
    readsMessageId: 'B-08',
    scriptLine:
      "Your losses are stacking at one level of the Arch. Depth isn't a feeling - it's a decision. Top of the Crease. Low Slot. Mid Slot. High Slot. Name the level you were standing on before that shot. If you can't name it, that's your answer.",
  },
  {
    id: 'V-B-09',
    part: 'triggers',
    readsMessageId: 'B-09',
    scriptLine:
      'Your charting is giving us direction. Great work, your honesty is a guiding light. There are patterns that are good; they confirm your knowledge, decision making process, positional play and the ones that need attention. Keep up the good work on and off ice and your dreams will come true.',
  },
  {
    id: 'V-B-10',
    part: 'triggers',
    readsMessageId: 'B-10',
    scriptLine:
      "You've got flags in more than one place this week. Don't sweat the flags. This is information that we build your knowledge and skill from. Kind of like a road map: we follow the crumbs and find our way to our dream, to becoming an \"Intelligent Athletic Goaltender\" who has created a reputation on being consistent in performance, a member of the team who holds the most important role on the team. How goes the goalie, goes the team. Learn Smart. Play Smart.",
  },
  {
    id: 'V-B-11',
    part: 'triggers',
    readsMessageId: 'B-11',
    scriptLine:
      'Charting your game or your practice gives you a voice, a role, a factor in development. You have a support team here, ready to assist you to reach your goal, fulfill your dream. So, are you the driver or a passenger? You chose the most important position on the team and the responsibility it carries. Your teammates, your coach, parents, the fans are looking to your leadership. How goes the goalie, goes the team. Think Smart. Play Smart.',
  },
  {
    id: 'V-B-12',
    part: 'triggers',
    readsMessageId: 'B-12',
    scriptLine:
      'Hey, just checking in. Smarter Goalie is big on support. Wondering if you would be open to a chat on goaltending? Select YES and I will get back to you to schedule that chat.',
    reRecord: {
      reason: 'Final script (v3) from Coach Mike, 24 October (21 days, no chart). The take on file reads an earlier script.',
      heldBefore: '2026-10-17T22:53:00Z',
      wordingFinal: true,
    },
  },
  {
    id: 'V-B-13',
    part: 'triggers',
    readsMessageId: 'B-13',
    scriptLine:
      "You're back. Don't try to make up for lost time by rushing. Take a deep breath, and pound your chest like a giant gorilla, shout: I'm here, I'm ready, and I will succeed, knowing I'm never alone on this journey. A team of fellow goalies march with me. Support Smart. Goalie Smart.",
  },
  {
    id: 'V-B-14',
    part: 'triggers',
    readsMessageId: 'B-14',
    scriptLine:
      'Knowledge Acquisition Confirmed. You are a Smarter Goalie, and that level of smarts is growing. With such knowledge you can be more self-aware, you can be more self-evaluative, leading to higher self-esteem and confidence. The effort is paying off. Translating your new knowledge to your game is a process that requires patience and discipline to stay on point, balanced in understanding, and this approach will serve you well. Think Smart. Play Smart.',
  },
  {
    id: 'V-B-15',
    part: 'triggers',
    readsMessageId: 'B-15',
    scriptLine:
      "Hey, just a friendly reminder. When you fall down, and I am sure you have, did you get up most of the time, even if it took a moment or two? Of course you did. You fell off your bike, but you can ride today. You couldn't swim, but you can swim today. You couldn't walk, but one day later, your first steps. You're learning about a position in hockey that is the most complex for most, but not for us. It's broken down, and you might stumble, you might fall, but I promise you will not get up alone. You have a team of passionate goalies to help you and a platform designed for success. So shake it off, like a game after a goal, and play in the now. It's a fresh start. The past is the past, the future is now. Act Smart. Play Smart.",
  },
  {
    id: 'V-B-16',
    part: 'triggers',
    readsMessageId: 'B-16',
    scriptLine:
      "That's in your Mind-Vault now. This is what you build your game mind on, while adding what you decide that will serve you to stay balanced and calm, along with a word that describes excellence. Look it up: \"poise\". Or better, let me: an athlete's ability to maintain emotional control, sharp focus and physical execution under extreme pressure. Mental toughness when the game is on the line, a mistake is made, or the battle becomes hostile. Act Smart. Play Smart.",
  },
  {
    id: 'V-B-17',
    part: 'triggers',
    readsMessageId: 'B-17',
    scriptLine:
      "Logged. The Feel Factor is the part nobody else on your team is writing down, and it's the part that tells your support team the most. The fact is, the Feel Factor clearly identifies game feel, pre-game feel, after-game feel, period by period, game in and game out. The game frequencies is a Feel Factor, Feel Factor on goals against, mental management. The Feel Factor is a barometer and measuring tool to find what works and what doesn't work for you. Think Smart. Play Smart.",
  },
  {
    id: 'V-B-18',
    part: 'triggers',
    readsMessageId: 'B-18',
    scriptLine:
      'What makes a good goalie a great goalie? Three words: "Consistency in performance". When a team knows it has a goalie, they come to the rink with confidence, loose, knowing their goalie is always a game factor. Their goalie is always ready to perform. Their goalie gives them a chance to compete in every game. A good goalie is OK, but are they dependable? A great goalie demonstrates in practice the same game attitude to challenge their teammates to be sharp. Good versus great goaltending starts with a Smarter Goalie. Learn Smart. Play Smart.',
  },
  {
    id: 'V-B-19',
    part: 'triggers',
    readsMessageId: 'B-19',
    scriptLine:
      "Who is the most important person you compete with? Well, do you know? Seriously, do you know? It's yourself. Compete with yourself and the rest will fall into place. Examples will be provided on how to do this. So consistency in performance can be accomplished, and it should be understood that if a streak stops, it only means a chance to start it again. A tough game, a couple goals you want back: the past is the past, so learn and draw what you can from it so you don't carry it into the future. The future is a new day, a new game, a new start, so don't waste time on dwelling on something you can change today, this moment, this practice, this game, off ice and on ice. How you address this is the factor in whether you will succeed or not. Your back is full of bricks, which is a struggle to carry, or take the bricks out and fly. Manage Smart. Play Smart.",
  },
  {
    id: 'V-B-20',
    part: 'triggers',
    readsMessageId: 'B-20',
    scriptLine:
      "Your video is in. I'll watch it myself. You'll see the clock running on your account, so you know exactly what time went into it. That's how I work - you see what you're getting.",
  },
  {
    id: 'V-B-21',
    part: 'triggers',
    readsMessageId: 'B-21',
    scriptLine:
      'Your review is ready. Watch it twice. Once for what I say. Once for what you were doing before the puck ever moved.',
  },
  {
    id: 'V-B-22',
    part: 'triggers',
    readsMessageId: 'B-22',
    scriptLine: 'Michael has a message waiting.',
  },

  // ── Driver-or-Passenger assessment ────────────────────────────────────────
  {
    id: 'DOP-INTRO',
    part: 'assessment',
    scriptLine:
      'The driver knows they love to drive, and they know they want to be the best driver they can be. The passenger is just along for the ride. The driver has all the responsibility; they want to reach their destination safe and sound, while the passenger can enjoy the scenery. They have no responsibilities. So, who are you? The driver, or the passenger? The driver knows what they want, and they have the passion and the desire and will to be the best they can be. The passenger is just along for the ride. Smarter Goalie was, and is, designed for the motivated, the passionate, those who have a fire in their belly. Designed for the motivated. Are you ready to build your game? Think Smart. Play Smart.',
  },
  {
    id: 'DOP-A',
    part: 'assessment',
    scriptLine:
      "Good. The motivated act. You understand that this system is your support and guidance, and you are ready to use it to become the 'Intelligent Athletic Goaltender' and the leader you are meant to be: the number 1, the starter, the goalie teammates approach before a game and ask, \"Are you starting today?\" I am not going to chase you; I am going to provide you the tools and framework to succeed. You will get the system, you will do the work, and you will watch your reputation, confidence and self-esteem build with every repetition and every detail you master. That is the driver's path. Train Smart. Play Smart.",
  },
  {
    id: 'DOP-B',
    part: 'assessment',
    scriptLine:
      "That is an honest answer and a great place to start. Every action you take from this point forward will build your skill, knowledge and confidence. The system is your support and guidance to becoming that 'Intelligent Athletic Goaltender' and a leader on the ice, building your reputation as a starter. The work you do, whether in the driveway or on the ice and online, is where you transform. With every repetition and every fundamental detail you master, your confidence will grow, and your motivation will follow naturally. You are the architect of your own progress, the architect on how fast you get acknowledged and asked, \"What is it you're doing? Your game is getting better.\" You are building your path to success every day you're paying attention to your development. Think Smart. Play Smart.",
  },
  {
    id: 'DOP-C',
    part: 'assessment',
    scriptLine:
      "Thank you for being straight about that. Recognizing where you are is the first step to moving forward. You now have the tools to become an 'Intelligent Athletic Goaltender' and a leader. Treat this system as your support and guidance. Start by mastering one thing. As you engage with the work, each action you take will ignite your motivation and fuel your confidence, proving that you have what it takes to lead. Think Smart. Play Smart.",
  },
  {
    id: 'DOP-D',
    part: 'assessment',
    scriptLine:
      "That is a perfectly honest place to start. You do not need to be certain on day one. You are here to learn and grow, and that is what matters. Let this system provide the support and guidance you need. As you explore, ask questions, and engage with the process, your motivation and confidence will naturally grow with every step. You are on your way to becoming an 'Intelligent Athletic Goaltender,' and every action you take is a building block for your future. Learn Smart. Play Smart.",
  },

  // ── Parent & coach onboarding ─────────────────────────────────────────────
  {
    id: 'PARENT-WELCOME',
    part: 'guardian',
    scriptLine:
      "Welcome. I'm Coach Mike.\n\nBefore there were goalie coaches, there were goalies, trying to figure it out alone. I was one of them. Six decades later, this system exists so no goalie has to do that again, and so no parent has to guess how to help.\n\nIn the game of hockey, your child has chosen the position with the most responsibility. Our mission is to build Intelligent Athletic Goaltenders: goalies who understand their own game, can evaluate it honestly, and grow it on purpose. Everything we teach is built on four filters. Logic. Common sense. Math. And science. Nothing mysterious.\n\nHere is how it works. Your goalie learns eight pillars, one piece at a time. They chart what actually happened. The chart points to the work that matters. They practise it, and they chart again. The chart is a mirror. A gap isn't a failure. It's a roadmap.\n\nYou don't need to know the position to help. The system is built to educate parents alongside their goalie, in plain language, so you can learn at your own pace and understand what your child is working on, and why.\n\nWhat you share with us is not shown to your goalie directly. The system takes it in, and returns it to them selectively, as the right support at the right time. So be open with us. Every piece helps.\n\nThe most valuable thing you can give is steady support. Be supportive and encouraging, and avoid the temptation to coach from the stands. Let us carry the technical side.\n\nThis work is about more than stopping pucks. It builds character, confidence, and the habit of honest self-evaluation, for the rink and beyond it.\n\nMy commitment to you is a sincere effort, every day, to raise the bar for your goalie and for everyone around them. Welcome to the team. Built Not Born. Think Smart. Play Smart.",
  },
  {
    id: 'PARENT-P2',
    part: 'guardian',
    scriptLine:
      "Here is what the Skating Pillar course does and why we start the way we do. Skating is the engine. The stronger the engine, the better the goalie performs at game speed or, as we like to say, game frequency. Through a technical eye, we teach your child to understand the pieces to the puzzle, using plain logic, common sense, math and simple science, one piece at a time. That new understanding lets them look at their own skating honestly and see where they are and where they need improvement to grow their game. It is designed to motivate, to inspire, to encourage without discouraging. Your role stays simple: encourage the reps, recognize and provide that pat on the back, and celebrate all the stages of growth. Knowing you have their back, 'cause you're growing in knowledge, unites all. Think Smart. Play Smart.",
  },
  {
    id: 'PARENT-P3',
    part: 'guardian',
    scriptLine:
      "Before a goaltender can make a save, they must master positioning by seeing the ice through the puck's eye: understanding angle, positional play and depth related to the opposition and the goalie's own support on ice. We teach goalies to read what the shooter has and align precisely with the puck-to-net trajectory. Because positioning is measurable, goalies can evaluate their performance objectively, identify growth opportunities, and build confidence. By grounding their development in logic, common sense, math, and science, we provide a fair, motivating framework where every repetition counts and small wins build long-term success. Nothing is left to the imagination. Learn Smart. Play Smart.",
  },
  {
    id: 'PARENT-P4',
    part: 'guardian',
    scriptLine:
      "Here is what this course does. When the puck goes behind or below the icing line beside the net, the game moves quickly, so I designed a system to simplify the game. We teach your goalie to understand that grid, map first, so the busy moments become a logical read instead of a scramble. Then they can look honestly at how they handle those game situations, recognizing their decision making process along with strategy and tactical play. It's structured, it's logical, and it's built to motivate and command control. So encourage the progress and support the growth forward, and any minor setbacks, as they only serve as a reminder they know a better way. Think Smart. Play Smart.",
  },
  {
    id: 'PARENT-P5',
    part: 'guardian',
    scriptLine:
      "Here is what this course does. Form is how your child's body makes the save, and our rule is foundation before flair. Understand how to get a save stationary or in motion, and ultimately understand what the shooter has, to create the correct coverage in getting into the save and in recovery mode, for example. Through the use of video analysis, as the technical grows and the goalie sees what I see, their self-awareness is heightened and self-evaluation becomes a reality. First they understand what good form is, then they can look at their own honestly and see where attention is required. It's clear, it's visual, and it's built to motivate. They will progress to \"Form Feel\", which is the athletic growth to self. They know without seeing the breakdown point and can address it in real time. Encourage the reps and celebrate the growth. Learn Smart. Play Smart.",
  },
  {
    id: 'PARENT-P6',
    part: 'guardian',
    scriptLine:
      "Here is what this course does. Game is where everything your child builds shows up live. It works in three logical steps, see, read, react, what we call V.M.P: the Visual, Mental, Physical relationship. First we teach them to understand good game reads, like reading the shooter's stick to be ready early. Then they can look honestly at their own games and see where to grow. It's logical and it's built to motivate. Encourage the reps and celebrate the small wins, as they will turn into bigger wins. Think Smart. Play Smart.",
  },
  {
    id: 'PARENT-P7',
    part: 'guardian',
    scriptLine:
      "Here is what this course does. How your child practices is how they'll play, so we teach them to understand what makes a repetition valuable, quality over quantity, before they drill. Every rep builds a habit, so we build good ones on purpose, working on the one thing their chart names. Then they can look honestly at their own practice and see where to grow. It's logical and it's built to motivate. Encourage the reps and celebrate the small wins, as they will turn into bigger wins. Think Smart. Play Smart.",
  },
  {
    id: 'PARENT-P8',
    part: 'guardian',
    scriptLine:
      "Here is what this course does, and this is one where you matter most. Being a goalie is a lifestyle, and the principle is simple: what you maintain, you keep. We teach your child to understand how nutrition, rest and routine sustain their game, using common sense and simple science. Then they can look honestly at their own habits and see where to grow. It's practical and it's built to motivate, and the home routine is a big part of it. Your encouragement makes the difference. Encourage the reps and celebrate the small wins, as they will turn into bigger wins. Think Smart. Play Smart.",
  },
  {
    id: 'COACH-WELCOME',
    part: 'guardian',
    scriptLine:
      "Welcome, Coach. I'm Coach Mike.\n\nFor six decades I've worked with goalies, with myself being the first I taught, and I've watched team coaches carry an enormous load: a full roster, systems, lines, and one position that carries the most responsibility on the ice. What the game has rarely given coaches is the tools to really support that position. That was never a coaching failure. The tools simply weren't built.\n\nThat is our mission: to build Intelligent Athletic Goaltenders, and to give the people around them a bridge into the position. Everything we teach is built on four filters. Logic. Common sense. Math. And science. Your goalie works through eight pillars, from MindSet and skating, to the positional systems, form, game performance, practice and lifestyle. They chart what actually happened. The chart points to the work that matters. They practise it with intent, and they chart again. That is the Development Loop.\n\nThe system runs parallel support for parents and team coaches, so the whole development circle contributes and assists to support the most important member of the team. You'll learn how your goalie is being taught, and why.\n\nWhat you share with us is not shown to your goalie directly. The system takes it in, and returns it to them selectively, as the right resource at the right time. Your read from the bench matters, and it will be used with care.\n\nGoalie coaches are givers. We build character, self-esteem, and goalies who can evaluate and self-train themselves, with our support. A goalie who can do that gives your team a chance to compete, every game.\n\nSmarter Goalie is here to raise the bar together. Welcome aboard. Built Not Born. Six decades. One system.",
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const CATALOGUE_BY_ID = new Map(COACH_AUDIO_CATALOGUE.map(e => [e.id, e]));

export function getCoachAudioEntry(id: string): CoachAudioCatalogueEntry | undefined {
  return CATALOGUE_BY_ID.get(id);
}

export function isCoachAudioId(id: string): boolean {
  return CATALOGUE_BY_ID.has(id);
}

/**
 * Pull the clip id out of a filename Michael sent.
 *
 *   SG_VOICE_V-A-01.wav      ->  V-A-01
 *   sg_voice_v-b-22.mp3      ->  V-B-22
 *   V-A-07.wav               ->  V-A-07
 *   SG_VOICE_DOP-INTRO.mp3   ->  DOP-INTRO
 *   SG_VOICE_PARENT-P7.mp3   ->  PARENT-P7
 *   SG_VOICE_COACH-WELCOME.mp3 -> COACH-WELCOME
 *
 * Returns null when the filename does not resolve to a known catalogue id, so
 * the caller can reject an unexpected file rather than storing it under a
 * guessed id.
 */
export function coachAudioIdFromFilename(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, '');

  const vMatch = base.match(/(V[-_]?[AB][-_]?\d{2})$/i);
  if (vMatch) {
    const normalized = vMatch[1]
      .toUpperCase()
      .replace(/_/g, '-')
      .replace(/^V-?([AB])-?(\d{2})$/, 'V-$1-$2');
    return isCoachAudioId(normalized) ? normalized : null;
  }

  const otherMatch = base.match(/(DOP[-_](?:INTRO|[A-D])|PARENT[-_](?:WELCOME|P\d{1,2})|COACH[-_]WELCOME)$/i);
  if (otherMatch) {
    const normalized = otherMatch[1].toUpperCase().replace(/_/g, '-');
    return isCoachAudioId(normalized) ? normalized : null;
  }

  return null;
}

/** The Block B message id a trigger clip reads, or null for non-trigger clips. */
export function coachAudioReadsMessage(id: string): string | null {
  return CATALOGUE_BY_ID.get(id)?.readsMessageId ?? null;
}

/**
 * True when the take on file is the old one of a clip Michael is re-recording.
 *
 * A take whose upload date cannot be read counts as held: if it cannot be told
 * apart from the old take, silence is the safer mistake.
 */
export function isHeldForReRecord(clip: Pick<CoachAudioClip, 'id' | 'uploadedAt'>): boolean {
  const hold = CATALOGUE_BY_ID.get(clip.id)?.reRecord;
  if (!hold) return false;
  return !(clip.uploadedAt.getTime() >= Date.parse(hold.heldBefore));
}

/** True when Michael has set the clip aside (held, or a potential build). */
export function isParked(id: string): boolean {
  return Boolean(CATALOGUE_BY_ID.get(id)?.parked);
}

/**
 * The clips that may play on the site: everything uploaded, less the held old
 * takes and the parked clips.
 */
export function playableClips(
  clips: Record<string, CoachAudioClip>
): Record<string, CoachAudioClip> {
  return Object.fromEntries(
    Object.entries(clips).filter(([, clip]) => !isHeldForReRecord(clip) && !isParked(clip.id))
  );
}

/** Audio formats accepted on upload. mp3 is preferred for delivery; wav is the master. */
export const COACH_AUDIO_ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
];

/** 25 MB. The longest line Michael recorded is 31 seconds, so this is generous. */
export const COACH_AUDIO_MAX_BYTES = 25 * 1024 * 1024;
