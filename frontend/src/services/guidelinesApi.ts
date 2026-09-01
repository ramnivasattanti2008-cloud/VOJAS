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

export const guidelinesApi = {
  async list(params: Record<string, unknown> = {}): Promise<any> {
    return api.get<any>(`/guidelines${buildParams(params)}`);
  },
  async get(id: string): Promise<any> {
    return api.get<any>(`/guidelines/${id}`);
  },
  async create(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/guidelines", data);
  },
  async search(q: string, category?: string, sector?: string): Promise<any> {
    return api.get<any>(`/guidelines/search?q=${encodeURIComponent(q)}${category ? `&category=${encodeURIComponent(category)}` : ""}${sector ? `&sector=${encodeURIComponent(sector)}` : ""}`);
  },
  async categories(): Promise<any> {
    return api.get<any>("/guidelines/categories");
  },
  async projectCompliance(projectId: string): Promise<any> {
    return api.get<any>(`/guidelines/project/${projectId}/compliance`);
  },
  async checkCompliance(id: string, data: Record<string, unknown>): Promise<any> {
    return api.post<any>(`/guidelines/${id}/check-compliance`, data);
  },
  async stats(): Promise<any> {
    return api.get<any>("/guidelines/stats");
  },
};
