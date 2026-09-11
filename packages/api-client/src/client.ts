import type { ApiResponse } from './types.js';

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
    const fullPath = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    let url: URL;
    try {
      url = new URL(fullPath);
    } catch {
      const g = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
      const fallbackOrigin = g.location?.origin ?? 'http://127.0.0.1:5000';
      url = new URL(fullPath, fallbackOrigin);
    }
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
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

    let json: ApiResponse<T> | null = null;
    let rawText = '';
    try {
      rawText = await response.text();
      if (rawText) {
        json = JSON.parse(rawText) as ApiResponse<T>;
      }
    } catch {
      json = null;
    }

    if (!json) {
      const errMsg = rawText ? rawText.slice(0, 300) : `HTTP ${response.status} ${response.statusText}`;
      throw new Error(response.ok ? 'Failed to parse response' : `Server error (${response.status}): ${errMsg}`);
    }

    if (!json.success) {
      const details = Array.isArray(json.error?.details)
        ? json.error.details.map((d: any) => d.message || JSON.stringify(d)).join('; ')
        : '';
      throw new Error(details ? `${json.error?.message}: ${details}` : (json.error?.message ?? 'Request failed'));
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
