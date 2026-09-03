import type { ApiClient } from './client';
import { UserRole } from '@vojas/shared';

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

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
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

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
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
      return client.post<AuthResponse>('/auth/refresh');
    },
    getProfile() {
      return client.get<User>('/auth/me');
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
