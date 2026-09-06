/**
 * The Driver-or-Passenger assessment — Michael's Item 4, final wording received
 * 2 September 2026 ("Message 1"). Built on the existing goalie onboarding, not
 * replacing it: the screen appears once, before the Student Baseline Profile
 * questions begin, and the goalie's choice decides which of the four replies
 * they read before continuing.
 *
 * Every string in this file is Michael's, verbatim — capitalisation included.
 * Do not edit the wording without his sign-off; it appears on screen exactly
 * as written here.
 */

/** Which of the four buttons the goalie pressed. Stored on the baseline profile
 *  and the user record; later builds (voice responses, data triggers) key off it. */
export type DriverOrPassengerChoiceId =
  | 'driver' // A — I'm the driver.
  | 'aspiring_driver' // B — I want to be the driver.
  | 'passenger' // C — I've been a passenger up to now.
  | 'undecided'; // D — I don't know yet.

export interface DriverOrPassengerOption {
  id: DriverOrPassengerChoiceId;
  /** Michael's letter for this choice — A, B, C or D. */
  letter: 'A' | 'B' | 'C' | 'D';
  /** The button text as the goalie sees it. */
  label: string;
  /** The reply screen's heading, in Michael's format: "A — I'M THE DRIVER". */
  replyTitle: string;
  /** The reply the goalie reads after pressing this button. */
  reply: string;
}

/** Part 1 — the screen, top to bottom. */
export const DRIVER_OR_PASSENGER_SCREEN = {
  eyebrow: 'Before we start — one honest question.',
  intro:
    'THE DRIVER KNOWS THEY LOVE TO DRIVE AND THEY KNOW THEY WANT TO BE THE BEST DRIVER THEY CAN BE. THE PASSENGER IS JUST ALONG FOR THE RIDE. THE DRIVER HAS ALL THE RESPONSIBILITY, THEY WANT TO REACH THEIR DESTINATION SAFE AND SOUND. WHILE THE PASSENGER CAN ENJOY THE SCENERY, THEY HAVE NO RESPONSIBILITIES.',
  question: 'SO, WHO ARE YOU? THE DRIVER, OR THE PASSENGER?',
  contrast:
    'THE DRIVER KNOWS WHAT THEY WANT AND THEY HAVE THE PASSION AND THE DESIRE AND WILL TO BE THE BEST THEY CAN BE. THE PASSENGER IS JUST ALONG FOR THE RIDE.',
  identity:
    'SMARTER GOALIE WAS AND IS DESIGNED FOR THE MOTIVATED, THE PASSIONATE, THOSE WHO HAVE A FIRE IN THEIR BELLY.',
  tagline: 'DESIGNED FOR THE MOTIVATED — BUILD YOUR GAME',
} as const;

/** Parts 2 and 3 — the four buttons and the reply behind each one. */
export const DRIVER_OR_PASSENGER_OPTIONS: DriverOrPassengerOption[] = [
  {
    id: 'driver',
    letter: 'A',
    label: "I'm the driver.",
    replyTitle: "A — I'M THE DRIVER",
    reply:
      "Good. The motivated act. You understand that this system is your support and guidance, and you are ready to use it to become the 'Intelligent Athletic Goaltender' and the leader you are meant to be. I am not going to chase you; I am going to provide the framework. You will get the system, you will do the work, and you will watch your motivation and confidence build with every repetition and every detail you master. That is the driver's path.",
  },
  {
    id: 'aspiring_driver',
    letter: 'B',
    label: 'I want to be the driver.',
    replyTitle: 'B — I WANT TO BE THE DRIVER',
    reply:
      "That is an honest answer and a great place to start. Every action you take from this point forward will build your motivation and confidence. The system is your support and guidance to becoming an 'Intelligent Athletic Goaltender' and a leader on the ice. The work you do — whether in the driveway or on the ice — is where you transform. With every repetition and every fundamental detail you master, your confidence will grow, and your motivation will follow naturally. You are the architect of your own progress, and you are building your path to success.",
  },
  {
    id: 'passenger',
    letter: 'C',
    label: "I've been a passenger up to now.",
    replyTitle: "C — I'VE BEEN A PASSENGER UP TO NOW",
    reply:
      "Thank you for being straight about that. Recognizing where you are is the first step to moving forward. You now have the tools to become an 'Intelligent Athletic Goaltender' and a leader. Treat this system as your support and guidance. Start by mastering one thing. As you engage with the work, each action you take will ignite your motivation and fuel your confidence, proving that you have what it takes to lead.",
  },
  {
    id: 'undecided',
    letter: 'D',
    label: "I don't know yet.",
    replyTitle: "D — I DON'T KNOW YET",
    reply:
      "That is a perfectly honest place to start. You do not need to be certain on day one. You are here to learn and grow, and that is what matters. Let this system provide the support and guidance you need. As you explore, ask questions, and engage with the process, your motivation and confidence will naturally grow with every step. You are on your way to becoming an 'Intelligent Athletic Goaltender,' and every action you take is a building block for your future.",
  },
];

/** The option behind a stored choice id, or null for anything unrecognised. */
export function getDriverOrPassengerOption(
  id: string | null | undefined
): DriverOrPassengerOption | null {
  if (!id) return null;
  return DRIVER_OR_PASSENGER_OPTIONS.find((o) => o.id === id) ?? null;
}
