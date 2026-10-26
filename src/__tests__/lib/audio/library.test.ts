import { describe, it, expect } from 'vitest';

import {
  addedEntries,
  audioIdFromFilename,
  clipIdsForSlot,
  displayText,
  fullCatalogue,
  isKnownAudioId,
  newAudioIdProblem,
} from '@/lib/audio/library';
import { COACH_AUDIO_CATALOGUE, playableClips, type CoachAudioClip } from '@/types/coach-audio';

function clip(id: string): CoachAudioClip {
  const at = new Date('2026-10-27T09:00:00Z');
  return {
    id,
    url: `https://storage.example/${id}.mp3`,
    storagePath: `coach-audio/${id}.mp3`,
    contentType: 'audio/mpeg',
    sizeBytes: 1000,
    durationSeconds: 5,
    originalFilename: `${id}.mp3`,
    uploadedAt: at,
    updatedAt: at,
  };
}

const SLOT = '/parent-role|HEAR COACH MIKE: THE CAR RIDE HOME AND WHY IT MATTERS MORE THAN THE PRACTICE';

describe('recordings added from admin', () => {
  it('join the catalogue after the catalogued ones, sorted by id', () => {
    const settings = { 'G-02': { added: { title: 'Second gem' } }, 'G-01': { added: { title: 'First gem' } } };
    const ids = fullCatalogue(settings).map(e => e.id);

    expect(ids.slice(0, COACH_AUDIO_CATALOGUE.length)).toEqual(COACH_AUDIO_CATALOGUE.map(e => e.id));
    expect(ids.slice(-2)).toEqual(['G-01', 'G-02']);
  });

  it('show their own text when admin has written one, and their title otherwise', () => {
    const entries = addedEntries({
      'G-01': { added: { title: 'First gem' } },
      'G-02': { added: { title: 'Second gem' }, text: 'What he says.' },
    });
    expect(entries.map(e => e.scriptLine)).toEqual(['First gem', 'What he says.']);
  });

  it('never shadow a catalogue entry that has settings of its own', () => {
    expect(addedEntries({ 'V-A-01': { hidden: true } })).toEqual([]);
  });

  it('are known ids, as catalogue ids are', () => {
    expect(isKnownAudioId('V-A-01', {})).toBe(true);
    expect(isKnownAudioId('G-01', {})).toBe(false);
    expect(isKnownAudioId('G-01', { 'G-01': { added: { title: 'Gem' } } })).toBe(true);
  });
});

describe('a new recording id', () => {
  it('is refused when it is not capitals, numbers and hyphens', () => {
    expect(newAudioIdProblem('g-01', {})).toMatch(/capitals/);
    expect(newAudioIdProblem('G 01', {})).toMatch(/capitals/);
    expect(newAudioIdProblem('-G', {})).toMatch(/capitals/);
  });

  it('is refused when it is already in the library', () => {
    expect(newAudioIdProblem('V-A-01', {})).toMatch(/already/);
    expect(newAudioIdProblem('G-01', { 'G-01': { added: { title: 'Gem' } } })).toMatch(/already/);
  });

  it('is accepted in the shape Michael names his files', () => {
    expect(newAudioIdProblem('G-01', {})).toBeNull();
    expect(newAudioIdProblem('QA-045', {})).toBeNull();
  });
});

describe('matching a dropped file', () => {
  const settings = { 'QA-045': { added: { title: 'An answer' } } };

  it('still matches catalogue names the way it always has', () => {
    expect(audioIdFromFilename('SG_VOICE_V-A-01.wav', settings)).toBe('V-A-01');
  });

  it('matches a recording added from admin, with or without the SG_VOICE_ prefix', () => {
    expect(audioIdFromFilename('SG_VOICE_QA-045.mp3', settings)).toBe('QA-045');
    expect(audioIdFromFilename('qa_045.wav', settings)).toBe('QA-045');
  });

  it('matches nothing it does not know', () => {
    expect(audioIdFromFilename('SG_VOICE_QA-999.mp3', settings)).toBeNull();
  });
});

describe('the words shown with a recording', () => {
  it("are admin's own text when there is some", () => {
    expect(displayText('V-A-01', { 'V-A-01': { text: '  New words.  ' } })).toBe('New words.');
  });

  it('fall back to the catalogue line', () => {
    expect(displayText('V-A-01', {})).toBe(COACH_AUDIO_CATALOGUE.find(e => e.id === 'V-A-01')?.scriptLine);
  });

  it('are blank text treated as no text', () => {
    expect(displayText('V-A-01', { 'V-A-01': { text: '   ' } })).toBe(
      COACH_AUDIO_CATALOGUE.find(e => e.id === 'V-A-01')?.scriptLine
    );
  });
});

describe('what plays in a slot', () => {
  it('is every playable recording placed there, in library order', () => {
    const settings = {
      'V-A-02': { slots: [SLOT] },
      'V-A-01': { slots: [SLOT, '/goalie|NEW BUTTONS'] },
      'V-A-03': { slots: ['/goalie|NEW BUTTONS'] },
    };
    const playable = { 'V-A-01': clip('V-A-01'), 'V-A-02': clip('V-A-02'), 'V-A-03': clip('V-A-03') };
    expect(clipIdsForSlot(SLOT, settings, playable)).toEqual(['V-A-01', 'V-A-02']);
  });

  it('leaves out a placed recording that has not been uploaded', () => {
    expect(clipIdsForSlot(SLOT, { 'V-A-01': { slots: [SLOT] } }, {})).toEqual([]);
  });

  it('leaves out a recording admin has hidden', () => {
    const settings = { 'V-A-01': { slots: [SLOT], hidden: true } };
    const playable = playableClips({ 'V-A-01': clip('V-A-01') }, settings);
    expect(clipIdsForSlot(SLOT, settings, playable)).toEqual([]);
  });
});
