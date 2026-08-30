import type { ApiResponse } from "@/types";

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

  // Pull JWT from localStorage and attach as Bearer token for all requests
  const token = localStorage.getItem("vojas_token");
  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  // Don't hardcode Content-Type — let the browser set it for FormData
  const headers: HeadersInit = {
    ...authHeader,
    ...(!(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
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
  get: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "GET", headers }),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
  /** Multipart/form-data upload — browser auto-sets Content-Type with boundary */
  postForm: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: "POST", body: formData }),
};

export { ApiError };
