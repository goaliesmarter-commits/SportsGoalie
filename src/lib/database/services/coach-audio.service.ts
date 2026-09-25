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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { z } from 'zod';

import { db, storage } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import {
  COACH_AUDIO_CATALOGUE,
  COACH_AUDIO_ACCEPTED_TYPES,
  COACH_AUDIO_MAX_BYTES,
  isCoachAudioId,
  type CoachAudioClip,
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

  /**
   * Every uploaded clip, keyed by id.
   *
   * The whole collection is at most 59 small documents, so this reads all of
   * them in one go and the caller caches the result. That is what keeps the
   * ~100 audio buttons across the site from firing a read each.
   */
  async getAllClips(): Promise<ApiResponse<Record<string, CoachAudioClip>>> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION));
      const clips: Record<string, CoachAudioClip> = {};

      snapshot.forEach(snap => {
        const clip = this.parseClip(snap.id, snap.data());
        if (clip) clips[snap.id] = clip;
      });

      return ok(clips);
    } catch (error) {
      logger.error('Failed to load coach audio clips', 'CoachAudioService', { ...describeError(error) });
      return fail('coach-audio/list-failed', 'Could not load the audio clips.', error);
    }
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
    const result = await this.getAllClips();
    if (!result.success || !result.data) {
      return fail('coach-audio/status-failed', 'Could not load the audio catalogue.');
    }

    const clips = result.data;
    return ok(
      COACH_AUDIO_CATALOGUE.map(entry => ({
        entry,
        clip: clips[entry.id] ?? null,
      }))
    );
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
    if (!isCoachAudioId(id)) {
      return fail('coach-audio/unknown-id', `"${id}" is not a clip id in the catalogue.`);
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

  /** Removes both the stored object and the document. */
  async deleteClip(id: string): Promise<ApiResponse<null>> {
    try {
      const existing = await this.getClip(id);
      const storagePath = existing.success ? existing.data?.storagePath ?? null : null;

      if (storagePath) {
        await deleteObject(ref(storage, storagePath)).catch(error => {
          // A missing object should not block removing the record that points at it.
          logger.warn('Audio object already gone', 'CoachAudioService', { id, error });
        });
      }
      await deleteDoc(doc(db, COLLECTION, id));

      logger.info('Coach audio clip deleted', 'CoachAudioService', { id });
      return ok(null);
    } catch (error) {
      logger.error('Coach audio delete failed', 'CoachAudioService', { id, ...describeError(error) });
      return fail('coach-audio/delete-failed', 'Could not delete that clip.', error);
    }
  }
}

export const coachAudioService = new CoachAudioService();
