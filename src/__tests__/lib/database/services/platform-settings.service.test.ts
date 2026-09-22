import { describe, it, expect } from 'vitest';

import { normalizePlatformSettings } from '@/lib/database/services/platform-settings.service';
import { DEFAULT_PLATFORM_SETTINGS } from '@/types/platform-settings';

/**
 * `normalizePlatformSettings` is the only thing standing between the settings form
 * and the stored document, in both directions. These cover the cases that would
 * otherwise put a broken value on screen or in Firestore.
 */
describe('normalizePlatformSettings', () => {
  it('returns the defaults when there is no stored document', () => {
    expect(normalizePlatformSettings(null)).toEqual(DEFAULT_PLATFORM_SETTINGS);
    expect(normalizePlatformSettings(undefined)).toEqual(DEFAULT_PLATFORM_SETTINGS);
    expect(normalizePlatformSettings({})).toEqual(DEFAULT_PLATFORM_SETTINGS);
  });

  it('hands back a fresh object each time, so the shared defaults cannot be edited in place', () => {
    const first = normalizePlatformSettings(null);
    first.content.allowedFileTypes.push('exe');
    first.general.siteName = 'changed';

    const second = normalizePlatformSettings(null);
    expect(second.content.allowedFileTypes).toEqual(DEFAULT_PLATFORM_SETTINGS.content.allowedFileTypes);
    expect(second.general.siteName).toBe(DEFAULT_PLATFORM_SETTINGS.general.siteName);
  });

  it('keeps stored values that are valid', () => {
    const result = normalizePlatformSettings({
      general: { siteName: 'Smarter Goalie', maintenanceMode: true, defaultTimezone: 'America/New_York' },
      security: { sessionTimeout: 48, requireEmailVerification: false },
      content: { allowedFileTypes: ['mp4', 'mov'] },
    });

    expect(result.general.siteName).toBe('Smarter Goalie');
    expect(result.general.maintenanceMode).toBe(true);
    expect(result.general.defaultTimezone).toBe('America/New_York');
    expect(result.security.sessionTimeout).toBe(48);
    expect(result.security.requireEmailVerification).toBe(false);
    expect(result.content.allowedFileTypes).toEqual(['mp4', 'mov']);
  });

  it('falls back on a field the stored document is missing', () => {
    const result = normalizePlatformSettings({ general: { siteName: 'Smarter Goalie' } });

    expect(result.general.siteName).toBe('Smarter Goalie');
    expect(result.general.contactEmail).toBe(DEFAULT_PLATFORM_SETTINGS.general.contactEmail);
    expect(result.notifications).toEqual(DEFAULT_PLATFORM_SETTINGS.notifications);
  });

  // Clearing a number input yields NaN. Without this it would reach Firestore and
  // come back as the value of a controlled input.
  it('replaces NaN and other unusable numbers with the default', () => {
    const result = normalizePlatformSettings({
      content: { maxQuizQuestions: NaN, maxFileSize: 'not a number' },
      performance: { cacheDuration: null },
    });

    expect(result.content.maxQuizQuestions).toBe(DEFAULT_PLATFORM_SETTINGS.content.maxQuizQuestions);
    expect(result.content.maxFileSize).toBe(DEFAULT_PLATFORM_SETTINGS.content.maxFileSize);
    expect(result.performance.cacheDuration).toBe(DEFAULT_PLATFORM_SETTINGS.performance.cacheDuration);
  });

  it('clamps numbers to the range the form advertises and rounds them to whole numbers', () => {
    const result = normalizePlatformSettings({
      security: { sessionTimeout: 9999, maxLoginAttempts: 1 },
      performance: { rateLimitRequests: 100.6 },
    });

    expect(result.security.sessionTimeout).toBe(168);
    expect(result.security.maxLoginAttempts).toBe(3);
    expect(result.performance.rateLimitRequests).toBe(101);
  });

  it('rejects a language or timezone the dropdown cannot show', () => {
    const result = normalizePlatformSettings({
      general: { defaultLanguage: 'kl', defaultTimezone: 'Mars/Olympus' },
    });

    expect(result.general.defaultLanguage).toBe('en');
    expect(result.general.defaultTimezone).toBe('UTC');
  });

  it('cleans the file type list and treats an empty one as unset', () => {
    expect(normalizePlatformSettings({ content: { allowedFileTypes: [' jpg ', 'png', 'png', 42] } }).content.allowedFileTypes)
      .toEqual(['jpg', 'png']);
    expect(normalizePlatformSettings({ content: { allowedFileTypes: [] } }).content.allowedFileTypes)
      .toEqual(DEFAULT_PLATFORM_SETTINGS.content.allowedFileTypes);
  });

  it('keeps a blank description but not a blank site name', () => {
    const result = normalizePlatformSettings({ general: { siteDescription: '', siteName: '   ' } });

    expect(result.general.siteDescription).toBe('');
    expect(result.general.siteName).toBe(DEFAULT_PLATFORM_SETTINGS.general.siteName);
  });
});
