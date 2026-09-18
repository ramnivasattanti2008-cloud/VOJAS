import { ApiClient } from '@vojas/api-client';

// Token storage — managed by AuthProvider (in-memory, not localStorage)
let _getAccessToken: () => string | null = () => null;

export function setAccessTokenGetter(fn: () => string | null) {
  _getAccessToken = fn;
}

// Mirrors middleware.ts's ALWAYS_PUBLIC_PATHS + PUBLIC_PATHS. On these routes
// a 401 is expected and harmless — it's usually the AuthProvider's silent
// background session-restore call (`refresh()` on mount) failing for an
// anonymous visitor, or a visitor with a stale/expired session cookie who
// is on a public page on purpose. Force-navigating them to /login there
// would defeat the whole point of the public citizen journey.
const NEVER_REDIRECT_ON_401_PATHS = ['/', '/report', '/explore', '/budget', '/insights', '/about', '/privacy', '/contact', '/login', '/register'];

/** True when the current path is public and must never be hard-redirected away from on auth failure. */
export function isOnPublicPath(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return NEVER_REDIRECT_ON_401_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

function onUnauthorized() {
  if (typeof window === 'undefined' || isOnPublicPath()) return;
  window.location.href = '/login';
}

// The same-origin /api/v1/* rewrite (next.config.ts's rewrites(), proxying to
// the Render backend) previously failed in production with
// DNS_HOSTNAME_RESOLVED_PRIVATE because its fallback pointed at
// http://127.0.0.1:5000 when API_INTERNAL_URL/NEXT_PUBLIC_API_URL weren't set
// at runtime — Vercel's edge refuses to proxy to a loopback address. Fixed
// 2026-09-18 and confirmed live (curl against the deployed rewrite returns
// real backend data), so browser requests go through the same-origin rewrite
// rather than calling the backend cross-origin.
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1`;
  }
  return `${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://vojas-backend.onrender.com'}/api/v1`;
};

export const apiClient = new ApiClient({
  baseUrl: getBaseUrl(),
  getAccessToken: () => _getAccessToken(),
  onUnauthorized,
});

export { apiClient as client };
