import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { stubMediaElements } from '../../helpers/media-element';
import { CoachBaselineQuestionnaire } from '@/components/onboarding/CoachBaselineQuestionnaire';
import { ParentBaselineQuestionnaire } from '@/components/onboarding/ParentBaselineQuestionnaire';
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

const UPLOADED = new Date('2026-10-04T09:00:00Z');
const LABEL = 'HEAR COACH MIKE: WELCOME';
const INVITATION = 'Hear from Coach Mike before you begin.';

function clip(id: string): CoachAudioClip {
  return {
    id,
    url: `https://storage.example/${id}.mp3`,
    storagePath: `coach-audio/${id}.mp3`,
    contentType: 'audio/mpeg',
    sizeBytes: 48_000,
    durationSeconds: 6,
    originalFilename: `${id}.mp3`,
    uploadedAt: UPLOADED,
    updatedAt: UPLOADED,
  };
}

/**
 * A parent or coach registers and lands on a welcome screen: a greeting, Coach
 * Mike's recording behind a button, and Continue. The baseline profile's own
 * first screen comes after it.
 */
const FLOWS = [
  {
    name: 'coach',
    id: 'COACH-WELCOME',
    heading: 'Welcome, Coach.',
    begin: 'BEGIN THE COACH BASELINE PROFILE',
    ui: () => <CoachBaselineQuestionnaire userId="coach-under-test" userName="Test Coach" onComplete={vi.fn()} />,
  },
  {
    name: 'parent',
    id: 'PARENT-WELCOME',
    heading: 'Welcome to Smarter Goalie.',
    begin: 'BEGIN THE PARENT BASELINE PROFILE',
    ui: () => <ParentBaselineQuestionnaire userId="parent-under-test" userName="Test Parent" onComplete={vi.fn()} />,
  },
] as const;

/** Renders inside the provider and waits for the recordings to finish loading. */
async function open(ui: React.ReactElement) {
  render(<CoachAudioProvider>{ui}</CoachAudioProvider>);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /^(CONTINUE|BEGIN THE)/ })).not.toBeNull()
  );
}

const playButton = () => screen.queryByRole('button', { name: `Play Coach Mike: ${LABEL}` });
const continueButton = () => screen.getByRole('button', { name: /^CONTINUE/ });

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

describe.each(FLOWS)('onboarding — Coach Mike welcome for the $name', ({ id, heading, begin, ui }) => {
  describe(`with ${id} uploaded`, () => {
    beforeEach(() => {
      getAllClips.mockResolvedValue({ success: true, data: { [id]: clip(id) } });
    });

    it('opens on the welcome screen, ahead of the baseline profile', async () => {
      await open(ui());

      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
      expect(screen.getByText(INVITATION)).toBeInTheDocument();
      expect(playButton()).not.toBeNull();
      expect(continueButton()).toBeEnabled();
      expect(screen.queryByRole('button', { name: new RegExp(begin) })).toBeNull();
    });

    it('plays the welcome when the button is pressed, and not before', async () => {
      await open(ui());
      expect(media.state.playedSources).toEqual([]);

      fireEvent.click(playButton()!);
      await act(async () => {});

      expect(media.state.playedSources).toEqual([`https://storage.example/${id}.mp3`]);
    });

    it('continues to the baseline profile without the recording being played', async () => {
      await open(ui());

      fireEvent.click(continueButton());

      expect(screen.getByRole('button', { name: new RegExp(begin) })).toBeEnabled();
      expect(screen.queryByRole('heading', { name: heading })).toBeNull();
      expect(media.state.playedSources).toEqual([]);
    });

    it('stops the welcome when they continue part way through it', async () => {
      await open(ui());

      fireEvent.click(playButton()!);
      await act(async () => {});
      expect(media.pause).not.toHaveBeenCalled();

      fireEvent.click(continueButton());

      expect(media.pause).toHaveBeenCalled();
      expect(media.state.paused).toBe(true);
    });

    it('does not offer the recording again on the baseline profile screen', async () => {
      await open(ui());
      fireEvent.click(continueButton());

      expect(screen.queryByRole('button', { name: /Coach Mike/ })).toBeNull();
    });

    it('goes on from the baseline profile screen to the privacy step', async () => {
      await open(ui());
      fireEvent.click(continueButton());
      fireEvent.click(screen.getByRole('button', { name: new RegExp(begin) }));

      expect(screen.queryByRole('button', { name: new RegExp(begin) })).toBeNull();
    });
  });

  describe(`with ${id} not uploaded`, () => {
    beforeEach(() => {
      getAllClips.mockResolvedValue({ success: true, data: {} });
    });

    it('skips the welcome and opens on the baseline profile screen', async () => {
      await open(ui());

      expect(screen.queryByText(INVITATION)).toBeNull();
      expect(screen.queryByRole('button', { name: /^CONTINUE/ })).toBeNull();
      expect(screen.getByRole('button', { name: new RegExp(begin) })).toBeEnabled();
    });

    it('offers no Coach Mike button, and no "not recorded" notice', async () => {
      await open(ui());

      expect(screen.queryByRole('button', { name: /Coach Mike/ })).toBeNull();
      expect(screen.queryByText('NOT RECORDED YET')).toBeNull();
    });

    it('still lets them begin in one press', async () => {
      await open(ui());
      fireEvent.click(screen.getByRole('button', { name: new RegExp(begin) }));

      expect(screen.queryByRole('button', { name: new RegExp(begin) })).toBeNull();
    });
  });

  it('shows neither screen until it is known whether the recording is on file', async () => {
    let release: (value: unknown) => void = () => {};
    getAllClips.mockReturnValue(new Promise(resolve => { release = resolve; }));
    render(<CoachAudioProvider>{ui()}</CoachAudioProvider>);

    expect(screen.queryByRole('button', { name: /^CONTINUE/ })).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(begin) })).toBeNull();

    await act(async () => release({ success: true, data: { [id]: clip(id) } }));
    await waitFor(() => expect(continueButton()).toBeEnabled());
  });

  it('opens on the baseline profile screen when the recordings cannot be loaded', async () => {
    getAllClips.mockResolvedValue({ success: false, error: { message: 'offline' } });
    await open(ui());

    expect(screen.queryByRole('button', { name: /^CONTINUE/ })).toBeNull();
    expect(screen.getByRole('button', { name: new RegExp(begin) })).toBeEnabled();
  });
});
