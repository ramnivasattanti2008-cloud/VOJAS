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

export const assetsApi = {
  async list(params: Record<string, unknown> = {}): Promise<any> {
    return api.get<any>(`/assets${buildParams(params)}`);
  },
  async get(id: string): Promise<any> {
    return api.get<any>(`/assets/${id}`);
  },
  async create(data: Record<string, unknown>): Promise<any> {
    return api.post<any>("/assets", data);
  },
  async update(id: string, data: Record<string, unknown>): Promise<any> {
    return api.put<any>(`/assets/${id}`, data);
  },
  async remove(id: string): Promise<any> {
    return api.delete<any>(`/assets/${id}`);
  },
  async health(id: string): Promise<any> {
    return api.get<any>(`/assets/${id}/health`);
  },
  async inspections(id: string): Promise<any> {
    return api.get<any>(`/assets/${id}/inspections`);
  },
  async problems(id: string): Promise<any> {
    return api.get<any>(`/assets/${id}/problems`);
  },
  async reportProblem(id: string, data: { title: string; description: string; severity?: string }): Promise<any> {
    return api.post<any>(`/assets/${id}/problems`, data);
  },
  async stats(): Promise<any> {
    return api.get<any>("/assets/stats");
  },
};
