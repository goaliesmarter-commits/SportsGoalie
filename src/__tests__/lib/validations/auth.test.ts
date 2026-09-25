import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  passwordResetSchema,
  profileUpdateSchema,
  type LoginFormData,
  type RegisterFormData,
  type PasswordResetFormData,
  type ProfileUpdateFormData,
} from '@/lib/validation/auth';

describe('Authentication Validation Schemas', () => {
  describe('Login Schema', () => {
    it('should validate correct login data', () => {
      const validData: LoginFormData = {
        email: 'user@example.com',
        password: 'password123',
        rememberMe: true,
      };

      const result = loginSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate without optional rememberMe field', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBeUndefined();
      }
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('should reject password shorter than 6 characters', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '12345',
      };

      const result = loginSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 6 characters');
      }
    });
  });

  describe('Register Schema', () => {
    it('should validate correct registration data', () => {
      const validData: RegisterFormData = {
        email: 'newuser@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        displayName: 'John Doe',
        role: 'student',
        // A goalie is asked for a birthday from 6 September 2026 (item 6b).
        dateOfBirth: '2005-07-14',
        workflowType: 'automated',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should default role to student', () => {
      const dataWithoutRole = {
        email: 'newuser@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        displayName: 'John Doe',
        // Carried so this stays a test of the role default. Without a role the
        // schema defaults to student, and a student is asked for a birthday.
        dateOfBirth: '2005-07-14',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(dataWithoutRole);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('student');
      }
    });

    it('should reject weak password without uppercase', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        displayName: 'John Doe',
        role: 'student',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase letter');
      }
    });

    it('should reject weak password without lowercase', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'PASSWORD123',
        confirmPassword: 'PASSWORD123',
        displayName: 'John Doe',
        role: 'student',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase letter');
      }
    });

    it('should reject weak password without number', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'Password',
        confirmPassword: 'Password',
        displayName: 'John Doe',
        role: 'student',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('one number');
      }
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
        displayName: 'John Doe',
        role: 'student',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        const mismatchError = result.error.issues.find(
          (issue) => issue.message === 'Passwords do not match'
        );
        expect(mismatchError).toBeDefined();
        expect(mismatchError?.path).toEqual(['confirmPassword']);
      }
    });

    it('should reject empty display name', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        displayName: '',
        role: 'student',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required');
      }
    });

    it('should reject display name shorter than 2 characters', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        displayName: 'J',
        role: 'student',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be at least 2 characters');
      }
    });

    it('should reject display name longer than 50 characters', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        displayName: 'A'.repeat(51),
        role: 'student',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name cannot exceed 50 characters');
      }
    });

    it('should reject invalid role', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        displayName: 'John Doe',
        role: 'invalid-role',
        agreeToTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject when terms are not agreed', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        displayName: 'John Doe',
        role: 'student',
        agreeToTerms: false,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('You must agree to the terms and conditions');
      }
    });

    // Date of birth (item 6b). Asked of goalies only, and only ever as a real
    // calendar date — the age check downstream is only as good as this.
    describe('Date of birth', () => {
      const goalie = (dateOfBirth?: string) => ({
        email: 'newuser@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        displayName: 'John Doe',
        role: 'student' as const,
        workflowType: 'automated' as const,
        agreeToTerms: true,
        ...(dateOfBirth !== undefined && { dateOfBirth }),
      });

      const dobIssue = (result: ReturnType<typeof registerSchema.safeParse>) =>
        result.success
          ? undefined
          : result.error.issues.find((i) => i.path[0] === 'dateOfBirth')?.message;

      it('should require a date of birth from a goalie', () => {
        const result = registerSchema.safeParse(goalie());
        expect(result.success).toBe(false);
        expect(dobIssue(result)).toBe('Date of birth is required');
      });

      it('should reject an empty date of birth from a goalie', () => {
        const result = registerSchema.safeParse(goalie('   '));
        expect(result.success).toBe(false);
        expect(dobIssue(result)).toBe('Date of birth is required');
      });

      it('should not ask a parent for a date of birth', () => {
        const result = registerSchema.safeParse({ ...goalie(), role: 'parent' });
        expect(result.success).toBe(true);
      });

      it('should not ask a coach for a date of birth', () => {
        const result = registerSchema.safeParse({ ...goalie(), role: 'coach' });
        expect(result.success).toBe(true);
      });

      it('should accept a real date of birth', () => {
        const result = registerSchema.safeParse(goalie('2005-07-14'));
        expect(result.success).toBe(true);
      });

      it('should reject a date that does not exist', () => {
        // 2011 was not a leap year. Left to the Date constructor this would
        // quietly become 1 March.
        const result = registerSchema.safeParse(goalie('2011-02-29'));
        expect(result.success).toBe(false);
        expect(dobIssue(result)).toBe('Please enter a real date of birth');
      });

      it('should reject a malformed date', () => {
        const result = registerSchema.safeParse(goalie('14/07/2005'));
        expect(result.success).toBe(false);
        expect(dobIssue(result)).toBe('Please enter a real date of birth');
      });

      it('should reject a date of birth in the future', () => {
        const nextYear = new Date().getFullYear() + 1;
        const result = registerSchema.safeParse(goalie(`${nextYear}-01-01`));
        expect(result.success).toBe(false);
        expect(dobIssue(result)).toBe('Please enter a real date of birth');
      });

      it('should reject an age below the minimum', () => {
        const thisYear = new Date().getFullYear();
        const result = registerSchema.safeParse(goalie(`${thisYear - 2}-01-01`));
        expect(result.success).toBe(false);
        expect(dobIssue(result)).toContain('outside');
      });

      it('should reject an age above the maximum', () => {
        const result = registerSchema.safeParse(goalie('1850-01-01'));
        expect(result.success).toBe(false);
        expect(dobIssue(result)).toContain('outside');
      });

      it('should report one error, not two, for a malformed date', () => {
        const result = registerSchema.safeParse(goalie('not-a-date'));
        expect(result.success).toBe(false);
        if (!result.success) {
          const dobIssues = result.error.issues.filter((i) => i.path[0] === 'dateOfBirth');
          expect(dobIssues).toHaveLength(1);
        }
      });
    });

  });

  describe('Password Reset Schema', () => {
    it('should validate correct email', () => {
      const validData: PasswordResetFormData = {
        email: 'user@example.com',
      };

      const result = passwordResetSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
      };

      const result = passwordResetSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = passwordResetSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });
  });

  describe('Profile Update Schema', () => {
    it('should validate correct profile data', () => {
      const validData: ProfileUpdateFormData = {
        displayName: 'Updated Name',
        photoURL: 'https://example.com/photo.jpg',
        preferences: {
          theme: 'dark',
          notifications: {
            email: true,
            push: false,
            quiz: true,
            progress: false,
          },
          privacy: {
            profileVisible: true,
            progressVisible: false,
          },
        },
      };

      const result = profileUpdateSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate with minimal data', () => {
      const validData = {
        displayName: 'Updated Name',
      };

      const result = profileUpdateSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe('Updated Name');
        expect(result.data.photoURL).toBeUndefined();
        expect(result.data.preferences).toBeUndefined();
      }
    });

    it('should validate with empty photoURL', () => {
      const validData = {
        displayName: 'Updated Name',
        photoURL: '',
      };

      const result = profileUpdateSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.photoURL).toBe('');
      }
    });

    it('should validate with no data (all optional)', () => {
      const validData = {};

      const result = profileUpdateSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject display name shorter than 2 characters', () => {
      const invalidData = {
        displayName: 'J',
      };

      const result = profileUpdateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be at least 2 characters');
      }
    });

    it('should reject display name longer than 50 characters', () => {
      const invalidData = {
        displayName: 'A'.repeat(51),
      };

      const result = profileUpdateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name cannot exceed 50 characters');
      }
    });

    it('should reject invalid photoURL', () => {
      const invalidData = {
        photoURL: 'not-a-valid-url',
      };

      const result = profileUpdateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid URL');
      }
    });

    it('should reject invalid theme preference', () => {
      const invalidData = {
        preferences: {
          theme: 'invalid-theme',
        },
      };

      const result = profileUpdateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should validate partial preferences', () => {
      const validData = {
        preferences: {
          notifications: {
            email: true,
            push: false,
            quiz: true,
            progress: false,
          },
        },
      };

      const result = profileUpdateSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preferences?.theme).toBeUndefined();
        expect(result.data.preferences?.notifications?.email).toBe(true);
      }
    });

    it('should validate partial notification preferences', () => {
      const validData = {
        preferences: {
          notifications: {
            email: true,
            // Other notification preferences omitted
          },
        },
      };

      const result = profileUpdateSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate partial privacy preferences', () => {
      const validData = {
        preferences: {
          privacy: {
            profileVisible: false,
            // progressVisible omitted
          },
        },
      };

      const result = profileUpdateSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });

  describe('Type Inference', () => {
    it('should correctly infer LoginFormData type', () => {
      const data: LoginFormData = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      // This test ensures type compatibility
      expect(data.email).toBe('test@example.com');
      expect(data.password).toBe('password123');
      expect(data.rememberMe).toBe(true);
    });

    it('should correctly infer RegisterFormData type', () => {
      const data: RegisterFormData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        displayName: 'Test User',
        role: 'student',
        workflowType: 'automated',
        agreeToTerms: true,
      };

      // This test ensures type compatibility
      expect(data.role).toBe('student');
      expect(data.agreeToTerms).toBe(true);
    });

    it('should correctly infer PasswordResetFormData type', () => {
      const data: PasswordResetFormData = {
        email: 'test@example.com',
      };

      // This test ensures type compatibility
      expect(data.email).toBe('test@example.com');
    });

    it('should correctly infer ProfileUpdateFormData type', () => {
      const data: ProfileUpdateFormData = {
        displayName: 'Updated Name',
        photoURL: 'https://example.com/photo.jpg',
        preferences: {
          theme: 'dark',
          notifications: {
            email: true,
            push: false,
            quiz: true,
            progress: false,
          },
          privacy: {
            profileVisible: true,
            progressVisible: false,
          },
        },
      };

      // This test ensures type compatibility
      expect(data.preferences?.theme).toBe('dark');
      expect(data.preferences?.notifications?.email).toBe(true);
    });
  });
});