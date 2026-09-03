'use client';

import { useCallback, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-context';
import { apiClient, setAccessTokenGetter } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import type { ReactNode } from 'react';

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
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider apiClient={apiClient} onAuthError={handleAuthError}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
