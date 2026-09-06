import { z } from 'zod';

import { isLoginHandle } from '@/lib/auth/child-account';
import {
  MAX_SIGNUP_AGE,
  MIN_SIGNUP_AGE,
  calculateAge,
  parseDateOfBirth,
} from '@/lib/auth/signup-policy';

export const loginSchema = z.object({
  /**
   * An email address, or the short handle of a goalie whose parent holds their
   * account (item 6c). Still called `email` because that is what it is for
   * everyone but a handful of young goalies, and renaming it would touch every
   * caller for the sake of the minority case.
   *
   * `isLoginHandle` is strict — name, hyphen, exactly four characters — so a
   * mistyped address still gets "please enter a valid email address" rather
   * than being taken for a handle and failing later as "no such account".
   */
  email: z
    .string()
    .min(1, 'Email is required')
    .refine(
      (value) => isLoginHandle(value) || z.string().email().safeParse(value.trim()).success,
      'Please enter a valid email address'
    ),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    displayName: z
      .string()
      .min(1, 'Name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters'),
    role: z.enum(['student', 'admin', 'coach', 'parent']).default('student'),
    /**
     * Date of birth as the browser date input gives it: `YYYY-MM-DD`.
     *
     * Held as a string rather than a Date because that is what the form
     * produces and what a half-typed field looks like mid-entry. It is parsed
     * into a real date by the refinements below, and parsed again on the way
     * to Firestore, rather than being trusted anywhere in between.
     *
     * Required for goalies and optional for everyone else — a parent or coach
     * signing themselves up is an adult by definition, and asking for a
     * birthday nobody reads would be collecting it for nothing.
     */
    dateOfBirth: z.string().optional(),
    workflowType: z.enum(['automated', 'custom']).optional().default('automated'),
    coachCode: z.string().optional(),
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, 'You must agree to the terms and conditions'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      // Only goalies are asked for a birthday. Nobody else is held to one.
      if (data.role !== 'student') return true;
      return !!data.dateOfBirth && data.dateOfBirth.trim().length > 0;
    },
    {
      message: 'Date of birth is required',
      path: ['dateOfBirth'],
    }
  )
  .refine(
    (data) => {
      if (data.role !== 'student' || !data.dateOfBirth) return true;
      // Catches malformed input and dates that only look real, such as
      // 30 February, which JavaScript would otherwise roll forward into March.
      const dob = parseDateOfBirth(data.dateOfBirth);
      return dob !== null && dob.getTime() <= Date.now();
    },
    {
      message: 'Please enter a real date of birth',
      path: ['dateOfBirth'],
    }
  )
  .refine(
    (data) => {
      if (data.role !== 'student' || !data.dateOfBirth) return true;
      const dob = parseDateOfBirth(data.dateOfBirth);
      // A malformed date already failed the refinement above. Passing it here
      // avoids showing two errors for one mistake.
      if (!dob) return true;
      const age = calculateAge(dob);
      return age >= MIN_SIGNUP_AGE && age <= MAX_SIGNUP_AGE;
    },
    {
      message: `Please check the year — that works out to an age outside ${MIN_SIGNUP_AGE}-${MAX_SIGNUP_AGE}.`,
      path: ['dateOfBirth'],
    }
  )
  .refine(
    (data) => {
      // Coach code is required for custom workflow students
      if (data.role === 'student' && data.workflowType === 'custom') {
        return !!data.coachCode && data.coachCode.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Coach code is required for coach-guided learning',
      path: ['coachCode'],
    }
  )
  .refine(
    (data) => {
      // Validate coach code format if provided
      if (data.coachCode && data.coachCode.trim().length > 0) {
        // Format: LASTNAME-XXXX (uppercase letters, hyphen, 4 alphanumeric)
        const pattern = /^[A-Z]+-[A-Z0-9]{4}$/;
        return pattern.test(data.coachCode.toUpperCase());
      }
      return true;
    },
    {
      message: 'Invalid coach code format. Expected format: LASTNAME-XXXX (e.g., SMITH-7K3M)',
      path: ['coachCode'],
    }
  );

export const passwordResetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),
  photoURL: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      notifications: z
        .object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
          quiz: z.boolean().optional(),
          progress: z.boolean().optional(),
        })
        .optional(),
      privacy: z
        .object({
          profileVisible: z.boolean().optional(),
          progressVisible: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;