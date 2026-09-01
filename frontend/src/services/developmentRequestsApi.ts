import { api } from "./api";

function buildParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      searchParams.set(key, String(val));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}

export const developmentRequestsApi = {
  async list(params: Record<string, unknown> = {}): Promise<any> {
    return api.get<any>(`/development-requests${buildParams(params)}`);
  },
  async get(id: string): Promise<any> {
    return api.get<any>(`/development-requests/${id}`);
  },
  async create(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/development-requests", data);
  },
  async updateStatus(id: string, status: string, resolution?: string): Promise<any> {
    return api.put<any>(`/development-requests/${id}/status`, { status, resolution });
  },
  async support(id: string, data: Record<string, unknown>): Promise<any> {
    return api.post<any>(`/development-requests/${id}/support`, data);
  },
  async groups(sector?: string): Promise<any> {
    return api.get<any>(`/development-requests/groups${sector ? `?sector=${sector}` : ""}`);
  },
  async priority(district: string): Promise<any> {
    return api.get<any>(`/development-requests/priority/${district}`);
  },
  async stats(): Promise<any> {
    return api.get<any>("/development-requests/stats");
  },
};
