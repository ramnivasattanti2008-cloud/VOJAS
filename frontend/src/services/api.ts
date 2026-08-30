import type { ApiResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorBody: ApiResponse<null> = await response.json().catch(() => ({
        success: false,
        data: null,
        error: { code: "NETWORK_ERROR", message: "Failed to parse error response" },
        meta: { timestamp: new Date().toISOString() },
      }));

      throw new ApiError(
        errorBody.error?.code || "UNKNOWN_ERROR",
        errorBody.error?.message || `HTTP ${response.status}`,
        response.status,
        errorBody.error?.details
      );
    }

    const json: ApiResponse<T> = await response.json();

    if (!json.success) {
      throw new ApiError(
        json.error?.code || "UNKNOWN_ERROR",
        json.error?.message || "Request failed",
        response.status,
        json.error?.details
      );
    }

    return json.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      "NETWORK_ERROR",
      err instanceof Error ? err.message : "Network request failed",
      0
    );
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};

export { ApiError };
