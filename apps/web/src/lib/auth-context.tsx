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
import {
  hasPermission,
  hasAnyPermission,
  canVerify,
  isAdminRole,
  isOfficerRole,
  isMPRole,
  isCitizenRole,
  isContractorRole,
  getRoleCategory,
  getPermissions,
  getRoleColor,
  type Permission,
} from '@vojas/domain';
import type { UserRole } from '@vojas/shared';

export interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  // Permission helpers
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  // Role shortcuts
  isAdmin: boolean;
  isOfficer: boolean;
  isMP: boolean;
  isCitizen: boolean;
  isContractor: boolean;
  canVerifyFindings: boolean;
  roleCategory: string;
  roleColor: string;
  permissions: Permission[];
  // Auth methods
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
      // POST /auth/refresh only issues a new access token for the existing
      // session — it does not return `user`. Register the fresh token
      // synchronously (setAccessTokenGetter takes effect immediately,
      // unlike the accessToken React-state update below which only lands
      // after the next render) so the getProfile() call below actually
      // authenticates, then restore the real user from GET /auth/me.
      const res = await authApi.refresh();
      setAccessTokenGetter(() => res.accessToken);
      const profile = await authApi.getProfile();
      setUser(profile);
      setAccessToken(res.accessToken);
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
        setAccessToken(res.accessToken);
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
        setAccessToken(res.accessToken);
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

  const role = (user?.role as UserRole) ?? null;
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      isLoading,
      isAuthenticated: !!user,
      accessToken,
      // Permission helpers
      can: (permission: Permission) => role ? hasPermission(role, permission) : false,
      canAny: (permissions: Permission[]) => role ? hasAnyPermission(role, permissions) : false,
      // Role shortcuts
      isAdmin: isAdminRole(role ?? 'VIEWER'),
      isOfficer: isOfficerRole(role ?? 'VIEWER'),
      isMP: isMPRole(role ?? 'VIEWER'),
      isCitizen: isCitizenRole(role ?? 'VIEWER'),
      isContractor: isContractorRole(role ?? 'VIEWER'),
      canVerifyFindings: canVerify(role ?? 'VIEWER'),
      roleCategory: getRoleCategory(role ?? 'VIEWER'),
      roleColor: getRoleColor(role ?? 'VIEWER'),
      permissions: getPermissions(role ?? 'VIEWER'),
      // Auth methods
      login,
      register,
      logout,
      refresh,
      setAccessToken,
    }),
    [user, isLoading, accessToken, login, register, logout, refresh, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
