'use client';

import { GlobalErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { apiClient, isOnPublicPath, setAccessTokenGetter } from '@/lib/api';
import { AuthProvider } from '@/lib/auth-context';
import { queryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Suspense, useCallback, useRef } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // We need to bridge the access token from AuthProvider context to ApiClient.
  // Use a ref + getter so AuthProvider can update it without re-creating the client.
  const tokenRef = useRef<string | null>(null);

  const getAccessToken = useCallback(() => tokenRef.current, []);

  // Wire ApiClient to read from ref
  setAccessTokenGetter(getAccessToken);

  const handleAuthError = useCallback(() => {
    tokenRef.current = null;
    // On a public page (the landing page, /explore, /report, ...), a failed
    // session-restore just means "not logged in" — that's a normal, expected
    // state for an anonymous citizen and must not force-navigate them away.
    // Protected routes remain guarded by AuthGate's own redirect.
    if (typeof window !== 'undefined' && !isOnPublicPath()) {
      window.location.href = '/login';
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalErrorBoundary>
        <Suspense fallback={<PageLoading />}>
          <LanguageProvider>
            <AuthProvider apiClient={apiClient} onAuthError={handleAuthError}>
              {children}
            </AuthProvider>
          </LanguageProvider>
        </Suspense>
      </GlobalErrorBoundary>
    </QueryClientProvider>
  );
}

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-vojas-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    </div>
  );
}
