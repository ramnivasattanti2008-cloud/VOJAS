'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

/**
 * AuthGate — protects dashboard routes.
 *
 * Redirects:
 * - Unauthenticated → /login
 * - ADMIN/OFFICER/ANALYST/REVIEWER → /dashboard
 * - CITIZEN/VIEWER → /citizen
 * - MP → /mp
 * - CONTRACTOR → /contractor
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user, isOfficer, isMP, isContractor, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Role-based default redirect
    const path = window.location.pathname;
    // Only redirect from root "/" or if already on a root command center
    if (path === '/' || path === '/login' || path === '/register') {
      if (isAdmin || isOfficer) {
        router.replace('/dashboard');
      } else if (isMP) {
        router.replace('/mp');
      } else if (isContractor) {
        router.replace('/contractor');
      } else {
        // CITIZEN or VIEWER
        router.replace('/citizen');
      }
    }
  }, [isAuthenticated, isLoading, router, isOfficer, isMP, isContractor, isAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-vojas-600" aria-hidden="true" />
          <p className="text-sm font-medium">Loading VOJAS...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
