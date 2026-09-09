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

export const apiClient = new ApiClient({
  baseUrl: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/v1`,
  getAccessToken: () => _getAccessToken(),
  onUnauthorized,
});

export { apiClient as client };
