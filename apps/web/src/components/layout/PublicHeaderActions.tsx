'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

/**
 * Auth-aware call to action in the public header/nav. Anonymous visitors see
 * "Sign In"; a logged-in user sees a direct link back into their own
 * command center instead of a redundant login prompt.
 */
export function PublicHeaderActions() {
  const { isAuthenticated, isLoading, isAdmin, isOfficer, isMP, isContractor } = useAuth();

  if (!isLoading && isAuthenticated) {
    const dashboardHref = isAdmin || isOfficer ? '/dashboard' : isMP ? '/mp' : isContractor ? '/contractor' : '/citizen';
    return (
      <Link
        href={dashboardHref}
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
      Sign In
    </Link>
  );
}
