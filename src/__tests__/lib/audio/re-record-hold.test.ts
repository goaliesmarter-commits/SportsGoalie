import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { holdForReRecord } from '../../helpers/re-record-hold';
import {
  COACH_AUDIO_CATALOGUE,
  isHeldForReRecord,
  isParked,
  playableClips,
  type CoachAudioClip,
} from '@/types/coach-audio';

// Every take in the first folder was uploaded on 13 September.
const FIRST_FOLDER_UPLOAD = new Date('2026-09-13T15:00:00Z');
const NEW_TAKE_UPLOAD = new Date('2026-10-02T09:00:00Z');

// These tests hold four lines themselves, as the four that were held before the
// 29 September takes arrived. The holds the catalogue ships with are checked
// separately, in the last two describes.
const HELD_IDS = ['V-A-01', 'V-A-02', 'V-A-05', 'V-A-10'];
const CUTOFF = '2026-09-14T00:00:00Z';

let release: () => void;

beforeEach(() => {
  release = holdForReRecord(HELD_IDS, CUTOFF);
});

afterEach(() => {
  release();
});

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

describe('re-record hold — which takes stay silent', () => {
  it('gives every hold a cutoff that parses and a reason to show the admin', () => {
    for (const entry of COACH_AUDIO_CATALOGUE.filter(e => e.reRecord)) {
      expect(Number.isNaN(Date.parse(entry.reRecord!.heldBefore)), entry.id).toBe(false);
      expect(entry.reRecord!.reason.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('keeps the take from the first folder silent', () => {
    for (const id of HELD_IDS) {
      expect(isHeldForReRecord(clip(id, FIRST_FOLDER_UPLOAD)), id).toBe(true);
    }
  });

  it('plays a new take as soon as it is uploaded, with no code change', () => {
    for (const id of HELD_IDS) {
      expect(isHeldForReRecord(clip(id, NEW_TAKE_UPLOAD)), id).toBe(false);
    }
  });

  it('holds nothing once the holds are lifted, however old the take', () => {
    release();
    for (const id of HELD_IDS) {
      expect(isHeldForReRecord(clip(id, FIRST_FOLDER_UPLOAD)), id).toBe(false);
    }
  });

  it('counts a take uploaded at the cutoff itself as new', () => {
    expect(isHeldForReRecord(clip('V-A-01', new Date('2026-09-14T00:00:00Z')))).toBe(false);
    expect(isHeldForReRecord(clip('V-A-01', new Date('2026-09-13T23:59:59Z')))).toBe(true);
  });

  it('never holds a line that is not being re-recorded, however old the take', () => {
    expect(isHeldForReRecord(clip('V-A-03', FIRST_FOLDER_UPLOAD))).toBe(false);
    expect(isHeldForReRecord(clip('V-B-01', new Date('2020-01-01T00:00:00Z')))).toBe(false);
  });

  it('holds a take whose upload date cannot be read — silence is the safer mistake', () => {
    expect(isHeldForReRecord(clip('V-A-01', new Date('not a date')))).toBe(true);
  });
});

describe('playableClips', () => {
  it('drops the held takes and keeps everything else', () => {
    const onFile = {
      'V-A-01': clip('V-A-01', FIRST_FOLDER_UPLOAD),
      'V-A-02': clip('V-A-02', NEW_TAKE_UPLOAD),
      'V-A-03': clip('V-A-03', FIRST_FOLDER_UPLOAD),
      'V-A-10': clip('V-A-10', FIRST_FOLDER_UPLOAD),
      'V-B-05': clip('V-B-05', FIRST_FOLDER_UPLOAD),
    };

    expect(Object.keys(playableClips(onFile)).sort()).toEqual(['V-A-02', 'V-A-03', 'V-B-05']);
  });

  it('leaves the record it was given alone', () => {
    const onFile = { 'V-A-01': clip('V-A-01', FIRST_FOLDER_UPLOAD) };
    playableClips(onFile);
    expect(Object.keys(onFile)).toEqual(['V-A-01']);
  });

  it('drops a parked clip however new the upload', () => {
    const onFile = {
      'V-A-14': clip('V-A-14', NEW_TAKE_UPLOAD),
      'V-A-15': clip('V-A-15', NEW_TAKE_UPLOAD),
    };
    expect(Object.keys(playableClips(onFile))).toEqual(['V-A-15']);
  });
});

// Coach's answers of 17 October. The takes on file for these were recorded to
// the old wording, so each stays silent until a take uploaded after the answers.
const REWORDED = ['V-A-13', 'V-A-17', 'V-A-19', 'V-A-32', 'V-B-12'];
const ANSWERS_ARRIVED = new Date('2026-10-17T22:00:00Z');
const NEW_AUDIO_ARRIVES = new Date('2026-10-20T09:00:00Z');

describe('the holds the catalogue ships with — new wording of 17 October', () => {
  it.each(REWORDED)('keeps the old take of %s silent', id => {
    expect(isHeldForReRecord(clip(id, new Date('2026-10-06T09:00:00Z'))), id).toBe(true);
    expect(isHeldForReRecord(clip(id, ANSWERS_ARRIVED)), id).toBe(true);
  });

  it.each(REWORDED)('plays a take of %s uploaded once the new audio arrives', id => {
    expect(isHeldForReRecord(clip(id, NEW_AUDIO_ARRIVES)), id).toBe(false);
  });

  it('carries the new wording in the catalogue, ready for the admin screen', () => {
    const line = (id: string) => COACH_AUDIO_CATALOGUE.find(e => e.id === id)!.scriptLine;
    expect(line('V-A-32')).toBe("Let's take a moment to review.");
    expect(line('V-B-12')).toMatch(/^Hey, just checking in\./);
    expect(line('V-A-13')).toMatch(/^The Factor Ratio is the bar that illustrates how you handled/);
    expect(line('V-A-17')).toMatch(/^Smarter Goalie's ultimate goal/);
    expect(line('V-A-19')).toMatch(/^Coach Mike here\. Welcome to MindSet, where your Mind-Vault grows and lives\./);
  });

  it('carries the closing of the final V-A-19 script', () => {
    const line = COACH_AUDIO_CATALOGUE.find(e => e.id === 'V-A-19')!.scriptLine;
    expect(line).toContain("At Smarter Goalie, we believe that high performance isn't just a byproduct of luck.");
    expect(line).toMatch(/Let's start building yours today\. Think smart, play smart\.$/);
  });

  it('carries the final v3 wording of 24 October', () => {
    const entry = (id: string) => COACH_AUDIO_CATALOGUE.find(e => e.id === id)!;
    expect(entry('V-A-13').scriptLine).toContain('Positional play above or below the icing line.');
    expect(entry('V-A-17').scriptLine).toContain('self-awareness, self-evaluation and eventually self-coaching');
    expect(entry('V-B-12').scriptLine).toMatch(/Select YES and I will get back to you to schedule that chat\.$/);
  });

  it('shows the transcript of every reworded clip as soon as its new take is uploaded', () => {
    for (const id of REWORDED) {
      expect(COACH_AUDIO_CATALOGUE.find(e => e.id === id)!.reRecord?.wordingFinal, id).toBe(true);
    }
  });
});

describe('the clips Coach has parked', () => {
  const PARKED = ['V-A-14', 'V-A-16', 'V-A-31', 'V-A-33', 'V-A-34', 'V-A-36'];

  it.each(PARKED)('parks %s, with the reason on file', id => {
    const entry = COACH_AUDIO_CATALOGUE.find(e => e.id === id)!;
    expect(entry.parked, id).toBeTruthy();
    expect(isParked(id), id).toBe(true);
  });

  it('parks nothing else, and deletes nothing', () => {
    expect(COACH_AUDIO_CATALOGUE.filter(e => e.parked).map(e => e.id)).toEqual(PARKED);
    expect(COACH_AUDIO_CATALOGUE).toHaveLength(73);
  });

  it('leaves the other short lines in use', () => {
    for (const id of ['V-A-27', 'V-A-28', 'V-A-29', 'V-A-30', 'V-A-32', 'V-A-35', 'V-A-37']) {
      expect(isParked(id), id).toBe(false);
    }
  });
});
