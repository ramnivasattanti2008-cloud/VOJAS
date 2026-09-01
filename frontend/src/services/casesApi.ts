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

export const casesApi = {
  async list(params: Record<string, unknown> = {}): Promise<any> {
    return api.get<any>(`/cases${buildParams(params)}`);
  },
  async get(id: string): Promise<any> {
    return api.get<any>(`/cases/${id}`);
  },
  async create(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/cases", data);
  },
  async assign(id: string, assigneeId: string): Promise<any> {
    return api.put<any>(`/cases/${id}/assign`, { assigneeId });
  },
  async transition(id: string, status: string, note?: string): Promise<any> {
    return api.put<any>(`/cases/${id}/transition`, { status, note });
  },
  async addEvidence(id: string, data: Record<string, unknown>): Promise<any> {
    return api.post<any>(`/cases/${id}/evidence`, data);
  },
  async escalate(id: string, authority: string, notes?: string): Promise<any> {
    return api.post<any>(`/cases/${id}/escalate`, { authority, notes });
  },
  async close(id: string, resolution: string): Promise<any> {
    return api.put<any>(`/cases/${id}/close`, { resolution });
  },
  async reopen(id: string, reason: string): Promise<any> {
    return api.put<any>(`/cases/${id}/reopen`, { reason });
  },
  async timeline(id: string): Promise<any> {
    return api.get<any>(`/cases/${id}/timeline`);
  },
  async stats(): Promise<any> {
    return api.get<any>("/cases/stats");
  },
};
