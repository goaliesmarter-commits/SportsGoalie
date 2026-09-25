/**
 * Platform settings — the values behind the admin System Settings screen.
 *
 * One document, `app_settings/platform`. The shape lives here rather than in the
 * page so the screen and the service that persists it can never drift apart, and
 * so the defaults below are the single answer to "what does a fresh install look
 * like" — the initial state, the Reset button, and the fallback for any field a
 * stored document happens to be missing all read from this one object.
 *
 * Separate from `AppSettings` in `./index`, which is the seeder's older shape and
 * is written with generated ids. Nothing reads both.
 */

export interface PlatformSettings {
  general: {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    supportEmail: string;
    defaultLanguage: string;
    defaultTimezone: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
  };
  content: {
    autoApproval: boolean;
    maxQuizQuestions: number;
    maxFileSize: number;
    allowedFileTypes: string[];
    contentRetentionDays: number;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    requireEmailVerification: boolean;
    enforceStrongPasswords: boolean;
    enableTwoFactor: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    adminAlerts: boolean;
    userRegistrationAlert: boolean;
    contentModerationAlert: boolean;
    systemHealthAlert: boolean;
  };
  performance: {
    cacheDuration: number;
    rateLimitRequests: number;
    rateLimitWindow: number;
    enableCompression: boolean;
    enableCDN: boolean;
  };
}

export type PlatformSettingsSection = keyof PlatformSettings;

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  general: {
    siteName: 'SmarterGoalie',
    siteDescription: 'A modern sports learning platform',
    contactEmail: 'contact@sportscoach.com',
    supportEmail: 'support@sportscoach.com',
    defaultLanguage: 'en',
    defaultTimezone: 'UTC',
    maintenanceMode: false,
    registrationEnabled: true,
  },
  content: {
    autoApproval: false,
    maxQuizQuestions: 50,
    maxFileSize: 10,
    allowedFileTypes: ['jpg', 'png', 'pdf', 'mp4'],
    contentRetentionDays: 365,
  },
  security: {
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    requireEmailVerification: true,
    enforceStrongPasswords: true,
    enableTwoFactor: false,
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: false,
    adminAlerts: true,
    userRegistrationAlert: true,
    contentModerationAlert: true,
    systemHealthAlert: true,
  },
  performance: {
    cacheDuration: 300,
    rateLimitRequests: 100,
    rateLimitWindow: 900,
    enableCompression: true,
    enableCDN: false,
  },
};

/**
 * Allowed ranges for the numeric fields, matching the min/max on the inputs.
 * Kept here so the clamp applied before writing and the clamp applied after
 * reading are the same numbers as the ones the form advertises.
 */
export const PLATFORM_SETTING_RANGES = {
  content: {
    maxQuizQuestions: { min: 1, max: 100 },
    maxFileSize: { min: 1, max: 100 },
    contentRetentionDays: { min: 30, max: 3650 },
  },
  security: {
    sessionTimeout: { min: 1, max: 168 },
    maxLoginAttempts: { min: 3, max: 10 },
  },
  performance: {
    cacheDuration: { min: 60, max: 3600 },
    rateLimitRequests: { min: 10, max: 1000 },
    rateLimitWindow: { min: 60, max: 3600 },
  },
} as const;

/** The options the two dropdowns offer. A stored value outside these would render blank. */
export const PLATFORM_LANGUAGES = ['en', 'es', 'fr', 'de'] as const;
export const PLATFORM_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
] as const;
