import { z } from 'zod';

import { GOALIE_LOGIN_DOMAIN } from '@/lib/auth/child-account';
import {
  MAX_SIGNUP_AGE,
  MIN_SIGNUP_AGE,
  PARENT_HELD_ACCOUNT_AGE,
  calculateAge,
  parseDateOfBirth,
} from '@/lib/auth/signup-policy';

/**
 * What a parent must supply to create a goalie account (item 6c).
 *
 * One schema, used by the form and again by the API route that the form posts
 * to. Not for tidiness — because the route is the only thing standing between
 * a request and a real login, and a rule enforced only in the browser is not
 * enforced.
 */

/** Password rules, identical to the ones on the public sign-up form. */
const passwordField = z
  .string()
  .min(1, 'Password is required')
  .min(6, 'Password must be at least 6 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const createChildAccountObject = z.object({
  displayName: z
    .string()
    .min(1, "Goalie's name is required")
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  relationship: z.enum(['parent', 'guardian', 'other']),
  /**
   * How the goalie signs in. 'handle' is for a goalie with no email address of
   * their own, which below about twelve is the normal case rather than the
   * exception.
   */
  loginMethod: z.enum(['email', 'handle']),
  /** Only read when `loginMethod` is 'email'. */
  email: z.string().optional(),
  password: passwordField,
  /**
   * The consent tickbox. Michael's model is that the parent consents and the
   * child does the work, so this is the whole legal basis for the account
   * existing — which is why it is a hard requirement and not a preference.
   */
  consentAccepted: z.boolean(),
});

type CreateChildAccountShape = z.infer<typeof createChildAccountObject>;

/**
 * The cross-field rules. Written once and applied to both schemas below, so
 * the form and the route cannot drift apart as the rules change.
 */
function refineChildAccount(data: CreateChildAccountShape, ctx: z.RefinementCtx): void {
  if (data.consentAccepted !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'You need to confirm you are the parent or guardian and agree on their behalf',
      path: ['consentAccepted'],
    });
  }

  if (data.loginMethod === 'email') {
    const email = data.email?.trim() ?? '';
    if (!email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the goalie's email address, or choose the no-email option",
        path: ['email'],
      });
    } else if (!z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid email address',
        path: ['email'],
      });
    } else if (email.toLowerCase().endsWith(`@${GOALIE_LOGIN_DOMAIN}`)) {
      // Addresses on this domain are ours to hand out, not to accept. Letting
      // one be typed in would allow a parent to claim a handle belonging to
      // somebody else's goalie.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'That address is not one you can sign up with',
        path: ['email'],
      });
    }
  }

  const dob = parseDateOfBirth(data.dateOfBirth);
  if (!dob) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please enter a real date of birth',
      path: ['dateOfBirth'],
    });
    return;
  }

  if (dob.getTime() > Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please enter a real date of birth',
      path: ['dateOfBirth'],
    });
    return;
  }

  const age = calculateAge(dob);

  if (age < MIN_SIGNUP_AGE || age > MAX_SIGNUP_AGE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Please check the year — that works out to an age outside ${MIN_SIGNUP_AGE}-${MAX_SIGNUP_AGE}.`,
      path: ['dateOfBirth'],
    });
    return;
  }

  // The upper bound is the point of this form. An adult cannot have someone
  // else consent for them, so at PARENT_HELD_ACCOUNT_AGE and over the goalie
  // has to set the account up themselves.
  if (age >= PARENT_HELD_ACCOUNT_AGE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `At ${PARENT_HELD_ACCOUNT_AGE} and over the goalie sets up their own account — get in touch and we will send them an invite link.`,
      path: ['dateOfBirth'],
    });
  }
}

/** What the API route accepts. */
export const createChildAccountSchema = createChildAccountObject.superRefine(refineChildAccount);

/**
 * What the form validates. Identical plus the confirm-password box, which the
 * route has no use for — by the time a request is sent, the two either matched
 * or the form never let it go.
 */
export const createChildAccountFormSchema = createChildAccountObject
  .extend({ confirmPassword: z.string().min(1, 'Please confirm the password') })
  .superRefine((data, ctx) => {
    refineChildAccount(data, ctx);
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  });

export type CreateChildAccountData = z.infer<typeof createChildAccountSchema>;
export type CreateChildAccountFormData = z.infer<typeof createChildAccountFormSchema>;

/** What a parent may change on a goalie account they hold. */
export const resetChildPasswordSchema = z.object({
  password: passwordField,
});
