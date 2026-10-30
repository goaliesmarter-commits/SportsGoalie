import { NextRequest } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Note: This file is used by middleware which runs on Edge Runtime
// We cannot use Firebase Admin SDK here as it doesn't work on Edge
// Individual API routes can use adminAuth for server-side verification

/**
 * Server-side authentication and authorization utilities
 * These functions provide secure, server-side validation of user roles and permissions
 */

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: 'admin' | 'student';
  verified: boolean;
}

export interface ValidationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Validates Firebase ID token on the server side
 * @param idToken - Firebase ID token from client
 * @returns Promise<ValidationResult>
 */
export async function validateFirebaseToken(idToken: string): Promise<ValidationResult> {
  try {
    // Note: We decode the JWT but don't verify signature here since we're on Edge Runtime
    // Individual API routes should use Firebase Admin SDK for proper verification
    // This is just for middleware-level basic validation
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

    if (!payload) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
        },
      };
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return {
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
        },
      };
    }

    const decodedToken = payload;

    if (!decodedToken) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token',
        },
      };
    }

    // Check if email is verified
    if (!decodedToken.email_verified) {
      return {
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email address must be verified to access this resource',
        },
      };
    }

    // Get user role from custom claims (set by admin)
    const role = decodedToken.role as 'admin' | 'student' || 'student';

    const user: AuthenticatedUser = {
      uid: decodedToken.uid,
      email: decodedToken.email!,
      role,
      verified: decodedToken.email_verified,
    };

    logger.debug('Token validated successfully', 'ServerAuth', {
      uid: user.uid,
      role: user.role
    });

    return {
      success: true,
      user,
    };
  } catch (error) {
    logger.error('Token validation failed', 'ServerAuth', error);
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate authentication token',
      },
    };
  }
}

/**
 * Extracts and validates authentication from Next.js request
 * @param request - Next.js request object
 * @returns Promise<ValidationResult>
 */
export async function validateRequestAuth(request: NextRequest): Promise<ValidationResult> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return {
        success: false,
        error: {
          code: 'MISSING_AUTH_HEADER',
          message: 'Authorization header is required',
        },
      };
    }

    // Extract Bearer token
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      return {
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
        },
      };
    }

    return await validateFirebaseToken(token);
  } catch (error) {
    logger.error('Request auth validation failed', 'ServerAuth', error);
    return {
      success: false,
      error: {
        code: 'REQUEST_VALIDATION_ERROR',
        message: 'Failed to validate request authentication',
      },
    };
  }
}

/**
 * Validates that the authenticated user has admin role
 * @param user - Authenticated user object
 * @returns boolean
 */
export function validateAdminRole(user: AuthenticatedUser): boolean {
  if (user.role !== 'admin') {
    logger.warn('Admin access denied', 'ServerAuth', {
      uid: user.uid,
      role: user.role
    });
    return false;
  }

  logger.debug('Admin access granted', 'ServerAuth', { uid: user.uid });
  return true;
}

/**
 * Validates that the authenticated user can access a specific resource
 * @param user - Authenticated user object
 * @param resourceOwnerId - ID of the user who owns the resource
 * @param requireAdmin - Whether admin access is required
 * @returns boolean
 */
export function validateResourceAccess(
  user: AuthenticatedUser,
  resourceOwnerId: string,
  requireAdmin: boolean = false
): boolean {
  // Admin can access any resource
  if (user.role === 'admin') {
    return true;
  }

  // If admin is required but user is not admin
  if (requireAdmin) {
    logger.warn('Admin access required but user is not admin', 'ServerAuth', {
      uid: user.uid,
      role: user.role
    });
    return false;
  }

  // Users can only access their own resources
  const hasAccess = user.uid === resourceOwnerId;

  if (!hasAccess) {
    logger.warn('Resource access denied', 'ServerAuth', {
      uid: user.uid,
      resourceOwnerId
    });
  }

  return hasAccess;
}

/**
 * Middleware helper for protecting API routes
 * @param request - Next.js request object
 * @param requireAdmin - Whether admin role is required
 * @returns Promise<ValidationResult>
 */
export async function protectApiRoute(
  request: NextRequest,
  requireAdmin: boolean = false
): Promise<ValidationResult> {
  const authResult = await validateRequestAuth(request);

  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  if (requireAdmin && !validateAdminRole(authResult.user)) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access is required for this resource',
      },
    };
  }

  return authResult;
}

/**
 * Helper to create standardized API error responses
 */
export function createAuthErrorResponse(error: { code: string; message: string }, status: number = 401) {
  return new Response(
    JSON.stringify({
      success: false,
      // A plain string, like every /api/admin route returns. The admin pages
      // hand `data.error` straight to a toast, and an object there crashes the
      // whole page instead of showing the message.
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Rate limiting helper for admin actions
 */
const adminActionLimits = new Map<string, number[]>();

export function checkAdminRateLimit(uid: string, action: string, maxAttempts: number = 10, windowMs: number = 60000): boolean {
  const key = `${uid}:${action}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing attempts and filter out old ones
  const attempts = adminActionLimits.get(key) || [];
  const recentAttempts = attempts.filter(time => time > windowStart);

  if (recentAttempts.length >= maxAttempts) {
    logger.warn('Admin rate limit exceeded', 'ServerAuth', { uid, action, attempts: recentAttempts.length });
    return false;
  }

  // Add current attempt
  recentAttempts.push(now);
  adminActionLimits.set(key, recentAttempts);

  return true;
}