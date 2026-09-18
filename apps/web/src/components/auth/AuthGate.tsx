'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { defaultRouteForRole } from '@/lib/auth-context';
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
 *
 * Delegates to defaultRouteForRole() (lib/auth-context.tsx) rather than
 * re-implementing the same role grouping here — this file used to have its
 * own inline if/else that never checked ANALYST/REVIEWER at all, silently
 * sending both to /citizen instead of /dashboard while the doc comment
 * above (and defaultRouteForRole's own doc comment) claimed otherwise.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, role, user } = useAuth();
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
      router.replace(defaultRouteForRole(role));
    }
  }, [isAuthenticated, isLoading, router, role]);

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
