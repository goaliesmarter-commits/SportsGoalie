import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { protectApiRoute, createAuthErrorResponse } from '@/lib/auth/server-validation';
import {
  HOLDING_PAGE,
  PREVIEW_COOKIE,
  PREVIEW_COOKIE_MAX_AGE,
  PREVIEW_PARAM,
  isAlwaysReachable,
  isGateEngaged,
} from '@/lib/pre-launch/gate';

/**
 * Next.js Middleware for protecting admin routes and API endpoints
 * This runs on the Edge Runtime for optimal performance
 */

/**
 * Pre-launch gate.
 *
 * While SITE_CLOSED is 'true', every request is answered with the holding page
 * unless it carries the preview cookie. The cookie is handed out by opening any
 * URL with ?preview=<PREVIEW_ACCESS_KEY> once — after that the browser keeps
 * it, so reviewers share one link rather than a password.
 *
 * What this is and is not: it is a curtain over the UI, not a lock on the data.
 * Firestore rules remain the only thing standing between a stranger and the
 * database. The path rules live in @/lib/pre-launch/gate and are tested.
 */
function preLaunchGate(request: NextRequest): NextResponse | null {
  if (!isGateEngaged(process.env.SITE_CLOSED, process.env.PREVIEW_ACCESS_KEY)) {
    return null;
  }
  const previewKey = process.env.PREVIEW_ACCESS_KEY as string;

  const { pathname, searchParams } = request.nextUrl;

  // The handshake: ?preview=<key> on any URL sets the cookie, then we bounce to
  // the same URL without the param, so the key does not travel on in a shared
  // link, a screenshot or a Referer header.
  if (searchParams.get(PREVIEW_PARAM) === previewKey) {
    const cleaned = request.nextUrl.clone();
    cleaned.searchParams.delete(PREVIEW_PARAM);
    const response = NextResponse.redirect(cleaned);
    response.cookies.set(PREVIEW_COOKIE, previewKey, {
      httpOnly: true,
      sameSite: 'lax',
      // Behind Vercel's edge the request reaching this function can be plain
      // http even though the browser is on https, so nextUrl.protocol alone
      // would silently drop the Secure flag in production.
      secure: isHttpsRequest(request),
      path: '/',
      maxAge: PREVIEW_COOKIE_MAX_AGE,
    });
    return response;
  }

  if (request.cookies.get(PREVIEW_COOKIE)?.value === previewKey) return null;
  if (isAlwaysReachable(pathname)) return null;

  // Rewrite, not redirect: the visitor keeps the URL they typed, so a link
  // shared before launch still lands on the right page the moment the gate
  // comes down.
  const holding = request.nextUrl.clone();
  holding.pathname = HOLDING_PAGE;
  holding.search = '';
  const response = NextResponse.rewrite(holding);
  response.headers.set('x-robots-tag', 'noindex, nofollow');
  return response;
}

function isHttpsRequest(request: NextRequest): boolean {
  const forwarded = request.headers.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0].trim() === 'https';
  return request.nextUrl.protocol === 'https:';
}

export async function proxy(request: NextRequest) {
  const gated = preLaunchGate(request);
  if (gated) return gated;

  const { pathname } = request.nextUrl;

  // Skip middleware for public routes and static assets
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Skip middleware for routes that handle their own auth
  if (pathname === '/api/admin/chat') {
    return NextResponse.next();
  }

  // Protect admin API routes
  if (pathname.startsWith('/api/admin/')) {
    try {
      const authResult = await protectApiRoute(request, true); // Require admin

      if (!authResult.success) {
        return createAuthErrorResponse(authResult.error!, 401);
      }

      // Add user info to headers for downstream use
      const response = NextResponse.next();
      response.headers.set('x-user-id', authResult.user!.uid);
      response.headers.set('x-user-role', authResult.user!.role);
      response.headers.set('x-user-email', authResult.user!.email);

      return response;
    } catch (error) {
      return createAuthErrorResponse(
        {
          code: 'MIDDLEWARE_ERROR',
          message: 'Authentication middleware failed',
        },
        500
      );
    }
  }

  // Protect general API routes that require authentication
  if (pathname.startsWith('/api/protected/')) {
    try {
      const authResult = await protectApiRoute(request, false); // Any authenticated user

      if (!authResult.success) {
        return createAuthErrorResponse(authResult.error!, 401);
      }

      // Add user info to headers
      const response = NextResponse.next();
      response.headers.set('x-user-id', authResult.user!.uid);
      response.headers.set('x-user-role', authResult.user!.role);
      response.headers.set('x-user-email', authResult.user!.email);

      return response;
    } catch (error) {
      return createAuthErrorResponse(
        {
          code: 'MIDDLEWARE_ERROR',
          message: 'Authentication middleware failed',
        },
        500
      );
    }
  }

  return NextResponse.next();
}

/**
 * Determines if a route is public and doesn't require authentication
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/pillars',
    '/pillar',
    '/7-pillars',
    '/explain',
    '/goalie',
    '/parent-role',
    '/team-programs',
    '/goalie-coach',
    '/organization',
    '/who-we-are',
    '/the-system',
    '/offer',
    '/quizzes',
    '/help',
    '/contact',
    '/privacy',
    '/terms',
  ];

  const publicPrefixes = [
    '/api/public/',
    '/api/auth/',
    '/pillar/',
    '/7-pillars',
    '/_next/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/images/',
    '/icons/',
  ];

  // Check exact matches
  if (publicRoutes.includes(pathname)) {
    return true;
  }

  // Check prefixes
  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return true;
  }

  // Static files
  if (pathname.includes('.') && !pathname.startsWith('/api/')) {
    return true;
  }

  return false;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};