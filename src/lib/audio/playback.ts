/**
 * Starting Coach Mike's voice on an iPhone.
 *
 * iOS Safari does not let a page start sound by itself. An audio element can
 * only be started from inside a tap until the first time a tap has started it;
 * from then on the page may play it whenever it likes, from a timer included.
 * Desktop browsers and Android Chrome decide per page rather than per element,
 * and are far more forgiving.
 *
 * The freeze-point voice starts itself: the video reaches the timestamp, the
 * frame holds and Michael speaks. Nobody taps, so on an iPhone that play is
 * refused unless the element was unlocked beforehand.
 *
 * `primeElement` unlocks it. It plays a tenth of a second of silence on the
 * shared element from inside a tap the goalie is making anyway ("Start Quiz",
 * with the play button and the taps that end a freeze as fallbacks). Nothing is
 * heard, and later plays from a timer are allowed.
 *
 * It is tied to those quiz taps, never to the first tap anywhere on the site:
 * starting audio on an iPhone takes over the phone's sound and pauses any music
 * the goalie had on. Each of those taps starts the video with sound, so it does
 * that already.
 *
 * Nothing in here touches React, so the browser tests can load it on its own.
 */

/** How a play attempt ended. */
export type ClipStart =
  /** It is playing. */
  | 'playing'
  /** The browser refused because nobody tapped. A tap will play it. */
  | 'blocked'
  /** Anything else: a network error, a format the browser cannot play, or a newer play replacing this one. */
  | 'failed';

const SAMPLE_RATE = 8000;
const SILENCE_SECONDS = 0.1;

/**
 * A mono 16-bit PCM WAV file of silence. WAV rather than MP3 because it can be
 * written out byte by byte here, and every browser plays it, iOS included.
 */
export function createSilentWav(): Uint8Array {
  const bytesPerSample = 2;
  const dataBytes = Math.round(SAMPLE_RATE * SILENCE_SECONDS) * bytesPerSample;
  const bytes = new Uint8Array(44 + dataBytes);
  const view = new DataView(bytes.buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true); // size of the fmt chunk
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * bytesPerSample, true); // bytes per second
  view.setUint16(32, bytesPerSample, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, 'data');
  view.setUint32(40, dataBytes, true);
  // The samples are already zero, which is silence.

  return bytes;
}

let silentWavUri: string | null = null;

/** The silent WAV as a data: URI, built once and reused. */
export function silentWavDataUri(): string {
  if (silentWavUri === null) {
    let binary = '';
    for (const byte of createSilentWav()) binary += String.fromCharCode(byte);
    silentWavUri = `data:audio/wav;base64,${btoa(binary)}`;
  }
  return silentWavUri;
}

/** The browser said no because nobody tapped, as opposed to any other failure. */
function isNotAllowed(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'NotAllowedError';
}

/**
 * Calls `play()` and reports how it went. Older browsers return nothing rather
 * than a promise, and some throw rather than reject; both are handled.
 */
function attemptPlay(element: HTMLAudioElement): Promise<'played' | 'refused' | 'failed'> {
  let attempt: Promise<void> | undefined;
  try {
    attempt = element.play();
  } catch (error) {
    return Promise.resolve(isNotAllowed(error) ? 'refused' : 'failed');
  }
  return Promise.resolve(attempt).then(
    () => 'played' as const,
    (error: unknown) => (isNotAllowed(error) ? 'refused' : 'failed')
  );
}

/**
 * Unlocks the element for later plays that no tap starts. Call it inside the
 * tap handler itself, not after an await or a timer, or the browser will not
 * count the tap.
 *
 * Resolves true unless the browser refused. A play that failed for another
 * reason (usually a real clip replacing the silence straight away) still
 * happened inside the tap, which is what unlocks the element.
 */
export function primeElement(element: HTMLAudioElement): Promise<boolean> {
  element.src = silentWavDataUri();
  return attemptPlay(element).then(result => result !== 'refused');
}

/**
 * Carries on from where the element was paused, for a long recording such as a
 * role-page welcome. Same tap rule as `startClip`.
 */
export function resumeClip(element: HTMLAudioElement): Promise<ClipStart> {
  return attemptPlay(element).then(result =>
    result === 'played' ? 'playing' : result === 'refused' ? 'blocked' : 'failed'
  );
}

/**
 * Plays `url` from the start on the element. `play()` is called before this
 * returns, so calling it inside a tap handler counts as the tap.
 */
export function startClip(element: HTMLAudioElement, url: string): Promise<ClipStart> {
  // Setting src to the same value would reload it. Leaving it alone and
  // rewinding restarts it without fetching it again.
  if (element.src !== url) element.src = url;
  element.currentTime = 0;

  return attemptPlay(element).then(result =>
    result === 'played' ? 'playing' : result === 'refused' ? 'blocked' : 'failed'
  );
}
