/**
 * Platform settings service — loads and saves the admin System Settings screen.
 *
 * The whole screen is one Firestore document, `app_settings/platform`, so a load
 * is a single `getDoc` and a save is a single `setDoc`. No query, no index, and
 * nothing outside the admin area reads it, so this adds no work to any page a
 * goalie or parent visits.
 *
 * A fixed document id sits alongside the generated-id documents the seeder writes
 * to the same collection. `app_settings` is already admin-only for read and write
 * in `firestore.rules`, so this needs no rules change and no deploy.
 *
 * Everything that comes out of Firestore goes through `normalizePlatformSettings`
 * before it reaches the form, and everything on its way in goes through the same
 * function. That is deliberate: a number input produces NaN the moment its field
 * is cleared, and a NaN — or a hand-edited document, or a field added to the shape
 * after a document was written — must never reach a controlled input.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_LANGUAGES,
  PLATFORM_SETTING_RANGES,
  PLATFORM_TIMEZONES,
  type PlatformSettings,
} from '@/types/platform-settings';
import type { ApiResponse } from '@/types';

const COLLECTION = 'app_settings';
const DOCUMENT_ID = 'platform';

/** Generous caps that keep a pasted wall of text from bloating the document. */
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 320;
const MAX_FILE_TYPES = 50;
const MAX_FILE_TYPE_LENGTH = 16;

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date() };
}

function fail<T>(code: string, message: string, details?: unknown): ApiResponse<T> {
  return { success: false, error: { code, message, details }, timestamp: new Date() };
}

function text(value: unknown, fallback: string, maxLength: number, allowEmpty = false): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed && !allowEmpty) return fallback;
  return trimmed.slice(0, maxLength);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value: unknown, fallback: number, range: { min: number; max: number }): number {
  // Deliberately narrow. Number() turns null, false, '' and [] into 0, which would
  // then clamp to the bottom of the range and look like a real choice the admin made.
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(range.max, Math.max(range.min, Math.round(parsed)));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function fileTypes(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const cleaned = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim().slice(0, MAX_FILE_TYPE_LENGTH))
    .filter(Boolean);
  // An empty list would silently block every upload, so treat it as unset.
  return cleaned.length > 0 ? [...new Set(cleaned)].slice(0, MAX_FILE_TYPES) : [...fallback];
}

/**
 * Coerces an arbitrary object into a complete, in-range `PlatformSettings`.
 * Any field that is missing or unusable falls back to its default, so the result
 * is always safe to hand straight to the form.
 */
export function normalizePlatformSettings(raw: unknown): PlatformSettings {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const section = (key: string): Record<string, unknown> => {
    const value = source[key];
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  };

  const defaults = DEFAULT_PLATFORM_SETTINGS;
  const ranges = PLATFORM_SETTING_RANGES;
  const general = section('general');
  const content = section('content');
  const security = section('security');
  const notifications = section('notifications');
  const performance = section('performance');

  return {
    general: {
      siteName: text(general.siteName, defaults.general.siteName, MAX_NAME_LENGTH),
      siteDescription: text(general.siteDescription, defaults.general.siteDescription, MAX_DESCRIPTION_LENGTH, true),
      contactEmail: text(general.contactEmail, defaults.general.contactEmail, MAX_EMAIL_LENGTH, true),
      supportEmail: text(general.supportEmail, defaults.general.supportEmail, MAX_EMAIL_LENGTH, true),
      defaultLanguage: oneOf(general.defaultLanguage, PLATFORM_LANGUAGES, 'en'),
      defaultTimezone: oneOf(general.defaultTimezone, PLATFORM_TIMEZONES, 'UTC'),
      maintenanceMode: bool(general.maintenanceMode, defaults.general.maintenanceMode),
      registrationEnabled: bool(general.registrationEnabled, defaults.general.registrationEnabled),
    },
    content: {
      autoApproval: bool(content.autoApproval, defaults.content.autoApproval),
      maxQuizQuestions: num(content.maxQuizQuestions, defaults.content.maxQuizQuestions, ranges.content.maxQuizQuestions),
      maxFileSize: num(content.maxFileSize, defaults.content.maxFileSize, ranges.content.maxFileSize),
      allowedFileTypes: fileTypes(content.allowedFileTypes, defaults.content.allowedFileTypes),
      contentRetentionDays: num(content.contentRetentionDays, defaults.content.contentRetentionDays, ranges.content.contentRetentionDays),
    },
    security: {
      sessionTimeout: num(security.sessionTimeout, defaults.security.sessionTimeout, ranges.security.sessionTimeout),
      maxLoginAttempts: num(security.maxLoginAttempts, defaults.security.maxLoginAttempts, ranges.security.maxLoginAttempts),
      requireEmailVerification: bool(security.requireEmailVerification, defaults.security.requireEmailVerification),
      enforceStrongPasswords: bool(security.enforceStrongPasswords, defaults.security.enforceStrongPasswords),
      enableTwoFactor: bool(security.enableTwoFactor, defaults.security.enableTwoFactor),
    },
    notifications: {
      emailNotifications: bool(notifications.emailNotifications, defaults.notifications.emailNotifications),
      pushNotifications: bool(notifications.pushNotifications, defaults.notifications.pushNotifications),
      adminAlerts: bool(notifications.adminAlerts, defaults.notifications.adminAlerts),
      userRegistrationAlert: bool(notifications.userRegistrationAlert, defaults.notifications.userRegistrationAlert),
      contentModerationAlert: bool(notifications.contentModerationAlert, defaults.notifications.contentModerationAlert),
      systemHealthAlert: bool(notifications.systemHealthAlert, defaults.notifications.systemHealthAlert),
    },
    performance: {
      cacheDuration: num(performance.cacheDuration, defaults.performance.cacheDuration, ranges.performance.cacheDuration),
      rateLimitRequests: num(performance.rateLimitRequests, defaults.performance.rateLimitRequests, ranges.performance.rateLimitRequests),
      rateLimitWindow: num(performance.rateLimitWindow, defaults.performance.rateLimitWindow, ranges.performance.rateLimitWindow),
      enableCompression: bool(performance.enableCompression, defaults.performance.enableCompression),
      enableCDN: bool(performance.enableCDN, defaults.performance.enableCDN),
    },
  };
}

export class PlatformSettingsService {
  /**
   * Reads the saved settings. A site that has never saved has no document, which
   * is not an error — it just means the defaults are still in force.
   */
  async getSettings(): Promise<ApiResponse<PlatformSettings>> {
    try {
      const snapshot = await getDoc(doc(db, COLLECTION, DOCUMENT_ID));
      if (!snapshot.exists()) {
        return ok(normalizePlatformSettings(null));
      }
      return ok(normalizePlatformSettings(snapshot.data()));
    } catch (error) {
      logger.error('Failed to load platform settings', 'PlatformSettingsService', error);
      return fail('platform-settings/load-failed', 'Could not load settings.', error);
    }
  }

  /**
   * Writes the whole document. The screen always edits a complete settings object,
   * so a full overwrite is the honest operation — a merge would leave a value the
   * admin changed away from sitting in the document forever.
   *
   * Returns the normalized settings so the screen can show exactly what was stored
   * rather than what was typed, in the rare case a value had to be clamped.
   */
  async saveSettings(settings: PlatformSettings, updatedBy: string): Promise<ApiResponse<PlatformSettings>> {
    const normalized = normalizePlatformSettings(settings);
    try {
      await setDoc(doc(db, COLLECTION, DOCUMENT_ID), {
        ...normalized,
        updatedAt: serverTimestamp(),
        updatedBy,
      });
      return ok(normalized);
    } catch (error) {
      logger.error('Failed to save platform settings', 'PlatformSettingsService', error);
      return fail('platform-settings/save-failed', 'Could not save settings.', error);
    }
  }
}

export const platformSettingsService = new PlatformSettingsService();
