/**
 * The audio library as admin runs it (Audio Part 2): the catalogue in code,
 * plus the recordings added from admin, plus what admin has set on each one.
 *
 * Pure functions over the settings map that `coachAudioService.getLibrary()`
 * returns, so the admin screen, the provider and the tests read the same rules.
 */

import {
  ADDED_AUDIO_ID,
  COACH_AUDIO_CATALOGUE,
  coachAudioIdFromFilename,
  getCoachAudioEntry,
  type CoachAudioCatalogueEntry,
  type CoachAudioClip,
  type CoachAudioSettings,
} from '@/types/coach-audio';

export type AudioSettingsMap = Record<string, CoachAudioSettings>;

/** Recordings added from admin, as catalogue entries, sorted by id. */
export function addedEntries(settings: AudioSettingsMap): CoachAudioCatalogueEntry[] {
  return Object.entries(settings)
    .filter(([id, s]) => s.added && !getCoachAudioEntry(id))
    .map(([id, s]) => ({
      id,
      part: 'added' as const,
      scriptLine: s.text?.trim() || s.added?.title || id,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The catalogue in code followed by the recordings added from admin. */
export function fullCatalogue(settings: AudioSettingsMap): CoachAudioCatalogueEntry[] {
  return [...COACH_AUDIO_CATALOGUE, ...addedEntries(settings)];
}

/** True for a catalogue id or a recording added from admin. */
export function isKnownAudioId(id: string, settings: AudioSettingsMap): boolean {
  return Boolean(getCoachAudioEntry(id) || settings[id]?.added);
}

/**
 * Why a new recording id cannot be used, or null when it can. The id is also
 * the stored file's name and the document id, so it must be unique and safe.
 */
export function newAudioIdProblem(id: string, settings: AudioSettingsMap): string | null {
  if (!ADDED_AUDIO_ID.test(id)) {
    return 'Use capitals, numbers and hyphens only, e.g. G-01 or QA-045.';
  }
  if (isKnownAudioId(id, settings)) return `${id} is already in the library.`;
  return null;
}

/**
 * The recording a dropped file belongs to. Catalogue names are matched the way
 * they always were; a file for a recording added from admin matches by its id,
 * with or without the SG_VOICE_ prefix Michael's files carry.
 */
export function audioIdFromFilename(filename: string, settings: AudioSettingsMap): string | null {
  const catalogued = coachAudioIdFromFilename(filename);
  if (catalogued) return catalogued;

  const base = filename
    .replace(/\.[^.]+$/, '')
    .replace(/^SG[-_]VOICE[-_]/i, '')
    .toUpperCase()
    .replace(/_/g, '-');
  return settings[base]?.added ? base : null;
}

/**
 * The words to show with a recording, or undefined when there are none to trust.
 *
 * Admin's own text wins. Otherwise the catalogue line, unless Michael is
 * re-recording the clip and the line on file is the old wording.
 */
export function displayText(id: string, settings: AudioSettingsMap): string | undefined {
  const edited = settings[id]?.text?.trim();
  if (edited) return edited;

  const entry = getCoachAudioEntry(id);
  if (entry) return !entry.reRecord || entry.reRecord.wordingFinal ? entry.scriptLine : undefined;
  return settings[id]?.added?.title;
}

/**
 * The recordings admin has placed in a slot that can play right now, in
 * library order. `playable` is the provider's map, which already leaves out
 * hidden, held and parked recordings.
 */
export function clipIdsForSlot(
  slot: string,
  settings: AudioSettingsMap,
  playable: Record<string, CoachAudioClip>
): string[] {
  return fullCatalogue(settings)
    .map(entry => entry.id)
    .filter(id => playable[id] && settings[id]?.slots?.includes(slot));
}
