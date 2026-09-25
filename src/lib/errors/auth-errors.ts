/**
 * Authentication Error System
 *
 * This module provides a comprehensive error handling system for authentication
 * operations with proper typing, categorization, and user-friendly messages.
 */

// Error Types and Enums
export enum AuthErrorCode {
  // Authentication Errors
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  WRONG_PASSWORD = 'wrong_password',
  EMAIL_VERIFICATION_REQUIRED = 'email_verification_required',
  USER_DISABLED = 'user_disabled',
  TOO_MANY_REQUESTS = 'too_many_requests',

  // Registration Errors
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  WEAK_PASSWORD = 'weak_password',
  INVALID_EMAIL = 'invalid_email',

  // System Errors
  NETWORK_ERROR = 'network_error',
  FIRESTORE_PERMISSION_DENIED = 'firestore_permission_denied',
  UNKNOWN_ERROR = 'unknown_error',

  // Profile Errors
  PROFILE_UPDATE_FAILED = 'profile_update_failed',
  USER_NOT_AUTHENTICATED = 'user_not_authenticated',

  // Coach Errors
  INVALID_COACH_CODE = 'invalid_coach_code',

  // Sign-up eligibility
  PARENT_ACCOUNT_REQUIRED = 'parent_account_required',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  operation: string;
  userId?: string;
  email?: string;
  timestamp: Date;
  userAgent?: string;
  additionalData?: Record<string, unknown>;
}

// Base Authentication Error Class
export abstract class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly shouldLog: boolean;

  constructor(
    code: AuthErrorCode,
    message: string,
    userMessage: string,
    context: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isRetryable: boolean = false,
    shouldLog: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.userMessage = userMessage;
    this.context = context;
    this.isRetryable = isRetryable;
    this.shouldLog = shouldLog;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to a safe format for logging
   */
  toLogFormat(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }

  /**
   * Get user-safe error information
   */
  toUserFormat(): { message: string; code: string; isRetryable: boolean } {
    return {
      message: this.userMessage,
      code: this.code,
      isRetryable: this.isRetryable,
    };
  }
}

// Specific Error Classes
export class EmailVerificationRequiredError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.EMAIL_VERIFICATION_REQUIRED,
      'User email is not verified',
      'Email verification required. Please check your inbox and click the verification link before signing in.',
      context,
      ErrorSeverity.LOW,
      false,
      false // Don't log this as it's expected behavior
    );
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.INVALID_CREDENTIALS,
      'Invalid email or password provided',
      'Invalid email or password. Please check your credentials and try again.',
      context,
      ErrorSeverity.LOW,
      false,
      false
    );
  }
}

export class EmailAlreadyExistsError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.EMAIL_ALREADY_EXISTS,
      'Account with this email already exists',
      'An account with this email already exists. Please sign in or use a different email.',
      context,
      ErrorSeverity.LOW,
      false,
      false
    );
  }
}

export class WeakPasswordError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.WEAK_PASSWORD,
      'Password does not meet security requirements',
      'Password is too weak. Please choose a stronger password with at least 8 characters.',
      context,
      ErrorSeverity.LOW,
      false,
      false
    );
  }
}

export class TooManyRequestsError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.TOO_MANY_REQUESTS,
      'Too many authentication attempts',
      'Too many failed attempts. Please wait a few minutes before trying again.',
      context,
      ErrorSeverity.MEDIUM,
      true,
      true
    );
  }
}

export class NetworkError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.NETWORK_ERROR,
      'Network request failed',
      'Network error. Please check your connection and try again.',
      context,
      ErrorSeverity.MEDIUM,
      true,
      true
    );
  }
}

export class UserNotAuthenticatedError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.USER_NOT_AUTHENTICATED,
      'User is not authenticated',
      'You must be signed in to perform this action.',
      context,
      ErrorSeverity.MEDIUM,
      false,
      false
    );
  }
}

export class FirestorePermissionError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.FIRESTORE_PERMISSION_DENIED,
      'Firestore permission denied',
      'Unable to access user data. Please try signing in again.',
      context,
      ErrorSeverity.HIGH,
      false,
      true
    );
  }
}

export class UnknownAuthError extends AuthError {
  constructor(context: ErrorContext, originalError?: Error) {
    super(
      AuthErrorCode.UNKNOWN_ERROR,
      `Unknown authentication error: ${originalError?.message || 'Unknown cause'}`,
      'An unexpected error occurred. Please try again later.',
      {
        ...context,
        additionalData: {
          originalError: originalError?.message,
          originalStack: originalError?.stack,
        },
      },
      ErrorSeverity.HIGH,
      true,
      true
    );
  }
}

export class UserDisabledError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.USER_DISABLED,
      'User account has been disabled',
      'This account has been disabled. Please contact support.',
      context,
      ErrorSeverity.HIGH,
      false,
      true
    );
  }
}

export class InvalidCoachCodeError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.INVALID_COACH_CODE,
      'Invalid coach code provided',
      'Invalid coach code. Please check with your coach and try again.',
      context,
      ErrorSeverity.LOW,
      false,
      false
    );
  }
}

/**
 * A goalie under the parent-held age tried to create an account for themselves.
 *
 * Not a failure and not the goalie's fault, so it is logged at LOW and not
 * retryable: retrying the same form cannot succeed. The sign-up form catches
 * this before registration is attempted and shows the parent path instead —
 * this exists so that any other caller of register() cannot get past the rule.
 */
export class ParentAccountRequiredError extends AuthError {
  constructor(context: ErrorContext) {
    super(
      AuthErrorCode.PARENT_ACCOUNT_REQUIRED,
      'Goalie is under the age at which a parent holds the account',
      'A parent or guardian needs to set this account up. Ask them to sign up as a parent, and the goalie gets their own login inside it.',
      context,
      ErrorSeverity.LOW,
      false,
      false
    );
  }
}

// Firebase Error Code Mapping
const FIREBASE_ERROR_MAPPING: Record<string, new (context: ErrorContext) => AuthError> = {
  // Authentication errors
  'auth/user-not-found': InvalidCredentialsError,
  'auth/wrong-password': InvalidCredentialsError,
  'auth/invalid-email': InvalidCredentialsError,
  'auth/invalid-credential': InvalidCredentialsError, // New Firebase v9+ error code
  'auth/user-disabled': UserDisabledError,
  'auth/too-many-requests': TooManyRequestsError,

  // Registration errors
  'auth/email-already-in-use': EmailAlreadyExistsError,
  'auth/weak-password': WeakPasswordError,

  // Network errors
  'auth/network-request-failed': NetworkError,

  // Firestore errors
  'permission-denied': FirestorePermissionError,
};

/**
 * Factory function to create appropriate error from Firebase error
 */
export function createAuthErrorFromFirebase(
  firebaseError: unknown,
  context: ErrorContext
): AuthError {
  const errorCode = getFirebaseErrorCode(firebaseError);
  const ErrorClass = FIREBASE_ERROR_MAPPING[errorCode];

  if (ErrorClass) {
    return new ErrorClass(context);
  }

  return new UnknownAuthError(context, firebaseError as Error);
}

/**
 * Type guard to check if an error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Extract Firebase error code from error object
 */
function getFirebaseErrorCode(error: unknown): string {
  // Handle Firebase Auth errors
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return code;
  }

  // Handle standard errors that might contain Firebase codes in message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for common Firebase error patterns in message
    if (message.includes('user-not-found') || message.includes('no user record')) {
      return 'auth/user-not-found';
    }
    if (message.includes('wrong-password') || message.includes('invalid password') ||
        message.includes('invalid-credential') || message.includes('invalid credential')) {
      return 'auth/invalid-credential';
    }
    if (message.includes('invalid-email') || message.includes('invalid email')) {
      return 'auth/invalid-email';
    }
    if (message.includes('email-already-in-use')) {
      return 'auth/email-already-in-use';
    }
    if (message.includes('weak-password')) {
      return 'auth/weak-password';
    }
    if (message.includes('too-many-requests')) {
      return 'auth/too-many-requests';
    }
  }

  return 'unknown';
}

/**
 * Utility to create error context
 */
export function createErrorContext(
  operation: string,
  options: Partial<Omit<ErrorContext, 'operation' | 'timestamp'>> = {}
): ErrorContext {
  return {
    operation,
    timestamp: new Date(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    ...options,
  };
}