'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: ('student' | 'instructor' | 'admin')[];
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Redirect to login if authentication is required but user is not authenticated
      if (requireAuth && !isAuthenticated) {
        router.push('/login');
        return;
      }

      // Check role-based access
      if (requireAuth && isAuthenticated && allowedRoles && user) {
        if (!allowedRoles.includes(user.role)) {
          // Redirect based on user's actual role
          if (user.role === 'admin') {
            router.push('/admin/dashboard');
          } else if (user.role === 'instructor') {
            router.push('/instructor/dashboard');
          } else {
            router.push('/my-learning');
          }
        }
      }
    }
  }, [loading, isAuthenticated, user, requireAuth, allowedRoles, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Check role access
  if (requireAuth && isAuthenticated && allowedRoles && user) {
    if (!allowedRoles.includes(user.role)) {
      return null;
    }
  }

  return <>{children}</>;
}

