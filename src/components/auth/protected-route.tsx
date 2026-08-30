'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth/context';
import { PausedAccountScreen } from '@/components/auth/PausedAccountScreen';
import { UserRole } from '@/types';
import {
  SkeletonContentPage,
  SkeletonDashboard,
  SkeletonDarkPage,
} from '@/components/ui/skeletons';

/**
 * Get the default redirect path for a user based on their role
 */
function getRoleBasedRedirect(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'coach':
      return '/dashboard'; // Will have coach-specific features in Phase 2
    case 'parent':
      return '/dashboard'; // Will have parent-specific features in Phase 2
    case 'student':
    default:
      return '/dashboard';
  }
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/auth/login',
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (requiredRole && user?.role !== requiredRole) {
        // Redirect based on user role
        const roleBasedRedirect = getRoleBasedRedirect(user?.role || 'student');
        router.push(roleBasedRedirect);
        return;
      }
    }
  }, [loading, isAuthenticated, user, requiredRole, router, redirectTo]);

  const renderDefaultFallback = () => {
    // Use requiredRole first to keep SSR and initial client render deterministic.
    if (requiredRole === 'admin' || requiredRole === 'coach' || requiredRole === 'parent') {
      return <SkeletonDarkPage />;
    }

    if (requiredRole === 'student') {
      return <SkeletonDashboard />;
    }

    // Fallback to resolved role only for routes without explicit role requirements.
    if (user?.role === 'student') {
      return <SkeletonDashboard />;
    }

    if (user?.role === 'admin' || user?.role === 'coach' || user?.role === 'parent') {
      return <SkeletonDarkPage />;
    }

    // Before role resolution, use a neutral skeleton shell.
    return <SkeletonContentPage />;
  };

  // During initial hydration or while auth is loading, render a
  // neutral, deterministic skeleton to avoid server/client markup
  // mismatches. If a custom `fallback` was provided, prefer it.
  if (!isHydrated || loading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return renderDefaultFallback();
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null; // Will redirect in useEffect
  }

  // The subscription pause switch. A paused member keeps their account and
  // every scrap of their data, but the door is closed until an admin flips
  // them back on. Checked here so it covers every guarded page at once.
  // Admins are exempt — an admin must never be lockable out of the panel
  // that controls the switch.
  if (user?.isPaused && user.role !== 'admin') {
    return <PausedAccountScreen />;
  }

  return <>{children}</>;
}

// Wrapper for admin-only pages
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  const { user, isAuthenticated } = useAuth();

  // Determine redirect target based on authentication status
  const getRedirectTarget = () => {
    if (!isAuthenticated) {
      return '/auth/login'; // Not logged in -> login page
    }
    if (user?.role) {
      return getRoleBasedRedirect(user.role); // Redirect to role-specific dashboard
    }
    return '/auth/login'; // Fallback to login
  };

  return (
    <ProtectedRoute requiredRole="admin" redirectTo={getRedirectTarget()} {...props}>
      {children}
    </ProtectedRoute>
  );
}

// Wrapper for student-only pages
export function StudentRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="student" redirectTo="/admin" {...props}>
      {children}
    </ProtectedRoute>
  );
}