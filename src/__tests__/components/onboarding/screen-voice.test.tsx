import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { stubMediaElements } from '../../helpers/media-element';
import { StudentBaselineQuestionnaire } from '@/components/onboarding/StudentBaselineQuestionnaire';
import { CoachAudioProvider } from '@/lib/audio/context';
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

const USER_ID = 'goalie-under-test';
const UPLOADED = new Date('2026-10-04T09:00:00Z');

/**
 * The Driver-or-Passenger lines, the screen each sits on, and its button label.
 * The dp_reply screen reads the line for the goalie's answer; the draft that
 * `openAt` resumes from answers "driver", which is reply A.
 *
 * V-A-01 to V-A-05 are not here. Michael's placement doc (4 Oct 2026) makes
 * them events, not buttons on a screen: the welcome plays at first login and
 * the charting lines at first charting. See first-login-sequence.test.tsx.
 */
const SCREENS = [
  { id: 'DOP-INTRO', phase: 'dp_choice', label: 'HEAR COACH MIKE: WHAT THIS IS' },
  { id: 'DOP-A', phase: 'dp_reply', label: "HEAR COACH MIKE: A — I'M THE DRIVER" },
] as const;

/** Screens that once carried an event clip's button and now carry nothing. */
const EVENT_CLIP_SCREENS = [
  { id: 'V-A-01', phase: 'hero' },
  { id: 'V-A-04', phase: 'privacy_gate' },
  { id: 'V-A-05', phase: 'closing' },
] as const;

const ALL_BLOCK_1_AND_4_LINES = ['V-A-01', 'V-A-04', 'V-A-05'];

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

/** Every line uploaded, the event clips too. */
function onFile(): Record<string, CoachAudioClip> {
  return Object.fromEntries(
    [...SCREENS.map(s => s.id), ...ALL_BLOCK_1_AND_4_LINES].map(id => [id, clip(id, UPLOADED)])
  );
}

/** Opens the questionnaire on a given screen, through the saved-draft path it resumes from. */
async function openAt(phase: string) {
  window.localStorage.setItem(
    `sbq-draft-${USER_ID}`,
    JSON.stringify({
      phase,
      sectionIndex: 0,
      questionIndex: 0,
      responses: {},
      openExtras: {},
      driverChoice: 'driver',
      intake: { name: 'Test Goalie' },
    })
  );

  render(
    <CoachAudioProvider>
      <StudentBaselineQuestionnaire userId={USER_ID} userName="Test Goalie" onComplete={vi.fn()} />
    </CoachAudioProvider>
  );

  // Until the clip list is in, every voice button holds its place, disabled.
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'This recording has not been added yet' })).toBeNull()
  );
}

const playButton = (label: string) => screen.queryByRole('button', { name: `Play Coach Mike: ${label}` });

let media: ReturnType<typeof stubMediaElements>;

beforeEach(() => {
  window.localStorage.clear();
  media = stubMediaElements();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('onboarding — Coach Mike on the opening screens', () => {
  it.each(SCREENS)('offers $id on the $phase screen', async ({ phase, label }) => {
    getAllClips.mockResolvedValue({ success: true, data: onFile() });
    await openAt(phase);
    expect(playButton(label)).not.toBeNull();
  });

  it.each(SCREENS)('offers nothing on the $phase screen while $id is not uploaded', async ({ id, phase }) => {
    const { [id]: _missing, ...rest } = onFile();
    getAllClips.mockResolvedValue({ success: true, data: rest });
    await openAt(phase);
    expect(screen.queryByRole('button', { name: /Coach Mike/ })).toBeNull();
    expect(screen.queryByText('NOT RECORDED YET')).toBeNull();
  });

  it('offers nothing when a line has not been uploaded at all', async () => {
    getAllClips.mockResolvedValue({ success: true, data: {} });
    await openAt('dp_choice');
    expect(screen.queryByRole('button', { name: /Coach Mike/ })).toBeNull();
  });

  it.each(EVENT_CLIP_SCREENS)(
    'offers no button for $id on the $phase screen, even with every line uploaded',
    async ({ phase }) => {
      getAllClips.mockResolvedValue({ success: true, data: onFile() });
      await openAt(phase);
      expect(screen.queryByRole('button', { name: /Coach Mike/ })).toBeNull();
    }
  );

  it('plays the line when the button is pressed', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile() });
    await openAt('dp_choice');

    fireEvent.click(playButton('HEAR COACH MIKE: WHAT THIS IS')!);
    await act(async () => {});

    expect(media.state.playedSources).toEqual(['https://storage.example/DOP-INTRO.mp3']);
    expect(
      screen.getByRole('button', { name: 'Pause Coach Mike: HEAR COACH MIKE: WHAT THIS IS' })
    ).toBeInTheDocument();
  });

  it('stops the line when the goalie moves on to the next screen', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile() });
    await openAt('dp_reply');

    fireEvent.click(playButton("HEAR COACH MIKE: A — I'M THE DRIVER")!);
    await act(async () => {});
    expect(media.pause).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'CONTINUE' }));

    expect(media.pause).toHaveBeenCalledTimes(1);
    expect(media.state.paused).toBe(true);
  });
});
