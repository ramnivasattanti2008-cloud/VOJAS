'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createAuthApi } from '@vojas/api-client';
import type { ApiClient, User, AuthResponse } from '@vojas/api-client';
import { setAccessTokenGetter } from './api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

interface AuthProviderProps {
  children: ReactNode;
  apiClient: ApiClient;
  onAuthError?: () => void;
}

export function AuthProvider({ children, apiClient, onAuthError }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const authApi = useMemo(() => createAuthApi(apiClient), [apiClient]);

  // Wire api client to read access token from this component's state
  useEffect(() => {
    setAccessTokenGetter(() => accessToken);
  }, [accessToken]);

  const refresh = useCallback(async () => {
    try {
      const res: AuthResponse = await authApi.refresh();
      setUser(res.user);
      setAccessToken(res.tokens.accessToken);
    } catch {
      setUser(null);
      setAccessToken(null);
      onAuthError?.();
    }
  }, [authApi, onAuthError]);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res: AuthResponse = await authApi.login({ email, password });
        setUser(res.user);
        setAccessToken(res.tokens.accessToken);
      } finally {
        setIsLoading(false);
      }
    },
    [authApi]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const res: AuthResponse = await authApi.register({ name, email, password });
        setUser(res.user);
        setAccessToken(res.tokens.accessToken);
      } finally {
        setIsLoading(false);
      }
    },
    [authApi]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      setAccessToken(null);
      onAuthError?.();
    }
  }, [authApi, onAuthError]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      accessToken,
      login,
      register,
      logout,
      refresh,
      setAccessToken,
    }),
    [user, isLoading, accessToken, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
