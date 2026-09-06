import { describe, expect, it } from 'vitest';

import { GOALIE_LOGIN_DOMAIN } from '@/lib/auth/child-account';
import { MAX_SIGNUP_AGE, MIN_SIGNUP_AGE, PARENT_HELD_ACCOUNT_AGE } from '@/lib/auth/signup-policy';
import {
  createChildAccountFormSchema,
  createChildAccountSchema,
  resetChildPasswordSchema,
} from '@/lib/validation/child-account';

/**
 * The schema reads the real clock, so dates are built relative to today rather
 * than hard-coded. Six months past the birthday keeps every case clear of the
 * boundary the signup-policy tests already cover.
 */
function dobForAge(age: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear() - age, now.getMonth() - 6, 15);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const valid = {
  displayName: 'Jake Wilson',
  dateOfBirth: dobForAge(11),
  relationship: 'parent' as const,
  loginMethod: 'handle' as const,
  password: 'Passw0rd',
  consentAccepted: true,
};

interface ParseResult {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}

/** The first message on a given field, or undefined if that field is clean. */
function issueOn(result: ParseResult, field: string): string | undefined {
  if (result.success) return undefined;
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('createChildAccountSchema', () => {
  it('accepts a handle sign-up', () => {
    expect(createChildAccountSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an email sign-up', () => {
    const result = createChildAccountSchema.safeParse({
      ...valid,
      loginMethod: 'email',
      email: 'jake@example.com',
    });
    expect(result.success).toBe(true);
  });

  describe('consent', () => {
    it('refuses an unticked box', () => {
      const result = createChildAccountSchema.safeParse({ ...valid, consentAccepted: false });
      expect(result.success).toBe(false);
      expect(issueOn(result, 'consentAccepted')).toContain('parent or guardian');
    });

    it('refuses a missing box', () => {
      const withoutConsent: Record<string, unknown> = { ...valid };
      delete withoutConsent.consentAccepted;
      expect(createChildAccountSchema.safeParse(withoutConsent).success).toBe(false);
    });
  });

  describe('email', () => {
    it('requires one when the email method is chosen', () => {
      const result = createChildAccountSchema.safeParse({ ...valid, loginMethod: 'email' });
      expect(issueOn(result, 'email')).toContain('no-email option');
    });

    it('rejects a malformed one', () => {
      const result = createChildAccountSchema.safeParse({
        ...valid,
        loginMethod: 'email',
        email: 'jake@',
      });
      expect(issueOn(result, 'email')).toContain('valid email address');
    });

    it('refuses an address on our own goalie domain', () => {
      // Otherwise a parent could claim a handle belonging to someone else's
      // goalie by typing its generated address in.
      const result = createChildAccountSchema.safeParse({
        ...valid,
        loginMethod: 'email',
        email: `jake-a7k2@${GOALIE_LOGIN_DOMAIN}`,
      });
      expect(issueOn(result, 'email')).toContain('not one you can sign up with');
    });

    it('ignores the field entirely when the handle method is chosen', () => {
      const result = createChildAccountSchema.safeParse({ ...valid, email: 'nonsense' });
      expect(result.success).toBe(true);
    });
  });

  describe('date of birth', () => {
    it('rejects an unparseable date', () => {
      const result = createChildAccountSchema.safeParse({ ...valid, dateOfBirth: 'yesterday' });
      expect(issueOn(result, 'dateOfBirth')).toContain('real date of birth');
    });

    it('rejects a date in the future', () => {
      const next = new Date();
      next.setFullYear(next.getFullYear() + 1);
      const result = createChildAccountSchema.safeParse({
        ...valid,
        dateOfBirth: next.toISOString().slice(0, 10),
      });
      expect(issueOn(result, 'dateOfBirth')).toContain('real date of birth');
    });

    it('rejects an age below the floor', () => {
      const result = createChildAccountSchema.safeParse({
        ...valid,
        dateOfBirth: dobForAge(MIN_SIGNUP_AGE - 1),
      });
      expect(issueOn(result, 'dateOfBirth')).toContain('outside');
    });

    it('accepts the floor itself', () => {
      const result = createChildAccountSchema.safeParse({
        ...valid,
        dateOfBirth: dobForAge(MIN_SIGNUP_AGE),
      });
      expect(result.success).toBe(true);
    });

    it('accepts the last age a parent may hold an account for', () => {
      const result = createChildAccountSchema.safeParse({
        ...valid,
        dateOfBirth: dobForAge(PARENT_HELD_ACCOUNT_AGE - 1),
      });
      expect(result.success).toBe(true);
    });

    it('turns an adult away with a route forward, not a dead end', () => {
      // The whole point of the form: nobody consents on an adult's behalf.
      const result = createChildAccountSchema.safeParse({
        ...valid,
        dateOfBirth: dobForAge(PARENT_HELD_ACCOUNT_AGE),
      });
      expect(result.success).toBe(false);
      expect(issueOn(result, 'dateOfBirth')).toContain('sets up their own account');
    });

    it('rejects an implausibly old date', () => {
      const result = createChildAccountSchema.safeParse({
        ...valid,
        dateOfBirth: dobForAge(MAX_SIGNUP_AGE + 1),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('password', () => {
    it('requires length', () => {
      expect(createChildAccountSchema.safeParse({ ...valid, password: 'Pa1' }).success).toBe(false);
    });

    it('requires an uppercase letter, a lowercase letter and a number', () => {
      for (const password of ['password', 'PASSWORD1', 'Password']) {
        expect(createChildAccountSchema.safeParse({ ...valid, password }).success).toBe(false);
      }
    });
  });

  describe('name', () => {
    it('requires two characters', () => {
      expect(createChildAccountSchema.safeParse({ ...valid, displayName: 'J' }).success).toBe(false);
    });

    it('caps the length', () => {
      const result = createChildAccountSchema.safeParse({
        ...valid,
        displayName: 'a'.repeat(51),
      });
      expect(result.success).toBe(false);
    });
  });

  it('rejects an unknown relationship', () => {
    const result = createChildAccountSchema.safeParse({ ...valid, relationship: 'uncle' });
    expect(result.success).toBe(false);
  });
});

describe('createChildAccountFormSchema', () => {
  it('accepts matching passwords', () => {
    const result = createChildAccountFormSchema.safeParse({
      ...valid,
      confirmPassword: valid.password,
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = createChildAccountFormSchema.safeParse({
      ...valid,
      confirmPassword: 'Passw0rdX',
    });
    expect(issueOn(result, 'confirmPassword')).toBe('Passwords do not match');
  });

  it('still applies every shared rule', () => {
    // The form and the route must not drift apart; this is the check that they
    // have not.
    const result = createChildAccountFormSchema.safeParse({
      ...valid,
      confirmPassword: valid.password,
      consentAccepted: false,
    });
    expect(issueOn(result, 'consentAccepted')).toBeDefined();
  });
});

describe('resetChildPasswordSchema', () => {
  it('accepts a password meeting the same rules as sign-up', () => {
    expect(resetChildPasswordSchema.safeParse({ password: 'Passw0rd' }).success).toBe(true);
  });

  it('rejects a weak one', () => {
    expect(resetChildPasswordSchema.safeParse({ password: 'password' }).success).toBe(false);
  });
});
