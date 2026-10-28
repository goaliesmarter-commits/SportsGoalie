import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

import { stubMediaElements } from '../../helpers/media-element';
import { resetFakeAuth, signIn } from '../../helpers/fake-auth';
import { EventVoice } from '@/components/audio/EventVoice';
import { resetEventVoice, useEventVoice } from '@/hooks/useEventVoice';
import { CoachAudioProvider, useCoachAudio } from '@/lib/audio/context';
import type { VoiceEventKey } from '@/lib/audio/events';
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
vi.mock('@/lib/auth/context', async () => {
  const { useAuth } = await import('../../helpers/fake-auth');
  return { useAuth };
});

const UPLOADED = new Date('2026-10-04T09:00:00Z');
const url = (id: string) => `https://storage.example/${id}.mp3`;
const DAY = 24 * 60 * 60 * 1000;

function clip(id: string): CoachAudioClip {
  return {
    id,
    url: url(id),
    storagePath: `coach-audio/${id}.mp3`,
    contentType: 'audio/mpeg',
    sizeBytes: 48_000,
    durationSeconds: 2,
    originalFilename: `${id}.mp3`,
    uploadedAt: UPLOADED,
    updatedAt: UPLOADED,
  };
}

const ON_FILE = ['V-A-03', 'V-A-27', 'V-A-28', 'V-A-29', 'V-A-30', 'V-A-35', 'V-A-37'];

const GOALIE = { id: 'goalie-1', role: 'student', createdAt: new Date(Date.now() - 2 * DAY) };

let say!: (event: VoiceEventKey, place?: string) => boolean;
let audio!: ReturnType<typeof useCoachAudio>;
let media: ReturnType<typeof stubMediaElements>;

function Probe() {
  const speak = useEventVoice();
  const context = useCoachAudio();
  useEffect(() => {
    say = speak;
    audio = context;
  });
  return null;
}

const settle = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
  });

async function mount(extra?: React.ReactNode) {
  render(
    <CoachAudioProvider>
      <Probe />
      {extra}
    </CoachAudioProvider>
  );
  await settle();
}

const played = () => media.state.playedSources;

beforeEach(() => {
  window.localStorage.clear();
  media = stubMediaElements();
  resetFakeAuth();
  resetEventVoice();
  getAllClips.mockResolvedValue({
    success: true,
    data: Object.fromEntries(ON_FILE.map(id => [id, clip(id)])),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('useEventVoice', () => {
  it('plays the line for the event, for a goalie', async () => {
    signIn(GOALIE);
    await mount();

    let started = false;
    act(() => {
      started = say('chartSaved');
    });
    await settle();

    expect(started).toBe(true);
    expect(played()).toEqual([url('V-A-27')]);
  });

  it('says the right clip for each event', async () => {
    signIn(GOALIE);
    await mount();
    // The built-in lines; learning moments have none until admin places one.
    const expected: Partial<Record<VoiceEventKey, string>> = {
      chartSaved: 'V-A-27',
      answerSaved: 'V-A-28',
      vaultSaved: 'V-A-29',
      longFormOpen: 'V-A-30',
      emptyScreen: 'V-A-35',
      nextStep: 'V-A-37',
    };

    for (const [event, id] of Object.entries(expected)) {
      act(() => {
        say(event as VoiceEventKey);
      });
      await settle();
      expect(played().at(-1), event).toBe(url(id));
      await act(async () => media.end());
    }
  });

  it('says nothing to a coach, a parent or an admin', async () => {
    for (const role of ['coach', 'parent', 'admin']) {
      signIn({ id: `${role}-1`, role });
      await mount();
      act(() => {
        expect(say('chartSaved'), role).toBe(false);
      });
      cleanup();
    }
    expect(played()).toEqual([]);
  });

  it('says nothing while the viewer has the voice off', async () => {
    signIn(GOALIE);
    await mount();
    act(() => audio.setEnabled(false));

    act(() => {
      expect(say('chartSaved')).toBe(false);
    });
    expect(played()).toEqual([]);
  });

  it('says nothing for a recording that is not on file', async () => {
    getAllClips.mockResolvedValue({ success: true, data: { 'V-A-03': clip('V-A-03') } });
    signIn(GOALIE);
    await mount();

    act(() => {
      expect(say('chartSaved')).toBe(false);
    });
    expect(played()).toEqual([]);
  });

  it('never talks over a clip that is already playing, and does not use up its turn doing so', async () => {
    signIn(GOALIE);
    await mount();
    act(() => audio.play('V-A-03'));
    await settle();

    act(() => {
      expect(say('chartSaved')).toBe(false);
    });
    expect(played()).toEqual([url('V-A-03')]);

    await act(async () => media.end());
    act(() => {
      expect(say('chartSaved')).toBe(true);
    });
    await settle();
    expect(played()).toEqual([url('V-A-03'), url('V-A-27')]);
  });

  it('keeps an event quiet for a few minutes after it has spoken', async () => {
    signIn(GOALIE);
    await mount();

    act(() => {
      expect(say('vaultSaved')).toBe(true);
    });
    await settle();
    await act(async () => media.end());

    act(() => {
      expect(say('vaultSaved')).toBe(false);
    });
    // A different event is not held back by it.
    act(() => {
      expect(say('chartSaved')).toBe(true);
    });
    await settle();
    expect(played()).toEqual([url('V-A-29'), url('V-A-27')]);
  });

  it('says "Good. Next." at each step of a flow, but not twice at the same step', async () => {
    signIn(GOALIE);
    await mount();

    // Pre-Game saved, then Periods saved a minute later: two steps, two lines.
    act(() => {
      expect(say('nextStep', 'pre-game')).toBe(true);
    });
    await settle();
    await act(async () => media.end());

    act(() => {
      expect(say('nextStep', 'periods')).toBe(true);
    });
    await settle();
    await act(async () => media.end());
    expect(played()).toEqual([url('V-A-37'), url('V-A-37')]);

    // Saving the same step again straight away is the repeat the pacing is for.
    act(() => {
      expect(say('nextStep', 'periods')).toBe(false);
    });
  });

  it('lets an event speak again once the cooldown has passed', async () => {
    signIn(GOALIE);
    await mount();
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);

    act(() => {
      expect(say('vaultSaved')).toBe(true);
    });
    await settle();
    await act(async () => media.end());

    clock.mockReturnValue(now + 6 * 60 * 1000);
    act(() => {
      expect(say('vaultSaved')).toBe(true);
    });
    await settle();
  });
});

describe('<EventVoice />', () => {
  it('speaks once when it is shown, for a new goalie', async () => {
    signIn(GOALIE);
    await mount(<EventVoice event="emptyScreen" />);

    expect(played()).toEqual([url('V-A-35')]);
  });

  it('is quiet on an empty screen for a goalie who is past day one', async () => {
    signIn({ ...GOALIE, createdAt: new Date(Date.now() - 90 * DAY) });
    await mount(<EventVoice event="emptyScreen" />);

    expect(played()).toEqual([]);
  });

  it('waits for the clips to load rather than giving up on the first render', async () => {
    let release!: (value: unknown) => void;
    getAllClips.mockReturnValue(new Promise(resolve => (release = resolve)));
    signIn(GOALIE);
    await mount(<EventVoice event="longFormOpen" />);
    expect(played()).toEqual([]);

    await act(async () => {
      release({ success: true, data: { 'V-A-30': clip('V-A-30') } });
    });
    await settle();
    expect(played()).toEqual([url('V-A-30')]);
  });
});
