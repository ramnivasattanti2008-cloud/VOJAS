'use client';

import type { ApiClient, AuthResponse, User } from '@vojas/api-client';
import { createAuthApi } from '@vojas/api-client';
import {
    canVerify,
    getPermissions,
    getRoleCategory,
    getRoleColor,
    hasAnyPermission,
    hasPermission,
    isAdminRole,
    isCitizenRole,
    isContractorRole,
    isMPRole,
    isOfficerRole,
    type Permission,
} from '@vojas/domain';
import type { UserRole } from '@vojas/shared';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { setAccessTokenGetter } from './api';

/* -------------------------------------------------------------------------- */
/* Access token plumbing                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The access token lives in a module-scoped variable, not only in React state.
 *
 * Why: `app/providers.tsx` calls `setAccessTokenGetter(...)` during *every one
 * of its renders* with a getter backed by a ref that nothing ever populates.
 * Every client-side navigation re-renders Providers, which used to silently
 * replace this provider's getter with that always-null one — so the
 * Authorization header vanished the moment you navigated away from the page you
 * logged in on, the next API call 401'd, and `onUnauthorized` bounced the user
 * back to /login. That is the "I keep getting logged out" bug.
 *
 * Two things make it robust now:
 *  1. The registered getter reads this module variable, so it is correct no
 *     matter how many times it is (re-)registered.
 *  2. AuthProvider re-claims the getter on every render. React renders a parent
 *     before its children, so this provider's claim always lands last.
 */
let currentAccessToken: string | null = null;
const readAccessToken = (): string | null => currentAccessToken;

/** Set the token and (re-)point the shared ApiClient at it, synchronously. */
function publishAccessToken(token: string | null): void {
  currentAccessToken = token;
  setAccessTokenGetter(readAccessToken);
}

/* -------------------------------------------------------------------------- */
/* Client-readable session cookies                                             */
/* -------------------------------------------------------------------------- */

/**
 * The API is on a different origin (see `lib/api.ts`), so the httpOnly cookies
 * it sets are scoped to *its* domain and are invisible to both Next.js
 * middleware and this app. We therefore mirror a token + session marker onto
 * this origin. `middleware.ts` reads `vojas_token` / `vojas_session`; removing
 * these breaks route protection.
 */
const TOKEN_COOKIE = 'vojas_token';
const SESSION_COOKIE = 'vojas_session';
const LEGACY_TOKEN_COOKIE = 'access_token';

/** Matches signAccessToken's 15m expiry in apps/api/src/auth/jwt.ts. */
const ACCESS_TOKEN_MAX_AGE_S = 15 * 60;
/** Matches the API refresh-cookie / session lifetime (7 days). */
const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;
/** Refresh a little before the access token lapses so sessions do not die mid-task. */
const PROACTIVE_REFRESH_MS = 12 * 60 * 1000;

function cookieAttributes(): string {
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  return `; path=/; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeSessionCookies(token: string): void {
  if (typeof document === 'undefined') return;
  const attrs = cookieAttributes();
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; max-age=${ACCESS_TOKEN_MAX_AGE_S}${attrs}`;
  document.cookie = `${SESSION_COOKIE}=1; max-age=${SESSION_MAX_AGE_S}${attrs}`;
}

function clearSessionCookies(): void {
  if (typeof document === 'undefined') return;
  const attrs = cookieAttributes();
  for (const name of [TOKEN_COOKIE, SESSION_COOKIE, LEGACY_TOKEN_COOKIE]) {
    document.cookie = `${name}=; max-age=0${attrs}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Error normalisation                                                         */
/* -------------------------------------------------------------------------- */

const NETWORK_MESSAGE =
  'Could not reach the VOJAS API. Check your connection and try again.';

/**
 * Turn whatever `ApiClient` threw into a message a human can act on, while
 * still preferring the API's own wording (e.g. "Invalid credentials") over a
 * vague catch-all. Nothing here invents a reason for a failure.
 */
export function toAuthErrorMessage(err: unknown, fallback: string): string {
  // fetch() rejects with a TypeError for DNS/CORS/offline failures.
  if (err instanceof TypeError) return NETWORK_MESSAGE;

  const raw = err instanceof Error ? err.message.trim() : '';
  if (!raw) return fallback;

  if (/failed to fetch|networkerror|load failed/i.test(raw)) return NETWORK_MESSAGE;
  if (/invalid credentials/i.test(raw)) {
    return 'Incorrect email or password. Check both and try again.';
  }
  if (/already exists/i.test(raw)) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (/\b(429|too many)\b/i.test(raw)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (/^Server error \(5\d\d\)/i.test(raw)) {
    return 'The VOJAS API is temporarily unavailable. Please try again in a moment.';
  }
  // Surface the API's real message, but never dump an HTML error page at a user.
  if (/<\/?[a-z][\s\S]*>/i.test(raw)) return fallback;
  return raw.length > 220 ? `${raw.slice(0, 217)}...` : raw;
}

function toAuthError(err: unknown, fallback: string): Error {
  return new Error(toAuthErrorMessage(err, fallback));
}

/* -------------------------------------------------------------------------- */
/* Role routing                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Landing route for a freshly authenticated user. Mirrors `AuthGate`'s
 * role-based redirect so a citizen is never dropped onto the officer console.
 */
export function defaultRouteForRole(role: UserRole | null | undefined): string {
  if (!role) return '/citizen';
  // ANALYST/REVIEWER have no isAnalystRole/isReviewerRole helper in
  // packages/domain — they're intelligence-dashboard roles, not officer-
  // workspace roles (isOfficerRole covers a different, narrower concern:
  // access to /officer/* routes), so checked explicitly here rather than
  // folded into isOfficerRole.
  if (isAdminRole(role) || isOfficerRole(role) || role === 'ANALYST' || role === 'REVIEWER') return '/dashboard';
  if (isMPRole(role)) return '/mp';
  if (isContractorRole(role)) return '/contractor';
  return '/citizen';
}

/**
 * Only ever redirect to a path inside this app. Blocks `//evil.com` and
 * `https://evil.com` open-redirects coming in via `?next=`.
 */
export function sanitiseNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  if (next.startsWith('/login') || next.startsWith('/register')) return null;
  return next;
}

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

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
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
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
  const [accessToken, setAccessTokenState] = useState<string | null>(null);

  const authApi = useMemo(() => createAuthApi(apiClient), [apiClient]);

  // Re-claim the ApiClient's token getter on every render. See the comment on
  // `currentAccessToken` — the parent Providers component overwrites it during
  // its own render, and this provider renders after it.
  setAccessTokenGetter(readAccessToken);

  // Held in a ref so `refresh` keeps a stable identity even when the caller
  // passes a fresh `onAuthError` closure; an unstable `refresh` would re-run
  // the bootstrap effect on every render (a session-restore loop).
  const onAuthErrorRef = useRef(onAuthError);
  useEffect(() => {
    onAuthErrorRef.current = onAuthError;
  }, [onAuthError]);

  const applyToken = useCallback((token: string | null) => {
    publishAccessToken(token);
    setAccessTokenState(token);
  }, []);

  const applySession = useCallback(
    (nextUser: User, token: string) => {
      publishAccessToken(token);
      writeSessionCookies(token);
      setUser(nextUser);
      setAccessTokenState(token);
    },
    []
  );

  const clearSession = useCallback(() => {
    publishAccessToken(null);
    clearSessionCookies();
    setUser(null);
    setAccessTokenState(null);
  }, []);

  /* ------------------------------ refresh -------------------------------- */

  const runRefresh = useCallback(async () => {
    // POST /auth/refresh only issues a new access token for the existing
    // session — it does not return `user`. Publish the fresh token
    // synchronously (it takes effect immediately, unlike the React state
    // update, which only lands after the next render) so the getProfile()
    // call below actually authenticates, then restore the real user from
    // GET /auth/me.
    const res = await authApi.refresh();
    publishAccessToken(res.accessToken);
    const profile = await authApi.getProfile();
    applySession(profile, res.accessToken);
  }, [authApi, applySession]);

  // A single in-flight refresh is shared by all callers. Without this, React
  // StrictMode's double-mount, the proactive timer and a 401 retry could fire
  // three concurrent refreshes and race each other's results.
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (inFlightRefreshRef.current) return inFlightRefreshRef.current;

    const pending = runRefresh()
      .catch(() => {
        // No session, expired session, or the API is unreachable. All three
        // mean "not signed in" as far as the UI is concerned. On a public page
        // `onAuthError` is a no-op; on a protected page it routes to /login.
        clearSession();
        onAuthErrorRef.current?.();
      })
      .finally(() => {
        inFlightRefreshRef.current = null;
      });

    inFlightRefreshRef.current = pending;
    return pending;
  }, [runRefresh, clearSession]);

  /* ----------------------------- bootstrap ------------------------------- */

  useEffect(() => {
    let cancelled = false;

    // Fast path: an access token issued earlier is still inside this origin's
    // client-readable cookie. Publishing it before the network round-trip means
    // requests fired during bootstrap are already authenticated instead of
    // 401-ing and tripping the redirect-to-login handler.
    if (!currentAccessToken) {
      const cached = readCookie(TOKEN_COOKIE);
      if (cached) publishAccessToken(cached);
    }

    refresh().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  /* -------------------- keep the session alive silently ------------------ */

  useEffect(() => {
    if (!accessToken) return;
    const timer = window.setTimeout(() => {
      void refresh();
    }, PROACTIVE_REFRESH_MS);
    return () => window.clearTimeout(timer);
  }, [accessToken, refresh]);

  // Coming back to a backgrounded tab (or a laptop waking from sleep) can land
  // well past the 15-minute access-token expiry. If the mirrored cookie has
  // lapsed the token in memory is stale too — renew it before the user clicks
  // anything and gets an unexplained bounce to /login.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const revalidate = () => {
      if (document.visibilityState === 'hidden') return;
      if (!currentAccessToken) return;
      if (!readCookie(TOKEN_COOKIE)) void refresh();
    };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [refresh]);

  /* ------------------------------- actions ------------------------------- */

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      let res: AuthResponse;
      try {
        res = await authApi.login({ email: email.trim(), password });
      } catch (err) {
        throw toAuthError(err, 'Sign in failed. Please try again.');
      }
      applySession(res.user, res.accessToken);
      return res.user;
    },
    [authApi, applySession]
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<User> => {
      let res: AuthResponse;
      try {
        res = await authApi.register({ name: name.trim(), email: email.trim(), password });
      } catch (err) {
        throw toAuthError(err, 'Could not create your account. Please try again.');
      }
      applySession(res.user, res.accessToken);
      return res.user;
    },
    [authApi, applySession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // A failed logout call must never trap the user in a signed-in UI —
      // the local session is cleared either way.
    } finally {
      clearSession();
      onAuthErrorRef.current?.();
    }
  }, [authApi, clearSession]);

  /* -------------------------------- value -------------------------------- */

  const role = (user?.role as UserRole) ?? null;
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      isLoading,
      isAuthenticated: !!user,
      accessToken,
      // Permission helpers
      can: (permission: Permission) => (role ? hasPermission(role, permission) : false),
      canAny: (permissions: Permission[]) => (role ? hasAnyPermission(role, permissions) : false),
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
      setAccessToken: applyToken,
    }),
    [user, isLoading, accessToken, login, register, logout, refresh, role, applyToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
