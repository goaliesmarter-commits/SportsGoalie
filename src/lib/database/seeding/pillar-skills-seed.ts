/**
 * Goalie-specific skills for all 7 pillars, 3 difficulty levels each.
 * Each pillar has 3 skills per level = 9 skills per pillar = 63 total.
 */

import { PILLAR_IDS } from '@/lib/utils/pillars';
import type { DifficultyLevel } from '@/types';

export interface SkillSeedData {
  sportId: string;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedTimeToComplete: number;
  learningObjectives: string[];
  tags: string[];
  order: number;
}

export const PILLAR_SKILLS: SkillSeedData[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 1: MINDSET DEVELOPMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // Introduction
  { sportId: PILLAR_IDS.mindset, name: 'Understanding the Goalie Mind', description: 'Learn why the goalie position is the most mentally demanding role in hockey and what makes your brain unique as a goalie.', difficulty: 'introduction', estimatedTimeToComplete: 20, learningObjectives: ['Understand the unique mental demands of goaltending', 'Recognize common mental patterns goalies face', 'Identify your personal mental strengths and challenges'], tags: ['mental-game', 'awareness', 'introduction'], order: 1 },
  { sportId: PILLAR_IDS.mindset, name: 'Dealing with Goals Against', description: 'Every goalie gets scored on. Learn the mental reset process to bounce back after allowing a goal.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Develop a personal reset routine after goals', 'Separate self-worth from goals allowed', 'Practice the 5-second reset technique'], tags: ['resilience', 'reset', 'introduction'], order: 2 },
  { sportId: PILLAR_IDS.mindset, name: 'Pre-Game Mental Preparation', description: 'Build a consistent pre-game mental routine that puts you in the right headspace before every game.', difficulty: 'introduction', estimatedTimeToComplete: 20, learningObjectives: ['Create a personalized pre-game mental routine', 'Understand arousal levels and optimal performance zones', 'Practice basic visualization techniques'], tags: ['preparation', 'routine', 'introduction'], order: 3 },

  // Development
  { sportId: PILLAR_IDS.mindset, name: 'Anxiety as Fuel', description: 'Transform pre-game anxiety from an enemy into a performance advantage. Learn to channel nervous energy.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Reframe anxiety as performance energy', 'Identify personal anxiety triggers', 'Apply breathing techniques to regulate arousal'], tags: ['anxiety', 'performance', 'development'], order: 4 },
  { sportId: PILLAR_IDS.mindset, name: 'In-Game Focus Recovery', description: 'Master techniques to regain focus during a game when distractions, bad goals, or pressure pull you out of the zone.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Apply the post-whistle reset protocol', 'Use physical anchors to refocus', 'Develop cue words for instant refocusing'], tags: ['focus', 'recovery', 'development'], order: 5 },
  { sportId: PILLAR_IDS.mindset, name: 'Building Mental Toughness', description: 'Develop the resilience to stay strong through adversity — bad periods, tough losses, and slumps.', difficulty: 'development', estimatedTimeToComplete: 35, learningObjectives: ['Understand the growth mindset for goalies', 'Build a personal adversity response plan', 'Practice mental toughness through progressive challenges'], tags: ['toughness', 'resilience', 'development'], order: 6 },

  // Refinement
  { sportId: PILLAR_IDS.mindset, name: 'Advanced Visualization & Imagery', description: 'Use sport-specific visualization to mentally rehearse saves, movements, and game situations at an elite level.', difficulty: 'refinement', estimatedTimeToComplete: 35, learningObjectives: ['Perform multi-sensory visualization sessions', 'Visualize specific game scenarios and saves', 'Integrate visualization into daily routine'], tags: ['visualization', 'elite', 'refinement'], order: 7 },
  { sportId: PILLAR_IDS.mindset, name: 'Competitive Mindset Mastery', description: 'Develop the elite competitor mindset — thriving under pressure, owning big moments, and performing when it matters most.', difficulty: 'refinement', estimatedTimeToComplete: 30, learningObjectives: ['Develop a pressure-is-privilege mentality', 'Master the art of controlled aggression', 'Build confidence through structured self-talk'], tags: ['competition', 'elite', 'refinement'], order: 8 },
  { sportId: PILLAR_IDS.mindset, name: 'Self-Coaching & Mind Vault Mastery', description: 'Become your own mental coach. Build and maintain your Mind Vault as a lifelong tool for mental resilience.', difficulty: 'refinement', estimatedTimeToComplete: 30, learningObjectives: ['Develop independent self-coaching skills', 'Maintain and grow your Mind Vault', 'Create a personal mental playbook'], tags: ['self-coaching', 'mind-vault', 'refinement'], order: 9 },

  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 2: SKATING AS A SKILL
  // ═══════════════════════════════════════════════════════════════════════════

  // Introduction
  { sportId: PILLAR_IDS.skating, name: 'Goalie Stance & Balance', description: 'Master the fundamental goalie skating stance — proper weight distribution, knee bend, and balance on your edges.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Maintain proper goalie stance on skates', 'Understand weight distribution principles', 'Practice balance drills on both edges'], tags: ['stance', 'balance', 'introduction'], order: 1 },
  { sportId: PILLAR_IDS.skating, name: 'Basic Lateral Movement', description: 'Learn the fundamental T-push and shuffle techniques to move side-to-side in the crease.', difficulty: 'introduction', estimatedTimeToComplete: 30, learningObjectives: ['Execute proper T-push technique', 'Perform controlled lateral shuffles', 'Maintain stance integrity during movement'], tags: ['lateral', 'movement', 'introduction'], order: 2 },
  { sportId: PILLAR_IDS.skating, name: 'Forward & Backward Movement', description: 'Develop controlled forward and backward skating within the crease for challenging and retreating.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Move forward to challenge shooters', 'Retreat smoothly to the crease', 'Maintain square positioning during movement'], tags: ['movement', 'crease', 'introduction'], order: 3 },

  // Development
  { sportId: PILLAR_IDS.skating, name: 'Explosive Lateral Pushes', description: 'Build power and speed in your lateral pushes to track cross-crease passes and quick plays.', difficulty: 'development', estimatedTimeToComplete: 35, learningObjectives: ['Generate explosive lateral power', 'Recover quickly after lateral pushes', 'Read plays to anticipate push direction'], tags: ['explosive', 'lateral', 'development'], order: 4 },
  { sportId: PILLAR_IDS.skating, name: 'Butterfly Slide Technique', description: 'Master the butterfly slide — timing, power, and recovery for one of the goalie\'s most important movements.', difficulty: 'development', estimatedTimeToComplete: 35, learningObjectives: ['Execute proper butterfly slide mechanics', 'Control slide distance and speed', 'Recover to stance after slides'], tags: ['butterfly', 'slide', 'development'], order: 5 },
  { sportId: PILLAR_IDS.skating, name: 'Post-to-Post Movement', description: 'Develop efficient post-to-post techniques including VH, RVH, and post integration.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Execute smooth post-to-post transitions', 'Choose correct post integration technique', 'Maintain seal and coverage during transitions'], tags: ['post', 'transitions', 'development'], order: 6 },

  // Refinement
  { sportId: PILLAR_IDS.skating, name: 'Reading the Play & Anticipatory Movement', description: 'Elite-level read and react — position yourself before the play develops through anticipatory skating.', difficulty: 'refinement', estimatedTimeToComplete: 35, learningObjectives: ['Read offensive patterns to anticipate movement', 'Pre-position before passes and shots', 'Minimize unnecessary movement through reads'], tags: ['reads', 'anticipation', 'refinement'], order: 7 },
  { sportId: PILLAR_IDS.skating, name: 'Recovery Skating & Scramble Situations', description: 'Master recovery techniques when you\'re out of position — getting back to your feet, finding the puck, and making desperation saves.', difficulty: 'refinement', estimatedTimeToComplete: 30, learningObjectives: ['Recover to stance from any position', 'Maintain puck tracking during scrambles', 'Make saves during recovery movements'], tags: ['recovery', 'scramble', 'refinement'], order: 8 },
  { sportId: PILLAR_IDS.skating, name: 'Skating Efficiency & Energy Management', description: 'Optimize your movement to conserve energy across a full game while maintaining coverage.', difficulty: 'refinement', estimatedTimeToComplete: 25, learningObjectives: ['Eliminate wasteful movements', 'Manage energy across all periods', 'Maintain technique quality when fatigued'], tags: ['efficiency', 'endurance', 'refinement'], order: 9 },

  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 3: FORM & STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════

  // Introduction
  { sportId: PILLAR_IDS.form, name: 'Basic Goalie Stance', description: 'Learn the foundation of goaltending — proper stance including hand position, knee bend, glove placement, and stick position.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Set up in a proper goalie stance', 'Position glove, blocker, and stick correctly', 'Maintain consistent stance throughout play'], tags: ['stance', 'fundamentals', 'introduction'], order: 1 },
  { sportId: PILLAR_IDS.form, name: 'Butterfly Basics', description: 'Master the fundamental butterfly drop — timing, technique, and sealing the ice.', difficulty: 'introduction', estimatedTimeToComplete: 30, learningObjectives: ['Execute a proper butterfly drop', 'Seal the five-hole and ice level', 'Recover from butterfly to standing'], tags: ['butterfly', 'fundamentals', 'introduction'], order: 2 },
  { sportId: PILLAR_IDS.form, name: 'Glove & Blocker Fundamentals', description: 'Develop proper glove and blocker technique for catching, deflecting, and controlling shots.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Position glove for maximum coverage', 'Direct blocker rebounds safely', 'Track the puck into your equipment'], tags: ['glove', 'blocker', 'introduction'], order: 3 },

  // Development
  { sportId: PILLAR_IDS.form, name: 'Paddle Down Technique', description: 'Master the paddle-down position for low plays, wrap-arounds, and below-the-goal-line situations.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Execute proper paddle-down positioning', 'Transition between paddle-down and stance', 'Cover low-angle threats effectively'], tags: ['paddle-down', 'technique', 'development'], order: 4 },
  { sportId: PILLAR_IDS.form, name: 'Active Hands & Stick Work', description: 'Develop active hand technique — using your stick to break up passes, intercept pucks, and control play.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Use stick to intercept passes', 'Direct rebounds with active stick work', 'Position stick for maximum poke-check range'], tags: ['stick-work', 'hands', 'development'], order: 5 },
  { sportId: PILLAR_IDS.form, name: 'Compact Butterfly & Coverage', description: 'Tighten your butterfly to eliminate holes — focus on arm tuck, leg seal, and body positioning.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Close five-hole gaps in butterfly', 'Maintain upper body positioning in butterfly', 'Use equipment overlap for maximum coverage'], tags: ['butterfly', 'coverage', 'development'], order: 6 },

  // Refinement
  { sportId: PILLAR_IDS.form, name: 'Save Selection & Decision Making', description: 'Choose the right save technique for each situation — when to butterfly, stand, poke-check, or stack.', difficulty: 'refinement', estimatedTimeToComplete: 35, learningObjectives: ['Analyze situations for optimal save selection', 'Execute save techniques with proper timing', 'Develop instinctive save-selection patterns'], tags: ['decision-making', 'save-selection', 'refinement'], order: 7 },
  { sportId: PILLAR_IDS.form, name: 'Rebound Control Mastery', description: 'Direct rebounds intentionally — to the corners, to teammates, or absorb them completely.', difficulty: 'refinement', estimatedTimeToComplete: 30, learningObjectives: ['Direct rebounds to safe areas consistently', 'Absorb shots to eliminate second chances', 'Read shooters to anticipate rebound situations'], tags: ['rebounds', 'control', 'refinement'], order: 8 },
  { sportId: PILLAR_IDS.form, name: 'Desperation Saves & Creativity', description: 'Develop the ability to make saves outside your structure — diving, reaching, and unconventional techniques.', difficulty: 'refinement', estimatedTimeToComplete: 25, learningObjectives: ['Execute desperation saves safely', 'Maintain body control during unconventional saves', 'Know when to break structure vs stay disciplined'], tags: ['desperation', 'creativity', 'refinement'], order: 9 },

  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 4: POSITIONAL SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════

  // Introduction
  { sportId: PILLAR_IDS.positioning, name: 'Understanding Angles', description: 'Learn the fundamental concept of angles — how your position relative to the puck determines how much net you take away.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Understand the relationship between angles and net coverage', 'Position yourself on the angle for direct shots', 'Recognize when you are off-angle'], tags: ['angles', 'fundamentals', 'introduction'], order: 1 },
  { sportId: PILLAR_IDS.positioning, name: 'Depth & Challenging', description: 'Learn how far to come out of your net to challenge shooters and when to stay deep.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Understand depth as a function of shot distance', 'Challenge appropriately for different shot locations', 'Avoid over-challenging or playing too deep'], tags: ['depth', 'challenge', 'introduction'], order: 2 },
  { sportId: PILLAR_IDS.positioning, name: 'Squaring to the Puck', description: 'Master the concept of staying square — keeping your body centered on the puck at all times.', difficulty: 'introduction', estimatedTimeToComplete: 20, learningObjectives: ['Maintain square positioning to the puck', 'Rotate body to track puck movement', 'Understand why squareness maximizes coverage'], tags: ['square', 'tracking', 'introduction'], order: 3 },

  // Development
  { sportId: PILLAR_IDS.positioning, name: 'The 7 Angle-Marker System', description: 'Learn the systematic approach to positioning using 7 reference points on the ice to always know where you should be.', difficulty: 'development', estimatedTimeToComplete: 40, learningObjectives: ['Identify all 7 angle markers on the ice', 'Position yourself correctly for each marker', 'Transition between markers efficiently'], tags: ['angle-markers', 'system', 'development'], order: 4 },
  { sportId: PILLAR_IDS.positioning, name: 'Positioning on Passes', description: 'Maintain optimal position during pass sequences — tracking the puck while adjusting angle and depth.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Adjust position during pass sequences', 'Prioritize angle vs depth during movement', 'Read passing lanes to anticipate adjustments'], tags: ['passes', 'adjustments', 'development'], order: 5 },
  { sportId: PILLAR_IDS.positioning, name: 'Screen & Traffic Positioning', description: 'Maintain coverage when your view is obstructed — positioning through traffic, screens, and tips.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Adjust position to see through traffic', 'Maintain depth when screened', 'React to deflections and tips from optimal position'], tags: ['screens', 'traffic', 'development'], order: 6 },

  // Refinement
  { sportId: PILLAR_IDS.positioning, name: 'Odd-Man Rush Positioning', description: 'Master positioning for 2-on-1, 3-on-2, and breakaway situations — patience, reads, and commitment.', difficulty: 'refinement', estimatedTimeToComplete: 35, learningObjectives: ['Position for 2-on-1 situations optimally', 'Read shooter vs passer intent', 'Time your movements on breakaways'], tags: ['odd-man', 'rushes', 'refinement'], order: 7 },
  { sportId: PILLAR_IDS.positioning, name: 'High-Danger Zone Coverage', description: 'Optimize your positioning for the most dangerous scoring areas — the slot, the royal road, and one-timer positions.', difficulty: 'refinement', estimatedTimeToComplete: 30, learningObjectives: ['Identify high-danger zones on the ice', 'Pre-position for high-percentage shots', 'Manage depth in tight-area plays'], tags: ['high-danger', 'coverage', 'refinement'], order: 8 },
  { sportId: PILLAR_IDS.positioning, name: 'Game Film Analysis & Positioning Review', description: 'Learn to analyze your own game footage to identify positional strengths and areas for improvement.', difficulty: 'refinement', estimatedTimeToComplete: 35, learningObjectives: ['Review positioning on goals against', 'Identify positional patterns in your game', 'Create positioning improvement plans from film'], tags: ['film', 'analysis', 'refinement'], order: 9 },

  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 5: 7 POINT SYSTEM BELOW ICING LINE
  // ═══════════════════════════════════════════════════════════════════════════

  // Introduction
  { sportId: PILLAR_IDS.seven_point, name: 'Understanding Below the Goal Line', description: 'Learn why the area below the goal line is the most dangerous zone for goalies and how to approach it.', difficulty: 'introduction', estimatedTimeToComplete: 20, learningObjectives: ['Understand why below-the-line plays are dangerous', 'Identify common offensive plays from behind the net', 'Recognize your vulnerability zones'], tags: ['below-line', 'awareness', 'introduction'], order: 1 },
  { sportId: PILLAR_IDS.seven_point, name: 'Post Integration Basics', description: 'Learn to use your posts as reference points — proper post seal, post lean, and post awareness.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Seal the post with proper technique', 'Maintain awareness of post position', 'Transition between posts smoothly'], tags: ['post', 'integration', 'introduction'], order: 2 },
  { sportId: PILLAR_IDS.seven_point, name: 'Wrap-Around Defense', description: 'Defend the most basic below-the-line threat — the wrap-around attempt.', difficulty: 'introduction', estimatedTimeToComplete: 20, learningObjectives: ['Position for wrap-around attempts', 'Use paddle-down for wrap-around coverage', 'Track the puck carrier behind the net'], tags: ['wrap-around', 'defense', 'introduction'], order: 3 },

  // Development
  { sportId: PILLAR_IDS.seven_point, name: 'The 6 Zone – 7 Point System™ Explained', description: 'Learn the complete 6 Zone – 7 Point System™ for below-the-icing-line positioning — the framework that covers every threat.', difficulty: 'development', estimatedTimeToComplete: 40, learningObjectives: ['Identify all 7 positioning points', 'Understand when to use each point', 'Transition between points based on play development'], tags: ['7-point', 'system', 'development'], order: 4 },
  { sportId: PILLAR_IDS.seven_point, name: 'VH & Reverse VH Technique', description: 'Master the Vertical-Horizontal and Reverse VH positions for post play and below-the-line coverage.', difficulty: 'development', estimatedTimeToComplete: 35, learningObjectives: ['Execute proper VH technique', 'Execute proper RVH technique', 'Choose between VH and RVH based on the play'], tags: ['VH', 'RVH', 'development'], order: 5 },
  { sportId: PILLAR_IDS.seven_point, name: 'Behind-the-Net Pass Coverage', description: 'Position for and defend passes from behind the net to the front — centering feeds, bank passes, and quick plays.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Read centering pass attempts', 'Position to cover front-of-net plays', 'Transition from post to butterfly on passes out'], tags: ['passes', 'behind-net', 'development'], order: 6 },

  // Refinement
  { sportId: PILLAR_IDS.seven_point, name: 'Advanced Post Play & Timing', description: 'Elite-level post play — timing your movements, reading plays before they develop, and maintaining coverage.', difficulty: 'refinement', estimatedTimeToComplete: 35, learningObjectives: ['Time post-to-post transitions perfectly', 'Read offensive plays from below the line', 'Maintain net coverage during complex plays'], tags: ['advanced-post', 'timing', 'refinement'], order: 7 },
  { sportId: PILLAR_IDS.seven_point, name: 'Low Play Combinations & Reads', description: 'Handle complex offensive plays below the line — give-and-go, tip plays, and multi-touch sequences.', difficulty: 'refinement', estimatedTimeToComplete: 30, learningObjectives: ['Read multi-pass sequences below the line', 'Position for tip plays and deflections', 'Maintain composure during extended below-line pressure'], tags: ['combinations', 'reads', 'refinement'], order: 8 },
  { sportId: PILLAR_IDS.seven_point, name: 'Zone Defense Integration', description: 'Coordinate your below-the-line positioning with your team\'s defensive structure.', difficulty: 'refinement', estimatedTimeToComplete: 25, learningObjectives: ['Communicate with defensemen on below-line plays', 'Anticipate defensive breakdowns', 'Integrate team defense into personal positioning'], tags: ['team', 'zone-defense', 'refinement'], order: 9 },

  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 5: GAME
  //
  // Was one combined "Game/Practice/Off-Ice" pillar until 6 August 2026, when
  // Michael split it into Game and Practice and moved the off-ice material into
  // Lifestyle. Skills already stored under the old pillar are re-filed by
  // scripts/split-training-pillar.ts.
  // ═══════════════════════════════════════════════════════════════════════════

  // Introduction
  { sportId: PILLAR_IDS.game, name: 'Game Day Routine', description: 'Build a complete game day routine — from waking up to warm-up to puck drop.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Create a consistent game day schedule', 'Understand nutrition and hydration for game day', 'Build a pre-game warm-up routine'], tags: ['game-day', 'routine', 'introduction'], order: 1 },
  { sportId: PILLAR_IDS.game, name: 'Introduction to Charting', description: 'Learn how to chart your games and practices to identify patterns and track development.', difficulty: 'introduction', estimatedTimeToComplete: 20, learningObjectives: ['Understand the purpose of charting', 'Complete a basic game chart', 'Review charts to identify patterns'], tags: ['charting', 'tracking', 'introduction'], order: 2 },

  // Development
  { sportId: PILLAR_IDS.game, name: 'Post-Game Analysis', description: 'Develop a systematic post-game review process to extract maximum learning from every game.', difficulty: 'development', estimatedTimeToComplete: 25, learningObjectives: ['Complete thorough post-game reviews', 'Identify actionable takeaways from each game', 'Use the Mind Vault to capture insights'], tags: ['post-game', 'analysis', 'development'], order: 3 },

  // Refinement
  { sportId: PILLAR_IDS.game, name: 'Video Analysis & Self-Scouting', description: 'Use video to scout your own game — identify tendencies, habits, and areas opponents exploit.', difficulty: 'refinement', estimatedTimeToComplete: 30, learningObjectives: ['Analyze your own game video systematically', 'Identify tendencies opponents can exploit', 'Make adjustments based on video evidence'], tags: ['video', 'self-scouting', 'refinement'], order: 4 },

  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 6: PRACTICE
  // ═══════════════════════════════════════════════════════════════════════════

  // Introduction
  { sportId: PILLAR_IDS.practice, name: 'Practice with Purpose', description: 'Learn how to approach every practice with intention — what to focus on, how to track improvement, and why reps matter.', difficulty: 'introduction', estimatedTimeToComplete: 20, learningObjectives: ['Set specific practice goals before every session', 'Focus on quality over quantity in drills', 'Track what you worked on for future reference'], tags: ['practice', 'purpose', 'introduction'], order: 1 },

  // Development
  { sportId: PILLAR_IDS.practice, name: 'Structured Practice Planning', description: 'Design your own practice routines that target specific weaknesses identified through charting.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Identify weaknesses from game charts', 'Design targeted practice drills', 'Measure improvement over time'], tags: ['planning', 'structured', 'development'], order: 2 },

  // Refinement
  { sportId: PILLAR_IDS.practice, name: 'Peak Performance Programming', description: 'Create periodized training plans that peak for important games and tournaments.', difficulty: 'refinement', estimatedTimeToComplete: 35, learningObjectives: ['Understand periodization for goalie training', 'Plan training loads around game schedules', 'Peak physically and mentally for key games'], tags: ['periodization', 'peak', 'refinement'], order: 3 },
  { sportId: PILLAR_IDS.practice, name: 'Competition Simulation Training', description: 'Design practice sessions that simulate game pressure, fatigue, and decision-making demands.', difficulty: 'refinement', estimatedTimeToComplete: 30, learningObjectives: ['Create game-like practice scenarios', 'Train under simulated pressure conditions', 'Bridge the gap between practice and game performance'], tags: ['simulation', 'competition', 'refinement'], order: 4 },

  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 7: LIFESTYLE
  // ═══════════════════════════════════════════════════════════════════════════

  // Introduction
  { sportId: PILLAR_IDS.lifestyle, name: 'Sleep & Recovery Basics', description: 'Understand why sleep is the #1 performance enhancer and how to build healthy sleep habits as a young athlete.', difficulty: 'introduction', estimatedTimeToComplete: 20, learningObjectives: ['Understand sleep\'s impact on performance', 'Build a consistent sleep schedule', 'Create a pre-sleep routine for game nights'], tags: ['sleep', 'recovery', 'introduction'], order: 1 },
  { sportId: PILLAR_IDS.lifestyle, name: 'Nutrition for Goalies', description: 'Learn the basics of fueling your body — what to eat before, during, and after games and practices.', difficulty: 'introduction', estimatedTimeToComplete: 25, learningObjectives: ['Understand basic sports nutrition for goalies', 'Plan pre-game and post-game meals', 'Stay properly hydrated for performance'], tags: ['nutrition', 'fueling', 'introduction'], order: 2 },
  { sportId: PILLAR_IDS.lifestyle, name: 'Balancing Hockey & Life', description: 'Learn to balance hockey with school, family, and social life without burning out.', difficulty: 'introduction', estimatedTimeToComplete: 20, learningObjectives: ['Create a balanced weekly schedule', 'Prioritize responsibilities effectively', 'Recognize early signs of burnout'], tags: ['balance', 'time-management', 'introduction'], order: 3 },

  // Development
  // Off-ice training moved here from the old combined pillar on Michael's instruction:
  // the public Lifestyle pillar already lists "Off-Ice Training" among its components.
  { sportId: PILLAR_IDS.lifestyle, name: 'Off-Ice Training for Goalies', description: 'Build an off-ice training program that translates to on-ice performance — flexibility, strength, and reaction time.', difficulty: 'development', estimatedTimeToComplete: 35, learningObjectives: ['Develop goalie-specific flexibility routines', 'Build functional strength for goaltending', 'Improve reaction time through off-ice drills'], tags: ['off-ice', 'training', 'development'], order: 4 },
  { sportId: PILLAR_IDS.lifestyle, name: 'Advanced Recovery Strategies', description: 'Go beyond sleep — learn about active recovery, stretching routines, and managing your body between games.', difficulty: 'development', estimatedTimeToComplete: 30, learningObjectives: ['Implement active recovery routines', 'Use stretching for injury prevention', 'Manage physical load across a season'], tags: ['recovery', 'stretching', 'development'], order: 5 },
  { sportId: PILLAR_IDS.lifestyle, name: 'The Car Ride Home', description: 'The most important 15 minutes after every game. Learn how to handle the car ride home with parents constructively.', difficulty: 'development', estimatedTimeToComplete: 20, learningObjectives: ['Set boundaries for post-game conversations', 'Process game emotions before discussing performance', 'Communicate needs to parents effectively'], tags: ['car-ride', 'parents', 'development'], order: 6 },
  { sportId: PILLAR_IDS.lifestyle, name: 'Managing Social Pressure', description: 'Navigate social media, peer pressure, and the expectations that come with being the last line of defense.', difficulty: 'development', estimatedTimeToComplete: 25, learningObjectives: ['Manage social media impact on confidence', 'Handle peer and parent pressure', 'Build a support system beyond hockey'], tags: ['social', 'pressure', 'development'], order: 7 },

  // Refinement
  { sportId: PILLAR_IDS.lifestyle, name: 'Building Your Identity Beyond Hockey', description: 'Develop a healthy identity that includes hockey but isn\'t defined by it — essential for long-term mental health.', difficulty: 'refinement', estimatedTimeToComplete: 25, learningObjectives: ['Recognize identity-performance traps', 'Develop interests and strengths outside hockey', 'Build resilience through diverse identity'], tags: ['identity', 'wellness', 'refinement'], order: 8 },
  { sportId: PILLAR_IDS.lifestyle, name: 'Leadership & Team Culture', description: 'Develop leadership skills unique to the goalie position — leading from behind, setting the tone, and building team culture.', difficulty: 'refinement', estimatedTimeToComplete: 25, learningObjectives: ['Lead by example as a goaltender', 'Communicate effectively with teammates', 'Contribute to positive team culture'], tags: ['leadership', 'team', 'refinement'], order: 9 },
  { sportId: PILLAR_IDS.lifestyle, name: 'Long-Term Athlete Development', description: 'Understand the big picture of your development as a goalie — setting long-term goals and building sustainable habits.', difficulty: 'refinement', estimatedTimeToComplete: 30, learningObjectives: ['Set meaningful long-term development goals', 'Build sustainable training and lifestyle habits', 'Plan for development across multiple seasons'], tags: ['long-term', 'development', 'refinement'], order: 10 },
];
