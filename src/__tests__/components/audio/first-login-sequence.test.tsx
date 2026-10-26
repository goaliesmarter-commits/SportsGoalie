import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { stubMediaElements } from '../../helpers/media-element';
import { markVoiceMoment, refreshUser, resetFakeAuth, signIn, stored } from '../../helpers/fake-auth';
import { VoiceMomentTrigger } from '@/components/audio/VoiceMomentTrigger';
import { CoachAudioProvider, useCoachAudio } from '@/lib/audio/context';
import type { SequenceMomentKey } from '@/lib/audio/moments';
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
vi.mock('@/lib/database/services/user.service', async () => {
  const { markVoiceMoment } = await import('../../helpers/fake-auth');
  return { userService: { markVoiceMoment } };
});

const UPLOADED = new Date('2026-10-04T09:00:00Z');
const url = (id: string) => `https://storage.example/${id}.mp3`;

function clip(id: string): CoachAudioClip {
  return {
    id,
    url: url(id),
    storagePath: `coach-audio/${id}.mp3`,
    contentType: 'audio/mpeg',
    sizeBytes: 48_000,
    durationSeconds: 6,
    originalFilename: `${id}.mp3`,
    uploadedAt: UPLOADED,
    updatedAt: UPLOADED,
  };
}

const onFile = (ids: string[]) => Object.fromEntries(ids.map(id => [id, clip(id)]));

const NEW_GOALIE = { id: 'goalie-1', role: 'student', onboardingCompleted: false };

let media: ReturnType<typeof stubMediaElements>;

/** Mounts the trigger and lets the clip list and the voice preference load. */
async function mount(moment: SequenceMomentKey) {
  const view = render(
    <CoachAudioProvider>
      <VoiceMomentTrigger moment={moment} />
    </CoachAudioProvider>
  );
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
  });
  return view;
}

const played = () => media.state.playedSources;
const endClip = () => act(async () => media.end());
const tapButton = () => screen.queryByRole('button', { name: /TAP TO HEAR COACH MIKE/ });

beforeEach(() => {
  window.localStorage.clear();
  media = stubMediaElements();
  resetFakeAuth();
  getAllClips.mockResolvedValue({
    success: true,
    data: onFile(['V-A-01', 'V-A-02', 'V-A-03', 'V-A-04', 'V-A-05']),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('first login — V-A-01, then V-A-02, then V-A-03', () => {
  it('plays all three in order for a new goalie, with no tap', async () => {
    signIn(NEW_GOALIE);
    await mount('firstLogin');
    expect(played()).toEqual([url('V-A-01')]);

    await endClip();
    expect(played()).toEqual([url('V-A-01'), url('V-A-02')]);

    await endClip();
    expect(played()).toEqual([url('V-A-01'), url('V-A-02'), url('V-A-03')]);
  });

  it('stamps the moment once, as soon as the first line is audible', async () => {
    signIn(NEW_GOALIE);
    await mount('firstLogin');

    expect(markVoiceMoment).toHaveBeenCalledTimes(1);
    expect(markVoiceMoment).toHaveBeenCalledWith('goalie-1', 'firstLogin');
    expect(refreshUser).toHaveBeenCalledTimes(1);

    await endClip();
    await endClip();
    expect(markVoiceMoment).toHaveBeenCalledTimes(1);
  });

  it('never plays again once stamped, on a later visit to any page', async () => {
    signIn(NEW_GOALIE);
    const first = await mount('firstLogin');
    first.unmount();
    const playsBefore = played().length;

    await mount('firstLogin');
    expect(played()).toHaveLength(playsBefore);
    expect(markVoiceMoment).toHaveBeenCalledTimes(1);
  });

  it('does not play for a goalie whose account says it already has', async () => {
    signIn({ ...NEW_GOALIE, voiceMoments: { firstLogin: new Date('2026-10-05T00:00:00Z') } });
    await mount('firstLogin');

    expect(media.play).not.toHaveBeenCalled();
    expect(markVoiceMoment).not.toHaveBeenCalled();
  });

  it.each(['coach', 'parent', 'admin'])('does not play for a %s', async role => {
    signIn({ id: 'someone', role });
    await mount('firstLogin');

    expect(media.play).not.toHaveBeenCalled();
    expect(markVoiceMoment).not.toHaveBeenCalled();
  });

  it('does not play for a goalie who has finished the baseline profile', async () => {
    signIn({ ...NEW_GOALIE, onboardingCompleted: true });
    await mount('firstLogin');

    expect(media.play).not.toHaveBeenCalled();
  });

  it('does not play when nobody is signed in', async () => {
    await mount('firstLogin');
    expect(media.play).not.toHaveBeenCalled();
  });

  it('waits, plays nothing and stamps nothing while any one of the three is not uploaded', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-01', 'V-A-02']) });
    signIn(NEW_GOALIE);
    await mount('firstLogin');

    expect(media.play).not.toHaveBeenCalled();
    expect(markVoiceMoment).not.toHaveBeenCalled();
    expect(tapButton()).toBeNull();
  });

  it('stays silent, and stamps nothing, when the goalie has switched the voice off', async () => {
    window.localStorage.setItem('sg.coachAudio.enabled', 'false');
    signIn(NEW_GOALIE);
    await mount('firstLogin');

    expect(media.play).not.toHaveBeenCalled();
    expect(markVoiceMoment).not.toHaveBeenCalled();
  });

  it('is not lost by a goalie who had the voice off: it plays, once, when they switch it on', async () => {
    window.localStorage.setItem('sg.coachAudio.enabled', 'false');
    signIn(NEW_GOALIE);

    function VoiceSwitch() {
      const { setEnabled } = useCoachAudio();
      return <button onClick={() => setEnabled(true)}>switch voice on</button>;
    }
    render(
      <CoachAudioProvider>
        <VoiceMomentTrigger moment="firstLogin" />
        <VoiceSwitch />
      </CoachAudioProvider>
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
    });
    expect(media.play).not.toHaveBeenCalled();
    expect(markVoiceMoment).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText('switch voice on'));
    });
    expect(played()).toEqual([url('V-A-01')]);
    expect(markVoiceMoment).toHaveBeenCalledTimes(1);
  });

  it('shows nothing on the normal path', async () => {
    signIn(NEW_GOALIE);
    await mount('firstLogin');
    expect(tapButton()).toBeNull();
  });
});

describe('first login — a phone that refuses the automatic start', () => {
  it('stamps nothing, asks for a tap, and plays the whole run from it', async () => {
    media.state.nextPlay = 'refused';
    signIn(NEW_GOALIE);
    await mount('firstLogin');

    expect(markVoiceMoment).not.toHaveBeenCalled();
    expect(tapButton()).not.toBeNull();

    media.state.nextPlay = 'plays';
    await act(async () => {
      fireEvent.click(tapButton()!);
    });

    expect(played()[played().length - 1]).toBe(url('V-A-01'));
    expect(markVoiceMoment).toHaveBeenCalledTimes(1);
    expect(tapButton()).toBeNull();

    await endClip();
    await endClip();
    expect(played().slice(-3)).toEqual([url('V-A-01'), url('V-A-02'), url('V-A-03')]);
  });

  it('does not keep retrying by itself', async () => {
    media.state.nextPlay = 'refused';
    signIn(NEW_GOALIE);
    await mount('firstLogin');

    expect(media.play).toHaveBeenCalledTimes(1);
  });

  it('lets the goalie dismiss the prompt', async () => {
    media.state.nextPlay = 'refused';
    signIn(NEW_GOALIE);
    await mount('firstLogin');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(tapButton()).toBeNull();
    expect(stored['goalie-1']).toBeUndefined();
  });
});

describe('first time in charting — V-A-04, then V-A-05', () => {
  it('plays both in order for a goalie, whether or not the baseline is done', async () => {
    signIn({ ...NEW_GOALIE, onboardingCompleted: true });
    await mount('chartingFirstOpen');
    expect(played()).toEqual([url('V-A-04')]);

    await endClip();
    expect(played()).toEqual([url('V-A-04'), url('V-A-05')]);
    expect(markVoiceMoment).toHaveBeenCalledWith('goalie-1', 'chartingFirstOpen');
  });

  it('keeps V-A-05 silent until V-A-04 is uploaded too', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-05']) });
    signIn({ ...NEW_GOALIE, onboardingCompleted: true });
    await mount('chartingFirstOpen');

    expect(media.play).not.toHaveBeenCalled();
    expect(markVoiceMoment).not.toHaveBeenCalled();
  });

  it('is its own moment: having had the welcome does not use it up', async () => {
    signIn({ ...NEW_GOALIE, onboardingCompleted: true, voiceMoments: { firstLogin: new Date() } });
    await mount('chartingFirstOpen');

    expect(played()).toEqual([url('V-A-04')]);
  });

  it("does not play for a coach opening a goalie's charting", async () => {
    signIn({ id: 'coach-1', role: 'coach' });
    await mount('chartingFirstOpen');

    expect(media.play).not.toHaveBeenCalled();
  });

  it('never plays again once stamped', async () => {
    signIn({ ...NEW_GOALIE, onboardingCompleted: true });
    const first = await mount('chartingFirstOpen');
    first.unmount();
    const playsBefore = played().length;

    await mount('chartingFirstOpen');
    expect(played()).toHaveLength(playsBefore);
  });
});
