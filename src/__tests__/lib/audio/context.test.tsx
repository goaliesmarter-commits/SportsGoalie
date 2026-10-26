import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';

import { stubMediaElements } from '../../helpers/media-element';
import { holdForReRecord } from '../../helpers/re-record-hold';
import { CoachAudioProvider, useCoachAudio, useCoachAudioClip } from '@/lib/audio/context';
import { silentWavDataUri } from '@/lib/audio/playback';
import type { CoachAudioClip } from '@/types/coach-audio';

const { getAllClips } = vi.hoisted(() => ({ getAllClips: vi.fn() }));

vi.mock('@/lib/database/services/coach-audio.service', () => ({
  coachAudioService: {
    getAllClips,
    // The provider reads uploads and admin settings in one call; these tests
    // only care about uploads, so the library is built from the same mock.
    getLibrary: async () => {
      const result = await getAllClips();
      return result?.success ? { ...result, data: { clips: result.data, settings: {} } } : result;
    },
  },
}));

const FIRST_FOLDER_UPLOAD = new Date('2026-09-13T15:00:00Z');
const NEW_TAKE_UPLOAD = new Date('2026-10-02T09:00:00Z');

function clip(id: string, uploadedAt: Date): CoachAudioClip {
  return {
    id,
    url: `https://storage.example/${id}.mp3`,
    storagePath: `coach-audio/${id}.mp3`,
    contentType: 'audio/mpeg',
    sizeBytes: 48_000,
    durationSeconds: 6,
    originalFilename: `${id}.mp3`,
    uploadedAt,
    updatedAt: uploadedAt,
  };
}

interface Seen {
  audio: ReturnType<typeof useCoachAudio>;
  lineThree: ReturnType<typeof useCoachAudioClip>;
}

let audio!: Seen['audio'];
let lineThree!: Seen['lineThree'];

/** Hands the hooks' latest values out after every render. */
function Probe({ onRender }: { onRender: (seen: Seen) => void }) {
  const seen = { audio: useCoachAudio(), lineThree: useCoachAudioClip('V-A-03') };
  useEffect(() => onRender(seen));
  return null;
}

async function renderProvider() {
  render(
    <CoachAudioProvider>
      <Probe
        onRender={seen => {
          audio = seen.audio;
          lineThree = seen.lineThree;
        }}
      />
    </CoachAudioProvider>
  );
  await waitFor(() => expect(audio.isLoading).toBe(false));
}

/** Lets play() promises settle and their state updates land. */
const settle = () => act(async () => {});

let media: ReturnType<typeof stubMediaElements>;

const lastPlayed = () => media.state.playedSources[media.state.playedSources.length - 1];

beforeEach(() => {
  media = stubMediaElements();
  getAllClips.mockResolvedValue({
    success: true,
    data: {
      'V-A-01': clip('V-A-01', FIRST_FOLDER_UPLOAD),
      'V-A-02': clip('V-A-02', NEW_TAKE_UPLOAD),
      'V-A-03': clip('V-A-03', FIRST_FOLDER_UPLOAD),
      'V-A-04': clip('V-A-04', FIRST_FOLDER_UPLOAD),
    },
  });
});

afterEach(() => {
  // Unmount while the stubs are still in place: the provider pauses on unmount.
  cleanup();
  vi.restoreAllMocks();
});

describe('CoachAudioProvider — what may play', () => {
  // The shipped catalogue holds nothing, so V-A-01 and V-A-02 are held here.
  let release: () => void;
  beforeEach(() => {
    release = holdForReRecord(['V-A-01', 'V-A-02'], '2026-09-14T00:00:00Z');
  });
  afterEach(() => release());

  it('leaves a held take out, and lets a new take of a held line through', async () => {
    await renderProvider();
    expect(Object.keys(audio.clips).sort()).toEqual(['V-A-02', 'V-A-03', 'V-A-04']);
  });

  it('does nothing when asked to play a held take', async () => {
    await renderProvider();
    act(() => audio.play('V-A-01'));
    await settle();

    expect(media.play).not.toHaveBeenCalled();
    expect(audio.playingId).toBeNull();
  });
});

describe('CoachAudioProvider — a play the phone refuses', () => {
  it('names the refused clip, and clears it once a tap plays it', async () => {
    await renderProvider();

    media.state.nextPlay = 'refused';
    act(() => audio.play('V-A-03'));
    await settle();

    expect(audio.blockedId).toBe('V-A-03');
    expect(audio.playingId).toBeNull();
    expect(lineThree.wasBlocked).toBe(true);

    media.state.nextPlay = 'plays';
    act(() => lineThree.toggle());
    await settle();

    expect(audio.playingId).toBe('V-A-03');
    expect(audio.blockedId).toBeNull();
    expect(lineThree.wasBlocked).toBe(false);
  });

  it('does not call any other failure a refusal', async () => {
    await renderProvider();

    media.state.nextPlay = 'aborted';
    act(() => audio.play('V-A-03'));
    await settle();

    expect(audio.blockedId).toBeNull();
    expect(audio.playingId).toBeNull();
  });

  it('forgets the refusal when the moment passes', async () => {
    await renderProvider();

    media.state.nextPlay = 'refused';
    act(() => audio.play('V-A-03'));
    await settle();
    expect(audio.blockedId).toBe('V-A-03');

    act(() => audio.pause());
    expect(audio.blockedId).toBeNull();
  });
});

describe('CoachAudioProvider — prime', () => {
  it('plays silence on a locked element, from inside the call', async () => {
    await renderProvider();

    act(() => audio.prime());

    expect(media.play).toHaveBeenCalledTimes(1);
    expect(media.state.playedSources).toEqual([silentWavDataUri()]);
  });

  it('does nothing once the element is unlocked', async () => {
    await renderProvider();

    act(() => audio.prime());
    await settle();
    act(() => media.end());

    act(() => audio.prime());
    expect(media.play).toHaveBeenCalledTimes(1);
  });

  it('counts a clip started from a tap as the unlock', async () => {
    await renderProvider();

    act(() => audio.play('V-A-03'));
    await settle();
    act(() => media.end());

    act(() => audio.prime());
    expect(media.play).toHaveBeenCalledTimes(1);
  });

  it('primes again after the phone refuses, so the next tap unlocks it', async () => {
    await renderProvider();

    act(() => audio.play('V-A-03'));
    await settle();
    act(() => media.end());

    media.state.nextPlay = 'refused';
    act(() => audio.play('V-A-04'));
    await settle();

    media.state.nextPlay = 'plays';
    act(() => audio.prime());
    expect(lastPlayed()).toBe(silentWavDataUri());
  });

  it('never cuts off a clip that is playing', async () => {
    await renderProvider();

    // A refusal leaves the element locked, then a tap on a button plays a clip.
    media.state.nextPlay = 'refused';
    act(() => audio.play('V-A-03'));
    await settle();
    media.state.nextPlay = 'loading';
    act(() => audio.play('V-A-04'));

    act(() => audio.prime());
    expect(lastPlayed()).toBe('https://storage.example/V-A-04.mp3');
    expect(media.pause).not.toHaveBeenCalled();
  });
});

describe('CoachAudioProvider — stopClip', () => {
  it('stops the clip it names and leaves any other alone', async () => {
    await renderProvider();

    act(() => audio.play('V-A-03'));
    await settle();
    expect(audio.playingId).toBe('V-A-03');

    act(() => audio.stopClip('V-A-04'));
    expect(media.pause).not.toHaveBeenCalled();
    expect(audio.playingId).toBe('V-A-03');

    act(() => audio.stopClip('V-A-03'));
    expect(media.pause).toHaveBeenCalledTimes(1);
    expect(audio.playingId).toBeNull();
  });

  it('stops a clip that is still starting', async () => {
    await renderProvider();

    media.state.nextPlay = 'loading';
    act(() => audio.play('V-A-03'));

    act(() => audio.stopClip('V-A-03'));
    expect(media.pause).toHaveBeenCalledTimes(1);
  });

  it('does nothing once the clip has finished', async () => {
    await renderProvider();

    act(() => audio.play('V-A-03'));
    await settle();
    act(() => media.end());

    act(() => audio.stopClip('V-A-03'));
    expect(media.pause).not.toHaveBeenCalled();
  });
});

describe('CoachAudioProvider — playSequence', () => {
  const played = () => media.state.playedSources;
  const url = (id: string) => `https://storage.example/${id}.mp3`;

  it('plays each clip as the one before it ends, in order', async () => {
    await renderProvider();

    act(() => audio.playSequence(['V-A-01', 'V-A-02', 'V-A-03']));
    await settle();
    expect(played()).toEqual([url('V-A-01')]);
    expect(audio.playingId).toBe('V-A-01');

    act(() => media.end());
    await settle();
    expect(played()).toEqual([url('V-A-01'), url('V-A-02')]);
    expect(audio.playingId).toBe('V-A-02');

    act(() => media.end());
    await settle();
    expect(played()).toEqual([url('V-A-01'), url('V-A-02'), url('V-A-03')]);

    act(() => media.end());
    await settle();
    expect(played()).toHaveLength(3);
    expect(audio.playingId).toBeNull();
  });

  it('is not cut short by the pause event a browser fires as a clip ends', async () => {
    await renderProvider();

    act(() => audio.playSequence(['V-A-01', 'V-A-02']));
    await settle();

    // A real element fires 'pause' and then 'ended' when it reaches the end.
    act(() => {
      media.state.element!.dispatchEvent(new Event('pause'));
      media.end();
    });
    await settle();

    expect(played()).toEqual([url('V-A-01'), url('V-A-02')]);
  });

  it('drops the rest when the goalie pauses', async () => {
    await renderProvider();

    act(() => audio.playSequence(['V-A-01', 'V-A-02']));
    await settle();
    act(() => audio.pause());
    act(() => media.end());
    await settle();

    expect(played()).toEqual([url('V-A-01')]);
  });

  it('drops the rest when the goalie starts a clip of their own', async () => {
    await renderProvider();

    act(() => audio.playSequence(['V-A-01', 'V-A-02', 'V-A-03']));
    await settle();
    act(() => audio.play('V-A-04'));
    await settle();
    act(() => media.end());
    await settle();

    expect(played()).toEqual([url('V-A-01'), url('V-A-04')]);
  });

  it('skips a line that is not on file and plays the rest', async () => {
    await renderProvider();

    act(() => audio.playSequence(['V-A-01', 'V-A-99', 'V-A-02']));
    await settle();
    act(() => media.end());
    await settle();

    expect(played()).toEqual([url('V-A-01'), url('V-A-02')]);
  });

  it('plays nothing when none of the lines are on file', async () => {
    await renderProvider();

    act(() => audio.playSequence(['V-A-98', 'V-A-99']));
    await settle();

    expect(media.play).not.toHaveBeenCalled();
  });

  it('ends the sequence when the phone refuses its first clip, and names that clip', async () => {
    await renderProvider();

    media.state.nextPlay = 'refused';
    act(() => audio.playSequence(['V-A-01', 'V-A-02']));
    await settle();
    expect(audio.blockedId).toBe('V-A-01');

    media.state.nextPlay = 'plays';
    act(() => media.end());
    await settle();
    expect(played()).toEqual([url('V-A-01')]);
  });

  it('ends the sequence when a clip fails to load', async () => {
    await renderProvider();

    act(() => audio.playSequence(['V-A-01', 'V-A-02']));
    await settle();
    act(() => {
      media.state.element!.dispatchEvent(new Event('error'));
      media.end();
    });
    await settle();

    expect(played()).toEqual([url('V-A-01')]);
  });
});
