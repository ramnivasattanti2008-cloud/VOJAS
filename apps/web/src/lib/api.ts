import { ApiClient } from '@vojas/api-client';

// Token storage — managed by AuthProvider (in-memory, not localStorage)
let _getAccessToken: () => string | null = () => null;

export function setAccessTokenGetter(fn: () => string | null) {
  _getAccessToken = fn;
}

function onUnauthorized() {
  // Redirect to login on 401
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export const apiClient = new ApiClient({
  baseUrl: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/v1`,
  getAccessToken: () => _getAccessToken(),
  onUnauthorized,
});

export { apiClient as client };
