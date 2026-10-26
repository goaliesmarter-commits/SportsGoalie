import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { stubMediaElements } from '../../helpers/media-element';
import { unpark } from '../../helpers/re-record-hold';
import { markVoiceMoment, refreshUser, resetFakeAuth, signIn } from '../../helpers/fake-auth';
import { FirstVisitVoice } from '@/components/audio/FirstVisitVoice';
import { PillarTeachingVoice } from '@/components/audio/PillarTeachingVoice';
import { CoachAudioProvider } from '@/lib/audio/context';
import {
  clipsForPillar,
  FOUNDATIONAL_TOOLS,
  PILLAR_FOUNDATIONAL_TOOLS,
  PILLAR_TEACHING_CLIPS,
  PILLAR_WELCOME_CLIPS,
} from '@/lib/audio/placements';
import { COACH_AUDIO_CATALOGUE, type CoachAudioClip } from '@/types/coach-audio';

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

// Uploaded after the 17 Oct hold, so a clip with a new script is a new take.
const NEW_TAKE = new Date('2026-10-20T09:00:00Z');

function clip(id: string, uploadedAt: Date = UPLOADED): CoachAudioClip {
  return {
    id,
    url: url(id),
    storagePath: `coach-audio/${id}.mp3`,
    contentType: 'audio/mpeg',
    sizeBytes: 48_000,
    durationSeconds: 6,
    originalFilename: `${id}.mp3`,
    uploadedAt,
    updatedAt: uploadedAt,
  };
}

const onFile = (ids: string[], uploadedAt: Date = UPLOADED) =>
  Object.fromEntries(ids.map(id => [id, clip(id, uploadedAt)]));

const GOALIE = { id: 'goalie-1', role: 'student', onboardingCompleted: true };
const MIND_VAULT_LABEL = 'HEAR COACH MIKE: THE MIND-VAULT';

let media: ReturnType<typeof stubMediaElements>;

/** Renders inside the provider and lets the clip list and voice preference load. */
async function mount(ui: React.ReactElement) {
  const view = render(<CoachAudioProvider>{ui}</CoachAudioProvider>);
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
  });
  return view;
}

/** The play buttons on screen, in page order, by their accessible names. */
const playButtons = () =>
  screen.queryAllByRole('button', { name: /^(Play|Pause) Coach Mike/ }).map(b => b.getAttribute('aria-label'));
const voiceToggles = () => screen.queryAllByRole('button', { name: /^VOICE (ON|OFF)$/ });

beforeEach(() => {
  window.localStorage.clear();
  media = stubMediaElements();
  resetFakeAuth();
  getAllClips.mockResolvedValue({ success: true, data: {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('placements', () => {
  it('only name clips that are in the catalogue', () => {
    const known = new Set(COACH_AUDIO_CATALOGUE.map(entry => entry.id));
    for (const placed of Object.values(PILLAR_TEACHING_CLIPS)) {
      for (const { clipId } of placed) expect(known.has(clipId), clipId).toBe(true);
    }
    for (const { clipId } of Object.values(PILLAR_WELCOME_CLIPS)) {
      expect(known.has(clipId), clipId).toBe(true);
    }
    for (const { clipId } of Object.values(FOUNDATIONAL_TOOLS)) {
      expect(known.has(clipId), clipId).toBe(true);
    }
  });

  it('gives each of the eight pillars its own welcome, V-A-19 to V-A-26 in pillar order', () => {
    expect(Object.entries(PILLAR_WELCOME_CLIPS).map(([pillar, { clipId }]) => [pillar, clipId])).toEqual([
      ['pillar_mindset', 'V-A-19'],
      ['pillar_skating', 'V-A-20'],
      ['pillar_positioning', 'V-A-21'],
      ['pillar_seven_point', 'V-A-22'],
      ['pillar_form', 'V-A-23'],
      ['pillar_game', 'V-A-24'],
      ['pillar_practice', 'V-A-25'],
      ['pillar_lifestyle', 'V-A-26'],
    ]);
  });

  it('keeps V-A-11 and V-A-12 off every pillar until Coach names where they go', () => {
    expect(PILLAR_FOUNDATIONAL_TOOLS).toEqual({});
    for (const pillarId of Object.keys(PILLAR_WELCOME_CLIPS)) {
      const ids = clipsForPillar(pillarId).map(item => item.clipId);
      expect(ids, pillarId).not.toContain('V-A-11');
      expect(ids, pillarId).not.toContain('V-A-12');
    }
  });
});

describe('PillarTeachingVoice — the pillar welcomes', () => {
  it.each(Object.entries(PILLAR_WELCOME_CLIPS))(
    'shows %s with its own welcome, first, under the pillar name',
    async (pillarId, { clipId, label }) => {
      getAllClips.mockResolvedValue({
        success: true,
        data: onFile([clipId, 'V-A-06', 'V-A-07'], NEW_TAKE),
      });
      await mount(<PillarTeachingVoice pillarId={pillarId} />);

      expect(playButtons()[0]).toBe(`Play Coach Mike: ${label}`);
      expect(voiceToggles()).toHaveLength(1);

      await act(async () => fireEvent.click(screen.getAllByRole('button', { name: /^Play Coach Mike/ })[0]));
      expect(media.state.playedSources).toEqual([url(clipId)]);
    }
  );

  it('puts the MindSet welcome on its own: no other pillar clip rides with it', async () => {
    getAllClips.mockResolvedValue({
      success: true,
      data: onFile(['V-A-19', 'V-A-06', 'V-A-07', 'V-A-14'], NEW_TAKE),
    });
    await mount(<PillarTeachingVoice pillarId="pillar_mindset" />);

    expect(playButtons()).toEqual(['Play Coach Mike: HEAR COACH MIKE: WELCOME TO MINDSET']);
  });

  it('stacks the 7 Angle-Marker welcome above V-A-06, V-A-08, V-A-09 and V-A-10', async () => {
    getAllClips.mockResolvedValue({
      success: true,
      data: onFile(['V-A-21', 'V-A-06', 'V-A-08', 'V-A-09', 'V-A-10']),
    });
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    expect(playButtons()).toEqual([
      'Play Coach Mike: HEAR COACH MIKE: WELCOME TO THE 7 ANGLE-MARKER SYSTEM',
      'Play Coach Mike: HEAR COACH MIKE: THE 7 ANGLE-MARKER SYSTEM',
      'Play Coach Mike: HEAR COACH MIKE: ANGLES 1 AND 7 ARE THE SAME',
      'Play Coach Mike: HEAR COACH MIKE: THE 4 LEVEL ARCH SYSTEM',
      'Play Coach Mike: HEAR COACH MIKE: THE THREE LANES OF ATTACK',
    ]);
    expect(voiceToggles()).toHaveLength(1);
  });

  it('shows nothing, not even an empty gap, until a clip for the pillar is uploaded', async () => {
    getAllClips.mockResolvedValue({ success: true, data: {} });
    const { container } = await mount(<PillarTeachingVoice pillarId="pillar_form" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the old MindSet take silent until the new opening is uploaded', async () => {
    getAllClips.mockResolvedValue({
      success: true,
      data: onFile(['V-A-19'], new Date('2026-10-10T09:00:00Z')),
    });
    const { container } = await mount(<PillarTeachingVoice pillarId="pillar_mindset" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('plays the new MindSet opening as soon as it is uploaded', async () => {
    getAllClips.mockResolvedValue({
      success: true,
      data: onFile(['V-A-19'], NEW_TAKE),
    });
    await mount(<PillarTeachingVoice pillarId="pillar_mindset" />);
    expect(playButtons()).toEqual(['Play Coach Mike: HEAR COACH MIKE: WELCOME TO MINDSET']);
  });
});

describe('PillarTeachingVoice — foundational tools placed on a pillar', () => {
  let restore: () => void;

  beforeEach(() => {
    const before = PILLAR_FOUNDATIONAL_TOOLS.pillar_form;
    PILLAR_FOUNDATIONAL_TOOLS.pillar_form = ['vmp', 'noWaste'];
    restore = () => {
      if (before) PILLAR_FOUNDATIONAL_TOOLS.pillar_form = before;
      else delete PILLAR_FOUNDATIONAL_TOOLS.pillar_form;
    };
    getAllClips.mockResolvedValue({
      success: true,
      data: onFile(['V-A-23', 'V-A-11', 'V-A-12']),
    });
  });

  afterEach(() => restore());

  it('puts V-A-11 and V-A-12 after the welcome on any pillar they are placed on', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_form" />);

    expect(playButtons()).toEqual([
      'Play Coach Mike: HEAR COACH MIKE: WELCOME TO FORM TECH',
      'Play Coach Mike: HEAR COACH MIKE: V.M.P., VISUAL, MENTAL, PHYSICAL',
      'Play Coach Mike: HEAR COACH MIKE: NO WASTED MOVEMENT, ENERGY OR TIME',
    ]);
  });

  it('plays the right clip from each', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_form" />);

    const buttons = screen.getAllByRole('button', { name: /^Play Coach Mike/ });
    await act(async () => fireEvent.click(buttons[1]));
    expect(media.state.playedSources.at(-1)).toBe(url('V-A-11'));
    await act(async () => fireEvent.click(buttons[2]));
    expect(media.state.playedSources.at(-1)).toBe(url('V-A-12'));
  });

  it('leaves every other pillar as it was', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_game" />);
    expect(playButtons()).toEqual([]);
  });
});

describe('PillarTeachingVoice — 7 Angle-Marker System (pillar_positioning)', () => {
  beforeEach(() => {
    getAllClips.mockResolvedValue({
      success: true,
      data: onFile(['V-A-06', 'V-A-08', 'V-A-09', 'V-A-10']),
    });
  });

  it('stacks V-A-06, then V-A-08, then V-A-09, then V-A-10', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    expect(playButtons()).toEqual([
      'Play Coach Mike: HEAR COACH MIKE: THE 7 ANGLE-MARKER SYSTEM',
      'Play Coach Mike: HEAR COACH MIKE: ANGLES 1 AND 7 ARE THE SAME',
      'Play Coach Mike: HEAR COACH MIKE: THE 4 LEVEL ARCH SYSTEM',
      'Play Coach Mike: HEAR COACH MIKE: THE THREE LANES OF ATTACK',
    ]);
  });

  it('plays the right clip from each button', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    const [first, second, third, fourth] = screen.getAllByRole('button', { name: /^Play Coach Mike/ });
    await act(async () => fireEvent.click(first));
    expect(media.state.playedSources.at(-1)).toBe(url('V-A-06'));

    await act(async () => fireEvent.click(second));
    expect(media.state.playedSources.at(-1)).toBe(url('V-A-08'));

    await act(async () => fireEvent.click(third));
    expect(media.state.playedSources.at(-1)).toBe(url('V-A-09'));

    await act(async () => fireEvent.click(fourth));
    expect(media.state.playedSources.at(-1)).toBe(url('V-A-10'));
  });

  it('shows a single VOICE ON switch for the whole stack, not one per button', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);
    expect(voiceToggles()).toHaveLength(1);
  });

  it('puts the switch beside the first button that is showing', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-09', 'V-A-10']) });
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    expect(playButtons()).toHaveLength(2);
    expect(voiceToggles()).toHaveLength(1);
  });

  it('shows no button for a clip that is not uploaded, and no "not recorded" notice', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-06', 'V-A-10']) });
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    expect(playButtons()).toEqual([
      'Play Coach Mike: HEAR COACH MIKE: THE 7 ANGLE-MARKER SYSTEM',
      'Play Coach Mike: HEAR COACH MIKE: THE THREE LANES OF ATTACK',
    ]);
    expect(screen.queryByText('NOT RECORDED YET')).toBeNull();
  });

  it('shows nothing at all while none of them is uploaded', async () => {
    getAllClips.mockResolvedValue({ success: true, data: {} });
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    expect(playButtons()).toEqual([]);
    expect(voiceToggles()).toEqual([]);
  });
});

describe('PillarTeachingVoice — the 7 Angle-Marker chips', () => {
  const ALL = ['V-A-21', 'V-A-06', 'V-A-08', 'V-A-09', 'V-A-10'];
  const labelOf = (id: string) => clipsForPillar('pillar_positioning').find(item => item.clipId === id)!.label;

  beforeEach(() => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(ALL) });
  });

  it('draws the four teaching lines as chips with their short names, on any screen width', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    const shown = screen
      .getAllByRole('button', { name: /^Play Coach Mike/ })
      .slice(1)
      .map(b => b.textContent);
    expect(shown).toEqual(['7 ANGLE-MARKER', 'ANGLES 1 AND 7', '4 LEVEL ARCH', '3 LANES OF ATTACK']);
  });

  it('still names each chip in full for a screen reader, so none sound alike', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    const names = playButtons().slice(1);
    expect(new Set(names).size).toBe(4);
    expect(names[1]).toBe('Play Coach Mike: HEAR COACH MIKE: ANGLES 1 AND 7 ARE THE SAME');
  });

  it('keeps the welcome as the one full button, ahead of the chips', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    const welcome = screen.getAllByRole('button', { name: /^Play Coach Mike/ })[0];
    expect(welcome.textContent).toContain('WELCOME TO THE 7 ANGLE-MARKER SYSTEM');
  });

  it('puts the four chips in one row, apart from the welcome', async () => {
    const { container } = await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);
    const [welcome, ...chips] = screen.getAllByRole('button', { name: /^Play Coach Mike/ });

    const rows = new Set(chips.map(chip => chip.parentElement!.parentElement));
    expect(rows.size).toBe(1);
    const [row] = [...rows];
    expect(row).toHaveClass('flex-wrap');
    expect(row!.contains(welcome)).toBe(false);
    expect(container.querySelectorAll('.flex-wrap')).toHaveLength(1);
  });

  it('plays the right clip from each chip', async () => {
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    for (const id of ['V-A-06', 'V-A-08', 'V-A-09', 'V-A-10']) {
      const chip = screen
        .getAllByRole('button', { name: /^Play Coach Mike/ })
        .find(b => b.getAttribute('aria-label') === `Play Coach Mike: ${labelOf(id)}`)!;
      await act(async () => fireEvent.click(chip));
      expect(media.state.playedSources.at(-1)).toBe(url(id));
    }
  });

  it('leaves no empty row behind when none of the four is uploaded', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-21']) });
    const { container } = await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    expect(playButtons()).toHaveLength(1);
    expect(container.querySelectorAll('.flex-wrap')).toHaveLength(0);
  });

  it('still shows the chips when the welcome is not uploaded, with one switch beside the first', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-08', 'V-A-10']) });
    await mount(<PillarTeachingVoice pillarId="pillar_positioning" />);

    expect(screen.getAllByRole('button', { name: /^Play Coach Mike/ }).map(b => b.textContent)).toEqual([
      'ANGLES 1 AND 7',
      '3 LANES OF ATTACK',
    ]);
    expect(voiceToggles()).toHaveLength(1);
  });

  it('keeps the 6 Zone, 7 Point line as a full button under its welcome', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-22', 'V-A-07']) });
    const { container } = await mount(<PillarTeachingVoice pillarId="pillar_seven_point" />);

    const [welcome, line] = screen.getAllByRole('button', { name: /^Play Coach Mike/ });
    expect(welcome.textContent).toContain('WELCOME TO THE 6 ZONE, 7 POINT SYSTEM');
    expect(line.textContent).toContain('THE 6 ZONE, 7 POINT SYSTEM');
    expect(container.querySelectorAll('.flex-wrap')).toHaveLength(0);
  });
});

describe('PillarTeachingVoice — 6 Zone, 7 Point System (pillar_seven_point)', () => {
  it('shows V-A-07 on its own', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-07']) });
    await mount(<PillarTeachingVoice pillarId="pillar_seven_point" />);

    expect(playButtons()).toEqual(['Play Coach Mike: HEAR COACH MIKE: THE 6 ZONE, 7 POINT SYSTEM']);
    expect(voiceToggles()).toHaveLength(1);
  });

  it('does not carry the 7 Angle-Marker clips, V-A-08 included', async () => {
    getAllClips.mockResolvedValue({
      success: true,
      data: onFile(['V-A-06', 'V-A-07', 'V-A-08', 'V-A-09', 'V-A-10']),
    });
    await mount(<PillarTeachingVoice pillarId="pillar_seven_point" />);

    expect(playButtons()).toHaveLength(1);
    expect(playButtons().join(' ')).not.toMatch(/ANGLE-MARKER|ANGLES 1 AND 7|ARCH|LANES/);
  });
});

describe('PillarTeachingVoice — other pillars', () => {
  it.each(['pillar_training', 'pillar_unknown', ''])('renders nothing for %j', async pillarId => {
    getAllClips.mockResolvedValue({
      success: true,
      data: onFile(['V-A-06', 'V-A-07', 'V-A-08', 'V-A-09', 'V-A-10']),
    });
    const { container } = await mount(<PillarTeachingVoice pillarId={pillarId} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('FirstVisitVoice — V-A-14 while Coach has it parked', () => {
  it('shows nothing on the Mind-Vault, and does not count the visit, even with the recording on file', async () => {
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-14']) });
    signIn(GOALIE);
    await mount(<FirstVisitVoice moment="mindVaultFirstVisit" label={MIND_VAULT_LABEL} />);

    expect(playButtons()).toEqual([]);
    expect(markVoiceMoment).not.toHaveBeenCalled();
  });
});

// V-A-14 is parked in the shipped catalogue (17 October). The placement is kept
// so it can come back, so these tests lift the parking to prove it still works.
describe('FirstVisitVoice — the Mind-Vault, first visit only', () => {
  let putBack: () => void;

  beforeEach(() => {
    putBack = unpark(['V-A-14']);
    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-14']) });
  });

  afterEach(() => {
    putBack();
  });

  const vault = () => <FirstVisitVoice moment="mindVaultFirstVisit" label={MIND_VAULT_LABEL} />;

  it('shows the V-A-14 button on the first visit and counts the visit', async () => {
    signIn(GOALIE);
    await mount(vault());

    expect(playButtons()).toEqual([`Play Coach Mike: ${MIND_VAULT_LABEL}`]);
    expect(markVoiceMoment).toHaveBeenCalledTimes(1);
    expect(markVoiceMoment).toHaveBeenCalledWith('goalie-1', 'mindVaultFirstVisit');
  });

  it('plays V-A-14 when pressed, and does not start by itself', async () => {
    signIn(GOALIE);
    await mount(vault());
    expect(media.play).not.toHaveBeenCalled();

    await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Play Coach Mike/ })));
    expect(media.state.playedSources).toEqual([url('V-A-14')]);
  });

  it('keeps the button for the rest of the visit after counting it', async () => {
    signIn(GOALIE);
    await mount(vault());

    expect(refreshUser).toHaveBeenCalledTimes(1);
    expect(playButtons()).toHaveLength(1);
  });

  it('is gone on the next visit', async () => {
    signIn(GOALIE);
    const first = await mount(vault());
    first.unmount();

    await mount(vault());
    expect(playButtons()).toEqual([]);
    expect(markVoiceMoment).toHaveBeenCalledTimes(1);
  });

  it('is gone for a goalie whose account says the visit has happened', async () => {
    signIn({ ...GOALIE, voiceMoments: { mindVaultFirstVisit: new Date('2026-10-05T00:00:00Z') } });
    await mount(vault());

    expect(playButtons()).toEqual([]);
    expect(markVoiceMoment).not.toHaveBeenCalled();
  });

  it('is not shown, and the visit is not counted, while V-A-14 is not uploaded', async () => {
    getAllClips.mockResolvedValue({ success: true, data: {} });
    signIn(GOALIE);
    await mount(vault());

    expect(playButtons()).toEqual([]);
    expect(markVoiceMoment).not.toHaveBeenCalled();
  });

  it('counts the visit once the recording is uploaded, not before', async () => {
    getAllClips.mockResolvedValue({ success: true, data: {} });
    signIn(GOALIE);
    const missing = await mount(vault());
    missing.unmount();
    expect(markVoiceMoment).not.toHaveBeenCalled();

    getAllClips.mockResolvedValue({ success: true, data: onFile(['V-A-14']) });
    await mount(vault());
    expect(playButtons()).toHaveLength(1);
    expect(markVoiceMoment).toHaveBeenCalledTimes(1);
  });

  it('shows nothing when nobody is signed in', async () => {
    await mount(vault());

    expect(playButtons()).toEqual([]);
    expect(markVoiceMoment).not.toHaveBeenCalled();
  });
});
