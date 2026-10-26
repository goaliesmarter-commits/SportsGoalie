/**
 * Coach Audio service — storage and retrieval of Michael's recorded lines.
 *
 * Storage layout is deterministic: `coach-audio/{clipId}.{ext}`. That means
 * re-uploading V-A-01 replaces V-A-01 rather than accumulating a second copy
 * under a generated filename, which is why this does not use
 * `storageService.uploadFile` (that generates unique names by design).
 *
 * Firestore documents are keyed by clip id too, so `coach_audio_clips/V-A-01`
 * is the whole lookup. No queries, no indexes.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { z } from 'zod';

import { db, storage } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import { fullCatalogue, isKnownAudioId, newAudioIdProblem, type AudioSettingsMap } from '@/lib/audio/library';
import { isKnownSlot } from '@/lib/audio/slots';
import {
  COACH_AUDIO_ACCEPTED_TYPES,
  COACH_AUDIO_MAX_BYTES,
  type CoachAudioClip,
  type CoachAudioSettings,
  type CoachAudioStatus,
} from '@/types/coach-audio';
import type { ApiResponse } from '@/types';

const COLLECTION = 'coach_audio_clips';
const STORAGE_FOLDER = 'coach-audio';

/**
 * Validates what comes back out of Firestore. Documents here are written only
 * by the admin screen, but a clip that fails this check is skipped rather than
 * rendered as a broken player.
 */
const clipDocSchema = z.object({
  url: z.string().url(),
  storagePath: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().nonnegative(),
  durationSeconds: z.number().positive().nullable(),
  originalFilename: z.string().min(1),
});

/** Admin's settings on a recording. Anything malformed is dropped, not trusted. */
const settingsSchema = z.object({
  hidden: z.boolean().optional(),
  text: z.string().max(5000).optional(),
  label: z.string().max(200).optional(),
  slots: z.array(z.string()).optional(),
  added: z.object({ title: z.string().min(1).max(200) }).optional(),
});

/** The file fields an upload writes; removing a recording clears only these. */
const FILE_FIELDS = [
  'url',
  'storagePath',
  'contentType',
  'sizeBytes',
  'durationSeconds',
  'originalFilename',
  'uploadedAt',
] as const;

export interface CoachAudioLibrary {
  clips: Record<string, CoachAudioClip>;
  settings: AudioSettingsMap;
}

/** What admin may change on a recording. `null` clears a field. */
export type CoachAudioSettingsUpdate = {
  hidden?: boolean;
  text?: string | null;
  label?: string | null;
  slots?: string[];
};

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date() };
}

function fail<T>(code: string, message: string, details?: unknown): ApiResponse<T> {
  return { success: false, error: { code, message, details }, timestamp: new Date() };
}

/**
 * Firebase throws `FirebaseError`, which carries the useful part in `code`
 * (e.g. `storage/unauthorized`). The logger serialises with JSON.stringify, and
 * an Error has no enumerable properties, so logging one directly produces `{}`
 * and tells you nothing. Flatten it first.
 */
function describeError(error: unknown): { code: string; message: string } {
  if (error && typeof error === 'object') {
    const candidate = error as { code?: unknown; message?: unknown };
    return {
      code: typeof candidate.code === 'string' ? candidate.code : 'unknown',
      message: typeof candidate.message === 'string' ? candidate.message : String(error),
    };
  }
  return { code: 'unknown', message: String(error) };
}

export class CoachAudioService {
  /** Extension for the stored object, derived from the uploaded filename. */
  private extensionFor(filename: string): string {
    const match = filename.match(/\.([a-z0-9]{1,5})$/i);
    return match ? match[1].toLowerCase() : 'mp3';
  }

  private parseClip(id: string, raw: Record<string, unknown>): CoachAudioClip | null {
    const parsed = clipDocSchema.safeParse(raw);
    if (!parsed.success) {
      logger.warn('Skipping malformed coach audio clip', 'CoachAudioService', {
        id,
        issues: parsed.error.issues,
      });
      return null;
    }
    return {
      id,
      ...parsed.data,
      uploadedAt: toDate(raw.uploadedAt),
      updatedAt: toDate(raw.updatedAt),
    };
  }

  private parseSettings(id: string, raw: Record<string, unknown>): CoachAudioSettings {
    const picked = {
      hidden: raw.hidden,
      text: raw.text,
      label: raw.label,
      slots: raw.slots,
      added: raw.added,
    };
    const parsed = settingsSchema.safeParse(
      Object.fromEntries(Object.entries(picked).filter(([, value]) => value !== undefined))
    );
    if (!parsed.success) {
      logger.warn('Ignoring malformed coach audio settings', 'CoachAudioService', {
        id,
        issues: parsed.error.issues,
      });
      return {};
    }
    return parsed.data;
  }

  /**
   * Every uploaded clip and every recording's admin settings, keyed by id.
   *
   * The whole collection is a hundred-odd small documents, so this reads all of
   * them in one go and the caller caches the result. That is what keeps the
   * ~100 audio buttons across the site from firing a read each. A document can
   * carry settings with no upload yet (a recording added from admin, or one
   * placed before its file arrives); that is a recording with no clip, not a
   * malformed one.
   */
  async getLibrary(): Promise<ApiResponse<CoachAudioLibrary>> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION));
      const clips: Record<string, CoachAudioClip> = {};
      const settings: AudioSettingsMap = {};

      snapshot.forEach(snap => {
        const raw = snap.data();
        if (raw.url !== undefined) {
          const clip = this.parseClip(snap.id, raw);
          if (clip) clips[snap.id] = clip;
        }
        const parsed = this.parseSettings(snap.id, raw);
        if (Object.keys(parsed).length > 0) settings[snap.id] = parsed;
      });

      return ok({ clips, settings });
    } catch (error) {
      logger.error('Failed to load coach audio clips', 'CoachAudioService', { ...describeError(error) });
      return fail('coach-audio/list-failed', 'Could not load the audio clips.', error);
    }
  }

  /** Every uploaded clip, keyed by id. */
  async getAllClips(): Promise<ApiResponse<Record<string, CoachAudioClip>>> {
    const result = await this.getLibrary();
    if (!result.success || !result.data) {
      return fail('coach-audio/list-failed', 'Could not load the audio clips.');
    }
    return ok(result.data.clips);
  }

  async getClip(id: string): Promise<ApiResponse<CoachAudioClip | null>> {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (!snap.exists()) return ok(null);
      return ok(this.parseClip(snap.id, snap.data()));
    } catch (error) {
      logger.error('Failed to load coach audio clip', 'CoachAudioService', { id, ...describeError(error) });
      return fail('coach-audio/get-failed', 'Could not load that audio clip.', error);
    }
  }

  /**
   * The full catalogue joined to whatever has been uploaded — the admin screen's
   * view of the world, including the entries that are still missing.
   */
  async getStatuses(): Promise<ApiResponse<CoachAudioStatus[]>> {
    const result = await this.getLibrary();
    if (!result.success || !result.data) {
      return fail('coach-audio/status-failed', 'Could not load the audio catalogue.');
    }

    const { clips, settings } = result.data;
    return ok(
      fullCatalogue(settings).map(entry => ({
        entry,
        clip: clips[entry.id] ?? null,
        settings: settings[entry.id] ?? {},
      }))
    );
  }

  /** Every recording's admin settings, for the checks the writes below make. */
  private async currentSettings(): Promise<AudioSettingsMap> {
    const result = await this.getLibrary();
    return result.success && result.data ? result.data.settings : {};
  }

  /**
   * Adds a recording that is not in the catalogue (2.1), so Michael can bring
   * in a new gem or answer without a developer. It has no file until one is
   * uploaded against its id.
   */
  async addRecording(id: string, title: string, text?: string): Promise<ApiResponse<null>> {
    const cleanId = id.trim().toUpperCase();
    const cleanTitle = title.trim();
    if (!cleanTitle) return fail('coach-audio/no-title', 'Give the recording a title.');

    const problem = newAudioIdProblem(cleanId, await this.currentSettings());
    if (problem) return fail('coach-audio/bad-id', problem);

    try {
      await setDoc(doc(db, COLLECTION, cleanId), {
        added: { title: cleanTitle },
        ...(text?.trim() ? { text: text.trim() } : {}),
        updatedAt: serverTimestamp(),
      });
      logger.info('Coach audio recording added', 'CoachAudioService', { id: cleanId });
      return ok(null);
    } catch (error) {
      logger.error('Adding coach audio recording failed', 'CoachAudioService', {
        id: cleanId,
        ...describeError(error),
      });
      return fail('coach-audio/add-failed', `Could not add ${cleanId}.`, error);
    }
  }

  /**
   * Saves what admin changed on a recording: hide (2.1), text (2.4), label, and
   * the slots it plays in (2.2). Merged into the same document as the upload,
   * so replacing the file never loses them.
   */
  async saveSettings(id: string, update: CoachAudioSettingsUpdate): Promise<ApiResponse<null>> {
    if (!isKnownAudioId(id, await this.currentSettings())) {
      return fail('coach-audio/unknown-id', `"${id}" is not in the library.`);
    }
    if (update.slots && !update.slots.every(isKnownSlot)) {
      return fail('coach-audio/unknown-slot', 'One of those places is not on the site.');
    }

    const clearable = (value: string | null | undefined) =>
      value === undefined ? undefined : value === null || value.trim() === '' ? deleteField() : value.trim();

    const patch = Object.fromEntries(
      Object.entries({
        hidden: update.hidden,
        text: clearable(update.text),
        label: clearable(update.label),
        slots: update.slots ? [...new Set(update.slots)] : undefined,
      }).filter(([, value]) => value !== undefined)
    );

    try {
      await setDoc(doc(db, COLLECTION, id), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      return ok(null);
    } catch (error) {
      logger.error('Saving coach audio settings failed', 'CoachAudioService', { id, ...describeError(error) });
      return fail('coach-audio/save-failed', `Could not save ${id}.`, error);
    }
  }

  /**
   * Store one recording against a catalogue id.
   *
   * `durationSeconds` is read off an audio element by the caller before upload,
   * because Firebase Storage does not expose duration and reading it here would
   * mean decoding the file a second time.
   */
  async uploadClip(
    id: string,
    file: File,
    durationSeconds: number | null
  ): Promise<ApiResponse<CoachAudioClip>> {
    if (!isKnownAudioId(id, await this.currentSettings())) {
      return fail('coach-audio/unknown-id', `"${id}" is not a recording in the library.`);
    }
    if (file.size > COACH_AUDIO_MAX_BYTES) {
      return fail(
        'coach-audio/too-large',
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 25 MB.`
      );
    }
    // Some browsers hand over an empty type for .wav dragged from a folder, so
    // an unrecognised type is allowed through when the extension looks like audio.
    const extension = this.extensionFor(file.name);
    const typeLooksRight =
      COACH_AUDIO_ACCEPTED_TYPES.includes(file.type) ||
      (file.type === '' && ['mp3', 'wav', 'm4a', 'ogg', 'webm'].includes(extension));
    if (!typeLooksRight) {
      return fail('coach-audio/wrong-type', `${file.name} is not an audio file.`);
    }

    try {
      // A previous upload under a different extension has to be removed, or the
      // old object lingers in storage unreferenced and uncharged-for-nothing.
      const existing = await this.getClip(id);
      const previousPath = existing.success ? existing.data?.storagePath ?? null : null;

      const storagePath = `${STORAGE_FOLDER}/${id}.${extension}`;
      const objectRef = ref(storage, storagePath);

      const snapshot = await uploadBytes(objectRef, file, {
        contentType: file.type || `audio/${extension === 'mp3' ? 'mpeg' : extension}`,
        customMetadata: { clipId: id, originalName: file.name },
      });
      const url = await getDownloadURL(snapshot.ref);

      await setDoc(
        doc(db, COLLECTION, id),
        {
          url,
          storagePath,
          contentType: snapshot.metadata.contentType ?? file.type,
          sizeBytes: file.size,
          durationSeconds,
          originalFilename: file.name,
          uploadedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (previousPath && previousPath !== storagePath) {
        await deleteObject(ref(storage, previousPath)).catch(error => {
          logger.warn('Could not remove superseded audio object', 'CoachAudioService', {
            id,
            previousPath,
            error,
          });
        });
      }

      logger.info('Coach audio clip uploaded', 'CoachAudioService', { id, storagePath });

      return ok({
        id,
        url,
        storagePath,
        contentType: snapshot.metadata.contentType ?? file.type,
        sizeBytes: file.size,
        durationSeconds,
        originalFilename: file.name,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      const described = describeError(error);
      logger.error('Coach audio upload failed', 'CoachAudioService', { id, ...described });
      return fail(
        'coach-audio/upload-failed',
        `Could not upload ${file.name} (${described.code}). ${described.message}`,
        error
      );
    }
  }

  /**
   * Removes the stored file. Admin's settings on the recording (its text, its
   * places, a recording added from admin) stay, so uploading a new file puts it
   * straight back where it was. `removeRecording` takes an added one out whole.
   */
  async deleteClip(id: string): Promise<ApiResponse<null>> {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (!snap.exists()) return ok(null);
      const raw = snap.data();
      const storagePath = typeof raw.storagePath === 'string' ? raw.storagePath : null;

      if (storagePath) {
        await deleteObject(ref(storage, storagePath)).catch(error => {
          // A missing object should not block removing the record that points at it.
          logger.warn('Audio object already gone', 'CoachAudioService', { id, error });
        });
      }

      if (Object.keys(this.parseSettings(id, raw)).length > 0) {
        await setDoc(
          doc(db, COLLECTION, id),
          {
            ...Object.fromEntries(FILE_FIELDS.map(field => [field, deleteField()])),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await deleteDoc(doc(db, COLLECTION, id));
      }

      logger.info('Coach audio clip deleted', 'CoachAudioService', { id });
      return ok(null);
    } catch (error) {
      logger.error('Coach audio delete failed', 'CoachAudioService', { id, ...describeError(error) });
      return fail('coach-audio/delete-failed', 'Could not delete that clip.', error);
    }
  }

  /** Takes a recording added from admin out of the library, file and all. */
  async removeRecording(id: string): Promise<ApiResponse<null>> {
    const settings = await this.currentSettings();
    if (!settings[id]?.added) {
      return fail('coach-audio/not-added', `${id} is part of the catalogue and cannot be removed.`);
    }
    const cleared = await this.deleteClip(id);
    if (!cleared.success) return cleared;
    try {
      await deleteDoc(doc(db, COLLECTION, id));
      return ok(null);
    } catch (error) {
      logger.error('Removing coach audio recording failed', 'CoachAudioService', { id, ...describeError(error) });
      return fail('coach-audio/remove-failed', `Could not remove ${id}.`, error);
    }
  }
}

export const coachAudioService = new CoachAudioService();
