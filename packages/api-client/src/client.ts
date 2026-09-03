import type { ApiResponse } from './types';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private baseUrl: string;
  private getAccessToken: () => string | null;
  private onUnauthorized?: () => void;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAccessToken = options.getAccessToken ?? (() => null);
    this.onUnauthorized = options.onUnauthorized;
  }

  async request<T>(
    method: string,
    endpoint: string,
    options?: { body?: unknown; params?: Record<string, string | number | boolean | undefined> }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
    }

    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    });

    if (response.status === 401 && this.onUnauthorized) {
      this.onUnauthorized();
    }

    const json: ApiResponse<T> = (await response.json().catch(() => null)) as ApiResponse<T> ?? {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Failed to parse response' }
    };

    if (!json.success) {
      throw new Error(json.error?.message ?? 'Request failed');
    }
    return json.data as T;
  }

  get<T>(endpoint: string, params?: Record<string, any>) {
    return this.request<T>('GET', endpoint, { params });
  }
  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>('POST', endpoint, { body });
  }
  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>('PATCH', endpoint, { body });
  }
  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>('PUT', endpoint, { body });
  }
  delete<T>(endpoint: string) {
    return this.request<T>('DELETE', endpoint);
  }
}
