/**
 * Video Library Service
 *
 * CRUD for the `library_videos` Firestore collection — a shared pool of
 * videos that admins/coaches can upload once and reuse across quizzes,
 * instead of re-uploading the same footage into every quiz.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { LibraryVideo, CreateLibraryVideoData } from '@/types/video-library';
import { logInfo, logError } from '@/lib/errors/error-logger';

const COLLECTION = 'library_videos';

function toLibraryVideo(data: Record<string, any>): LibraryVideo {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    videoUrl: data.videoUrl,
    videoDuration: data.videoDuration,
    source: data.source,
    tags: data.tags ?? [],
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

class VideoLibraryService {
  private static instance: VideoLibraryService;

  private constructor() {}

  static getInstance(): VideoLibraryService {
    if (!VideoLibraryService.instance) {
      VideoLibraryService.instance = new VideoLibraryService();
    }
    return VideoLibraryService.instance;
  }

  async createVideo(data: CreateLibraryVideoData): Promise<LibraryVideo> {
    try {
      const ref = doc(collection(db, COLLECTION));
      const now = new Date();

      const video: LibraryVideo = {
        id: ref.id,
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        videoUrl: data.videoUrl,
        videoDuration: data.videoDuration,
        source: data.source,
        tags: data.tags ?? [],
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdAt: now,
        updatedAt: now,
      };

      const firestoreData = stripUndefined({
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        videoDuration: video.videoDuration,
        source: video.source,
        tags: video.tags,
        createdBy: video.createdBy,
        createdByName: video.createdByName,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

      await setDoc(ref, firestoreData);
      logInfo('Library video created', { id: video.id, title: video.title });
      return video;
    } catch (error) {
      logError('Failed to create library video', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async getAllVideos(): Promise<LibraryVideo[]> {
    try {
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => toLibraryVideo(d.data()));
    } catch (error) {
      logError('Failed to get library videos', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async getVideo(id: string): Promise<LibraryVideo | null> {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      return snap.exists() ? toLibraryVideo(snap.data()) : null;
    } catch (error) {
      logError('Failed to get library video', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async updateVideo(id: string, patch: Partial<CreateLibraryVideoData>): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTION, id), {
        ...stripUndefined(patch as Record<string, unknown>),
        updatedAt: Timestamp.fromDate(new Date()),
      });
      logInfo('Library video updated', { id });
    } catch (error) {
      logError('Failed to update library video', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async deleteVideo(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
      logInfo('Library video deleted', { id });
    } catch (error) {
      logError('Failed to delete library video', error instanceof Error ? error : undefined);
      throw error;
    }
  }
}

export const videoLibraryService = VideoLibraryService.getInstance();
