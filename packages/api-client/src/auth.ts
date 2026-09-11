import type { ApiClient } from './client.js';
import type { UserRole } from '@vojas/shared';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  state?: string;
  district?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

// Matches the actual response shape from apps/api/src/routes/auth.ts —
// accessToken/refreshToken/expiresIn are top-level, not nested under a
// "tokens" object. POST /auth/refresh omits both `user` and `refreshToken`
// (it only issues a new access token for an existing session).
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: string;
}

export function createAuthApi(client: ApiClient) {
  return {
    login(payload: LoginPayload) {
      return client.post<AuthResponse>('/auth/login', payload);
    },
    register(payload: RegisterPayload) {
      return client.post<AuthResponse>('/auth/register', payload);
    },
    logout() {
      return client.post<{ success: boolean }>('/auth/logout');
    },
    refresh() {
      return client.post<RefreshResponse>('/auth/refresh');
    },
    getProfile() {
      return client.get<User>('/auth/me');
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
